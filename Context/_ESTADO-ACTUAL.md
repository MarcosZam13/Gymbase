# _ESTADO-ACTUAL — GymBase

> Snapshot al 2026-05-16. Todos los módulos completos. Demo funcional. M17 code-driven config aplicado. Multi-gym (org_members) en DB. Build limpio, zero errores TypeScript.

---

## Resumen de Módulos

| Módulo                               | Estado                                         |
| ------------------------------------ | ---------------------------------------------- |
| 1 — Miembros & Perfiles              | ✅ Completo                                     |
| 2 — Pagos & Suscripciones            | ✅ Completo                                     |
| 3 — Rutinas                          | ✅ Completo (pendiente: drag-and-drop, variantes) |
| 4 — Calendario & Clases              | ✅ Completo                                     |
| 5 — Comunidad                        | ✅ Completo                                     |
| 6 — Contenido                        | ✅ Completo (bug RLS resuelto 2026-05-11)       |
| 7 — Retos                            | ✅ Completo                                     |
| 8 — Inventario                       | ✅ Completo                                     |
| 9 — Marketplace / Tienda             | ✅ Completo                                     |
| 10 — Contabilidad & Reportes         | ✅ Completo                                     |
| 11 — Salud & Progreso                | ✅ Completo (fotos removidas 2026-05-11)        |
| 12 — Infraestructura & Escalabilidad | ✅ Completo                                     |
| 13 — Seguridad & Optimización        | ✅ Completo base (pendiente: audit post-M18)    |
| 14 — Google OAuth                    | ✅ Código listo — config Cloud Console pendiente |
| 15 — SaaS Multi-Tenant               | ✅ Completo (org_members, multi-gym 2026-05-13) |
| 17 — Config Code-Driven por Gym      | ✅ Completo (2026-05-16)                        |
| 16 — Demo & QA                       | 🟡 En progreso                                 |

---

## Lo que funciona hoy ✅

### Core
- Auth — login, registro, forgot/reset password, rate limiting (5 intentos / 15 min)
- Google OAuth — código listo, pantalla consent pendiente de configurar en Cloud Console
- Planes de membresía — CRUD admin, selección portal
- Pagos SINPE — upload comprobante, aprobación/rechazo, signed URLs
- Contenido — biblioteca multimedia, RLS corregida
- Comunidad — posts, comentarios, reacciones, moderación, segmentación por plan

### GymBase
- Check-in QR — generación, scanner, auto-checkout, ocupación en tiempo real
- Rutinas — biblioteca, constructor, asignación individual y por plan, workout view, PRs, 1RM, gráficas
- Calendario — clases, reservas, recurrencia, waitlist + email
- Retos — 6 tipos, inscripción, progreso, ranking, badges, triggers automáticos
- Salud — perfil, snapshots de métricas (fotos removidas por decisión legal)
- Miembros — creación, edición perfil, avatar upload, lista con asistencia mensual
- Inventario + Tienda — CRUD productos, ventas POS, portal de tienda
- Contabilidad — dashboard owner, cashflow, reportes por período, exportación CSV

### Multi-Gym (org_members)
- Tabla `org_members (user_id, org_id, role)` — un usuario puede existir en múltiples gyms con roles distintos
- `get_user_org_id()` y `get_user_role()` SECURITY DEFINER — usan `org_members`
- Auth callback hace auto-join al primer gym visitado
- DB ya migrada (2026-05-13)

### Temas (M17 — code-driven)
- `NEXT_PUBLIC_GYM_CLIENT` env var define el gym activo en build time
- `clients/gymbase/<nombre>/theme.config.ts` — colores, tipografía, radio, features, pagos
- Sin DB, sin cache, sin hydration mismatch — tema inmutable por deploy
- Clientes activos: `iron-gym` (3001), `zenith-club` (3002)
- Pendiente: prebuild script para copiar assets (logo/favicon) por gym automáticamente

---

## Plan de trabajo — 2026-05-16

| # | Tarea                                              | Tiempo est. | Estado      |
|---|----------------------------------------------------|-------------|-------------|
| 1 | Documentar estado actual (este archivo + contexto) | 15 min      | ✅ Hecho    |
| 2 | Prebuild script para assets por gym                | 10 min      | ⬜ Pendiente |
| 3 | QA — RLS audit post-migración org_members          | 30 min      | ⬜ Pendiente |
| 4 | Optimizaciones básicas de queries (select *)       | 20 min      | ⬜ Pendiente |
| 5 | Deploy a Vercel de iron-gym como demo              | 30 min      | ⬜ Pendiente |

---

## Pendiente técnico activo

| Ítem                                        | Impacto   | Cuándo        |
|---------------------------------------------|-----------|---------------|
| Prebuild script assets por gym              | Media     | Hoy           |
| RLS audit post-org_members                  | Alta      | Hoy           |
| Optimizar select('*') → columnas específicas | Baja-media | Hoy          |
| Google OAuth — config Cloud Console         | Alta      | Con dominio   |
| Error monitoring (Sentry free tier)         | Alta      | Antes gym #2  |
| Drag-and-drop en builder de rutinas         | Baja      | Post-venta    |
| Variantes de ejercicios (UI)                | Baja      | Post-venta    |
| Demo seed script automatizado               | Media     | Antes gym #3  |

---

## Pendiente legal y de negocio

| Ítem                                          | Cuándo              |
|-----------------------------------------------|---------------------|
| Privacy Policy + TOS en la app                | Antes primer cobro  |
| Dominio de marca (gymbase.app o similar)      | Con primera venta   |
| Google OAuth consent screen + dominio         | Con dominio         |
| SMTP propio para emails (Resend gratis)       | Antes primer cobro  |
| Contrato SaaS con el gym (abogado)            | Antes primer cobro  |
| Inscripción Hacienda como contrib. independ.  | Antes primer cobro  |
| Sistema factura electrónica                   | Antes primer cobro  |
| CCSS como trabajador independiente            | Antes primer cobro  |
| Cuenta bancaria separada                      | Antes primer cobro  |

---

## Sobre Google OAuth y el dominio de marca

Google OAuth se configura **una sola vez para GymBase como plataforma** (no por gym). El usuario ve "GymBase quiere acceder a tu cuenta". Google requiere:
- Un dominio verificado (ej: `gymbase.app`)
- URL de Privacy Policy pública en ese dominio
- URL de Terms of Service

**Mientras tanto (modo pruebas):** En Google Cloud el app puede estar en modo "En pruebas" — funciona solo con emails que se agreguen manualmente. Perfecto para beta con amigos sin necesidad de dominio ni verificación.

**Supabase free tier:** Aguanta perfectamente para el primer gym. La única limitación visible para el usuario es que los emails (confirmación, reset password) salen del dominio de Supabase. Para emails con marca propia necesitas configurar SMTP (Resend tiene free tier generoso).

---

## Clientes activos

| Cliente      | Org ID                                | Puerto | Estado                          |
|-------------|---------------------------------------|--------|---------------------------------|
| iron-gym     | 00000000-0000-0000-0000-000000000001 | 3001   | ✅ Datos de demo completos      |
| zenith-club  | 00000000-0000-0000-0000-000000000002 | 3002   | ✅ Config lista, datos mínimos  |

---

## Bugs conocidos activos

Ninguno crítico conocido al 2026-05-16.

- ~~Content RLS bug~~ ✅ Resuelto 2026-05-11
- ~~Tema dinámico DB inconsistente~~ ✅ Resuelto con M17 2026-05-16
- ~~Fotos de progreso~~ ✅ Removidas 2026-05-11
