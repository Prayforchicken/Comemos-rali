/* Hoja para cambiar una comida concreta (se abre manteniendo pulsada la comida en Hoy):
   volver a lo que toca, otra receta, ajustar solo hoy, sobras, cheat meal u otra cosa. */
import { useState } from "react";
import { slotLabel } from "../comemos/engine";
import type { MealTemplate } from "../comemos/models";
import { recetasDelBatch, recetasPara, type ComidaDecidida, type Contexto, type Decision } from "../decisiones/decisiones";
import { ATAJOS_OTRA, BASE } from "../alimentos/base";
import { itemsDeRacion } from "../alimentos/nutricion";
import type { Alimento, Item } from "../alimentos/tipos";
import { CATEGORIAS, categoriaDe, ORDEN_CATEGORIAS } from "../menu/menu";
import { PUNTOS } from "../juego/reglas";
import { Buscador, ListaItems } from "./Buscador";
import { Boton, Campo, Hoja, Pildora } from "./base";

export type Modo = "inicio" | "diferente" | "ajuste" | "sobras" | "cheat" | "otra";

const TITULO: Record<Modo, string> = {
  inicio: "¿Qué comes?", diferente: "¿Qué otra receta?", ajuste: "Ajustar solo hoy", sobras: "¿Qué sobras hay?", cheat: "Cheat meal", otra: "¿Qué te apetece?",
};

export interface Despensa extends Contexto { alimentos: Record<string, Alimento>; alGuardarAlimento: (a: Alimento) => void }

export function ElegirDecision({ eleccion, fecha, despensa, mult, cerrar, alElegir, irAMenu }: {
  eleccion: { comida: ComidaDecidida; modo: Modo } | null; fecha: string; despensa: Despensa; mult: number;
  cerrar: () => void; alElegir: (d: Decision) => void; irAMenu: () => void;
}) {
  const [modo, setModo] = useState<Modo | null>(null);
  const actual = modo ?? eleccion?.modo ?? "inicio";
  const salir = () => { setModo(null); cerrar(); };
  const elegir = (d: Decision) => { setModo(null); alElegir(d); };
  return (
    <Hoja abierta={Boolean(eleccion)} cerrar={salir} titulo={eleccion ? `${slotLabel(eleccion.comida.slot)} · ${TITULO[actual]}` : ""}>
      {eleccion ? (
        <>
          {actual !== "inicio" && eleccion.modo === "inicio" ? <button type="button" className="enlace enlace--izq" onClick={() => setModo("inicio")}>‹ volver</button> : null}
          <Contenido key={`${eleccion.comida.slot}-${actual}`} c={eleccion.comida} modo={actual} fecha={fecha} d={despensa} mult={mult}
            irA={setModo} alElegir={elegir} irAMenu={() => { salir(); irAMenu(); }} />
        </>
      ) : null}
    </Hoja>
  );
}

