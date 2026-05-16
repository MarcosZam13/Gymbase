# Arquitectura — Multi-tenant SaaS: Una cuenta, múltiples gyms

> Decisión final: 2026-05-11  
> Estado: **Pendiente de implementar**

---

## El modelo

GymBase es una marca SaaS. Un usuario crea UNA cuenta (email+contraseña o Google) y puede unirse a cualquier gym que use GymBase. Su rol puede ser diferente en cada gym. Sus datos (rutinas, progreso, membresía) son exclusivos de cada gym.

**Analogía exacta**: Slack. Una cuenta, múltiples workspaces, rol distinto en cada uno, datos completamente separados por workspace.

```
Una cuenta GymBase ──────────────────────────────────────────
                  │                │                │
         Iron Gym (org A)   Zenith (org B)   FitPro (org C)
         role: owner         role: member     role: admin
         rutinas propias     rutinas propias  rutinas propias
         membresía activa    membresía activa membresía expirada
         checkins propios    checkins propios checkins propios
```

---

## Por qué un solo Supabase

- **Costo**: un proyecto en lugar de N — escala sin pagar por cada gym
- **Auth compartida**: Google OAuth y recuperación de contraseña funcionan globalmente
- **SaaS real**: GymBase como marca tiene sentido — una cuenta que funciona en cualquier gym
- **Simplicidad operativa**: un solo lugar para migraciones, backups, monitoreo
- **Deploy por gym sigue igual**: cada gym tiene su URL y su `GYMBASE_ORG_ID`, pero todos apuntan al mismo Supabase

---

## Schema: el cambio central

### Antes (estado actual — problemático)

```sql
profiles
├── id         -- = auth.users.id
├── email
├── full_name
├── avatar_url
├── phone
├── role       -- ❌ único y global — no sirve para multi-gym
├── org_id     -- ❌ único — solo un gym por persona
├── current_streak    -- ❌ gym-specific pero está en global
├── longest_streak    -- ❌ gym-specific
└── last_checkin_at   -- ❌ gym-specific
```

### Después (objetivo)

```sql
-- Datos GLOBALES del usuario — una fila por persona, sin org_id
profiles
├── id         -- = auth.users.id, PK
├── email
├── full_name
├── avatar_url
├── phone
├── created_at
└── updated_at

-- Membresía POR GYM — una fila por (usuario, gym)
org_members
├── id              UUID PK
├── user_id         UUID FK → profiles.id  ON DELETE CASCADE
├── org_id          UUID FK → organizations.id  ON DELETE CASCADE
├── role            text  CHECK IN ('member', 'admin', 'owner')  DEFAULT 'member'
├── current_streak  int   DEFAULT 0    -- checkins consecutivos EN ESE GYM
├── longest_streak  int   DEFAULT 0
├── last_checkin_at timestamptz
├── joined_at       timestamptz DEFAULT now()
└── UNIQUE (user_id, org_id)           -- una membresía por gym
```

**El resto de las tablas ya tiene `org_id`** — no cambian:
- `subscriptions` → membresía/pago en ese gym ✅
- `gym_routines`, `gym_member_routines` → rutinas en ese gym ✅
- `gym_health_profile`, `gym_health_snapshots` → progreso en ese gym ✅
- `gym_attendance_logs` → checkins en ese gym ✅
- `gym_challenges`, `gym_challenge_participants` → retos en ese gym ✅
- Todos los demás módulos ✅

---

## Flujo de registro / login en un gym

### Caso 1: Usuario nuevo en GymBase
1. Entra a `zenith.gymbase.app` → hace click en "Registrarse"
2. Se crea `auth.users` + `profiles` (trigger `handle_new_user`)
3. Se crea `org_members(user_id, org_id=zenith, role='member')`
4. El admin aprueba su pago → membresía activa en Zenith

### Caso 2: Usuario existente que se une a un nuevo gym
1. Entra a `iron-gym.gymbase.app` → "Registrarse" → pone su email GymBase
2. Supabase reconoce el email → login (o Google OAuth)
3. El sistema detecta que NO tiene `org_members` para iron-gym
4. Se crea `org_members(user_id, org_id=iron-gym, role='member')`
5. Flujo normal de membresía

### Caso 3: Login en gym donde ya tiene cuenta
1. Entra a `zenith.gymbase.app` → login con su cuenta GymBase
2. El sistema encuentra su `org_members` para zenith con su rol
3. Accede normalmente — sus rutinas, progreso y membresía de Zenith intactos

---

## Cambios necesarios en el código

### 1 — Migración DB

