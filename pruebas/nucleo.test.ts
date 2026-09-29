/* Pruebas de la lógica (sin pantalla). Ejecutar: npm test */
import assert from "node:assert/strict";
import { test } from "node:test";
import { alimentoBase } from "../src/alimentos/base";
import { datosIniciales, normalizar } from "../src/datos/almacen";
import { resumen } from "../src/nucleo/cuentas";
import { anadirExtra, gramosPorReceta, totalDelDia } from "../src/nucleo/dia";
import { anadirAMano, cocinar, enNevera, frescura, macrosDe, pesarQueda, por100, primeraTomaLibre, proyectar, quedan, sacar, tamanoDe } from "../src/nucleo/lotes";
import { calcular, objetivoToma, sugerencia } from "../src/nucleo/plato";
import { candidatas, enUnidades, lista, otraIdea, propuestaActual } from "../src/nucleo/propuesta";
import { planSemana } from "../src/nucleo/semana";
import { RECETAS } from "../src/recetas/recetas";

const hora = (iso: string) => new Date(`${iso}+02:00`); // hora de Madrid en verano
const curry = RECETAS.find((r) => r.id === "curry-garbanzos")!;
const bolonesa = RECETAS.find((r) => r.id === "bolonesa-soja")!;

test("la lista junta las partes, multiplica por raciones y da unidades de cocina", () => {
  const l = lista(curry, 4, 100);
  assert.equal(l.find((x) => x.alimentoId === "base-garbanzos-cocidos")!.gramos, 720);
  assert.equal(l.find((x) => x.alimentoId === "base-garbanzos-cocidos")!.aprox, "≈ 3 botes de 400 g");
  assert.equal(l.find((x) => x.alimentoId === "base-arroz-basmati")!.gramos, 260);
  assert.equal(enUnidades(110 * 4, alimentoBase("huevo").unidad), "8 huevos");
});

test("cocinar el curry crea dos tápers (P y H) con peso estimado y macros por 100 g", () => {
  const d = cocinar(datosIniciales(), curry, 4, hora("2026-09-29T19:30:00"));
  const [p, h] = d.lotes;
  assert.deepEqual([p.tipo, h.tipo], ["proteina", "hidratos"]);
  assert.equal(p.batchId, h.batchId);
  const arrozCrudo = 65 * 4 * (tamanoDe(datosIniciales(), curry) / 100);
  assert.equal(h.gramos, Math.round(arrozCrudo * 2.8)); // el arroz crudo casi triplica su peso
  assert.ok(por100(h).carbos > 25 && por100(h).carbos < 30);
  // Pesar corrige el peso y con él los macros por 100 g; el total no cambia.
  const pesado = pesarQueda(d, h.id, 700);
  const h2 = pesado.lotes[1];
  assert.equal(h2.gramos, 700);
  assert.ok(h2.pesado);
  assert.equal(Math.round(macrosDe(h2, 700).kcal), Math.round(h.total.kcal));
});

test("solo cuentan calorías los gramos que te comes, y se guardan por receta", () => {
  let d = cocinar(datosIniciales(), bolonesa, 4, hora("2026-09-29T13:00:00"));
  const id = d.lotes[0].id;
  d = sacar(d, id, "comida", 400, hora("2026-09-29T14:40:00")).datos;
  d = sacar(d, id, "rali", 300, hora("2026-09-29T14:45:00")).datos;
  d = sacar(d, id, "basura", 100, hora("2026-09-29T21:00:00")).datos;
  d = anadirExtra(d, { alimentoId: "base-plenny-pro", nombre: "Plenny", gramos: 99, n: alimentoBase("plenny-pro").n }, hora("2026-09-29T08:15:00"));
  const t = totalDelDia(d, "2026-09-29");
  assert.equal(Math.round(t.kcal), Math.round(macrosDe(d.lotes[0], 400).kcal + 400));
  assert.deepEqual(gramosPorReceta(d, "2026-09-29").map((x) => [x.nombre, x.gramos]), [["Plenny", 99], ["Boloñesa de soja con pasta", 400]]);
  assert.equal(quedan(d.lotes[0]), d.lotes[0].gramos - 800);
  const r = resumen(d, null);
  assert.deepEqual([r.comida, r.rali, r.basura, r.pctBasura], [400, 300, 100, 13]);
});

