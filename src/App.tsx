/* ============================================================
   Estructura de la app: estado, reloj, avisos y barra de pestañas.
   Cada pestaña es un archivo en src/pantallas/.
   ============================================================ */
import { App as AppNativa } from "@capacitor/app";
import { useEffect, useState } from "react";
import { esNativo, reprogramar } from "./avisos/notificaciones";
import { Avisos } from "./componentes/base";
import { IcoAjustes, IcoCuentas, IcoRecetas, IcoSemana, IcoTaper } from "./componentes/Iconos";
import { useDatos, type Cambio } from "./datos/almacen";
import { fechaDe } from "./nucleo/fechas";
import type { Datos } from "./nucleo/tipos";
import { Ajustes } from "./pantallas/Ajustes";
import { Cuentas } from "./pantallas/Cuentas";
import { Hoy } from "./pantallas/Hoy";
import { Recetas } from "./pantallas/Recetas";
import { Semana } from "./pantallas/Semana";

export type Pestana = "hoy" | "semana" | "recetas" | "cuentas" | "ajustes";

export interface PantallaProps {
  datos: Datos;
  cambiar: (fn: Cambio) => void;
  /** Reloj de la app (se actualiza cada 30 s y al volver a abrirla). */
  ahora: Date;
  /** Fecha de hoy "YYYY-MM-DD". */
  hoy: string;
  irA: (p: Pestana) => void;
}

const PESTANAS: { id: Pestana; nombre: string; Icono: () => React.JSX.Element }[] = [
  { id: "hoy", nombre: "Hoy", Icono: IcoTaper },
  { id: "semana", nombre: "Semana", Icono: IcoSemana },
  { id: "recetas", nombre: "Recetas", Icono: IcoRecetas },
  { id: "cuentas", nombre: "Cuentas", Icono: IcoCuentas },
  { id: "ajustes", nombre: "Ajustes", Icono: IcoAjustes },
];

export default function App() {
  const { datos, cambiar } = useDatos();
  const [pestana, setPestana] = useState<Pestana>("hoy");
  const [ahora, setAhora] = useState(() => new Date());

  // Reloj: la hora decide si una ración es comida o cena y cuándo cambia el día.
  useEffect(() => {
    const i = window.setInterval(() => setAhora(new Date()), 30_000);
    const volver = () => setAhora(new Date());
    if (esNativo()) {
      const l = AppNativa.addListener("resume", volver);
      return () => { clearInterval(i); void l.then((x) => x.remove()); };
    }
    const vis = () => document.visibilityState === "visible" && volver();
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(i); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const hoy = fechaDe(ahora);

  // Reprogramar avisos cuando cambia la nevera, los ajustes o el día.
  const firma = JSON.stringify([datos.lotes.map((l) => [l.id, l.raciones, l.salidas.length]), datos.ajustes, hoy]);
  useEffect(() => {
    const t = window.setTimeout(() => void reprogramar(datos).catch(() => undefined), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma]);

  useEffect(() => { window.scrollTo(0, 0); }, [pestana]);

  const props: PantallaProps = { datos, cambiar, ahora, hoy, irA: setPestana };

  return (
    <Avisos>
      <div className="app">
        <main className="contenido">
          {pestana === "hoy" && <Hoy {...props} />}
          {pestana === "semana" && <Semana {...props} />}
          {pestana === "recetas" && <Recetas {...props} />}
          {pestana === "cuentas" && <Cuentas {...props} />}
          {pestana === "ajustes" && <Ajustes {...props} />}
        </main>
        <nav className="pestanas" aria-label="Secciones">
          {PESTANAS.map(({ id, nombre, Icono }) => (
            <button key={id} type="button" className="pestana" aria-current={pestana === id ? "page" : undefined} onClick={() => setPestana(id)}>
              <Icono />
              <span>{nombre}</span>
            </button>
          ))}
        </nav>
      </div>
    </Avisos>
  );
}
