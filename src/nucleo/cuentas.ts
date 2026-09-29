/* ============================================================
   Cuentas: gramos que se comen, que van para Rali y que se tiran.
   ============================================================ */
import type { Totales } from "../alimentos/tipos";
import { totalDelDia } from "./dia";
import { sumarDias } from "./fechas";
import type { Datos, Destino } from "./tipos";

export interface PorReceta { nombre: string; veces: number; comida: number; rali: number; basura: number }
export interface Resumen { comida: number; rali: number; basura: number; total: number; batch: number; pctBasura: number; recetas: PorReceta[] }

/** Gramos que han salido desde `desde` (incluido). `desde = null` es desde siempre. */
export function resumen(d: Datos, desde: string | null): Resumen {
  const cuenta: Record<Destino, number> = { comida: 0, rali: 0, basura: 0 };
  const recetas = new Map<string, PorReceta & { batch: Set<string> }>();
  const batch = new Set<string>();
  for (const l of d.lotes) {
    const clave = l.nombre.toLowerCase();
    const r = recetas.get(clave) ?? { nombre: l.nombre, veces: 0, comida: 0, rali: 0, basura: 0, batch: new Set<string>() };
    if (!desde || l.hecho >= desde) { batch.add(l.batchId); r.batch.add(l.batchId); }
    for (const s of l.salidas) {
      if (desde && s.fecha < desde) continue;
      cuenta[s.destino] += s.gramos;
      r[s.destino] += s.gramos;
    }
    recetas.set(clave, r);
  }
  const total = cuenta.comida + cuenta.rali + cuenta.basura;
  return {
    ...cuenta, total, batch: batch.size,
    pctBasura: total ? Math.round((cuenta.basura / total) * 100) : 0,
    recetas: [...recetas.values()]
      .map(({ batch: b, ...x }) => ({ ...x, veces: b.size }))
      .filter((x) => x.veces || x.comida || x.rali || x.basura)
      .sort((a, b) => b.comida - a.comida),
  };
}

/** Kcal y macros de los últimos `n` días (el último es hoy). */
export function ultimosDias(d: Datos, hoy: string, n = 7): { fecha: string; t: Totales }[] {
  return Array.from({ length: n }, (_, i) => sumarDias(hoy, i - n + 1)).map((fecha) => ({ fecha, t: totalDelDia(d, fecha) }));
}
