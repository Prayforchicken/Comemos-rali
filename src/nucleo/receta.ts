/* Cuentas de una receta: ingredientes juntos, macros de una ración y peso estimado de lo cocinado. */
import { por, totales } from "../alimentos/nutricion";
import type { Item, Totales } from "../alimentos/tipos";
import type { Receta, Tipo } from "./tipos";

export const TIPO: Record<Tipo, { corto: string; nombre: string }> = {
  hidratos: { corto: "H", nombre: "Hidratos" },
  proteina: { corto: "P", nombre: "Proteína" },
  combinado: { corto: "P.C.", nombre: "Plato combinado" },
};

/** Todos los ingredientes de una ración (todas las partes juntas), en crudo. */
export const ingredientesDe = (r: Receta): Item[] => r.componentes.flatMap((c) => c.ingredientes);

/** Aplica los cambios de cantidades de un batch (por id de alimento: gramos de hoy / de la receta). */
export const conCambios = (items: Item[], factor: Record<string, number> = {}): Item[] =>
  items.map((i) => (factor[i.alimentoId] !== undefined ? { ...i, gramos: i.gramos * factor[i.alimentoId] } : i)).filter((i) => i.gramos > 0);

/** Kcal y macros de una ración al tamaño elegido (con los cambios de hoy, si los hay). */
export const racionDe = (r: Receta, tamano: number, factor: Record<string, number> = {}): Totales =>
  por(totales(conCambios(ingredientesDe(r), factor)), tamano / 100);

/** "P + H" o "P.C.": cómo se guarda la receta. */
export const formaDe = (r: Receta) => r.componentes.map((c) => TIPO[c.tipo].corto).join(" + ");

/** Días que aguanta en la nevera la parte que menos aguanta (lo que marca la caducidad del batch). */
export const duraDe = (r: Receta) => Math.min(...r.componentes.map((c) => c.dura ?? r.dura));

/** Multiplica las cantidades de una lista de ingredientes. */
export const escalar = (items: Item[], f: number): Item[] => items.map((i) => ({ ...i, gramos: Math.round(i.gramos * f * 10) / 10 }));

/** Peso aproximado de lo cocinado: lo que absorbe agua (arroz, legumbre seca) pesa más; la verdura, menos. */
export const pesoEstimado = (items: Item[]) => Math.round(items.reduce((s, i) => s + i.gramos * (i.rinde ?? 1), 0));
