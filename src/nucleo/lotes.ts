/* ============================================================
   La nevera: tápers con su peso y lo que sale de cada uno, en gramos.
   Funciones puras: reciben Datos y devuelven Datos nuevos (o un cálculo).
   ============================================================ */
import { por, totales } from "../alimentos/nutricion";
import type { Por100, Totales } from "../alimentos/tipos";
import { diasEntre, fechaDe, horaDe, minutos, momentoDe, sumarDias } from "./fechas";
import { escalar, pesoEstimado, racionDe } from "./receta";
import type { Datos, Destino, Lote, Momento, Receta, Salida, Tipo } from "./tipos";

export interface Toma { fecha: string; momento: Momento }

export const nuevoId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Por debajo de esto un táper se da por vacío (restos de pesar). */
const VACIO_G = 5;

export const salido = (l: Lote) => l.salidas.reduce((s, x) => s + x.gramos, 0);
export const quedan = (l: Lote) => Math.max(0, Math.round(l.gramos - salido(l)));

/** Macros por 100 g de lo cocinado. */
export function por100(l: Lote): Por100 {
  const t = por(l.total, 100 / Math.max(1, l.gramos));
  return { kcal: t.kcal, proteina: t.proteina, carbos: t.carbos, grasa: t.grasa, fibra: t.fibra };
}

/** Kcal y macros de `g` gramos de un táper. */
export const macrosDe = (l: Lote, g: number): Totales => ({ ...por(l.total, g / Math.max(1, l.gramos)), gramos: g });

/** Tápers con comida, del más antiguo al más nuevo: se come primero lo que lleva más tiempo. */
export function enNevera(d: Datos): Lote[] {
  return d.lotes
    .filter((l) => quedan(l) >= VACIO_G)
    .sort((a, b) => a.hecho.localeCompare(b.hecho) || a.creado.localeCompare(b.creado));
}

export interface Grupo { batchId: string; lotes: Lote[]; nombre: string; hecho: string }

/** Tápers agrupados por cocinado (el curry con su arroz), del más antiguo al más nuevo. */
export function grupos(d: Datos): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const l of enNevera(d)) {
    const g = mapa.get(l.batchId) ?? { batchId: l.batchId, lotes: [], nombre: "", hecho: l.hecho };
    g.lotes.push(l);
    mapa.set(l.batchId, g);
  }
  for (const g of mapa.values()) g.nombre = g.lotes.map((l) => l.nombre).join(" + ");
  return [...mapa.values()];
}

/* ---------------- frescura ---------------- */

export type Estado = "bien" | "ya" | "tirar";

/** 0–2 días: bien. 3–4: cómetelo ya. 5 o más: mejor a la basura (la regla habitual es 3–4 días en nevera). */
export function frescura(l: { hecho: string }, hoy: string): { dias: number; estado: Estado } {
  const dias = Math.max(0, diasEntre(l.hecho, hoy));
  return { dias, estado: dias >= 5 ? "tirar" : dias >= 3 ? "ya" : "bien" };
}

/* ---------------- tomas previstas ---------------- */

export const siguiente = (t: Toma): Toma => (t.momento === "comida" ? { fecha: t.fecha, momento: "cena" } : { fecha: sumarDias(t.fecha, 1), momento: "comida" });

/** Toma de lo que sale ahora (comida o cena, según la hora). */
export function momentoAhora(d: Datos, ahora: Date): Momento {
  return momentoDe(horaDe(ahora), d.ajustes.horaComida, d.ajustes.horaCena);
}

/** La próxima toma que aún no se ha comido. Muy tarde, la comida de mañana. */
export function primeraTomaLibre(d: Datos, ahora: Date): Toma {
  const hoy = fechaDe(ahora);
  if (minutos(horaDe(ahora)) > minutos(d.ajustes.horaCena) + 120) return { fecha: sumarDias(hoy, 1), momento: "comida" };
  let t: Toma = { fecha: hoy, momento: momentoAhora(d, ahora) };
  const comida = (x: Toma) => d.lotes.some((l) => l.salidas.some((s) => s.destino === "comida" && s.fecha === x.fecha && s.momento === x.momento));
  while (comida(t)) t = siguiente(t);
  return t;
}

/** Kcal que tocan en una toma según el reparto de Ajustes. */
export const kcalToma = (d: Datos, m: Momento) => d.ajustes.objetivo.kcal * d.ajustes.reparto[m];

/**
 * Tamaño de ración (en %) para que una ración de la receta sea lo que toca en una toma.
 * Así "4 raciones" son de verdad 4 comidas o cenas.
 */
export function tamanoDe(d: Datos, r: Receta): number {
  const media = (kcalToma(d, "comida") + kcalToma(d, "cena")) / 2;
  const base = racionDe(r, 100).kcal;
  return base > 0 ? Math.min(160, Math.max(60, Math.round((media / base) * 100))) : 100;
}

