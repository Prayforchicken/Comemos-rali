/* ============================================================
   Hoy. De arriba abajo:
   1. La fecha y las kcal del día.
   2. Tu plato: eliges tápers, escribes los gramos de la báscula y ves los macros
      frente a lo que toca en esta toma (en rojo lo que falta). Es la única tarjeta.
   3. La nevera: cada táper con su tipo (P, H o P.C.), lo que queda y sus macros por 100 g.
   4. Qué cocinar después y cuándo; se abre solo cuando la nevera está vacía.
   5. Lo comido hoy, con los añadidos rápidos.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import type { PantallaProps } from "../App";
import { alimentoBase, ATAJOS_OTRA, BASE } from "../alimentos/base";
import type { Item, Por100 } from "../alimentos/tipos";
import { esNativo, pedirPermiso, tienePermiso } from "../avisos/notificaciones";
import { Boton, Campo, Hoja, Medidor, Paso, useAvisar } from "../componentes/base";
import { Buscador, ListaItems } from "../componentes/Buscador";
import { IcoCheck, IcoCopiar } from "../componentes/Iconos";
import { LoteDetalle, TipoMarca } from "../componentes/LoteDetalle";
import { compartirTexto } from "../datos/respaldo";
import { anadirExtra, apuntesDelDia, quitarExtra, totalDelDia } from "../nucleo/dia";
import { cuentaAtras, diasEntre, fechaCorta, fechaDe, fechaLarga, horaDe, MOMENTO, pesoTexto, sumarDias } from "../nucleo/fechas";
import { anadirAMano, borrarLote, cocinar, deshacer, enNevera, frescura, momentoAhora, por100, quedan, sacar, tamanoDe, tomasDeNuevoBatch, type Toma } from "../nucleo/lotes";
import { calcular, sugerencia } from "../nucleo/plato";
import { candidatas, lista, loQueTengo, marcar, propuestaActual, proponer, textoCompra } from "../nucleo/propuesta";
import { duraDe, formaDe, racionDe, TIPO } from "../nucleo/receta";
import { planSemana } from "../nucleo/semana";
import type { Lote, Momento, Tipo } from "../nucleo/tipos";

/* ---------------- ayudas de texto ---------------- */

export function diaNombre(f: string, hoy: string) {
  const d = diasEntre(hoy, f);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  return fechaLarga(f).split(" ")[0];
}

/** "Hoy cena, mañana comida y cena, jueves comida." */
export function textoTomas(tomas: Toma[], hoy: string) {
  const grupos = new Map<string, string[]>();
  for (const t of tomas) grupos.set(t.fecha, [...(grupos.get(t.fecha) ?? []), MOMENTO[t.momento].toLowerCase()]);
  const frase = [...grupos].map(([f, m]) => `${diaNombre(f, hoy)} ${m.join(" y ")}`).join(", ");
  return frase ? `${frase[0].toUpperCase()}${frase.slice(1)}.` : "";
}

/** "100 g: 110 kcal, 6 P, 13 HC, 4 G" */
export const textoPor100 = (n: Por100) => `100 g: ${Math.round(n.kcal)} kcal, ${Math.round(n.proteina)} P, ${Math.round(n.carbos)} HC, ${Math.round(n.grasa)} G`;

/* ---------------- pantalla ---------------- */

