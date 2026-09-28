/* ============================================================
   Estructura de la app: estado, reloj, avisos y navegación.
   - Barra inferior: lo del día a día (Hoy, Diario, Mascotas, Menú).
   - Menú hamburguesa (arriba): lo que se toca de vez en cuando (Mi semana, Actividad, Ajustes).
   Cada pantalla es un archivo en src/pantallas/.
   ============================================================ */
import { App as AppNativa } from "@capacitor/app";
import { useEffect, useMemo, useRef, useState } from "react";
import { pedirPermisoSiNuncaSePidio, reprogramar, esNativo } from "./avisos/notificaciones";
import { todayInTimezone } from "./comemos/engine";
import { IcoActividad, IcoAjustes, IcoHamburguesa, IcoHoy, IcoMascotas, IcoMenu, IcoRegistro, IcoSemana } from "./componentes/Iconos";
import { Hoja } from "./componentes/base";
import { Pegatinas } from "./componentes/Pegatinas";
import { useDatos, type Cambio, type Datos } from "./datos/almacen";
import { energiaHumana, type EnergiaHumana } from "./juego/energia";
import { avanzarTiempo, type Sueno } from "./juego/motor";
import { Actividad } from "./pantallas/Actividad";
import { Ajustes } from "./pantallas/Ajustes";
import { Bienvenida } from "./pantallas/Bienvenida";
import { Hoy } from "./pantallas/Hoy";
import { Mascotas } from "./pantallas/Mascotas";
import { Diario } from "./pantallas/Diario";
import { Menu } from "./pantallas/Menu";
import { Semana } from "./pantallas/Semana";

export interface PantallaProps {
  datos: Datos;
  cambiar: (fn: Cambio) => void;
  fecha: string;
  setFecha: (f: string) => void;
  ahora: Date;
  sueno: Sueno;
  /** Energía de Rali ahora mismo (sale de su día: trabajo, gimnasio, batch cooking, sueño). */
  energia: EnergiaHumana;
  irA: (p: Pestana) => void;
}

export type Pestana = "hoy" | "diario" | "mascotas" | "menu" | "semana" | "actividad" | "ajustes";
type Entrada = { id: Pestana; nombre: string; Icono: () => React.JSX.Element };
/** Barra inferior: el día a día. */
const PESTANAS: Entrada[] = [
  { id: "hoy", nombre: "Hoy", Icono: IcoHoy },
  { id: "diario", nombre: "Diario", Icono: IcoRegistro },
  { id: "mascotas", nombre: "Mascotas", Icono: IcoMascotas },
  { id: "menu", nombre: "Menú", Icono: IcoMenu },
];
/** Menú hamburguesa: lo de vez en cuando. */
const MAS: (Entrada & { texto: string })[] = [
  { id: "semana", nombre: "Mi semana", Icono: IcoSemana, texto: "Tracker, batch de la tanda y días con más carga" },
  { id: "actividad", nombre: "Actividad", Icono: IcoActividad, texto: "Trabajo, gimnasio, batch cooking… (mueven tu energía)" },
  { id: "ajustes", nombre: "Ajustes", Icono: IcoAjustes, texto: "Avisos, perfil, suplementos y copia de seguridad" },
];

