/* Hoja de un táper: lo que queda, pesarlo, sacar gramos para Rali o la basura, historial y qué lleva
   (lo que lleva se puede cambiar si al cocinar no seguiste la receta al pie de la letra). */
import { useState } from "react";
import type { Item } from "../alimentos/tipos";
import { cuentaAtras, diasEntre, fechaCorta, fechaDe, MOMENTO, pesoTexto } from "../nucleo/fechas";
import { borrarLote, cambiarIngredientes, deshacer, frescura, macrosDe, moverCaducidad, pesarQueda, por100, quedan, sacar } from "../nucleo/lotes";
import { TIPO } from "../nucleo/receta";
import type { Datos, Destino, Lote, Tipo } from "../nucleo/tipos";
import { Boton, Confirmar, Hoja, Paso } from "./base";
import { Buscador, ListaItems } from "./Buscador";

const DESTINO: Record<Destino, string> = { comida: "comida", rali: "para Rali", basura: "a la basura" };

/** Marca del tipo de táper: P, H o P.C. */
export const TipoMarca = ({ tipo }: { tipo: Tipo }) => <abbr className="tipo" data-tipo={tipo} title={TIPO[tipo].nombre}>{TIPO[tipo].corto}</abbr>;

export function LoteDetalle({ lote, datos, cambiar, cerrar, ahora }: {
  lote: Lote | null; datos: Datos; cambiar: (fn: (d: Datos) => Datos) => void; cerrar: () => void; ahora: Date;
}) {
  const [borrando, setBorrando] = useState(false);
  const [peso, setPeso] = useState("");
  const [saca, setSaca] = useState("");
  const [ajustando, setAjustando] = useState<Item[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  // Siempre la versión actual del táper (por si cambia mientras la hoja está abierta).
  const l = lote ? datos.lotes.find((x) => x.id === lote.id) ?? null : null;
  if (!l) return <Hoja abierta={false} cerrar={cerrar} titulo=""><span /></Hoja>;
  const q = quedan(l);
  const n = por100(l);
  const hoy = fechaDe(ahora);
  const f = frescura(l, hoy);
  const dias = diasEntre(hoy, l.caduca);
  const g = (x: string) => Math.max(0, Math.round(Number(x.replace(",", ".")) || 0));
  const salir = (destino: Destino, gramos: number) => { cambiar((d) => sacar(d, l.id, destino, gramos, ahora).datos); setSaca(""); };

  return (
    <Hoja abierta cerrar={() => { setPeso(""); setSaca(""); setAjustando(null); setBuscando(false); cerrar(); }} titulo={l.nombre}>
      <p className="nota"><TipoMarca tipo={l.tipo} /> {TIPO[l.tipo].nombre}. Hecho el {fechaCorta(l.hecho)}.</p>
      <div className="ajuste">
        <span className="nota" data-estado={f.estado}>{cuentaAtras(l.caduca, hoy)}</span>
        <Paso valor={dias} min={-7} max={21} alCambiar={(v) => cambiar((d) => moverCaducidad(d, l.id, v - dias))} texto={() => fechaCorta(l.caduca)} />
      </div>
      <p className="nota">100 g: {Math.round(n.kcal)} kcal, {Math.round(n.proteina)} g de proteína, {Math.round(n.carbos)} g de hidratos, {Math.round(n.grasa)} g de grasa.</p>

      <div className="ajuste">
        <span>Queda {pesoTexto(q)}{l.pesado ? "" : ", estimado"}</span>
        <span className="fila">
          <input className="entrada entrada--g entrada--corta" id="peso-queda" inputMode="numeric" placeholder="Pesar" value={peso} onChange={(e) => setPeso(e.target.value.replace(/[^\d]/g, ""))} />
          <button type="button" className="boton-texto" disabled={!peso} onClick={() => { cambiar((d) => pesarQueda(d, l.id, g(peso))); setPeso(""); }}>Guardar</button>
        </span>
      </div>

      <div className="ajuste">
        <span className="fila">
          <input className="entrada entrada--g entrada--corta" id="peso-saca" inputMode="numeric" placeholder="g" value={saca} onChange={(e) => setSaca(e.target.value.replace(/[^\d]/g, ""))} />
          <button type="button" className="boton-texto boton-texto--rali" disabled={!saca} onClick={() => salir("rali", g(saca))}>Para Rali</button>
          <button type="button" className="boton-texto boton-texto--basura" disabled={!saca} onClick={() => salir("basura", g(saca))}>A la basura</button>
        </span>
      </div>
      <div className="fila fila--entre">
        <button type="button" className="boton-texto boton-texto--basura" disabled={!q} onClick={() => { salir("basura", q); cerrar(); }}>Tirar lo que queda</button>
        <button type="button" className="boton-texto boton-texto--suave" disabled={!q} onClick={() => { cambiar((d) => pesarQueda(d, l.id, 0)); cerrar(); }}>Está vacío</button>
      </div>

      {l.salidas.length ? (
        <details className="pliegue">
          <summary><span>Historial</span><span className="nota">{l.salidas.length}</span></summary>
          <div className="lista-plana">
            {[...l.salidas].reverse().map((s) => (
              <div key={s.id} className="fila-plana">
                <span>{MOMENTO[s.momento]} del {fechaCorta(s.fecha)}: {s.gramos} g {DESTINO[s.destino]}{s.destino === "comida" ? `, ${Math.round(macrosDe(l, s.gramos).kcal)} kcal` : ""}</span>
                <button type="button" className="boton-texto" onClick={() => cambiar((d) => deshacer(d, l.id, s.id))}>Deshacer</button>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {l.ingredientes.length ? (
        <details className="pliegue" open={ajustando ? true : undefined}>
          <summary><span>Ingredientes</span><span className="nota">en crudo</span></summary>
          {ajustando ? (
            <>
              <p className="nota">Lo que echaste de verdad en este táper. La receta no cambia.</p>
              <ListaItems items={ajustando} cambiar={setAjustando} etiquetaTotal="Todo el táper" />
              {buscando ? (
                <Buscador guardados={datos.alimentos} alGuardarAlimento={(a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } }))}
                  alAnadir={(i) => { setAjustando((x) => [...(x ?? []), i]); setBuscando(false); }} />
              ) : <button type="button" className="boton-texto" onClick={() => setBuscando(true)}>+ Ingrediente</button>}
              <Boton ancho disabled={!ajustando.some((i) => i.gramos > 0)} onClick={() => { cambiar((d) => cambiarIngredientes(d, l.id, ajustando)); setAjustando(null); setBuscando(false); }}>Guardar cambios</Boton>
              <button type="button" className="boton-texto boton-texto--suave" onClick={() => { setAjustando(null); setBuscando(false); }}>Cancelar</button>
            </>
          ) : (
            <>
              <ul className="lista-simple">
                {l.ingredientes.map((i) => <li key={i.alimentoId}><span>{i.nombre}</span><span className="mono">{Math.round(i.gramos)} g</span></li>)}
              </ul>
              <button type="button" className="boton-texto boton-texto--suave" onClick={() => setAjustando(l.ingredientes.map((i) => ({ ...i, gramos: Math.round(i.gramos) })))}>Cambiar cantidades</button>
              {l.guardar ? <p className="nota" style={{ marginTop: 10 }}>{l.guardar}</p> : null}
            </>
          )}
        </details>
      ) : null}

      <button type="button" className="boton-texto boton-texto--suave" onClick={() => setBorrando(true)}>Borrar táper</button>

      <Confirmar abierta={borrando} cerrar={() => setBorrando(false)} titulo="¿Borrar este táper?"
        texto="Desaparece de la nevera y de las cuentas, con lo que ya te comiste. Si se ha estropeado, usa «Tirar lo que queda»."
        si="Borrar" alConfirmar={() => { cambiar((d) => borrarLote(d, l.id)); setBorrando(false); cerrar(); }} />
    </Hoja>
  );
}
