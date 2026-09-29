/* ============================================================
   Hoy: lo primero, lo que hay en la nevera y qué ración toca.
   Si no queda nada (o queda poco): qué batch cocinar para 2 días,
   con la lista de "mira en la nevera" para marcar lo que tienes.
   Al final: lo que llevas comido hoy (kcal y macros).
   ============================================================ */
import { useEffect, useState } from "react";
import type { PantallaProps } from "../App";
import { alimentoBase, ATAJOS_OTRA, BASE } from "../alimentos/base";
import type { Item } from "../alimentos/tipos";
import { esNativo, pedirPermiso, tienePermiso } from "../avisos/notificaciones";
import { Boton, Campo, Hoja, Medidor, Paso, useAvisar } from "../componentes/base";
import { Buscador, ListaItems } from "../componentes/Buscador";
import { IcoBasura, IcoCheck, IcoComer, IcoCopiar, IcoOlla, IcoOtra, IcoRali } from "../componentes/Iconos";
import { LoteDetalle } from "../componentes/LoteDetalle";
import { compartirTexto } from "../datos/respaldo";
import { anadirExtra, apuntesDelDia, quitarExtra, totalDelDia } from "../nucleo/dia";
import { cuandoRelativo, diasEntre, fechaLarga, haceDias, horaDe, MOMENTO, sumarDias } from "../nucleo/fechas";
import { anadirAMano, borrarLote, cocinar, deshacer, enNevera, frescura, proyectar, quedan, racionDe, sacar, tomasDeNuevoBatch, type Toma } from "../nucleo/lotes";
import { candidatas, lista, loQueTengo, marcar, otraIdea, propuestaActual, proponer, textoCompra } from "../nucleo/propuesta";
import type { Destino, Lote } from "../nucleo/tipos";

/* ---------------- ayudas de texto ---------------- */

function diaNombre(f: string, hoy: string) {
  const d = diasEntre(hoy, f);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  return fechaLarga(f).split(" ")[0];
}

/** "Para la cena de hoy", "Para la comida de mañana". */
function paraCuando(t: Toma, hoy: string) {
  const dia = diaNombre(t.fecha, hoy);
  const de = dia === "hoy" || dia === "mañana" ? "de" : "del";
  return `Para la ${MOMENTO[t.momento].toLowerCase()} ${de} ${dia}`;
}

function Tomas({ tomas, hoy }: { tomas: Toma[]; hoy: string }) {
  const grupos = new Map<string, string[]>();
  for (const t of tomas) grupos.set(t.fecha, [...(grupos.get(t.fecha) ?? []), MOMENTO[t.momento].toLowerCase()]);
  return (
    <div className="tomas">
      {[...grupos].map(([f, m]) => <span key={f} className="toma" data-hoy={f === hoy}><b>{cuandoRelativo(f, hoy)}</b>{m.join(" y ")}</span>)}
    </div>
  );
}

const texto = { comida: "Apuntada", rali: "Una ración para Rali", basura: "Una ración a la basura" } as const;

/* ---------------- pantalla ---------------- */

