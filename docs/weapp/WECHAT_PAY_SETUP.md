# 微信小程序虚拟支付部署清单

> 更新日期：2026-08-11
> 支付方式：微信小程序虚拟支付 · 道具直购
> AppID：`wx36f4826bc022d43f`
> OfferID：`1450603187`

## 当前方案

- Pro 季卡：道具 ID `pro90d`，19.8 元，90 天。
- Pro 年卡：道具 ID `pro365d`，69.8 元，365 天。
- 两个道具都是一次性购买，不自动续费，不申请“会员订阅”能力。
- Android 开发阶段使用沙箱环境；苹果 IAP 暂不启用。
- 小程序调用 `wx.requestVirtualPayment`；AppKey 和 `session_key` 只在服务端参与签名。
- 支付成功后由服务端主动查询 `/xpay/query_order`，幂等开通会员，再调用 `/xpay/notify_provide_goods` 确认发货。

## 一、Supabase 数据库迁移

原普通支付订单表已存在时，在 Supabase SQL Editor 执行：

`supabase/migrations/20260811_migrate_payment_orders_to_virtual_pay.sql`

迁移会为 `payment_orders` 增加：

- `payment_provider`
- `product_id`
- `wechat_openid`
- `virtual_env`
- `virtual_provided_at`

原订单不会删除，旧记录会标记为 `wechat_pay_v3`；新订单使用 `wechat_virtual_pay`。

## 二、Vercel 环境变量

保留已有 Supabase 和小程序 AppID/AppSecret 配置，新增：

```text
WECHAT_VIRTUAL_PAY_OFFER_ID=1450603187
WECHAT_VIRTUAL_PAY_ENV=1
WECHAT_VIRTUAL_PAY_SANDBOX_APP_KEY=<虚拟支付后台的沙箱 AppKey>
WECHAT_VIRTUAL_PAY_PRODUCTION_APP_KEY=<虚拟支付后台的现网 AppKey>
```

注意：

- 当前 Android 开发版本测试必须设置 `WECHAT_VIRTUAL_PAY_ENV=1`。
- AppKey 不得写入小程序代码、Git、文档、截图或聊天。
- 修改环境变量后必须重新部署 Vercel，旧部署不会自动取得新变量。
- 正式发布前，道具发布到现网并生效后，才把 `WECHAT_VIRTUAL_PAY_ENV` 改为 `0`。
- 普通微信支付的 9 项旧变量暂时保留，虚拟支付验收完成后再决定是否清理。

## 三、微信后台

- “虚拟支付 → 基本配置”显示 AppID、OfferID、沙箱/现网 AppKey。
- “道具配置 → 开发版本”存在 `pro90d` 与 `pro365d`，价格分别为 1980 分、6980 分。
- 沙箱测试期间不启用“平台路径”和“苹果 IAP 支付”。
- 开发版道具刚保存或发布时可能需要约 10 分钟生效。

## 四、服务健康检查

重新部署后访问：

`https://ash.ashtangalife.online/api/membership/payment-health`

沙箱配置完整时应返回：

```json
{
  "success": true,
  "data": {
    "ready": true,
    "error_code": null,
    "provider": "wechat_virtual_pay",
    "env": 1,
    "offer_id": "1450603187"
  }
}
```

健康检查不会返回 AppKey。

## 五、Android 沙箱验收

1. 使用微信开发者工具上传开发版，并在 Android 真机打开。
2. 登录测试邮箱，进入“我的 → 设置 → 会员”。
3. 未勾选购买说明时，支付按钮不可提交。
4. 先测试取消支付：会员期限不能变化。
5. 分别测试季卡和年卡；拉起界面必须来自 `wx.requestVirtualPayment`。
6. 支付完成后页面自动查单并显示 Pro；网页刷新后会员期限一致。
7. 查看 `payment_orders`：provider、product、openid、env、transaction、membership、发货时间完整。
8. 重复查询同一订单，不得重复增加会员期限。

常见错误：

- `-15006`：支付签名或 AppKey 错误。
- `-15007`：`wx.login` 会话过期，重新发起支付。
- `-15010`：道具未发布到当前环境。
- `-15011`：小程序版本与 `env` 不匹配。
- `-15013`：代码价格与后台道具价格不一致。
- `-15014`：道具刚发布尚未生效，等待约 10 分钟。

## 六、暂不执行

- 不开通自动续费会员订阅。
- 不启用苹果 IAP；Android 沙箱通过后另开一轮。
- 不启用平台路径；支付页面和正式路径稳定后再设置。
- 不删除普通微信支付证书和旧环境变量。
