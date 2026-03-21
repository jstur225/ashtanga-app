# 腾讯文档智能表API接入项目

## 项目状态：⏸️ 暂停 - 等待域名备案

## 背景
目标：通过API读写腾讯文档（企业微信）智能表格
遇到的问题：可信域名验证失败，域名备案主体与企业微信主体不一致

## 已完成工作

### 1. 发现API方案 ✅
- 确认腾讯文档智能表可通过**企业微信API**操作
- 文档地址：https://developer.work.weixin.qq.com/document/path/97392
- API端点：`https://qyapi.weixin.qq.com/cgi-bin/wedoc/...`

### 2. 获取应用凭证 ✅
- AgentId: `1000024`
- Secret: `X_G5v4-Fgw_9azP5V49Yf5HLmUIf_TPRn2SrZld5Drs`
- CorpID: `wwd6d0aeb824f5ad13`

### 3. 成功获取access_token ✅
```bash
curl "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=wwd6d0aeb824f5ad13&corpsecret=X_G5v4-Fgw_9azP5V49Yf5HLmUIf_TPRn2SrZld5Drs"
```
- 返回access_token成功
- 接口调用正常

### 4. 遇到的问题 ❌
**错误码：48002** - API未授权
原因：应用需要在企业微信后台配置「文档API权限」，但配置前需要完成「可信域名验证」

### 5. 可信域名验证问题 ❌
- 现有域名：`xingtuwenhua.top`
- 备案主体：广州星图深处文化有限公司（法人：华琳）
- 企业微信主体：星图深处（南京）文化传媒有限公司（法人：张陵）
- **问题**：两者不一致，无法通过验证

### 6. 验证文件已部署 ✅
- 文件位置：`/var/www/html/WW_verify_hxCmjyScrVbFgD3k.txt`
- 文件内容：`hxCmjyScrVbFgD3k`
- 可访问：`http://xingtuwenhua.top/WW_verify_hxCmjyScrVbFgD3k.txt` ✅
- 服务器：1.15.242.246（宝塔面板）

## 待完成工作

### 域名备案
**方案：购买新域名，用南京公司备案**

#### 步骤：
1. 购买新域名（建议 `xingtushenchu.com` 等）
2. 以星图深处（南京）文化传媒有限公司提交备案
3. 等待管局审核（10-20个工作日）
4. 备案通过后配置域名解析到 1.15.242.246
5. 在企业微信后台配置新域名为可信域名
6. 完成可信域名验证

#### 所需材料：
- 南京公司营业执照
- 法人身份证（张陵）
- 网站负责人身份证

### API权限配置
备案完成后：
1. 登录企业微信管理后台
2. 进入「协作」→「文档」→「API」
3. 配置「可调用接口的应用」，添加应用（AgentId: 1000024）
4. 测试API调用

### 智能表格操作
目标表格：`https://doc.weixin.qq.com/smartsheet/s3_AcYAEgYWAKMCN23fvOFEDRGiTyI1e`
- fileID: `s3_AcYAEgYWAKMCN23fvOFEDRGiTyI1e`
- sheetID: `q979lj`

待测试API：
- 查询字段：`GET /wedoc/smartsheet/get_fields`
- 添加记录：`POST /wedoc/smartsheet/add_records`
- 查询记录：`GET /wedoc/smartsheet/get_records`

## 相关链接
- 企业微信文档API文档：https://developer.work.weixin.qq.com/document/path/97392
- 腾讯云备案文档：https://cloud.tencent.com/document/product/243/19617
- 服务器IP：1.15.242.246
- 宝塔面板：已安装

## 预计恢复时间
等待域名备案完成（购买域名后约10-20个工作日）

## 备注
- 服务器配置无需改动
- 验证文件已部署，新域名解析后可复用
- nginx只需添加新域名到server_name

---
记录时间：2026-03-12

---

## 2026-03-13 更新：更换服务器

### 🔄 服务器变更
**原因**：备案主体需要与企业微信主体一致

**新服务器**：
- 主机名：`lhins-h5kengx3`
- IP地址：`182.254.180.33`
- 旧IP：`1.15.242.246`（已废弃）

### ✅ 待完成事项

1. **部署验证文件到新服务器**
   ```bash
   # 在新服务器创建验证文件
   mkdir -p /var/www/html
   echo "hxCmjyScrVbFgD3k" > /var/www/html/WW_verify_hxCmjyScrVbFgD3k.txt
   
   # 配置nginx
   server {
       listen 80;
       server_name xingtuwenhua.top; # 或新域名
       
       location / {
           root /var/www/html;
           index index.html;
       }
   }
   ```

2. **域名解析**
   - 将域名解析到新IP：`182.254.180.33`
   - 或使用新域名（如果已购买）

3. **测试验证文件**
   ```bash
   curl http://xingtuwenhua.top/WW_verify_hxCmjyScrVbFgD3k.txt
   # 应返回: hxCmjyScrVbFgD3k
   ```

4. **企业微信配置**
   - 登录企业微信管理后台
   - 配置可信域名（使用新域名）
   - 验证通过后启用API权限

### 📋 下一步行动
- [ ] 在新服务器部署验证文件
- [ ] 配置nginx
- [ ] 测试验证文件可访问
- [ ] 企业微信配置可信域名
- [ ] 测试API调用

---


---

## 2026-03-13 下午更新：更换服务器

### 🔄 服务器变更完成

**新服务器**：
- 主机名：`VM-0-13-opencloudos`
- IP地址：`182.254.180.33`
- 系统：OpenCloudOS
- 面板：宝塔Linux面板
- 旧IP：`1.15.242.246`（已废弃）

**更换原因**：
- 域名备案主体必须与企业微信主体一致
- 新服务器可以使用南京公司主体备案

### ✅ 已完成工作

1. **验证文件部署**
   - 路径：`/var/www/html/WW_verify_hxCmjyScrVbFgD3k.txt`
   - 内容：`hxCmjyScrVbFgD3k`
   - 状态：✅ 创建成功
   - 测试：`cat /var/www/html/WW_verify_hxCmjyScrVbFgD3k.txt` ✅

2. **服务器环境**
   - 系统：OpenCloudOS 9
   - Web面板：宝塔Linux面板
   - HTTP服务器：nginx（宝塔自带）

### ⏸️ 等待域名备案

**下一步行动**（域名备案通过后）：

1. **登录宝塔面板**
   - 地址：`http://182.254.180.33:8888`
   - 添加网站（输入域名）

2. **配置网站**
   - 根目录：`/var/www/html`（或宝塔默认路径）
   - 类型：纯静态

3. **测试验证文件**
   ```bash
   curl http://域名/WW_verify_hxCmjyScrVbFgD3k.txt
   # 应返回: hxCmjyScrVbFgD3k
   ```

4. **企业微信配置**
   - 配置可信域名
   - 启用API权限
   - 测试API调用

### 📋 备案信息

**备案主体**：星图深处（南京）文化传媒有限公司
**所需材料**：
- 南京公司营业执照
- 法人身份证（张陵）
- 网站负责人身份证

**预计时间**：10-20个工作日

---

