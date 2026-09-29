/* ============================================================
   Hoy. De arriba abajo:
   1. La fecha y las kcal del día.
   2. El táper que toca (la única tarjeta de la pantalla) y los demás tápers.
   3. Qué cocinar: se abre solo cuando la nevera está vacía.
   4. Lo comido hoy, con los añadidos rápidos.
   Principio de diseño: una sola cosa destacada por pantalla, texto corto
   y escrito como frase, y lo largo (ingredientes, pasos) plegado.
   ============================================================ */
import { useEffect, useState } from "react";
import type { PantallaProps } from "../App";
import { alimentoBase, ATAJOS_OTRA, BASE } from "../alimentos/base";
import type { Item } from "../alimentos/tipos";
import { esNativo, pedirPermiso, tienePermiso } from "../avisos/notificaciones";
import { Boton, Campo, Hoja, Medidor, Paso, useAvisar } from "../componentes/base";
import { Buscador, ListaItems } from "../componentes/Buscador";
import { IcoBasura, IcoCheck, IcoComer, IcoCopiar, IcoRali } from "../componentes/Iconos";
import { LoteDetalle } from "../componentes/LoteDetalle";
import { compartirTexto } from "../datos/respaldo";
import { anadirExtra, apuntesDelDia, quitarExtra, totalDelDia } from "../nucleo/dia";
import { diasEntre, fechaLarga, haceDias, horaDe, MOMENTO, sumarDias } from "../nucleo/fechas";
import { anadirAMano, borrarLote, cocinar, deshacer, enNevera, frescura, proyectar, quedan, racionDe, sacar, tomasDeNuevoBatch, type Toma } from "../nucleo/lotes";
import { candidatas, lista, loQueTengo, marcar, propuestaActual, proponer, textoCompra } from "../nucleo/propuesta";
import type { Destino, Lote } from "../nucleo/tipos";

/* ---------------- ayudas de texto ---------------- */

