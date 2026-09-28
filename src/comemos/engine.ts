import type {
  ActivityRule,
  AppState,
  EnergyEstimate,
  MealFeedback,
  MealSlot,
  MealTemplate,
  PersonId,
  PlannedMeal,
  Profile,
  ScenarioMode,
} from "./models";

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Desayuno",
  lunch: "Comida",
  snack: "Merienda",
  dinner: "Cena",
};

export const slotLabel = (slot: MealSlot) => SLOT_LABELS[slot];

export function roundTo(value: number, step = 5) {
  return Math.round(value / step) * step;
}

function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function durationHours(start: string, end: string) {
  const startMinutes = minutes(start);
  let endMinutes = minutes(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return Math.max(0, endMinutes - startMinutes) / 60;
}

export function weekdayFromIso(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function shiftIsoDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function todayInTimezone(timezone = "Europe/Madrid") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function activitiesForDay(state: AppState, personId: PersonId, date: string) {
  const weekday = weekdayFromIso(date);
  const override = state.activityOverrides[date]?.[personId];
  const disabled = new Set(override?.disabledRuleIds ?? []);
  const recurring = state.activities.filter(
    (activity) =>
      activity.personId === personId &&
      activity.enabled &&
      activity.days.includes(weekday) &&
      !disabled.has(activity.id),
  );
  return [...recurring, ...(override?.extras ?? []).filter((activity) => activity.enabled)].sort(
    (a, b) => a.start.localeCompare(b.start),
  );
}

export function activityCalories(activity: ActivityRule, profile: Profile) {
  if (!activity.enabled) return 0;
  if (activity.energyMode === "fixed") return Math.max(0, activity.fixedKcal);
  // Resting energy is already present in BMR. Subtracting 1 MET avoids counting it twice.
  return Math.max(0, activity.met - 1) * profile.weightKg * durationHours(activity.start, activity.end);
}

export function energyForDay(state: AppState, personId: PersonId, date: string): EnergyEstimate {
  const profile = state.profiles[personId];
  const sexOffset = profile.sexAtBirth === "male" ? 5 : -161;
  const bmr =
    10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
  // A small living allowance covers ordinary movement without pretending it is precise.
  const baseLiving = bmr * 1.15;
  const activityKcal = activitiesForDay(state, personId, date).reduce(
    (sum, activity) => sum + activityCalories(activity, profile),
    0,
  );
  const maintenanceKcal = baseLiving + activityKcal;
  const targetKcal = Math.min(
    profile.maximumKcal,
    Math.max(profile.minimumKcal, maintenanceKcal + profile.goalDeltaKcal),
  );

  return {
    bmr: roundTo(bmr),
    baseLiving: roundTo(baseLiving),
    activityKcal: roundTo(activityKcal),
    maintenanceKcal: roundTo(maintenanceKcal),
    targetKcal: roundTo(targetKcal, 10),
    proteinTargetG: profile.proteinTargetG,
    fibreTargetG: profile.fibreTargetG,
  };
}

function differenceInDays(from: string, to: string) {
  const a = new Date(`${from}T12:00:00Z`).getTime();
  const b = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function templateById(state: AppState, id: string) {
  return state.mealTemplates.find((meal) => meal.id === id && meal.active) ?? state.mealTemplates[0];
}

function batchTemplate(state: AppState, slot: "lunch" | "dinner", date: string) {
  const offset = differenceInDays(state.settings.cookCycleAnchor, date);
  const block = ((Math.floor(offset / 4) % 2) + 2) % 2;
  if (block === 0) {
    return templateById(
      state,
      slot === "lunch" ? state.settings.batchLunchTemplateId : state.settings.batchDinnerTemplateId,
    );
  }
  return templateById(state, slot === "lunch" ? "lentil-stew" : "tvp-beans-tomato");
}

function scenarioTemplate(state: AppState, mode: ScenarioMode, slot: "lunch" | "dinner") {
  if (mode === "no-cook") {
    return templateById(state, slot === "lunch" ? "frozen-rice-protein" : "noodles-tofu");
  }
  if (mode === "eggs") return templateById(state, "eggs-beans-cheese");
  if (mode === "buldak") return templateById(state, "buldak-upgraded");
  if (mode === "out" || mode === "very-large") return templateById(state, "meal-out");
  return null;
}

export function templateForSlot(
  state: AppState,
  personId: PersonId,
  date: string,
  slot: MealSlot,
) {
  if (slot === "breakfast") {
    return templateById(state, personId === "adrian" ? "plenny-pro" : "plenny-half");
  }
  if (slot === "snack") return templateById(state, "plenny-half");
  const scenario = state.scenarios[date];
  if (scenario?.slot === slot) {
    const selected = scenarioTemplate(state, scenario.mode, slot);
    if (selected) return selected;
  }
  return batchTemplate(state, slot, date);
}

function recentFeedback(
  feedback: MealFeedback[],
  personId: PersonId,
  slot: MealSlot,
  templateId: string,
) {
  return feedback
    .filter(
      (entry) =>
        entry.personId === personId && entry.slot === slot && entry.templateId === templateId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);
}

export function servingAdjustment(
  feedback: MealFeedback[],
  personId: PersonId,
  slot: MealSlot,
  templateId: string,
) {
  const recent = recentFeedback(feedback, personId, slot, templateId);
  if (!recent.length) return { factor: 1, note: null as string | null };

  const latestThree = recent.slice(0, 3);
  const lowCount = latestThree.filter((entry) => entry.eatenPercent < 80).length;
  const lowAverage =
    latestThree.reduce((sum, entry) => sum + entry.eatenPercent, 0) / latestThree.length;
  const hungryCount = latestThree.filter(
    (entry) => entry.eatenPercent >= 95 && entry.hungerAfter >= 4,
  ).length;

  if (latestThree.length >= 3 && lowCount >= 2 && lowAverage <= 78) {
    const olderThree = recent.slice(3, 6);
    const repeatedTwice =
      olderThree.length === 3 &&
      olderThree.filter((entry) => entry.eatenPercent < 80).length >= 2 &&
      olderThree.reduce((sum, entry) => sum + entry.eatenPercent, 0) / 3 <= 78;
    return {
      factor: repeatedTwice ? 0.9 : 0.95,
      note: repeatedTwice
        ? "6 registros parecidos: ración reducida un 10 %."
        : "3 registros parecidos: ración reducida un 5 %.",
    };
  }

  if (latestThree.length >= 3 && hungryCount >= 2) {
    return { factor: 1.05, note: "Hambre repetida tras terminar: ración aumentada un 5 %." };
  }

  const lowSoFar = recent.filter((entry) => entry.eatenPercent < 80).length;
  if (recent.length < 3 && lowSoFar > 0) {
    return {
      factor: 1,
      note: `${lowSoFar} registro${lowSoFar === 1 ? "" : "s"} con sobras: aún no se cambia nada.`,
    };
  }
  return { factor: 1, note: null };
}

function addOnFor(personId: PersonId, gapKcal: number) {
  if (gapKcal < 45) return null;
  const rounded = roundTo(gapKcal, 25);
  return personId === "rali"
    ? `Completa unas ${rounded} kcal con queso, pan o más arroz.`
    : `Completa unas ${rounded} kcal con arroz/pasta extra y un lácteo.`;
}

function mealTime(
  state: AppState,
  personId: PersonId,
  date: string,
  slot: MealSlot,
) {
  if (slot === "breakfast") return personId === "adrian" ? "08:15" : "11:30";
  if (slot === "lunch") return "14:40";
  if (slot === "dinner") return personId === "adrian" ? "20:15" : "20:30";

  const activities = activitiesForDay(state, personId, date);
  const gym = activities.find((activity) => activity.category === "gym");
  if (gym) {
    const snackMinute = Math.max(12 * 60, minutes(gym.start) - 75);
    return `${String(Math.floor(snackMinute / 60)).padStart(2, "0")}:${String(snackMinute % 60).padStart(2, "0")}`;
  }
  const afternoonWork = activities.find(
    (activity) => activity.category === "work" && minutes(activity.start) >= 15 * 60,
  );
  if (afternoonWork) {
    const snackMinute = Math.max(15 * 60 + 30, minutes(afternoonWork.start) - 30);
    return `${String(Math.floor(snackMinute / 60)).padStart(2, "0")}:${String(snackMinute % 60).padStart(2, "0")}`;
  }
  return personId === "adrian" ? "17:30" : "18:00";
}

function scenarioNote(mode: ScenarioMode | undefined) {
  if (mode === "no-cook") return "Plan B activado: congelador y despensa, sin cocinar un batch nuevo.";
  if (mode === "eggs") return "Emergencia completa. La siguiente comida vuelve al plan normal.";
  if (mode === "buldak") return "Antojo convertido en comida completa; no hay que compensarlo después.";
  if (mode === "out") return "Comed fuera y volved al plan en la siguiente comida, sin ayuno ni ejercicio de castigo.";
  if (mode === "very-large")
    return "Una comida enorme no se arregla saltándose la siguiente ni entrenando de castigo. Registra lo útil y vuelve al patrón normal.";
  return null;
}

export function plannedMeal(
  state: AppState,
  personId: PersonId,
  date: string,
  slot: MealSlot,
): PlannedMeal {
  const profile = state.profiles[personId];
  const energy = energyForDay(state, personId, date);
  const template = templateForSlot(state, personId, date, slot);
  const scenario = state.scenarios[date];
  const targetKcal = energy.targetKcal * profile.mealSplit[slot];
  const learned = servingAdjustment(state.feedback, personId, slot, template.id);
  const rawScale = (targetKcal / Math.max(1, template.baseKcal)) * learned.factor;
  const minScale = template.kind === "flex" ? 0.8 : 0.65;
  const maxScale = template.kind === "breakfast" ? 1.15 : 1.35;
  const scale = Math.min(maxScale, Math.max(minScale, rawScale));
  const kcal = template.baseKcal * scale;
  const addOnKcal = Math.max(0, targetKcal - kcal);

  return {
    personId,
    slot,
    time: mealTime(state, personId, date, slot),
    template,
    targetKcal: roundTo(targetKcal, 10),
    scale,
    grams: roundTo(template.baseGrams * scale, 5),
    kcal: roundTo(kcal, 10),
    proteinG: Math.round(template.baseProteinG * scale),
    fibreG: Math.round(template.baseFibreG * scale),
    addOn: addOnFor(personId, addOnKcal),
    addOnKcal: roundTo(addOnKcal, 10),
    learningNote: learned.note,
    scenarioNote: scenario?.slot === slot ? scenarioNote(scenario.mode) : null,
  };
}

export function dayPlan(state: AppState, personId: PersonId, date: string) {
  return (["breakfast", "lunch", "snack", "dinner"] as MealSlot[]).map((slot) =>
    plannedMeal(state, personId, date, slot),
  );
}

export function plannedTotals(meals: PlannedMeal[]) {
  return meals.reduce(
    (totals, meal) => ({
      kcal: totals.kcal + meal.kcal + meal.addOnKcal,
      proteinG: totals.proteinG + meal.proteinG,
      fibreG: totals.fibreG + meal.fibreG,
    }),
    { kcal: 0, proteinG: 0, fibreG: 0 },
  );
}

export function scenarioLabel(mode: ScenarioMode) {
  return {
    normal: "Plan normal",
    "no-cook": "Hoy no cocinamos",
    eggs: "Huevos + beans",
    buldak: "Buldak completo",
    out: "Comemos fuera",
    "very-large": "Comida muy grande",
  }[mode];
}
