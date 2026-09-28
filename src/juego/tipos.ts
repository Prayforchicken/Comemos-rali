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
  /** Especies que ya se pueden adoptar (se añaden al cruzar un umbral). */
  desbloqueadas: Especie[];
  avisos: {
    comidas: boolean;
    gimnasio: boolean;
    mascotas: boolean;
  };
}