export function Hoy(props: PantallaProps) {
  const { datos, cambiar, ahora, hoy } = props;
  const [detalle, setDetalle] = useState<Lote | null>(null);
  const [permiso, setPermiso] = useState(true);
  const nevera = enNevera(datos);
  const total = totalDelDia(datos, hoy);
  const objetivo = datos.ajustes.objetivo.kcal;
  const { cocinados } = useMemo(() => planSemana(datos, ahora), [datos, ahora]);
  const proxima = cocinados[0];

  useEffect(() => { if (esNativo() && datos.ajustes.avisos) void tienePermiso().then(setPermiso); }, [datos.ajustes.avisos]);

  return (
    <div className="hoy">
      <header className="cabecera">
        <span className="fecha">{fechaLarga(hoy)}</span>
        <a className="cabecera__kcal" href="#comido">
          <span><b>{Math.round(total.kcal)}</b> de {objetivo} kcal</span>
          <Medidor valor={total.kcal} max={objetivo} />
        </a>
      </header>

      {esNativo() && datos.ajustes.avisos && !permiso ? (
        <p className="fila fila--entre nota">
          Avisos apagados
          <button type="button" className="boton-texto" onClick={() => void pedirPermiso().then(setPermiso)}>Activar</button>
        </p>
      ) : null}

      {nevera.length ? <Plato key={nevera.map((l) => l.id).join()} {...props} /> : null}

      {nevera.length ? (
        <section className="bloque" aria-label="Nevera">
          <h2 className="bloque__titulo bloque__titulo--peque">En la nevera</h2>
          <div className="lista-plana">
            {nevera.map((l) => <FilaTaper key={l.id} l={l} hoy={hoy} abrir={() => setDetalle(l)} />)}
          </div>
        </section>
      ) : null}

      <Batch key={nevera.length ? "siguiente" : "toca"} {...props} abiertoAlEmpezar={!nevera.length} cuando={proxima && nevera.length ? diaNombre(proxima.fecha, hoy) : null} />

      <Comido {...props} />

      <LoteDetalle lote={detalle} datos={datos} cambiar={cambiar} cerrar={() => setDetalle(null)} ahora={ahora} />
    </div>
  );
}

/* ---------------- tu plato ---------------- */

interface Otro { id: string; item: Item }

