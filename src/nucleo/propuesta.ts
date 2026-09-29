/* ============================================================
   Qué cocinar: la receta que toca, "otra idea" y la lista de ingredientes.
   Por turno: primero las que nunca se han hecho, luego la que hace más que no se hace.
   No propone lo que ya está en la nevera ni las recetas apartadas.
   ============================================================ */
import type { Unidad } from "../alimentos/tipos";
import { RECETAS } from "../recetas/recetas";
import { enNevera } from "./lotes";
import type { Datos, Receta } from "./tipos";

export const todasLasRecetas = (d: Datos): Receta[] => [...RECETAS, ...Object.values(d.recetasPropias)];

export const recetaPorId = (d: Datos, id: string | null) => (id ? todasLasRecetas(d).find((r) => r.id === id) ?? null : null);

/** Último día que se cocinó (o null si nunca). */
export function ultimaVez(d: Datos, recetaId: string): string | null {
  return d.lotes.filter((l) => l.recetaId === recetaId).reduce<string | null>((m, l) => (!m || l.hecho > m ? l.hecho : m), null);
}

/** Recetas en el orden en que se proponen. */
export function candidatas(d: Datos): Receta[] {
  const enLaNevera = new Set(enNevera(d).map((l) => l.recetaId));
  const todas = todasLasRecetas(d).filter((r) => !d.apartadas.includes(r.id));
  const sinRepetir = todas.filter((r) => !enLaNevera.has(r.id));
  const lista = sinRepetir.length ? sinRepetir : todas;
  const orden = new Map(lista.map((r, i) => [r.id, i]));
  return [...lista].sort((a, b) => (ultimaVez(d, a.id) ?? "").localeCompare(ultimaVez(d, b.id) ?? "") || orden.get(a.id)! - orden.get(b.id)!);
}

/** La receta que se enseña ahora mismo. */
export function propuestaActual(d: Datos): Receta | null {
  const elegida = recetaPorId(d, d.propuesta);
  if (elegida && !d.apartadas.includes(elegida.id)) return elegida;
  return candidatas(d)[0] ?? null;
}

/** Pasa a la siguiente receta de la lista (vuelve a empezar al final). */
export function otraIdea(d: Datos): Datos {
  const lista = candidatas(d);
  if (!lista.length) return d;
  const actual = propuestaActual(d);
  const i = lista.findIndex((r) => r.id === actual?.id);
  return { ...d, propuesta: lista[(i + 1) % lista.length].id };
}

export const proponer = (d: Datos, recetaId: string): Datos => ({ ...d, propuesta: recetaId });

/* ---------------- lista de ingredientes ---------------- */

export interface Linea { alimentoId: string; nombre: string; gramos: number; aprox: string | null }

const redondeoGramos = (g: number) => (g < 10 ? Math.max(1, Math.round(g)) : g < 100 ? Math.round(g / 5) * 5 : Math.round(g / 10) * 10);

function fraccion(n: number) {
  const entero = Math.floor(n);
  const medio = n - entero >= 0.5;
  if (!entero) return "½";
  return medio ? `${entero}½` : String(entero);
}

/** "≈ 3 botes de 400 g", "4 huevos". null si no tiene unidad. */
export function enUnidades(gramos: number, u: Unidad | undefined): string | null {
  if (!u) return null;
  const n = Math.max(u.paso, Math.round(gramos / u.gramos / u.paso) * u.paso);
  const plural = n > 1 ? u.plural : u.singular;
  return u.paso === 1 && u.gramos <= 60 ? `${n} ${plural}` : `≈ ${fraccion(n)} ${plural}`;
}

/** Ingredientes para `raciones` raciones al tamaño elegido, en el orden de la receta. */
export function lista(r: Receta, raciones: number, tamano: number): Linea[] {
  const f = raciones * (tamano / 100);
  return r.ingredientes.map((i) => {
    const gramos = redondeoGramos(i.gramos * f);
    return { alimentoId: i.alimentoId, nombre: i.nombre, gramos, aprox: enUnidades(i.gramos * f, i.unidad) };
  });
}

/** Texto para copiar y pegar en las notas o en WhatsApp. */
export function textoCompra(nombre: string, lineas: Linea[]) {
  return [`Para ${nombre}:`, ...lineas.map((l) => `- ${l.gramos} g ${l.nombre.toLowerCase()}${l.aprox ? ` (${l.aprox})` : ""}`)].join("\n");
}

/** Marca o desmarca "lo tengo" en la lista de hoy. Lo de otro día no vale: la nevera cambia. */
export function marcar(d: Datos, alimentoId: string, tengo: boolean, hoy: string): Datos {
  const lista = new Set(d.nevera.fecha === hoy ? d.nevera.tengo : []);
  if (tengo) lista.add(alimentoId); else lista.delete(alimentoId);
  return { ...d, nevera: { fecha: hoy, tengo: [...lista] } };
}

export const loQueTengo = (d: Datos, hoy: string) => new Set(d.nevera.fecha === hoy ? d.nevera.tengo : []);

export function apartar(d: Datos, recetaId: string, apartada: boolean): Datos {
  const s = new Set(d.apartadas);
  if (apartada) s.add(recetaId); else s.delete(recetaId);
  return { ...d, apartadas: [...s], propuesta: apartada && d.propuesta === recetaId ? null : d.propuesta };
}
