/* ============================================================
   Cuentas: raciones comidas, para Rali y tiradas; kcal de los últimos días
   e historial de tápers.
   ============================================================ */
import { useState } from "react";
import type { PantallaProps } from "../App";
import { Segmento } from "../componentes/base";
import { LoteDetalle } from "../componentes/LoteDetalle";
import { resumen, ultimosDias } from "../nucleo/cuentas";
import { diaCorto, fechaCorta, sumarDias } from "../nucleo/fechas";
import { quedan } from "../nucleo/lotes";
import type { Lote } from "../nucleo/tipos";

type Periodo = "semana" | "mes" | "siempre";

export function Cuentas({ datos, cambiar, hoy, ahora }: PantallaProps) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [detalle, setDetalle] = useState<Lote | null>(null);
  const desde = periodo === "semana" ? sumarDias(hoy, -6) : periodo === "mes" ? sumarDias(hoy, -29) : null;
  const r = resumen(datos, desde);
  const dias = ultimosDias(datos, hoy, 7);
  const objetivo = datos.ajustes.objetivo.kcal;
  const escala = Math.max(objetivo * 1.25, ...dias.map((d) => d.t.kcal));
  const lotes = [...datos.lotes].sort((a, b) => b.hecho.localeCompare(a.hecho) || b.creado.localeCompare(a.creado));

  return (
    <div className="pila" style={{ gap: 18 }}>
      <header className="pila" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800 }}>Cuentas</h1>
        <p className="nota">A dónde van las raciones de tus batch.</p>
      </header>

      <Segmento etiqueta="Periodo" valor={periodo} alCambiar={setPeriodo} opciones={[{ v: "semana", t: "7 días" }, { v: "mes", t: "30 días" }, { v: "siempre", t: "Siempre" }]} />

      <div className="trio">
        <div><span>Comidas</span><b className="dato-grande comida">{r.comida}</b></div>
        <div><span>Para Rali</span><b className="dato-grande rali">{r.rali}</b></div>
        <div><span>A la basura</span><b className="dato-grande basura">{r.basura}</b></div>
      </div>
      <p className="nota">
        {r.total ? <><b>{r.pctBasura} %</b> de las raciones acabó en la basura. Has cocinado {r.lotes} batch en este periodo.</> : "Aún no ha salido ninguna ración en este periodo."}
      </p>

      {r.recetas.length ? (
        <section className="tarjeta tarjeta--plana">
          <h2 className="titulo-seccion">Por receta</h2>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Receta</th><th>Veces</th><th>Comidas</th><th>Rali</th><th>Basura</th></tr></thead>
              <tbody>
                {r.recetas.map((x) => (
                  <tr key={x.nombre}><td>{x.nombre}</td><td>{x.lotes}</td><td>{x.comida}</td><td>{x.rali}</td><td>{x.basura}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="tarjeta tarjeta--plana">
        <div className="fila fila--entre">
          <h2 className="titulo-seccion">Últimos 7 días</h2>
          <span className="nota">objetivo {objetivo} kcal</span>
        </div>
        <div className="dias">
          {dias.map((d) => (
            <div key={d.fecha} className="dia">
              <span>{d.fecha === hoy ? "hoy" : diaCorto(d.fecha)}</span>
              <span className="dia__barra" aria-label={`${d.t.kcal} kcal`}>
                <i style={{ width: `${(d.t.kcal / escala) * 100}%` }} />
                <em style={{ left: `${(objetivo / escala) * 100}%` }} />
              </span>
              <span className="mono">{d.t.kcal}</span>
            </div>
          ))}
        </div>
        <p className="nota">La raya negra marca tu objetivo. Las barras suman solo lo que apuntas en la app.</p>
      </section>

      <section className="tarjeta tarjeta--plana">
        <h2 className="titulo-seccion">Tápers</h2>
        {lotes.length ? (
          <div>
            {lotes.slice(0, 30).map((l) => {
              const c = { comida: 0, rali: 0, basura: 0 };
              l.salidas.forEach((s) => (c[s.destino] += 1));
              const q = quedan(l);
              return (
                <button key={l.id} type="button" className="lote-fila" onClick={() => setDetalle(l)}>
                  <b>{l.nombre}</b>
                  <span className="nota mono">{fechaCorta(l.hecho)}</span>
                  <span className="nota">{c.comida} comidas · {c.rali} Rali · {c.basura} basura{q ? ` · quedan ${q}` : ""}</span>
                </button>
              );
            })}
          </div>
        ) : <p className="nota">Cuando cocines tu primer batch aparecerá aquí.</p>}
      </section>

      <LoteDetalle lote={detalle} datos={datos} cambiar={cambiar} cerrar={() => setDetalle(null)} ahora={ahora} />
    </div>
  );
}
