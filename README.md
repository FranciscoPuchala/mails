# MailRápido — Especificación para Claude Code

App de escritorio para enviar mails personalizados a partir de **plantillas guardadas** (asunto + cuerpo). Flujo: elijo una plantilla → escribo el mail del destinatario → (opcional) completo variables → **Enviar**. Tiene que ser rápido, casi automático, y verse profesional.

> **Para Claude Code:** leé todo este documento antes de escribir código. Seguí el orden de implementación del final y respetá estrictamente las reglas de código. Si algo es ambiguo, preguntá antes de asumir.

---

## 1. Objetivo

- Enviar mails desde **mi propia cuenta** (Gmail como proveedor principal; SMTP genérico como alternativa).
- Gestionar plantillas: crear, editar, duplicar, borrar.
- Enviar en segundos: seleccionar plantilla + destinatario + Enviar.
- Personalización con variables tipo `{{nombre}}`, `{{empresa}}`.
- Historial de envíos.

## 2. Flujo de uso principal

1. Abro la app → pantalla **Enviar**.
2. Elijo una plantilla de la lista (buscador incluido).
3. Escribo el mail del destinatario (con autocompletado de destinatarios recientes).
4. Si la plantilla tiene variables, aparecen campos generados automáticamente para completarlas.
5. Veo una **vista previa** del asunto y cuerpo final ya reemplazados.
6. Presiono **Enviar** (o `Ctrl/Cmd + Enter`).
7. Aparece una notificación de éxito o error, y el envío queda en el historial.
8. El formulario se limpia, pero **la plantilla queda seleccionada** para mandar el siguiente al toque.

## 3. Stack

| Capa | Tecnología |
|---|---|
| Desktop | **Electron** (última versión estable) |
| Lógica principal | Node.js (proceso main) |
| Envío de mails | **Nodemailer** vía SMTP |
| Interfaz | HTML + CSS + JavaScript vanilla (sin frameworks) |
| Persistencia | Archivos JSON en `app.getPath('userData')` |
| Credenciales | `safeStorage` de Electron (cifrado del sistema operativo) |
| Empaquetado | `electron-builder` (Windows `.exe` y macOS `.dmg`) |

No usar React, Vue, Tailwind ni librerías de UI. Mantenerlo liviano.

## 4. Reglas de código (obligatorias)

**Separación estricta: un lenguaje por archivo.**

- ❌ Nada de `<style>` ni `style="..."` dentro del HTML.
- ❌ Nada de `<script>` con código inline ni atributos `onclick="..."` en el HTML. Solo `<script src="...">`.
- ❌ Nada de armar HTML con strings en JS (`innerHTML = '<div>...'`). Usar `<template>` definidos en el HTML + `cloneNode`, o `document.createElement`.
- ❌ Nada de modificar estilos desde JS (`el.style.color = ...`). Usar `classList.add/remove/toggle` con clases definidas en CSS.
- ✅ Cada archivo con una sola responsabilidad. Si un archivo pasa de ~250 líneas, dividirlo.
- ✅ ES Modules en el renderer, CommonJS o ESM consistente en el main (elegir uno y mantenerlo).
- ✅ Nombres de archivos en `kebab-case`, variables y funciones en `camelCase`.
- ✅ Código y comentarios en español o inglés, pero consistente en todo el proyecto.
- ✅ Sin código duplicado: utilidades compartidas en `utils/`.

## 5. Estructura de carpetas

