# _ESTADO-ACTUAL — GymBase

> Snapshot al 2026-05-11. Módulos 1–14 completos. Módulo 15 P1+P2 ✅, P3 reemplazado por M17 (code-driven config). **Pendiente de demo:** bug RLS content, remover fotos progreso, upload imágenes a Storage, migración M17 code-driven.

---

## Resumen de Módulos

| Módulo                               | Estado             | Prioridad                           |
| ------------------------------------ | ------------------ | ----------------------------------- |
| 1 — Miembros & Perfiles              | ✅ Completo         |                                     |
| 2 — Pagos & Suscripciones            | ✅ Completo         |                                     |
| 3 — Rutinas                          | ✅ Completo         |                                     |
| 4 — Calendario & Clases              | ✅ Completo         |                                     |
| 5 — Comunidad                        | ✅ Completo         |                                     |
| 6 — Contenido                        | ✅ Completo (bug RLS resuelto 2026-05-11) |                      |
| 7 — Retos                            | ✅ Completo         |                                     |
| 8 — Inventario                       | ✅ Completo         |                                     |
| 9 — Marketplace / Tienda             | ✅ Completo         |                                     |
| 10 — Contabilidad & Reportes         | ✅ Completo         |                                     |
| 11 — Salud & Progreso                | ✅ Completo (fotos removidas 2026-05-11) |                    |
| 12 — Infraestructura & Escalabilidad | ✅ Completo (infra → M15/M16) |                             |
| 13 — Seguridad & Optimización        | ✅ Completo         |                                     |
| 14 — Google OAuth                    | ✅ Código listo; config manual pendiente |                    |
| 15 — SaaS Multi-Tenant (Fase 2)      | P1+P2 ✅; P3 reemplazado por M17 |                           |
| 17 — Config Code-Driven por Gym      | 🔴 Prioritario — reemplaza M15 P3 | 🔴 Para demo          |
| 16 — Demo & QA                       | ❌ Pendiente        | Alta (antes de mostrar a gyms)      |

---

## Lo que funciona hoy ✅

### Core (MemberBase)
- Autenticación — login, registro, forgot/reset password, rate limiting
- Planes de membresía — CRUD admin, selección portal
- Pagos SINPE — subida de comprobante, aprobación/rechazo, signed URLs
- Contenido — biblioteca multimedia (bug RLS: ver sección de bugs abajo)
- Comunidad — foro con posts, comentarios, reacciones, moderación admin, segmentación por plan

### GymBase
- Check-in QR — generación, scanner, auto-checkout, manual fallback, ocupación en tiempo real
- Rutinas — biblioteca de ejercicios, constructor, asignación individual y batch por plan, workout view, PRs, 1RM, gráficas progresión
- Calendario — tipos de clase, programación semanal, reservas con validación de capacidad, recurrencia, waitlist
- Retos — 6 tipos, inscripción, progreso, ranking, badges, triggers automáticos
- Salud — perfil base, snapshots de métricas, fotos de progreso (a remover)
- Miembros — crear por invitación, editar perfil, lista con asistencia mensual
- Inventario + Tienda — CRUD productos, ventas POS, portal de tienda
- Contabilidad — dashboard owner, cashflow, reportes por período, exportación CSV

---

## Bugs Conocidos Pre-Demo 🔴

### ~~BUG 1 — Contenido no visible para miembros nuevos~~ ✅ RESUELTO (2026-05-11)
**Archivo:** Migración de RLS en Supabase  
**Causa raíz:** La RLS policy `content_select_published_with_active_subscription` requería:
```sql
EXISTS (
  SELECT 1 FROM subscriptions s JOIN content_plans cp ON cp.plan_id = s.plan_id
  WHERE s.user_id = auth.uid() AND s.status = 'active' AND cp.content_id = content.id
)
```
Si un contenido NO tiene entradas en `content_plans` (sin restricción de plan = visible para todos), el EXISTS falla → el contenido es invisible para cualquier miembro.  
**Fix:** Migración que actualiza la RLS: si `content_plans` está vacío para ese contenido → visible para cualquier miembro con suscripción activa.