test("el plato: falta en rojo, sobra en blanco y una pista de gramos", () => {
  const d = cocinar(datosIniciales(), curry, 4, hora("2026-09-29T19:30:00"));
  const [p, h] = d.lotes;
  assert.deepEqual(sugerencia(d), [p.id, h.id]);
  const poco = calcular(d, [{ lote: p, gramos: 150 }, { lote: h, gramos: 100 }], "cena");
  const prot = poco.lineas.find((l) => l.clave === "proteina")!;
  assert.equal(prot.estado, "falta");
  assert.equal(prot.objetivo, objetivoToma(d, "cena").proteina);
  assert.match(prot.pista ?? "", /^\+\d+ g de curry de garbanzos$/);
  const mucho = calcular(d, [{ lote: p, gramos: 900 }, { lote: h, gramos: 600 }], "cena");
  assert.equal(mucho.lineas.find((l) => l.clave === "kcal")!.estado, "sobra");
});

test("un batch hecho por la tarde empieza en la cena de hoy", () => {
  const d = cocinar(datosIniciales(), curry, 4, hora("2026-09-29T19:30:00"));
  const tomas = proyectar(d, hora("2026-09-29T19:45:00")).map((p) => `${p.toma.fecha} ${p.toma.momento}`);
  // 4 raciones = 4 tomas: cada ración se ajusta a lo que toca en una comida o cena.
  assert.deepEqual(tomas, ["2026-09-29 cena", "2026-09-30 comida", "2026-09-30 cena", "2026-10-01 comida"]);
});

test("muy tarde, lo siguiente es la comida de mañana", () => {
  assert.deepEqual(primeraTomaLibre(datosIniciales(), hora("2026-09-29T23:30:00")), { fecha: "2026-09-30", momento: "comida" });
});

test("el plan de la semana dice cuándo volver a cocinar", () => {
  const d = cocinar(datosIniciales(), curry, 4, hora("2026-09-29T19:30:00"));
  const { huecos, cocinados } = planSemana(d, hora("2026-09-29T19:45:00"));
  const nevera = huecos.filter((h) => h.deLaNevera);
  assert.equal(cocinados[0].fecha, nevera[nevera.length - 1].toma.fecha);
  assert.notEqual(cocinados[0].recetaId, "curry-garbanzos");
  assert.ok(huecos[huecos.length - 1].toma.fecha <= "2026-10-05");
  // Con la nevera vacía se cocina hoy.
  assert.equal(planSemana(datosIniciales(), hora("2026-09-29T10:00:00")).cocinados[0].fecha, "2026-09-29");
});

test("sobras a mano y propuesta que no repite lo que hay en la nevera", () => {
  let d = anadirAMano(datosIniciales(), { nombre: "Paella", tipo: "combinado", gramos: 500, hecho: "2026-09-28", n: { kcal: 150, proteina: 5, carbos: 20, grasa: 5, fibra: 1 } }, hora("2026-09-29T10:00:00"));
  assert.equal(Math.round(macrosDe(d.lotes[0], 100).kcal), 150);
  d = cocinar(d, RECETAS[0], 4, hora("2026-09-29T19:00:00"));
  assert.equal(enNevera(d)[0].nombre, "Paella");
  assert.ok(!candidatas(d).some((r) => r.id === RECETAS[0].id));
  assert.notEqual(propuestaActual(otraIdea(d))?.id, propuestaActual(d)?.id);
});

test("frescura: 3 días avisa, 5 días a la basura", () => {
  assert.equal(frescura({ hecho: "2026-09-29" }, "2026-10-01").estado, "bien");
  assert.equal(frescura({ hecho: "2026-09-29" }, "2026-10-02").estado, "ya");
  assert.equal(frescura({ hecho: "2026-09-29" }, "2026-10-04").estado, "tirar");
});

test("las copias con raciones (versión 1) se pasan a gramos", () => {
  const v1 = { lotes: [{ id: "l1", recetaId: "x", nombre: "Curry", porRacion: { gramos: 600, kcal: 800, proteina: 40, carbos: 100, grasa: 20, fibra: 10 }, raciones: 4, hecho: "2026-09-29", creado: "2026-09-29T10:00:00Z", ingredientes: [], guardar: "", salidas: [{ id: "s1", destino: "comida", cuando: "2026-09-29T14:00:00Z", fecha: "2026-09-29", momento: "comida" }] }] };
  const d = normalizar(v1);
  assert.equal(d.lotes[0].gramos, 2400);
  assert.equal(d.lotes[0].salidas[0].gramos, 600);
  assert.equal(quedan(d.lotes[0]), 1800);
});
