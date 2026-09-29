/* ============================================================
   Recetas de batch que trae la app.
   - Cantidades POR RACIÓN (una ración ≈ 750–850 kcal, pensada para comida o cena de Adrián).
   - Todas aguantan bien 2–3 días en la nevera.
   - Las kcal y macros NO se escriben a mano: salen de sumar los ingredientes (alimentos/base.ts).
   Para añadir una: copia un bloque, cambia id, nombre e ingredientes. Los ids de ingrediente
   son los de alimentos/base.ts sin el prefijo "base-".
   ============================================================ */
import { alimentoBase } from "../alimentos/base";
import type { Item } from "../alimentos/tipos";
import type { Receta } from "../nucleo/tipos";

const ARROZ = " Extiende el arroz para que se enfríe rápido y guárdalo en menos de 1 hora.";

function ing(lista: [id: string, gramos: number][]): Item[] {
  return lista.map(([id, gramos]) => {
    const a = alimentoBase(id);
    return { alimentoId: a.id, nombre: a.nombre, gramos, n: a.n, unidad: a.unidad };
  });
}

export const RECETAS: Receta[] = [
  {
    id: "curry-garbanzos",
    nombre: "Curry de garbanzos y espinacas",
    corto: "Curry de garbanzos",
    minutos: 35,
    ingredientes: ing([
      ["garbanzos-cocidos", 180], ["cebolla", 60], ["ajo", 5], ["jengibre", 5], ["curry-polvo", 6],
      ["tomate-triturado", 120], ["leche-coco-ligera", 80], ["espinacas", 80], ["aceite-oliva", 10],
      ["arroz-basmati", 65], ["skyr", 100],
    ]),
    pasos: [
      "Pon el arroz a cocer, unos 12 min. Mientras, pica la cebolla, el ajo y el jengibre.",
      "Sofríe la cebolla en el aceite 5 min a fuego medio. Añade ajo, jengibre y curry y remueve 1 min.",
      "Echa el tomate y la leche de coco y deja 10 min a fuego suave.",
      "Añade los garbanzos escurridos, 5 min más, y al final las espinacas hasta que se ablanden.",
      "Reparte curry y arroz en los tápers. El skyr va aparte, frío, al servir.",
    ],
    guardar: "3 días en la nevera. Recalienta hasta que humee y pon el skyr frío por encima." + ARROZ,
  },
  {
    id: "bolonesa-soja",
    nombre: "Boloñesa de soja con pasta",
    corto: "Boloñesa de soja",
    minutos: 40,
    ingredientes: ing([
      ["soja-texturizada", 45], ["cebolla", 50], ["zanahoria", 50], ["champinon", 60], ["ajo", 5],
      ["tomate-triturado", 180], ["aceite-oliva", 10], ["oregano", 1], ["pasta", 90], ["queso-rallado", 15],
    ]),
    pasos: [
      "Hidrata la soja 10 min en agua caliente y escúrrela apretando bien.",
      "Pica cebolla, zanahoria, champiñón y ajo y sofríelo todo en el aceite 8 min.",
      "Añade la soja, dórala 3 min, echa el tomate y el orégano y deja 15 min a fuego suave.",
      "Cuece la pasta 1 min menos de lo que diga el paquete y mézclala con la salsa.",
      "Reparte en tápers. El queso rallado, al servir.",
    ],
    guardar: "3 días en la nevera. Si se seca, un chorrito de agua al recalentar.",
  },
  {
    id: "lentejas-estofadas",
    nombre: "Lentejas estofadas con verduras y huevo",
    corto: "Lentejas",
    minutos: 55,
    ingredientes: ing([
      ["lentejas-pardinas", 90], ["patata", 120], ["zanahoria", 60], ["cebolla", 50], ["pimiento-rojo", 40],
      ["ajo", 5], ["tomate-triturado", 60], ["pimenton", 2], ["comino", 1], ["aceite-oliva", 12],
      ["huevo", 55], ["pan-blanco", 50],
    ]),
    pasos: [
      "Pica cebolla, pimiento, ajo y zanahoria y sofríelo en el aceite 8 min en una olla.",
      "Fuera del fuego añade pimentón y comino para que no se quemen, y después el tomate.",
      "Echa las lentejas lavadas, la patata en trozos y agua que las cubra dos dedos.",
      "Cuece 35–40 min a fuego suave hasta que estén tiernas. Mientras, cuece los huevos 10 min.",
      "Reparte en tápers con un huevo pelado por ración. El pan, al comer.",
    ],
    guardar: "3 días en la nevera. Si espesan, añade un chorrito de agua al recalentar.",
  },
  {
    id: "chili-sin-carne",
    nombre: "Chili sin carne con arroz",
    corto: "Chili sin carne",
    minutos: 35,
    ingredientes: ing([
      ["alubias-rojas-cocidas", 150], ["soja-texturizada", 35], ["cebolla", 50], ["pimiento-rojo", 60], ["ajo", 5],
      ["tomate-triturado", 150], ["maiz", 50], ["comino", 2], ["pimenton", 2], ["aceite-oliva", 10], ["arroz", 70],
    ]),
    pasos: [
      "Hidrata la soja 10 min en agua caliente y escúrrela. Pon el arroz a cocer.",
      "Sofríe cebolla, pimiento y ajo picados en el aceite 6 min.",
      "Añade la soja, el comino y el pimentón y remueve 2 min.",
      "Echa el tomate, las alubias escurridas y el maíz. 15 min a fuego suave.",
      "Reparte chili y arroz en los tápers.",
    ],
    guardar: "3 días en la nevera; al segundo día está más rico." + ARROZ,
  },
  {
    id: "tofu-teriyaki",
    nombre: "Tofu teriyaki con arroz y brócoli",
    corto: "Tofu teriyaki",
    minutos: 35,
    ingredientes: ing([
      ["tofu-firme", 200], ["maicena", 8], ["aceite-oliva", 12], ["salsa-soja", 20], ["miel", 12],
      ["ajo", 5], ["jengibre", 5], ["brocoli", 150], ["arroz", 75], ["sesamo", 5],
    ]),
    pasos: [
      "Pon el arroz a cocer. Seca el tofu con papel, córtalo en dados y rebózalo en la maicena.",
      "Dora el tofu en el aceite hasta que esté crujiente, o 15 min en la air fryer a 200 °C.",
      "Cuece el brócoli al vapor o 4–5 min en el micro: que quede verde y firme.",
      "Salsa: soja, miel, ajo y jengibre rallados y un chorrito de agua. Redúcela 2 min en la sartén y mézclala con el tofu.",
      "Reparte arroz, brócoli y tofu. Sésamo por encima.",
    ],
    guardar: "2–3 días en la nevera. El tofu pierde crujiente: 3 min de air fryer lo arreglan." + ARROZ,
  },
  {
    id: "dal-lentejas-rojas",
    nombre: "Dal de lentejas rojas con arroz",
    corto: "Dal",
    minutos: 35,
    ingredientes: ing([
      ["lentejas-rojas", 85], ["cebolla", 50], ["ajo", 5], ["jengibre", 5], ["curry-polvo", 4], ["comino", 1],
      ["tomate-triturado", 100], ["leche-coco-ligera", 60], ["espinacas", 60], ["aceite-oliva", 8],
      ["arroz-basmati", 60], ["skyr", 100],
    ]),
    pasos: [
      "Pon el arroz a cocer. Sofríe cebolla, ajo y jengibre picados en el aceite 5 min.",
      "Añade curry y comino, 1 min, y luego el tomate.",
      "Echa las lentejas rojas lavadas y el doble de su volumen de agua. 20 min a fuego suave removiendo: se deshacen solas.",
      "Añade la leche de coco y las espinacas, 3 min más.",
      "Reparte dal y arroz. El skyr, frío, al servir.",
    ],
    guardar: "3 días en la nevera. Espesa al enfriar: añade agua al recalentar." + ARROZ,
  },
  {
    id: "arroz-frito",
    nombre: "Arroz frito con huevo, tofu y guisantes",
    corto: "Arroz frito",
    minutos: 40,
    ingredientes: ing([
      ["arroz", 80], ["huevo", 110], ["tofu-firme", 100], ["guisantes", 70], ["zanahoria", 50], ["cebolla", 30],
      ["ajo", 5], ["salsa-soja", 20], ["aceite-oliva", 12], ["sesamo", 3],
    ]),
    pasos: [
      "Cuece el arroz y extiéndelo en una bandeja para que se enfríe y se seque.",
      "Dora el tofu en dados con la mitad del aceite y apártalo.",
      "Saltea cebolla, ajo y zanahoria picados 4 min. Añade los guisantes, 2 min.",
      "Haz un revuelto con los huevos a un lado. Junta todo con el arroz y la soja, 3 min a fuego fuerte.",
      "Sésamo por encima y a los tápers en cuanto se temple.",
    ],
    guardar: "2 días en la nevera. Recalienta hasta que humee." + ARROZ,
  },
  {
    id: "seitan-cuscus",
    nombre: "Seitán con verduras asadas y cuscús",
    corto: "Seitán con cuscús",
    minutos: 40,
    ingredientes: ing([
      ["seitan", 150], ["calabacin", 120], ["pimiento-rojo", 80], ["cebolla", 50], ["ajo", 5],
      ["aceite-oliva", 14], ["pimenton", 2], ["comino", 1], ["cuscus", 80], ["skyr", 60],
    ]),
    pasos: [
      "Horno a 220 °C. Calabacín, pimiento y cebolla en trozos con la mitad del aceite, sal y pimentón: 25 min.",
      "Dora el seitán en tiras con el resto del aceite y el comino, 5 min.",
      "Cuscús: el mismo peso de agua hirviendo con sal, tapa 5 min y suéltalo con un tenedor.",
      "Salsa rápida: skyr con el ajo rallado y sal.",
      "Reparte cuscús, verduras y seitán. La salsa va aparte.",
    ],
    guardar: "3 días en la nevera. La salsa de yogur, siempre fría y aparte.",
  },
];