function Contenido({ c, modo, fecha, d, mult, irA, alElegir, irAMenu }: {
  c: ComidaDecidida; modo: Modo; fecha: string; d: Despensa; mult: number; irA: (m: Modo) => void; alElegir: (x: Decision) => void; irAMenu: () => void;
}) {
  const actual = c.decision;
  const [texto, setTexto] = useState(actual.texto ?? "");
  const [items, setItems] = useState<Item[]>(actual.tipo === "otra" ? actual.items ?? [] : []);
  const [ajuste, setAjuste] = useState<Item[]>(() => actual.ajuste ?? (c.recetaPropia ? itemsDeRacion(c.recetaPropia, c.scale) : []));
  const [buscando, setBuscando] = useState(false);
  const mas = Math.round(PUNTOS.comida * mult), menos = Math.round(PUNTOS.comidaOtra * mult);
  const tocaBatch = categoriaDe(c.delPlan) === "batch";

  if (modo === "inicio") {
    const puedeAjustar = !c.libre && Boolean(c.recetaPropia);
    const Op = ({ m, titulo, sub, puntos }: { m: Modo; titulo: string; sub: string; puntos: string }) => (
      <button type="button" className="cambio-op" onClick={() => irA(m)}>
        <span><b>{titulo}</b><small className="nota">{sub}</small></span>
        <Pildora color={puntos.startsWith(`+${mas}`) ? "menta" : "papel"}>{puntos}</Pildora>
      </button>
    );
    return (
      <div className="cambios">
        {actual.tipo !== "plan" || c.ajustada ? (
          <button type="button" className="cambio-op cambio-op--toca" onClick={() => alElegir({ tipo: "plan" })}>
            <span><b>↩ Lo que toca</b><small className="nota">{c.delPlan.name}, tal cual</small></span>
            <Pildora color="menta">+{mas}</Pildora>
          </button>
        ) : null}
        <Op m="diferente" titulo="Cambiar por otra receta" sub={tocaBatch ? "Un batch por otro batch sigue contando como lo que toca" : "Congelador, otra receta del recetario…"} puntos={tocaBatch ? `+${mas} batch · +${menos}` : `+${menos}`} />
        {puedeAjustar ? (
          <Op m="ajuste" titulo="Ajustar solo hoy" sub={`Quita o cambia ingredientes de ${c.partes[0].template.shortName.toLowerCase()} sin tocar la receta`} puntos={actual.tipo === "plan" ? `+${mas}` : c.bonus ? `+${mas}` : `+${menos}`} />
        ) : !c.libre ? <p className="nota">Esta receta es del plan y no tiene ingredientes con gramos, así que no se puede ajustar. Créala en Menú → Recetas para poder hacerlo.</p> : null}
        <Op m="sobras" titulo="Sobras" sub="Si son del batch de estos días, cuentan como lo que toca" puntos={`+${mas} batch · +${menos}`} />
        <Op m="cheat" titulo="Cheat meal" sub="Pizza, burger… sin pesar ni contar al miligramo" puntos={`+${menos}`} />
        <Op m="otra" titulo="Otra cosa" sub="Apunta alimentos y gramos si quieres" puntos={`+${menos}`} />
      </div>
    );
  }

  if (modo === "ajuste") {
    const receta = c.recetaPropia;
    if (!receta) return <p className="cuerpo">Esta receta no tiene ingredientes con gramos.</p>;
    return (
      <>
        <p className="cuerpo">Solo para esta comida de hoy: <b>{receta.nombre}</b> no cambia. Quita lo que no vayas a comer (×) o cambia los gramos; todo se recalcula.</p>
        <ListaItems items={ajuste} cambiar={setAjuste} etiquetaTotal="Hoy comes" />
        {buscando ? (
          <Buscador guardados={d.alimentos} recetas={d.recetas} sinRecetas alGuardarAlimento={d.alGuardarAlimento}
            alAnadir={(i) => { setAjuste((l) => [...l, i]); setBuscando(false); }} />
        ) : <Boton variante="papel" onClick={() => setBuscando(true)}>+ Añadir algo</Boton>}
        <div className="hoja__acciones">
          <Boton variante="lavanda" className="ancho" disabled={!ajuste.some((i) => i.gramos > 0)} onClick={() => alElegir({ ...actual, ajuste: ajuste.filter((i) => i.gramos > 0) })}>Guardar ajuste de hoy</Boton>
          {actual.ajuste ? <button type="button" className="enlace" onClick={() => alElegir({ ...actual, ajuste: undefined })}>Quitar el ajuste (receta tal cual)</button> : null}
        </div>
      </>
    );
  }

  if (modo === "cheat") {
    return (
      <>
        <p className="cuerpo">Comida divertida: no hay que sobrepensar. Cuenta con unas calorías aproximadas y la siguiente comida vuelve al plan.</p>
        <div className="recetas-op">
          {d.cheats.map((g) => (
            <button key={g.id} type="button" className="receta-op" data-activa={actual.tipo === "cheat" && actual.cheatId === g.id} onClick={() => alElegir({ tipo: "cheat", cheatId: g.id })}>
              <span><b>{g.nombre}</b><small className="nota">~{g.kcal} kcal</small></span>
              <Pildora color="rosa">+{menos}</Pildora>
            </button>
          ))}
        </div>
        <button type="button" className="enlace" onClick={irAMenu}>Crear o editar grupos en Menú → Cheat</button>
      </>
    );
  }

  if (modo === "otra") {
    const anadir = (i: Item) => setItems((l) => [...l, i]);
    const atajos = ATAJOS_OTRA.map((id) => BASE.find((x) => x.id === id)!).filter(Boolean);
    return (
      <>
        <p className="cuerpo">Comer fuera, un capricho… Apunta qué y cuánto (aproximado vale) y se suma a tu día. La siguiente comida vuelve al plan, sin compensar nada.</p>
        <div className="opciones">
          {atajos.map((a) => (
            <button key={a.id} type="button" className="opcion" onClick={() => anadir({ alimentoId: a.id, nombre: a.nombre, gramos: a.porcion?.gramos ?? 100, n: a.n })}>
              + {a.nombre.replace(" con pan", "").replace(" (maki)", "")}
            </button>
          ))}
        </div>
        <ListaItems items={items} cambiar={setItems} />
        <Buscador guardados={d.alimentos} recetas={d.recetas} alAnadir={anadir} alGuardarAlimento={d.alGuardarAlimento} />
        <Campo etiqueta="Nombre para esta comida (opcional)"><input className="entrada" value={texto} maxLength={40} placeholder={items[0]?.nombre ?? "Ej.: cena con amigas"} onChange={(x) => setTexto(x.target.value)} /></Campo>
        <div className="hoja__acciones">
          <Boton variante="melocoton" className="ancho" onClick={() => alElegir({ tipo: "otra", texto: texto.trim() || undefined, items: items.filter((i) => i.gramos > 0) })}>
            {items.length ? "Decidido" : "Decidido, sin apuntar cantidades"}
          </Boton>
        </div>
      </>
    );
  }

  // Otra receta o sobras: recetas por tipo; primero lo que encaja en esta toma.
  const delBatch = recetasDelBatch(d, fecha);
  const recetas = recetasPara(d.plan, c.slot).filter((t) => modo === "sobras" || t.id !== c.delPlan.id);
  const pistas = (t: MealTemplate) => {
    const cat = categoriaDe(t);
    const bonus = modo === "sobras" ? delBatch.has(t.id) : cat === "batch" && tocaBatch;
    return (
      <>
        {modo === "sobras" && delBatch.has(t.id) ? <Pildora color="cielo">en la nevera</Pildora> : null}
        <Pildora color={bonus ? "menta" : "papel"}>+{bonus ? mas : menos}</Pildora>
      </>
    );
  };
  const orden = modo === "sobras" ? [...recetas].sort((a, b) => Number(delBatch.has(b.id)) - Number(delBatch.has(a.id))) : recetas;

  return (
    <>
      <p className="cuerpo">{modo === "sobras" ? "Elige de qué son y te calculo la ración para esta comida." : `En vez de ${c.delPlan.shortName}. La ración se calcula para esta comida; luego puedes ajustarla solo para hoy.`}</p>
      {(modo === "sobras" ? ["todas" as const] : ORDEN_CATEGORIAS).map((cat) => {
        const lista = cat === "todas" ? orden : orden.filter((t) => categoriaDe(t) === cat);
        if (!lista.length) return null;
        return (
          <div key={cat} className="pila pila--apretada">
            {cat !== "todas" ? <h3 className="etiqueta"><Pildora color={CATEGORIAS[cat].color}>{CATEGORIAS[cat].plural}</Pildora></h3> : null}
            <div className="recetas-op">
              {lista.map((t) => (
                <button key={t.id} type="button" className="receta-op" data-activa={actual.tipo === modo && actual.recetaId === t.id} onClick={() => alElegir({ tipo: modo as "diferente" | "sobras", recetaId: t.id })}>
                  <span><b>{t.shortName}</b><small className="nota">{t.name}{t.slots.includes(c.slot) ? "" : ` · normalmente para ${t.slots.map((s) => slotLabel(s).toLowerCase()).join(", ")}`}</small></span>
                  <span className="receta-op__pistas">{pistas(t)}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {modo === "sobras" ? (
        <>
          <Campo etiqueta="¿Son de otra cosa? Escríbelo"><input className="entrada" value={texto} maxLength={40} placeholder="Ej.: la paella del domingo" onChange={(x) => setTexto(x.target.value)} /></Campo>
          <Boton variante="cielo" disabled={!texto.trim()} onClick={() => alElegir({ tipo: "sobras", texto: texto.trim() })}>Usar estas sobras</Boton>
        </>
      ) : null}
    </>
  );
}
