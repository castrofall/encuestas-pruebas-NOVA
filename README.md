# Feedback Nova · Grupo Ternova

Formulario para recoger la retroalimentación de las pruebas de **Nova**, y panel
interno para leer los resultados. Se despliega en Vercel y guarda las respuestas
en una base de datos **Neon** (PostgreSQL).

- **Formulario** — `/` · lo llenan los usuarios, tres pasos cortos.
- **Panel** — `/dashboard` · lo abre TI con contraseña, muestra métricas y respuestas.

---

## Qué se le pregunta al usuario

Tres pasos con barra de progreso. Lo que escribe se guarda en el navegador
mientras responde, así que si cierra la pestaña no pierde nada.

| Paso | Preguntas |
|---|---|
| **1. Quién eres** | Nombre completo · Correo `@ternova.group` · Área |
| **2. Tu experiencia** | Experiencia general, calidad de las respuestas, velocidad y facilidad de uso (1 a 5) · Recomendación (NPS, 0 a 10) |
| **3. Qué mejorar** | Lo que más le gustó · Lo que le falló · Lo primero que arreglaría · Lo que quisiera ver a futuro · Comentario libre *(opcional)* |

Las escalas están separadas a propósito: una persona puede estar encantada con la
velocidad y molesta con la precisión, y esa diferencia es la que sirve para decidir.

### Preguntas en pausa

Cuatro preguntas se retiraron del formulario, pero nada se borró: **frecuencia de
uso**, **tareas en las que la usó**, **tiempo ahorrado** y **confianza en las
respuestas**.

- Sus columnas siguen en la base de datos y la API las acepta si llegan, sin ser
  obligatorias.
- El panel dibuja su sección **solo si hay datos**, así que hoy no aparece y
  vuelve sola en cuanto se reactiven.
- Para reactivar una: volver a mostrar el campo en `public/index.html` y, si se
  quiere obligatoria, añadir su regla en `REGLAS` (ahí) y en `lib/validacion.js`.

## Qué muestra el panel

- **Indicadores**: total de respuestas, personas distintas, NPS y promedio general.
- **NPS** desglosado en detractores (0–6), pasivos (7–8) y promotores (9–10).
- **Las cuatro dimensiones** con su promedio y la distribución de 1 a 5 — una
  barra alta a la izquierda señala un problema concentrado, no un promedio tibio.
- **Áreas que participaron**, para ver dónde falta cobertura.
- **Todo lo que escribieron**, con buscador y ordenamiento (incluido *peor
  calificación primero*, que es por donde conviene empezar a leer).
- **Exportar CSV** para llevarlo a Excel.

Se actualiza solo cada minuto y la sesión caduca a los 15 minutos de inactividad.

---

## Puesta en marcha

### 1. Base de datos en Neon