function diaNombre(f: string, hoy: string) {
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

const HECHO = { comida: "apuntada", rali: "Una ración para Rali", basura: "Una ración a la basura" } as const;

/* ---------------- pantalla ---------------- */

export function Hoy(props: PantallaProps) {
  const { datos, cambiar, ahora, hoy } = props;
  const avisar = useAvisar();
  const [detalle, setDetalle] = useState<Lote | null>(null);
  const [permiso, setPermiso] = useState(true);
  const nevera = enNevera(datos);
  const plan = proyectar(datos, ahora);
  const quedanTotal = plan.length;
  const total = totalDelDia(datos, hoy);
  const objetivo = datos.ajustes.objetivo.kcal;

  useEffect(() => { if (esNativo() && datos.ajustes.avisos) void tienePermiso().then(setPermiso); }, [datos.ajustes.avisos]);

  const sacarRacion = (l: Lote, destino: Destino) => {
    const r = sacar(datos, l.id, destino, ahora);
    if (!r.salida) return;
    const salida = r.salida;
    cambiar(() => r.datos);
    const ultima = quedan(l) === 1 ? ". Era la última" : "";
    avisar({
      texto: destino === "comida" ? `${MOMENTO[salida.momento]} ${HECHO.comida}, ${l.porRacion.kcal} kcal${ultima}` : `${HECHO[destino]}${ultima}`,
      deshacer: () => cambiar((d) => deshacer(d, l.id, salida.id)),
    });
  };

  return (
    <div className="hoy">
      <header className="cabecera">
        <span className="fecha">{fechaLarga(hoy)}</span>
        <a className="cabecera__kcal" href="#comido">
          <span><b>{total.kcal}</b> de {objetivo} kcal</span>
          <Medidor valor={total.kcal} max={objetivo} />
        </a>
      </header>

      {esNativo() && datos.ajustes.avisos && !permiso ? (
        <p className="fila fila--entre nota">
          Avisos apagados
          <button type="button" className="boton-texto" onClick={() => void pedirPermiso().then(setPermiso)}>Activar</button>
        </p>
      ) : null}

      {nevera.map((l, i) => {
        const tomas = plan.filter((p) => p.loteId === l.id).map((p) => p.toma);
        return i === 0
          ? <Taper key={l.id} l={l} tomas={tomas} hoy={hoy} sacar={sacarRacion} verDetalle={() => setDetalle(l)} />
          : <OtroTaper key={l.id} l={l} hoy={hoy} sacar={sacarRacion} verDetalle={() => setDetalle(l)} />;
      })}

      <Batch key={quedanTotal === 0 ? "toca" : "siguiente"} {...props} abiertoAlEmpezar={quedanTotal === 0} />

      <Comido {...props} />

      <LoteDetalle lote={detalle} datos={datos} cambiar={cambiar} cerrar={() => setDetalle(null)} ahora={ahora} />
    </div>
  );
}

/* ---------------- el táper que toca ---------------- */

/** Etiqueta del táper: su edad. El color dice si hay que darse prisa. */
function Cinta({ l, hoy }: { l: Lote; hoy: string }) {
  const f = frescura(l, hoy);
  const texto = f.estado === "bien" ? `Hecho ${haceDias(l.hecho, hoy)}` : `${f.dias} días`;
  return <span className={`cinta${f.estado === "bien" ? "" : ` cinta--${f.estado}`}`}>{texto}</span>;
}

function Raciones({ l }: { l: Lote }) {
  const q = quedan(l);
  const icono = { comida: <IcoCheck />, rali: <IcoRali />, basura: <IcoBasura /> };
  return (
    <div className="raciones" aria-label={`Quedan ${q} de ${l.raciones} raciones`}>
      {l.salidas.map((s) => <span key={s.id} className="racion" data-destino={s.destino}>{icono[s.destino]}</span>)}
      {Array.from({ length: q }, (_, i) => <span key={`q${i}`} className="racion" data-destino="queda" />)}
    </div>
  );
}

function Taper({ l, tomas, hoy, sacar, verDetalle }: { l: Lote; tomas: Toma[]; hoy: string; sacar: (l: Lote, d: Destino) => void; verDetalle: () => void }) {
  const f = frescura(l, hoy);
  return (
    <section className="taper" aria-label={`Táper: ${l.nombre}`}>
      <Cinta l={l} hoy={hoy} />
      <h1 className="taper__nombre">{l.nombre}</h1>
      <Raciones l={l} />
      <p className="taper__cuando">
        {f.estado === "tirar" ? "Lleva demasiado en la nevera." : f.estado === "ya" ? "Cómetelo hoy." : textoTomas(tomas, hoy)}
        <span className="nota"> {l.porRacion.kcal} kcal y {Math.round(l.porRacion.proteina)} g de proteína.</span>
      </p>
      <Boton grande ancho icono={<IcoComer />} onClick={() => sacar(l, "comida")}>Me la como</Boton>
      <div className="taper__otros">
        <button type="button" className="boton-texto boton-texto--rali" onClick={() => sacar(l, "rali")}><IcoRali />Para Rali</button>
        <button type="button" className="boton-texto boton-texto--basura" onClick={() => sacar(l, "basura")}><IcoBasura />A la basura</button>
        <button type="button" className="boton-texto boton-texto--suave" onClick={verDetalle}>Detalles</button>
      </div>
    </section>
  );
}

function OtroTaper({ l, hoy, sacar, verDetalle }: { l: Lote; hoy: string; sacar: (l: Lote, d: Destino) => void; verDetalle: () => void }) {
  const f = frescura(l, hoy);
  return (
    <div className="fila-plana">
      <button type="button" className="fila-plana__txt" onClick={verDetalle}>
        <b>{l.nombre}</b>
        <span className="nota" data-estado={f.estado}>Quedan {quedan(l)}, {f.estado === "bien" ? `hecho ${haceDias(l.hecho, hoy)}` : `${f.dias} días`}</span>
      </button>
      <div className="fila-plana__botones">
        <button type="button" className="icono-boton icono-boton--comer" aria-label={`Me como una ración de ${l.nombre}`} onClick={() => sacar(l, "comida")}><IcoComer /></button>
        <button type="button" className="icono-boton" aria-label={`Una ración de ${l.nombre} para Rali`} onClick={() => sacar(l, "rali")}><IcoRali /></button>
        <button type="button" className="icono-boton" aria-label={`Tirar una ración de ${l.nombre}`} onClick={() => sacar(l, "basura")}><IcoBasura /></button>
      </div>
    </div>
  );
}

/* ---------------- qué cocinar ---------------- */

function Batch({ datos, cambiar, ahora, hoy, irA, abiertoAlEmpezar }: PantallaProps & { abiertoAlEmpezar: boolean }) {
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

  if (!abierto) {
    return (
      <button type="button" className="fila-plana fila-plana--boton" onClick={() => setAbierto(true)}>
        <span className="fila-plana__txt"><span className="nota">Siguiente</span><b>{receta.nombre}</b></span>
        <span className="flecha" aria-hidden="true">›</span>
      </button>
    );
  }

  const tomas = tomasDeNuevoBatch(datos, raciones, ahora);
  const lineas = lista(receta, raciones, datos.ajustes.tamano);
  const tengo = loQueTengo(datos, hoy);
  const falta = lineas.filter((l) => !tengo.has(l.alimentoId));
  const r = racionDe(receta, datos.ajustes.tamano);

  const loHago = () => {
    const nuevo = cocinar(datos, receta, raciones, ahora);
    const id = nuevo.lotes[nuevo.lotes.length - 1].id;
    cambiar(() => nuevo);
    window.scrollTo({ top: 0, behavior: "smooth" });
    avisar({ texto: `${receta.corto} a la nevera`, deshacer: () => cambiar((d) => ({ ...borrarLote(d, id), propuesta: receta.id })) });
  };

  const copiar = async () => {
    const res = await compartirTexto("Lista de la compra", textoCompra(receta.nombre, falta));
    avisar({ texto: res === "copiado" ? "Lista copiada" : res === "compartido" ? "Lista compartida" : "No se ha podido copiar" });
  };

  return (
    <section className="bloque" aria-label="Qué cocinar">
      <p className="nota">{abiertoAlEmpezar ? "Cocina hoy" : "Siguiente"}</p>
      <h2 className="bloque__titulo">{receta.nombre}</h2>
      <p className="nota">{receta.minutos} min. Cada ración, {r.kcal} kcal y {Math.round(r.proteina)} g de proteína.</p>

      <div className="batch__raciones">
        <Paso valor={raciones} min={1} max={8} alCambiar={setRaciones} texto={(v) => `${v} ${v === 1 ? "ración" : "raciones"}`} />
        <p>{textoTomas(tomas, hoy)}</p>
      </div>

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
        <button type="button" className="boton-texto boton-texto--suave" onClick={() => setAMano(true)}>Ya tengo algo hecho</button>
      </div>

      <Hoja abierta={eligiendo} cerrar={() => setEligiendo(false)} titulo="Otra receta">
        <div className="lista-plana">
          {candidatas(datos).filter((x) => x.id !== receta.id).map((x) => {
            const t = racionDe(x, datos.ajustes.tamano);
            return (
              <button key={x.id} type="button" className="fila-plana fila-plana--boton" onClick={() => { cambiar((d) => proponer(d, x.id)); setEligiendo(false); }}>
                <span className="fila-plana__txt"><b>{x.nombre}</b><span className="nota">{t.kcal} kcal, {x.minutos} min</span></span>
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
  const [m, setM] = useState({ kcal: "700", proteina: "" });
  const n = (x: string) => Math.max(0, Number(x.replace(",", ".")) || 0);
  return (
    <Hoja abierta={abierta} cerrar={cerrar} titulo="A la nevera">
      <Campo etiqueta="Qué es"><input className="entrada" id="mano-nombre" value={nombre} maxLength={50} placeholder="Paella del domingo" onChange={(e) => setNombre(e.target.value)} /></Campo>
      <Paso valor={raciones} min={1} max={10} alCambiar={setRaciones} texto={(v) => `${v} ${v === 1 ? "ración" : "raciones"}`} />
      <div className="chips">
        {["Hecho hoy", "Ayer", "Anteayer"].map((t, i) => <button key={t} type="button" className="chip" data-activo={hace === i} onClick={() => setHace(i)}>{t}</button>)}
      </div>
      <div className="rejilla">
        <Campo etiqueta="kcal por ración"><input className="entrada" id="mano-kcal" inputMode="numeric" value={m.kcal} onChange={(e) => setM({ ...m, kcal: e.target.value })} /></Campo>
        <Campo etiqueta="Proteína (g)"><input className="entrada" id="mano-prot" inputMode="numeric" value={m.proteina} onChange={(e) => setM({ ...m, proteina: e.target.value })} /></Campo>
      </div>
      <Boton ancho disabled={!nombre.trim()} onClick={() => {
        alGuardar({ nombre: nombre.trim(), raciones, hecho: sumarDias(hoy, -hace), porRacion: { gramos: 0, kcal: Math.round(n(m.kcal)), proteina: n(m.proteina), carbos: 0, grasa: 0, fibra: 0 } });
        setNombre(""); setRaciones(2); setHace(0);
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
              <span className="apunte__kcal">{a.t.kcal}</span>
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
