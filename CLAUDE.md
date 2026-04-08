@AGENTS.md

# Dashboard MINED — Monitoreo de Red Escolar

## Proyecto
Dashboard de monitoreo de conectividad para escuelas del Ministerio de Educación de El Salvador (MINED). Sondas Python en escuelas reportan a Firebase Firestore, frontend Next.js en Vercel.

## URLs
- Producción: https://dashboard-mined.vercel.app
- GitHub: https://github.com/andreslastra14/dashboard-mined
- Vercel cuenta: andreslastra14 (scope: andreslastra14s-projects)
- Firebase proyecto: `monitor-red`

## Stack
- Next.js 16.2.1 (App Router, Server Components, async searchParams)
- Firebase Admin SDK (server-side only — NO client SDK)
- Firestore: colecciones `registros` y `tickets`
- React Leaflet + CartoDB Positron tiles
- Recharts (useId para gradient IDs únicos)
- shadcn/ui (Card, Badge, Table, Tabs)
- Tailwind CSS v4
- Paleta: azul institucional #1E3A5F, variantes #2e6da4, #3b82a0, #4a7c8e
- Rojo solo para alertas críticas: #b91c1c

## Estructura de archivos
```
app/                    # Pages
  page.tsx              # Home — KPIs, mapa, gráficas, insights
  escuelas/page.tsx     # Mapa + filtro geográfico por departamento
  velocidad/page.tsx    # Historial de velocidad por sonda
  alertas/page.tsx      # Filtros de contenido + historial fallas
  tickets/page.tsx      # Gestión de tickets automáticos
  api/check-tickets/    # Cron job cada 2min (protegido por CRON_SECRET)
  error.tsx             # Error boundary global
components/
  Header.tsx            # "use client" — LiveDate con useEffect
  Sidebar.tsx           # Desktop sidebar + mobile bottom nav
  SchoolMap.tsx         # Leaflet map (NO SSR)
  SchoolMapWrapper.tsx  # "use client" wrapper para dynamic ssr:false
  LatencyChart.tsx      # Recharts AreaChart
  SpeedChart.tsx        # Recharts AreaChart
  UptimeChart.tsx       # Grid de mini-cards con SVG ring
  InsightsPanel.tsx     # Insights operativos
  TicketFilter.tsx      # "use client" tabs para filtrar tickets
  ZoneFilter.tsx        # "use client" dropdown departamentos
  KpiCard.tsx           # Card reutilizable de KPI
lib/
  firebase.ts           # Singleton Firebase Admin + interfaces Registro/Ticket
  queries.ts            # Queries Firestore + cálculos uptime/calidad
  tickets.ts            # CRUD tickets + stats
  geo.ts                # 14 departamentos El Salvador + clasificación
```

## Env vars (Vercel Production)
- `FIREBASE_PROJECT_ID` — monitor-red
- `FIREBASE_CLIENT_EMAIL` — service account email
- `FIREBASE_PRIVATE_KEY` — RSA key (con \n literales, el código hace .replace)
- `CRON_SECRET` — para proteger /api/check-tickets

## Convenciones
- Server Components por defecto, "use client" solo cuando necesario
- searchParams es async en Next.js 16: `const { param } = await searchParams`
- dynamic() con ssr:false DEBE estar en "use client" component
- useId() para SVG gradient IDs (evitar colisión)
- Timestamps de Firestore se serializan a ISO strings antes de pasar a client components
- try/catch en todos los queries Firestore (retorna [] en error)
- Fondo blanco/light para contenido principal (bg-gray-50)
- Cards: rounded-xl border bg-white shadow-sm

## Errores conocidos y soluciones
- `ssr: false` en Server Component → usar wrapper "use client"
- Hydration mismatch con `new Date()` → useEffect en client component
- Firestore composite index requerido para status+timestamp → fallback a scan en memoria
- Firebase key con trailing newline → usar python -c "print('val', end='')"
- SVG gradient ID collision → useId() hook

## Sistema de tickets
- Cron cada 2min detecta desconexiones
- >= 5 min sin conexión → ticket ABIERTO (ALERTA_5MIN)
- >= 10 min → escala a ESCALADO (ALERTA_10MIN)
- Sonda vuelve a OK → ticket RESUELTO automáticamente
- Duración calculada al cerrar

## Pendientes
- Firebase service account key necesita regenerarse (actual inválida)
- CRON_SECRET pendiente de configurar
- Fase 2: Notificaciones via Make.com/WhatsApp
- Fase 6: Mejoras al script Python de sondas (campo nombre_escuela, heartbeat 30s)
