/* Buscador de alimentos: tus alimentos y recetas, la base local y wger (si hay internet).
   Al elegir uno se piden los gramos y se devuelve un Item con una copia de sus valores. */
import { useEffect, useMemo, useRef, useState } from "react";
import { BASE } from "../alimentos/base";
import { dividir, totales } from "../alimentos/nutricion";
import type { Alimento, Item, RecetaPropia } from "../alimentos/tipos";
import { buscarWger } from "../alimentos/wger";
import { Boton, Campo, Pildora } from "./base";

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const nuevoId = () => `propio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const FUENTE: Record<Alimento["fuente"], { t: string; c: string }> = { wger: { t: "wger", c: "cielo" }, base: { t: "base", c: "papel" }, propio: { t: "tuyo", c: "rosa" } };

/** Una receta propia se ofrece como alimento: sus valores por 100 g y una ración como porción. */
export function recetaComoAlimento(r: RecetaPropia): Alimento {
  const t = totales(r.items);
  const f = t.gramos ? 100 / t.gramos : 0;
  const racion = dividir(t, r.raciones);
  return {
    id: r.id, nombre: r.nombre, fuente: "propio",
    n: { kcal: Math.round(t.kcal * f), proteina: t.proteina * f, carbos: t.carbos * f, grasa: t.grasa * f, fibra: t.fibra * f },
    porcion: { nombre: "1 ración", gramos: racion.gramos },
  };
}

export function Buscador({ guardados, recetas, alAnadir, alGuardarAlimento, sinRecetas }: {
  guardados: Record<string, Alimento>;
  recetas: Record<string, RecetaPropia>;
  alAnadir: (i: Item) => void;
  /** Se llama con los alimentos de wger que se usan o los que se crean a mano, para tenerlos sin internet. */
  alGuardarAlimento: (a: Alimento) => void;
  sinRecetas?: boolean;
}) {
  const [q, setQ] = useState("");
  const [wger, setWger] = useState<{ estado: "quieto" | "buscando" | "ok" | "sin-red"; lista: Alimento[] }>({ estado: "quieto", lista: [] });
  const [elegido, setElegido] = useState<Alimento | null>(null);
  const [crear, setCrear] = useState(false);
  const cancelar = useRef<AbortController | null>(null);

  const locales = useMemo(() => {
    const propios = [...Object.values(guardados), ...(sinRecetas ? [] : Object.values(recetas).map(recetaComoAlimento))];
    const vistos = new Set(propios.map((a) => a.id));
    return [...propios, ...BASE.filter((a) => !vistos.has(a.id))];
  }, [guardados, recetas, sinRecetas]);

  const t = normal(q);
  const coincidencias = t ? locales.filter((a) => normal(a.nombre).includes(t)).slice(0, 12) : Object.values(guardados).slice(0, 8);

  useEffect(() => {
    cancelar.current?.abort();
    if (t.length < 3) { setWger({ estado: "quieto", lista: [] }); return; }
    const c = new AbortController();
    cancelar.current = c;
    setWger((w) => ({ ...w, estado: "buscando" }));
    const espera = window.setTimeout(() => {
      buscarWger(q, c.signal)
        .then((lista) => setWger({ estado: "ok", lista: lista.filter((a) => !guardados[a.id]).slice(0, 12) }))
        .catch((e) => { if ((e as Error).name !== "AbortError") setWger({ estado: "sin-red", lista: [] }); });
    }, 450);
    return () => { window.clearTimeout(espera); c.abort(); };
  }, [t, q, guardados]);

  if (elegido) {
    return <Gramos a={elegido} volver={() => setElegido(null)} alAnadir={(g) => {
      if (elegido.fuente === "wger" && !guardados[elegido.id]) alGuardarAlimento(elegido);
      alAnadir({ alimentoId: elegido.id, nombre: elegido.nombre, gramos: g, n: elegido.n });
      setElegido(null); setQ("");
    }} />;
  }
  if (crear) {
    return <CrearAlimento nombreInicial={q} cancelar={() => setCrear(false)} alCrear={(a) => { alGuardarAlimento(a); setCrear(false); setElegido(a); }} />;
  }

  const Fila = ({ a }: { a: Alimento }) => (
    <button type="button" className="alimento-op" onClick={() => setElegido(a)}>
      <span><b>{a.nombre}</b><small className="nota">{a.n.kcal} kcal · {Math.round(a.n.proteina)} g prot. por 100 g{a.porcion ? ` · ${a.porcion.nombre}` : ""}</small></span>
      <Pildora color={FUENTE[a.fuente].c}>{FUENTE[a.fuente].t}</Pildora>
    </button>
  );

  return (
    <div className="buscador">
      <input className="entrada" type="search" value={q} placeholder="Buscar alimento: pizza, tofu, plátano…" onChange={(e) => setQ(e.target.value)} aria-label="Buscar alimento" />
      {!t && coincidencias.length ? <p className="nota">Usados hace poco</p> : null}
      <div className="alimentos-op">{coincidencias.map((a) => <Fila key={a.id} a={a} />)}</div>
      {t.length >= 3 ? (
        <>
          <p className="nota buscador__wger">
            {wger.estado === "buscando" ? "Buscando en wger…" : wger.estado === "sin-red" ? "wger no responde (sin internet o dentro de claude.ai). Tienes la base local y tus alimentos." : wger.lista.length ? "De wger:" : wger.estado === "ok" ? "wger no tiene nada con ese nombre." : ""}
          </p>
          <div className="alimentos-op">{wger.lista.map((a) => <Fila key={a.id} a={a} />)}</div>
        </>
      ) : null}
      <button type="button" className="enlace" onClick={() => setCrear(true)}>¿No está? Crear alimento a mano</button>
    </div>
  );
}

function Gramos({ a, volver, alAnadir }: { a: Alimento; volver: () => void; alAnadir: (g: number) => void }) {
  const [g, setG] = useState(String(a.porcion?.gramos ?? 100));
  const n = Number(g.replace(",", ".")) || 0;
  const f = n / 100;
  return (
    <div className="gramos">
      <p className="subtitulo">{a.nombre}</p>
      <div className="opciones">
        {a.porcion ? <button type="button" className="opcion" data-activa={n === a.porcion.gramos} onClick={() => setG(String(a.porcion!.gramos))}>{a.porcion.nombre} · {a.porcion.gramos} g</button> : null}
        {[50, 100, 150, 200].map((x) => <button key={x} type="button" className="opcion" data-activa={n === x} onClick={() => setG(String(x))}>{x} g</button>)}
      </div>
      <Campo etiqueta="Gramos"><input className="entrada" type="number" inputMode="decimal" min={1} value={g} onChange={(e) => setG(e.target.value)} /></Campo>
      <dl className="macros macros--5">
        <div><dt>kcal</dt><dd>{Math.round(a.n.kcal * f)}</dd></div>
        <div><dt>Prot.</dt><dd>{Math.round(a.n.proteina * f)}</dd></div>
        <div><dt>Carbos</dt><dd>{Math.round(a.n.carbos * f)}</dd></div>
        <div><dt>Grasa</dt><dd>{Math.round(a.n.grasa * f)}</dd></div>
        <div><dt>Fibra</dt><dd>{Math.round(a.n.fibra * f)}</dd></div>
      </dl>
      <div className="fila fila--envuelve">
        <Boton disabled={n <= 0} onClick={() => alAnadir(Math.round(n))}>Añadir</Boton>
        <button type="button" className="enlace" onClick={volver}>volver a buscar</button>
      </div>
    </div>
  );
}

function CrearAlimento({ nombreInicial, cancelar, alCrear }: { nombreInicial: string; cancelar: () => void; alCrear: (a: Alimento) => void }) {
  const [a, setA] = useState({ nombre: nombreInicial, kcal: "", proteina: "", carbos: "", grasa: "", fibra: "", porcion: "", gramos: "" });
  const v = (k: keyof typeof a) => (e: React.ChangeEvent<HTMLInputElement>) => setA({ ...a, [k]: e.target.value });
  const n = (x: string) => Math.max(0, Number(x.replace(",", ".")) || 0);
  const valido = a.nombre.trim() && n(a.kcal) > 0;
  return (
    <div className="gramos">
      <p className="subtitulo">Nuevo alimento</p>
      <p className="nota">Copia los valores “por 100 g” de la etiqueta.</p>
      <Campo etiqueta="Nombre"><input className="entrada" value={a.nombre} onChange={v("nombre")} /></Campo>
      <div className="rejilla">
        <Campo etiqueta="kcal / 100 g"><input className="entrada" inputMode="decimal" value={a.kcal} onChange={v("kcal")} /></Campo>
        <Campo etiqueta="Proteína (g)"><input className="entrada" inputMode="decimal" value={a.proteina} onChange={v("proteina")} /></Campo>
        <Campo etiqueta="Carbohidratos (g)"><input className="entrada" inputMode="decimal" value={a.carbos} onChange={v("carbos")} /></Campo>
        <Campo etiqueta="Grasa (g)"><input className="entrada" inputMode="decimal" value={a.grasa} onChange={v("grasa")} /></Campo>
        <Campo etiqueta="Fibra (g)"><input className="entrada" inputMode="decimal" value={a.fibra} onChange={v("fibra")} /></Campo>
        <Campo etiqueta="Ración típica (g)"><input className="entrada" inputMode="numeric" value={a.gramos} onChange={v("gramos")} placeholder="opcional" /></Campo>
      </div>
      <div className="fila fila--envuelve">
        <Boton disabled={!valido} onClick={() => alCrear({
          id: nuevoId(), nombre: a.nombre.trim(), fuente: "propio",
          n: { kcal: n(a.kcal), proteina: n(a.proteina), carbos: n(a.carbos), grasa: n(a.grasa), fibra: n(a.fibra) },
          porcion: n(a.gramos) ? { nombre: "1 ración", gramos: n(a.gramos) } : undefined,
        })}>Guardar alimento</Boton>
        <button type="button" className="enlace" onClick={cancelar}>cancelar</button>
      </div>
    </div>
  );
}

/** Lista de alimentos apuntados, con gramos editables y el total. */
export function ListaItems({ items, cambiar, divisor = 1, etiquetaTotal = "Total" }: { items: Item[]; cambiar: (i: Item[]) => void; divisor?: number; etiquetaTotal?: string }) {
  if (!items.length) return null;
  const t = dividir(totales(items), divisor);
  return (
    <div className="items">
      {items.map((i, k) => (
        <div key={`${i.alimentoId}-${k}`} className="item">
          <span className="item__nombre"><b>{i.nombre}</b><small className="nota">{Math.round((i.n.kcal * i.gramos) / 100)} kcal</small></span>
          <input className="entrada item__g" type="number" inputMode="decimal" min={1} value={i.gramos} aria-label={`Gramos de ${i.nombre}`}
            onChange={(e) => cambiar(items.map((x, j) => (j === k ? { ...x, gramos: Math.max(0, Number(e.target.value) || 0) } : x)))} />
          <span className="nota">g</span>
          <button type="button" className="item__quitar" aria-label={`Quitar ${i.nombre}`} onClick={() => cambiar(items.filter((_, j) => j !== k))}>×</button>
        </div>
      ))}
      <div className="items__total">
        <span className="etiqueta">{etiquetaTotal}</span>
        <span><b>{t.kcal}</b> kcal · {Math.round(t.proteina)} P · {Math.round(t.carbos)} C · {Math.round(t.grasa)} G · {Math.round(t.fibra)} fibra</span>
      </div>
    </div>
  );
}
