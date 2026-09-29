/* Hoja con todo lo de un táper: qué lleva, a dónde ha ido cada ración y arreglos. */
import { useState } from "react";
import { fechaCorta, fechaLarga, MOMENTO } from "../nucleo/fechas";
import { borrarLote, cambiarRaciones, deshacer, quedan, sacar } from "../nucleo/lotes";
import type { Datos, Destino, Lote } from "../nucleo/tipos";
import { Boton, Confirmar, Hoja, Paso } from "./base";

export const DESTINO: Record<Destino, string> = { comida: "Me la comí", rali: "Para Rali", basura: "A la basura" };

export function LoteDetalle({ lote, datos, cambiar, cerrar, ahora }: {
  lote: Lote | null; datos: Datos; cambiar: (fn: (d: Datos) => Datos) => void; cerrar: () => void; ahora: Date;
}) {
  const [borrando, setBorrando] = useState(false);
  // Siempre la versión actual del lote (por si cambia mientras la hoja está abierta).
  const l = lote ? datos.lotes.find((x) => x.id === lote.id) ?? null : null;
  if (!l) return <Hoja abierta={false} cerrar={cerrar} titulo=""><span /></Hoja>;
  const q = quedan(l);
  return (
    <Hoja abierta cerrar={cerrar} titulo={l.nombre}>
      <p className="nota">Hecho el <b>{fechaLarga(l.hecho)}</b> · {l.porRacion.kcal} kcal y {Math.round(l.porRacion.proteina)} g de proteína por ración</p>

      <div className="fila fila--entre">
        <span>Salieron</span>
        <Paso valor={l.raciones} min={Math.max(1, l.salidas.length)} max={20} alCambiar={(n) => cambiar((d) => cambiarRaciones(d, l.id, n))} texto={(v) => `${v} ${v === 1 ? "ración" : "raciones"}`} />
      </div>

      {l.salidas.length ? (
        <div className="pila">
          <h3 className="titulo-seccion">Raciones</h3>
          <ul className="lista-simple">
            {l.salidas.map((s) => (
              <li key={s.id}>
                <span>{fechaCorta(s.fecha)} · {MOMENTO[s.momento].toLowerCase()} · <b>{DESTINO[s.destino]}</b></span>
                <button type="button" className="enlace" onClick={() => cambiar((d) => deshacer(d, l.id, s.id))}>Deshacer</button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {l.ingredientes.length ? (
        <details className="pliegue">
          <summary>Qué lleva una ración</summary>
          <ul className="lista-simple">
            {l.ingredientes.map((i) => <li key={i.alimentoId}><span>{i.nombre}</span><span className="mono">{i.gramos} g</span></li>)}
          </ul>
        </details>
      ) : null}
      {l.guardar ? <p className="nota">{l.guardar}</p> : null}

      <div className="acciones">
        {q > 0 ? (
          <Boton variante="basura" ancho onClick={() => {
            cambiar((d) => { let x = d; for (let i = 0; i < q; i++) x = sacar(x, l.id, "basura", ahora).datos; return x; });
            cerrar();
          }}>Tirar lo que queda ({q})</Boton>
        ) : null}
        <button type="button" className="enlace enlace--suave" onClick={() => setBorrando(true)}>Borrar este táper (fue un error)</button>
      </div>

      <Confirmar abierta={borrando} cerrar={() => setBorrando(false)} titulo="¿Borrar este táper?"
        texto="Desaparece de la nevera y de las cuentas, también las raciones que ya te comiste. Si solo se ha estropeado, usa mejor «Tirar lo que queda»."
        si="Borrar" alConfirmar={() => { cambiar((d) => borrarLote(d, l.id)); setBorrando(false); cerrar(); }} />
    </Hoja>
  );
}
