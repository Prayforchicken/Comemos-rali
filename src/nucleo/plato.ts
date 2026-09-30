/* ============================================================
   El plato de esta toma: gramos pesados de cada táper frente a lo que toca.
   - Lo que toca en una toma = objetivo diario × reparto (Ajustes).
   - Por cada macro: cuánto falta (en rojo en la pantalla) o cuánto sobra.
   - `recomendar`: cuántos gramos servirse de cada táper para acercarse a lo que toca.
   ============================================================ */
import { totales } from "../alimentos/nutricion";
import type { Item, Totales } from "../alimentos/tipos";
import { enNevera, grupos, macrosDe, por100, quedan } from "./lotes";
import type { Datos, Lote, Momento } from "./tipos";

export type Clave = "kcal" | "proteina" | "carbos" | "grasa";

export const MACROS: { clave: Clave; nombre: string; unidad: string }[] = [
  { clave: "kcal", nombre: "Kcal", unidad: "kcal" },
  { clave: "proteina", nombre: "Proteína", unidad: "g" },
  { clave: "carbos", nombre: "Hidratos", unidad: "g" },
  { clave: "grasa", nombre: "Grasa", unidad: "g" },
];

/** Margen dentro del cual se da por bueno (±3 %). */
const MARGEN = 0.03;

export function objetivoToma(d: Datos, m: Momento): Record<Clave, number> {
  const o = d.ajustes.objetivo, f = d.ajustes.reparto[m];
  return { kcal: Math.round(o.kcal * f), proteina: Math.round(o.proteina * f), carbos: Math.round(o.carbos * f), grasa: Math.round(o.grasa * f) };
}

/** Qué tápers poner en el plato por defecto: lo que caduca antes (sin lo ya caducado), y si falta, su pareja de proteína o de hidratos. */
export function sugerencia(d: Datos, hoy: string): string[] {
  const g = grupos(d, hoy)[0];
  if (!g) return [];
  const ids = g.lotes.map((l) => l.id);
  const tipos = new Set(g.lotes.map((l) => l.tipo));
  if (tipos.has("combinado")) return ids;
  const otros = enNevera(d).filter((l) => !ids.includes(l.id) && l.caduca >= hoy);
  if (!tipos.has("proteina")) { const p = otros.find((l) => l.tipo === "proteina" || l.tipo === "combinado"); if (p) ids.push(p.id); }
  if (!tipos.has("hidratos") && tipos.has("proteina")) { const h = otros.find((l) => l.tipo === "hidratos"); if (h) ids.push(h.id); }
  return ids;
}

export interface Linea {
  clave: Clave; nombre: string; unidad: string;
  valor: number; objetivo: number;
  estado: "falta" | "justo" | "sobra";
  diferencia: number;
}

type Macros = Record<Clave, number>;
const sumaMacros = (plato: { lote: Lote; gramos: number }[], otros: Item[]): Totales =>
  plato.reduce<Totales>((s, x) => {
    const t = macrosDe(x.lote, x.gramos);
    return { gramos: s.gramos + x.gramos, kcal: s.kcal + t.kcal, proteina: s.proteina + t.proteina, carbos: s.carbos + t.carbos, grasa: s.grasa + t.grasa, fibra: s.fibra + t.fibra };
  }, totales(otros));

/** `plato`: gramos de cada táper. `otros`: lo que no sale de la nevera (pizza, pan, fruta…). */
export function calcular(d: Datos, plato: { lote: Lote; gramos: number }[], m: Momento, otros: Item[] = []): { total: Totales; lineas: Linea[] } {
  const total = sumaMacros(plato, otros);
  const obj = objetivoToma(d, m);
  const lineas = MACROS.map(({ clave, nombre, unidad }): Linea => {
    const valor = Math.round(total[clave]);
    const objetivo = obj[clave];
    const dif = valor - objetivo;
    const estado = Math.abs(dif) <= objetivo * MARGEN ? "justo" : dif < 0 ? "falta" : "sobra";
    return { clave, nombre, unidad, valor, objetivo, estado, diferencia: Math.abs(dif) };
  });
  return { total, lineas };
}