export function Hoy(props: PantallaProps) {
  const { datos, cambiar, ahora, hoy } = props;
  const avisar = useAvisar();
  const [detalle, setDetalle] = useState<Lote | null>(null);
  const [permiso, setPermiso] = useState(true);
  const nevera = enNevera(datos);
  const plan = proyectar(datos, ahora);
  const quedanTotal = plan.length;

  useEffect(() => { if (esNativo() && datos.ajustes.avisos) void tienePermiso().then(setPermiso); }, [datos.ajustes.avisos]);

  const sacarRacion = (l: Lote, destino: Destino) => {
    const r = sacar(datos, l.id, destino, ahora);
    if (!r.salida) return;
    const salida = r.salida;
    cambiar(() => r.datos);
    const acabado = quedan(l) === 1 ? ` · era la última` : "";
    avisar({
      texto: destino === "comida" ? `${texto.comida}: ${MOMENTO[salida.momento].toLowerCase()} · ${l.porRacion.kcal} kcal${acabado}` : `${texto[destino]}${acabado}`,
      deshacer: () => cambiar((d) => deshacer(d, l.id, salida.id)),
    });
  };

  return (
    <div className="pila" style={{ gap: 18 }}>
      <header className="cabecera">
        <div className="pila" style={{ gap: 4 }}>
          <span className="fecha">{fechaLarga(hoy)}</span>
          <h1>{nevera.length ? "En la nevera" : "Nevera vacía"}</h1>
        </div>
        {quedanTotal ? <span className="etiqueta etiqueta--cobalto">{quedanTotal} {quedanTotal === 1 ? "ración" : "raciones"}</span> : null}
      </header>

      {esNativo() && datos.ajustes.avisos && !permiso ? (
        <div className="aviso aviso--info fila fila--entre">
          <span>Avisos desactivados</span>
          <Boton variante="secundario" onClick={() => void pedirPermiso().then(setPermiso)}>Activar</Boton>
        </div>
      ) : null}

      {nevera.map((l, i) => {
        const tomas = plan.filter((p) => p.loteId === l.id).map((p) => p.toma);
        return i === 0
          ? <Taper key={l.id} l={l} tomas={tomas} hoy={hoy} sacar={sacarRacion} verDetalle={() => setDetalle(l)} />
          : <OtroTaper key={l.id} l={l} hoy={hoy} sacar={sacarRacion} verDetalle={() => setDetalle(l)} />;
      })}

      <Batch key={quedanTotal === 0 ? "toca" : "siguiente"} {...props} modo={quedanTotal === 0 ? "toca" : "siguiente"} quedanTotal={quedanTotal} />

      <HoyLlevas {...props} />

      <LoteDetalle lote={detalle} datos={datos} cambiar={cambiar} cerrar={() => setDetalle(null)} ahora={ahora} />
    </div>
  );
}

/* ---------------- el táper que toca ---------------- */

function Cinta({ l, hoy }: { l: Lote; hoy: string }) {
  const f = frescura(l, hoy);
  if (f.estado === "tirar") return <span className="cinta cinta--tirar">{f.dias} días · mejor tirarlo</span>;
  if (f.estado === "ya") return <span className="cinta cinta--ya">{f.dias} días · cómetelo ya</span>;
  return <span className="cinta">Hecho {haceDias(l.hecho, hoy)}</span>;
}

function Raciones({ l }: { l: Lote }) {
  const q = quedan(l);
  const icono = { comida: <IcoCheck />, rali: <IcoRali />, basura: <IcoBasura /> };
  return (
    <div className="raciones" aria-label={`Quedan ${q} de ${l.raciones} raciones`}>
      {l.salidas.map((s) => <span key={s.id} className="racion" data-destino={s.destino} title={s.destino}>{icono[s.destino]}</span>)}
      {Array.from({ length: q }, (_, i) => <span key={`q${i}`} className="racion" data-destino="queda" />)}
    </div>
  );
}

function Taper({ l, tomas, hoy, sacar, verDetalle }: { l: Lote; tomas: Toma[]; hoy: string; sacar: (l: Lote, d: Destino) => void; verDetalle: () => void }) {
  return (
    <section className="tarjeta tarjeta--taper" aria-label={`Táper: ${l.nombre}`}>
      <Cinta l={l} hoy={hoy} />
      <div className="tarjeta__cab">
        {tomas[0] ? <span className="ceja">{paraCuando(tomas[0], hoy)}</span> : null}
        <h2 className="tarjeta__titulo">{l.nombre}</h2>
      </div>
      <Raciones l={l} />
      {tomas.length ? <Tomas tomas={tomas} hoy={hoy} /> : null}
      <p className="macros-linea">
        <span><b>{l.porRacion.kcal}</b> kcal</span>
        <span><b>{Math.round(l.porRacion.proteina)}</b> g prot.</span>
      </p>
      <div className="acciones">
        <Boton grande ancho icono={<IcoComer />} onClick={() => sacar(l, "comida")}>Me la como</Boton>
        <div className="acciones__dos">
          <Boton variante="rali" icono={<IcoRali />} onClick={() => sacar(l, "rali")}>Para Rali</Boton>
          <Boton variante="basura" icono={<IcoBasura />} onClick={() => sacar(l, "basura")}>A la basura</Boton>
        </div>
      </div>
      <button type="button" className="enlace" onClick={verDetalle}>Detalles</button>
    </section>
  );
}