function Plato({ datos, cambiar, ahora }: PantallaProps) {
  const avisar = useAvisar();
  const nevera = enNevera(datos);
  const [momento, setMomento] = useState<Momento>(() => momentoAhora(datos, ahora));
  const [elegidos, setElegidos] = useState<string[]>(() => sugerencia(datos, fechaDe(ahora)));
  const [otros, setOtros] = useState<Otro[]>([]);
  const [gramos, setGramos] = useState<Record<string, string>>({});
  const [buscando, setBuscando] = useState(false);
  const num = (id: string) => Math.max(0, Number((gramos[id] ?? "").replace(",", ".")) || 0);
  const plato = elegidos.map((id) => nevera.find((l) => l.id === id)).filter((l): l is Lote => Boolean(l))
    .map((lote) => ({ lote, gramos: num(lote.id) }));
  const fuera = otros.map((o) => ({ ...o.item, gramos: num(o.id) }));
  const { lineas } = calcular(datos, plato, momento, fuera);
  const hayGramos = plato.some((x) => x.gramos > 0) || fuera.some((i) => i.gramos > 0);

  const alternar = (id: string) => setElegidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  const anadirOtro = (item: Item) => {
    const id = `otro-${Date.now().toString(36)}`;
    setOtros((l) => [...l, { id, item }]);
    setGramos((g) => ({ ...g, [id]: String(item.gramos || 100) }));
    setBuscando(false);
  };
  const campo = (id: string, nombre: string) => (
    <span className="pesada__g">
      <input className="entrada entrada--g" id={`g-${id}`} type="text" inputMode="numeric" placeholder="0" value={gramos[id] ?? ""}
        onChange={(e) => setGramos((g) => ({ ...g, [id]: e.target.value.replace(/[^\d.,]/g, "") }))} />
      <span>g</span>
      <button type="button" className="quitar" aria-label={`Quitar ${nombre} del plato`}
        onClick={(e) => { e.preventDefault(); if (id.startsWith("otro-")) setOtros((l) => l.filter((o) => o.id !== id)); else alternar(id); }}>×</button>
    </span>
  );

  const apuntar = () => {
    let d = datos;
    const hechas: { loteId: string; salidaId: string }[] = [];
    for (const x of plato.filter((p) => p.gramos > 0)) {
      const r = sacar(d, x.lote.id, "comida", x.gramos, ahora, momento);
      d = r.datos;
      if (r.salida) hechas.push({ loteId: x.lote.id, salidaId: r.salida.id });
    }
    const antes = new Set((d.extras[fechaDe(ahora)] ?? []).map((e) => e.id));
    for (const i of fuera.filter((x) => x.gramos > 0)) d = anadirExtra(d, i, ahora, momento);
    const extras = (d.extras[fechaDe(ahora)] ?? []).filter((e) => !antes.has(e.id)).map((e) => e.id);
    cambiar(() => d);
    setGramos({});
    setOtros([]);
    const kcal = lineas.find((l) => l.clave === "kcal")!.valor;
    avisar({
      texto: `${MOMENTO[momento]} apuntada, ${kcal} kcal`,
      deshacer: () => cambiar((x) => extras.reduce((y, id) => quitarExtra(y, fechaDe(ahora), id), hechas.reduce((y, h) => deshacer(y, h.loteId, h.salidaId), x))),
    });
  };

  return (
    <section className="plato" aria-label="Tu plato">
      <div className="plato__cab">
        <h1 className="plato__titulo">Tu plato</h1>
        <div className="segmento segmento--peque" role="tablist" aria-label="Toma">
          {(["comida", "cena"] as Momento[]).map((m) => <button key={m} type="button" role="tab" aria-selected={momento === m} onClick={() => setMomento(m)}>{MOMENTO[m]}</button>)}
        </div>
      </div>
      <div className="plato__tapers">
        {plato.map(({ lote }) => (
          <label key={lote.id} className="pesada">
            <span className="pesada__nombre"><span><TipoMarca tipo={lote.tipo} /> {lote.nombre}</span><small>quedan {pesoTexto(quedan(lote))}</small></span>
            {campo(lote.id, lote.nombre)}
          </label>
        ))}
        {otros.map((o) => (
          <label key={o.id} className="pesada">
            <span className="pesada__nombre"><span>{o.item.nombre}</span><small>fuera de la nevera</small></span>
            {campo(o.id, o.item.nombre)}
          </label>
        ))}
      </div>

      <div className="chips">
        {nevera.filter((l) => !elegidos.includes(l.id)).map((l) => (
          <button key={l.id} type="button" className="chip" onClick={() => alternar(l.id)}>+ <TipoMarca tipo={l.tipo} /> {l.nombre}</button>
        ))}
        <button type="button" className="chip" onClick={() => setBuscando(true)}>+ Otra cosa</button>
      </div>

      <div className="macros-plato" aria-live="polite">
        {lineas.map((l) => (
          <div key={l.clave} className="macro-plato" data-estado={hayGramos ? l.estado : "vacio"}>
            <span className="macro-plato__nombre">{l.nombre}</span>
            <span className="macro-plato__valor">{l.valor}<small> / {l.objetivo}</small></span>
            <span className="macro-plato__dif">
              {!hayGramos ? "" : l.estado === "justo" ? "justo" : `${l.estado === "falta" ? "faltan" : "sobran"} ${l.diferencia}${l.unidad === "g" ? " g" : ""}`}
              {hayGramos && l.pista ? <small>{l.pista}</small> : null}
            </span>
          </div>
        ))}
      </div>

      <Boton grande ancho disabled={!hayGramos} onClick={apuntar}>Apuntar {MOMENTO[momento].toLowerCase()}</Boton>

      <Hoja abierta={buscando} cerrar={() => setBuscando(false)} titulo="Otra cosa">
        <div className="chips">
          {ATAJOS_OTRA.map((id) => BASE.find((x) => x.id === id)!).map((a) => (
            <button key={a.id} type="button" className="chip" onClick={() => anadirOtro({ alimentoId: a.id, nombre: a.nombre, gramos: a.porcion?.gramos ?? 100, n: a.n })}>
              + {a.nombre.replace(" con pan", "")}
            </button>
          ))}
        </div>
        <Buscador guardados={datos.alimentos} alGuardarAlimento={(a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } }))} alAnadir={anadirOtro} />
      </Hoja>
    </section>
  );
}

