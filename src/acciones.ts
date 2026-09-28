/* ============================================================
   Acciones que tocan a la vez el plan (Comemos) y el juego.
   Cada una recibe los datos y devuelve { datos, premio } sin efectos secundarios.
   ============================================================ */
import type { MealFeedback, MealSlot, PlannedMeal, ScenarioMode } from "./comemos/models";
import type { Datos } from "./datos/almacen";
import { ganar, logroDe } from "./juego/motor";
import { PUNTOS } from "./juego/reglas";
import type { Especie, Logro } from "./juego/tipos";

export interface Premio { puntos: number; motivo: string; extra?: string; nuevas: Especie[] }
export interface Resultado { datos: Datos; premios: Premio[] }

const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
const nuevoId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const textoMult = (l: Logro) => (l.multiplicador > 1 ? `x${l.multiplicador.toLocaleString("es-ES")} por tus animalitos` : undefined);

export interface DetalleComida { servido: number; comido: number; hambre: number; rico: number; nota: string; registrar: boolean }

/** Rali se ha comido lo del plan (la cantidad que sea). Guarda el registro para el aprendizaje de raciones. */
/** `delPlan`: true si es "lo que hay" (+10); cualquier otra decisión da +8. */
export function comidaDelPlan(d: Datos, fecha: string, comida: PlannedMeal, x: DetalleComida, delPlan = true): Resultado {
  const registro: MealFeedback = {
    id: nuevoId("feedback"), date: fecha, createdAt: new Date().toISOString(), personId: "rali",
    slot: comida.slot, templateId: comida.template.id, plannedGrams: comida.grams, servedGrams: Math.max(1, Math.round(x.servido)),
    eatenPercent: x.comido, hungerAfter: x.hambre, enjoyment: x.rico, note: x.nota.trim().slice(0, 300),
  };
  // Solo se aprende de las recetas que se pesan (no de "otra cosa" ni de sobras escritas a mano).
  const plan = x.registrar ? { ...d.plan, feedback: [registro, ...d.plan.feedback].slice(0, 500) } : d.plan;
  const premios: Premio[] = [];
  const r = ganar(d.juego, fecha, "comida", delPlan ? PUNTOS.comida : PUNTOS.comidaOtra, comida.slot);
  let juego = r.juego;
  if (r.logro) premios.push({ puntos: r.logro.puntos, motivo: delPlan ? "¡Comida según el plan!" : "¡Comida apuntada!", extra: textoMult(r.logro) ?? (delPlan ? undefined : "Sin el bonus de seguir el plan"), nuevas: r.nuevas });
  if (SLOTS.every((s) => logroDe(juego, fecha, "comida", s))) {
    const r2 = ganar(juego, fecha, "dia-completo", PUNTOS.diaCompleto);
    juego = r2.juego;
    if (r2.logro) premios.push({ puntos: r2.logro.puntos, motivo: "¡Día completo!", extra: "Las cuatro comidas apuntadas", nuevas: r2.nuevas });
  }
  return { datos: { ...d, plan, juego }, premios };
}

export function gimnasio(d: Datos, fecha: string): Resultado {
  const r = ganar(d.juego, fecha, "gimnasio", PUNTOS.gimnasio);
  return { datos: { ...d, juego: r.juego }, premios: r.logro ? [{ puntos: r.logro.puntos, motivo: "¡Gimnasio hecho!", extra: textoMult(r.logro), nuevas: r.nuevas }] : [] };
}

export function agua(d: Datos, fecha: string, ml: number): Resultado {
  const perfil = d.plan.profiles.rali;
  const antes = d.plan.waterLogs[fecha]?.rali ?? 0;
  const ahora = Math.max(0, Math.min(perfil.waterTargetMl + 1500, antes + ml));
  const plan = { ...d.plan, waterLogs: { ...d.plan.waterLogs, [fecha]: { adrian: d.plan.waterLogs[fecha]?.adrian ?? 0, rali: ahora } } };
  let juego = d.juego;
  const premios: Premio[] = [];
  if (ahora >= perfil.waterTargetMl) {
    const r = ganar(juego, fecha, "agua", PUNTOS.agua);
    juego = r.juego;
    if (r.logro) premios.push({ puntos: r.logro.puntos, motivo: "¡Agua del día!", extra: textoMult(r.logro), nuevas: r.nuevas });
  }
  return { datos: { ...d, plan, juego }, premios };
}

export function escenario(d: Datos, fecha: string, modo: ScenarioMode, slot: "lunch" | "dinner"): Datos {
  const scenarios = { ...d.plan.scenarios };
  if (modo === "normal") delete scenarios[fecha];
  else scenarios[fecha] = { mode: modo, slot };
  return { ...d, plan: { ...d.plan, scenarios } };
}

export function suplemento(d: Datos, fecha: string, id: string, hecho: boolean): Datos {
  const lista = new Set(d.plan.dailyChecks[fecha]?.supplements ?? []);
  if (hecho) lista.add(id); else lista.delete(id);
  return { ...d, plan: { ...d.plan, dailyChecks: { ...d.plan.dailyChecks, [fecha]: { supplements: [...lista] } } } };
}

/** Cambia solo el plan (formato Comemos) sin tocar el juego. */
export const enPlan = (fn: (p: Datos["plan"]) => Datos["plan"]) => (d: Datos): Datos => ({ ...d, plan: fn(d.plan) });
