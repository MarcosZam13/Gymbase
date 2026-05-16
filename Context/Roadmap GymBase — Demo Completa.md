# 🗺️ Roadmap GymBase — Demo Completa

> Actualizado: 2026-05-11
> Objetivo inmediato: demo lista esta semana

---

## Estado general

- [x] Módulo 1 — Miembros & Perfiles ✅
- [x] Módulo 2 — Pagos & Suscripciones ✅
- [x] Módulo 3 — Rutinas ✅
- [x] Módulo 4 — Calendario & Clases ✅
- [x] Módulo 5 — Comunidad ✅
- [x] Módulo 6 — Contenido ✅ *(bug RLS pendiente)*
- [x] Módulo 7 — Retos ✅
- [x] Módulo 8 — Inventario ✅
- [x] Módulo 9 — Marketplace / Tienda ✅
- [x] Módulo 10 — Contabilidad & Reportes ✅
- [x] Módulo 11 — Salud & Progreso ✅ *(fotos a remover)*
- [x] Módulo 12 — Infraestructura & Escalabilidad ✅
- [x] Módulo 13 — Seguridad & Optimización ✅
- [x] Módulo 14 — Google OAuth ✅ *(config manual pendiente)*
- [~] Módulo 15 — SaaS Multi-Tenant P1+P2 ✅; P3 reemplazado por M17
- [ ] Módulo 17 — Config Code-Driven por Gym 🔴 *prioritario para demo*
- [ ] Módulo 16 — Demo & QA *(después de los cambios abajo)*

---

## 🎯 PLAN ESTA SEMANA — Para la Demo

### Día 1 (hoy) — Fixes críticos y Engram setup

**0. Setup Engram** *(~1h — hacer primero para documentar el resto)*
- [ ] Instalar Engram localmente (Docker o binario Go)
- [ ] Configurar MCP de Engram en Claude Code settings
- [ ] Ingresar `_CONTEXTO-IA.md` y `_ESTADO-ACTUAL.md` como base
- [ ] Verificar que búsquedas funcionan desde Claude Code

**1. Fix RLS de Contenido** *(~30 min — migración)*
- [ ] Aplicar migración `20260511000001_fix_content_rls.sql`
- [ ] Verificar con usuario de prueba que ve contenido sin plan asignado
- [ ] Verificar que contenido con plan sigue restringido correctamente

```sql
-- Migración: fix_content_rls.sql
DROP POLICY IF EXISTS "content_select_published_with_active_subscription" ON content;

CREATE POLICY "content_select_published_with_active_subscription"
ON content FOR SELECT
USING (
  (org_id = get_user_org_id()) AND (
    -- Admins y owners ven todo
    (get_user_role() IN ('admin', 'owner'))
    OR
    -- Miembros: contenido publicado
    (is_published = true AND (
      -- Sin restricción de plan → todos los miembros activos lo ven
      NOT EXISTS (SELECT 1 FROM content_plans cp WHERE cp.content_id = content.id)
      OR
      -- Con restricción → el miembro debe tener ese plan activo
      EXISTS (
        SELECT 1 FROM subscriptions s
        JOIN content_plans cp ON cp.plan_id = s.plan_id
        WHERE s.user_id = auth.uid()
          AND s.status = 'active'
          AND cp.content_id = content.id
          AND (s.expires_at IS NULL OR s.expires_at > now())
      )
    ))
  )
);
```

**2. Eliminar fotos de progreso** *(~2h)*
- [ ] `apps/gymbase/theme.config.ts` → `gym_progress: false`
- [ ] `clients/gymbase/iron-gym/theme.config.ts` → `gym_progress: false` (ya estaba false)
- [ ] Eliminar `ProgressPhotos.tsx` del portal `/portal/progress/page.tsx`
- [ ] Eliminar `BeforeAfterComparison.tsx` del portal
- [ ] Eliminar sección de fotos en Tab Salud del admin (`/admin/members/[id]`)
- [ ] Bottom nav: verificar que `gym_progress` off elimina el ícono (o cambiar a solo métricas)
- [ ] Limpiar `progress.actions.ts`: comentar/eliminar `uploadProgressPhoto`, `deleteProgressPhoto`, `getProgressPhotos`
- [ ] Verificar que métricas de salud (peso, grasa, músculo) siguen funcionando con `gym_health_metrics: true`

---

### Día 2 — Uploads a Supabase Storage

**3. Foto de perfil real** *(~3h)*
- [ ] Crear bucket `avatars` en Supabase (público, RLS: lectura pública, escritura solo dueño)
- [ ] Server Action `uploadProfilePhoto(formData)` en `member.actions.ts`:
  - Valida tipo (jpeg/png/webp) y tamaño (max 2MB)
  - Sube a `avatars/{userId}.{ext}`
  - Actualiza `profiles.avatar_url` con URL pública
- [ ] Componente `AvatarUpload.tsx` en `components/shared/`: área de click + preview
- [ ] Integrar en `MemberProfileEditForm.tsx` (admin edita foto de miembro)
- [ ] Integrar en portal Mi Perfil (miembro edita su propia foto)

**4. Upload de imágenes para contenido** *(~2h)*
- [ ] Verificar/crear bucket `content-media` en Supabase
- [ ] Server Action `uploadContentThumbnail(formData)` en `content.actions.ts`
- [ ] Integrar en `AddContentForm.tsx` — reemplazar campo URL por upload + preview
- [ ] Mantener campo URL como fallback/alternativa (YouTube thumbnail auto-fill)

**5. Upload de banners para retos** *(~1h)*
- [ ] Bucket `challenge-banners` ya existe — verificar RLS
- [ ] Server Action `uploadChallengeBanner(formData)` en `challenge.actions.ts`  
- [ ] Integrar en `ChallengeForm.tsx` — reemplazar campo URL por upload

