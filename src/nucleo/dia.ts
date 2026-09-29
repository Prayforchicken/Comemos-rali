/* ============================================================
   Lo comido en un día: gramos sacados de los tápers como "comida" + extras.
   Lo que va para Rali o a la basura NO cuenta calorías.
   ============================================================ */
import { redondear, sumar, totales, vacio } from "../alimentos/nutricion";
import type { Item, Totales } from "../alimentos/tipos";
import { fechaDe } from "./fechas";
import { macrosDe, nuevoId } from "./lotes";
import type { Datos, Momento } from "./tipos";

export interface Apunte {
  id: string;
  cuando: string;
  nombre: string;
  t: Totales;
  /** Si sale de un táper: de cuál y en qué toma. */
  loteId?: string;
  momento?: Momento;
}

export function apuntesDelDia(d: Datos, fecha: string): Apunte[] {
  const raciones: Apunte[] = d.lotes.flatMap((l) =>
    l.salidas.filter((s) => s.destino === "comida" && s.fecha === fecha)
      .map((s) => ({ id: s.id, cuando: s.cuando, nombre: l.nombre, t: macrosDe(l, s.gramos), loteId: l.id, momento: s.momento })),
  );
  const extras: Apunte[] = (d.extras[fecha] ?? []).map((e) => ({ id: e.id, cuando: e.cuando, nombre: e.item.nombre, t: totales([e.item]), momento: e.momento }));
  return [...raciones, ...extras].sort((a, b) => a.cuando.localeCompare(b.cuando));
}

export const totalDelDia = (d: Datos, fecha: string): Totales => redondear(apuntesDelDia(d, fecha).reduce((s, a) => sumar(s, a.t), { ...vacio }));

/** Gramos comidos de cada táper un día: "Curry de garbanzos 320 g". */
export function gramosPorReceta(d: Datos, fecha: string): { nombre: string; gramos: number; kcal: number }[] {
  const mapa = new Map<string, { nombre: string; gramos: number; kcal: number }>();
  for (const a of apuntesDelDia(d, fecha)) {
    const x = mapa.get(a.nombre) ?? { nombre: a.nombre, gramos: 0, kcal: 0 };
    x.gramos += a.t.gramos; x.kcal += a.t.kcal;
    mapa.set(a.nombre, x);
  }
  return [...mapa.values()];
}

/** Algo que no sale de un táper. Con `momento`, cuenta como esa comida o cena ya hecha. */
export function anadirExtra(d: Datos, item: Item, ahora: Date, momento?: Momento): Datos {
  const fecha = fechaDe(ahora);
  const extra = { id: nuevoId("extra"), cuando: ahora.toISOString(), item, ...(momento ? { momento } : {}) };
  return { ...d, extras: { ...d.extras, [fecha]: [...(d.extras[fecha] ?? []), extra] } };
}

export function quitarExtra(d: Datos, fecha: string, id: string): Datos {
  const lista = (d.extras[fecha] ?? []).filter((e) => e.id !== id);
  const extras = { ...d.extras };
  if (lista.length) extras[fecha] = lista; else delete extras[fecha];
  return { ...d, extras };
}
