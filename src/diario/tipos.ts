/* ============================================================
   Diario personal: cómo se siente Rali y qué ha pasado.
   Vive solo en el móvil (y en las copias de seguridad). No da ni quita huellitas.
   ============================================================ */

export interface EntradaDiario {
  id: string;
  creada: string;        // ISO (hora del apunte)
  nivel: number;         // 1 (muy mal) … 5 (muy bien)
  emociones: string[];   // ids de EMOCIONES
  texto: string;         // qué ha pasado
}

/** fecha (YYYY-MM-DD) → apuntes de ese día, en orden. */
export type Diario = Record<string, EntradaDiario[]>;

export const EMOCIONES: { id: string; t: string; color: string }[] = [
  { id: "feliz", t: "Feliz", color: "mantequilla" },
  { id: "tranquila", t: "Tranquila", color: "menta" },
  { id: "ilusionada", t: "Ilusionada", color: "rosa" },
  { id: "orgullosa", t: "Orgullosa", color: "mantequilla" },
  { id: "querida", t: "Querida", color: "rosa" },
  { id: "cansada", t: "Cansada", color: "lavanda" },
  { id: "aburrida", t: "Aburrida", color: "papel" },
  { id: "nerviosa", t: "Nerviosa", color: "lavanda" },
  { id: "agobiada", t: "Agobiada", color: "melocoton" },
  { id: "enfadada", t: "Enfadada", color: "melocoton" },
  { id: "triste", t: "Triste", color: "cielo" },
  { id: "sola", t: "Sola", color: "cielo" },
];

export const NIVELES = ["Muy mal", "Mal", "Regular", "Bien", "Muy bien"];
