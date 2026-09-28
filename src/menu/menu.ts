/* ============================================================
   Menú de comidas.
   - Cada toma (desayuno, comida, merienda, cena) tiene una receta "principal" y,
     en comida y cena, un acompañamiento opcional (el hidrato que completa el batch).
   - Un menú vale desde una fecha hasta que se guarda otro: así cambiar el menú
     no reescribe lo que ya se comió otros días.
   - Sin menú guardado, manda el plan de Comemos (ciclo de batch de 4 días).
   - Cheat meals: grupos sin pesar ("Pizza", "Hamburguesa del burger"…) con unas
     calorías aproximadas. Todas las pizzas van a "Pizza" y listo.
   Se guarda fuera del plan (Datos.menus y Datos.cheats) para que el JSON de Comemos no cambie.
   ============================================================ */
import type { MealSlot, MealTemplate } from "../comemos/models";
import type { Categoria, RecetaPropia } from "../alimentos/tipos";

export interface TomaMenu {
  /** Receta principal (id de MealTemplate). */
  recetaId: string;
  /** Acompañamiento (solo comida y cena). */
  acompanamientoId?: string;
  /** Qué parte de la energía de la toma va al acompañamiento (0–0,5). Por defecto PARTE_ACOMPANAMIENTO. */
  parte?: number;
}

export interface Menu {
  id: string;
  /** Vale desde este día (YYYY-MM-DD) incluido. */
  desde: string;
  tomas: Partial<Record<MealSlot, TomaMenu>>;
}

export interface GrupoCheat {
  id: string;
  nombre: string;
  /** Calorías aproximadas de una comida así. No hace falta afinar. */
  kcal: number;
  proteina: number;
  fibra: number;
}

export const PARTE_ACOMPANAMIENTO = 0.3;

export const CATEGORIAS: Record<Categoria, { nombre: string; plural: string; color: string; texto: string }> = {
  batch: { nombre: "Batch", plural: "Batch", color: "mantequilla", texto: "Se cocina en tanda. Cambiar un batch por otro sigue dando el bonus." },
  acompanamiento: { nombre: "Acompañamiento", plural: "Acompañamientos", color: "menta", texto: "Arroz, pasta, pan… completa el batch. Se hace ese día o el anterior." },
  congelador: { nombre: "De congelador", plural: "De congelador", color: "cielo", texto: "Para cuando no queda batch: hamburguesa casera, noodles, arroz congelado…" },
  rapida: { nombre: "Rápida", plural: "Otras recetas", color: "lavanda", texto: "Cualquier otra receta." },
  desayuno: { nombre: "Desayuno", plural: "Desayunos y meriendas", color: "melocoton", texto: "Para el desayuno y la merienda." },
};
export const ORDEN_CATEGORIAS: Categoria[] = ["batch", "acompanamiento", "congelador", "desayuno", "rapida"];

/** Categoría de cualquier receta, también de las de Comemos (que no la tienen: sale de su tipo). */
export function categoriaDe(t: MealTemplate): Categoria {
  const tag = t.tags.find((x) => x.startsWith("cat:"));
  if (tag) return tag.slice(4) as Categoria;
  if (t.kind === "batch") return "batch";
  if (t.kind === "emergency") return "congelador";
  if (t.kind === "breakfast" || t.slots.includes("breakfast")) return "desayuno";
  return "rapida";
}

/** El menú que vale para una fecha (el último guardado con `desde` ≤ fecha). */
export function menuDe(menus: Menu[], fecha: string): Menu | undefined {
  let elegido: Menu | undefined;
  for (const m of menus) if (m.desde <= fecha && (!elegido || m.desde >= elegido.desde)) elegido = m;
  return elegido;
}

export const CHEATS_INICIALES: GrupoCheat[] = [
  { id: "cheat-pizza", nombre: "Pizza", kcal: 900, proteina: 38, fibra: 6 },
  { id: "cheat-burger", nombre: "Hamburguesa del burger", kcal: 950, proteina: 30, fibra: 7 },
  { id: "cheat-kebab", nombre: "Kebab / dürüm", kcal: 800, proteina: 25, fibra: 8 },
  { id: "cheat-sushi", nombre: "Sushi", kcal: 650, proteina: 18, fibra: 4 },
  { id: "cheat-chino", nombre: "Comida china", kcal: 900, proteina: 22, fibra: 6 },
  { id: "cheat-tapas", nombre: "Tapas / picoteo fuera", kcal: 750, proteina: 22, fibra: 5 },
];

/* ---------- recetas de ejemplo (se añaden una vez; se pueden editar o borrar) ---------- */

const it = (alimentoId: string, nombre: string, gramos: number, kcal: number, proteina: number, carbos: number, grasa: number, fibra: number) =>
  ({ alimentoId: `base-${alimentoId}`, nombre, gramos, n: { kcal, proteina, carbos, grasa, fibra } });

export const RECETAS_EJEMPLO: RecetaPropia[] = [
  {
    id: "receta-hamburguesa-casera", nombre: "Hamburguesa casera completa", categoria: "congelador", raciones: 1, momentos: ["lunch", "dinner"],
    items: [
      it("hamburguesa-vegetal-sola", "Hamburguesa vegetal (solo la hamburguesa)", 110, 210, 16, 9, 12, 4),
      it("pan-hamburguesa", "Pan de hamburguesa", 60, 275, 9, 49, 4.5, 2.5),
      it("queso-lonchas", "Queso en lonchas", 20, 300, 20, 2, 24, 0),
      it("lechuga", "Lechuga", 15, 15, 1.4, 2.9, 0.2, 1.3),
      it("tomate", "Tomate", 30, 18, 0.9, 3.9, 0.2, 1.2),
      it("mayonesa", "Mayonesa", 12, 680, 1, 0.6, 75, 0),
    ],
    pasos: "Hamburguesa del congelador a la plancha, 4 min por lado. Montar con el pan tostado.", creada: "2026-09-28T10:00:00.000Z",
  },
  {
    id: "receta-cafe-galletas", nombre: "Café con leche y galletas", categoria: "desayuno", raciones: 1, momentos: ["breakfast", "snack"],
    items: [
      it("cafe", "Café solo", 50, 2, 0.1, 0, 0, 0),
      it("leche-semi", "Leche semidesnatada", 200, 46, 3.2, 4.8, 1.6, 0),
      it("azucar", "Azúcar", 8, 400, 0, 100, 0, 0),
      it("galletas", "Galletas", 100, 480, 6, 68, 20, 2),
    ],
    pasos: "", creada: "2026-09-28T10:00:01.000Z",
  },
];