/** Cuántas comidas o cenas dan unas kcal, comiendo lo que toca en cada toma. */
export function comidasDeKcal(d: Datos, kcal: number): number {
  const media = (kcalToma(d, "comida") + kcalToma(d, "cena")) / 2;
  const n = kcal / Math.max(1, media);
  return n < 0.3 ? 0 : Math.max(1, Math.round(n));
}

/** Cuántas comidas o cenas da lo que queda de un cocinado. */
export const comidasQueDa = (d: Datos, g: Grupo) => comidasDeKcal(d, g.lotes.reduce((s, l) => s + macrosDe(l, quedan(l)).kcal, 0));

/** Reparte lo que hay en la nevera en las próximas tomas (lo más antiguo primero). */
export function proyectar(d: Datos, ahora: Date): { batchId: string; nombre: string; toma: Toma }[] {
  const plan: { batchId: string; nombre: string; toma: Toma }[] = [];
  let t = primeraTomaLibre(d, ahora);
  for (const g of grupos(d)) {
    for (let i = 0; i < comidasQueDa(d, g); i++) { plan.push({ batchId: g.batchId, nombre: g.nombre, toma: t }); t = siguiente(t); }
  }
  return plan;
}

/** Tomas que cubriría un batch nuevo de `kcal` en total, justo después de lo que ya hay en la nevera. */
export function tomasDeNuevoBatch(d: Datos, kcal: number, ahora: Date): Toma[] {
  const plan = proyectar(d, ahora);
  let t = plan.length ? siguiente(plan[plan.length - 1].toma) : primeraTomaLibre(d, ahora);
  const tomas: Toma[] = [];
  for (let i = 0; i < comidasDeKcal(d, kcal); i++) { tomas.push(t); t = siguiente(t); }
  return tomas;
}

/* ---------------- cambios ---------------- */

/** "Lo hago": cada parte de la receta pasa a la nevera en su táper, con un peso estimado. */
export function cocinar(d: Datos, r: Receta, raciones: number, ahora: Date): Datos {
  const f = raciones * (tamanoDe(d, r) / 100);
  const batchId = nuevoId("batch");
  const nuevos: Lote[] = r.componentes.map((c) => {
    const ingredientes = escalar(c.ingredientes, f);
    return {
      id: nuevoId("lote"), batchId, recetaId: r.id, nombre: r.componentes.length === 1 ? r.nombre : c.nombre, tipo: c.tipo,
      total: totales(ingredientes), gramos: Math.max(1, pesoEstimado(ingredientes)), pesado: false, raciones,
      hecho: fechaDe(ahora), creado: ahora.toISOString(), ingredientes, guardar: r.guardar, salidas: [],
    };
  });
  return { ...d, lotes: [...d.lotes, ...nuevos], propuesta: null };
}

/** Sobras o algo hecho fuera de la app: nombre, tipo, peso y macros por 100 g. */
export function anadirAMano(d: Datos, x: { nombre: string; tipo: Tipo; gramos: number; hecho: string; n: Por100 }, ahora: Date): Datos {
  const lote: Lote = {
    id: nuevoId("lote"), batchId: nuevoId("batch"), recetaId: null, nombre: x.nombre, tipo: x.tipo,
    total: totales([{ alimentoId: "mano", nombre: x.nombre, gramos: x.gramos, n: x.n }]), gramos: x.gramos, pesado: true, raciones: 0,
    hecho: x.hecho, creado: ahora.toISOString(), ingredientes: [], guardar: "", salidas: [],
  };
  return { ...d, lotes: [...d.lotes, lote] };
}

/** Saca gramos de un táper: comida (suma al día), para Rali o a la basura. */
export function sacar(d: Datos, loteId: string, destino: Destino, gramos: number, ahora: Date, momento?: Momento): { datos: Datos; salida: Salida | null } {
  const g = Math.round(gramos);
  if (!(g > 0) || !d.lotes.some((l) => l.id === loteId)) return { datos: d, salida: null };
  const salida: Salida = { id: nuevoId("salida"), destino, gramos: g, cuando: ahora.toISOString(), fecha: fechaDe(ahora), momento: momento ?? momentoAhora(d, ahora) };
  return { datos: { ...d, lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, salidas: [...l.salidas, salida] } : l)) }, salida };
}

export function deshacer(d: Datos, loteId: string, salidaId: string): Datos {
  return { ...d, lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, salidas: l.salidas.filter((s) => s.id !== salidaId) } : l)) };
}

/** Pesa lo que queda en el táper: corrige el peso total (y con él, los macros por 100 g). */
export function pesarQueda(d: Datos, loteId: string, quedaAhora: number): Datos {
  return {
    ...d,
    lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, gramos: Math.max(1, Math.round(salido(l) + Math.max(0, quedaAhora))), pesado: true } : l)),
  };
}

export const borrarLote = (d: Datos, loteId: string): Datos => ({ ...d, lotes: d.lotes.filter((l) => l.id !== loteId) });