/* ---------------- cuánto servirse ---------------- */

/** Cuánto pesa cada macro al buscar el plato: las kcal mandan, luego la proteína. */
const PESO: Macros = { kcal: 3, proteina: 2, carbos: 1, grasa: 0.5 };
/**
 * Cuánto tira el reparto "de siempre" (cada táper en proporción a lo que queda en él, para que
 * se acaben a la vez). Sin esto, si el guiso ya cuadra solo, la guarnición se quedaría a 0 g.
 */
const EQUILIBRIO = 2;

/**
 * Gramos de cada táper para acercarse a lo que toca en esta toma.
 * `fijo`: macros de lo que no sale de un táper (otra cosa), que se descuentan de lo que toca.
 * `pesados`: gramos ya pesados de algunos tápers; se respetan y el resto se ajusta a ellos.
 * Minimiza el error de cada macro (relativo a lo que toca, con PESO) más un término que tira
 * hacia el reparto proporcional. Nunca más de lo que queda en el táper. Redondeado a 5 g.
 */
export function recomendar(d: Datos, lotes: Lote[], m: Momento, fijo: Omit<Totales, "gramos" | "fibra"> = { kcal: 0, proteina: 0, carbos: 0, grasa: 0 }, pesados: Record<string, number> = {}): Record<string, number> {
  const obj = objetivoToma(d, m);
  const claves = MACROS.map((x) => x.clave);
  const falta = Object.fromEntries(claves.map((k) => [k, obj[k] - fijo[k]])) as Macros;
  const vivos = lotes.filter((l) => quedan(l) > 0 && por100(l).kcal > 0);
  const res: Record<string, number> = Object.fromEntries(lotes.map((l) => [l.id, 0]));
  if (!vivos.length || falta.kcal <= obj.kcal * MARGEN) return res;

  const a = vivos.map((l) => { const n = por100(l); return Object.fromEntries(claves.map((k) => [k, n[k] / 100])) as Macros; });
  const tope = vivos.map(quedan);
  // Reparto proporcional a lo que queda, escalado a las kcal que faltan.
  const kcalQuedan = vivos.reduce((s, l, i) => s + tope[i] * a[i].kcal, 0);
  const base = tope.map((q) => Math.min(q, q * (falta.kcal / kcalQuedan)));
  const Q = Math.max(1, base.reduce((s, x) => s + x, 0));

  // Descenso por coordenadas: el problema es cuadrático y con límites, converge solo.
  const libre = vivos.map((l) => !(pesados[l.id] > 0));
  const g = vivos.map((l, i) => (libre[i] ? base[i] : pesados[l.id]));
  const aporte = (k: Clave) => g.reduce((s, x, i) => s + x * a[i][k], 0);
  for (let vuelta = 0; vuelta < 200; vuelta++) {
    for (let i = 0; i < g.length; i++) {
      if (!libre[i]) continue;
      let grad = (EQUILIBRIO * (g[i] - base[i])) / (Q * Q);
      let curva = EQUILIBRIO / (Q * Q);
      for (const k of claves) {
        const r = (aporte(k) - falta[k]) / obj[k];
        grad += (PESO[k] * a[i][k] * r) / obj[k];
        curva += (PESO[k] * a[i][k] ** 2) / obj[k] ** 2;
      }
      g[i] = Math.max(0, Math.min(tope[i], g[i] - grad / curva));
    }
  }
  vivos.forEach((l, i) => { res[l.id] = libre[i] ? Math.min(tope[i], Math.round(g[i] / 5) * 5) : g[i]; });
  return res;
}

/** Suma de macros de lo que ya está en el plato (para `recomendar`). */
export const macrosFijos = (plato: { lote: Lote; gramos: number }[], otros: Item[]) => {
  const t = sumaMacros(plato, otros);
  return { kcal: t.kcal, proteina: t.proteina, carbos: t.carbos, grasa: t.grasa };
};
