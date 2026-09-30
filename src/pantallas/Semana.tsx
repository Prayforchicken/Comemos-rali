/* ============================================================
   Semana: qué comes en cada toma de los próximos 7 días y cuándo vuelves a cocinar.
   Lo que ya está en la nevera va en texto normal; lo que aún hay que cocinar, en gris.
   ============================================================ */
import { useMemo, useState } from "react";
import type { PantallaProps } from "../App";
import { IcoOlla } from "../componentes/Iconos";
import { fechaCorta, sumarDias } from "../nucleo/fechas";
import { planSemana } from "../nucleo/semana";
import type { Momento } from "../nucleo/tipos";
import { diaNombre, ElegirReceta } from "./Hoy";

export function Semana({ datos, cambiar, ahora, hoy }: PantallaProps) {
  const [eligiendo, setEligiendo] = useState(false);
  const { huecos, cocinados } = useMemo(() => planSemana(datos, ahora), [datos, ahora]);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
  const hueco = (fecha: string, m: Momento) => huecos.find((h) => h.toma.fecha === fecha && h.toma.momento === m);
  const proxima = cocinados[0];
  /** Lo que ya se comió en una toma (para las de hoy que han pasado). */
  const comido = (fecha: string, m: Momento) => [...new Set([
    ...datos.lotes.filter((l) => l.salidas.some((s) => s.destino === "comida" && s.fecha === fecha && s.momento === m)).map((l) => l.nombre),
    ...(datos.extras[fecha] ?? []).filter((e) => e.momento === m).map((e) => e.item.nombre),
  ])].join(" + ");

  return (
    <div className="pantalla">
      <h1>Semana</h1>
      {proxima ? <p className="semana__proxima">Vuelves a cocinar <b>{diaNombre(proxima.fecha, hoy)}</b>: {proxima.nombre.toLowerCase()}.</p> : null}

      <div className="semana">
        {dias.map((f) => {
          const cocina = cocinados.filter((c) => c.fecha === f);
          return (
            <section key={f} className="semana__dia" data-hoy={f === hoy}>
              <h2>{diaNombre(f, hoy).replace(/^./, (c) => c.toUpperCase())}<small>{fechaCorta(f)}</small></h2>
              {cocina.map((c) => c === proxima
                ? <button key={c.recetaId + c.fecha} type="button" className="semana__cocinar" onClick={() => setEligiendo(true)}><IcoOlla />Cocinar {c.nombre.toLowerCase()} <span className="batch__cambiar">Cambiar</span></button>
                : <p key={c.recetaId + c.fecha} className="semana__cocinar"><IcoOlla />Cocinar {c.nombre.toLowerCase()}</p>)}
              {(["comida", "cena"] as Momento[]).map((m) => {
                const h = hueco(f, m);
                const hecho = h ? "" : comido(f, m);
                return (
                  <p key={m} className="semana__toma" data-nevera={h ? h.deLaNevera : Boolean(hecho)} data-caducado={h?.caducado ?? false}>
                    <span>{m === "comida" ? "Comida" : "Cena"}</span>
                    <span>{h ? `${h.nombre}${h.caducado ? " (ya habrá caducado)" : ""}` : hecho ? `${hecho} (comido)` : "—"}</span>
                  </p>
                );
              })}
            </section>
          );
        })}
      </div>
      <ElegirReceta abierta={eligiendo} cerrar={() => setEligiendo(false)} datos={datos} cambiar={cambiar} />
    </div>
  );
}