```sql
-- Crear org_members con los datos actuales
CREATE TABLE org_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('member', 'admin', 'owner')),
  current_streak  int NOT NULL DEFAULT 0,
  longest_streak  int NOT NULL DEFAULT 0,
  last_checkin_at timestamptz,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);

-- Migrar datos existentes
INSERT INTO org_members (user_id, org_id, role, current_streak, longest_streak, last_checkin_at, joined_at)
SELECT id, org_id, role, current_streak, longest_streak, last_checkin_at, created_at
FROM profiles WHERE org_id IS NOT NULL;

-- Limpiar profiles
ALTER TABLE profiles
  DROP COLUMN role,
  DROP COLUMN org_id,
  DROP COLUMN current_streak,
  DROP COLUMN longest_streak,
  DROP COLUMN last_checkin_at;
```

### 2 — Funciones SECURITY DEFINER (RLS)

```sql
-- get_user_role(): ahora lee de org_members para el org activo
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM org_members
  WHERE user_id = auth.uid()
    AND org_id = (
      SELECT id FROM organizations LIMIT 1  -- un solo org por deploy
    )
  LIMIT 1;
$$;

-- get_user_org_id(): misma lógica, retorna el org_id del usuario en este deploy
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT org_id FROM org_members
  WHERE user_id = auth.uid()
    AND org_id = (SELECT id FROM organizations LIMIT 1)
  LIMIT 1;
$$;
```

### 3 — RLS en `profiles`

La tabla `profiles` pierde `org_id`, así que su RLS cambia:

```sql
-- Los usuarios solo ven y editan su propio perfil global
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = profiles.id
      AND om.org_id = get_user_org_id()
  ));
-- Admins del gym pueden ver perfiles de miembros de ese gym
```

### 4 — App: getCurrentUser()

`src/lib/supabase/server.ts`:

```typescript
// JOIN profiles + org_members para obtener rol en el gym actual
const { data } = await supabase
  .from("profiles")
  .select(`
    id, email, full_name, avatar_url, phone,
    membership:org_members!inner(role, org_id, current_streak, longest_streak)
  `)
  .eq("id", user.id)
  .eq("membership.org_id", await getOrgId())
  .single();

return {
  ...data,
  role: data?.membership?.role,  // rol en ESTE gym
};
```

Si el JOIN no encuentra `org_members` → el usuario no está en este gym → crear membresía o redirigir.

### 5 — Actions que cambian

| Archivo | Cambio |
|---|---|
| `settings.actions.ts` — `getAdmins()` | Query de `org_members JOIN profiles` |
| `settings.actions.ts` — `promoteToAdmin/Owner()` | Upsert en `org_members` |
| `settings.actions.ts` — `revokeAdmin()` | UPDATE `org_members.role` |
| `settings.actions.ts` — `searchMembers()` | JOIN con `org_members` para filtrar por org |
| `member.actions.ts` — crear miembro | Crear `org_members` row además de invitar |
| `auth.actions.ts` — registro | Crear `org_members` en signup (además de `profiles`) |
| `checkin.actions.ts` — checkout | Actualizar streak en `org_members`, no en `profiles` |

### 6 — Trigger handle_new_user

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Crear/actualizar perfil global
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Obtener el org de este deploy
  SELECT id INTO v_org_id FROM organizations LIMIT 1;

  -- Crear membresía en este gym si no existe
  IF v_org_id IS NOT NULL THEN
    INSERT INTO org_members (user_id, org_id, role)
    VALUES (
      NEW.id,
      v_org_id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'member')
    )
    ON CONFLICT (user_id, org_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
```

---

## Estimación

| Tarea | Tiempo |
|---|---|
| Migración DB + funciones + RLS | ~3h |
| `getCurrentUser()` + auto-join en login | ~2h |
| Actions de settings, member, checkin | ~3h |
| Testing completo (roles, rutinas, progreso, checkins) | ~2h |
| **Total** | **~1 día** |

---

## Decisión: Auto-join ✅

Cuando alguien con cuenta GymBase entra a un gym donde no está registrado:
1. Se crea `org_members(user_id, org_id, role='member')` automáticamente al login
2. Sin suscripción activa → ve solo la pantalla de membresía
3. Desde ahí puede subir su comprobante SINPE → admin aprueba → acceso completo
4. **O** el admin lo agrega manualmente desde el panel y le activa la membresía

Ambos caminos ya existen en el sistema. El refactor de `org_members` no cambia este flujo, solo lo extiende para usuarios que ya tienen cuenta en otro gym.
