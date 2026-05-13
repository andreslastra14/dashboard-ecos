@AGENTS.md

# Dashboard ECOS — Monitoreo de Red Escolar (RapidNet / MINED El Salvador)

## Proyecto

Dashboard de monitoreo de conectividad para escuelas del Ministerio de Educación de El Salvador (MINED), operado por RapidNet sobre infraestructura ECOS. Sondas Raspberry Pi reportan cada ~5 minutos a Cloud SQL Postgres en GCP; frontend Next.js 16 desplegado en Vercel.

## URLs

- Producción: https://ecos-dashboard.vercel.app
- Proyecto Vercel: `ecos-dashboard` (scope `operaciones-6942s-projects`, team `team_MT7XNTxrogsR4HX0ENKbRW0M`)
- Repo GitHub: https://github.com/andreslastra14/dashboard-ecos (rama principal `ecos-mined-db`)
- Portal NOC externo (gestión de casos): https://ecos-noc-portal-743427305494.us-central1.run.app
- Repo de sondas: https://github.com/Proyecto-ECOS/Proyecto-ECOS

## Stack

- Next.js 16.x (App Router, Server Components, async `searchParams`)
- Cloud SQL Postgres + `@google-cloud/cloud-sql-connector` con autenticación IAM en producción
- Driver `pg`, pool singleton en `globalThis.__pgPool` para reuse entre invocaciones de lambda
- React Leaflet + CartoDB Positron (mapas)
- Recharts (charts), shadcn/ui (Card, Badge, Table, Tabs), Tailwind v4
- bcryptjs + crypto nativo para verificación multi-formato de passwords
- Sesiones JWT firmadas con `SESSION_SECRET` (cookies httpOnly, 7 días)

## Base de datos — Cloud SQL Postgres

### Conexión

- GCP project: `ecos-sonda`
- Instancia: `ecos-db-principal` (región `us-central1`)
- `INSTANCE_CONNECTION_NAME`: `ecos-sonda:us-central1:ecos-db-principal`
- BD: `postgres`
- **Producción**: IAM con service account `sonda-operador-ecos@ecos-sonda.iam.gserviceaccount.com` (Cloud SQL Connector vía OAuth, sin password)
- **Local (.env.local)**: conexión directa por `DB_HOST` (IP pública) + `DB_PASS`. `lib/postgres.ts` detecta automáticamente cuál usar según las env vars presentes.

### Tablas

| Tabla | Qué guarda | Cadencia escritura |
|---|---|---|
| `registros_ecos_master` | Histórico append-only (telemetría de cada reporte) | 1 fila por sonda cada ~5 min |
| `resultados_detallados_web` | Web checks (MINED/Streaming/Adultos/Apuestas) por sonda | mismo ciclo |
| `usuarios` | Cuentas para login del dashboard | manual / admin panel |

> Cuidado: la tabla se llama **`usuarios`** (plural sin sufijo). El commit antiguo `1484a78` apuntaba a `usuarios_ecos` que ya no existe. Usar siempre detección dinámica de schema en `lib/usuarios.ts`.

### Schema clave de `registros_ecos_master`

```
sonda_id, eth_download, wifi_download, eth_upload, wifi_upload,
cpu_temp, cpu_uso, ram_uso, eth_latencia, wifi_latencia,
ups_estado, ups_nivel, latitud, longitud, gps_status, fecha_registro
```

Volumen estimado: 401 sondas × 12 muestras/h × 12 h ≈ **156k filas/12h**. Cap proyectado para 5000 sondas: ~720k filas/12h. El único índice actual es PK sobre `id`; consultas con `fecha_registro >= NOW() - INTERVAL '12 hours'` corren en ~80ms vía Parallel Seq Scan (datos calientes en buffer).

### Schema clave de `usuarios`

```
id (PK int), nombre, correo, telefono, cargo, password_hash,
foto_perfil_url, fecha_creacion, activo,
fecha_ultimo_cambio_pwd, historial_pwd, requiere_cambio_pwd,
reset_token, reset_expiration
```

- **Columna email**: `correo` (no `email` ni `nombre_usuario`)
- **Columna password**: `password_hash`
- **Columna rol**: `cargo` (valores reales mezclados: `"admin"`, `"Administrador"`, `"SUPERVISOR"`, `"Maestro"`)

### Hashes de password mezclados en `usuarios`

La tabla tiene hashes generados por **dos backends distintos**:

- **bcrypt (Node)**: `$2b$10$...` — usuarios creados desde el dashboard
- **sha256 hex plano (Python)**: 64 chars hex — usuarios creados desde el back de Salvatore (`hashlib.sha256(password.encode()).hexdigest()`)
- **pbkdf2 / scrypt (Werkzeug)**: prefijo `pbkdf2:sha256:...$salt$hex` o `scrypt:N:r:p$salt$hex` — eventualmente
- **`$pbkdf2-sha256$...` (Passlib)**: poco común, no soportado aún