1. Crear un proyecto en [neon.com](https://neon.com) (región más cercana: `aws-us-east-2`).
2. Abrir **SQL Editor** y ejecutar el contenido de [`schema.sql`](schema.sql).
3. Copiar la cadena de conexión de **Connect** (debe terminar en `?sslmode=require`).

### 2. Variables de entorno

Las mismas cuatro en local (`.env`) y en Vercel (**Settings → Environment Variables**):

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Neon. |
| `DASHBOARD_PASSWORD` | Contraseña del panel. Mínimo 12 caracteres con mayúsculas, minúsculas, números y símbolos; sin palabras como `ternova`, `admin` o `123456`. |
| `IP_SALT` | Sal para el hash de IP. Generar con `node -e "console.log(crypto.randomUUID())"`. |
| `DOMINIO_PERMITIDO` | Dominio de correo aceptado. Por defecto `ternova.group`. |

Nunca se suben al repositorio: `.env` está en `.gitignore` y solo se versiona
[`.env.example`](.env.example).

### 3. Vercel

Importar el repositorio, cargar las cuatro variables y desplegar. No hay que
configurar nada más: `vercel.json` deja `public/` como salida estática y todo lo
que está en `api/` se publica como función.

Después del despliegue, abrir `/api/salud` para confirmar que la conexión y la
tabla existen.

### 4. Desarrollo local

```bash
npm install
cp .env.example .env    # y llenarlo
npm run dev             # http://127.0.0.1:3020
```

> **`npm install` no funciona dentro de la red de Ternova.** Se verificó el
> 2026-09-04: `registry.npmjs.org` no responde a ninguna petición desde la red
> corporativa (tiempo de espera agotado, `ECONNRESET`). Esto **no afecta el
> despliegue**, porque Vercel instala desde su propia red. Para trabajar en local
> se usa el modo memoria que se explica abajo, que no necesita instalar nada.

**Sin base de datos**: poner `DATABASE_URL=memoria` en el `.env`. Las respuestas
se guardan en memoria y se pierden al reiniciar, pero el formulario y el panel
funcionan completos. En ese modo no hace falta `npm install`, porque el driver de
Neon se carga solo cuando se conecta de verdad a la base.

Si hace falta probar en local **contra Neon** (y no contra el modo memoria), hay
que instalar la dependencia desde una red sin el proxy corporativo, o simplemente
probar sobre el despliegue de Vercel.

Para llenar el panel con respuestas de ejemplo:

```bash
node dev/sembrar.mjs 20
```

Y para correr las pruebas de validación, sesión, métricas y CSV:

```bash
node dev/pruebas.mjs
```

---

## Estructura

```
public/index.html       Formulario (3 pasos, borrador local, validación en vivo)
public/dashboard.html   Panel de resultados (métricas, gráficos, buscador, CSV)
api/feedback.js         POST · guarda una respuesta
api/acceso.js           POST · valida la contraseña y emite el token de sesión
api/respuestas.js       GET  · métricas + respuestas, o CSV con ?formato=csv
api/salud.js            GET  · diagnóstico de configuración
lib/validacion.js       Catálogos, validación y saneado; hash de IP
lib/db.js               Consultas a Neon (parametrizadas)
lib/memoria.js          Almacén en memoria para desarrollo
lib/sesion.js           Token firmado con HMAC y caducidad por inactividad
lib/metricas.js         Agregados del panel y exportación a CSV
lib/http.js             Utilidades compartidas de las funciones
server.js               Servidor de desarrollo (no se despliega)
schema.sql              Tablas e índices para Neon
dev/pruebas.mjs         Pruebas de los módulos puros
dev/sembrar.mjs         Respuestas de ejemplo contra el servidor local
```

Sin framework y con una sola dependencia (`@neondatabase/serverless`), igual que
los demás proyectos internos.

---

## Seguridad (POL-TIC-001)

Lo que ya está implementado:

- **HTTPS/TLS** en todo el tráfico (lo aporta Vercel) y cabeceras `HSTS`,
  `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`.
- **Cifrado en reposo** de la base de datos (Neon lo aplica por defecto).
- **Consultas parametrizadas** en todas las operaciones: ningún valor del usuario
  se concatena en SQL.
- **Validación y saneado de entrada y salida**: catálogos cerrados, límites de
  longitud, rangos numéricos, eliminación de caracteres de control, y escapado de
  todo el contenido antes de mostrarlo en el panel.
- **Rate limiting**: 100 envíos por hora y red, 3 por correo y día. El techo por red es holgado a propósito: toda la oficina sale por la misma IP pública, así que uno bajo bloquearía a participantes legítimos. El control real contra respuestas repetidas es el de por correo.
- **Bloqueo de acceso** tras 4 intentos fallidos durante 30 minutos.
- **Sesión** con token firmado (HMAC-SHA256) que caduca a los 15 minutos de
  inactividad y muere al rotar la contraseña.
- **Bitácora de accesos** al panel (`login_ok`, `login_fallido`, `export_csv`).
- **Minimización de datos**: la IP no se almacena, solo su hash con sal.
- **Mensajes de error genéricos** al cliente; el detalle solo va al log del servidor.
- **Protección de CSV**: las celdas que empiezan con `= + - @` se neutralizan para
  que Excel no las ejecute.

Pendientes que corresponden a Kevin, no al código:

1. **Registrar las credenciales ante el oficial de seguridad** (`DATABASE_URL`,
   `DASHBOARD_PASSWORD`, `IP_SALT`), como pide la política para todo software nuevo.
2. **Checklist de seguridad del proyecto** con el PM y el oficial de seguridad
   antes de exponer el formulario.
3. **Excepción documentada por la falta de SSO**: la política pide autenticación
   con EntraID. Aquí el panel usa una contraseña compartida porque no hay SSO
   disponible para esta herramienta; conviene registrarlo en la matriz de
   excepciones o migrar a EntraID cuando se pueda.
4. **Inventario de activos**: dar de alta la herramienta (nombre, proveedor Neon
   y Vercel, puertos, APIs, red externa).
5. **Clasificación**: las respuestas son de **uso interno** y contienen nombre y
   correo corporativo. El CSV exportado hereda esa clasificación.
6. **Retención**: definir cuánto tiempo se conservan las respuestas y quién las borra.
