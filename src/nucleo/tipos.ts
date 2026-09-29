/* ============================================================
   Tipos de datos de la app. Todo lo que se guarda en el móvil está aquí.

   La idea en una frase: la app propone un batch para 2 días; al decir
   "lo hago" se convierte en un LOTE en la nevera, y cada RACIÓN de ese
   lote termina en uno de tres sitios: comida (cuenta calorías), Rali o basura.
   ============================================================ */
import type { Alimento, Item, Totales } from "../alimentos/tipos";

/** Las dos tomas que cubre el batch. El desayuno y la merienda van aparte (extras). */
export type Momento = "comida" | "cena";

/** A dónde va cada ración. */
export type Destino = "comida" | "rali" | "basura";

export interface Receta {
  id: string;
  nombre: string;
  /** Nombre corto para avisos y listas. */
  corto: string;
  /** Ingredientes de UNA ración (se multiplican por raciones y tamaño). */
  ingredientes: Item[];
  pasos: string[];
  /** Minutos aproximados para 4 raciones. */
  minutos: number;
  /** Cómo se guarda y se recalienta. */
  guardar: string;
  /** true si la ha creado Adrián (se puede editar y borrar). */
  propia?: boolean;
  /** Recetas propias: para cuántas raciones se escribieron los ingredientes (para volver a editarlas igual). */
  salen?: number;
}

/** Una ración que ha salido de la nevera. */
export interface Salida {
  id: string;
  destino: Destino;
  cuando: string;    // ISO con hora
  fecha: string;     // YYYY-MM-DD
  momento: Momento;
}

/** Lo que hay cocinado en la nevera. */
export interface Lote {
  id: string;
  /** Receta de la app o propia. null si se añadió a mano ("ya tengo algo hecho"). */
  recetaId: string | null;
  nombre: string;
  /** Kcal y macros de UNA ración, copiados al cocinar (editar la receta después no cambia el historial). */
  porRacion: Totales;
  raciones: number;
  /** Día en que se cocinó (YYYY-MM-DD). Marca la frescura. */
  hecho: string;
  creado: string;    // ISO
  /** Copia de los ingredientes de una ración, para ver qué lleva. */
  ingredientes: Item[];
  guardar: string;
  salidas: Salida[];
}

/** Algo comido que no sale de la nevera: Plenny, un capricho, comer fuera… */
export interface Extra { id: string; cuando: string; item: Item }

export interface Objetivo { kcal: number; proteina: number; carbos: number; grasa: number; fibra: number }

export interface Ajustes {
  objetivo: Objetivo;
  /** Raciones que propone cocinar cada vez (2 días × comida y cena = 4). */
  raciones: number;
  /** Tamaño de cada ración en %. 100 = la receta tal cual. */
  tamano: number;
  horaComida: string;   // "14:40"
  horaCena: string;     // "20:15"
  /** Hora del aviso "toca batch" el día que se acaba la nevera. */
  horaCocinar: string;
  avisos: boolean;
}

export interface Datos {
  version: 1;
  lotes: Lote[];
  recetasPropias: Record<string, Receta>;
  /** Recetas que no quiere que le proponga. */
  apartadas: string[];
  /** Receta que se está proponiendo ahora (null = la que toque por turno). */
  propuesta: string | null;
  /** Lo marcado hoy en la lista de "mira en la nevera", por id de alimento. Solo vale el día que se marcó. */
  nevera: { fecha: string; tengo: string[] };
  extras: Record<string, Extra[]>;
  /** Alimentos de wger usados y los creados a mano, para tenerlos sin internet. */
  alimentos: Record<string, Alimento>;
  ajustes: Ajustes;
}
