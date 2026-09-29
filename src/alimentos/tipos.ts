/* ============================================================
   Alimentos. Todos los valores nutricionales van POR 100 g, como en wger.
   ============================================================ */

export interface Por100 { kcal: number; proteina: number; carbos: number; grasa: number; fibra: number }

export type Fuente = "wger" | "base" | "propio";

/** Cómo se compra o se cuenta algo en la cocina: "2 huevos", "≈ 1½ botes". */
export interface Unidad {
  singular: string;   // "huevo", "bote de 400 g"
  plural: string;     // "huevos", "botes de 400 g"
  gramos: number;     // lo que pesa una unidad (escurrido, si es un bote)
  paso: number;       // redondeo: 1 = unidades enteras, 0.5 = medias
}

export interface Alimento {
  id: string;            // "wger-1234", "base-pizza", "propio-xxxx"
  nombre: string;
  fuente: Fuente;
  n: Por100;
  /** Ración típica para rellenar los gramos al añadirlo (p. ej. "media pizza", 200 g). */
  porcion?: { nombre: string; gramos: number };
  unidad?: Unidad;
}

/** Un alimento dentro de una comida o receta. Guarda una copia de los valores para no depender de internet. */
export interface Item { alimentoId: string; nombre: string; gramos: number; n: Por100; unidad?: Unidad }

export interface Totales extends Por100 { gramos: number }
