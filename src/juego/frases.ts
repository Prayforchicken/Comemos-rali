/* ============================================================
   Personalidad y frases de los animalitos.
   Cada animalito tiene un carácter y dice cosas según cómo está, la hora,
   la energía de Rali y su especie. Solo textos: no cambia ningún número del juego.
   Para añadir frases, basta con escribirlas en las listas de abajo.
   ============================================================ */
import type { Animo, Especie, Mascota, Personalidad } from "./tipos";

export const PERSONALIDADES: Record<Personalidad, { nombre: string; texto: string }> = {
  dormilona: { nombre: "Marmota", texto: "Siempre tiene sueñito y adora las siestas contigo." },
  glotona: { nombre: "Tragaldabas", texto: "Piensa en comida el 90 % del tiempo. El otro 10 %, también." },
  mimosa: { nombre: "Pura ternura", texto: "Quiere mimos a todas horas y te dice cosas bonitas." },
  curiosa: { nombre: "Cotilla", texto: "Lo pregunta todo y se entera de todo lo que pasa en casa." },
  presumida: { nombre: "Postureo", texto: "Se mira en todos los espejos y le encantan los accesorios." },
  gruñona: { nombre: "Cascarrabias", texto: "Refunfuña mucho, pero en el fondo es un trozo de pan." },
};
const LISTA = Object.keys(PERSONALIDADES) as Personalidad[];

/** Número estable a partir de un texto (para que cada animalito tenga siempre el mismo carácter). */
function hash(t: string) {
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export const personalidadAlAzar = (): Personalidad => LISTA[Math.floor(Math.random() * LISTA.length)];
/** Los animalitos anteriores a esta versión no tenían carácter: se les da uno fijo según su id. */
export const personalidadDe = (m: Pick<Mascota, "id" | "personalidad">): Personalidad => m.personalidad ?? LISTA[hash(m.id) % LISTA.length];

/* ---------- frases ---------- */

const POR_ANIMO: Partial<Record<Animo, string[]>> = {
  feliz: ["¡Hoy es un día precioso!", "¡Qué feliz soy viviendo contigo!", "¡Bailecito de la felicidad!"],
  contento: ["Aquí estoy, a gustito.", "¿Qué hacemos hoy?", "Me gusta cuando estás cerca."],
  triste: ["¿Me das un mimito?", "Te echaba de menos…", "¿Jugamos un ratito?"],
  enfadado: ["Hmpf. Nadie me hace caso.", "Hoy estoy de morros. Un mimo lo arregla.", "¡Me pido atención!"],
  hambriento: ["Mi tripita hace ruiditos…", "¿Hay chuches? Pregunto por nada.", "Tengo un hambre de lobo."],
  sucio: ["Creo que huelo un poquito raro.", "¿Toca baño con burbujas?", "Me he revolcado en algo… ups."],
  dormido: ["Zzz…", "Zzz… chuches… zzz", "Zzz… cinco minutitos más…"],
  cansado: ["Qué día más largo, ¿eh?", "Tengo sueñito, como tú.", "Hoy nos toca descansar a las dos."],
};

const POR_PERSONALIDAD: Record<Personalidad, string[]> = {
  dormilona: ["¿Siesta? ¿Alguien ha dicho siesta?", "Me he despertado solo para verte.", "La mantita me llama…"],
  glotona: ["¿Qué hay de comer hoy?", "Huele a batch cooking… ¡me encanta!", "Si comes bien, yo como chuches. Es la ley."],
  mimosa: ["Eres mi persona favorita del mundo.", "¿Te he dicho hoy que te quiero?", "Un abrazo más, porfa."],
  curiosa: ["¿Qué es eso? ¿Y eso otro?", "He investigado la cocina. Sin comentarios.", "¿Hoy toca gimnasio? ¿Puedo mirar?"],
  presumida: ["¿Has visto qué guapura la mía hoy?", "Este lazo me queda de maravilla.", "Hazme una foto, que salgo bien."],
  gruñona: ["No te he echado de menos. Nada. Cero.", "Vale, puedes acariciarme. Un poco.", "Refunfuño, pero te quiero."],
};

const POR_ESPECIE: Record<Especie, string[]> = {
  gatito: ["Miau. Eso significa «te quiero».", "Tu teclado es mi cama oficial.", "Prrrr… prrrr…"],
  rata: ["He escondido un quesito. No diré dónde.", "¡Mis bigotes detectan chuches!", "Tamaño pequeño, cerebro enorme."],
  mapache: ["Estas manitas no han tocado nada. Lo juro.", "¿Galletas? Yo no he visto galletas.", "He lavado mi comida tres veces."],
  urraca: ["¡Algo brilla! ¡Es mío!", "Te he traído un botón. De nada.", "Colecciono cosas bonitas… y a ti."],
  cuervo: ["Cra. Cra. Te estaba esperando.", "Recuerdo todas las caras. La tuya es mi favorita.", "He resuelto un acertijo mientras no estabas."],
};

export interface Contexto {
  animo: Animo;
  hora: number;
  /** Energía de Rali (0–100). */
  energia: number;
  /** Energía con la que amaneció hoy. */
  amanecio: number;
  nombreRali?: string;
}

function porContexto(c: Contexto): string[] {
  const out: string[] = [];
  if (c.animo !== "dormido" && c.amanecio < 70) out.push("Hoy me he despertado sin pilas. Ayer fue mucho.", "Vamos con calma hoy, ¿vale?");
  if (c.animo !== "dormido" && c.energia < 35) out.push("Menudo día llevamos. Te mereces un descanso.", "Si hoy no sale todo, no pasa nada.");
  if (c.hora >= 11 && c.hora < 13) out.push("¡Buenos días! ¿Desayunamos?");
  if (c.hora >= 14 && c.hora < 16) out.push("¿Qué tal la comida? Cuéntamelo todo.");
  if (c.hora >= 21 && c.hora < 24) out.push("Casi es hora de dormir. Qué bien lo has hecho hoy.");
  return out;
}

/** Elige una frase. `vuelta` sirve para pasar a otra al tocar al animalito. */
export function fraseDe(m: Pick<Mascota, "id" | "especie" | "personalidad">, c: Contexto, vuelta = 0): string {
  if (c.animo === "dormido") {
    const z = POR_ANIMO.dormido!;
    return z[(hash(m.id) + vuelta) % z.length];
  }
  const bolsa = [
    ...(POR_ANIMO[c.animo] ?? []),
    ...(POR_ANIMO[c.animo] ?? []), // el ánimo pesa el doble: es lo que más importa
    ...POR_PERSONALIDAD[personalidadDe(m)],
    ...POR_ESPECIE[m.especie],
    ...porContexto(c),
  ];
  // Cambia sola cada media hora y al tocar al animalito.
  const franja = Math.floor(Date.now() / (30 * 60_000));
  return bolsa[(hash(m.id) + franja + vuelta * 7) % bolsa.length];
}