export default function App() {
  const { datos, cambiar } = useDatos();
  const [pestana, setPestana] = useState<Pestana>("hoy");
  const [hamburguesa, setHamburguesa] = useState(false);
  const [ahora, setAhora] = useState(() => new Date());
  const [fecha, setFecha] = useState(() => todayInTimezone(datos.plan.settings.timezone));
  const perfil = datos.plan.profiles.rali;
  const sueno = useMemo<Sueno>(() => ({ dormir: perfil.sleepTime, despertar: perfil.wakeTime }), [perfil.sleepTime, perfil.wakeTime]);

  const energia = useMemo(() => energiaHumana(datos.plan, datos.juego.logros, ahora), [datos.plan, datos.juego.logros, ahora]);

  // Reloj: cada minuto avanzan las necesidades de las mascotas y su energía sigue a la de Rali.
  useEffect(() => {
    const tic = () => {
      const t = new Date();
      setAhora(t);
      cambiar((d) => ({ ...d, juego: avanzarTiempo(d.juego, t, sueno, energiaHumana(d.plan, d.juego.logros, t).valor) }));
    };
    tic();
    const i = window.setInterval(tic, 60_000);
    return () => clearInterval(i);
  }, [cambiar, sueno]);

  // Al volver a la app: refrescar la hora y el día, y reprogramar los avisos (así siempre hay una semana por delante).
  const ultimos = useRef(datos);
  ultimos.current = datos;
  useEffect(() => {
    const volver = () => {
      setAhora(new Date());
      setFecha(todayInTimezone(datos.plan.settings.timezone));
      void reprogramar(ultimos.current).catch(() => undefined);
    };
    if (esNativo()) {
      const l = AppNativa.addListener("resume", volver);
      return () => { void l.then((x) => x.remove()); };
    }
    const vis = () => document.visibilityState === "visible" && volver();
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [datos.plan.settings.timezone]);

  // En la APK, pedir el permiso de avisos la primera vez (después de adoptar al gatito).
  const hayMascota = datos.juego.mascotas.length > 0;
  useEffect(() => {
    if (hayMascota) void pedirPermisoSiNuncaSePidio().then(() => reprogramar(ultimos.current)).catch(() => undefined);
  }, [hayMascota]);

  // Reprogramar avisos cuando cambia algo que les afecta (plan, mascotas, preferencias).
  const firmaAvisos = JSON.stringify([datos.plan.activities, datos.decisiones, datos.plan.profiles.rali, datos.juego.avisos, datos.juego.mascotas.map((m) => m.nombre), datos.juego.activaId, fecha]);
  useEffect(() => {
    const t = window.setTimeout(() => void reprogramar(datos).catch(() => undefined), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaAvisos]);

  useEffect(() => { window.scrollTo(0, 0); }, [pestana]);

  // Si cambia algo que afecta a la energía (una actividad, el gimnasio…), los animalitos lo notan al momento.
  useEffect(() => {
    cambiar((d) => (d.juego.mascotas.some((m) => m.necesidades.energia !== energia.valor)
      ? { ...d, juego: { ...d.juego, mascotas: d.juego.mascotas.map((m) => ({ ...m, necesidades: { ...m.necesidades, energia: energia.valor } })) } }
      : d));
  }, [energia.valor, cambiar]);

  const props: PantallaProps = { datos, cambiar, fecha, setFecha, ahora, sueno, energia, irA: setPestana };

  return (
    <Pegatinas>
      <div className="app rp-papel">
        {datos.juego.mascotas.length === 0 ? (
          <Bienvenida {...props} />
        ) : (
          <>
            <header className="barra-arriba">
              <button type="button" className="barra-arriba__boton" aria-label="Más secciones" aria-expanded={hamburguesa} onClick={() => setHamburguesa(true)}>
                <IcoHamburguesa />
              </button>
              {MAS.some((x) => x.id === pestana) ? <span className="barra-arriba__donde">{MAS.find((x) => x.id === pestana)!.nombre}</span> : null}
            </header>
            <main className="contenido">
              {pestana === "hoy" && <Hoy {...props} />}
              {pestana === "diario" && <Diario {...props} />}
              {pestana === "mascotas" && <Mascotas {...props} />}
              {pestana === "menu" && <Menu {...props} />}
              {pestana === "semana" && <Semana {...props} />}
              {pestana === "actividad" && <Actividad {...props} />}
              {pestana === "ajustes" && <Ajustes {...props} />}
            </main>
            <nav className="pestanas" aria-label="Secciones">
              {PESTANAS.map(({ id, nombre, Icono }) => (
                <button key={id} type="button" className="pestana" data-activa={pestana === id} aria-current={pestana === id ? "page" : undefined} onClick={() => setPestana(id)}>
                  <Icono />
                  <span>{nombre}</span>
                </button>
              ))}
            </nav>
            <Hoja abierta={hamburguesa} cerrar={() => setHamburguesa(false)} titulo="Más cosas">
              <nav className="mas" aria-label="Más secciones">
                {MAS.map(({ id, nombre, Icono, texto }) => (
                  <button key={id} type="button" className="mas__op" data-activa={pestana === id} onClick={() => { setPestana(id); setHamburguesa(false); }}>
                    <Icono />
                    <span><b>{nombre}</b><small className="nota">{texto}</small></span>
                  </button>
                ))}
              </nav>
            </Hoja>
          </>
        )}
      </div>
    </Pegatinas>
  );
}
