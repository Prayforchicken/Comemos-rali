/* ============================================================
   Qué se come en cada toma.
   Primero sale "lo que toca": la receta del menú (y su acompañamiento), o la del plan
   de Comemos si no hay menú. Encima, cada toma de cada día se puede decidir por separado:
   - "plan":      lo que toca. Se puede "ajustar solo hoy" (quitar el pan, el azúcar…).
   - "diferente": otra receta, con su ración calculada. También se puede ajustar solo hoy.
   - "sobras":    sobras de una receta (con su ración) o algo escrito a mano.
   - "cheat":     cheat meal sin pesar (Pizza, Hamburguesa del burger…), con kcal aproximadas.
   - "otra":      otra cosa, apuntando alimentos si se quiere.
   Bonus de seguir el plan (+10 en vez de +8), en positivo:
   - lo que toca, aunque se ajuste ese día;
   - cambiar un batch por otro batch (se sigue comiendo batch + su acompañamiento);
   - sobras de una receta del batch de estos días.
   Se guarda fuera del plan (Datos.decisiones) para que el JSON de Comemos siga igual.
   ============================================================ */
import { plannedMeal, roundTo, servingAdjustment, shiftIsoDate } from "../comemos/engine";
import type { AppState, MealSlot, MealTemplate, PlannedMeal } from "../comemos/models";
import { totales } from "../alimentos/nutricion";
import type { Item, RecetaPropia } from "../alimentos/tipos";
import { categoriaDe, menuDe, PARTE_ACOMPANAMIENTO, type GrupoCheat, type Menu } from "../menu/menu";

export type TipoDecision = "plan" | "otra" | "diferente" | "sobras" | "cheat";
export interface Decision {
  tipo: TipoDecision;
  recetaId?: string;
  texto?: string;
  /** Lo que se comió de verdad en "otra cosa" (alimentos + gramos). */
  items?: Item[];
  /** Grupo de cheat meal ("Pizza"…). */
  cheatId?: string;
  /** Ajuste solo para hoy de la receta principal: los ingredientes y gramos que se comen de verdad. */
  ajuste?: Item[];
}
/** fecha (YYYY-MM-DD) → toma → decisión. Si no hay nada, es "plan". */
export type Decisiones = Record<string, Partial<Record<MealSlot, Decision>>>;

/** Lo que hace falta para saber qué se come: sale tal cual de Datos. */
export interface Contexto {
  plan: AppState;
  decisiones: Decisiones;
  recetas: Record<string, RecetaPropia>;
  menus: Menu[];
  cheats: GrupoCheat[];
}

export interface Parte {
  rol: "principal" | "acompanamiento";
  template: MealTemplate;
  grams: number;
  kcal: number;
  proteinG: number;
  fibreG: number;
  /** Solo si está ajustada hoy: lo que se come de verdad. */
  items?: Item[];
}

export interface ComidaDecidida extends PlannedMeal {
  decision: Decision;
  /** true cuando no hay receta detrás (otra cosa, cheat meal o sobras escritas a mano). */
  libre: boolean;
  /** Alimentos apuntados en "otra cosa". Si hay, los números son reales, no estimados. */
  items: Item[];
  /** Receta principal que tocaba, para mostrar "en vez de…". */
  delPlan: MealTemplate;
  /** Receta principal y, si lo hay, acompañamiento, cada uno con su ración. */
  partes: Parte[];
  /** true → da el bonus de seguir el plan (+10); false → +8. */
  bonus: boolean;
  /** Ajustada solo para hoy (se quitó o cambió algún ingrediente). */
  ajustada: boolean;
  /** Receta propia de la parte principal, si la hay (solo esas se pueden ajustar). */
  recetaPropia?: RecetaPropia;
  /** "Curry de tofu + Arroz", "Pizza"… */
  nombre: string;
}

export const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

export const TEXTO_DECISION: Record<TipoDecision, { corto: string; largo: string; color: string }> = {
  plan: { corto: "Lo que toca", largo: "Lo que toca", color: "menta" },
  diferente: { corto: "Otra receta", largo: "Cambiar por otra receta", color: "lavanda" },
  sobras: { corto: "Sobras", largo: "Sobras", color: "cielo" },
  cheat: { corto: "Cheat meal", largo: "Cheat meal", color: "rosa" },
  otra: { corto: "Otra cosa", largo: "Otra cosa (apuntar alimentos)", color: "melocoton" },
};

/** Plan base sin los escenarios por día de Comemos: aquí las decisiones van por comida. */
const sinEscenarios = (plan: AppState): AppState => (Object.keys(plan.scenarios).length ? { ...plan, scenarios: {} } : plan);

export const decisionDe = (d: Decisiones, fecha: string, slot: MealSlot): Decision => d[fecha]?.[slot] ?? { tipo: "plan" };

