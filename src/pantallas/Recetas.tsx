/* ============================================================
   Recetas: las que trae la app y las tuyas.
   La app las propone por turnos; las apartadas no se proponen.
   ============================================================ */
import { useState } from "react";
import type { PantallaProps } from "../App";
import { totales } from "../alimentos/nutricion";
import type { Item } from "../alimentos/tipos";
import { Boton, Campo, Confirmar, Hoja, Paso, useAvisar } from "../componentes/base";
import { Buscador, ListaItems } from "../componentes/Buscador";
import { haceDias } from "../nucleo/fechas";
import { nuevoId, racionDe } from "../nucleo/lotes";
import { apartar, lista, proponer, todasLasRecetas, ultimaVez } from "../nucleo/propuesta";
import type { Receta } from "../nucleo/tipos";

export function Recetas({ datos, cambiar, hoy, irA }: PantallaProps) {
  const avisar = useAvisar();
  const [viendo, setViendo] = useState<Receta | null>(null);
  const [editando, setEditando] = useState<Receta | null>(null);
  const [borrando, setBorrando] = useState<Receta | null>(null);
  const todas = todasLasRecetas(datos);
  const activas = todas.filter((r) => !datos.apartadas.includes(r.id));
  const apartadas = todas.filter((r) => datos.apartadas.includes(r.id));

  const Fila = ({ r }: { r: Receta }) => {
    const t = racionDe(r, datos.ajustes.tamano);
    const u = ultimaVez(datos, r.id);
    return (
      <button type="button" className="fila-plana" onClick={() => setViendo(r)}>
        <span className="fila-plana__txt">
          <b>{r.nombre}</b>
          <span className="nota">{t.kcal} kcal, {r.minutos} min{r.propia ? ", tuya" : ""}</span>
        </span>
        <span className="fila-plana__dcha">{u ? haceDias(u, hoy) : "nunca"}</span>
      </button>
    );
  };

  const nueva = (): Receta => ({ id: nuevoId("receta"), nombre: "", corto: "", ingredientes: [], pasos: [], minutos: 40, guardar: "3 días en la nevera.", propia: true, salen: 4 });

  return (
    <div className="pantalla">
      <h1>Recetas</h1>

      <div className="lista-plana">
        {activas.map((r) => <Fila key={r.id} r={r} />)}
      </div>
      <button type="button" className="boton-texto" onClick={() => setEditando(nueva())}>+ Nueva receta</button>

      {apartadas.length ? (
        <details className="pliegue">
          <summary><span>Apartadas</span><span className="nota">{apartadas.length}</span></summary>
          <div className="lista-plana">{apartadas.map((r) => <Fila key={r.id} r={r} />)}</div>
        </details>
      ) : null}

      <Hoja abierta={Boolean(viendo)} cerrar={() => setViendo(null)} titulo={viendo?.nombre ?? ""}>
        {viendo ? <DetalleReceta r={viendo} raciones={datos.ajustes.raciones} tamano={datos.ajustes.tamano} apartada={datos.apartadas.includes(viendo.id)}
          alProponer={() => { cambiar((d) => apartar(proponer(d, viendo.id), viendo.id, false)); setViendo(null); irA("hoy"); avisar({ texto: `Toca ${viendo.corto.toLowerCase()}` }); }}
          alApartar={(a) => { cambiar((d) => apartar(d, viendo.id, a)); setViendo(null); avisar({ texto: a ? `No te propondré ${viendo.corto}` : `${viendo.corto} vuelve a la lista` }); }}
          alEditar={() => { setEditando(viendo); setViendo(null); }}
          alBorrar={() => { setBorrando(viendo); setViendo(null); }} /> : null}
      </Hoja>

      <Hoja abierta={Boolean(editando)} cerrar={() => setEditando(null)} titulo={editando && datos.recetasPropias[editando.id] ? "Editar receta" : "Nueva receta"}>
        {editando ? <EditorReceta key={editando.id} inicial={editando} datos={datos}
          alGuardarAlimento={(a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } }))}
          alGuardar={(r) => { cambiar((d) => ({ ...d, recetasPropias: { ...d.recetasPropias, [r.id]: r } })); setEditando(null); avisar({ texto: `${r.corto} guardada` }); }} /> : null}
      </Hoja>

      <Confirmar abierta={Boolean(borrando)} cerrar={() => setBorrando(null)} titulo={`¿Borrar «${borrando?.nombre ?? ""}»?`}
        texto="Los tápers que ya hiciste con ella se quedan en la nevera y en las cuentas." si="Borrar receta"
        alConfirmar={() => {
          const id = borrando?.id;
          cambiar((d) => { const p = { ...d.recetasPropias }; if (id) delete p[id]; return { ...d, recetasPropias: p, propuesta: d.propuesta === id ? null : d.propuesta }; });
          setBorrando(null);
        }} />
    </div>
  );
}

