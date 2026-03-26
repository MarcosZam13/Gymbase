-- 20260101000005_gym_challenges.sql — Tablas para retos, gamificación y badges
-- Nota: org_id es un UUID simple (viene de GYMBASE_ORG_ID), sin FK a organizations

-- ============================================================
-- TABLA: gym_challenges
-- Retos creados por el administrador (asistencia, peso, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_challenges (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL,
  title              text NOT NULL,
  description        text,
  type               text NOT NULL
                       CHECK (type IN ('attendance', 'workout', 'weight', 'custom')),
  goal_value         numeric NOT NULL,
  goal_unit          text NOT NULL,
  starts_at          timestamptz NOT NULL,
  ends_at            timestamptz NOT NULL,
  max_participants   integer,
  is_public          boolean NOT NULL DEFAULT true,
  banner_url         text,
  prize_description  text,
  created_by         uuid NOT NULL REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_challenge_dates CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_gym_challenges_org ON gym_challenges(org_id, ends_at DESC);

ALTER TABLE gym_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_challenges" ON gym_challenges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Miembros ven retos públicos
CREATE POLICY "members_see_public_challenges" ON gym_challenges
  FOR SELECT USING (is_public = true);

-- ============================================================
-- TABLA: gym_challenge_participants
-- Miembros inscritos en cada reto
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_challenge_participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  uuid NOT NULL REFERENCES gym_challenges(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'withdrawn')),
  joined_at     timestamptz NOT NULL DEFAULT now()
);

-- Un miembro no puede inscribirse dos veces al mismo reto
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_challenge_participants_unique
  ON gym_challenge_participants(challenge_id, user_id);

CREATE INDEX IF NOT EXISTS idx_gym_challenge_participants_challenge
  ON gym_challenge_participants(challenge_id);

ALTER TABLE gym_challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_participants" ON gym_challenge_participants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Miembros gestionan su propia participación
CREATE POLICY "members_manage_own_participation" ON gym_challenge_participants
  FOR ALL USING (user_id = auth.uid());

-- Todos pueden ver el ranking (quién participa)
CREATE POLICY "members_see_ranking" ON gym_challenge_participants
  FOR SELECT USING (true);

-- ============================================================
-- TABLA: gym_challenge_progress
-- Registros de progreso de cada participante
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_challenge_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  uuid NOT NULL REFERENCES gym_challenge_participants(id) ON DELETE CASCADE,
  value           numeric NOT NULL,
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  notes           text
);

CREATE INDEX IF NOT EXISTS idx_gym_challenge_progress_participant
  ON gym_challenge_progress(participant_id, recorded_at DESC);

ALTER TABLE gym_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_manage_own_progress" ON gym_challenge_progress
  FOR ALL USING (
    participant_id IN (
      SELECT id FROM gym_challenge_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_see_all_progress" ON gym_challenge_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- TABLA: gym_challenge_badges
-- Badges/medallas otorgados al completar o ganar un reto
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_challenge_badges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL,
  challenge_id  uuid NOT NULL REFERENCES gym_challenges(id) ON DELETE CASCADE,
  earned_at     timestamptz NOT NULL DEFAULT now(),
  type          text NOT NULL CHECK (type IN ('completed', 'winner', 'top3'))
);

-- Un usuario solo puede tener un badge por tipo por reto
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_challenge_badges_unique
  ON gym_challenge_badges(user_id, challenge_id, type);

ALTER TABLE gym_challenge_badges ENABLE ROW LEVEL SECURITY;

-- Solo el admin otorga badges
CREATE POLICY "admin_manage_badges" ON gym_challenge_badges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Todos los miembros pueden ver los badges (leaderboard)
CREATE POLICY "members_see_badges" ON gym_challenge_badges
  FOR SELECT USING (true);
