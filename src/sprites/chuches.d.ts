import type { ChucheId, Especie } from "../juego/tipos";
export const CHUCHES: Record<ChucheId, { nombre: string; precio: number; favorito: Especie | null }>;
export function chuche(tipo: ChucheId, tam?: number): string;
export function huellitaIcono(tam?: number): string;
export function regaloIcono(tam?: number): string;