/** Todas las recetas que se pueden elegir; primero las que encajan en esta toma. */
export function recetasPara(plan: AppState, slot: MealSlot) {
  const activas = plan.mealTemplates.filter((t) => t.active && t.kind !== "flex");
  return [...activas.filter((t) => t.slots.includes(slot)), ...activas.filter((t) => !t.slots.includes(slot))];
}

/* ---------- lo que toca ---------- */

export interface Toca { principal: MealTemplate; acompanamiento?: MealTemplate; parte: number; delMenu: boolean }

export function tocaEn(ctx: Pick<Contexto, "plan" | "menus">, fecha: string, slot: MealSlot): Toca {
  const p = sinEscenarios(ctx.plan);
  const toma = menuDe(ctx.menus, fecha)?.tomas[slot];
  const buscar = (id?: string) => (id ? p.mealTemplates.find((t) => t.id === id && t.active) : undefined);
  const principal = buscar(toma?.recetaId);
  if (toma && principal) {
    return { principal, acompanamiento: buscar(toma.acompanamientoId), parte: toma.parte ?? PARTE_ACOMPANAMIENTO, delMenu: true };
  }
  return { principal: plannedMeal(p, "rali", fecha, slot).template, parte: PARTE_ACOMPANAMIENTO, delMenu: false };
}

/** Recetas del batch de estos días (las de los 4 últimos días en comida y cena): sus sobras dan el bonus. */
export function recetasDelBatch(ctx: Pick<Contexto, "plan" | "menus">, fecha: string) {
  const ids = new Set<string>();
  for (let i = 0; i <= 4; i++) {
    for (const s of ["lunch", "dinner"] as const) {
      const t = tocaEn(ctx, shiftIsoDate(fecha, -i), s).principal;
      if (categoriaDe(t) === "batch") ids.add(t.id);
    }
  }
  return ids;
}

/* ---------- raciones ---------- */

