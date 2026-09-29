/* ============================================================
   Avisos para que no se olvide lo que hay en la nevera.
   - A la hora de comer y de cenar: qué tápers tocan (mientras quede algo).
   - El día que se acaba la nevera, a la hora de cocinar: "toca batch".
   - El día que caduca un táper, por la mañana: "caduca hoy".
   En la APK se programan de verdad (suenan con la app cerrada).
   En la web solo mientras la app está abierta.
   ============================================================ */
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { fechaDe, MOMENTO, sumarDias } from "../nucleo/fechas";
import { enNevera } from "../nucleo/lotes";
import { planSemana } from "../nucleo/semana";
import type { Datos } from "../nucleo/tipos";

export const esNativo = () => Capacitor.isNativePlatform();

interface Aviso { id: number; cuando: Date; titulo: string; texto: string }

function aFecha(fecha: string, hhmm: string) {
  const [y, mo, d] = fecha.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0);
}
const idDe = (fecha: string, n: number) => Number(fecha.replaceAll("-", "").slice(2)) * 10 + n;

export function calcularAvisos(d: Datos, ahora = new Date()): Aviso[] {
  if (!d.ajustes.avisos) return [];
  const { huecos, cocinados } = planSemana(d, ahora, 4);
  const avisos: Aviso[] = [];

  for (const { toma, nombre } of huecos.filter((h) => h.deLaNevera).slice(0, 8)) {
    avisos.push({
      id: idDe(toma.fecha, toma.momento === "comida" ? 1 : 2),
      cuando: aFecha(toma.fecha, toma.momento === "comida" ? d.ajustes.horaComida : d.ajustes.horaCena),
      titulo: `${MOMENTO[toma.momento]}: ${nombre}`,
      texto: "Pesa tu plato y apúntalo en la app.",
    });
  }

  // Toca batch: el primer cocinado del plan, a la hora de cocinar (o al día siguiente si ya pasó).
  const primero = cocinados[0];
  if (primero) {
    let cuando = aFecha(primero.fecha, d.ajustes.horaCocinar);
    if (cuando <= ahora) cuando = aFecha(sumarDias(primero.fecha, 1), d.ajustes.horaCocinar);
    avisos.push({ id: idDe(fechaDe(cuando), 3), cuando, titulo: `Toca batch: ${primero.nombre}`, texto: "Mira qué te falta en la lista de ingredientes." });
  }
  // Caduca hoy: un aviso por día a las 11:00 con los tápers que caducan ese día.
  const porDia = new Map<string, string[]>();
  for (const l of enNevera(d)) porDia.set(l.caduca, [...(porDia.get(l.caduca) ?? []), l.nombre]);
  for (const [fecha, nombres] of porDia) {
    avisos.push({ id: idDe(fecha, 4), cuando: aFecha(fecha, "11:00"), titulo: `Caduca hoy: ${nombres.join(", ")}`, texto: "Cómetelo hoy o tíralo." });
  }
  return avisos.filter((a) => a.cuando > ahora);
}

export async function pedirPermiso(): Promise<boolean> {
  if (esNativo()) return (await LocalNotifications.requestPermissions()).display === "granted";
  if (!("Notification" in window)) return false;
  return (await Notification.requestPermission()) === "granted";
}

export async function tienePermiso(): Promise<boolean> {
  if (esNativo()) return (await LocalNotifications.checkPermissions()).display === "granted";
  return "Notification" in window && Notification.permission === "granted";
}

let temporizadores: number[] = [];

/** Borra los avisos anteriores y programa los siguientes. */
export async function reprogramar(datos: Datos) {
  const avisos = calcularAvisos(datos);
  if (esNativo()) {
    if (!(await tienePermiso())) return 0;
    const pendientes = await LocalNotifications.getPending();
    if (pendientes.notifications.length) await LocalNotifications.cancel({ notifications: pendientes.notifications.map((n) => ({ id: n.id })) });
    if (avisos.length) {
      await LocalNotifications.schedule({
        notifications: avisos.map((a) => ({
          id: a.id, title: a.titulo, body: a.texto,
          schedule: { at: a.cuando, allowWhileIdle: true },
          smallIcon: "ic_stat_taper", iconColor: "#2346D8",
        })),
      });
    }
    return avisos.length;
  }
  temporizadores.forEach(clearTimeout);
  temporizadores = [];
  if (!(await tienePermiso())) return 0;
  const limite = Date.now() + 12 * 3600_000;
  for (const a of avisos.filter((x) => x.cuando.getTime() < limite)) {
    temporizadores.push(window.setTimeout(() => void mostrarWeb(a.titulo, a.texto), a.cuando.getTime() - Date.now()));
  }
  return temporizadores.length;
}

async function mostrarWeb(titulo: string, texto: string) {
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (reg) await reg.showNotification(titulo, { body: texto, icon: "./icon-192.png" });
  else new Notification(titulo, { body: texto, icon: "./icon-192.png" });
}

/** Aviso de prueba a los 5 segundos. */
export async function avisoDePrueba() {
  if (!(await pedirPermiso())) return false;
  const titulo = "Comida: Curry de garbanzos", texto = "Así se verán los avisos de la nevera.";
  if (esNativo()) {
    await LocalNotifications.schedule({ notifications: [{ id: 1, title: titulo, body: texto, schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }, smallIcon: "ic_stat_taper", iconColor: "#2346D8" }] });
  } else {
    setTimeout(() => void mostrarWeb(titulo, texto), 5000);
  }
  return true;
}
