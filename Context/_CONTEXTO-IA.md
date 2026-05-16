# _CONTEXTO-IA — GymBase: Contexto comprimido para IAs

> Leer este archivo antes de tocar cualquier código. Diseñado para máximo contexto, mínimo tokens.
> Actualizado: 2026-05-11

---

## Identidad del Proyecto

**GymBase** = instancia de **MemberBase** (plataforma SaaS white-label) especializada en gimnasios.
Arquitectura monorepo:
- `apps/gymbase` → app Next.js principal con toda la lógica
- `clients/gymbase/iron-gym/` → configuración de cliente real (theme + supabase config)
- **NOTA:** `packages/core` referenciado en docs pero NO existe en el repo — fue eliminado, la lógica está directamente en `apps/gymbase`

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 App Router (TypeScript strict) |
| Backend | Supabase (Postgres 17 + Auth + Storage + RLS) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animaciones | Framer Motion |
| Estado global | Zustand |
| Formularios | React Hook Form + Zod v4 |
| Monorepo | pnpm workspaces (solo `apps/*` en workspace) |

**Supabase project_id:** `vwkxrjnxfjfzobzzoagj`  
**GYMBASE_ORG_ID:** `00000000-0000-0000-0000-000000000001` (dev) — en prod es UUID real de `organizations`

---

## Design Tokens

```css
--background: #0A0A0A       /* Fondo principal */
--surface:    #111111        /* Cards y paneles */
--primary:    #FF5E14        /* Acento naranja */
--border:     #1E1E1E
--text:       #F5F5F5
--text-muted: #737373
--success:    #22C55E
--warning:    #FACC15
--danger:     #EF4444
```

**Tipografía:**
- Headings: `Barlow Condensed` (condensado, gym aesthetic)
- Body: `DM Sans`

---

## Configuración de Tema (IMPORTANTE — estado actual en transición)

Actualmente `layout.tsx` lee config desde DB vía `getOrgConfig()` → header `x-org-config` del middleware → `buildThemeVars(config)`. **Este sistema tiene bugs** (ver _ESTADO-ACTUAL.md).

**Destino (M17 — code-driven):**
- `GYM_CLIENT` env var define el cliente activo (ej: `iron-gym`)
- `layout.tsx` importará `clients/gymbase/${GYM_CLIENT}/theme.config.ts` directamente
- Sin DB, sin middleware config, sin cache → tema inmutable en build time

**Archivos de config:**
- `apps/gymbase/theme.config.ts` → template base / fallback de desarrollo
- `clients/gymbase/iron-gym/theme.config.ts` → config del primer cliente (incompleta aún)

---

## Patrones Críticos

### Auth / Roles
- Roles: `admin` | `member` | `owner` (en `profiles.role`)
- Todo Server Action llama `getCurrentUser()` al inicio — nunca confiar en el cliente
- RLS: tablas usan `get_user_org_id()` SECURITY DEFINER para filtrar por org
- `get_user_role()` SECURITY DEFINER — retorna rol del usuario autenticado
- Trigger `handle_new_user()` crea el `profile` en signup — `SECURITY DEFINER`, `ON CONFLICT DO NOTHING`
- Rate limiting en login: RPC `count_recent_login_attempts()` — max 5 intentos / 15 min
- Google OAuth: solo para miembros; admin/owner rechazados en `/auth/callback`

### Multi-Tenancy (Fase 1 actual)
- Un deployment = un gym = un proyecto Supabase
- `getOrgId()` obtiene ID de primera fila en `organizations` + cachea en variable de módulo
- Fallback: `process.env.GYMBASE_ORG_ID`
- Todas las queries deben filtrar por `org_id`
- **NUNCA** omitir el filtro `org_id` en queries de producción

