-- Convert the existing membership payment ledger to WeChat Virtual Payment.
-- Safe to run repeatedly after 20260811_add_wechat_payment_orders.sql.

ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS product_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(128),
  ADD COLUMN IF NOT EXISTS virtual_env SMALLINT,
  ADD COLUMN IF NOT EXISTS virtual_provided_at TIMESTAMPTZ;

UPDATE public.payment_orders
SET payment_provider = 'wechat_pay_v3'
WHERE payment_provider IS NULL;

ALTER TABLE public.payment_orders
  ALTER COLUMN payment_provider SET DEFAULT 'wechat_virtual_pay';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_orders_payment_provider_check'
      AND conrelid = 'public.payment_orders'::regclass
  ) THEN
    ALTER TABLE public.payment_orders
      ADD CONSTRAINT payment_orders_payment_provider_check
      CHECK (payment_provider IN ('wechat_pay_v3', 'wechat_virtual_pay'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_orders_virtual_env_check'
      AND conrelid = 'public.payment_orders'::regclass
  ) THEN
    ALTER TABLE public.payment_orders
      ADD CONSTRAINT payment_orders_virtual_env_check
      CHECK (virtual_env IS NULL OR virtual_env IN (0, 1));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_payment_orders_virtual_openid_status
  ON public.payment_orders(wechat_openid, status)
  WHERE payment_provider = 'wechat_virtual_pay';

COMMENT ON COLUMN public.payment_orders.payment_provider IS
  'Payment gateway: wechat_virtual_pay for Pro virtual goods; legacy rows may be wechat_pay_v3.';
COMMENT ON COLUMN public.payment_orders.product_id IS
  'Published WeChat Virtual Payment product ID, currently pro90d or pro365d.';
COMMENT ON COLUMN public.payment_orders.wechat_openid IS
  'OpenID returned by the wx.login code used to sign and query this virtual payment order.';
COMMENT ON COLUMN public.payment_orders.virtual_env IS
  'WeChat Virtual Payment environment: 0 production, 1 sandbox.';
COMMENT ON COLUMN public.payment_orders.virtual_provided_at IS
  'Time at which /xpay/notify_provide_goods was acknowledged successfully.';
