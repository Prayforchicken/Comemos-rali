/* ============================================================
   Lo comido en un día: raciones de la nevera marcadas como "comida" + extras.
   Las raciones para Rali o a la basura NO cuentan calorías.
   ============================================================ */
import { redondear, sumar, totales, vacio } from "../alimentos/nutricion";
import type { Item, Totales } from "../alimentos/tipos";
import { fechaDe } from "./fechas";
import { nuevoId } from "./lotes";
import type { Datos, Momento } from "./tipos";

export interface Apunte {
  id: string;
  cuando: string;
  nombre: string;
  t: Totales;
  /** Si es una ración de la nevera: de qué lote y en qué toma. */
  loteId?: string;
  momento?: Momento;
}

export function apuntesDelDia(d: Datos, fecha: string): Apunte[] {
  const raciones: Apunte[] = d.lotes.flatMap((l) =>
    l.salidas.filter((s) => s.destino === "comida" && s.fecha === fecha)
      .map((s) => ({ id: s.id, cuando: s.cuando, nombre: l.nombre, t: l.porRacion, loteId: l.id, momento: s.momento })),
  );
  const extras: Apunte[] = (d.extras[fecha] ?? []).map((e) => ({ id: e.id, cuando: e.cuando, nombre: e.item.nombre, t: totales([e.item]) }));
  return [...raciones, ...extras].sort((a, b) => a.cuando.localeCompare(b.cuando));
}

export const totalDelDia = (d: Datos, fecha: string): Totales => redondear(apuntesDelDia(d, fecha).reduce((s, a) => sumar(s, a.t), { ...vacio }));

export function anadirExtra(d: Datos, item: Item, ahora: Date): Datos {
  const fecha = fechaDe(ahora);
  return { ...d, extras: { ...d.extras, [fecha]: [...(d.extras[fecha] ?? []), { id: nuevoId("extra"), cuando: ahora.toISOString(), item }] } };
}

export function quitarExtra(d: Datos, fecha: string, id: string): Datos {
  const lista = (d.extras[fecha] ?? []).filter((e) => e.id !== id);
  const extras = { ...d.extras };
  if (lista.length) extras[fecha] = lista; else delete extras[fecha];
  return { ...d, extras };
}