### Server Actions
```typescript
// Estructura obligatoria de todo action
export async function exampleAction(input: unknown): Promise<ActionResult<T>> {
  // 1. getCurrentUser() — siempre primero
  // 2. Verificar rol
  // 3. schema.safeParse(input) — Zod
  // 4. Lógica con service layer
  // 5. revalidatePath(...)
  // 6. return { success: true, data }
}
type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string | Record<string, string[]> }
```

### Actions vs Services
- `actions/` → auth + validación + revalidatePath + retorna ActionResult
- `services/` → raw DB queries, sin auth, sin revalidación, lanza error en fallo

### "use server" en barrel files (Next.js 16 + Turbopack)
Todo archivo en `actions/` debe tener `"use server"` en la primera línea. Sin esto, Turbopack incluye el archivo en el bundle del cliente y falla en build.

### RLS — Bug conocido en content
La policy `content_select_published_with_active_subscription` no muestra contenido sin restricción de plan. Ver fix pendiente en _ESTADO-ACTUAL.md.

---

## Feature Flags (en theme.config.ts)

```typescript
features: {
  community: true,
  content: true,
  gym_qr_checkin: true,
  gym_health_metrics: true,
  gym_routines: true,
  gym_progress: true,          // ← A desactivar (fotos de progreso removidas)
  gym_calendar: true,
  gym_challenges: true,
  gym_member_custom_routines: true,
  gym_inventory: true,
  gym_marketplace: true,
  gym_accounting: true,
}
```

---

## Módulos Clave — Detalles de Implementación

### Rutinas (migración 000013, 000014, one_rep_max_tests)
- Un miembro puede tener N rutinas activas; la `is_featured=true` aparece en dashboard
- `UNIQUE INDEX idx_gym_member_routines_featured ON gym_member_routines(user_id) WHERE is_featured = true`
- `fetchMemberRoutine()` = alias de `fetchFeaturedRoutine()` → retorna `is_featured=true`
- `getMemberRoutineStack(userId?)` devuelve `{ active[], history[] }`
- `gym_personal_records` UNIQUE en `(user_id, exercise_id)` — upsert con `onConflict: "user_id,exercise_id"`
- `gym_workout_logs.exercises_done` (jsonb): `{ exercises: [{ routine_exercise_id, exercise_id, exercise_name, sets: [{ set_number, weight_kg, reps, completed, is_pr }] }] }`
- `/portal/routines/page.tsx`: 1 rutina → workout view directo; 2+ rutinas → `RoutineSelector`
- Feature flag `gym_member_custom_routines` → flujo 3 pasos en `/portal/routines/new`
- `getExercisesForMember(search?)` incluye privados del miembro (`is_private_to_user`)
- **Gráficas:** `ExerciseProgressModal` extrae datos de `gym_workout_logs` sin tabla nueva
- **Tests 1RM** (`gym_one_rep_max_tests`): independiente de PRs; UI en `/portal/routines/strength`

### Retos (migración 20260101000018_challenges_extended_v2)
- Tipos: `attendance | workout | weight | weight_loss | personal_record | custom`
- Triggers automáticos SECURITY DEFINER: `trg_challenge_attendance`, `trg_challenge_workout`, `trg_challenge_pr`, `trg_challenge_weight_loss`
- Patrón DELETE+INSERT en triggers de personal_record y weight_loss (no acumula)
- `gym_challenge_participants.baseline_weight_kg` — primer snapshot de salud asigna baseline

### Calendario (migración 000017)
- `gym_scheduled_classes`: `recurrence_group_id` (self FK), `recurrence_rule`, `recurrence_weeks`
- Primera instancia de serie: `recurrence_group_id = id`
- `bookClass` valida: clase no empieza en < 30 min; inserta con `status='waitlist'` si llena
- `cancelMyBooking` promueve automáticamente al primero en waitlist + email
- Emails via Resend → siempre fire-and-forget en try/catch