`lib/usuarios.ts` detecta el prefijo y usa el verificador correcto. Cuando se crean usuarios desde este dashboard, se generan en bcrypt.

## Env vars

### Producción (Vercel `ecos-dashboard`)

- `GOOGLE_APPLICATION_CREDENTIALS_JSON` — JSON inline del SA (todo el archivo `.json` como string)
- `INSTANCE_CONNECTION_NAME` = `ecos-sonda:us-central1:ecos-db-principal`
- `DB_NAME` = `postgres`
- `DB_USER` = `sonda-operador-ecos@ecos-sonda.iam` (sin sufijo `.gserviceaccount.com` por restricción de gcloud)
- `SESSION_SECRET`, `CRON_SECRET`
- `DB_HOST`, `DB_PORT`, `DB_PASS` (legacy, no se usan cuando hay IAM)

### Local (`.env.local`)

```
DB_HOST=34.9.170.119   (IP pública con allowlist a la IP del dev)
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASS=<password>
SESSION_SECRET=<...>
CRON_SECRET=<...>
```

`lib/postgres.ts` toma el camino IAM si `GOOGLE_APPLICATION_CREDENTIALS_JSON` + `INSTANCE_CONNECTION_NAME` están presentes; si no, cae a `DB_HOST/DB_PASS`.

## Patrones de queries (sostenibilidad 5000 sondas)

