# Carely

App Android (Expo + React Native) para seguir el menú semanal de la guardería de tu hijo y recibir una **propuesta de cena equilibrada** para cada día.

1. Subes el menú de la guardería (foto o PDF).
2. Una IA (Claude o ChatGPT, a elegir) lo lee, extrae las comidas de cada día y propone una cena que complementa lo que ha comido, respetando las alergias, la edad y los gustos del perfil del niño.
3. Ves la semana día a día, con avisos si algún plato de la guardería puede contener un alérgeno del perfil.

## Probar la app solo con el móvil

Cada vez que se sube código a GitHub (rama `main` o `claude/...`), el workflow
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

Comprobaciones:

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

## Configurar la IA

En la pestaña **Ajustes** eliges el proveedor y pegas tu clave de API:

| Proveedor | Dónde conseguir la clave | Modelo por defecto |
|---|---|---|
| Claude (Anthropic) | https://platform.claude.com/settings/keys | `claude-opus-5-5` (también Sonnet 5.5 y Haiku 5.5, más baratos) |
| ChatGPT (OpenAI) | https://platform.openai.com/api-keys | `gpt-6.1-sol` (editable) |

> **Importante:** las suscripciones de chat (Claude Pro/Max, ChatGPT Plus/Pro) **no** dan acceso a la API. Hace falta una cuenta de desarrollador con saldo de pago por uso en la plataforma de cada proveedor. Analizar un menú cuesta del orden de céntimos.

La clave se guarda cifrada en el dispositivo (`expo-secure-store`) y la app llama a la API directamente desde el móvil; no hay servidor intermedio.

Con Claude se activa el *fallback* del servidor (`fallbacks: "default"`): si los filtros de seguridad rechazaran una petición, la API la reintenta automáticamente con otro modelo.

## Estructura

```
src/
  app/                 Pantallas (Expo Router)
    (tabs)/index.tsx   Semana: menú actual por días + histórico
    (tabs)/upload.tsx  Subir foto/PDF y analizar
    (tabs)/profile.tsx Perfil del niño (edad, alergias, dieta, gustos)
    (tabs)/settings.tsx Proveedor de IA, clave y modelo
    menu/[id].tsx      Detalle de un menú guardado
  ai/
    prompt.ts          Prompt de sistema + esquema JSON compartido
    claude.ts          Llamada a Claude (imagen/PDF + salida estructurada)
    openai.ts          Llamada a OpenAI Responses API
  context/AppContext.tsx  Estado global y persistencia
  lib/                 Almacenamiento, lectura de ficheros, cálculo de edad
```

Los datos (perfil, menús) se guardan localmente con AsyncStorage.

## Próximos pasos posibles

- Varios perfiles (hermanos).
- Lista de la compra semanal a partir de las cenas.
- Regenerar la cena de un día concreto o pedir alternativas.
- Notificación por la tarde con la cena del día.
- Build instalable con EAS (`npx eas-cli@latest build -p android --profile preview`).

---

Las propuestas de la IA son orientativas y no sustituyen el consejo de tu pediatra.
