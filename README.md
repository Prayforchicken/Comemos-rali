# Comemos · Rali

**Comemos** completo (la interfaz "pro") hecho solo para Rali, con la estética de bullet journal pastel y animalitos que se alegran cuando cumple su plan.
Web instalable (PWA, en Vercel) y APK de Android con notificaciones.

## Qué hace

- **Navegación**: abajo lo del día a día (**Hoy, Diario, Mascotas, Menú**); en el menú hamburguesa de arriba, lo de vez en cuando (**Mi semana, Actividad, Ajustes**).
- **Hoy**: energía estimada (basal + vida + actividad), las 4 comidas con sus gramos, recetas y aprendizaje, gimnasio con su plan de sesión, agua y suplementos. Al marcar una comida se registra cuánto se comió, el hambre, si estaba rica, gramos servidos y nota.
- **Menú**: en cada toma se elige la receta que toca y, en comida y cena, su **acompañamiento** (el hidrato que completa el batch). Las recetas tienen tipo: *batch*, *acompañamiento*, *de congelador*, *desayuno* u *otra*. La app calcula cuántos gramos de cada una tocan con el objetivo del día y el reparto de comidas. Un menú vale desde el día que se guarda (no reescribe días pasados); sin menú manda el plan de Comemos. Código en `src/menu/` y `src/pantallas/Menu.tsx` + `Recetario.tsx`.
- **Cheat meals**: grupos sin pesar ("Pizza", "Hamburguesa del burger"…) con calorías aproximadas. Todas las pizzas van a "Pizza" y listo.
- **Decisiones por comida** (no por día): en Hoy, **manteniendo pulsada** una comida (o con "Cambiar") se elige: volver a *lo que toca*, *otra receta*, *ajustar solo hoy* (quitar el pan o el azúcar sin crear una receta nueva), *sobras*, *cheat meal* u *otra cosa*. Dan el bonus de seguir el plan (+10): lo que toca aunque se ajuste, cambiar un batch por otro batch, y las sobras del batch de estos días. El resto, +8. Viven en `src/decisiones/` y se guardan aparte del plan, así el JSON de Comemos no cambia.
- **Diario → Mi día**: diario personal con cómo se siente (1–5), emociones y qué ha pasado; varios apuntes al día y resumen de la semana.
- **Diario → Comida / Raciones (mini MyFitnessPal)**: lo comido frente al objetivo (energía, proteína, fibra) y extras y picoteos. El recetario y los alimentos guardados están en **Menú**. En "Otra cosa" se apuntan alimentos reales con sus gramos.
- **Alimentos**: buscador en la base abierta de [wger](https://wger.de) (en la APK y la web; dentro de claude.ai no hay salida a internet), una base local de ~40 alimentos comunes con valores aproximados, y alimentos creados a mano. Los de wger que se usan se guardan para tenerlos sin conexión. Código en `src/alimentos/`.
- **Huellitas** (solo en positivo): comida "lo que hay" del plan +10; otra cosa, otra receta o sobras +8 (sin el bonus de seguir el plan); gimnasio +25, agua +5, día completo (4 comidas apuntadas) +15. No cumplir no resta nada.
- **Mascotas**: necesidades con corazoncitos. Cada animalito tiene **carácter** (Marmota, Tragaldabas, Pura ternura, Cotilla, Postureo, Cascarrabias) y **dice cosas** según su ánimo, especie, la hora y tu día (`src/juego/frases.ts`). Su **energía es la de Rali**: sale de sus actividades (trabajo, batch cooking, gimnasio…) y de sus horas de sueño; tras un día muy cargado amanece cansadito (`src/juego/energia.ts`). No se cuida y nunca quita regalos. Gatito al empezar (pelajes: melocotón, nata, humo, fresita, europeo atigrado y blanco con manchitas). Al ganar 120 / 350 / 700 huellitas en total (y luego cada 500) llega un animalito **al azar** que se puede adoptar o dejar pasar. Nombre y aspecto se cambian cuando quieras.
- **Chuches para Rali**: un animalito con todo bien cubierto (≥ 60) durante 36 h acumuladas trae una chuche *para Rali*. Se canjea (se gasta) y Adrián va a comprarle algo rico; la app permite avisarle y marcar cuando ya lo trajo.
  Especies: gatito, ratita, mapache, urraca y cuervo. Cada mascota sube el bonus (x1, x1,25, x1,5, x1,75). Necesidades tipo tamagotchi que nunca llegan a cero: no mueren ni enferman.
- **Chuches** (al final de Mascotas): se compran con huellitas. Cada especie tiene su favorita.
- **Semana**: días con su energía, tracker de bullet journal, batch de 4 días (recetas, gramos, pasos), escalera de emergencia y días con más carga.
- **Actividad**: reglas semanales (trabajo, caminar, bici, gimnasio…), MET o calorías fijas, quitar solo un día, plan de sesión y JSON individual.
- **Diario → Aprendizaje**: lo aprendido de cada ración, peso de referencia, historial editable de comidas y huellitas ganadas.
- **Ajustes**: avisos, perfil completo (objetivo, límites, reparto del día, sueño), ciclo de cocina, suplementos y copia JSON (compatible con el JSON de Comemos).

## Estructura

```
src/
  comemos/      Motor del plan copiado tal cual de Comemos (models, engine, default-data). No tocar aquí la lógica de la app.
  juego/        Reglas del juego (reglas.ts: todos los números), tipos y motor (funciones puras).
  acciones.ts   Acciones que tocan plan + juego a la vez (comer, gimnasio, agua…).
  juego/energia.ts  Energía de Rali (y de sus mascotas) a partir de su día.
  juego/frases.ts   Carácter y frases de los animalitos.
  alimentos/    Alimentos (tipos, base local, cliente de wger) y cuentas de nutrición.
  menu/         Menú (receta + acompañamiento por toma), tipos de receta y cheat meals.
  decisiones/   Qué se come en cada toma (lo que toca, otra receta, ajuste de hoy, sobras, cheat, otra cosa) y quién da bonus.
  datos/        Guardado local en el móvil y copia JSON.
  avisos/       Notificaciones (APK: programadas de verdad; web: solo con la app abierta).
  sprites/      Dibujos de mascotas y chuches (del sistema de diseño "Mascotas de Rali").
  componentes/  Piezas de interfaz reutilizables (base.tsx: botones, hojas, campos, interruptores…).
  pantallas/    Una pantalla por sección: Hoy, Diario (+ Registro), Mascotas (+ Tienda), Menú (+ Recetario), Semana, Actividad, Ajustes.
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

## Copias de seguridad

Ajustes → **Guardar copia en archivo** guarda todo en un `.json` (en la APK abre el menú de compartir para mandarlo a Drive o WhatsApp). **Recuperar desde archivo** lo devuelve todo, también en otro móvil. La app recuerda cuándo fue la última copia y avisa en Hoy si pasa más de una semana.

## Límites de la versión de pruebas

- Los datos viven en el móvil; no se sincronizan con el Comemos compartido. Se pasan con las copias de seguridad.
- En la web, los avisos solo llegan con la app abierta. Los avisos fiables son los de la APK.
- En la APK, algunos móviles (Xiaomi, Samsung…) cortan los avisos para ahorrar batería: Ajustes del móvil → Apps → Comemos Rali → Batería sin restricciones.
