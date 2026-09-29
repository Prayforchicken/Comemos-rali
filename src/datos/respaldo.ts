/* ============================================================
   Copia de seguridad en archivo, "por si se borra todo".
   - APK (Capacitor): escribe el archivo y abre el menú de compartir (Drive, WhatsApp, correo…).
   - Vista previa en claude.ai: pide permiso para descargar el archivo.
   - Web/PWA: descarga normal del navegador.
   ============================================================ */
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { Datos } from "../nucleo/tipos";
import { exportar } from "./almacen";

const CLAVE_ULTIMO = "comemos-adrian-ultimo-respaldo";

const nombreArchivo = () => `comemos-adrian-${new Date().toISOString().slice(0, 10)}.json`;

export function diasSinRespaldo(): number | null {
  try {
    const v = localStorage.getItem(CLAVE_ULTIMO);
    return v ? Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000) : null;
  } catch { return null; }
}
function apuntar() { try { localStorage.setItem(CLAVE_ULTIMO, new Date().toISOString()); } catch { /* da igual */ } }

export type Resultado = "guardado" | "cancelado" | "error";

export async function guardarRespaldo(datos: Datos): Promise<Resultado> {
  const texto = exportar(datos);
  const nombre = nombreArchivo();

  if (Capacitor.isNativePlatform()) {
    try {
      const f = await Filesystem.writeFile({ path: nombre, data: texto, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title: "Copia de Comemos · Adrián", files: [f.uri], dialogTitle: "Guardar copia en…" });
      apuntar();
      return "guardado";
    } catch (e) {
      return String((e as Error)?.message ?? e).toLowerCase().includes("cancel") ? "cancelado" : "error";
    }
  }

  const claude = (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude;
  if (claude?.use) {
    const descargas = (await claude.use("downloads").catch(() => null)) as { save: (r: { filename: string; data: string }) => Promise<unknown> } | null;
    if (descargas) {
      try { await descargas.save({ filename: nombre, data: texto }); apuntar(); return "guardado"; }
      catch (e) { return (e as { code?: string })?.code === "declined" ? "cancelado" : "error"; }
    }
  }

  try {
    const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    apuntar();
    return "guardado";
  } catch {
    return "error";
  }
}

/** Copia texto: en la APK abre compartir (para mandarlo a Notas o WhatsApp); fuera, al portapapeles. */
export async function compartirTexto(titulo: string, texto: string): Promise<"compartido" | "copiado" | "error"> {
  if (Capacitor.isNativePlatform()) {
    try { await Share.share({ title: titulo, text: texto, dialogTitle: titulo }); return "compartido"; } catch { return "error"; }
  }
  try { await navigator.clipboard.writeText(texto); return "copiado"; } catch { return "error"; }
}
