/* ============================================================
   Base local de alimentos (valores aproximados por 100 g, tablas de referencia).
   - Sirve sin internet: recetas de la app, "otra cosa" y el buscador.
   - Cuando hay conexión, el buscador añade además los resultados de wger.
   Dieta ovolactovegetariana. Las legumbres "cocidas" son de bote, ya escurridas.
   ============================================================ */
import type { Alimento, Unidad } from "./tipos";

type U = [singular: string, plural: string, gramos: number, paso: number];
type Fila = [id: string, nombre: string, kcal: number, proteina: number, carbos: number, grasa: number, fibra: number, porcion?: [string, number] | null, unidad?: U];

const BOTE: U = ["bote de 400 g", "botes de 400 g", 250, 0.5]; // 400 g de bote ≈ 250 g escurrido

const FILAS: Fila[] = [
  // Lo de siempre de Adrián
  ["plenny-pro", "Plenny Shake Pro", 404, 40.4, 27.3, 12.1, 7.6, ["1 toma (99 g)", 99]],
  // Legumbres y proteínas
  ["garbanzos-cocidos", "Garbanzos cocidos", 164, 8.9, 27.4, 2.6, 7.6, ["1 bote escurrido", 250], BOTE],
  ["alubias-rojas-cocidas", "Alubias rojas cocidas", 127, 8.7, 22.8, 0.5, 6.4, ["1 bote escurrido", 250], BOTE],
  ["alubias-cocidas", "Alubias blancas cocidas", 127, 8.7, 22.8, 0.5, 6.4, ["1 bote escurrido", 250], BOTE],
  ["lentejas-pardinas", "Lentejas pardinas (secas)", 352, 24.6, 63.4, 1.1, 10.7, ["1 puñado", 80]],
  ["lentejas-rojas", "Lentejas rojas (secas)", 358, 23.9, 63.1, 2.2, 10.8, ["1 puñado", 80]],
  ["lentejas-cocidas", "Lentejas cocidas", 116, 9, 20, 0.4, 7.9, ["1 plato", 200], BOTE],
  ["soja-texturizada", "Soja texturizada (seca)", 327, 51, 33, 1.2, 17.5, ["1 puñado", 50]],
  ["tofu-firme", "Tofu firme", 144, 15.8, 2.8, 8.7, 2.3, ["1 bloque", 200]],
  ["seitan", "Seitán", 120, 22, 5, 2, 0.6, ["1 paquete", 250]],
  ["huevo", "Huevo", 143, 12.6, 0.7, 9.5, 0, ["1 huevo", 55], ["huevo", "huevos", 55, 1]],
  ["skyr", "Skyr natural", 63, 11, 4, 0.2, 0, ["1 tarrina", 150]],
  ["yogur-natural", "Yogur natural", 61, 3.5, 4.7, 3.3, 0, ["1 yogur", 125], ["yogur", "yogures", 125, 1]],
  ["queso-rallado", "Queso rallado", 380, 28, 1, 29, 0, ["1 puñado", 30]],
  ["queso-curado", "Queso curado", 390, 25, 1.5, 32, 0, ["1 loncha gruesa", 30]],
  ["leche-semi", "Leche semidesnatada", 46, 3.2, 4.8, 1.6, 0, ["1 vaso", 250]],
  // Hidratos (en seco)
  ["arroz", "Arroz blanco (seco)", 360, 7, 79, 0.6, 1.3, ["1 ración", 75]],
  ["arroz-basmati", "Arroz basmati (seco)", 360, 7, 79, 0.6, 1.3, ["1 ración", 75]],
  ["pasta", "Pasta (seca)", 371, 13, 75, 1.5, 3.2, ["1 ración", 90]],
  ["cuscus", "Cuscús (seco)", 376, 12.8, 77.4, 0.6, 5, ["1 ración", 75]],
  ["pan-blanco", "Pan blanco", 265, 9, 49, 3.2, 2.7, ["1 rebanada", 30]],
  ["patata", "Patata", 77, 2, 17, 0.1, 2.2, ["1 mediana", 170], ["patata", "patatas", 170, 1]],
  ["arroz-cocido", "Arroz blanco cocido", 130, 2.7, 28, 0.3, 0.4, ["1 plato", 200]],
  ["pasta-cocida", "Pasta cocida", 158, 5.8, 31, 0.9, 1.8, ["1 plato", 200]],
  // Verduras
  ["tomate-triturado", "Tomate triturado", 32, 1.4, 5, 0.2, 1.5, ["medio bote", 200], ["lata de 400 g", "latas de 400 g", 400, 0.5]],
  ["cebolla", "Cebolla", 40, 1.1, 9.3, 0.1, 1.7, ["1 cebolla", 150], ["cebolla", "cebollas", 150, 0.5]],
  ["ajo", "Ajo", 149, 6.4, 33, 0.5, 2.1, ["1 diente", 5], ["diente", "dientes", 5, 1]],
  ["jengibre", "Jengibre fresco", 80, 1.8, 18, 0.8, 2, ["1 trozo", 10]],
  ["zanahoria", "Zanahoria", 41, 0.9, 9.6, 0.2, 2.8, ["1 zanahoria", 80], ["zanahoria", "zanahorias", 80, 1]],
  ["pimiento-rojo", "Pimiento rojo", 31, 1, 6, 0.3, 2.1, ["1 pimiento", 150], ["pimiento", "pimientos", 150, 0.5]],
  ["calabacin", "Calabacín", 17, 1.2, 3.1, 0.3, 1, ["1 calabacín", 250], ["calabacín", "calabacines", 250, 0.5]],
  ["champinon", "Champiñón", 22, 3.1, 3.3, 0.3, 1, ["1 bandeja", 250]],
  ["espinacas", "Espinacas", 23, 2.9, 3.6, 0.4, 2.2, ["1 puñado", 60]],
  ["brocoli", "Brócoli", 34, 2.8, 6.6, 0.4, 2.6, ["1 ración", 150]],
  ["guisantes", "Guisantes congelados", 81, 5.4, 14.5, 0.4, 5.1, ["1 puñado", 80]],
  ["maiz", "Maíz dulce (lata, escurrido)", 86, 3.3, 19, 1.4, 2, ["1 lata pequeña", 140], ["lata pequeña", "latas pequeñas", 140, 1]],
  // Despensa
  ["aceite-oliva", "Aceite de oliva", 884, 0, 0, 100, 0, ["1 cucharada", 10]],
  ["leche-coco-ligera", "Leche de coco ligera", 75, 0.7, 2.3, 7, 0, ["media lata", 200], ["lata de 400 ml", "latas de 400 ml", 400, 0.5]],
  ["salsa-soja", "Salsa de soja", 53, 8.1, 4.9, 0.6, 0.8, ["1 cucharada", 15]],
  ["miel", "Miel", 304, 0.3, 82, 0, 0.2, ["1 cucharada", 20]],
  ["maicena", "Maicena", 381, 0.3, 91, 0.1, 0.9, ["1 cucharada", 10]],
  ["sesamo", "Sésamo", 573, 17.7, 23.5, 49.7, 11.8, ["1 cucharada", 9]],
  ["curry-polvo", "Curry en polvo", 325, 14.3, 55.8, 14, 53.2, ["1 cucharadita", 3]],
  ["comino", "Comino molido", 375, 17.8, 44.2, 22.3, 10.5, ["1 cucharadita", 2]],
  ["pimenton", "Pimentón dulce", 282, 14.1, 54, 12.9, 34.9, ["1 cucharadita", 2]],
  ["oregano", "Orégano seco", 265, 9, 69, 4.3, 42.5, ["1 cucharadita", 1]],
  // Comer fuera / caprichos
  ["pizza-margarita", "Pizza margarita", 250, 10.5, 30, 9.5, 2, ["media pizza", 200]],
  ["pizza-4-quesos", "Pizza cuatro quesos", 280, 12, 28, 13, 1.8, ["media pizza", 200]],
  ["hamburguesa-vegetal", "Hamburguesa vegetal con pan", 230, 11, 26, 9, 3, ["1 unidad", 220]],
  ["sushi-vegetal", "Sushi vegetal (maki)", 140, 3, 29, 1.5, 1.5, ["8 piezas", 200]],
  ["durum-falafel", "Dürüm de falafel", 220, 7, 27, 9, 4, ["1 unidad", 350]],
  ["bocata-tortilla", "Bocata de tortilla", 240, 9, 30, 9, 2, ["1 bocata", 250]],
  ["tortilla-patatas", "Tortilla de patatas", 190, 7, 13, 12, 1.5, ["1 pincho", 120]],
  ["patatas-bravas", "Patatas bravas", 180, 2.5, 20, 10, 2.5, ["ración", 200]],
  ["nachos-queso", "Nachos con queso", 340, 9, 36, 18, 3, ["ración", 150]],
  ["croissant", "Croissant", 406, 8.2, 45.8, 21, 2.6, ["1 unidad", 60]],
  ["galletas", "Galletas", 480, 6, 68, 20, 2, ["3 galletas", 30]],
  ["chocolate-negro", "Chocolate negro 70 %", 598, 7.8, 46, 43, 10.9, ["2 onzas", 20]],
  ["helado", "Helado", 207, 3.5, 24, 11, 0.7, ["1 bola", 70]],
  ["cerveza", "Cerveza", 43, 0.5, 3.6, 0, 0, ["1 caña", 200]],
  ["refresco", "Refresco azucarado", 42, 0, 10.6, 0, 0, ["1 lata", 330]],
  ["platano", "Plátano", 89, 1.1, 22.8, 0.3, 2.6, ["1 unidad", 120]],
  ["manzana", "Manzana", 52, 0.3, 13.8, 0.2, 2.4, ["1 unidad", 180]],
];

export const BASE: Alimento[] = FILAS.map(([id, nombre, kcal, proteina, carbos, grasa, fibra, porcion, unidad]) => ({
  id: `base-${id}`, nombre, fuente: "base", n: { kcal, proteina, carbos, grasa, fibra },
  porcion: porcion ? { nombre: porcion[0], gramos: porcion[1] } : undefined,
  unidad: unidad ? ({ singular: unidad[0], plural: unidad[1], gramos: unidad[2], paso: unidad[3] } satisfies Unidad) : undefined,
}));

const POR_ID = new Map(BASE.map((a) => [a.id.slice(5), a]));

/** Alimento de la base por su id corto ("garbanzos-cocidos"). Falla al compilar las recetas si no existe. */
export function alimentoBase(id: string): Alimento {
  const a = POR_ID.get(id);
  if (!a) throw new Error(`Falta el alimento "${id}" en alimentos/base.ts`);
  return a;
}

/** Atajos que aparecen en "Otra cosa" antes de buscar. */
export const ATAJOS_OTRA = ["base-pizza-margarita", "base-hamburguesa-vegetal", "base-durum-falafel", "base-bocata-tortilla", "base-patatas-bravas", "base-platano"];
