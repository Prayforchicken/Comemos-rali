/* ============================================================
   El plato de esta toma: gramos pesados de cada táper frente a lo que toca.
   - Lo que toca en una toma = objetivo diario × reparto (Ajustes).
   - Por cada macro: si falta, cuántos gramos faltan (en rojo en la pantalla);
     si sobra, cuántos sobran. Si falta proteína o hidratos, cuántos gramos
     más de qué táper lo cubrirían.
   ============================================================ */
import type { Totales } from "../alimentos/tipos";
import { enNevera, grupos, macrosDe, por100, quedan } from "./lotes";
import type { Datos, Lote, Momento } from "./tipos";

export type Clave = "kcal" | "proteina" | "carbos" | "grasa";

export const MACROS: { clave: Clave; nombre: string; unidad: string }[] = [
  { clave: "kcal", nombre: "Kcal", unidad: "kcal" },
  { clave: "proteina", nombre: "Proteína", unidad: "g" },
  { clave: "carbos", nombre: "Hidratos", unidad: "g" },
  { clave: "grasa", nombre: "Grasa", unidad: "g" },
];

/** Margen dentro del cual se da por bueno (±3 %). */
const MARGEN = 0.03;

export function objetivoToma(d: Datos, m: Momento): Record<Clave, number> {
  const o = d.ajustes.objetivo, f = d.ajustes.reparto[m];
  return { kcal: Math.round(o.kcal * f), proteina: Math.round(o.proteina * f), carbos: Math.round(o.carbos * f), grasa: Math.round(o.grasa * f) };
}

/** Qué tápers poner en el plato por defecto: lo más antiguo, y si falta, su pareja de proteína o de hidratos. */
export function sugerencia(d: Datos): string[] {
  const g = grupos(d)[0];
  if (!g) return [];
  const ids = g.lotes.map((l) => l.id);
  const tipos = new Set(g.lotes.map((l) => l.tipo));
  if (tipos.has("combinado")) return ids;
  const otros = enNevera(d).filter((l) => !ids.includes(l.id));
  if (!tipos.has("proteina")) { const p = otros.find((l) => l.tipo === "proteina" || l.tipo === "combinado"); if (p) ids.push(p.id); }
  if (!tipos.has("hidratos") && tipos.has("proteina")) { const h = otros.find((l) => l.tipo === "hidratos"); if (h) ids.push(h.id); }
  return ids;
}

export interface Linea {
  clave: Clave; nombre: string; unidad: string;
  valor: number; objetivo: number;
  estado: "falta" | "justo" | "sobra";
  diferencia: number;
  /** "+85 g de curry": cuánto más de qué táper cubre lo que falta (proteína e hidratos). */
  pista: string | null;
}

export function calcular(d: Datos, plato: { lote: Lote; gramos: number }[], m: Momento): { total: Totales; lineas: Linea[] } {
  const total = plato.reduce<Totales>((s, x) => {
    const t = macrosDe(x.lote, x.gramos);
    return { gramos: s.gramos + x.gramos, kcal: s.kcal + t.kcal, proteina: s.proteina + t.proteina, carbos: s.carbos + t.carbos, grasa: s.grasa + t.grasa, fibra: s.fibra + t.fibra };
  }, { gramos: 0, kcal: 0, proteina: 0, carbos: 0, grasa: 0, fibra: 0 });
  const obj = objetivoToma(d, m);
  const lineas = MACROS.map(({ clave, nombre, unidad }): Linea => {
    const valor = Math.round(total[clave]);
    const objetivo = obj[clave];
    const dif = valor - objetivo;
    const estado = Math.abs(dif) <= objetivo * MARGEN ? "justo" : dif < 0 ? "falta" : "sobra";
    let pista: string | null = null;
    if (estado === "falta" && (clave === "proteina" || clave === "carbos")) {
      // El táper del plato que más aporta de ese macro por gramo.
      const mejor = plato.map((x) => x.lote).filter((l) => quedan(l) > 0).sort((a, b) => por100(b)[clave] - por100(a)[clave])[0];
      const cada100 = mejor ? por100(mejor)[clave] : 0;
      if (mejor && cada100 >= 3) {
        const g = Math.ceil((-dif / cada100) * 100 / 5) * 5;
        pista = `+${g} g de ${mejor.nombre.toLowerCase()}`;
      }
    }
    return { clave, nombre, unidad, valor, objetivo, estado, diferencia: Math.abs(dif), pista };
  });
  return { total, lineas };
}
