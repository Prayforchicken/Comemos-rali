/* ============================================================
   La nevera: lotes cocinados y a dónde va cada ración.
   Funciones puras: reciben Datos y devuelven Datos nuevos (o un cálculo).
   ============================================================ */
import { por, totales } from "../alimentos/nutricion";
import type { Item, Totales } from "../alimentos/tipos";
import { diasEntre, fechaDe, horaDe, minutos, momentoDe, sumarDias } from "./fechas";
import type { Datos, Destino, Lote, Momento, Receta, Salida } from "./tipos";

export interface Toma { fecha: string; momento: Momento }

export const nuevoId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const quedan = (l: Lote) => Math.max(0, l.raciones - l.salidas.length);

/** Lotes con raciones, del más antiguo al más nuevo: se come primero lo que lleva más tiempo. */
export function enNevera(d: Datos): Lote[] {
  return d.lotes
    .filter((l) => quedan(l) > 0)
    .sort((a, b) => a.hecho.localeCompare(b.hecho) || a.creado.localeCompare(b.creado));
}

export const racionesEnNevera = (d: Datos) => enNevera(d).reduce((s, l) => s + quedan(l), 0);

/* ---------------- frescura ---------------- */

export type Estado = "bien" | "ya" | "tirar";

/** 0–2 días: bien. 3–4: cómetelo ya. 5 o más: mejor a la basura (la regla habitual es 3–4 días en nevera). */
export function frescura(l: Lote, hoy: string): { dias: number; estado: Estado } {
  const dias = Math.max(0, diasEntre(l.hecho, hoy));
  return { dias, estado: dias >= 5 ? "tirar" : dias >= 3 ? "ya" : "bien" };
}

/* ---------------- tomas previstas ---------------- */

const siguiente = (t: Toma): Toma => (t.momento === "comida" ? { fecha: t.fecha, momento: "cena" } : { fecha: sumarDias(t.fecha, 1), momento: "comida" });

/** Momento de una ración que sale ahora (comida o cena, según la hora). */
export function momentoAhora(d: Datos, ahora: Date): Momento {
  return momentoDe(horaDe(ahora), d.ajustes.horaComida, d.ajustes.horaCena);
}

/** La próxima toma que aún no se ha comido del batch. De madrugada o muy tarde, la comida de mañana. */
export function primeraTomaLibre(d: Datos, ahora: Date): Toma {
  const hoy = fechaDe(ahora);
  if (minutos(horaDe(ahora)) > minutos(d.ajustes.horaCena) + 120) return { fecha: sumarDias(hoy, 1), momento: "comida" };
  let t: Toma = { fecha: hoy, momento: momentoAhora(d, ahora) };
  const comida = (x: Toma) => d.lotes.some((l) => l.salidas.some((s) => s.destino === "comida" && s.fecha === x.fecha && s.momento === x.momento));
  while (comida(t)) t = siguiente(t);
  return t;
}

/** Reparte lo que queda en la nevera en las próximas tomas (lo más antiguo primero). */
export function proyectar(d: Datos, ahora: Date): { loteId: string; toma: Toma }[] {
  const plan: { loteId: string; toma: Toma }[] = [];
  let t = primeraTomaLibre(d, ahora);
  for (const l of enNevera(d)) {
    for (let i = 0; i < quedan(l); i++) { plan.push({ loteId: l.id, toma: t }); t = siguiente(t); }
  }
  return plan;
}

export const tomasDeLote = (d: Datos, loteId: string, ahora: Date) => proyectar(d, ahora).filter((p) => p.loteId === loteId).map((p) => p.toma);

/** Tomas que cubriría un batch nuevo de `n` raciones, justo después de lo que ya hay en la nevera. */
export function tomasDeNuevoBatch(d: Datos, n: number, ahora: Date): Toma[] {
  const plan = proyectar(d, ahora);
  let t = plan.length ? siguiente(plan[plan.length - 1].toma) : primeraTomaLibre(d, ahora);
  const tomas: Toma[] = [];
  for (let i = 0; i < n; i++) { tomas.push(t); t = siguiente(t); }
  return tomas;
}

/* ---------------- cambios ---------------- */

const escalar = (items: Item[], f: number): Item[] => items.map((i) => ({ ...i, gramos: Math.round(i.gramos * f) }));

/** Kcal y macros de una ración de una receta al tamaño elegido. */
export const racionDe = (r: Receta, tamano: number): Totales => por(totales(r.ingredientes), tamano / 100);

/** "Lo hago": la receta pasa a la nevera con sus raciones. */
export function cocinar(d: Datos, r: Receta, raciones: number, ahora: Date): Datos {
  const f = d.ajustes.tamano / 100;
  const lote: Lote = {
    id: nuevoId("lote"), recetaId: r.id, nombre: r.nombre, porRacion: racionDe(r, d.ajustes.tamano), raciones,
    hecho: fechaDe(ahora), creado: ahora.toISOString(), ingredientes: escalar(r.ingredientes, f), guardar: r.guardar, salidas: [],
  };
  return { ...d, lotes: [...d.lotes, lote], propuesta: null };
}

/** "Ya tengo algo hecho": un táper que no viene de una receta de la app (sobras, lo que trajo alguien…). */
export function anadirAMano(d: Datos, x: { nombre: string; raciones: number; hecho: string; porRacion: Totales }, ahora: Date): Datos {
  const lote: Lote = {
    id: nuevoId("lote"), recetaId: null, nombre: x.nombre, porRacion: x.porRacion, raciones: x.raciones,
    hecho: x.hecho, creado: ahora.toISOString(), ingredientes: [], guardar: "", salidas: [],
  };
  return { ...d, lotes: [...d.lotes, lote] };
}

/** Saca una ración: comida (suma al día), para Rali o a la basura. */
export function sacar(d: Datos, loteId: string, destino: Destino, ahora: Date): { datos: Datos; salida: Salida | null } {
  const lote = d.lotes.find((l) => l.id === loteId);
  if (!lote || quedan(lote) <= 0) return { datos: d, salida: null };
  const salida: Salida = { id: nuevoId("salida"), destino, cuando: ahora.toISOString(), fecha: fechaDe(ahora), momento: momentoAhora(d, ahora) };
  return { datos: { ...d, lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, salidas: [...l.salidas, salida] } : l)) }, salida };
}

export function deshacer(d: Datos, loteId: string, salidaId: string): Datos {
  return { ...d, lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, salidas: l.salidas.filter((s) => s.id !== salidaId) } : l)) };
}

/** Si al final salieron más o menos raciones de las previstas. Nunca menos de las que ya han salido. */
export function cambiarRaciones(d: Datos, loteId: string, raciones: number): Datos {
  return { ...d, lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, raciones: Math.max(l.salidas.length, Math.min(20, Math.round(raciones))) } : l)) };
}

export const borrarLote = (d: Datos, loteId: string): Datos => ({ ...d, lotes: d.lotes.filter((l) => l.id !== loteId) });
