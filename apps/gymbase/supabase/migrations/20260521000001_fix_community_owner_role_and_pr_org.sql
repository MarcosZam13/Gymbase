-- fix_community_owner_role_and_pr_org
-- Fecha: 2026-05-21
-- 1. community_posts: policies extendidas para incluir rol 'owner'
-- 2. storage community-covers: upload permitido a owner también
-- 3. luisymarcos3113@gmail.com promovido a owner en iron-gym

-- ── community_posts ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "posts_insert_admin_only" ON community_posts;
CREATE POLICY "posts_insert_admin_only" ON community_posts
  FOR INSERT WITH CHECK (
    org_id = get_user_org_id() AND get_user_role() IN ('admin', 'owner')
  );

DROP POLICY IF EXISTS "posts_select_members" ON community_posts;
CREATE POLICY "posts_select_members" ON community_posts
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND (is_visible = true OR get_user_role() IN ('admin', 'owner'))
  );

DROP POLICY IF EXISTS "posts_update_own_or_admin" ON community_posts;
CREATE POLICY "posts_update_own_or_admin" ON community_posts
  FOR UPDATE USING (
    org_id = get_user_org_id()
    AND (user_id = auth.uid() OR get_user_role() IN ('admin', 'owner'))
  );

DROP POLICY IF EXISTS "posts_delete_own_or_admin" ON community_posts;
CREATE POLICY "posts_delete_own_or_admin" ON community_posts
  FOR DELETE USING (
    org_id = get_user_org_id()
    AND (user_id = auth.uid() OR get_user_role() IN ('admin', 'owner'))
  );

-- ── storage: community-covers ────────────────────────────────────────────────

DROP POLICY IF EXISTS "community_covers_admin_upload" ON storage.objects;
CREATE POLICY "community_covers_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'community-covers'
    AND get_user_role() IN ('admin', 'owner')
  );

-- ── owner role para luisymarcos3113@gmail.com en iron-gym ────────────────────

UPDATE org_members
SET role = 'owner'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'luisymarcos3113@gmail.com')
  AND org_id = '00000000-0000-0000-0000-000000000001';
