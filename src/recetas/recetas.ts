/* ============================================================
   Recetas de batch que trae la app.
   - Cada receta tiene una o dos PARTES, y cada parte va a su propio táper:
       combinado  → un solo táper (boloñesa con la pasta ya mezclada)
       proteina + hidratos → el principal y la guarnición por separado (curry y arroz)
   - Cantidades EN CRUDO y POR RACIÓN (una ración ≈ 750–850 kcal entre todas las partes).
   - Las kcal y macros no se escriben a mano: salen de sumar los ingredientes (alimentos/base.ts).
   - `dura`: días que aguanta en la nevera (regla habitual: 3–4 días). Una parte puede
     tener los suyos (el arroz, 3). La app pone con esto la fecha de caducidad de cada táper.
   Para añadir una: copia un bloque y usa ids de alimentos/base.ts sin el prefijo "base-".
   ============================================================ */
import { alimentoBase } from "../alimentos/base";
import type { Item } from "../alimentos/tipos";
import type { Componente, Receta, Tipo } from "../nucleo/tipos";

const ARROZ = " Extiende el arroz para que se enfríe rápido y guárdalo en menos de 1 hora.";

function ing(lista: [id: string, gramos: number][]): Item[] {
  return lista.map(([id, gramos]) => {
    const a = alimentoBase(id);
    return { alimentoId: a.id, nombre: a.nombre, gramos, n: a.n, unidad: a.unidad, rinde: a.rinde };
  });
}

const parte = (id: string, nombre: string, tipo: Tipo, lista: [string, number][], dura?: number): Componente => ({ id, nombre, tipo, ingredientes: ing(lista), dura });