```sql
-- Nueva lógica:
(is_published = true) AND (
  -- Sin restricción de plan → todos los activos lo ven
  NOT EXISTS (SELECT 1 FROM content_plans cp WHERE cp.content_id = content.id)
  OR
  -- Con restricción → debe tener plan activo asignado
  EXISTS (
    SELECT 1 FROM subscriptions s JOIN content_plans cp ON cp.plan_id = s.plan_id
    WHERE s.user_id = auth.uid() AND s.status = 'active' AND cp.content_id = content.id
    AND (s.expires_at IS NULL OR s.expires_at > now())
  )
)
```

### BUG 2 — Tema dinámico DB no funciona fuera de /owner/settings/appearance
`layout.tsx` llama `getOrgConfig()` (lee header `x-org-config` del middleware) → `buildThemeVars(config)`. El problema es que config DB solo se aplica correctamente desde la ruta de apariencia. Este bug se resuelve con M17 (code-driven).

---

## Cambios Para Demo *(pendiente de implementar)*

### CAMBIO 1 — Eliminar fotos de progreso *(~2h)*
**Razón:** Complejidad legal del manejo de fotos corporales.  
**Alcance:** Solo eliminar la funcionalidad de fotos — mantener métricas de salud (peso, grasa corporal, músculo).
- [ ] Desactivar feature flag `gym_progress` en `theme.config.ts` (apps/gymbase y iron-gym)
- [ ] Eliminar sección de fotos de `/portal/progress/page.tsx` (mantener métricas y PRs)
- [ ] Eliminar tab/sección de fotos en `/admin/members/[id]` → Tab Salud
- [ ] Eliminar `ProgressPhotos.tsx` component del bottom nav si aplica
- [ ] Verificar que `BeforeAfterComparison` component quede oculto
- [ ] Limpiar `progress.actions.ts` de funciones de foto (o dejar pero sin UI)

### CAMBIO 2 — Uploads de imagen a Supabase Storage *(~4-6h)*
**Alcance:** Foto de perfil, thumbnails de contenido, banners.

**a) Foto de perfil (miembros y admin):**
- Actualmente: `avatar_url` es un campo URL (no hay upload a Storage)
- Bucket requerido: `avatars` (crear si no existe, con política pública de lectura)
- Agregar `ImageUploadButton` en `MemberProfileEditForm` y en portal Mi Perfil
- Server Action: `uploadProfilePhoto(formData)` → sube a `avatars/{userId}.{ext}` → retorna URL pública → actualiza `profiles.avatar_url`

**b) Thumbnails de contenido:**
- Actualmente: campo `thumbnail_url` (URL manual)
- Bucket: `content-media` (crear o usar existente)
- Agregar upload opcional en `AddContentForm`

**c) Banners de contenido y retos:**
- Banners de retos: bucket `challenge-banners` ya existe
- Agregar UI de upload real en `ChallengeForm` (actualmente solo campo URL)

### CAMBIO 3 — Migración Code-Driven Config M17 *(~1 día)*
**Razón:** El sistema de config DB (M15 P3) tiene bugs de hidratación y no aplica tema fuera de la ruta de apariencia. Ver decisión arquitectónica completa en sección siguiente.

**Archivos a eliminar:**
- `src/lib/get-org-config.ts`
- `src/components/shared/DynamicThemeProvider.tsx`
- `src/app/(owner)/owner/settings/appearance/` (o convertir en read-only)
- Lógica `resolveOrg` del middleware (mantener solo orgId, remover config)

**Archivos a modificar:**
- `layout.tsx` → importar `themeConfig` de `clients/gymbase/${GYM_CLIENT}/theme.config.ts` directamente; usar `buildThemeVars(themeConfig)` sin async
- `middleware.ts` → remover `x-org-config` header y resolución de config
- `apps/gymbase/theme.config.ts` → mantener como template/fallback
- `clients/gymbase/iron-gym/theme.config.ts` → completar con todos los campos del template

**Variable de entorno nueva:**  
`GYM_CLIENT=iron-gym` → determina qué archivo de config se usa en build time.  
Si no está definida → usa `apps/gymbase/theme.config.ts` como fallback.

**Estructura final:**
```
clients/gymbase/
├── iron-gym/
│   ├── theme.config.ts      ← config completa del cliente (colores, features, pagos, etc.)
│   └── public/              ← assets del cliente (logo.svg, favicon)
├── power-gym/               ← próximo cliente
│   ├── theme.config.ts
│   └── public/
```