```
mailrapido/
├── package.json
├── electron-builder.yml
├── README.md
├── src/
│   ├── main/                        # Proceso principal (Node)
│   │   ├── main.js                  # Crea ventana, ciclo de vida
│   │   ├── preload.js               # API segura expuesta al renderer
│   │   ├── ipc/
│   │   │   ├── templates-ipc.js
│   │   │   ├── mail-ipc.js
│   │   │   ├── settings-ipc.js
│   │   │   └── history-ipc.js
│   │   ├── services/
│   │   │   ├── mail-service.js      # Nodemailer: verificar y enviar
│   │   │   ├── template-service.js  # CRUD de plantillas
│   │   │   ├── history-service.js
│   │   │   └── credentials-service.js  # safeStorage
│   │   └── utils/
│   │       ├── json-store.js        # Leer/escribir JSON de forma atómica
│   │       └── validators.js
│   └── renderer/                    # Interfaz
│       ├── index.html
│       ├── styles/
│       │   ├── variables.css        # Colores, tipografía, espaciados
│       │   ├── base.css             # Reset y estilos globales
│       │   ├── layout.css           # Sidebar, header, contenedor
│       │   ├── components.css       # Botones, inputs, cards, toasts, modales
│       │   └── views.css            # Estilos específicos de cada vista
│       └── scripts/
│           ├── app.js               # Arranque y navegación entre vistas
│           ├── views/
│           │   ├── send-view.js
│           │   ├── templates-view.js
│           │   ├── history-view.js
│           │   └── settings-view.js
│           ├── components/
│           │   ├── toast.js
│           │   ├── modal.js
│           │   └── template-list.js
│           └── utils/
│               ├── variables.js     # Detectar y reemplazar {{variables}}
│               └── dom.js           # Helpers de DOM
└── assets/
    └── icon.png
```

## 6. Funcionalidades

### 6.1 Vista "Enviar" (pantalla principal)
- Lista de plantillas a la izquierda con buscador.
- Campo **Para** (acepta uno o varios mails separados por coma; validar formato).
- Campos **CC** y **CCO** ocultos detrás de un botón "Agregar CC/CCO".
- Campos dinámicos para las variables detectadas en la plantilla.
- Vista previa en vivo del asunto y cuerpo finales.
- Botón **Enviar** grande y claro, deshabilitado hasta que todo sea válido.
- Estado de carga en el botón mientras se envía (no permitir doble envío).
- Atajo `Ctrl/Cmd + Enter` para enviar.

### 6.2 Vista "Plantillas"
- Crear, editar, duplicar y eliminar (eliminar con confirmación).
- Campos: **Nombre interno**, **Asunto**, **Cuerpo**.
- Cuerpo en texto plano con saltos de línea respetados (se envía también como HTML simple convirtiendo saltos de línea a `<br>` en el main, no en el renderer).
- Mostrar debajo del editor las variables detectadas.
- Guardado con `Ctrl/Cmd + S`.

### 6.3 Vista "Historial"
- Tabla con: fecha/hora, destinatario, plantilla usada, asunto, estado (enviado / error).
- Buscador y filtro por estado.
- Botón "Reenviar" que carga los mismos datos en la vista Enviar.
- Botón para limpiar historial (con confirmación).

### 6.4 Vista "Configuración"
- Proveedor: **Gmail** (preset) o **SMTP personalizado** (host, puerto, seguridad).
- Mail remitente y nombre visible ("Francisco <mail@...>").
- Contraseña de aplicación (campo tipo password).
- Firma opcional que se agrega al final de cada mail.
- Botón **Probar conexión** (usa `transporter.verify()`).
- Botón **Enviarme un mail de prueba**.
- Texto de ayuda explicando que Gmail requiere verificación en 2 pasos y una **contraseña de aplicación** (no la contraseña normal).

## 7. Variables de personalización

- Sintaxis: `{{nombreVariable}}` (letras, números y guion bajo).
- Pueden ir en asunto y cuerpo.
- La app detecta automáticamente todas las variables únicas de la plantilla y genera un input por cada una.
- Variables automáticas disponibles sin completar: `{{fecha}}` (fecha de hoy en formato dd/mm/aaaa).
- Si falta completar una variable, no se puede enviar y se marca el campo.

## 8. Seguridad

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- El renderer **nunca** accede a Node ni a Nodemailer: todo pasa por `preload.js` con `contextBridge`, exponiendo solo funciones concretas (`templates.list()`, `mail.send(data)`, etc.).
- Validar todos los datos que llegan por IPC en el main (no confiar en el renderer).
- Content-Security-Policy en `index.html` que bloquee scripts inline y orígenes externos.
- La contraseña se guarda cifrada con `safeStorage`; nunca en texto plano, nunca en logs, nunca se devuelve al renderer (solo un booleano "hay contraseña guardada").
- Ningún dato sale de la máquina salvo el envío SMTP.