### Comunidad (migración community_v2)
- Solo admins crean posts — RLS `posts_insert_admin_only`
- `community_post_plans (post_id, plan_id)` M2M — si vacío: post visible para todos
- `community_reactions` UNIQUE `(post_id, user_id)` — un usuario, una reacción; toggle off si mismo tipo
- `fetchPostsForMember(userId)` filtra por plan activo del miembro en service layer (no RLS)

### Contenido (bug RLS — ver _ESTADO-ACTUAL.md)
- `content_plans (content_id, plan_id)` M2M — si vacío DEBERÍA ser visible para todos, pero RLS actual lo bloquea
- Fix pendiente: migración que actualiza `content_select_published_with_active_subscription`
- `getContentForUserPaginated()` — paginado, con search y categorySlug

### Pagos
- `payment_proofs.amount` puede ser NULL — fallback: `proof.amount ?? subscription?.plan?.price ?? null`
- Signed URLs: usar `adminClient.storage.createSignedUrl()` (service_role)
- `if (!proof.file_path) return proof;` antes de `createSignedUrl` — pagos manuales tienen `file_path = ""`
- `registerManualPayment` = flujo frío (crea suscripción + proof desde cero)
- `renewManualSubscription` = flujo contextual (actualiza suscripción existente)
- `approvePayment` detecta suscripción activa vigente → encola nuevo período desde su vencimiento
- NO usar `next/image` para signed URLs de Supabase → usar `<img>` estándar

### Storage Buckets
```
community-covers    → portadas de posts (público)
challenge-banners   → banners de retos
content-media       → thumbnails y media de contenido
progress-photos     → fotos de progreso (a eliminar con CAMBIO 1)
exercise-media      → videos/imágenes de ejercicios
```
- `avatars` bucket: NO existe aún — crear para foto de perfil (CAMBIO 2)

### Timezone
- Costa Rica = `America/Costa_Rica` = UTC-6 sin DST
- Todas las timestamps en UTC en Supabase
- Usar `lib/time.ts` para conversiones

---

## Estructura de Carpetas (apps/gymbase/src)

```
actions/     → auth, calendar, challenge, checkin, community, content, content-portal,
               exercise, health, inventory, member, membership, owner, payment,
               progress, register, routine, settings, workout
services/    → admin, calendar, category, challenge, checkin, community,
               exercise, health, routine, workout
components/
  gym/
    calendar/    → AdminCalendarHeader, WeekView, ClassBlock, ScheduleForm, PortalCalendarView
    challenges/  → ChallengeCard, ChallengeForm, LogProgressForm, AdminRankingSidebar
    checkin/     → QRDisplay, QRScanner, OccupancyWidget, OccupancyKiosk, AttendanceTable
    community/   → AdminPostComposer
    content/     → AddContentForm, GymContentClient
    exercises/   → ExerciseForm, ExerciseLibraryClient
    health/      → HealthMetricsForm, HealthProfileCard, HealthSnapshotList
    members/     → AddMemberForm, AssignRoutineButton, MemberProfileEditForm
    payments/    → GymPaymentsClient
    progress/    → ProgressChart, ProgressPhotos, ProgressSummaryCard (fotos a eliminar)
    routines/    → RoutineBuilderClient, RoutineDayEditor, MyRoutineView, PortalWorkoutView
  admin/   → PlanForm
  shared/  → GymRegisterForm, TagFilterBar, Pagination
  ui/      → shadcn base components
```

---

## Rutas Principales

