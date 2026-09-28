/* ============================================================
   Decisiones por comida.
   Cada toma (desayuno, comida, merienda, cena) de cada día puede decidirse por separado:
   - "plan":      comer lo que hay (lo que calcula Comemos).
   - "otra":      comer otra cosa, p. ej. pizza o comer fuera. No se pesa.
   - "diferente": cambiar a otra receta; se calcula su ración para esa toma.
   - "sobras":    comer sobras de una receta (con su ración) o algo escrito a mano.
   Se guardan fuera del plan (Datos.decisiones) para que el JSON de Comemos siga igual.
   Todas cuentan como "lo del plan": marcar cualquiera da huellitas.
   ============================================================ */
import { plannedMeal, roundTo, servingAdjustment } from "../comemos/engine";
import type { AppState, MealSlot, MealTemplate, PlannedMeal } from "../comemos/models";
import { totales } from "../alimentos/nutricion";
import type { Item } from "../alimentos/tipos";

export type TipoDecision = "plan" | "otra" | "diferente" | "sobras";
export interface Decision { tipo: TipoDecision; recetaId?: string; texto?: string; /** Lo que se comió de verdad en "otra cosa" (alimentos + gramos). */ items?: Item[] }
/** fecha (YYYY-MM-DD) → toma → decisión. Si no hay nada, es "plan". */
export type Decisiones = Record<string, Partial<Record<MealSlot, Decision>>>;

export interface ComidaDecidida extends PlannedMeal {
  decision: Decision;
  /** true cuando no hay receta del plan detrás (otra cosa, o sobras escritas a mano). */
  libre: boolean;
  /** Alimentos apuntados en "otra cosa". Si hay, los números son reales, no estimados. */
  items: Item[];
  /** Receta que calculaba el plan, para mostrar "en vez de…". */
  delPlan: MealTemplate;
}

export const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

export const TEXTO_DECISION: Record<TipoDecision, { corto: string; largo: string; color: string }> = {
  plan: { corto: "Lo que hay", largo: "Comer lo que hay", color: "menta" },
  otra: { corto: "Otra cosa", largo: "Otra cosa (pizza, fuera…)", color: "melocoton" },
  diferente: { corto: "Algo diferente", largo: "Otra receta", color: "lavanda" },
  sobras: { corto: "Sobras", largo: "Sobras", color: "cielo" },
};

/** Plan base sin los escenarios por día de Comemos: aquí las decisiones van por comida. */
const sinEscenarios = (plan: AppState): AppState => (Object.keys(plan.scenarios).length ? { ...plan, scenarios: {} } : plan);

export const decisionDe = (d: Decisiones, fecha: string, slot: MealSlot): Decision => d[fecha]?.[slot] ?? { tipo: "plan" };

/** Recetas que se pueden elegir en una toma (todas las activas que sirven para ella). */
export function recetasPara(plan: AppState, slot: MealSlot) {
  return plan.mealTemplates.filter((t) => t.active && t.kind !== "flex" && t.slots.includes(slot));
}

/** Misma cuenta que Comemos, pero con la receta elegida. */
function conReceta(plan: AppState, base: PlannedMeal, t: MealTemplate): PlannedMeal {
  const aprendido = servingAdjustment(plan.feedback, "rali", base.slot, t.id);
  const escalaBruta = (base.targetKcal / Math.max(1, t.baseKcal)) * aprendido.factor;
  const escala = Math.min(t.kind === "breakfast" ? 1.15 : 1.35, Math.max(0.65, escalaBruta));
  const kcal = t.baseKcal * escala;
  const hueco = Math.max(0, base.targetKcal - kcal);
  return {
    ...base,
    template: t,
    scale: escala,
    grams: roundTo(t.baseGrams * escala, 5),
    kcal: roundTo(kcal, 10),
    proteinG: Math.round(t.baseProteinG * escala),
    fibreG: Math.round(t.baseFibreG * escala),
    addOn: hueco >= 45 ? `Completa unas ${roundTo(hueco, 25)} kcal con queso, pan o más arroz.` : null,
    addOnKcal: roundTo(hueco, 10),
    learningNote: aprendido.note,
    scenarioNote: null,
  };
}

function libre(base: PlannedMeal, nombre: string, nota: string, items: Item[] = []): PlannedMeal {
  if (items.length) {
    const t = totales(items);
    const tpl: MealTemplate = {
      id: "libre", name: nombre, shortName: nombre, kind: "flex", baseKcal: t.kcal, baseProteinG: t.proteina, baseFibreG: t.fibra, baseGrams: t.gramos,
      ingredients: items.map((i) => `${i.gramos} g ${i.nombre}`), instructions: "", tags: [], slots: [base.slot], active: true,
    };
    return { ...base, template: tpl, scale: 1, grams: t.gramos, kcal: t.kcal, proteinG: Math.round(t.proteina), fibreG: Math.round(t.fibra), addOn: null, addOnKcal: 0, learningNote: null, scenarioNote: nota };
  }
  const t: MealTemplate = {
    id: "libre", name: nombre, shortName: nombre, kind: "flex", baseKcal: base.targetKcal, baseProteinG: 0, baseFibreG: 0, baseGrams: 0,
    ingredients: [], instructions: "", tags: [], slots: [base.slot], active: true,
  };
  return { ...base, template: t, scale: 1, grams: 0, kcal: base.targetKcal, proteinG: 0, fibreG: 0, addOn: null, addOnKcal: 0, learningNote: null, scenarioNote: nota };
}

export function comidaDecidida(plan: AppState, decisiones: Decisiones, fecha: string, slot: MealSlot): ComidaDecidida {
  const p = sinEscenarios(plan);
  const base = plannedMeal(p, "rali", fecha, slot);
  const decision = decisionDe(decisiones, fecha, slot);
  const receta = decision.recetaId ? p.mealTemplates.find((t) => t.id === decision.recetaId) : undefined;
  const envolver = (m: PlannedMeal, esLibre: boolean): ComidaDecidida => ({ ...m, decision, libre: esLibre, items: decision.items ?? [], delPlan: base.template });

  if (decision.tipo === "otra") {
    const nombre = decision.texto?.trim() || decision.items?.[0]?.nombre || "Otra cosa";
    return envolver(libre(base, nombre, "Disfrútala sin compensar nada: la siguiente comida vuelve al plan.", decision.items), true);
  }
  if (decision.tipo === "diferente" && receta) {
    return envolver({ ...conReceta(p, base, receta), scenarioNote: `En vez de ${base.template.shortName}.` }, false);
  }
  if (decision.tipo === "sobras") {
    if (receta) return envolver({ ...conReceta(p, base, receta), scenarioNote: "Sobras: sírvete esta ración y guarda el resto." }, false);
    return envolver(libre(base, decision.texto?.trim() ? `Sobras de ${decision.texto.trim()}` : "Sobras", "Sobras sin receta: sírvete una ración normal, sin pesar."), true);
  }
  return envolver(base, false);
}

export const diaDecidido = (plan: AppState, decisiones: Decisiones, fecha: string) =>
  SLOTS.map((s) => comidaDecidida(plan, decisiones, fecha, s));

/** Pone (o quita, si es "plan") la decisión de una toma. */
export function decidir(decisiones: Decisiones, fecha: string, slot: MealSlot, decision: Decision): Decisiones {
  const dia = { ...(decisiones[fecha] ?? {}) };
  if (decision.tipo === "plan") delete dia[slot]; else dia[slot] = decision;
  const resto = { ...decisiones };
  if (Object.keys(dia).length) resto[fecha] = dia; else delete resto[fecha];
  return resto;
}