---

## Decisión Arquitectónica — Migración a Config Code-Driven por Gym *(2026-05-07)*

### Problema detectado
El sistema de config dinámica vía DB (M15 P3) tiene estos problemas:
1. **Tema no persiste globalmente** — solo se aplica desde `/owner/settings/appearance`
2. **Inconsistencia entre roles** — admin y member nunca ven el tema personalizado
3. **Complejidad runtime innecesaria** — cache dual, headers `x-org-config`, RPC `get_org_config`, hydration mismatch
4. **Mantenimiento frágil** — 4 capas difíciles de debugear

### Decisión: Build-time config por deploy
- Un deploy = un gym = un archivo de config
- `GYM_CLIENT` env var define cuál config se usa
- `layout.tsx` importa config estáticamente → sin DB, sin middleware, sin cache
- Logo en `public/` → carga instantánea

### Trade-offs
- Cada gym = deploy separado en Vercel (manejable para 5-10 gyms con Vercel CLI + GitHub Actions)
- Owner no cambia tema sin deploy → desarrollador controla cambios
- Para 20+ gyms → replantear (multi-tenant real con config DB)

---

## Preparación para Engram *(nuevo — 2026-05-11)*

**Engram** = app open source (PostgreSQL + Go) para almacenar y buscar contexto de proyectos. Tiene MCP server.

### Por qué
- La IA nunca pierde contexto del proyecto
- Búsqueda semántica sobre documentación y decisiones
- No hay que re-leer archivos de contexto en cada sesión → ahorra tokens

### Plan de documentación para Engram
Una vez instalado Engram y conectado su MCP al proyecto:

**Documentos a ingresar (en orden de prioridad):**
1. `_CONTEXTO-IA.md` — stack, patrones críticos, constantes
2. `_ESTADO-ACTUAL.md` — estado de módulos y bugs (este archivo)
3. Decisiones arquitectónicas (multi-tenancy, code-driven config)
4. Schema de DB (extraer de migraciones)
5. Flujos críticos (auth, pagos, rutinas, contenido)

**Estructura de notas sugerida en Engram:**
```
gymbase/
├── arquitectura/     → decisiones de diseño y trade-offs
├── modulos/          → estado y detalles de cada módulo
├── bugs/             → bugs conocidos y fixes aplicados
├── db/               → schema, migraciones, RLS policies
└── deploy/           → runbooks, variables de entorno, pasos de setup
```

---

## Pendiente por módulo — Solo ítems activos

### Módulo 3 — Rutinas (2 pendientes)
- [ ] Variantes por contexto — usar `parent_exercise_id` + `gym_exercise_alternatives`
- [ ] Reordenar ejercicios — drag-and-drop en el builder

### Módulo 14 — Google OAuth (config manual)
- [ ] Configurar Google OAuth en Cloud Console y Supabase Dashboard

### Módulo 15 P3 → Reemplazado por M17 code-driven
- [ ] M17 completo — ver CAMBIO 3 arriba

### Módulo 16 — Demo & QA
- [ ] Recorrido completo como miembro, admin, owner
- [ ] Testing en celular real
- [ ] Script `demo-seed.sql` con datos realistas
- [ ] Video Loom 2-3 min del flujo completo

### Deuda Técnica Activa
| Ítem | Ubicación | Impacto |
|---|---|---|
| ~~Content RLS bug~~ | ~~Migración Supabase~~ | ✅ Resuelto 2026-05-11 |
| Tema dinámico inconsistente | DynamicThemeProvider, AppearanceClient, middleware | 🔴 Se resuelve con M17 |
| `progress-photos` bucket público | `progress.actions.ts` | Media — se resuelve al eliminar fotos |
| `select('*')` sin columnas específicas | Varios services | Baja — no bloqueante |

---

## Pendientes Legales y de Negocio

### Antes de demo pública
- [ ] Privacy Policy publicada en la app
- [ ] Términos de Servicio publicados
- [ ] Links en footer de la app y en pantalla de registro

### Antes del primer cobro
- [ ] Contrato SaaS redactado por abogado
- [ ] Inscripción en Hacienda como contribuyente
- [ ] Sistema de factura electrónica configurado
- [ ] Inscripción CCSS como trabajador independiente
- [ ] Cuenta bancaria separada para ingresos del negocio
