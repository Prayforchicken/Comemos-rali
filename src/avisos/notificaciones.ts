/* ============================================================
   Notificaciones.
   - En la APK (Capacitor): notificaciones locales programadas de verdad,
     suenan aunque la app esté cerrada. Se reprograman cada vez que se abre
     o se vuelve a ella, para los próximos DIAS_PROGRAMADOS días.
     · Canal propio con importancia alta (si no, Android las esconde).
     · Alarmas exactas: la APK declara USE_EXACT_ALARM (scripts/preparar-android.sh).
       Si aun así el móvil no las permite, se programan como "inexactas" (pueden
       llegar unos minutos tarde) en vez de abrir la pantalla de ajustes en cada
       reprogramación, que era lo que dejaba la app sin ningún aviso programado.
   - En la PWA (navegador): solo mientras la app está abierta o en segundo plano
     reciente; los navegadores no permiten programar avisos a futuro.
   Los textos son siempre en positivo: recuerdan, no riñen.
   ============================================================ */
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { activitiesForDay, shiftIsoDate, slotLabel, todayInTimezone } from "../comemos/engine";
import { diaDecidido } from "../decisiones/decisiones";
import type { Datos } from "../datos/almacen";

export const esNativo = () => Capacitor.isNativePlatform();

interface Aviso { id: number; cuando: Date; titulo: string; texto: string }

const DIAS_PROGRAMADOS = 7;
const CANAL = "avisos";

function aFecha(fecha: string, hhmm: string) {
  const [y, mo, d] = fecha.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0);
}

/** Calcula los avisos de los próximos días a partir del plan y las mascotas. */
export function calcularAvisos({ plan, juego, decisiones }: Datos, ahora = new Date()): Aviso[] {
  const hoy = todayInTimezone(plan.settings.timezone);
  const mascota = juego.mascotas.find((m) => m.id === juego.activaId) ?? juego.mascotas[0];
  const quien = mascota?.nombre ?? "Tu gatito";
  const avisos: Aviso[] = [];
  for (let i = 0; i < DIAS_PROGRAMADOS; i++) {
    const fecha = shiftIsoDate(hoy, i);
    const base = Number(fecha.replaceAll("-", "").slice(2)) * 10; // id estable por día
    if (juego.avisos.comidas) {
      diaDecidido(plan, decisiones, fecha).forEach((comida, j) => {
        avisos.push({
          id: base + j,
          cuando: aFecha(fecha, comida.time),
          titulo: `${slotLabel(comida.slot)}: ${comida.template.shortName}`,
          texto: comida.libre ? `${quien} te guarda +10 huellitas. ¡Que aproveche!` : `${comida.grams} g · ${quien} te guarda +10 huellitas.`,
        });
      });
    }
    if (juego.avisos.gimnasio) {
      const gym = activitiesForDay(plan, "rali", fecha).find((a) => a.category === "gym");
      if (gym) {
        const c = aFecha(fecha, gym.start);
        c.setMinutes(c.getMinutes() - 60);
        avisos.push({ id: base + 5, cuando: c, titulo: "Gimnasio en una hora", texto: `${quien} ya está calentando. Vale +25 huellitas.` });
      }
    }
    if (juego.avisos.mascotas && mascota) {
      avisos.push({ id: base + 6, cuando: aFecha(fecha, "21:45"), titulo: `${quien} quiere verte`, texto: "Pásate a darle un mimo antes de dormir." });
    }
  }
  return avisos.filter((a) => a.cuando > ahora);
}

export async function pedirPermiso(): Promise<boolean> {
  if (esNativo()) {
    const r = await LocalNotifications.requestPermissions();
    return r.display === "granted";
  }
  if (!("Notification" in window)) return false;
  return (await Notification.requestPermission()) === "granted";
}

export async function tienePermiso(): Promise<boolean> {
  if (esNativo()) return (await LocalNotifications.checkPermissions()).display === "granted";
  return "Notification" in window && Notification.permission === "granted";
}

/** ¿Se pueden programar a la hora exacta? (Android 12+; en el resto siempre sí). */
export async function avisosExactos(): Promise<boolean> {
  if (!esNativo()) return true;
  try { return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === "granted"; } catch { return true; }
}
/** Abre la pantalla de Android "Alarmas y recordatorios" para permitirlos. */
export async function pedirAvisosExactos(): Promise<boolean> {
  if (!esNativo()) return true;
  try { return (await LocalNotifications.changeExactNotificationSetting()).exact_alarm === "granted"; } catch { return false; }
}

/** Primera vez en la APK: pide el permiso de notificaciones sin esperar a que Rali lo busque en Ajustes. */
export async function pedirPermisoSiNuncaSePidio(): Promise<void> {
  if (!esNativo()) return;
  const p = await LocalNotifications.checkPermissions();
  if (p.display === "prompt" || p.display === "prompt-with-rationale") await LocalNotifications.requestPermissions();
}

let canalListo = false;
async function prepararCanal() {
  if (canalListo) return;
  await LocalNotifications.createChannel({
    id: CANAL, name: "Comidas y mascotas", description: "Recordatorios de comidas, gimnasio y de tus animalitos",
    importance: 4, visibility: 1, vibration: true, lights: true, lightColor: "#E26F92",
  });
  canalListo = true;
}

let temporizadores: number[] = [];

/** Borra los avisos anteriores y programa los de los próximos días. */
export async function reprogramar(datos: Datos) {
  const avisos = calcularAvisos(datos);
  if (esNativo()) {
    if (!(await tienePermiso())) return 0;
    await prepararCanal();
    // Sin permiso de alarmas exactas, "exacta" haría que Android abra sus ajustes en cada
    // reprogramación y, si no se vuelve bien, nada queda programado. Mejor inexacta que ninguna.
    const exacta = await avisosExactos();
    const pendientes = await LocalNotifications.getPending();
    if (pendientes.notifications.length) await LocalNotifications.cancel({ notifications: pendientes.notifications.map((n) => ({ id: n.id })) });
    if (avisos.length) {
      await LocalNotifications.schedule({
        notifications: avisos.map((a) => ({
          id: a.id, title: a.titulo, body: a.texto, channelId: CANAL,
          schedule: { at: a.cuando, allowWhileIdle: true },
          isExactNotification: exacta,
          smallIcon: "ic_stat_huellita", iconColor: "#E26F92",
        })),
      });
    }
    return avisos.length;
  }
  // Web: temporizadores solo para las próximas 12 h, mientras la pestaña siga viva.
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
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) await reg.showNotification(titulo, { body: texto, icon: "./icon-192.png", badge: "./icon-192.png" });
  else new Notification(titulo, { body: texto, icon: "./icon-192.png" });
}

/** Aviso de prueba inmediato (a los 5 segundos) para comprobar que funcionan. */
export async function avisoDePrueba(nombre: string) {
  if (!(await pedirPermiso())) return false;
  const titulo = `¡Hola desde ${nombre}!`, texto = "Así se verán los recordatorios de comidas.";
  if (esNativo()) {
    await prepararCanal();
    const exacta = await avisosExactos();
    await LocalNotifications.schedule({ notifications: [{ id: 1, title: titulo, body: texto, channelId: CANAL, schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }, isExactNotification: exacta, smallIcon: "ic_stat_huellita", iconColor: "#E26F92" }] });
  } else {
    setTimeout(() => void mostrarWeb(titulo, texto), 5000);
  }
  return true;
}
