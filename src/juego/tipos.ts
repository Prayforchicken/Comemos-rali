/* Tipos del juego de mascotas. Todo lo que se guarda vive en `Juego`. */

export type Especie = "gatito" | "rata" | "mapache" | "urraca";
export type Animo = "feliz" | "contento" | "triste" | "enfadado" | "hambriento" | "sucio" | "dormido";
export type Accesorio = "ninguno" | "lazo" | "flor" | "gorro" | "gafas" | "bufanda";
export type ChucheId = "caramelo" | "piruleta" | "pescadito" | "queso" | "galleta" | "brillito";
export type Necesidad = "hambre" | "limpieza" | "mimos" | "energia";

/** 0–100. Nunca baja de SUELO_NECESIDAD: las mascotas no mueren ni enferman. */
export type Necesidades = Record<Necesidad, number>;

export interface Mascota {
  id: string;
  especie: Especie;
  nombre: string;
  pelaje: string;
  accesorio: Accesorio;
  necesidades: Necesidades;
  /** Última vez que se calcularon las necesidades (ISO). */
  actualizado: string;
  adoptada: string;
  /** Hasta cuándo se muestra contenta por haber recibido algo (ISO). */
  alegreHasta?: string;
  /** Minutos acumulados con todas las necesidades bien cubiertas (para traer un regalo). */
  cuidadoMin?: number;
}

/** Chuche para Rali que trae un animalito bien cuidado. Al canjearla, Adrián compra algo rico. */
export interface Regalo {
  id: string;
  mascotaId: string;
  quien: string;        // nombre del animalito cuando lo trajo
  especie: Especie;
  traido: string;       // ISO
  visto: boolean;
  canjeado?: string;    // ISO cuando se canjeó
  entregado?: string;   // ISO cuando Adrián ya trajo el capricho
}

export type TipoLogro = "comida" | "gimnasio" | "agua" | "dia-completo";

/** Cada vez que se ganan huellitas queda una línea aquí. Nunca hay líneas negativas. */
export interface Logro {
  id: string;
  fecha: string;          // YYYY-MM-DD
  creado: string;         // ISO
  tipo: TipoLogro;
  slot?: "breakfast" | "lunch" | "snack" | "dinner";
  base: number;
  multiplicador: number;
  puntos: number;
}

export interface Juego {
  version: 1;
  /** Huellitas que se pueden gastar ahora. */
  huellitas: number;
  /** Huellitas ganadas desde el principio. Nunca bajan. Desbloquean animalitos. */
  ganadasTotal: number;
  mascotas: Mascota[];
  activaId: string | null;
  inventario: Partial<Record<ChucheId, number>>;
  logros: Logro[];
  /** Obsoleto (versiones 0.1–0.4): especies desbloqueadas en progresión fija. Se conserva por compatibilidad. */
  desbloqueadas: Especie[];
  /** Animalitos que han llegado (al azar) y esperan a ser adoptados. */
  pendientes: Especie[];
  /** Cuántos umbrales de llegada se han cruzado ya. */
  llegadas: number;
  /** Chuches para Rali traídas por los animalitos. */
  regalos: Regalo[];
  avisos: {
    comidas: boolean;
    gimnasio: boolean;
    mascotas: boolean;
  };
}