## 9. Interfaz (diseño)

- Estilo limpio y moderno tipo app de productividad (referencia: Linear, Notion, Superhuman).
- Layout: **sidebar fija** a la izquierda con iconos + texto (Enviar, Plantillas, Historial, Configuración) y contenido a la derecha.
- **Modo claro y oscuro**, siguiendo el sistema operativo con opción de forzar uno en Configuración.
- Todos los colores, radios, sombras y espaciados como variables CSS en `variables.css`.
- Tipografía del sistema (`system-ui`) o Inter.
- Iconos SVG en archivos separados dentro de `assets/icons/` (no SVG inline en el HTML si se puede evitar).
- Notificaciones tipo **toast** (éxito, error, info) que desaparecen solas.
- Estados vacíos con mensaje amable ("Todavía no tenés plantillas. Creá la primera").
- Transiciones suaves (150–200 ms), sin animaciones exageradas.
- Navegable con teclado y con `focus` visible.
- Ventana mínima de 960×640; diseño que se adapte al redimensionar.

## 10. Persistencia

Archivos en `userData`:

- `templates.json` → `[{ id, name, subject, body, createdAt, updatedAt }]`
- `history.json` → `[{ id, to, cc, bcc, templateId, subject, status, error, sentAt }]` (máximo 1000 entradas, borrar las más viejas)
- `settings.json` → proveedor, host, puerto, remitente, firma, tema (sin contraseña)
- `credentials.bin` → contraseña cifrada con `safeStorage`

Escritura atómica (escribir a archivo temporal y renombrar) para no corromper datos.

## 11. Manejo de errores

- Traducir errores de SMTP a mensajes claros en español (credenciales inválidas, sin conexión, destinatario rechazado, límite de envío alcanzado).
- Si no hay cuenta configurada, la vista Enviar muestra un aviso con botón que lleva a Configuración.
- Nunca dejar la app colgada: timeouts en el envío.
- Errores registrados en el historial con su motivo.

## 12. Scripts de `package.json`

```
npm start        → corre la app en desarrollo
npm run build    → genera instalador con electron-builder
npm run lint     → ESLint
```

Incluir ESLint y Prettier con configuración básica.

## 13. Criterios de aceptación

- [ ] Configuro mi Gmail con contraseña de aplicación, pruebo conexión y funciona.
- [ ] Creo una plantilla con `{{nombre}}` en asunto y cuerpo.
- [ ] En Enviar la selecciono, escribo un mail, completo "nombre", veo la vista previa y envío en menos de 10 segundos.
- [ ] El mail llega con asunto, cuerpo, firma y nombre de remitente correctos.
- [ ] El envío aparece en el historial; puedo reenviarlo.
- [ ] Ningún archivo HTML tiene CSS o JS inline; ningún JS arma HTML con strings ni toca `.style`.
- [ ] La contraseña no aparece en texto plano en ningún archivo del disco.
- [ ] Modo claro/oscuro funciona.
- [ ] `npm run build` genera un instalador que funciona.

## 14. Orden de implementación

1. Estructura del proyecto, `package.json`, Electron arrancando con ventana vacía y seguridad configurada.
2. Layout base: sidebar, navegación entre vistas, variables CSS, modo claro/oscuro.
3. `json-store.js` + CRUD de plantillas (main + IPC + vista).
4. Configuración de cuenta + `safeStorage` + probar conexión.
5. Vista Enviar con variables, vista previa y envío real.
6. Historial y reenvío.
7. Toasts, estados vacíos, atajos de teclado, pulido visual.
8. ESLint, revisión de las reglas de código y empaquetado.

Después de cada paso, verificar que la app corre sin errores antes de seguir.

## 15. Fuera de alcance (por ahora)

- Envío masivo desde CSV/Excel.
- Programar envíos a futuro.
- Adjuntos.
- Login con OAuth de Google.

(Dejar el código preparado para agregar estas cosas después sin reescribir todo.)
