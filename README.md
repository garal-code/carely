# Carely

App Android (Expo + React Native) para seguir el menú semanal de la guardería de tu hijo y recibir una **propuesta de cena equilibrada** para cada día.

1. Subes el menú de la guardería (foto o PDF).
2. Una IA (Claude por defecto, o ChatGPT) lo lee, extrae las comidas de cada día y propone una cena que complementa lo que ha comido, respetando las alergias, la edad y los gustos del perfil del niño.
3. Ves la semana día a día, con avisos si algún plato de la guardería puede contener un alérgeno del perfil.

## Probar la app solo con el móvil

Primero despliega el servidor y conéctalo (secciones de abajo). Después, cada
vez que se sube código a GitHub (ramas `main`, `develop` o `claude/...`), el workflow
`.github/workflows/android-apk.yml` compila un APK y lo publica en la sección
**Releases** del repositorio (tarda unos 15–20 minutos):

1. En el navegador del móvil abre `github.com/garal-code/carely/releases`.
2. Descarga `carely.apk` de la build más reciente.
3. Ábrelo y acepta instalar apps de origen desconocido para tu navegador.

El APK funciona sin ordenador ni servidor de desarrollo. Está firmado con una
clave de pruebas, así que sirve para tu móvil pero no para Google Play.

## Puesta en marcha (con ordenador)

Requisitos: Node 20+ y la app **Expo Go** en el móvil Android (Play Store).

```bash
npm install
npm start          # abre Metro; escanea el QR con Expo Go
npm run android    # o lánzalo en un emulador Android
npm run web        # vista previa rápida en el navegador
```

Para la app en local crea un `.env` (ver `.env.example`) apuntando al servidor.
Servidor en local:

```bash
cd server
npm install
ANTHROPIC_API_KEY=sk-ant-... APP_TOKEN=dev npm run dev
```

Comprobaciones:

```bash
npm run typecheck
npm run lint
npm run typecheck --prefix server
npx expo-doctor
```

## Cómo funciona por dentro

```
App Android ──HTTPS──▶ Servidor Carely (Railway) ──▶ Claude / ChatGPT
```

Las familias no necesitan ninguna cuenta de IA: la app envía la foto o el PDF
al servidor de Carely, que es quien tiene la clave de API y la paga. El
servidor vive en `server/` y se despliega en Railway.

## Desplegar el servidor en Railway

Se puede hacer todo desde el navegador del móvil.

1. Consigue una clave de API de Claude en https://platform.claude.com/settings/keys
   y añade algo de saldo (cada menú cuesta del orden de céntimos).
2. En Railway: **New Project → Deploy from GitHub repo → garal-code/carely**.
3. En el servicio creado, **Settings → Root Directory**: `server`.
4. En **Variables** añade:
   - `ANTHROPIC_API_KEY`: la clave del paso 1.
   - `APP_TOKEN`: una contraseña larga inventada (p. ej. 40 letras y números al azar).
5. **Settings → Networking → Generate Domain**. Copia la URL
   (`https://carely-xxxx.up.railway.app`) y comprueba que `…/health` responde
   `{"ok":true}`.

Variables opcionales: `AI_PROVIDER=openai` + `OPENAI_API_KEY` para usar
ChatGPT, `CLAUDE_MODEL` / `OPENAI_MODEL` para cambiar de modelo y
`RATE_LIMIT_PER_HOUR` (20 por defecto) para limitar análisis por IP. Ver
`server/.env.example`.

## Conectar la app con el servidor

En GitHub, **Settings → Secrets and variables → Actions**:

- Pestaña **Variables** → `CARELY_API_URL` = la URL de Railway.
- Pestaña **Secrets** → `CARELY_APP_TOKEN` = el mismo valor que `APP_TOKEN`.

La build del APK los incrusta en la app. Si cambias alguno, vuelve a lanzar el
workflow **Android APK** desde la pestaña Actions.

> El `APP_TOKEN` evita que cualquiera use tu servidor, pero va dentro del APK,
> así que no es una protección fuerte. Antes de publicar la app para el
> público habría que añadir cuentas de usuario o la verificación de Google Play
> (Play Integrity).

## Estructura

```
src/                    App (Expo Router)
  app/(tabs)/index.tsx  Semana: menú actual por días + histórico
  app/(tabs)/upload.tsx Subir foto/PDF y analizar
  app/(tabs)/profile.tsx Perfil del niño (edad, alergias, dieta, gustos)
  app/menu/[id].tsx     Detalle de un menú guardado
  lib/api.ts            Llamada al servidor de Carely
  context/AppContext.tsx Estado global y persistencia
server/                 API (Node + Express) para Railway
  src/index.ts          Endpoint POST /v1/menus/analyze
  src/prompt.ts         Prompt de sistema + esquema JSON de la respuesta
  src/claude.ts         Llamada a Claude (imagen/PDF + salida estructurada)
  src/openai.ts         Llamada a OpenAI (Responses API)
```

Los datos (perfil, menús) se guardan solo en el móvil con AsyncStorage; el servidor no guarda nada.

## Próximos pasos posibles

- Varios perfiles (hermanos).
- Lista de la compra semanal a partir de las cenas.
- Regenerar la cena de un día concreto o pedir alternativas.
- Notificación por la tarde con la cena del día.
- Build instalable con EAS (`npx eas-cli@latest build -p android --profile preview`).

---

Las propuestas de la IA son orientativas y no sustituyen el consejo de tu pediatra.
