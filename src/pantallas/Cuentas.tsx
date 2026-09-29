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
    <div className="pantalla">
      <h1>Cuentas</h1>
      <Segmento etiqueta="Periodo" valor={periodo} alCambiar={setPeriodo} opciones={[{ v: "semana", t: "7 días" }, { v: "mes", t: "30 días" }, { v: "siempre", t: "Siempre" }]} />

      <div className="cifras">
        <div className="comida"><b>{r.comida}</b><span>comidas</span></div>
        <div className="rali"><b>{r.rali}</b><span>para Rali</span></div>
        <div className="basura"><b>{r.basura}</b><span>a la basura</span></div>
      </div>
      {r.total ? <p className="nota">Tiras el {r.pctBasura} % de lo que cocinas. {r.lotes === 1 ? "1 batch" : `${r.lotes} batch`} en este periodo.</p> : null}

      {r.recetas.length ? (
        <section className="bloque">
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

      <section className="bloque">
        <h2 className="bloque__titulo bloque__titulo--peque">Kcal por día</h2>
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
      </section>

      <section className="bloque">
        <h2 className="bloque__titulo bloque__titulo--peque">Tápers</h2>
        {lotes.length ? (
          <div className="lista-plana">
            {lotes.slice(0, 30).map((l) => {
              const c = { comida: 0, rali: 0, basura: 0 };
              l.salidas.forEach((s) => (c[s.destino] += 1));
              const q = quedan(l);
              const partes = [`${c.comida} comidas`, c.rali ? `${c.rali} para Rali` : "", c.basura ? `${c.basura} a la basura` : "", q ? `quedan ${q}` : ""].filter(Boolean);
              return (
                <button key={l.id} type="button" className="fila-plana" onClick={() => setDetalle(l)}>
                  <span className="fila-plana__txt"><b>{l.nombre}</b><span className="nota">{partes.join(", ")}</span></span>
                  <span className="fila-plana__dcha">{fechaCorta(l.hecho)}</span>
                </button>
              );
            })}
          </div>
        ) : <p className="vacio">Todavía no hay tápers.</p>}
      </section>

      <LoteDetalle lote={detalle} datos={datos} cambiar={cambiar} cerrar={() => setDetalle(null)} ahora={ahora} />
    </div>
  );
}
