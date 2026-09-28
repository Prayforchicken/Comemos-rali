/* ============================================================
   Energía de Rali (y de sus animalitos, que la reflejan).
   No es una necesidad que haya que cuidar: sale sola de cómo es el día.
   - Estar despierta gasta un poquito cada hora.
   - Cada actividad del plan (trabajo, batch cooking, gimnasio…) gasta más mientras dura.
   - Dormir recarga. Si el día fue muy cargado y la noche no llega, al día siguiente
     el animalito amanece cansadito.
   Es una función pura: se recalcula a partir del plan, sin guardar nada.
   Los números ajustables están en reglas.ts (GASTO_POR_HORA, RECARGA_POR_HORA_DORMIDA…).
   ============================================================ */
import { activitiesForDay, shiftIsoDate } from "../comemos/engine";
import type { ActivityCategory, AppState } from "../comemos/models";
import { GASTO_DESPIERTA, GASTO_POR_HORA, GIMNASIO_SIN_PLAN_MIN, RECARGA_POR_HORA_DORMIDA, SUELO_ENERGIA } from "./reglas";
import type { Logro } from "./tipos";

export interface Gasto { etiqueta: string; categoria: ActivityCategory | "despierta"; puntos: number }
export interface EnergiaHumana {
  /** 0–100 ahora mismo. */
  valor: number;
  /** Con cuánta energía amaneció hoy (después de dormir). */
  amanecio: number;
  durmiendo: boolean;
  /** Fecha (YYYY-MM-DD) del "día despierto" actual: si son las 2 de la madrugada, aún es ayer. */
  dia: string;
  /** Qué ha gastado energía hoy hasta ahora. */
  gastos: Gasto[];
}

const H = 3_600_000;
const aMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
/** Fecha local + hora "HH:MM" → milisegundos. */
function en(fecha: string, hhmm: string) {
  const [y, mo, d] = fecha.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0).getTime();
}
const fechaLocal = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const solape = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)) / H;

export function energiaHumana(plan: AppState, logros: Logro[], ahora: Date): EnergiaHumana {
  const perfil = plan.profiles.rali;
  const despertar = perfil.wakeTime, dormir = perfil.sleepTime;
  // Si se duerme "antes" que se despierta (03:30 < 11:00), se duerme ya al día siguiente.
  const duermeManana = aMin(dormir) <= aMin(despertar);
  const levanta = (f: string) => en(f, despertar);
  const acuesta = (f: string) => en(duermeManana ? shiftIsoDate(f, 1) : f, dormir);
  const horasSueno = (levanta(shiftIsoDate(fechaLocal(ahora.getTime()), 1)) - acuesta(fechaLocal(ahora.getTime()))) / H;

  const t = ahora.getTime();
  const hoyCal = fechaLocal(t);
  const dia = t >= levanta(hoyCal) ? hoyCal : shiftIsoDate(hoyCal, -1);

  // Gimnasio marcado a mano un día sin gimnasio en el plan: cuenta los minutos antes de marcarlo.
  const gymMarcado = (f: string) => logros.find((l) => l.tipo === "gimnasio" && l.fecha === f);

  const gastosDe = (f: string, hasta: number): Gasto[] => {
    const desde = levanta(f), fin = Math.min(hasta, acuesta(f));
    if (fin <= desde) return [];
    const out: Gasto[] = [{ etiqueta: "Estar despierta", categoria: "despierta", puntos: GASTO_DESPIERTA * ((fin - desde) / H) }];
    const acts = activitiesForDay(plan, "rali", f);
    for (const a of acts) {
      const i = en(f, a.start);
      let j = en(f, a.end);
      if (j <= i) j += 24 * H;
      const h = solape(i, j, desde, fin);
      if (h > 0) out.push({ etiqueta: a.label, categoria: a.category, puntos: GASTO_POR_HORA[a.category] * h });
    }
    const g = gymMarcado(f);
    if (g && !acts.some((a) => a.category === "gym")) {
      const j = new Date(g.creado).getTime(), i = j - GIMNASIO_SIN_PLAN_MIN * 60_000;
      const h = solape(i, j, desde, fin);
      if (h > 0) out.push({ etiqueta: "Gimnasio", categoria: "gym", puntos: GASTO_POR_HORA.gym * h });
    }
    return out;
  };
  const suma = (g: Gasto[]) => g.reduce((s, x) => s + x.puntos, 0);
  const limitar = (v: number) => Math.max(SUELO_ENERGIA, Math.min(100, v));

  // Se empieza descansada hace 4 días y se van encadenando días y noches.
  let e = 100;
  let amanecio = 100;
  for (let i = 4; i >= 0; i--) {
    const f = shiftIsoDate(dia, -i);
    if (i < 4) e = limitar(e + RECARGA_POR_HORA_DORMIDA * horasSueno);
    if (i === 0) amanecio = e;
    e = limitar(e - suma(gastosDe(f, i === 0 ? t : Infinity)));
  }
  // Ya en la cama después del día de hoy: recarga lo dormido hasta ahora.
  const durmiendo = t >= acuesta(dia);
  if (durmiendo) e = limitar(e + RECARGA_POR_HORA_DORMIDA * ((t - acuesta(dia)) / H));

  const gastos = gastosDe(dia, t).map((g) => ({ ...g, puntos: Math.round(g.puntos) })).filter((g) => g.puntos > 0);
  return { valor: Math.round(e), amanecio: Math.round(amanecio), durmiendo, dia, gastos };
}