export const RECETAS: Receta[] = [
  {
    id: "curry-garbanzos",
    nombre: "Curry de garbanzos y espinacas",
    corto: "Curry de garbanzos",
    minutos: 35,
    componentes: [
      parte("curry", "Curry de garbanzos", "proteina", [
        ["garbanzos-cocidos", 180], ["cebolla", 60], ["ajo", 5], ["jengibre", 5], ["curry-polvo", 6],
        ["tomate-triturado", 120], ["leche-coco-ligera", 80], ["espinacas", 80], ["aceite-oliva", 10], ["skyr", 100],
      ]),
      parte("arroz", "Arroz basmati", "hidratos", [["arroz-basmati", 65]], 3),
    ],
    pasos: [
      "Pon el arroz a cocer, unos 12 min. Mientras, pica la cebolla, el ajo y el jengibre.",
      "Sofríe la cebolla en el aceite 5 min a fuego medio. Añade ajo, jengibre y curry y remueve 1 min.",
      "Echa el tomate y la leche de coco y deja 10 min a fuego suave.",
      "Añade los garbanzos escurridos, 5 min más, y al final las espinacas hasta que se ablanden.",
      "Fuera del fuego mezcla el skyr. Curry y arroz, cada uno en su táper.",
    ],
    guardar: "Recalienta hasta que humee." + ARROZ,
    dura: 4,
  },
  {
    id: "bolonesa-soja",
    nombre: "Boloñesa de soja con pasta",
    corto: "Boloñesa de soja",
    minutos: 40,
    componentes: [
      parte("bolonesa", "Boloñesa de soja con pasta", "combinado", [
        ["soja-texturizada", 45], ["cebolla", 50], ["zanahoria", 50], ["champinon", 60], ["ajo", 5],
        ["tomate-triturado", 180], ["aceite-oliva", 10], ["oregano", 1], ["pasta", 90], ["queso-rallado", 15],
      ]),
    ],
    pasos: [
      "Hidrata la soja 10 min en agua caliente y escúrrela apretando bien.",
      "Pica cebolla, zanahoria, champiñón y ajo y sofríelo todo en el aceite 8 min.",
      "Añade la soja, dórala 3 min, echa el tomate y el orégano y deja 15 min a fuego suave.",
      "Cuece la pasta 1 min menos de lo que diga el paquete y mézclala con la salsa y el queso.",
      "Todo en un táper.",
    ],
    guardar: "Si se seca, un chorrito de agua al recalentar.",
    dura: 4,
  },
  {
    id: "lentejas-estofadas",
    nombre: "Lentejas estofadas con verduras",
    corto: "Lentejas",
    minutos: 55,
    componentes: [
      parte("lentejas", "Lentejas estofadas", "combinado", [
        ["lentejas-pardinas", 100], ["patata", 120], ["zanahoria", 60], ["cebolla", 50], ["pimiento-rojo", 40],
        ["ajo", 5], ["tomate-triturado", 60], ["pimenton", 2], ["comino", 1], ["aceite-oliva", 12],
      ]),
    ],
    pasos: [
      "Pica cebolla, pimiento, ajo y zanahoria y sofríelo en el aceite 8 min en una olla.",
      "Fuera del fuego añade pimentón y comino para que no se quemen, y después el tomate.",
      "Echa las lentejas lavadas, la patata en trozos y agua que las cubra dos dedos.",
      "Cuece 35–40 min a fuego suave hasta que estén tiernas.",
      "Todo en un táper.",
    ],
    guardar: "Si espesan, añade un chorrito de agua al recalentar.",
    dura: 4,
  },
  {
    id: "chili-sin-carne",
    nombre: "Chili sin carne con arroz",
    corto: "Chili sin carne",
    minutos: 35,
    componentes: [
      parte("chili", "Chili sin carne", "proteina", [
        ["alubias-rojas-cocidas", 150], ["soja-texturizada", 35], ["cebolla", 50], ["pimiento-rojo", 60], ["ajo", 5],
        ["tomate-triturado", 150], ["maiz", 50], ["comino", 2], ["pimenton", 2], ["aceite-oliva", 10],
      ]),
      parte("arroz", "Arroz blanco", "hidratos", [["arroz", 70]], 3),
    ],
    pasos: [
      "Hidrata la soja 10 min en agua caliente y escúrrela. Pon el arroz a cocer.",
      "Sofríe cebolla, pimiento y ajo picados en el aceite 6 min.",
      "Añade la soja, el comino y el pimentón y remueve 2 min.",
      "Echa el tomate, las alubias escurridas y el maíz. 15 min a fuego suave.",
      "Chili y arroz, cada uno en su táper.",
    ],
    guardar: "Al segundo día está más rico." + ARROZ,
    dura: 4,
  },
  {
    id: "tofu-teriyaki",
    nombre: "Tofu teriyaki con arroz y brócoli",
    corto: "Tofu teriyaki",
    minutos: 35,
    componentes: [
      parte("tofu", "Tofu teriyaki con brócoli", "proteina", [
        ["tofu-firme", 200], ["maicena", 8], ["aceite-oliva", 12], ["salsa-soja", 20], ["miel", 12],
        ["ajo", 5], ["jengibre", 5], ["brocoli", 150], ["sesamo", 5],
      ]),
      parte("arroz", "Arroz blanco", "hidratos", [["arroz", 75]], 3),
    ],
    pasos: [
      "Pon el arroz a cocer. Seca el tofu con papel, córtalo en dados y rebózalo en la maicena.",
      "Dora el tofu en el aceite hasta que esté crujiente, o 15 min en la air fryer a 200 °C.",
      "Cuece el brócoli al vapor o 4–5 min en el micro: que quede verde y firme.",
      "Salsa: soja, miel, ajo y jengibre rallados y un chorrito de agua. Redúcela 2 min en la sartén y mézclala con el tofu y el brócoli.",
      "Sésamo por encima. Tofu y arroz, cada uno en su táper.",
    ],
    guardar: "El tofu pierde crujiente: 3 min de air fryer lo arreglan." + ARROZ,
    dura: 3,
  },
  {
    id: "dal-lentejas-rojas",
    nombre: "Dal de lentejas rojas con arroz",
    corto: "Dal",
    minutos: 35,
    componentes: [
      parte("dal", "Dal de lentejas rojas", "proteina", [
        ["lentejas-rojas", 85], ["cebolla", 50], ["ajo", 5], ["jengibre", 5], ["curry-polvo", 4], ["comino", 1],
        ["tomate-triturado", 100], ["leche-coco-ligera", 60], ["espinacas", 60], ["aceite-oliva", 8], ["skyr", 100],
      ]),
      parte("arroz", "Arroz basmati", "hidratos", [["arroz-basmati", 60]], 3),
    ],
    pasos: [
      "Pon el arroz a cocer. Sofríe cebolla, ajo y jengibre picados en el aceite 5 min.",
      "Añade curry y comino, 1 min, y luego el tomate.",
      "Echa las lentejas rojas lavadas y el doble de su volumen de agua. 20 min a fuego suave removiendo: se deshacen solas.",
      "Añade la leche de coco y las espinacas, 3 min más. Fuera del fuego, el skyr.",
      "Dal y arroz, cada uno en su táper.",
    ],
    guardar: "Espesa al enfriar: añade agua al recalentar." + ARROZ,
    dura: 4,
  },
  {
    id: "arroz-frito",
    nombre: "Arroz frito con huevo, tofu y guisantes",
    corto: "Arroz frito",
    minutos: 40,
    componentes: [
      parte("arroz-frito", "Arroz frito con huevo y tofu", "combinado", [
        ["arroz", 80], ["huevo", 110], ["tofu-firme", 100], ["guisantes", 70], ["zanahoria", 50], ["cebolla", 30],
        ["ajo", 5], ["salsa-soja", 20], ["aceite-oliva", 12], ["sesamo", 3],
      ]),
    ],
    pasos: [
      "Cuece el arroz y extiéndelo en una bandeja para que se enfríe y se seque.",
      "Dora el tofu en dados con la mitad del aceite y apártalo.",
      "Saltea cebolla, ajo y zanahoria picados 4 min. Añade los guisantes, 2 min.",
      "Haz un revuelto con los huevos a un lado. Junta todo con el arroz y la soja, 3 min a fuego fuerte.",
      "Sésamo por encima y al táper en cuanto se temple.",
    ],
    guardar: "Recalienta hasta que humee." + ARROZ,
    dura: 3,
  },
  {
    id: "seitan-cuscus",
    nombre: "Seitán con verduras asadas y cuscús",
    corto: "Seitán con cuscús",
    minutos: 40,
    componentes: [
      parte("seitan", "Seitán con verduras asadas", "proteina", [
        ["seitan", 150], ["calabacin", 120], ["pimiento-rojo", 80], ["cebolla", 50], ["ajo", 5],
        ["aceite-oliva", 14], ["pimenton", 2], ["comino", 1],
      ]),
      parte("cuscus", "Cuscús", "hidratos", [["cuscus", 80]], 3),
    ],
    pasos: [
      "Horno a 220 °C. Calabacín, pimiento y cebolla en trozos con la mitad del aceite, sal y pimentón: 25 min.",
      "Dora el seitán en tiras con el resto del aceite, el ajo y el comino, 5 min. Mézclalo con las verduras.",
      "Cuscús: el mismo peso de agua hirviendo con sal, tapa 5 min y suéltalo con un tenedor.",
      "Seitán y cuscús, cada uno en su táper.",
    ],
    guardar: "Recalienta el seitán en la sartén para que no se ablande.",
    dura: 4,
  },
];