function OtroTaper({ l, hoy, sacar, verDetalle }: { l: Lote; hoy: string; sacar: (l: Lote, d: Destino) => void; verDetalle: () => void }) {
  const f = frescura(l, hoy);
  return (
    <div className="nevera-fila">
      <button type="button" className="nevera-fila__txt" style={{ background: "none", border: 0, padding: 0, textAlign: "left" }} onClick={verDetalle}>
        <b>{l.nombre}</b>
        <span className="nota" style={{ color: f.estado === "bien" ? undefined : f.estado === "ya" ? "var(--ya)" : "var(--tirar)" }}>
          {quedan(l)} de {l.raciones} · {f.estado === "bien" ? `hecho ${haceDias(l.hecho, hoy)}` : `${f.dias} días`}
        </span>
      </button>
      <div className="nevera-fila__botones">
        <button type="button" className="icono-boton icono-boton--comer" aria-label={`Me como una ración de ${l.nombre}`} onClick={() => sacar(l, "comida")}><IcoComer /></button>
        <button type="button" className="icono-boton icono-boton--rali" aria-label={`Una ración de ${l.nombre} para Rali`} onClick={() => sacar(l, "rali")}><IcoRali /></button>
        <button type="button" className="icono-boton icono-boton--basura" aria-label={`Tirar una ración de ${l.nombre}`} onClick={() => sacar(l, "basura")}><IcoBasura /></button>
      </div>
    </div>
  );
}

/* ---------------- el batch que toca cocinar ---------------- */