/** Misma cuenta que Comemos (energía de la toma → escala de la receta, con lo aprendido), para un objetivo dado. */
function racion(plan: AppState, base: PlannedMeal, t: MealTemplate, objetivoKcal: number): PlannedMeal {
  const aprendido = servingAdjustment(plan.feedback, "rali", base.slot, t.id);
  const escalaBruta = (objetivoKcal / Math.max(1, t.baseKcal)) * aprendido.factor;
  const escala = Math.min(t.kind === "breakfast" ? 1.15 : 1.35, Math.max(0.65, escalaBruta));
  const kcal = t.baseKcal * escala;
  const hueco = Math.max(0, objetivoKcal - kcal);
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

const parteDe = (m: PlannedMeal, rol: Parte["rol"]): Parte => ({ rol, template: m.template, grams: m.grams, kcal: m.kcal, proteinG: m.proteinG, fibreG: m.fibreG });

function parteAjustada(t: MealTemplate, items: Item[]): Parte {
  const x = totales(items);
  return { rol: "principal", template: t, grams: x.gramos, kcal: x.kcal, proteinG: Math.round(x.proteina), fibreG: Math.round(x.fibra), items };
}

/** Plantilla para lo que no es una receta (otra cosa, cheat, sobras a mano). */
function plantillaLibre(base: PlannedMeal, nombre: string, kcal: number, proteina: number, fibra: number, gramos: number, ingredientes: string[] = []): MealTemplate {
  return { id: "libre", name: nombre, shortName: nombre, kind: "flex", baseKcal: kcal, baseProteinG: proteina, baseFibreG: fibra, baseGrams: gramos, ingredients: ingredientes, instructions: "", tags: [], slots: [base.slot], active: true };
}

export function comidaDecidida(ctx: Contexto, fecha: string, slot: MealSlot): ComidaDecidida {
  const p = sinEscenarios(ctx.plan);
  const base = plannedMeal(p, "rali", fecha, slot);
  const toca = tocaEn(ctx, fecha, slot);
  const decision = decisionDe(ctx.decisiones, fecha, slot);
  const buscar = (id?: string) => (id ? p.mealTemplates.find((t) => t.id === id) : undefined);

  /** Receta (+ acompañamiento), con su ración para esta toma y el ajuste de hoy si lo hay. */
  const armar = (principal: MealTemplate, acomp: MealTemplate | undefined, nota: string | null, bonus: boolean): ComidaDecidida => {
    const ajuste = decision.ajuste?.length ? decision.ajuste : undefined;
    // Sin menú, sin acompañamiento ni ajuste, lo que toca es exactamente la cuenta de Comemos.
    const mP = !toca.delMenu && !acomp && principal.id === base.template.id ? base : racion(p, base, principal, base.targetKcal * (acomp ? 1 - toca.parte : 1));
    const partes: Parte[] = [ajuste ? parteAjustada(principal, ajuste) : parteDe(mP, "principal")];
    if (acomp) partes.push(parteDe(racion(p, base, acomp, base.targetKcal * toca.parte), "acompanamiento"));
    const suma = (k: "grams" | "kcal" | "proteinG" | "fibreG") => partes.reduce((s, x) => s + x[k], 0);
    const conHueco = !acomp && !ajuste;
    return {
      ...mP,
      grams: suma("grams"), kcal: suma("kcal"), proteinG: suma("proteinG"), fibreG: suma("fibreG"),
      addOn: conHueco ? mP.addOn : null, addOnKcal: conHueco ? mP.addOnKcal : 0,
      learningNote: ajuste ? null : mP.learningNote,
      scenarioNote: nota,
      decision, libre: false, items: [], delPlan: toca.principal, partes, bonus, ajustada: Boolean(ajuste),
      recetaPropia: ctx.recetas[principal.id],
      nombre: partes.length === 1 ? partes[0].template.name : partes.map((x) => x.template.shortName).join(" + "),
    };
  };

  const libre = (nombre: string, nota: string, kcal: number, proteina: number, fibra: number, items: Item[] = []): ComidaDecidida => {
    const x = items.length ? totales(items) : null;
    const t = x
      ? plantillaLibre(base, nombre, x.kcal, x.proteina, x.fibra, x.gramos, items.map((i) => `${i.gramos} g ${i.nombre}`))
      : plantillaLibre(base, nombre, kcal, proteina, fibra, 0);
    const m: PlannedMeal = {
      ...base, template: t, scale: 1, grams: t.baseGrams, kcal: Math.round(t.baseKcal), proteinG: Math.round(t.baseProteinG), fibreG: Math.round(t.baseFibreG),
      addOn: null, addOnKcal: 0, learningNote: null, scenarioNote: nota,
    };
    return { ...m, decision, libre: true, items, delPlan: toca.principal, partes: [parteDe(m, "principal")], bonus: false, ajustada: false, nombre };
  };

  const esBatch = (t: MealTemplate) => categoriaDe(t) === "batch";

  if (decision.tipo === "cheat") {
    const g = ctx.cheats.find((x) => x.id === decision.cheatId);
    return libre(g?.nombre ?? decision.texto ?? "Cheat meal", "Cheat meal: se disfruta sin contar al miligramo. La siguiente comida vuelve al plan.", g?.kcal ?? base.targetKcal, g?.proteina ?? 0, g?.fibra ?? 0);
  }
  if (decision.tipo === "otra") {
    const nombre = decision.texto?.trim() || decision.items?.[0]?.nombre || "Otra cosa";
    return libre(nombre, "Disfrútala sin compensar nada: la siguiente comida vuelve al plan.", base.targetKcal, 0, 0, decision.items ?? []);
  }
  const receta = buscar(decision.recetaId);
  if (decision.tipo === "diferente" && receta) {
    // Batch por batch: se sigue comiendo batch + el acompañamiento que tocaba, así que mantiene el bonus.
    const batchPorBatch = esBatch(receta) && esBatch(toca.principal);
    return armar(receta, batchPorBatch ? toca.acompanamiento : undefined, `En vez de ${toca.principal.shortName}.`, batchPorBatch);
  }
  if (decision.tipo === "sobras") {
    if (receta) {
      const delBatch = recetasDelBatch(ctx, fecha).has(receta.id);
      return armar(receta, esBatch(receta) && esBatch(toca.principal) ? toca.acompanamiento : undefined,
        delBatch ? "Sobras del batch: cuentan como lo que toca." : "Sobras: sírvete esta ración y guarda el resto.", delBatch);
    }
    const nombre = decision.texto?.trim() ? `Sobras de ${decision.texto.trim()}` : "Sobras";
    return libre(nombre, "Sobras sin receta: sírvete una ración normal, sin pesar.", base.targetKcal, 0, 0);
  }
  return armar(toca.principal, toca.acompanamiento, null, true);
}

export const diaDecidido = (ctx: Contexto, fecha: string) => SLOTS.map((s) => comidaDecidida(ctx, fecha, s));

/** Pone (o quita, si es "plan" sin ajuste) la decisión de una toma. */
export function decidir(decisiones: Decisiones, fecha: string, slot: MealSlot, decision: Decision): Decisiones {
  const dia = { ...(decisiones[fecha] ?? {}) };
  if (decision.tipo === "plan" && !decision.ajuste?.length) delete dia[slot]; else dia[slot] = decision;
  const resto = { ...decisiones };
  if (Object.keys(dia).length) resto[fecha] = dia; else delete resto[fecha];
  return resto;
}
