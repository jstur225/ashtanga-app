-- 微信小程序普通商户支付订单与会员幂等履约
-- 商户号：1748730805；金额始终由服务端套餐表决定。

CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  out_trade_no VARCHAR(32) UNIQUE NOT NULL,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  email VARCHAR(255),
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('quarter', 'year')),
  description VARCHAR(127) NOT NULL,
  amount_total INTEGER NOT NULL CHECK (amount_total > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'CNY' CHECK (currency = 'CNY'),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'prepay', 'paid', 'closed', 'failed', 'refunded')),
  prepay_id TEXT,
  transaction_id VARCHAR(64) UNIQUE,
  membership_id UUID REFERENCES user_memberships(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  fail_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_auth_user_created
  ON payment_orders(auth_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_profile_status
  ON payment_orders(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status_created
  ON payment_orders(status, created_at);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payment_orders FROM anon, authenticated;

COMMENT ON TABLE payment_orders IS '微信小程序支付订单账本；客户端不可直读写，只能通过服务端接口访问';
COMMENT ON COLUMN payment_orders.amount_total IS '订单金额，单位为分，由服务端套餐表固定';

CREATE OR REPLACE FUNCTION fulfill_membership_payment(
  p_out_trade_no TEXT,
  p_transaction_id TEXT,
  p_paid_at TIMESTAMPTZ,
  p_amount_total INTEGER,
  p_currency TEXT
)
RETURNS TABLE (
  order_id UUID,
  membership_id UUID,
  expires_at TIMESTAMPTZ,
  already_fulfilled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order payment_orders%ROWTYPE;
  v_membership_id UUID;
  v_current_expiry TIMESTAMPTZ;
  v_base_time TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_order
  FROM payment_orders
  WHERE out_trade_no = p_out_trade_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_ORDER_NOT_FOUND';
  END IF;

  IF v_order.amount_total <> p_amount_total OR v_order.currency <> p_currency THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH';
  END IF;

  IF v_order.status = 'paid' THEN
    RETURN QUERY
      SELECT v_order.id, v_order.membership_id, um.expires_at, TRUE
      FROM user_memberships um
      WHERE um.id = v_order.membership_id;
    RETURN;
  END IF;

  IF v_order.status IN ('refunded', 'closed') THEN
    RAISE EXCEPTION 'PAYMENT_ORDER_NOT_FULFILLABLE';
  END IF;

  -- 锁定 profile，序列化同一账号并发到达的两笔成功支付。
  PERFORM 1 FROM user_profiles WHERE id = v_order.profile_id FOR UPDATE;

  SELECT MAX(um.expires_at) INTO v_current_expiry
  FROM user_memberships um
  WHERE um.user_id = v_order.profile_id
    AND um.expires_at > NOW();

  v_base_time := GREATEST(COALESCE(v_current_expiry, NOW()), NOW());
  v_expires_at := v_base_time + make_interval(days => v_order.duration_days);

  INSERT INTO user_memberships (
    user_id,
    email,
    type,
    started_at,
    expires_at
  ) VALUES (
    v_order.profile_id,
    v_order.email,
    v_order.plan,
    COALESCE(p_paid_at, NOW()),
    v_expires_at
  )
  RETURNING id INTO v_membership_id;

  UPDATE payment_orders
  SET status = 'paid',
      transaction_id = p_transaction_id,
      membership_id = v_membership_id,
      paid_at = COALESCE(p_paid_at, NOW()),
      fail_reason = NULL,
      updated_at = NOW()
  WHERE id = v_order.id;

  RETURN QUERY SELECT v_order.id, v_membership_id, v_expires_at, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION fulfill_membership_payment(TEXT, TEXT, TIMESTAMPTZ, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fulfill_membership_payment(TEXT, TEXT, TIMESTAMPTZ, INTEGER, TEXT) TO service_role;