- **KPIs y mapa**: `getDispositivos()` con `DISTINCT ON (sonda_id) ORDER BY fecha_registro DESC` — O(#sondas), 1 query.
- **Charts globales con histórico**: agregar en SQL con `to_timestamp(floor(epoch / N) * N)` + `AVG` (Postgres 12+ compatible; `date_bin` solo PG14+). Mínimo de bucket = 5 min (cadencia de reporte). Helper `bucketMinAdaptativo(horas)` apunta a ~120 puntos.
- **Detalle por sonda**: `getRegistrosDispositivo(cpuId, N)` — WHERE sonda_id = $1 ORDER BY fecha_registro DESC LIMIT N (rápido sin índice gracias al volumen pequeño por sonda).
- **`getUserById`**: cacheada con `cache()` de React. El layout la llama en cada request para refrescar el role desde DB y evitar staleness de la cookie JWT (TTL 7 días).

### Anti-patterns prohibidos

- ❌ `SELECT ... FROM registros_ecos_master ORDER BY fecha_registro DESC LIMIT N` global → no escala (5000 sondas saturan 3000 filas en <1 minuto).
- ❌ Cálculos de uptime histórico en el home con N queries por sonda.
- ❌ Cookies JWT con `role` sin refresh contra DB → cambios de cargo en DB no surten efecto hasta logout.

## Auth — flujo completo

1. `app/login/page.tsx` form → server action `app/actions/auth.ts:login()`.
2. `authenticateUser(email, password)` (en `lib/usuarios.ts`):
   - `detectSchema()` (cacheado en memoria del módulo) descubre la tabla y las columnas reales vía `information_schema`.
   - `getUserByEmail()` con `LOWER(correo) = $1`.
   - `verifyPassword(plain, hash)` despacha por prefijo del hash (bcrypt / sha256 / pbkdf2 / scrypt).
   - Si `activo=false`, rechaza.
3. `createSession(user)` firma un JWT con `SESSION_SECRET` y lo guarda en cookie `session` (httpOnly, 7d).
4. `app/(dashboard)/layout.tsx` y páginas admin re-leen `getUserById(session.userId)` en cada request para refrescar el role.
5. `normalizeRole(cargo)` acepta: `"admin"`, `"administrador"`, `"supervisor"`, `"operador"`, `"tecnico"/"técnico"`, `"maestro"/"profesor"/"teacher"`. Default: `"operador"`.

## Convenciones

- Server Components por defecto, `"use client"` solo cuando necesario (Leaflet, charts interactivos, tabs, form inputs).
- `searchParams` es async en Next.js 16: `const { sonda } = await searchParams`.
- Pool de Postgres singleton en `lib/postgres.ts` — exponer SOLO `query<T>()`.
- `try/catch` en todos los queries Postgres (retornar `[]` / `null` en error, no tirar al error boundary).
- En server actions de auth, capturar el error real y devolverlo en `state.error` en vez de dejarlo bubblear como `error.digest` opaco.
- React `cache()` para deduplicar queries dentro del mismo request (layout + page suelen pedir lo mismo).
- Pool config en serverless: `max: 3`, `idleTimeoutMillis: 30s`, `connectionTimeoutMillis: 20s`. Más alto satura el limite total de Cloud SQL (~100 conexiones).

## Errores conocidos y soluciones

- **`ERROR <digest>` opaco al login** → `app/actions/auth.ts` ya captura el error y muestra el mensaje real (`DB error: ...`). Si vuelve a salir digest, falta el try/catch.
- **"Connection terminated due to connection timeout"** desde Vercel → IP allowlist de Cloud SQL no permite serverless. Usar siempre IAM con `GOOGLE_APPLICATION_CREDENTIALS_JSON` + `INSTANCE_CONNECTION_NAME` en producción.
- **"timeout exceeded when trying to connect"** → Pool agotado. Bajar `max` a 3, agregar React `cache()`, y usar `globalThis.__pgPool` para reuso entre invocaciones.
- **"Credenciales incorrectas" con password correcto** → el hash en DB no es bcrypt. Verificar con el endpoint debug que `detected_algorithm` sea el correcto y soportado.
- **Sidebar no muestra "Admin" tras cambiar cargo en DB** → cookie JWT estancada. El layout debería refrescar con `getUserById`; si no lo hace, hacer logout + login.
- **`relation "usuarios_ecos" does not exist`** → código viejo apuntando a la tabla deprecada. Usar `detectSchema()` en `lib/usuarios.ts`.

## Sistema de tickets

La gestión de casos vive en el **portal NOC externo** (Cloud Run distinto, proyecto GCP diferente, base de datos diferente). Endpoints conocidos del NOC:

```
GET  /get-seguimiento/:id   → JSON [{ usuario, fecha, comentario }, ...]
POST /add-seguimiento       → body { id_caso, comentario }
```

El sidebar del dashboard ECOS puede redirigir al NOC para gestión de tickets (rama de feature pendiente de re-aplicar). Para integrar casos en el dashboard ECOS hay que pedirle a Salvatore:
- (A) un endpoint REST `GET /api/casos` con auth por token, o
- (B) `GRANT SELECT` al SA `sonda-operador-ecos@ecos-sonda.iam` sobre la DB de casos.

## Estructura de archivos

```
app/
  (dashboard)/
    layout.tsx              # Refresh de role desde DB en cada request
    page.tsx                # Home — SLAs estratégicos (SlaHero, SlaMini, breakdown)
    escuelas/page.tsx       # Mapa + filtro por departamento (lib/geo.ts)
    velocidad/page.tsx      # Charts de velocidad con buckets + range selector
    alertas/page.tsx        # Filtros, UPS, salud
    tickets/page.tsx        # Casos (pendiente integración NOC)
    admin/                  # CRUD usuarios (gated por role)
    error.tsx
  actions/
    auth.ts                 # login/logout — captura error real
    usuarios.ts             # createUser/updateUser/deleteUser, requiereAdmin
  api/check-tickets/        # cron protegido por CRON_SECRET
  login/
components/
  Sidebar.tsx               # Desktop + mobile bottom nav, role-gated
  SchoolMap.tsx             # Leaflet (NO SSR)
  SchoolMapWrapper.tsx      # "use client" wrapper
  SlaHeroCard.tsx, SlaMiniCard.tsx, SlaStatusCards.tsx, SlaBreakdownCard.tsx
  SpeedChartCard.tsx        # Recharts
  ZoneFilter.tsx, TicketFilter.tsx
  KpiCard.tsx, Header.tsx
lib/
  postgres.ts               # query<T>() — IAM o fallback host+pass
  queries.ts                # getDispositivos, getEscuelas, getRegistrosRecientes,
                            #   getRegistrosDispositivo, getRegistrosPorRango
  usuarios.ts               # detectSchema dinámico + multi-format auth
  auth.ts                   # JWT sessions (jose), createSession, getSession
  roles.ts                  # Role enum + permisos (ROLES)
  geo.ts                    # 14 departamentos + clasificación lat/lng
  tickets.ts                # Stubs (devuelve [], tabla casos no existe)
  sla.ts                    # Cálculos SLA estratégicos
  firebase.ts               # interfaces compartidas (Dispositivo, Escuela, RegistroHistorico, DbTimestamp)
  password-reset/           # Flow de recuperación
  pdf/                      # Generación de reportes PDF
```

## Pendientes / Roadmap

- Crear índice `(sonda_id, fecha_registro DESC)` en `registros_ecos_master` cuando se acerque a 5000 sondas.
- Particionar `registros_ecos_master` por mes (control de costos a 1.4M filas/día).
- Integrar casos del NOC vía REST o GRANT SELECT (ver "Sistema de tickets").
- TTL/retención automática de `registros_ecos_master` > 90 días.
- Re-aplicar features que quedaron en stash: UPS labels traducidos (OL→Conectado, OB→En batería), AutoRefresh client cada 30s, sidebar redirect a NOC portal.
- Soporte de hashes Passlib (`$pbkdf2-sha256$...`) si aparecen usuarios con ese formato.
