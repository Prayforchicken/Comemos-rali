export type PersonId = "adrian" | "rali";

export type Goal = "recomposition" | "weight-loss" | "maintenance";

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

export type ScenarioMode =
  | "normal"
  | "no-cook"
  | "eggs"
  | "buldak"
  | "out"
  | "very-large";

export interface Profile {
  id: PersonId;
  name: string;
  color: string;
  sexAtBirth: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  goalDeltaKcal: number;
  minimumKcal: number;
  maximumKcal: number;
  proteinTargetG: number;
  fibreTargetG: number;
  waterTargetMl: number;
  mealSplit: Record<MealSlot, number>;
  wakeTime: string;
  sleepTime: string;
  notes: string[];
}

export type ActivityCategory =
  | "work"
  | "walk"
  | "bike"
  | "gym"
  | "chores"
  | "other";

export interface ActivityRule {
  id: string;
  personId: PersonId;
  label: string;
  category: ActivityCategory;
  days: number[];
  start: string;
  end: string;
  enabled: boolean;
  energyMode: "met" | "fixed";
  met: number;
  fixedKcal: number;
  trainingPlan?: string;
  notes?: string;
}

export interface ActivityOverride {
  disabledRuleIds: string[];
  extras: ActivityRule[];
}

export interface MealTemplate {
  id: string;
  name: string;
  shortName: string;
  kind: "breakfast" | "batch" | "quick" | "emergency" | "flex";
  baseKcal: number;
  baseProteinG: number;
  baseFibreG: number;
  baseGrams: number;
  ingredients: string[];
  instructions: string;
  tags: string[];
  slots: MealSlot[];
  active: boolean;
}

export interface DayScenario {
  mode: ScenarioMode;
  slot: "lunch" | "dinner";
  note?: string;
}

export interface MealFeedback {
  id: string;
  date: string;
  createdAt: string;
  personId: PersonId;
  slot: MealSlot;
  templateId: string;
  plannedGrams: number;
  servedGrams: number;
  eatenPercent: number;
  hungerAfter: number;
  enjoyment: number;
  note: string;
}

export interface WeightLog {
  id: string;
  personId: PersonId;
  date: string;
  weightKg: number;
}

export interface SupplementItem {
  id: string;
  personId: PersonId;
  label: string;
  note: string;
  enabled: boolean;
}

export interface DailyChecks {
  supplements: string[];
}

export interface AppState {
  version: 1;
  profiles: Record<PersonId, Profile>;
  activities: ActivityRule[];
  activityOverrides: Record<string, Partial<Record<PersonId, ActivityOverride>>>;
  mealTemplates: MealTemplate[];
  scenarios: Record<string, DayScenario>;
  feedback: MealFeedback[];
  weightLogs: WeightLog[];
  waterLogs: Record<string, Record<PersonId, number>>;
  supplements: SupplementItem[];
  dailyChecks: Record<string, DailyChecks>;
  settings: {
    timezone: string;
    cookCycleAnchor: string;
    batchLunchTemplateId: string;
    batchDinnerTemplateId: string;
    selectedPerson: PersonId;
  };
}

export interface PlannedMeal {
  personId: PersonId;
  slot: MealSlot;
  time: string;
  template: MealTemplate;
  targetKcal: number;
  scale: number;
  grams: number;
  kcal: number;
  proteinG: number;
  fibreG: number;
  addOn: string | null;
  addOnKcal: number;
  learningNote: string | null;
  scenarioNote: string | null;
}

export interface EnergyEstimate {
  bmr: number;
  baseLiving: number;
  activityKcal: number;
  maintenanceKcal: number;
  targetKcal: number;
  proteinTargetG: number;
  fibreTargetG: number;
}
