/* ============================================================
   Base local de alimentos comunes (valores aproximados por 100 g).
   Sirve sin internet y como atajo para "Otra cosa" (pizza, hamburguesa…).
   Cuando hay conexión, el buscador añade los resultados de wger, más precisos.
   Base pensada para una dieta ovolactovegetariana.
   ============================================================ */
import type { Alimento } from "./tipos";

type Fila = [id: string, nombre: string, kcal: number, proteina: number, carbos: number, grasa: number, fibra: number, porcion?: [string, number]];

const FILAS: Fila[] = [
  // Comer fuera / caprichos
  ["pizza-margarita", "Pizza margarita", 250, 10.5, 30, 9.5, 2, ["media pizza", 200]],
  ["pizza-4-quesos", "Pizza cuatro quesos", 280, 12, 28, 13, 1.8, ["media pizza", 200]],
  ["pizza-vegetal", "Pizza vegetal", 225, 9, 29, 8, 2.5, ["media pizza", 200]],
  ["hamburguesa-vegetal", "Hamburguesa vegetal con pan", 230, 11, 26, 9, 3, ["1 unidad", 220]],
  ["sushi-vegetal", "Sushi vegetal (maki)", 140, 3, 29, 1.5, 1.5, ["8 piezas", 200]],
  ["durum-falafel", "Dürüm de falafel", 220, 7, 27, 9, 4, ["1 unidad", 350]],
  ["falafel", "Falafel", 333, 13.3, 31.8, 17.8, 4.9, ["5 bolitas", 100]],
  ["bocata-tortilla", "Bocata de tortilla", 240, 9, 30, 9, 2, ["1 bocata", 250]],
  ["tortilla-patatas", "Tortilla de patatas", 190, 7, 13, 12, 1.5, ["1 pincho", 120]],
  ["patatas-fritas", "Patatas fritas", 312, 3.4, 41, 15, 3.8, ["ración", 150]],
  ["patatas-bravas", "Patatas bravas", 180, 2.5, 20, 10, 2.5, ["ración", 200]],
  ["nachos-queso", "Nachos con queso", 340, 9, 36, 18, 3, ["ración", 150]],
  ["croissant", "Croissant", 406, 8.2, 45.8, 21, 2.6, ["1 unidad", 60]],
  ["helado", "Helado", 207, 3.5, 24, 11, 0.7, ["1 bola", 70]],
  ["chocolate-negro", "Chocolate negro 70 %", 598, 7.8, 46, 43, 10.9, ["2 onzas", 20]],
  ["galletas", "Galletas", 480, 6, 68, 20, 2, ["3 galletas", 30]],
  ["cerveza", "Cerveza", 43, 0.5, 3.6, 0, 0, ["1 caña", 200]],
  ["refresco", "Refresco azucarado", 42, 0, 10.6, 0, 0, ["1 lata", 330]],
  // Básicos para cocinar
  ["arroz-cocido", "Arroz blanco cocido", 130, 2.7, 28, 0.3, 0.4, ["1 plato", 200]],
  ["pasta-cocida", "Pasta cocida", 158, 5.8, 31, 0.9, 1.8, ["1 plato", 200]],
  ["pan-blanco", "Pan blanco", 265, 9, 49, 3.2, 2.7, ["1 rebanada", 30]],
  ["patata-cocida", "Patata cocida", 87, 1.9, 20, 0.1, 1.8, ["1 mediana", 170]],
  ["huevo", "Huevo", 143, 12.6, 0.7, 9.5, 0, ["1 huevo", 55]],
  ["tofu-firme", "Tofu firme", 144, 15.8, 2.8, 8.7, 2.3, ["1 bloque", 125]],
  ["soja-texturizada", "Soja texturizada (seca)", 327, 51, 33, 1.2, 17.5, ["1 puñado", 50]],
  ["garbanzos-cocidos", "Garbanzos cocidos", 164, 8.9, 27.4, 2.6, 7.6, ["1 bote escurrido", 240]],
  ["lentejas-cocidas", "Lentejas cocidas", 116, 9, 20, 0.4, 7.9, ["1 plato", 200]],
  ["alubias-cocidas", "Alubias cocidas", 127, 8.7, 22.8, 0.5, 6.4, ["1 bote escurrido", 240]],
  ["guisantes", "Guisantes", 81, 5.4, 14.5, 0.4, 5.1, ["1 puñado", 80]],
  ["brocoli", "Brócoli cocido", 35, 2.4, 7.2, 0.4, 3.3, ["1 ración", 150]],
  ["tomate-triturado", "Tomate triturado", 32, 1.4, 5, 0.2, 1.5, ["medio bote", 200]],
  ["aguacate", "Aguacate", 160, 2, 8.5, 14.7, 6.7, ["medio", 70]],
  ["aceite-oliva", "Aceite de oliva", 884, 0, 0, 100, 0, ["1 cucharada", 10]],
  ["queso-curado", "Queso curado", 390, 25, 1.5, 32, 0, ["1 loncha gruesa", 30]],
  ["queso-fresco", "Queso fresco", 170, 12, 3, 12, 0, ["1 tarrina", 60]],
  ["yogur-natural", "Yogur natural", 61, 3.5, 4.7, 3.3, 0, ["1 yogur", 125]],
  ["leche-semi", "Leche semidesnatada", 46, 3.2, 4.8, 1.6, 0, ["1 vaso", 250]],
  ["platano", "Plátano", 89, 1.1, 22.8, 0.3, 2.6, ["1 unidad", 120]],
  ["manzana", "Manzana", 52, 0.3, 13.8, 0.2, 2.4, ["1 unidad", 180]],
  // Para montar recetas de congelador y desayunos
  ["hamburguesa-vegetal-sola", "Hamburguesa vegetal (solo la hamburguesa)", 210, 16, 9, 12, 4, ["1 unidad", 110]],
  ["pan-hamburguesa", "Pan de hamburguesa", 275, 9, 49, 4.5, 2.5, ["1 pan", 60]],
  ["lechuga", "Lechuga", 15, 1.4, 2.9, 0.2, 1.3, ["unas hojas", 15]],
  ["tomate", "Tomate", 18, 0.9, 3.9, 0.2, 1.2, ["2 rodajas", 30]],
  ["mayonesa", "Mayonesa", 680, 1, 0.6, 75, 0, ["1 cucharada", 12]],
  ["queso-lonchas", "Queso en lonchas", 300, 20, 2, 24, 0, ["1 loncha", 20]],
  ["cafe", "Café solo", 2, 0.1, 0, 0, 0, ["1 taza", 50]],
  ["azucar", "Azúcar", 400, 0, 100, 0, 0, ["1 sobre", 8]],
];

export const BASE: Alimento[] = FILAS.map(([id, nombre, kcal, proteina, carbos, grasa, fibra, porcion]) => ({
  id: `base-${id}`, nombre, fuente: "base", n: { kcal, proteina, carbos, grasa, fibra },
  porcion: porcion ? { nombre: porcion[0], gramos: porcion[1] } : undefined,
}));

/** Atajos que aparecen en "Otra cosa" antes de buscar. */
export const ATAJOS_OTRA = ["base-pizza-margarita", "base-hamburguesa-vegetal", "base-sushi-vegetal", "base-durum-falafel", "base-bocata-tortilla", "base-patatas-bravas", "base-nachos-queso"];
