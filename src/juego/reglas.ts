/* ============================================================
   Reglas del juego. Todos los números ajustables están aquí.

   Principio: solo refuerzo positivo.
   - Cumplir el plan suma huellitas. No cumplir no resta nada.
   - Las mascotas nunca mueren ni enferman (suelo de necesidades).
   - Mantener una mascota cuesta menos de lo que se gana en un día normal.
   ============================================================ */
import type { ChucheId, Especie, Necesidad } from "./tipos";

/** Huellitas base por cada logro (antes del multiplicador). */
export const PUNTOS = {
  comida: 10,          // cada comida del plan (desayuno, comida, merienda, cena)
  gimnasio: 25,        // ir al gimnasio
  agua: 5,             // llegar al objetivo de agua
  diaCompleto: 15,     // las cuatro comidas del plan en el mismo día
} as const;

/** Cuantos más animalitos, más bonus: 1 → x1, 2 → x1.25, 3 → x1.5, 4 → x1.75 */
export const multiplicador = (numMascotas: number) => 1 + 0.25 * Math.max(0, numMascotas - 1);

/** Umbral de huellitas GANADAS EN TOTAL para que aparezca cada especie. */
export const DESBLOQUEOS: { especie: Especie; total: number }[] = [
  { especie: "gatito", total: 0 },
  { especie: "rata", total: 120 },
  { especie: "mapache", total: 350 },
  { especie: "urraca", total: 700 },
];

export const SUELO_NECESIDAD = 10;

/** Cuánto baja cada necesidad por hora mientras Rali está despierta. */
export const BAJADA_POR_HORA: Record<Necesidad, number> = {
  hambre: 3,       // de 100 a ~10 en 30 h → unas 2 chuches al día
  limpieza: 1.5,
  mimos: 2,
  energia: 2.5,
};
/** Mientras Rali duerme, las mascotas también: recuperan energía y casi no gastan lo demás. */
export const SUBIDA_ENERGIA_DURMIENDO = 10;
export const FACTOR_NOCHE = 0.3;

/** Qué hace cada chuche. La favorita de cada especie da el doble de mimos y más tripita. */
export const EFECTO_CHUCHE: Record<ChucheId, { hambre: number; mimos: number }> = {
  caramelo: { hambre: 25, mimos: 5 },
  piruleta: { hambre: 35, mimos: 8 },
  pescadito: { hambre: 45, mimos: 10 },
  queso: { hambre: 45, mimos: 10 },
  galleta: { hambre: 45, mimos: 10 },
  brillito: { hambre: 45, mimos: 10 },
};
export const EXTRA_FAVORITA = { hambre: 15, mimos: 15 };

/** Acciones gratis: siempre disponibles, sin coste. */
export const MIMO = 15;
export const BANO = 100;

/** Por debajo de esto la mascota lo muestra (hambrienta, sucia...). */
export const UMBRAL_BAJO = 30;
/** Todo por encima de esto → feliz. */
export const UMBRAL_FELIZ = 70;

/* Cuentas de ejemplo (1 mascota):
   - Día normal (3 comidas del plan): 30 huellitas.
   - Día redondo (4 comidas + gimnasio + agua + día completo): 85 huellitas.
   - Mantener una mascota: ~2 chuches de 8–10 = 16–20 huellitas al día.
   Con 4 mascotas el multiplicador x1.75 hace que un día redondo dé ~149. */