function Batch({ datos, cambiar, ahora, hoy, modo, irA, quedanTotal }: PantallaProps & { modo: "toca" | "siguiente"; quedanTotal: number }) {
  const avisar = useAvisar();
  const receta = propuestaActual(datos);
  const [raciones, setRaciones] = useState(datos.ajustes.raciones);
  const [abierto, setAbierto] = useState(modo === "toca");
  const [eligiendo, setEligiendo] = useState(false);
  const [aMano, setAMano] = useState(false);

  if (!receta) {
    return (
      <section className="tarjeta tarjeta--plana">
        <h2 className="titulo-seccion">No hay recetas que proponer</h2>
        <Boton variante="secundario" onClick={() => irA("recetas")}>Ir a recetas</Boton>
      </section>
    );
  }

  const tomas = tomasDeNuevoBatch(datos, raciones, ahora);
  const lineas = lista(receta, raciones, datos.ajustes.tamano);
  const tengo = loQueTengo(datos, hoy);
  const falta = lineas.filter((l) => !tengo.has(l.alimentoId));
  const r = racionDe(receta, datos.ajustes.tamano);

  if (!abierto) {
    return (
      <button type="button" className="siguiente" data-pronto={quedanTotal <= 1} onClick={() => setAbierto(true)}>
        <span className="pila" style={{ gap: 4 }}>
          <span className="ceja">Siguiente batch</span>
          <b>{receta.nombre}</b>
        </span>
        <span className="flecha" aria-hidden="true">›</span>
      </button>
    );
  }

  const loHago = () => {
    const nuevo = cocinar(datos, receta, raciones, ahora);
    const id = nuevo.lotes[nuevo.lotes.length - 1].id;
    cambiar(() => nuevo);
    window.scrollTo({ top: 0, behavior: "smooth" });
    avisar({ texto: `${receta.corto} a la nevera · ${raciones} raciones`, deshacer: () => cambiar((d) => ({ ...borrarLote(d, id), propuesta: receta.id })) });
  };

  const copiar = async () => {
    const res = await compartirTexto("Lista de la compra", textoCompra(receta.nombre, falta.length ? falta : lineas));
    avisar({ texto: res === "copiado" ? "Lista copiada" : res === "compartido" ? "Lista compartida" : "No se ha podido copiar" });
  };

  return (
    <section className="tarjeta" aria-label="Batch para cocinar">
      <div className="tarjeta__cab">
        <div className="fila fila--entre">
          <span className="ceja">{modo === "toca" ? "Toca batch · para 2 días" : "Siguiente batch"}</span>
          {modo === "siguiente" ? <button type="button" className="enlace enlace--suave" onClick={() => setAbierto(false)}>Ocultar</button> : null}
        </div>
        <h2 className="tarjeta__titulo">{receta.nombre}</h2>
        <p className="macros-linea">
          <span><b>≈{receta.minutos}</b> min</span>
          <span><b>{r.kcal}</b> kcal/ración</span>
          <span><b>{Math.round(r.proteina)}</b> g prot.</span>
        </p>
      </div>

      <Paso valor={raciones} min={1} max={8} alCambiar={setRaciones} texto={(v) => `${v} ${v === 1 ? "ración" : "raciones"}`} />
      <Tomas tomas={tomas} hoy={hoy} />

      <details className="pliegue">
        <summary><span>Ingredientes</span><span className="nota">{falta.length ? `faltan ${falta.length}` : "todo en casa"}</span></summary>
        <div className="lista-nevera" style={{ marginTop: 8 }}>
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
        {falta.length ? <div style={{ marginTop: 10 }}><Boton variante="secundario" icono={<IcoCopiar />} onClick={() => void copiar()}>Copiar lo que falta</Boton></div> : null}
      </details>

      <details className="pliegue">
        <summary><span>Pasos</span></summary>
        <ol className="pasos">{receta.pasos.map((p) => <li key={p}>{p}</li>)}</ol>
        <p className="nota" style={{ marginTop: 10 }}>{receta.guardar}</p>
      </details>

      <div className="acciones">
        <Boton grande ancho icono={<IcoOlla />} onClick={loHago}>Lo hago</Boton>
        <div className="acciones__dos">
          <Boton variante="secundario" icono={<IcoOtra />} onClick={() => cambiar((d) => otraIdea(d))}>Otra idea</Boton>
          <Boton variante="secundario" onClick={() => setEligiendo(true)}>Elegir receta</Boton>
        </div>
      </div>
      <button type="button" className="enlace" onClick={() => setAMano(true)}>Añadir algo ya hecho</button>

      <Hoja abierta={eligiendo} cerrar={() => setEligiendo(false)} titulo="¿Qué cocinas?">
        <div className="pila" style={{ gap: 8 }}>
          {candidatas(datos).map((x) => {
            const t = racionDe(x, datos.ajustes.tamano);
            return (
              <button key={x.id} type="button" className="receta-fila" onClick={() => { cambiar((d) => proponer(d, x.id)); setEligiendo(false); }}>
                <span className="pila" style={{ gap: 2 }}><b>{x.nombre}</b><span className="nota">{t.kcal} kcal · {Math.round(t.proteina)} g prot. · {x.minutos} min</span></span>
                {x.id === receta.id ? <span className="etiqueta etiqueta--cobalto">ahora</span> : null}
              </button>
            );
          })}
        </div>
      </Hoja>
      <AnadirAMano abierta={aMano} cerrar={() => setAMano(false)} hoy={hoy} alGuardar={(x) => {
        cambiar((d) => anadirAMano(d, x, ahora));
        setAMano(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        avisar({ texto: `${x.nombre} a la nevera` });
      }} />
    </section>
  );
}

function AnadirAMano({ abierta, cerrar, hoy, alGuardar }: {
  abierta: boolean; cerrar: () => void; hoy: string;
  alGuardar: (x: { nombre: string; raciones: number; hecho: string; porRacion: { gramos: number; kcal: number; proteina: number; carbos: number; grasa: number; fibra: number } }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [raciones, setRaciones] = useState(2);
  const [hace, setHace] = useState(0);
  const [m, setM] = useState({ kcal: "700", proteina: "", carbos: "", grasa: "" });
  const n = (x: string) => Math.max(0, Number(x.replace(",", ".")) || 0);
  return (
    <Hoja abierta={abierta} cerrar={cerrar} titulo="Añadir a la nevera">
      <Campo etiqueta="Qué es"><input className="entrada" id="mano-nombre" value={nombre} maxLength={50} placeholder="Ej.: paella del domingo" onChange={(e) => setNombre(e.target.value)} /></Campo>
      <div className="fila fila--entre">
        <span>Raciones</span>
        <Paso valor={raciones} min={1} max={10} alCambiar={setRaciones} texto={(v) => `${v} ${v === 1 ? "ración" : "raciones"}`} />
      </div>
      <div className="campo">
        <span>Cuándo se hizo</span>
        <div className="chips">
          {["Hoy", "Ayer", "Anteayer"].map((t, i) => <button key={t} type="button" className="chip" data-activo={hace === i} onClick={() => setHace(i)}>{t}</button>)}
        </div>
      </div>
      <div className="rejilla">
        <Campo etiqueta="kcal por ración"><input className="entrada" id="mano-kcal" inputMode="numeric" value={m.kcal} onChange={(e) => setM({ ...m, kcal: e.target.value })} /></Campo>
        <Campo etiqueta="Proteína (g)"><input className="entrada" id="mano-prot" inputMode="numeric" value={m.proteina} placeholder="opcional" onChange={(e) => setM({ ...m, proteina: e.target.value })} /></Campo>
        <Campo etiqueta="Hidratos (g)"><input className="entrada" id="mano-hc" inputMode="numeric" value={m.carbos} placeholder="opcional" onChange={(e) => setM({ ...m, carbos: e.target.value })} /></Campo>
        <Campo etiqueta="Grasa (g)"><input className="entrada" id="mano-grasa" inputMode="numeric" value={m.grasa} placeholder="opcional" onChange={(e) => setM({ ...m, grasa: e.target.value })} /></Campo>
      </div>
      <Boton ancho disabled={!nombre.trim()} onClick={() => {
        alGuardar({ nombre: nombre.trim(), raciones, hecho: sumarDias(hoy, -hace), porRacion: { gramos: 0, kcal: Math.round(n(m.kcal)), proteina: n(m.proteina), carbos: n(m.carbos), grasa: n(m.grasa), fibra: 0 } });
        setNombre(""); setRaciones(2); setHace(0);
      }}>Meter en la nevera</Boton>
    </Hoja>
  );
}

/* ---------------- lo comido hoy ---------------- */

function HoyLlevas({ datos, cambiar, ahora, hoy }: PantallaProps) {
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
    avisar({ texto: `${lista.length === 1 ? lista[0].nombre : `${lista.length} cosas`} · ${kcal} kcal`, deshacer: () => cambiar((x) => nuevos.reduce((y, id) => quitarExtra(y, hoy, id), x)) });
  };
  const plennyItem = (g: number): Item => ({ alimentoId: plenny.id, nombre: g < 99 ? "½ Plenny Shake Pro" : "Plenny Shake Pro", gramos: g, n: plenny.n });

  return (
    <section className="tarjeta tarjeta--plana" aria-label="Lo comido hoy">
      <div className="fila fila--entre">
        <h2 className="titulo-seccion">Hoy llevas</h2>
        <span className="dato-grande">{t.kcal}<small>/ {o.kcal} kcal</small></span>
      </div>
      <Medidor valor={t.kcal} max={o.kcal} />
      <div className="macros">
        {[
          { n: "Proteína", v: t.proteina, m: o.proteina },
          { n: "Hidratos", v: t.carbos, m: o.carbos },
          { n: "Grasa", v: t.grasa, m: o.grasa },
          { n: "Fibra", v: t.fibra, m: o.fibra },
        ].map((x) => (
          <div key={x.n} className="macro">
            <span>{x.n}</span>
            <b>{Math.round(x.v)} g</b>
            <small>de {x.m}</small>
            <Medidor valor={x.v} max={x.m} />
          </div>
        ))}
      </div>

      {apuntes.length ? (
        <div className="apuntes">
          {apuntes.map((a) => (
            <div key={a.id} className="apunte">
              <span className="apunte__hora">{horaDe(new Date(a.cuando))}</span>
              <span className="apunte__nombre">{a.nombre}{a.momento ? <small>{MOMENTO[a.momento].toLowerCase()}</small> : null}</span>
              <span className="apunte__kcal">{a.t.kcal}</span>
              <button type="button" className="quitar" aria-label={`Quitar ${a.nombre}`}
                onClick={() => cambiar((d) => (a.loteId ? deshacer(d, a.loteId, a.id) : quitarExtra(d, hoy, a.id)))}>×</button>
            </div>
          ))}
        </div>
      ) : null}

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
