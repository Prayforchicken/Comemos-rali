# Comemos · Adrián

La versión de Comemos para Adrián. Una sola pregunta: **¿qué hay en la nevera y qué como?**
Web instalable (PWA, en Vercel) y APK de Android con avisos.

## Cómo se usa

1. **Nevera vacía.** La app propone un batch para 2 días (4 raciones; cada ración se ajusta a lo que
   toca en una comida o cena). Dice para qué tomas da. Los ingredientes, plegados, salen con gramos
   y unidades de cocina ("≈ 3 botes de 400 g"); marcas lo que tienes y copias lo que falta.
2. **"Lo hago".** Cada parte de la receta va a su táper, con su tipo:
   **P** (plato de proteína, el curry), **H** (guarnición de hidratos, el arroz) o **P.C.** (plato combinado,
   la boloñesa con la pasta). La app estima cuánto pesa lo cocinado; lo corriges pesando el táper.
3. **Tu plato.** Eliges los tápers, pones el plato en la báscula y escribes los gramos de cada uno.
   Al momento ves kcal, proteína, hidratos y grasa frente a lo que toca en esa comida o cena:
   en rojo lo que falta (y cuántos gramos más de qué táper lo cubren), en blanco lo que sobra.
   "Apuntar" descuenta los gramos del táper y guarda cuánto comiste de cada cosa ese día.
   Si comes otra cosa (pizza, un bocata…), quitas los tápers con × y añades "+ Otra cosa":
   cuenta en los macros y esa comida o cena queda hecha sin tocar la nevera.
4. **Para Rali o a la basura**, también en gramos, desde el detalle del táper. Todo se cuenta.
5. **Semana.** Qué comes en cada toma de los próximos 7 días y qué día vuelves a cocinar.

Además:
- **En la nevera**: cada táper con su tipo, lo que queda, sus macros por 100 g y una cuenta atrás hasta que caduca
  ("Caduca en 2 días"). Va ordenada por caducidad: lo primero es lo que antes hay que comer o tirar.
  Mañana o hoy sale en ámbar ("cómetelo ya"); caducado, en rojo ("a la basura"). La fecha se cambia en el detalle.
- **Caducidad**: cada receta dice cuántos días aguanta (y cada parte los suyos: el arroz, 3). Las sobras a mano
  llevan la suya. Lo caducado no se propone en el plato ni se planea en la semana.
- **Comido hoy**: lo apuntado con sus gramos, macros del día y botones rápidos (Plenny, "otra cosa").
- **Recetas**: 8 de batch vegetarianas; se proponen por turnos. Recetas propias como plato combinado
  o como principal + guarnición.
- **Cuentas**: gramos comidos, para Rali y tirados (7 días, 30 días, siempre), por táper, kcal por día.
- **Avisos** (APK): a la hora de comer y cenar, qué tápers tocan; la tarde en que toca cocinar, qué receta;
  a las 11:00 del día que caduca algo, "Caduca hoy".
- **Copia de seguridad** en archivo (Ajustes). Las copias antiguas (en raciones) se pasan solas a gramos.

## Estructura

```
src/
  nucleo/        La lógica, sin pantallas (funciones puras, con pruebas en pruebas/).
    tipos.ts       Qué se guarda: Receta (con sus partes), Lote (un táper), Salida (gramos que salen), Ajustes.
    receta.ts      Tipos P / H / P.C., macros de una ración y peso estimado de lo cocinado.
    lotes.ts       La nevera: cocinar, sacar gramos, pesar, caducidad y a qué tomas da lo que hay.
    plato.ts       Tu plato: macros de lo pesado frente a lo que toca, qué falta y qué sobra.
    semana.ts      Plan de 7 días y cuándo volver a cocinar.
    propuesta.ts   Qué cocinar: turno de recetas y lista de ingredientes con unidades.
    dia.ts         Lo comido en un día (gramos de los tápers + extras).
    cuentas.ts     Gramos comidos / Rali / basura y kcal de los últimos días.
    fechas.ts      Fechas y horas (hora de España).
  recetas/       Las recetas de la app, por partes. Cantidades en crudo POR RACIÓN.
  alimentos/     Base local de alimentos (por 100 g y cuánto pesan hechos), buscador de wger, cuentas.
  datos/         Guardado en el móvil, copia de seguridad y paso de la versión 1 a la 2.
  avisos/        Notificaciones (APK: programadas de verdad; web: con la app abierta).
  componentes/   Piezas de interfaz (botones, hojas, buscador, detalle de un táper).
  pantallas/     Una pantalla por pestaña: Hoy, Semana, Recetas, Cuentas, Ajustes.
  estilos.css    Todos los estilos (claro y oscuro).
pruebas/         Pruebas de la lógica: `npm test`.
scripts/         Iconos y preparación del proyecto Android.
.github/workflows/apk-adrian.yml   Compila la APK en GitHub y la publica en Releases.
```

Para añadir una receta: copia un bloque en `src/recetas/recetas.ts` con ingredientes de `src/alimentos/base.ts`.
Lo que toca en cada comida o cena sale del objetivo diario y del reparto de Ajustes (`objetivoToma()` en `src/nucleo/plato.ts`).

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
- Las kcal y macros de las recetas son aproximadas (tablas de referencia por 100 g). El peso de lo cocinado
  es una estimación hasta que pesas el táper.
- En la web, los avisos solo llegan con la app abierta. Los fiables son los de la APK.
