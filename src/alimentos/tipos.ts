/* ============================================================
   Alimentos y recetas propias (el "mini MyFitnessPal").
   Todos los valores nutricionales van POR 100 g, como en wger.
   ============================================================ */

export interface Por100 { kcal: number; proteina: number; carbos: number; grasa: number; fibra: number }

export type Fuente = "wger" | "base" | "propio";

export interface Alimento {
  id: string;            // "wger-1234", "base-pizza", "propio-xxxx"
  nombre: string;
  fuente: Fuente;
  n: Por100;
  /** Ración típica para rellenar los gramos al añadirlo (p. ej. "media pizza", 200 g). */
  porcion?: { nombre: string; gramos: number };
}

/** Un alimento dentro de una comida o receta. Guarda una copia de los valores para no depender de internet. */
export interface Item { alimentoId: string; nombre: string; gramos: number; n: Por100 }

/** Para qué sirve una receta en el menú.
    - batch: se cocina en tanda y es la base de comidas y cenas.
    - acompanamiento: guarnición que completa el batch (arroz, pasta, pan…), hecha ese día o el anterior.
    - congelador: comida de congelador o despensa para salir del paso (hamburguesa casera, noodles…).
    - rapida: cualquier otra receta.
    - desayuno: desayunos y meriendas. */
export type Categoria = "batch" | "acompanamiento" | "congelador" | "rapida" | "desayuno";

export interface RecetaPropia {
  id: string;                 // también es el id de la receta en el plan (MealTemplate)
  nombre: string;
  /** Sin categoría (recetas de versiones anteriores) = "rapida". */
  categoria?: Categoria;
  raciones: number;
  momentos: ("breakfast" | "lunch" | "snack" | "dinner")[];
  items: Item[];
  pasos: string;
  creada: string;
}

export interface Totales extends Por100 { gramos: number }
