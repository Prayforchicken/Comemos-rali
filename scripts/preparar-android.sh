#!/usr/bin/env bash
# Prepara el proyecto Android de Capacitor a partir del build web (dist/).
# Lo usa el workflow de GitHub; también funciona en local si tienes el SDK de Android.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d android ] || npx cap add android

# Iconos y pantalla de carga a partir de resources/
npx --yes @capacitor/assets@3.0.5 generate --android \
  --iconBackgroundColor '#F7B3C4' --splashBackgroundColor '#FFF8F5' --splashBackgroundColorDark '#2A2130'

# Icono pequeño de las notificaciones (huellita)
cp -r android-extra/res/. android/app/src/main/res/

# Permisos para avisos a la hora exacta y tras reiniciar el móvil.
# USE_EXACT_ALARM (Android 13+) se concede solo al instalar: sin él, Android 14 niega las alarmas
# exactas por defecto y los avisos no llegaban con la app cerrada. (Es una APK de uso personal,
# fuera de Google Play, así que la restricción de Play para este permiso no aplica.)
MANIFEST=android/app/src/main/AndroidManifest.xml
for P in SCHEDULE_EXACT_ALARM USE_EXACT_ALARM POST_NOTIFICATIONS RECEIVE_BOOT_COMPLETED WAKE_LOCK; do
  grep -q "android.permission.$P" "$MANIFEST" || sed -i "s#</manifest>#    <uses-permission android:name=\"android.permission.$P\" />\n</manifest>#" "$MANIFEST"
done

# Número de versión: cada compilación sube, así la APK nueva se instala encima de la anterior
N="${GITHUB_RUN_NUMBER:-1}"
sed -i "s/versionCode [0-9]*/versionCode $N/; s/versionName \"[^\"]*\"/versionName \"0.1.$N\"/" android/app/build.gradle

npx cap sync android
