/* ============================================================
   Reglas del juego. Todos los números ajustables están aquí.

   Principio: solo refuerzo positivo.
   - Cumplir el plan suma huellitas. No cumplir no resta nada.
   - Las mascotas nunca mueren ni enferman (suelo de necesidades).
   - Mantener una mascota cuesta menos de lo que se gana en un día normal.
   ============================================================ */
import type { ActivityCategory } from "../comemos/models";
import type { ChucheId, Especie, Necesidad } from "./tipos";

/** Huellitas base por cada logro (antes del multiplicador). */
export const PUNTOS = {
  comida: 10,          // cada comida "lo que hay" del plan (desayuno, comida, merienda, cena)
  comidaOtra: 8,       // otra cosa, otra receta o sobras: cuenta, pero sin el bonus de seguir el plan
  gimnasio: 25,        // ir al gimnasio
  agua: 5,             // llegar al objetivo de agua
  diaCompleto: 15,     // las cuatro comidas marcadas el mismo día (sean lo que sean)
} as const;

/** Cuantos más animalitos, más bonus: 1 → x1, 2 → x1.25, 3 → x1.5, 4 → x1.75, 5 o más → x2 (tope). */
export const multiplicador = (numMascotas: number) => Math.min(2, 1 + 0.25 * Math.max(0, numMascotas - 1));

export const ESPECIES: Especie[] = ["gatito", "rata", "mapache", "urraca", "cuervo"];

/** Llegadas: al cruzar cada umbral de huellitas GANADAS EN TOTAL aparece un animalito ALEATORIO
    (sorpresa, no una progresión fija). Después del último, uno más cada CADA_DESPUES. */
export const LLEGADAS = [120, 350, 700];
export const CADA_DESPUES = 500;
export const umbralLlegada = (n: number) =>
  n < LLEGADAS.length ? LLEGADAS[n] : LLEGADAS[LLEGADAS.length - 1] + CADA_DESPUES * (n - LLEGADAS.length + 1);

/** Regalos: si un animalito tiene tripita, baño y mimos por encima de UMBRAL_CUIDADO durante
    HORAS_REGALO horas (acumuladas), te trae una chuche para ti. Se canjea por algo rico que compra Adrián. */
export const UMBRAL_CUIDADO = 60;
export const HORAS_REGALO = 36;

export const SUELO_NECESIDAD = 10;

/** Cuánto baja cada necesidad por hora mientras Rali está despierta.
    La energía no está aquí: no se cuida, refleja el día de Rali (ver energia.ts). */
export const BAJADA_POR_HORA: Record<Exclude<Necesidad, "energia">, number> = {
  hambre: 3,       // de 100 a ~10 en 30 h → unas 2 chuches al día
  limpieza: 1.5,
  mimos: 2,
};
/** Mientras Rali duerme, las mascotas también: casi no gastan nada. */
export const FACTOR_NOCHE = 0.3;

/* ---------- Energía (refleja el día de Rali) ----------
   Cuentas con el horario por defecto (despierta 11:00, se duerme 03:30 → 7,5 h de sueño):
   - Día tranquilo: gasta ~33 y la noche recarga ~52 → amanece al 100 %.
   - Trabajo (8 h): gasta ~57 → amanece al ~95 %.
   - Trabajo + gimnasio + batch cooking: gasta ~90 → amanece al ~62 %: "cansadito". */
/** Gasto por cada hora despierta, haga lo que haga. */
export const GASTO_DESPIERTA = 2;
/** Gasto extra por hora de cada tipo de actividad (las de la pantalla Actividad). */
export const GASTO_POR_HORA: Record<ActivityCategory, number> = {
  work: 3,
  walk: 4,
  bike: 6,
  gym: 14,
  chores: 6,     // tareas de casa y batch cooking
  other: 4,
};
/** Recarga por cada hora dormida (según el horario de sueño del perfil). */
export const RECARGA_POR_HORA_DORMIDA = 7;
export const SUELO_ENERGIA = 10;
/** Si marca "¡He ido!" al gimnasio un día que no estaba en el plan, se cuentan estos minutos. */
export const GIMNASIO_SIN_PLAN_MIN = 75;
/** Por debajo de esto el animalito está "sin pilas". */
export const UMBRAL_CANSADO = 30;

/** Qué hace cada chuche. La favorita de cada especie da el doble de mimos y más tripita. */
export const EFECTO_CHUCHE: Record<ChucheId, { hambre: number; mimos: number }> = {
  caramelo: { hambre: 25, mimos: 5 },
  piruleta: { hambre: 35, mimos: 8 },
  pescadito: { hambre: 45, mimos: 10 },
  queso: { hambre: 45, mimos: 10 },
  galleta: { hambre: 45, mimos: 10 },
  brillito: { hambre: 45, mimos: 10 },
  nuez: { hambre: 45, mimos: 10 },
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
   - Día normal (3 comidas del plan): 30 huellitas. Si una es pizza: 28.
   - Día redondo (4 comidas + gimnasio + agua + día completo): 85 huellitas.
   - Mantener una mascota: ~2 chuches de 8–10 = 16–20 huellitas al día.
   Con 4 mascotas el multiplicador x1.75 hace que un día redondo dé ~149. */
