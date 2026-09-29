# Comemos · Adrián

La versión de Comemos para Adrián. Una sola pregunta: **¿qué hay en la nevera y qué como?**
Web instalable (PWA, en Vercel) y APK de Android con avisos.

## Cómo se usa

1. **"Hoy no tengo nada."** Abres la app y te propone un **batch para 2 días** (4 raciones: comida y cena).
   Te dice para qué tomas da ("hoy cena · mañana comida y cena · jue comida").
2. **Mira en la nevera.** Los ingredientes salen como lista `- [ ]` con los gramos para esas raciones
   (y en unidades de cocina: "≈ 3 botes de 400 g", "4 dientes"). Marcas lo que tienes; lo que queda sin marcar
   es lo que te falta, y se copia de un toque para la compra.
3. **"Lo hago".** El batch pasa a la nevera y desde ese momento es **lo primero que ves** al abrir la app,
   con la etiqueta del táper (hecho hoy / ayer / hace 3 días), hasta que se acaban las raciones.
4. **Cada ración termina en uno de tres sitios:** *Me la como* (suma kcal y macros al día),
   *Para Rali* o *A la basura*. Todo se cuenta. Si te equivocas, **Deshacer**.
5. Cuando queda 1 ración, te enseña ya el **siguiente batch** para que mires qué te falta.

Además:
- **Hoy llevas**: kcal, proteína, hidratos, grasa y fibra del día frente a tu objetivo. Botones rápidos para
  Plenny Pro, ½ Plenny y "otra cosa" (buscador con base local y wger).
- **Frescura**: a los 3–4 días el táper avisa "cómetelo ya"; a los 5, "mejor tirarlo".
- **¿Ya tienes algo hecho?** Sobras o algo que no está en la app se meten en la nevera a mano.
- **Recetas**: 8 recetas de batch vegetarianas (~720–850 kcal y 38–53 g de proteína por ración).
  Se proponen por turnos (primero las que nunca has hecho). Puedes apartar las que no quieras y crear las tuyas.
- **Cuentas**: raciones comidas, para Rali y tiradas (7 días, 30 días, siempre), por receta,
  kcal de los últimos 7 días e historial de tápers.
- **Avisos** (APK): a la hora de comer y cenar, qué táper toca; y la tarde que se acaba la nevera, "toca batch".
- **Copia de seguridad** en archivo (Ajustes).

## Estructura

```
src/
  nucleo/        La lógica, sin pantallas (funciones puras, con pruebas en pruebas/).
    tipos.ts       Qué se guarda: Receta, Lote (táper en la nevera), Salida (a dónde fue cada ración), Ajustes.
    lotes.ts       La nevera: cocinar, sacar una ración, deshacer, frescura y a qué tomas da cada táper.
    propuesta.ts   Qué cocinar: turno de recetas, "otra idea" y la lista de ingredientes con unidades.
    dia.ts         Lo comido en un día (raciones comidas + extras).
    cuentas.ts     Raciones comidas / Rali / basura y kcal de los últimos días.
    fechas.ts      Fechas y horas (hora de España).
  recetas/       Las recetas de la app. Cantidades POR RACIÓN; las kcal salen solas de los ingredientes.
  alimentos/     Base local de alimentos (por 100 g), buscador de wger y cuentas de nutrición.
  datos/         Guardado en el móvil y copia de seguridad.
  avisos/        Notificaciones (APK: programadas de verdad; web: con la app abierta).
  componentes/   Piezas de interfaz (botones, hojas, buscador, detalle de un táper).
  pantallas/     Una pantalla por pestaña: Hoy, Recetas, Cuentas, Ajustes.
  estilos.css    Todos los estilos (claro y oscuro).
pruebas/         Pruebas de la lógica: `npm test`.
scripts/         Iconos y preparación del proyecto Android.
.github/workflows/apk-adrian.yml   Compila la APK en GitHub y la publica en Releases.
```

Para añadir una receta de la app: copia un bloque en `src/recetas/recetas.ts` y usa ingredientes de
`src/alimentos/base.ts`. Para cambiar cuándo avisa de la frescura: `frescura()` en `src/nucleo/lotes.ts`.

## Publicar

Ahora mismo el código vive en la rama **`adrian`** del repositorio Comemos-rali (una app aparte, sin tocar `main`).
Para darle su propio repositorio: crear `Comemos-adrian` vacío en GitHub y `git push <nuevo> adrian:main`.

- **Web (Vercel)**: importar este repositorio en vercel.com. Detecta Vite solo (`npm run build`, carpeta `dist`).
- **APK**: cada `push` a `adrian` (o a `main` en su propio repo) compila la APK y la deja en *Releases*. Se instala encima de la anterior sin perder datos
  (la firma es fija: `firma/debug.keystore`, solo para pruebas). Es una app distinta de Comemos · Rali
  (`es.adrian.comemosadrian`), así que las dos pueden estar en el mismo móvil.

## Desarrollo

```sh
npm install
npm run dev     # abrir en el navegador
npm test        # pruebas de la lógica
npm run build   # comprobar tipos y compilar
```

## Límites

- Los datos viven en el móvil. Se pasan a otro con la copia de seguridad.
- Las kcal y macros de las recetas son aproximadas (tablas de referencia por 100 g).
- En la web, los avisos solo llegan con la app abierta. Los fiables son los de la APK.
