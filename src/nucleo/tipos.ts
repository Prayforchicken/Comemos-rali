/* ============================================================
   Tipos de datos de la app. Todo lo que se guarda en el móvil está aquí.

   La idea en una frase: la app propone un batch; al decir "lo hago" cada
   parte de la receta se convierte en un TÁPER (Lote) con su peso en gramos
   y sus macros. Al comer se pesan los gramos que se sacan de cada táper;
   cada salida va a comida (cuenta calorías), a Rali o a la basura.
   ============================================================ */
import type { Alimento, Item, Totales } from "../alimentos/tipos";

/** Las dos tomas que cubre el batch. El desayuno y la merienda van aparte (extras). */
export type Momento = "comida" | "cena";

/** A dónde va lo que sale de un táper. */
export type Destino = "comida" | "rali" | "basura";

/** Qué es cada parte: guarnición de hidratos, plato de proteína o plato combinado. */
export type Tipo = "hidratos" | "proteina" | "combinado";

/** Una parte de una receta que se guarda en su propio táper (el curry, el arroz). */
export interface Componente {
  id: string;
  nombre: string;
  tipo: Tipo;
  /** Ingredientes EN CRUDO para UNA ración. */
  ingredientes: Item[];
  /** Días que aguanta en la nevera, si no son los de la receta (el arroz aguanta menos que el curry). */
  dura?: number;
}

export interface Receta {
  id: string;
  nombre: string;
  /** Nombre corto para avisos y listas. */
  corto: string;
  /** Una parte (plato combinado) o dos (principal de proteína + guarnición de hidratos). */
  componentes: Componente[];
  pasos: string[];
  /** Minutos aproximados para 4 raciones. */
  minutos: number;
  /** Cómo se guarda y se recalienta. */
  guardar: string;
  /** Días que aguanta en la nevera desde que se cocina. */
  dura: number;
  /** true si la ha creado Adrián (se puede editar y borrar). */
  propia?: boolean;
  /** Recetas propias: para cuántas raciones se escribieron los ingredientes. */
  salen?: number;
}

/** Gramos que han salido de un táper. */
export interface Salida {
  id: string;
  destino: Destino;
  gramos: number;
  cuando: string;    // ISO con hora
  fecha: string;     // YYYY-MM-DD
  momento: Momento;
}

/** Un táper en la nevera. */
export interface Lote {
  id: string;
  /** Tápers cocinados a la vez (el curry y su arroz) comparten batchId. */
  batchId: string;
  /** Receta de la app o propia. null si se añadió a mano (sobras). */
  recetaId: string | null;
  nombre: string;
  tipo: Tipo;
  /** Kcal y macros de TODO lo cocinado. Los macros por 100 g salen de dividir entre `gramos`. */
  total: Totales;
  /** Peso de la comida hecha (sin el recipiente). */
  gramos: number;
  /** false mientras el peso sea una estimación de la app. */
  pesado: boolean;
  /** Raciones para las que se cocinó (solo para calcular cuántas comidas da). */
  raciones: number;
  /** Día en que se cocinó (YYYY-MM-DD). */
  hecho: string;
  /** Último día en que se puede comer (YYYY-MM-DD). La nevera se ordena por esto. */
  caduca: string;
  creado: string;    // ISO
  /** Ingredientes en crudo de todo el táper, para ver qué lleva. */
  ingredientes: Item[];
  guardar: string;
  salidas: Salida[];
}

/** Algo comido que no sale de la nevera: Plenny, un capricho, comer fuera… */
export interface Extra {
  id: string;
  cuando: string;
  item: Item;
  /** Si se apuntó como comida o cena desde "Tu plato" (cuenta como toma hecha). */
  momento?: Momento;
}

export interface Objetivo { kcal: number; proteina: number; carbos: number; grasa: number; fibra: number }

export interface Ajustes {
  objetivo: Objetivo;
  /** Parte del objetivo diario que toca en cada toma del batch (0–1). El resto, desayuno y merienda. */
  reparto: Record<Momento, number>;
  /** Raciones que propone cocinar cada vez (2 días × comida y cena = 4). */
  raciones: number;
  horaComida: string;   // "14:40"
  horaCena: string;     // "20:15"
  /** Hora del aviso "toca batch" el día que se acaba la nevera. */
  horaCocinar: string;
  avisos: boolean;
}

export interface Datos {
  version: 2;
  lotes: Lote[];
  recetasPropias: Record<string, Receta>;
  /** Recetas que no quiere que le proponga. */
  apartadas: string[];
  /** Receta que se está proponiendo ahora (null = la que toque por turno). */
  propuesta: string | null;
  /**
   * Las recetas son plantillas: por defecto el batch se hace tal cual. Si hoy cambias alguna cantidad
   * (800 g de garbanzos en vez de 720), se guarda aquí para ESTE batch: por id de alimento,
   * gramos de hoy / gramos de la receta. La receta no cambia. Se borra al cocinar.
   */
  variacion: { recetaId: string; factor: Record<string, number> } | null;
  /** Lo marcado hoy en la lista de "mira en la nevera", por id de alimento. Solo vale el día que se marcó. */
  nevera: { fecha: string; tengo: string[] };
  extras: Record<string, Extra[]>;
  /** Alimentos de wger usados y los creados a mano, para tenerlos sin internet. */
  alimentos: Record<string, Alimento>;
  ajustes: Ajustes;
}
