/* ============================================================
   Ajustes: objetivo diario, tamaño del batch, horas, avisos y copia de seguridad.
   ============================================================ */
import { useRef, useState } from "react";
import type { PantallaProps } from "../App";
import { avisoDePrueba, esNativo } from "../avisos/notificaciones";
import { Campo, Confirmar, Interruptor, Paso, useAvisar } from "../componentes/base";
import { AJUSTES_INICIALES, datosIniciales, importar } from "../datos/almacen";
import { diasSinRespaldo, guardarRespaldo } from "../datos/respaldo";
import type { Ajustes as TAjustes, Objetivo } from "../nucleo/tipos";

export function Ajustes({ datos, cambiar }: PantallaProps) {
  const avisar = useAvisar();
  const [borrar, setBorrar] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const a = datos.ajustes;
  const poner = (x: Partial<TAjustes>) => cambiar((d) => ({ ...d, ajustes: { ...d.ajustes, ...x } }));
  const obj = (k: keyof Objetivo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(0, Math.round(Number(e.target.value) || 0));
    cambiar((d) => ({ ...d, ajustes: { ...d.ajustes, objetivo: { ...d.ajustes.objetivo, [k]: v } } }));
  };
  const sinCopia = diasSinRespaldo();

  return (
    <div className="pantalla">
      <h1>Ajustes</h1>

      <section className="bloque">
        <h2 className="bloque__titulo bloque__titulo--peque">Objetivo diario</h2>
        <div className="rejilla">
          <Campo etiqueta="kcal"><input className="entrada" id="obj-kcal" type="number" inputMode="numeric" value={a.objetivo.kcal} onChange={obj("kcal")} /></Campo>
          <Campo etiqueta="Proteína (g)"><input className="entrada" id="obj-prot" type="number" inputMode="numeric" value={a.objetivo.proteina} onChange={obj("proteina")} /></Campo>
          <Campo etiqueta="Hidratos (g)"><input className="entrada" id="obj-hc" type="number" inputMode="numeric" value={a.objetivo.carbos} onChange={obj("carbos")} /></Campo>
          <Campo etiqueta="Grasa (g)"><input className="entrada" id="obj-grasa" type="number" inputMode="numeric" value={a.objetivo.grasa} onChange={obj("grasa")} /></Campo>
          <Campo etiqueta="Fibra (g)"><input className="entrada" id="obj-fibra" type="number" inputMode="numeric" value={a.objetivo.fibra} onChange={obj("fibra")} /></Campo>
        </div>
        <div className="rejilla">
          {(["comida", "cena"] as const).map((m) => (
            <Campo key={m} etiqueta={`${m === "comida" ? "Comida" : "Cena"} (% del día)`}>
              <input className="entrada" id={`reparto-${m}`} type="number" inputMode="numeric" min={5} max={80} value={Math.round(a.reparto[m] * 100)}
                onChange={(e) => poner({ reparto: { ...a.reparto, [m]: Math.min(0.8, Math.max(0.05, (Number(e.target.value) || 0) / 100)) } })} />
            </Campo>
          ))}
        </div>
      </section>

      <section className="bloque">
        <h2 className="bloque__titulo bloque__titulo--peque">Batch</h2>
        <div className="ajuste">
          <span>Raciones</span>
          <Paso valor={a.raciones} min={1} max={8} alCambiar={(v) => poner({ raciones: v })} texto={(v) => String(v)} />
        </div>
      </section>

      <section className="bloque">
        <h2 className="bloque__titulo bloque__titulo--peque">Horas</h2>
        <div className="rejilla">
          <Campo etiqueta="Comida"><input className="entrada" id="hora-comida" type="time" value={a.horaComida} onChange={(e) => e.target.value && poner({ horaComida: e.target.value })} /></Campo>
          <Campo etiqueta="Cena"><input className="entrada" id="hora-cena" type="time" value={a.horaCena} onChange={(e) => e.target.value && poner({ horaCena: e.target.value })} /></Campo>
          <Campo etiqueta="Aviso para cocinar"><input className="entrada" id="hora-cocinar" type="time" value={a.horaCocinar} onChange={(e) => e.target.value && poner({ horaCocinar: e.target.value })} /></Campo>
        </div>
      </section>

      <section className="bloque">
        <div className="ajuste" style={{ borderTop: 0, paddingTop: 0 }}>
          <span>Avisos{esNativo() ? "" : " (solo con la app abierta)"}</span>
          <Interruptor etiqueta="Avisos" activo={a.avisos} alCambiar={(v) => poner({ avisos: v })} />
        </div>
        <button type="button" className="boton-texto" onClick={() => void avisoDePrueba().then((ok) => avisar({ texto: ok ? "Llegará en 5 segundos" : "Sin permiso para avisos" }))}>Probar un aviso</button>
      </section>

      <section className="bloque">
        <div className="ajuste" style={{ borderTop: 0, paddingTop: 0 }}>
          <span>Copia de seguridad</span>
          <span className="nota">{sinCopia === null ? "ninguna" : sinCopia === 0 ? "hoy" : `hace ${sinCopia} ${sinCopia === 1 ? "día" : "días"}`}</span>
        </div>
        <div className="fila">
          <button type="button" className="boton-texto" onClick={() => void guardarRespaldo(datos).then((r) => avisar({ texto: r === "guardado" ? "Copia guardada" : r === "cancelado" ? "Copia cancelada" : "No se ha podido guardar" }))}>Guardar copia</button>
          <button type="button" className="boton-texto" onClick={() => archivo.current?.click()}>Recuperar</button>
        </div>
        <input ref={archivo} id="archivo-copia" type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try { const d = importar(await f.text()); cambiar(() => d); avisar({ texto: "Copia recuperada" }); }
          catch (err) { avisar({ texto: (err as Error).message || "Ese archivo no sirve" }); }
        }} />
      </section>

      <section className="bloque">
        <div className="fila fila--entre">
          <button type="button" className="boton-texto boton-texto--suave" onClick={() => poner({ ...AJUSTES_INICIALES })}>Ajustes de inicio</button>
          <button type="button" className="boton-texto boton-texto--basura" onClick={() => setBorrar(true)}>Borrar todo</button>
        </div>
        <p className="nota">Comemos · Adrián 0.1</p>
      </section>

      <Confirmar abierta={borrar} cerrar={() => setBorrar(false)} titulo="¿Borrar todo?" texto="Se borran la nevera, las cuentas, tus recetas y los ajustes de este móvil."
        si="Borrar todo" alConfirmar={() => { cambiar(() => datosIniciales()); setBorrar(false); }} />
    </div>
  );
}