/* ---------------- la nevera ---------------- */

/** Fila de un táper: tipo, nombre, macros por 100 g, cuenta atrás hasta que caduca y lo que queda. */
function FilaTaper({ l, hoy, abrir }: { l: Lote; hoy: string; abrir: () => void }) {
  const f = frescura(l, hoy);
  return (
    <button type="button" className="fila-plana fila-taper" onClick={abrir}>
      <span className="fila-plana__txt">
        <b><TipoMarca tipo={l.tipo} /> {l.nombre}</b>
        <span className="nota">{textoPor100(por100(l))}</span>
        <span className="nota" data-estado={f.estado}>{cuentaAtras(l.caduca, hoy)}{f.estado === "tirar" ? ": a la basura" : f.estado === "ya" ? ": cómetelo ya" : ""}{l.pesado ? "" : ". Peso estimado"}</span>
      </span>
      <span className="fila-plana__dcha mono">{pesoTexto(quedan(l))}</span>
      <span className="vida" data-estado={f.estado} aria-hidden="true"><i style={{ width: `${Math.round(f.vida * 100)}%` }} /></span>
    </button>
  );
}

/* ---------------- qué cocinar ---------------- */

function Batch({ datos, cambiar, ahora, hoy, irA, abiertoAlEmpezar, cuando }: PantallaProps & { abiertoAlEmpezar: boolean; cuando: string | null }) {
  const avisar = useAvisar();
  const receta = propuestaActual(datos);
  const [raciones, setRaciones] = useState(datos.ajustes.raciones);
  const [abierto, setAbierto] = useState(abiertoAlEmpezar);
  const [eligiendo, setEligiendo] = useState(false);
  const [aMano, setAMano] = useState(false);

  if (!receta) {
    return (
      <section className="bloque">
        <p>Has apartado todas las recetas.</p>
        <button type="button" className="boton-texto" onClick={() => irA("recetas")}>Ir a recetas</button>
      </section>
    );
  }

  const r = racionDe(receta, tamanoDe(datos, receta));

  if (!abierto) {
    return (
      <button type="button" className="fila-plana fila-plana--boton" onClick={() => setAbierto(true)}>
        <span className="fila-plana__txt"><span className="nota">{cuando ? `Cocinas ${cuando}` : "Siguiente"}</span><b>{receta.nombre}</b></span>
        <span className="flecha" aria-hidden="true">›</span>
      </button>
    );
  }

  const tomas = tomasDeNuevoBatch(datos, r.kcal * raciones, ahora);
  const caduca = sumarDias(hoy, duraDe(receta));
  const pasadas = tomas.filter((t) => t.fecha > caduca);
  const lineas = lista(receta, raciones, tamanoDe(datos, receta));
  const tengo = loQueTengo(datos, hoy);
  const falta = lineas.filter((l) => !tengo.has(l.alimentoId));

  const loHago = () => {
    const antes = new Set(datos.lotes.map((l) => l.id));
    const nuevo = cocinar(datos, receta, raciones, ahora);
    const ids = nuevo.lotes.filter((l) => !antes.has(l.id)).map((l) => l.id);
    cambiar(() => nuevo);
    window.scrollTo({ top: 0, behavior: "smooth" });
    avisar({ texto: `${receta.corto} a la nevera. Pésalo cuando lo tengas`, deshacer: () => cambiar((d) => ({ ...ids.reduce(borrarLote, d), propuesta: receta.id })) });
  };

  const copiar = async () => {
    const res = await compartirTexto("Lista de la compra", textoCompra(receta.nombre, falta));
    avisar({ texto: res === "copiado" ? "Lista copiada" : res === "compartido" ? "Lista compartida" : "No se ha podido copiar" });
  };

  return (
    <section className="bloque" aria-label="Qué cocinar">
      <p className="nota">{abiertoAlEmpezar ? "Cocina hoy" : cuando ? `Cocinas ${cuando}` : "Siguiente"}</p>
      <h2 className="bloque__titulo">{receta.nombre}</h2>
      <p className="nota">{formaDe(receta)}, {receta.minutos} min. Cada ración, {r.kcal} kcal y {Math.round(r.proteina)} g de proteína.</p>

      <div className="batch__raciones">
        <Paso valor={raciones} min={1} max={8} alCambiar={setRaciones} texto={(v) => `${v} ${v === 1 ? "ración" : "raciones"}`} />
        <p>{textoTomas(tomas, hoy)}</p>
      </div>
      <p className="nota" data-estado={pasadas.length ? "ya" : undefined}>
        {pasadas.length
          ? `Caduca el ${fechaCorta(caduca)}: ${pasadas.length === 1 ? "la última ración no llega" : `las ${pasadas.length} últimas raciones no llegan`}.`
          : `Aguanta ${duraDe(receta)} días en la nevera, hasta el ${fechaCorta(caduca)}.`}
      </p>

      <details className="pliegue">
        <summary><span>Ingredientes</span><span className="nota">{falta.length ? `faltan ${falta.length}` : "todo en casa"}</span></summary>
        <div className="lista-nevera">
          {lineas.map((l) => {
            const si = tengo.has(l.alimentoId);
            return (
              <label key={l.alimentoId} className="ingrediente" data-tengo={si}>
                <input type="checkbox" id={`tengo-${l.alimentoId}`} checked={si} onChange={(e) => cambiar((d) => marcar(d, l.alimentoId, e.target.checked, hoy))} />
                <span className="ingrediente__caja"><IcoCheck /></span>
                <span className="ingrediente__g">{l.gramos} g</span>
                <span className="ingrediente__nombre"><span>{l.nombre}</span>{l.aprox ? <small>{l.aprox}</small> : null}</span>
              </label>
            );
          })}
        </div>
        {falta.length ? <button type="button" className="boton-texto" onClick={() => void copiar()}><IcoCopiar />Copiar lo que falta</button> : null}
      </details>

      <details className="pliegue">
        <summary><span>Pasos</span></summary>
        <ol className="pasos">{receta.pasos.map((p) => <li key={p}>{p}</li>)}</ol>
        <p className="nota">{receta.guardar}</p>
      </details>

      <Boton grande ancho onClick={loHago}>Lo hago</Boton>
      <div className="fila fila--entre">
        <button type="button" className="boton-texto" onClick={() => setEligiendo(true)}>Otra receta</button>
        <button type="button" className="boton-texto boton-texto--suave" onClick={() => setAMano(true)}>Añadir sobras</button>
      </div>

      <Hoja abierta={eligiendo} cerrar={() => setEligiendo(false)} titulo="Otra receta">
        <div className="lista-plana">
          {candidatas(datos).filter((x) => x.id !== receta.id).map((x) => {
            const t = racionDe(x, tamanoDe(datos, x));
            return (
              <button key={x.id} type="button" className="fila-plana fila-plana--boton" onClick={() => { cambiar((d) => proponer(d, x.id)); setEligiendo(false); }}>
                <span className="fila-plana__txt"><b>{x.nombre}</b><span className="nota">{formaDe(x)}, {t.kcal} kcal, {x.minutos} min</span></span>
              </button>
            );
          })}
        </div>
      </Hoja>
      <Sobras abierta={aMano} cerrar={() => setAMano(false)} hoy={hoy} datos={datos} cambiar={cambiar} alGuardar={(x) => {
        cambiar((d) => anadirAMano(d, x, ahora));
        setAMano(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        avisar({ texto: `${x.nombre} a la nevera` });
      }} />
    </section>
  );
}

/* ---------------- sobras a mano ---------------- */

function Sobras({ abierta, cerrar, hoy, datos, cambiar, alGuardar }: {
  abierta: boolean; cerrar: () => void; hoy: string; datos: PantallaProps["datos"]; cambiar: PantallaProps["cambiar"];
  alGuardar: (x: { nombre: string; tipo: Tipo; gramos: number; hecho: string; caduca: string; n: Por100 }) => void;
}) {
  const vacio = { nombre: "", gramos: "", kcal: "", proteina: "", carbos: "", grasa: "" };
  const [f, setF] = useState(vacio);
  const [tipo, setTipo] = useState<Tipo>("combinado");
  const [hace, setHace] = useState(0);
  const [dura, setDura] = useState(3);
  const [buscando, setBuscando] = useState(false);
  const n = (x: string) => Math.max(0, Number(x.replace(",", ".")) || 0);
  const v = (k: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const valido = f.nombre.trim() && n(f.gramos) > 0 && n(f.kcal) > 0;
  return (
    <Hoja abierta={abierta} cerrar={cerrar} titulo="Sobras">
      <Campo etiqueta="Qué es"><input className="entrada" id="sobras-nombre" value={f.nombre} maxLength={50} placeholder="Paella del domingo" onChange={v("nombre")} /></Campo>
      <div className="chips">
        {(Object.keys(TIPO) as Tipo[]).map((t) => <button key={t} type="button" className="chip" data-activo={tipo === t} onClick={() => setTipo(t)}>{TIPO[t].nombre}</button>)}
      </div>
      <div className="chips">
        {["Hecho hoy", "Ayer", "Anteayer"].map((t, i) => <button key={t} type="button" className="chip" data-activo={hace === i} onClick={() => { setHace(i); setDura(Math.max(0, 3 - i)); }}>{t}</button>)}
      </div>
      <p className="nota">Se puede comer hasta</p>
      <div className="chips">
        {["hoy", "mañana", "2 días", "3 días", "5 días"].map((t, i) => {
          const dias = [0, 1, 2, 3, 5][i];
          return <button key={t} type="button" className="chip" data-activo={dura === dias} onClick={() => setDura(dias)}>{i > 1 ? `en ${t}` : t}</button>;
        })}
      </div>
      <Campo etiqueta="Peso (g)"><input className="entrada" id="sobras-g" inputMode="numeric" value={f.gramos} onChange={v("gramos")} /></Campo>
      <div className="rejilla">
        <Campo etiqueta="kcal / 100 g"><input className="entrada" id="sobras-kcal" inputMode="decimal" value={f.kcal} onChange={v("kcal")} /></Campo>
        <Campo etiqueta="Proteína / 100 g"><input className="entrada" id="sobras-p" inputMode="decimal" value={f.proteina} onChange={v("proteina")} /></Campo>
        <Campo etiqueta="Hidratos / 100 g"><input className="entrada" id="sobras-hc" inputMode="decimal" value={f.carbos} onChange={v("carbos")} /></Campo>
        <Campo etiqueta="Grasa / 100 g"><input className="entrada" id="sobras-g100" inputMode="decimal" value={f.grasa} onChange={v("grasa")} /></Campo>
      </div>
      {buscando ? (
        <Buscador guardados={datos.alimentos} alGuardarAlimento={(a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } }))}
          alAnadir={(i) => { setF({ nombre: f.nombre || i.nombre, gramos: f.gramos || String(i.gramos), kcal: String(i.n.kcal), proteina: String(i.n.proteina), carbos: String(i.n.carbos), grasa: String(i.n.grasa) }); setBuscando(false); }} />
      ) : <button type="button" className="boton-texto" onClick={() => setBuscando(true)}>Buscar sus valores</button>}
      <Boton ancho disabled={!valido} onClick={() => {
        alGuardar({ nombre: f.nombre.trim(), tipo, gramos: Math.round(n(f.gramos)), hecho: sumarDias(hoy, -hace), caduca: sumarDias(hoy, dura), n: { kcal: n(f.kcal), proteina: n(f.proteina), carbos: n(f.carbos), grasa: n(f.grasa), fibra: 0 } });
        setF(vacio); setHace(0); setDura(3);
      }}>Meter en la nevera</Boton>
    </Hoja>
  );
}

