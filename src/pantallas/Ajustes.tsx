/* ============================================================
   Ajustes: objetivo diario, tamaño del batch, horas, avisos y copia de seguridad.
   ============================================================ */
import { useRef, useState } from "react";
import type { PantallaProps } from "../App";
import { avisoDePrueba, esNativo } from "../avisos/notificaciones";
import { Boton, Campo, Confirmar, Interruptor, Paso, useAvisar } from "../componentes/base";
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
    <div className="pila" style={{ gap: 18 }}>
      <header className="pila" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800 }}>Ajustes</h1>
      </header>

      <section className="tarjeta tarjeta--plana">
        <h2 className="titulo-seccion">Objetivo diario</h2>
        <div className="rejilla">
          <Campo etiqueta="kcal"><input className="entrada" id="obj-kcal" type="number" inputMode="numeric" value={a.objetivo.kcal} onChange={obj("kcal")} /></Campo>
          <Campo etiqueta="Proteína (g)"><input className="entrada" id="obj-prot" type="number" inputMode="numeric" value={a.objetivo.proteina} onChange={obj("proteina")} /></Campo>
          <Campo etiqueta="Hidratos (g)"><input className="entrada" id="obj-hc" type="number" inputMode="numeric" value={a.objetivo.carbos} onChange={obj("carbos")} /></Campo>
          <Campo etiqueta="Grasa (g)"><input className="entrada" id="obj-grasa" type="number" inputMode="numeric" value={a.objetivo.grasa} onChange={obj("grasa")} /></Campo>
          <Campo etiqueta="Fibra (g)"><input className="entrada" id="obj-fibra" type="number" inputMode="numeric" value={a.objetivo.fibra} onChange={obj("fibra")} /></Campo>
        </div>
      </section>

      <section className="tarjeta tarjeta--plana">
        <h2 className="titulo-seccion">Batch</h2>
        <div className="fila fila--entre">
          <span>Raciones cada vez</span>
          <Paso valor={a.raciones} min={1} max={8} alCambiar={(v) => poner({ raciones: v })} texto={(v) => `${v} ${v === 1 ? "ración" : "raciones"}`} />
        </div>
        <div className="campo">
          <span>Tamaño de cada ración</span>
          <div className="chips">
            {[80, 90, 100, 110, 120, 130].map((v) => <button key={v} type="button" className="chip" data-activo={a.tamano === v} onClick={() => poner({ tamano: v })}>{v} %</button>)}
          </div>
        </div>
      </section>

      <section className="tarjeta tarjeta--plana">
        <h2 className="titulo-seccion">Horas</h2>
        <div className="rejilla">
          <Campo etiqueta="Comida"><input className="entrada" id="hora-comida" type="time" value={a.horaComida} onChange={(e) => e.target.value && poner({ horaComida: e.target.value })} /></Campo>
          <Campo etiqueta="Cena"><input className="entrada" id="hora-cena" type="time" value={a.horaCena} onChange={(e) => e.target.value && poner({ horaCena: e.target.value })} /></Campo>
          <Campo etiqueta="Aviso para cocinar"><input className="entrada" id="hora-cocinar" type="time" value={a.horaCocinar} onChange={(e) => e.target.value && poner({ horaCocinar: e.target.value })} /></Campo>
        </div>
      </section>

      <section className="tarjeta tarjeta--plana">
        <div className="fila fila--entre">
          <h2 className="titulo-seccion">Avisos</h2>
          <Interruptor etiqueta="Avisos" activo={a.avisos} alCambiar={(v) => poner({ avisos: v })} />
        </div>
        {esNativo() ? null : <p className="nota">En la web solo llegan con la app abierta.</p>}
        <Boton variante="secundario" onClick={() => void avisoDePrueba().then((ok) => avisar({ texto: ok ? "Llegará en 5 segundos" : "Sin permiso para avisos" }))}>Probar un aviso</Boton>
      </section>

      <section className="tarjeta tarjeta--plana">
        <h2 className="titulo-seccion">Copia de seguridad</h2>
        <p className="nota">{sinCopia === null ? "Sin copias todavía" : `Última copia: hace ${sinCopia} ${sinCopia === 1 ? "día" : "días"}`}</p>
        <div className="acciones__dos">
          <Boton onClick={() => void guardarRespaldo(datos).then((r) => avisar({ texto: r === "guardado" ? "Copia guardada" : r === "cancelado" ? "Copia cancelada" : "No se ha podido guardar" }))}>Guardar copia</Boton>
          <Boton variante="secundario" onClick={() => archivo.current?.click()}>Recuperar</Boton>
        </div>
        <input ref={archivo} id="archivo-copia" type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try { const d = importar(await f.text()); cambiar(() => d); avisar({ texto: "Copia recuperada" }); }
          catch (err) { avisar({ texto: (err as Error).message || "Ese archivo no sirve" }); }
        }} />
      </section>

      <section className="pila" style={{ gap: 8 }}>
        <button type="button" className="enlace enlace--suave" onClick={() => poner({ ...AJUSTES_INICIALES })}>Volver a los ajustes de inicio</button>
        <button type="button" className="enlace enlace--suave" onClick={() => setBorrar(true)}>Borrar todo</button>
        <p className="nota">Comemos · Adrián 0.1</p>
      </section>

      <Confirmar abierta={borrar} cerrar={() => setBorrar(false)} titulo="¿Borrar todo?" texto="Se borran la nevera, las cuentas, tus recetas y los ajustes de este móvil. Si tienes una copia, podrás recuperarla."
        si="Borrar todo" alConfirmar={() => { cambiar(() => datosIniciales()); setBorrar(false); }} />
    </div>
  );
}
