/* ============================================================
   Copia de seguridad en archivo, "por si se borra todo".
   Guarda TODO (plan, animalitos, decisiones, recetas, alimentos, diario) en un .json:
   - APK (Capacitor): escribe el archivo y abre el menú de compartir (Drive, WhatsApp, correo…).
   - Artifact de claude.ai: pide permiso para descargar el archivo.
   - Web/PWA: descarga normal del navegador.
   Para recuperar: Ajustes → Recuperar copia → elegir el archivo.
   ============================================================ */
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { Datos } from "./almacen";
import { exportar } from "./almacen";

const CLAVE_ULTIMO = "comemos-rali-ultimo-respaldo";

export const nombreArchivo = () => `comemos-rali-respaldo-${new Date().toISOString().slice(0, 10)}.json`;

export function ultimoRespaldo(): Date | null {
  try { const v = localStorage.getItem(CLAVE_ULTIMO); return v ? new Date(v) : null; } catch { return null; }
}
function apuntarRespaldo() {
  try { localStorage.setItem(CLAVE_ULTIMO, new Date().toISOString()); } catch { /* sin espacio: no pasa nada */ }
}

/** Días desde la última copia (null si nunca). */
export function diasSinRespaldo(): number | null {
  const u = ultimoRespaldo();
  return u ? Math.floor((Date.now() - u.getTime()) / 86_400_000) : null;
}

type Resultado = "guardado" | "cancelado" | "error";

export async function guardarRespaldo(datos: Datos): Promise<Resultado> {
  const texto = exportar(datos);
  const nombre = nombreArchivo();

  // 1) APK: archivo en la caché de la app + menú de compartir.
  if (Capacitor.isNativePlatform()) {
    try {
      const f = await Filesystem.writeFile({ path: nombre, data: texto, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title: "Copia de Comemos · Rali", text: "Guárdala en Drive o envíatela para no perder nada.", files: [f.uri], dialogTitle: "Guardar copia en…" });
      apuntarRespaldo();
      return "guardado";
    } catch (e) {
      return String((e as Error)?.message ?? e).toLowerCase().includes("cancel") ? "cancelado" : "error";
    }
  }

  // 2) Dentro de un artifact de claude.ai: capacidad de descargas.
  const claude = (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude;
  if (claude?.use) {
    const descargas = (await claude.use("downloads").catch(() => null)) as { save: (r: { filename: string; data: string }) => Promise<unknown> } | null;
    if (descargas) {
      try { await descargas.save({ filename: nombre, data: texto }); apuntarRespaldo(); return "guardado"; }
      catch (e) { return (e as { code?: string })?.code === "declined" ? "cancelado" : "error"; }
    }
  }

  // 3) Navegador normal.
  try {
    const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    apuntarRespaldo();
    return "guardado";
  } catch {
    return "error";
  }
}

/** Lee un archivo elegido por el usuario y devuelve su texto. */
export const leerArchivo = (f: File) => f.text();
