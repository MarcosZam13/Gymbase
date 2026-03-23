-- 009_user_cancel_subscription.sql — Permite que un usuario cancele su propia suscripción activa o pendiente

-- Agregar política que permite al usuario actualizar su suscripción
-- únicamente para cambiar el estado a 'cancelled', y solo cuando está 'active' o 'pending'
CREATE POLICY "subscriptions_cancel_own"
  ON subscriptions FOR UPDATE
  USING (
    user_id = auth.uid()
    AND status IN ('active', 'pending')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'cancelled'
  );
