/* Cuentas de nutrición: sumar alimentos, repartir entre raciones y multiplicar. */
import type { Item, Por100, Totales } from "./tipos";

const r1 = (v: number) => Math.round(v * 10) / 10;

export const vacio: Totales = { gramos: 0, kcal: 0, proteina: 0, carbos: 0, grasa: 0, fibra: 0 };

/** Suma una lista de alimentos con sus gramos. */
export function totales(items: Item[]): Totales {
  const t = items.reduce((s, i) => {
    const f = i.gramos / 100;
    return { gramos: s.gramos + i.gramos, kcal: s.kcal + i.n.kcal * f, proteina: s.proteina + i.n.proteina * f, carbos: s.carbos + i.n.carbos * f, grasa: s.grasa + i.n.grasa * f, fibra: s.fibra + i.n.fibra * f };
  }, { ...vacio });
  return redondear(t);
}

export function redondear(t: Totales): Totales {
  return { gramos: Math.round(t.gramos), kcal: Math.round(t.kcal), proteina: r1(t.proteina), carbos: r1(t.carbos), grasa: r1(t.grasa), fibra: r1(t.fibra) };
}

export const sumar = (a: Totales, b: Totales): Totales => ({
  gramos: a.gramos + b.gramos, kcal: a.kcal + b.kcal, proteina: a.proteina + b.proteina, carbos: a.carbos + b.carbos, grasa: a.grasa + b.grasa, fibra: a.fibra + b.fibra,
});

export const por = (t: Totales, f: number): Totales => redondear({
  gramos: t.gramos * f, kcal: t.kcal * f, proteina: t.proteina * f, carbos: t.carbos * f, grasa: t.grasa * f, fibra: t.fibra * f,
});

export const dividir = (t: Totales, n: number): Totales => por(t, 1 / Math.max(1, n));

/** Valores por 100 g a partir de unos totales (para guardar una receta como alimento). */
export const aPor100 = (t: Totales): Por100 => {
  const f = t.gramos ? 100 / t.gramos : 0;
  return { kcal: Math.round(t.kcal * f), proteina: r1(t.proteina * f), carbos: r1(t.carbos * f), grasa: r1(t.grasa * f), fibra: r1(t.fibra * f) };
};