| Ruta | Tipo | Descripción |
|---|---|---|
| `/admin` | Dashboard | KPIs: miembros activos, pagos pendientes, ocupación |
| `/admin/members` | Admin | Lista y gestión de miembros |
| `/admin/members/[id]` | Admin | Detalle: rutina, salud, pagos (opaque ID) |
| `/admin/payments` | Admin | Aprobar/rechazar comprobantes |
| `/admin/plans` | Admin | CRUD de planes de membresía |
| `/admin/routines` | Admin | Builder de rutinas (opaque ID) |
| `/admin/calendar` | Admin | Calendario semanal de clases |
| `/admin/challenges` | Admin | Gestión de retos |
| `/admin/occupancy` | Admin | Vista de kiosko QR + asistencia |
| `/admin/inventory` | Admin | Inventario de productos |
| `/admin/sales` | Admin | Historial de ventas + POS |
| `/admin/health` | Admin | Vista de tendencias de salud de miembros |
| `/admin/settings` | Admin | Configuración del gym |
| `/owner/dashboard` | Owner | KPIs financieros |
| `/owner/finances` | Owner | Cashflow y comparativas |
| `/owner/members` | Owner | Reporte de membresías |
| `/owner/inventory` | Owner | Reporte de inventario |
| `/owner/attendance` | Owner | Reporte de asistencia |
| `/portal/dashboard` | Portal | Dashboard del miembro |
| `/portal/membership` | Portal | Estado de membresía y pago |
| `/portal/routines` | Portal | Rutina asignada + workout view |
| `/portal/routines/new` | Portal | Crear rutina propia (flag: gym_member_custom_routines) |
| `/portal/routines/strength` | Portal | StrengthTracker: PRs + tests 1RM |
| `/portal/calendar` | Portal | Ver y reservar clases |
| `/portal/challenges` | Portal | Ver retos activos y registrar progreso |
| `/portal/progress` | Portal | Métricas de salud (fotos a eliminar) |
| `/portal/community` | Portal | Feed de comunidad |
| `/portal/content` | Portal | Biblioteca de contenido |
| `/portal/store` | Portal | Tienda (flag: gym_marketplace) |
| `/qr/scan` | Público | Kiosko de scan QR |
| `/occupancy` | Público | Vista de ocupación en tiempo real |

---

## Constantes Clave

```typescript
DEFAULT_GYM_CAPACITY = 50
MAX_CHECKIN_HOURS = 4
MUSCLE_GROUPS = [chest, back, shoulders, biceps, triceps, forearms,
                 quads, hamstrings, glutes, calves, core, full_body]
DIFFICULTY_LEVELS = [beginner, intermediate, advanced, expert]
FITNESS_LEVELS = [beginner, intermediate, advanced, athlete]
CHALLENGE_TYPES = [attendance, weight, weight_loss, workout, personal_record, custom]
GYM_STORAGE_BUCKETS = {
  PROGRESS_PHOTOS: "progress-photos",   // A eliminar con CAMBIO 1
  EXERCISE_MEDIA: "exercise-media",
  CHALLENGE_BANNERS: "challenge-banners",
  COMMUNITY_COVERS: "community-covers",
  CONTENT_MEDIA: "content-media",
  AVATARS: "avatars"                     // Crear con CAMBIO 2
}
```

---

## Notas de Implementación Importantes

1. `community_posts.user_id` tiene **dos FKs**: una a `auth.users(id)` y otra a `profiles(id)` — necesaria para join `author:profiles(full_name)`
2. `payment_proofs` usa `adminClient` para signed URLs — el anon key no puede
3. `gym_attendance_logs` UNIQUE INDEX parcial `(user_id) WHERE check_out_at IS NULL` — previene check-ins duplicados abiertos
4. `gym_member_routines` UNIQUE INDEX `(user_id) WHERE is_featured = true` — una rutina destacada por miembro
5. `assignRoutineByPlans` no filtra por `org_id` en subscriptions (pueden tener NULL) — el filtro por `plan_id` acota al gym
6. `duration_minutes` en `gym_attendance_logs` es columna GENERADA (STORED) — no insertar manualmente
7. `getOrgId()` cachea resultado en variable de módulo del servidor
8. Opaque IDs en URLs: `toOpaqueId(uuid)` / `fromOpaqueId(opaque)` en `src/lib/utils/opaque-id.ts`; aplicado a `/admin/members/[id]` y `/admin/routines/[id]`
