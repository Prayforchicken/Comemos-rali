# Comemos · Rali

**Comemos** completo (la interfaz "pro") hecho solo para Rali, con la estética de bullet journal pastel y animalitos que se alegran cuando cumple su plan.
Web instalable (PWA, en Vercel) y APK de Android con notificaciones.

## Qué hace

- **Hoy**: energía estimada (basal + vida + actividad), las 4 comidas con sus gramos, recetas y aprendizaje, gimnasio con su plan de sesión, agua y suplementos. Al marcar una comida se registra cuánto se comió, el hambre, si estaba rica, gramos servidos y nota.
- **Decisiones por comida** (no por día): en cada toma se elige *lo que hay*, *otra cosa* (pizza, comer fuera… sin pesar), *algo diferente* (otra receta, con su ración calculada) o *sobras* (de una receta, con su ración, o escritas a mano). Todas cuentan como lo del plan y dan huellitas; el batch de la semana descuenta las raciones que no se van a cocinar. Viven en `src/decisiones/` y se guardan aparte del plan, así el JSON de Comemos no cambia.
- **Huellitas** (solo en positivo): comida del plan +10, gimnasio +25, agua +5, día completo +15. No cumplir no resta nada.
- **Mascotas**: gatito al empezar (pelajes: melocotón, nata, humo, fresita, europeo atigrado y blanco con manchitas); rata, mapache y urraca aparecen con las huellitas *ganadas en total* (120 / 350 / 700).
  Cada mascota sube el bonus (x1, x1,25, x1,5, x1,75). Necesidades tipo tamagotchi que nunca llegan a cero: no mueren ni enferman.
- **Chuches** (al final de Mascotas): se compran con huellitas. Cada especie tiene su favorita.
- **Semana**: días con su energía, tracker de bullet journal, batch de 4 días (recetas, gramos, pasos), escalera de emergencia y días con más carga.
- **Actividad**: reglas semanales (trabajo, caminar, bici, gimnasio…), MET o calorías fijas, quitar solo un día, plan de sesión y JSON individual.
- **Registro**: lo aprendido de cada ración, peso de referencia, historial editable de comidas y huellitas ganadas.
- **Ajustes**: avisos, perfil completo (objetivo, límites, reparto del día, sueño), ciclo de cocina, suplementos y copia JSON (compatible con el JSON de Comemos).

## Estructura

```
src/
  comemos/      Motor del plan copiado tal cual de Comemos (models, engine, default-data). No tocar aquí la lógica de la app.
  juego/        Reglas del juego (reglas.ts: todos los números), tipos y motor (funciones puras).
  acciones.ts   Acciones que tocan plan + juego a la vez (comer, gimnasio, agua…).
  decisiones/   Qué se come en cada toma (lo que hay, otra cosa, algo diferente, sobras).
  datos/        Guardado local en el móvil y copia JSON.
  avisos/       Notificaciones (APK: programadas de verdad; web: solo con la app abierta).
  sprites/      Dibujos de mascotas y chuches (del sistema de diseño "Mascotas de Rali").
  componentes/  Piezas de interfaz reutilizables (base.tsx: botones, hojas, campos, interruptores…).
  pantallas/    Una pantalla por pestaña: Hoy, Mascotas (+ Tienda), Semana, Actividad, Registro, Ajustes.
  estilos-sistema.css  Colores y piezas del sistema de diseño "Mascotas de Rali" (claro y oscuro).
  estilos.css          Maquetación base.
  estilos-pro.css      Piezas de las pantallas completas (Actividad, Registro, batch…).
scripts/        Iconos y preparación del proyecto Android.
.github/workflows/apk.yml   Compila la APK en GitHub y la publica en Releases.
```

Para cambiar cuántas huellitas da cada cosa o cuánto tardan en tener hambre: `src/juego/reglas.ts`.

## Publicar

- **Web (Vercel)**: importar este repositorio en vercel.com. Detecta Vite solo (`npm run build`, carpeta `dist`).
- **APK**: cada `push` a `main` compila la APK y la deja en *Releases*. Se instala encima de la anterior sin perder datos
  (la firma es fija: `firma/debug.keystore`, solo para pruebas).

## Desarrollo

```sh
npm install
npm run dev
```

## Límites de la versión de pruebas

- Los datos viven en el móvil; no se sincronizan con el Comemos compartido. Se pueden pasar con Exportar/Importar.
- En la web, los avisos solo llegan con la app abierta. Los avisos fiables son los de la APK.
