-- 修改外键约束：删除激活码时自动置空会员记录中的引用
-- 原因：激活码只是开通方式之一，删码不应影响已有会员权益

ALTER TABLE user_memberships
  DROP CONSTRAINT user_memberships_activated_by_code_id_fkey,
  ADD CONSTRAINT user_memberships_activated_by_code_id_fkey
    FOREIGN KEY (activated_by_code_id) REFERENCES activation_codes(id)
    ON DELETE SET NULL;