---

### Día 3 — Migración Code-Driven M17

**6. Migración Code-Driven Config M17** *(~1 día)*

Orden estricto — hacer en secuencia:

- [ ] **6a.** Completar `clients/gymbase/iron-gym/theme.config.ts`:
  - Copiar estructura completa de `apps/gymbase/theme.config.ts`
  - Actualizar colores dark gym (primario naranja, fondo negro)
  - Completar datos de pago SINPE (pendiente de datos del cliente)
  - Features: activar los módulos reales del gym (sin `gym_inventory` ni `gym_marketplace` si no aplica)

- [ ] **6b.** Crear `src/lib/theme-loader.ts` (carga config según `GYM_CLIENT` env var):
  ```typescript
  // Importa dinámicamente la config del cliente o el fallback
  const client = process.env.GYM_CLIENT ?? 'default';
  ```

- [ ] **6c.** Simplificar `layout.tsx`:
  - Quitar `getOrgConfig()` y `buildThemeVars(config)` async
  - Importar config estáticamente desde theme-loader
  - Mantener `buildThemeVars(themeConfig)` sincrónico

- [ ] **6d.** Limpiar middleware:
  - Eliminar `resolveOrg()` config resolution
  - Mantener solo `orgId` resolution (para multi-tenancy)
  - Eliminar header `x-org-config`

- [ ] **6e.** Eliminar archivos obsoletos:
  - `src/lib/get-org-config.ts`
  - `src/components/shared/DynamicThemeProvider.tsx`
  - `src/app/(owner)/owner/settings/appearance/` (o marcar como placeholder)

- [ ] **6f.** Corregir layouts hardcodeados:
  - `apps/gymbase/src/app/owner/layout.tsx` → `bg-[#0A0A0A]` → `bg-background` con CSS var
  - `apps/gymbase/src/app/(auth)/layout.tsx` → `#FF5E14` hardcodeado → `var(--primary)`

- [ ] **6g.** Agregar `GYM_CLIENT=iron-gym` a `.env.local`

- [ ] **6h.** Documentar en `docs/runbook-nuevo-gym.md`:
  - Cómo crear un nuevo cliente: copiar carpeta iron-gym, editar theme.config.ts
  - Variables de entorno necesarias
  - Pasos de deploy en Vercel

---

### Día 4 — QA y Seed de Demo

**7. Seed de demo** *(~3h)*
- [ ] Script `supabase/seeds/demo-seed.sql` con datos realistas:
  - 3 planes (Básico, Premium, Elite)
  - 15 miembros con historial de pagos
  - 2 semanas de clases programadas
  - 3 retos activos (asistencia, rutina, custom)
  - 10 posts de comunidad con imágenes
  - 10 contenidos (videos + artículos) por plan
  - 30 productos de inventario
  - 3 meses de datos financieros
- [ ] 3 cuentas de demo: miembro / admin / owner con datos ricos

**8. QA Básico** *(~2h)*
- [ ] Recorrido completo como miembro nuevo → registro → pago → portal
- [ ] Recorrido completo como admin → aprobar pago → asignar rutina → calendario
- [ ] Recorrido completo como owner → dashboard financiero → reportes
- [ ] Probar en celular (Android)
- [ ] Verificar sin errores en consola

---

### Post-Demo — Engram Documentación Completa

Una vez que la demo esté lista, migrar toda la documentación a Engram:

**Notas a ingresar:**
1. Stack y arquitectura completa
2. Cada módulo con su estado, schema y decisiones
3. Bugs conocidos y fixes aplicados
4. RLS policies importantes y sus razones
5. Flujos críticos (auth, pagos, rutinas, contenido)
6. Runbook de nuevo gym
7. Variables de entorno por entorno (dev/prod)

**Estructura en Engram:**
```
gymbase/
├── arquitectura/     → decisiones, trade-offs, M17 code-driven
├── modulos/          → estado detallado de cada módulo
├── bugs/             → causa raíz + fix de cada bug
├── db/               → schema, migraciones, RLS policies
├── deploy/           → runbooks, env vars, pasos de setup
└── contexto/         → para IAs: patrones, constantes, notas críticas
```

---

## Lo que YA NO es necesario

*(Estos ítems estaban en el roadmap pero fueron eliminados o reemplazados)*

- ~~M15 P3 config desde DB~~ → reemplazado por M17 code-driven
- ~~DynamicThemeProvider~~ → se elimina en M17
- ~~AppearanceClient / /owner/settings/appearance~~ → se elimina o convierte en read-only
- ~~packages/core workspace~~ → no existe; lógica está directamente en apps/gymbase
- ~~`gym_progress` feature~~ → se desactiva (fotos legalmente complejas)
- ~~Contenido solo por plan (RLS rota)~~ → fix en Día 1

---

## Cambios que Rompen el Modelo Actual

1. **M17 code-driven** → elimina flujo DB config; layouts que hardcodeaban colores deben usar CSS vars → **testing visual obligatorio antes de entregar**
2. **Fix RLS content** → migración de Supabase → probar que content sin planes sigue siendo visible solo para miembros activos
3. **Eliminar gym_progress** → remover referencias en nav y layouts anidados → probar mobile bottom nav

---

## Para el Primer Gym de Pago

Después de la demo, antes del primer cliente:
- [ ] Google OAuth configurado en Cloud Console
- [ ] Privacidad y Términos publicados en la app
- [ ] Contrato SaaS redactado
- [ ] Deploy limpio en Vercel con dominio del gym
- [ ] GYMBASE_ORG_ID con UUID real del gym en producción
- [ ] Script `init-gym.sql` completo para onboarding
