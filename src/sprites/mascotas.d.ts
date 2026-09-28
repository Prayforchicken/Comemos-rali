import type { Especie, Animo, Accesorio } from "../juego/tipos";
export interface Pelaje { nombre: string; cuerpo: string; sombra: string; marca: string; panza: string; patron?: 'atigrado' | 'manchas' }
export const PELAJES: Record<Especie, Record<string, Pelaje>>;
export const ANIMOS: Animo[];
export const ACCESORIOS: Accesorio[];
export const TINTA: string;
export function mascota(o: { especie?: Especie; animo?: Animo; pelaje?: string; accesorio?: Accesorio; nombre?: string; tam?: number }): string;
