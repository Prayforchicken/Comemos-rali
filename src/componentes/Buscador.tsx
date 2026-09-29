/* Buscador de alimentos: tus alimentos, la base local y wger (si hay internet).
   Al elegir uno se piden los gramos y se devuelve un Item con una copia de sus valores. */
import { useEffect, useMemo, useRef, useState } from "react";
import { BASE } from "../alimentos/base";
import { totales } from "../alimentos/nutricion";
import type { Alimento, Item } from "../alimentos/tipos";
import { buscarWger } from "../alimentos/wger";
import { Boton, Campo } from "./base";

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const nuevoId = () => `propio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const FUENTE: Record<Alimento["fuente"], string> = { wger: "wger", base: "", propio: "tuyo" };

export function Buscador({ guardados, alAnadir, alGuardarAlimento }: {
  guardados: Record<string, Alimento>;
  alAnadir: (i: Item) => void;
  /** Se llama con los alimentos de wger que se usan o los que se crean a mano, para tenerlos sin internet. */
  alGuardarAlimento: (a: Alimento) => void;
}) {
  const [q, setQ] = useState("");
  const [wger, setWger] = useState<{ estado: "quieto" | "buscando" | "ok" | "sin-red"; lista: Alimento[] }>({ estado: "quieto", lista: [] });
  const [elegido, setElegido] = useState<Alimento | null>(null);
  const [crear, setCrear] = useState(false);
  const cancelar = useRef<AbortController | null>(null);

  const locales = useMemo(() => {
    const propios = Object.values(guardados);
    const vistos = new Set(propios.map((a) => a.id));
    return [...propios, ...BASE.filter((a) => !vistos.has(a.id))];
  }, [guardados]);

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
      alAnadir({ alimentoId: elegido.id, nombre: elegido.nombre, gramos: g, n: elegido.n, unidad: elegido.unidad });
      setElegido(null); setQ("");
    }} />;
  }
  if (crear) {
    return <CrearAlimento nombreInicial={q} cancelar={() => setCrear(false)} alCrear={(a) => { alGuardarAlimento(a); setCrear(false); setElegido(a); }} />;
  }

  const Fila = ({ a }: { a: Alimento }) => (
    <button type="button" className="alimento-op" onClick={() => setElegido(a)}>
      <span><b>{a.nombre}</b><small>{a.n.kcal} kcal por 100 g</small></span>
      {FUENTE[a.fuente] ? <span className="nota">{FUENTE[a.fuente]}</span> : null}
    </button>
  );

  return (
    <div className="buscador">
      <input className="entrada" type="search" id="buscar-alimento" value={q} placeholder="Buscar: pizza, tofu, plátano…" onChange={(e) => setQ(e.target.value)} aria-label="Buscar alimento" />
      {!t && coincidencias.length ? <p className="nota">Usados hace poco</p> : null}
      <div className="alimentos-op">{coincidencias.map((a) => <Fila key={a.id} a={a} />)}</div>
      {t.length >= 3 ? (
        <>
          <p className="nota">
            {wger.estado === "buscando" ? "Buscando en wger…" : wger.estado === "sin-red" ? "wger no responde" : wger.lista.length ? "De wger" : wger.estado === "ok" ? "Nada en wger" : ""}
          </p>
          <div className="alimentos-op">{wger.lista.map((a) => <Fila key={a.id} a={a} />)}</div>
        </>
      ) : null}
      <button type="button" className="boton-texto" onClick={() => setCrear(true)}>Crear un alimento a mano</button>
    </div>
  );
}

function Gramos({ a, volver, alAnadir }: { a: Alimento; volver: () => void; alAnadir: (g: number) => void }) {
  const [g, setG] = useState(String(a.porcion?.gramos ?? 100));
  const n = Number(g.replace(",", ".")) || 0;
  const t = totales([{ alimentoId: a.id, nombre: a.nombre, gramos: n, n: a.n }]);
  return (
    <div className="buscador">
      <h3>{a.nombre}</h3>
      <div className="chips">
        {a.porcion ? <button type="button" className="chip" data-activo={n === a.porcion.gramos} onClick={() => setG(String(a.porcion!.gramos))}>{a.porcion.nombre}</button> : null}
        {[50, 100, 200].map((x) => <button key={x} type="button" className="chip" data-activo={n === x} onClick={() => setG(String(x))}>{x} g</button>)}
      </div>
      <Campo etiqueta="Gramos"><input className="entrada" id="gramos" type="number" inputMode="decimal" min={1} value={g} onChange={(e) => setG(e.target.value)} /></Campo>
      <p className="nota">{t.kcal} kcal y {Math.round(t.proteina)} g de proteína.</p>
      <div className="acciones">
        <Boton ancho disabled={n <= 0} onClick={() => alAnadir(Math.round(n))}>Añadir</Boton>
        <button type="button" className="boton-texto boton-texto--suave" onClick={volver}>Volver a buscar</button>
      </div>
    </div>
  );
}

function CrearAlimento({ nombreInicial, cancelar, alCrear }: { nombreInicial: string; cancelar: () => void; alCrear: (a: Alimento) => void }) {
  const [a, setA] = useState({ nombre: nombreInicial, kcal: "", proteina: "", carbos: "", grasa: "", fibra: "", gramos: "" });
  const v = (k: keyof typeof a) => (e: React.ChangeEvent<HTMLInputElement>) => setA({ ...a, [k]: e.target.value });
  const n = (x: string) => Math.max(0, Number(x.replace(",", ".")) || 0);
  const valido = a.nombre.trim() && n(a.kcal) > 0;
  return (
    <div className="buscador">
      <h3>Nuevo alimento</h3>
      <p className="nota">Valores por 100 g</p>
      <Campo etiqueta="Nombre"><input className="entrada" id="nuevo-nombre" value={a.nombre} onChange={v("nombre")} /></Campo>
      <div className="rejilla">
        <Campo etiqueta="kcal / 100 g"><input className="entrada" id="nuevo-kcal" inputMode="decimal" value={a.kcal} onChange={v("kcal")} /></Campo>
        <Campo etiqueta="Proteína (g)"><input className="entrada" id="nuevo-prot" inputMode="decimal" value={a.proteina} onChange={v("proteina")} /></Campo>
        <Campo etiqueta="Hidratos (g)"><input className="entrada" id="nuevo-hc" inputMode="decimal" value={a.carbos} onChange={v("carbos")} /></Campo>
        <Campo etiqueta="Grasa (g)"><input className="entrada" id="nuevo-grasa" inputMode="decimal" value={a.grasa} onChange={v("grasa")} /></Campo>
        <Campo etiqueta="Fibra (g)"><input className="entrada" id="nuevo-fibra" inputMode="decimal" value={a.fibra} onChange={v("fibra")} /></Campo>
        <Campo etiqueta="Ración típica (g)"><input className="entrada" id="nuevo-racion" inputMode="numeric" value={a.gramos} onChange={v("gramos")} placeholder="opcional" /></Campo>
      </div>
      <div className="acciones">
        <Boton ancho disabled={!valido} onClick={() => alCrear({
          id: nuevoId(), nombre: a.nombre.trim(), fuente: "propio",
          n: { kcal: n(a.kcal), proteina: n(a.proteina), carbos: n(a.carbos), grasa: n(a.grasa), fibra: n(a.fibra) },
          porcion: n(a.gramos) ? { nombre: "1 ración", gramos: n(a.gramos) } : undefined,
        })}>Guardar alimento</Boton>
        <button type="button" className="boton-texto boton-texto--suave" onClick={cancelar}>Cancelar</button>
      </div>
    </div>
  );
}

/** Lista de alimentos apuntados, con gramos editables y el total. */
export function ListaItems({ items, cambiar, divisor = 1, etiquetaTotal = "Total" }: { items: Item[]; cambiar: (i: Item[]) => void; divisor?: number; etiquetaTotal?: string }) {
  if (!items.length) return null;
  const t = totales(items);
  const d = Math.max(1, divisor);
  return (
    <div className="items">
      {items.map((i, k) => (
        <div key={`${i.alimentoId}-${k}`} className="item">
          <span className="item__nombre"><b>{i.nombre}</b><small>{Math.round((i.n.kcal * i.gramos) / 100)} kcal</small></span>
          <input className="entrada" type="number" inputMode="decimal" min={1} value={i.gramos} aria-label={`Gramos de ${i.nombre}`}
            onChange={(e) => cambiar(items.map((x, j) => (j === k ? { ...x, gramos: Math.max(0, Number(e.target.value) || 0) } : x)))} />
          <span className="nota">g</span>
          <button type="button" className="quitar" aria-label={`Quitar ${i.nombre}`} onClick={() => cambiar(items.filter((_, j) => j !== k))}>×</button>
        </div>
      ))}
      <div className="items__total">
        <b>{etiquetaTotal}</b>
        <span className="mono">{Math.round(t.kcal / d)} kcal, {Math.round(t.proteina / d)} g prot.</span>
      </div>
    </div>
  );
}
