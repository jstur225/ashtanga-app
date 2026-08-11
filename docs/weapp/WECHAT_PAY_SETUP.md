# 微信小程序支付部署清单

> 更新日期：2026-08-11
> 接入模式：普通商户直连
> 小程序 AppID：`wx36f4826bc022d43f`
> 微信支付商户号：`1748730805`

## 当前代码状态

- 季卡：¥19.8，90 天；年卡：¥69.8，365 天。
- 小程序已接套餐选择、购买说明确认、`wx.requestPayment`、支付后主动查单和会员状态刷新。
- 服务端已接微信支付 API v3 下单、响应验签、回调验签与 AES-256-GCM 解密。
- 数据库已提供支付订单账本和幂等会员履约函数；重复回调不会重复增加会员期限。
- 支付密钥没有写入小程序、Git 或文档。

## 一、先在 Supabase 执行迁移

在 Supabase SQL Editor 中完整执行：

`supabase/migrations/20260811_add_wechat_payment_orders.sql`

执行后应存在：

- `public.payment_orders`
- `public.fulfill_membership_payment(text,text,timestamptz,integer,text)`

随后执行 `supabase/rls_release_audit.sql`。支付部分应满足：

- `payment_orders.rls_enabled = true`
- anon/authenticated 均无支付订单表的数据权限
- 履约函数仅 `service_role_can_fulfill = true`

## 二、在 Vercel 配置服务端环境变量

以下变量配置到 Production；需要预览环境联调时再同步到 Preview：

```text
WECHAT_MINI_APP_ID=wx36f4826bc022d43f
WECHAT_MINI_APP_SECRET=<新小程序的 AppSecret>
WECHAT_PAY_MCH_ID=1748730805
WECHAT_PAY_MERCHANT_SERIAL_NO=<商户 API 证书序列号>
WECHAT_PAY_PRIVATE_KEY_BASE64=<apiclient_key.pem 的 Base64>
WECHAT_PAY_API_V3_KEY=<32字节 APIv3 密钥>
WECHAT_PAY_PUBLIC_KEY_ID=<PUB_KEY_ID_...>
WECHAT_PAY_PUBLIC_KEY_BASE64=<微信支付公钥 PEM 的 Base64>
WECHAT_PAY_NOTIFY_URL=https://ash.ashtangalife.online/api/membership/order/notify
```

注意：

- AppSecret 必须属于新 AppID，不能继续使用旧主体小程序的 AppSecret。
- `apiclient_key.pem` 是商户私钥，不能使用 `apiclient_cert.pem` 代替。
- 微信支付公钥与商户 API 证书是两套不同材料，公钥 ID 一般以 `PUB_KEY_ID_` 开头。
- 所有环境选择完成后需要重新部署 Vercel，旧部署不会自动取得新变量。

### Windows 将 PEM 复制为 Base64（不在终端显示明文）

商户私钥：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\你的目录\apiclient_key.pem")) | Set-Clipboard
```

微信支付公钥：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\你的目录\wechatpay_public_key.pem")) | Set-Clipboard
```

执行后直接在 Vercel 对应环境变量中粘贴，不要发到聊天、截图或提交 Git。

## 三、平台确认

- 商户平台“产品中心 → APPID账号管理/授权管理”中，新 AppID 显示已关联。
- “产品中心 → JSAPI支付”显示已开通；小程序支付与 JSAPI 支付共享该产品权限。
- 小程序公众平台“微信支付 → 商户号管理”显示商户号已关联。
- 确认小程序经营类目与付费数字化会员服务匹配。
- 若公众平台将其识别为交易类小程序，按平台要求接入订单发货管理；正式发布前不能忽略该提示。

## 四、第一笔真机验收

1. 使用已登录的测试邮箱进入“我的 → 设置 → 会员”。
2. 选择季卡或年卡，确认页面展示价格、天数和“不会自动续费”。
3. 未勾选购买说明时支付按钮不可用；勾选后才能调起微信收银台。
4. 取消支付：不增加会员期限，订单保持未支付。
5. 完成支付：页面显示开通/续费成功，会员到期日增加对应天数。
6. 返回网页端刷新，会员状态与小程序一致。
7. 检查 `payment_orders`：金额、套餐、`transaction_id`、`paid_at`、`membership_id` 齐全。
8. 重复查询同一订单，不得新增第二条会员记录。

如果已经扣款但小程序提示确认超时，不要重复付款。先在微信支付商户平台核对订单，再查看 Vercel 日志中的微信 `Request-ID` 和 `payment_orders` 状态。

## 五、首版售后边界

- 首版退款由商户平台人工处理，不在小程序内提供自助退款按钮。
- 人工退款后还需要同步调整 `payment_orders` 状态和对应会员期限；在自动退款闭环开发完成前，每笔退款都要留下处理记录。
- 上线前必须完成一笔真实支付和一笔真实退款演练。