function DetalleReceta({ r, raciones, tamano, apartada, alProponer, alApartar, alEditar, alBorrar }: {
  r: Receta; raciones: number; tamano: number; apartada: boolean;
  alProponer: () => void; alApartar: (a: boolean) => void; alEditar: () => void; alBorrar: () => void;
}) {
  const t = racionDe(r, tamano);
  return (
    <>
      <p className="nota">{r.minutos} min. Cada ración, {t.kcal} kcal y {Math.round(t.proteina)} g de proteína.</p>
      <details className="pliegue">
        <summary><span>Ingredientes</span><span className="nota">{raciones} raciones</span></summary>
        <ul className="lista-simple">
          {lista(r, raciones, tamano).map((l) => <li key={l.alimentoId}><span>{l.nombre}</span><span className="mono">{l.gramos} g</span></li>)}
        </ul>
      </details>
      {r.pasos.length || r.guardar ? (
        <details className="pliegue">
          <summary><span>Pasos</span></summary>
          <ol className="pasos">{r.pasos.map((p) => <li key={p}>{p}</li>)}</ol>
          {r.guardar ? <p className="nota">{r.guardar}</p> : null}
        </details>
      ) : null}
      <Boton ancho onClick={alProponer}>Cocinar esta</Boton>
      <div className="fila fila--entre">
        <button type="button" className="boton-texto boton-texto--suave" onClick={() => alApartar(!apartada)}>{apartada ? "Volver a proponérmela" : "No me la propongas"}</button>
        {r.propia ? (
          <span className="fila">
            <button type="button" className="boton-texto" onClick={alEditar}>Editar</button>
            <button type="button" className="boton-texto boton-texto--basura" onClick={alBorrar}>Borrar</button>
          </span>
        ) : null}
      </div>
    </>
  );
}

function EditorReceta({ inicial, datos, alGuardar, alGuardarAlimento }: {
  inicial: Receta; datos: PantallaProps["datos"]; alGuardar: (r: Receta) => void; alGuardarAlimento: Parameters<typeof Buscador>[0]["alGuardarAlimento"];
}) {
  const salen0 = inicial.salen ?? 4;
  const [nombre, setNombre] = useState(inicial.nombre);
  const [salen, setSalen] = useState(salen0);
  // En el editor se escriben las cantidades de TODA la olla; se guardan por ración.
  const [items, setItems] = useState<Item[]>(inicial.ingredientes.map((i) => ({ ...i, gramos: Math.round(i.gramos * salen0) })));
  const [pasos, setPasos] = useState(inicial.pasos.join("\n"));
  const [minutos, setMinutos] = useState(String(inicial.minutos));
  const [guardar, setGuardar] = useState(inicial.guardar);
  const [buscando, setBuscando] = useState(!inicial.ingredientes.length);
  const valido = nombre.trim() && items.some((i) => i.gramos > 0);
  const racion = totales(items.map((i) => ({ ...i, gramos: i.gramos / salen })));
  return (
    <>
      <Campo etiqueta="Nombre"><input className="entrada" id="receta-nombre" value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Garbanzos con espinacas" /></Campo>
      <div className="fila fila--entre">
        <span>Salen</span>
        <Paso valor={salen} min={1} max={12} alCambiar={setSalen} texto={(v) => `${v} ${v === 1 ? "ración" : "raciones"}`} />
      </div>
      <h3 className="bloque__titulo bloque__titulo--peque">Ingredientes de toda la olla</h3>
      <ListaItems items={items} cambiar={setItems} divisor={salen} etiquetaTotal="Por ración" />
      {buscando ? (
        <Buscador guardados={datos.alimentos} alGuardarAlimento={alGuardarAlimento} alAnadir={(i) => { setItems((l) => [...l, i]); setBuscando(false); }} />
      ) : <button type="button" className="boton-texto" onClick={() => setBuscando(true)}>+ Ingrediente</button>}
      <Campo etiqueta="Pasos (uno por línea)"><textarea className="entrada" id="receta-pasos" rows={5} value={pasos} onChange={(e) => setPasos(e.target.value)} /></Campo>
      <div className="rejilla">
        <Campo etiqueta="Minutos"><input className="entrada" id="receta-minutos" inputMode="numeric" value={minutos} onChange={(e) => setMinutos(e.target.value)} /></Campo>
      </div>
      <Campo etiqueta="Cómo se guarda"><input className="entrada" id="receta-guardar" value={guardar} onChange={(e) => setGuardar(e.target.value)} /></Campo>
      <p className="nota">Una ración: <b>{racion.kcal} kcal</b> y <b>{Math.round(racion.proteina)} g</b> de proteína.</p>
      <Boton ancho disabled={!valido} onClick={() => {
        const n = nombre.trim();
        alGuardar({
          ...inicial, nombre: n, corto: n.length > 24 ? `${n.slice(0, 23)}…` : n, propia: true, salen,
          ingredientes: items.filter((i) => i.gramos > 0).map((i) => ({ ...i, gramos: Math.round((i.gramos / salen) * 10) / 10 })),
          pasos: pasos.split("\n").map((p) => p.trim()).filter(Boolean),
          minutos: Math.max(5, Number(minutos) || 40), guardar: guardar.trim(),
        });
      }}>Guardar receta</Boton>
    </>
  );
}
