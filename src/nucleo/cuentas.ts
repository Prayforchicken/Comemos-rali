/* ============================================================
   Cuentas: cuántas raciones se comen, cuántas van para Rali y cuántas se tiran.
   ============================================================ */
import type { Totales } from "../alimentos/tipos";
import { totalDelDia } from "./dia";
import { sumarDias } from "./fechas";
import type { Datos, Destino } from "./tipos";

export interface PorReceta { nombre: string; lotes: number; comida: number; rali: number; basura: number }
export interface Resumen { comida: number; rali: number; basura: number; total: number; lotes: number; pctBasura: number; recetas: PorReceta[] }

/** Raciones que han salido desde `desde` (incluido). `desde = null` es desde siempre. */
export function resumen(d: Datos, desde: string | null): Resumen {
  const cuenta: Record<Destino, number> = { comida: 0, rali: 0, basura: 0 };
  const recetas = new Map<string, PorReceta>();
  const lotes = new Set<string>();
  for (const l of d.lotes) {
    const clave = l.recetaId ?? `mano:${l.nombre.toLowerCase()}`;
    if (!desde || l.hecho >= desde) {
      lotes.add(l.id);
      const r = recetas.get(clave) ?? { nombre: l.nombre, lotes: 0, comida: 0, rali: 0, basura: 0 };
      r.lotes += 1;
      recetas.set(clave, r);
    }
    for (const s of l.salidas) {
      if (desde && s.fecha < desde) continue;
      cuenta[s.destino] += 1;
      const r = recetas.get(clave) ?? { nombre: l.nombre, lotes: 0, comida: 0, rali: 0, basura: 0 };
      r[s.destino] += 1;
      recetas.set(clave, r);
    }
  }
  const total = cuenta.comida + cuenta.rali + cuenta.basura;
  return {
    ...cuenta, total, lotes: lotes.size,
    pctBasura: total ? Math.round((cuenta.basura / total) * 100) : 0,
    recetas: [...recetas.values()].sort((a, b) => b.lotes - a.lotes || b.comida - a.comida),
  };
}

/** Kcal y macros de los últimos `n` días (el último es hoy). */
export function ultimosDias(d: Datos, hoy: string, n = 7): { fecha: string; t: Totales }[] {
  return Array.from({ length: n }, (_, i) => sumarDias(hoy, i - n + 1)).map((fecha) => ({ fecha, t: totalDelDia(d, fecha) }));
}