/* ---------------- lo comido hoy ---------------- */

function Comido({ datos, cambiar, ahora, hoy }: PantallaProps) {
  const avisar = useAvisar();
  const [otra, setOtra] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const apuntes = apuntesDelDia(datos, hoy);
  const t = totalDelDia(datos, hoy);
  const o = datos.ajustes.objetivo;
  const plenny = alimentoBase("plenny-pro");

  const anadir = (lista: Item[]) => {
    let d = datos;
    for (const i of lista) d = anadirExtra(d, i, ahora);
    const nuevos = (d.extras[hoy] ?? []).slice(-lista.length).map((e) => e.id);
    const kcal = lista.reduce((s, i) => s + Math.round((i.n.kcal * i.gramos) / 100), 0);
    cambiar(() => d);
    avisar({ texto: `${lista.length === 1 ? lista[0].nombre : `${lista.length} cosas`}, ${kcal} kcal`, deshacer: () => cambiar((x) => nuevos.reduce((y, id) => quitarExtra(y, hoy, id), x)) });
  };
  const plennyItem = (g: number): Item => ({ alimentoId: plenny.id, nombre: g < 99 ? "½ Plenny" : "Plenny Pro", gramos: g, n: plenny.n });

  return (
    <section className="bloque" id="comido" aria-label="Comido hoy">
      <h2 className="bloque__titulo bloque__titulo--peque">Comido hoy</h2>
      {apuntes.length ? (
        <div className="apuntes">
          {apuntes.map((a) => (
            <div key={a.id} className="apunte">
              <span className="apunte__hora">{horaDe(new Date(a.cuando))}</span>
              <span className="apunte__nombre">{a.nombre}</span>
              <span className="apunte__kcal">{Math.round(a.t.gramos)} g</span>
              <span className="apunte__kcal">{Math.round(a.t.kcal)}</span>
              <button type="button" className="quitar" aria-label={`Quitar ${a.nombre}`}
                onClick={() => cambiar((d) => (a.loteId ? deshacer(d, a.loteId, a.id) : quitarExtra(d, hoy, a.id)))}>×</button>
            </div>
          ))}
        </div>
      ) : null}
      <dl className="macros">
        {[
          { n: "Proteína", v: t.proteina, m: o.proteina },
          { n: "Hidratos", v: t.carbos, m: o.carbos },
          { n: "Grasa", v: t.grasa, m: o.grasa },
          { n: "Fibra", v: t.fibra, m: o.fibra },
        ].map((x) => (
          <div key={x.n} className="macro" data-lleno={x.v >= x.m}>
            <dt>{x.n}</dt>
            <dd>{Math.round(x.v)}<small>/{x.m} g</small></dd>
          </div>
        ))}
      </dl>
      <div className="chips">
        <button type="button" className="chip" onClick={() => anadir([plennyItem(99)])}>+ Plenny Pro</button>
        <button type="button" className="chip" onClick={() => anadir([plennyItem(50)])}>+ ½ Plenny</button>
        <button type="button" className="chip" onClick={() => { setItems([]); setOtra(true); }}>+ Otra cosa</button>
      </div>

      <Hoja abierta={otra} cerrar={() => setOtra(false)} titulo="Otra cosa">
        <div className="chips">
          {ATAJOS_OTRA.map((id) => BASE.find((x) => x.id === id)!).map((a) => (
            <button key={a.id} type="button" className="chip" onClick={() => setItems((l) => [...l, { alimentoId: a.id, nombre: a.nombre, gramos: a.porcion?.gramos ?? 100, n: a.n }])}>
              + {a.nombre.replace(" con pan", "")}
            </button>
          ))}
        </div>
        <ListaItems items={items} cambiar={setItems} />
        <Buscador guardados={datos.alimentos} alGuardarAlimento={(a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } }))} alAnadir={(i) => setItems((l) => [...l, i])} />
        <Boton ancho disabled={!items.some((i) => i.gramos > 0)} onClick={() => { anadir(items.filter((i) => i.gramos > 0)); setOtra(false); }}>Apuntar</Boton>
      </Hoja>
    </section>
  );
}
