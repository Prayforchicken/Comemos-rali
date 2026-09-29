/* Hoja con todo lo de un táper: raciones que han salido, qué lleva y arreglos. */
import { useState } from "react";
import { fechaCorta, MOMENTO } from "../nucleo/fechas";
import { borrarLote, cambiarRaciones, deshacer, quedan, sacar } from "../nucleo/lotes";
import type { Datos, Destino, Lote } from "../nucleo/tipos";
import { Confirmar, Hoja, Paso } from "./base";

export const DESTINO: Record<Destino, string> = { comida: "comida", rali: "para Rali", basura: "a la basura" };

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
      <p className="nota">Hecho el {fechaCorta(l.hecho)}. {l.porRacion.kcal} kcal por ración.</p>

      <div className="ajuste">
        <span>Salieron</span>
        <Paso valor={l.raciones} min={Math.max(1, l.salidas.length)} max={20} alCambiar={(n) => cambiar((d) => cambiarRaciones(d, l.id, n))} texto={(v) => `${v} ${v === 1 ? "ración" : "raciones"}`} />
      </div>

      {l.salidas.length ? (
        <div className="lista-plana">
          {l.salidas.map((s) => (
            <div key={s.id} className="fila-plana">
              <span>{MOMENTO[s.momento]} del {fechaCorta(s.fecha)}, {DESTINO[s.destino]}</span>
              <button type="button" className="boton-texto" onClick={() => cambiar((d) => deshacer(d, l.id, s.id))}>Deshacer</button>
            </div>
          ))}
        </div>
      ) : null}

      {l.ingredientes.length ? (
        <details className="pliegue">
          <summary><span>Ingredientes</span><span className="nota">1 ración</span></summary>
          <ul className="lista-simple">
            {l.ingredientes.map((i) => <li key={i.alimentoId}><span>{i.nombre}</span><span className="mono">{i.gramos} g</span></li>)}
          </ul>
          {l.guardar ? <p className="nota" style={{ marginTop: 10 }}>{l.guardar}</p> : null}
        </details>
      ) : null}

      <div className="fila fila--entre">
        {q > 0 ? (
          <button type="button" className="boton-texto boton-texto--basura" onClick={() => {
            cambiar((d) => { let x = d; for (let i = 0; i < q; i++) x = sacar(x, l.id, "basura", ahora).datos; return x; });
            cerrar();
          }}>Tirar lo que queda ({q})</button>
        ) : <span />}
        <button type="button" className="boton-texto boton-texto--suave" onClick={() => setBorrando(true)}>Borrar táper</button>
      </div>

      <Confirmar abierta={borrando} cerrar={() => setBorrando(false)} titulo="¿Borrar este táper?"
        texto="Desaparece de la nevera y de las cuentas, con las raciones que ya te comiste. Si se ha estropeado, usa «Tirar lo que queda»."
        si="Borrar" alConfirmar={() => { cambiar((d) => borrarLote(d, l.id)); setBorrando(false); cerrar(); }} />
    </Hoja>
  );
}
