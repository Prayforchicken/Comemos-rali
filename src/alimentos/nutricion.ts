/* Cuentas de nutrición: sumar alimentos y convertir una receta propia en receta del plan. */
import type { MealTemplate } from "../comemos/models";
import type { Item, Por100, RecetaPropia, Totales } from "./tipos";

const r1 = (v: number) => Math.round(v * 10) / 10;

export function totales(items: Item[]): Totales {
  const t = items.reduce((s, i) => {
    const f = i.gramos / 100;
    return { gramos: s.gramos + i.gramos, kcal: s.kcal + i.n.kcal * f, proteina: s.proteina + i.n.proteina * f, carbos: s.carbos + i.n.carbos * f, grasa: s.grasa + i.n.grasa * f, fibra: s.fibra + i.n.fibra * f };
  }, { gramos: 0, kcal: 0, proteina: 0, carbos: 0, grasa: 0, fibra: 0 });
  return { gramos: Math.round(t.gramos), kcal: Math.round(t.kcal), proteina: r1(t.proteina), carbos: r1(t.carbos), grasa: r1(t.grasa), fibra: r1(t.fibra) };
}

export const dividir = (t: Totales, n: number): Totales => {
  const d = Math.max(1, n);
  return { gramos: Math.round(t.gramos / d), kcal: Math.round(t.kcal / d), proteina: r1(t.proteina / d), carbos: r1(t.carbos / d), grasa: r1(t.grasa / d), fibra: r1(t.fibra / d) };
};

export const vacio: Por100 = { kcal: 0, proteina: 0, carbos: 0, grasa: 0, fibra: 0 };

/** Una receta propia se guarda también como receta del plan: así sale en "Algo diferente" y en "Sobras" con su ración calculada. */
export function aPlantilla(r: RecetaPropia): MealTemplate {
  const racion = dividir(totales(r.items), r.raciones);
  return {
    id: r.id,
    name: r.nombre,
    shortName: r.nombre.length > 22 ? `${r.nombre.slice(0, 21)}…` : r.nombre,
    kind: "quick",
    baseKcal: Math.max(1, racion.kcal),
    baseProteinG: racion.proteina,
    baseFibreG: racion.fibra,
    baseGrams: Math.max(1, racion.gramos),
    ingredients: r.items.map((i) => `${Math.round(i.gramos / Math.max(1, r.raciones))} g ${i.nombre} (por ración)`),
    instructions: r.pasos.trim() || "Receta propia.",
    tags: ["propia"],
    slots: r.momentos.length ? r.momentos : ["lunch", "dinner"],
    active: true,
  };
}
