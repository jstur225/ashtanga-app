# Chrome MCP 竞品调研指南

> **使用 Chrome MCP 自动化收集阿斯汤加瑜伽 app 竞品信息

---

## 🎯 调研目标

收集以下竞品的详细信息：
1. **iOS 竞品**：Ashtanga Yoga Days、Michael Gannon's Ashtanga Yoga
2. **中国竞品**：每日瑜伽、OH YOGA
3. **Android 竞品**：Ashtanga Yoga by Catico

---

## 📋 调研清单

### 基本信息（必须）
- [ ] App 名称和开发商
- [ ] App Store / Google Play 链接
- [ ] 评分和评价数量
- [ ] 定价信息
- [ ] 核心功能描述

### 深度体验（重要）
- [ ] 下载并安装 app
- [ ] 完成一次完整打卡流程
- [ ] 查看历史记录和数据统计
- [ ] 测试所有核心功能
- [ ] 截图保存关键页面

### 用户反馈（重要）
- [ ] 阅读 App Store 用户评价（至少20条）
- [ ] 总结高频正面/负面评价
- [ ] 识别用户痛点

---

## 🛠️ Chrome MCP 可用功能

### ✅ 可以自动化的任务

#### 1. 访问第三方评测网站
```
✅ YouTube 评测视频（标题、描述、评论）
✅ 技术博客/媒体评测文章
✅ Reddit / Product Hunt 讨论
✅ App 评测网站（如 AppAdvice、148Apps）
```

#### 2. 截图保存
```
✅ 自动截取访问的页面
✅ 保存为 PNG 文件
✅ 批量处理多个竞品
```

#### 3. 内容提取
```
✅ 提取页面文本内容
✅ 提取链接和标题
✅ 获取结构化数据
```

#### 4. 搜索功能
```
✅ 搜索竞品相关信息
✅ 查找用户讨论和评价
✅ 发现竞品更新动态
```

### ❌ 技术限制

#### App Store / Google Play
```
❌ 页面需要 JavaScript 渲染
❌ 部分内容动态加载
❌ 可能需要地区/登录验证
```

**解决方案**：
1. 访问第三方评测网站获取信息
2. 使用开发者工具手动查看
3. 实际下载 app 体验

---

## 🚀 推荐调研流程

### Phase 1: 信息收集（1-2小时）

使用 Chrome MCP 访问以下网站：

#### 1. YouTube 评测视频
```
搜索关键词：
- "Ashtanga Yoga Days app review"
- "Ashtanga Yoga Days tutorial"
- "Ashtanga Yoga app comparison"

信息获取：
- 视频标题和描述
- 核心功能演示
- 用户评论反馈
```

#### 2. 技术博客/媒体评测
```
推荐网站：
- AppAdvice (https://appadvice.com)
- 148Apps (https://148apps.com)
- MacRumors (https://www.macrumors.com/app-store/)
- Medium 搜索 "Ashtanga Yoga app review"

信息获取：
- 详细功能描述
- 专业评价
- 对比分析
```

#### 3. 社区讨论
```
推荐平台：
- Reddit (r/yoga, r/apps)
- Product Hunt
- Hacker News

信息获取：
- 真实用户反馈
- 使用场景
- 痛点和需求
```

#### 4. 开发商官网
```
信息获取：
- 产品定位和理念
- 更新日志
- 联系方式
```

### Phase 2: 实际体验（2-3小时）

#### 1. 下载并安装
- 从 App Store 下载竞品 app
- 创建测试账号（如需要）

#### 2. 核心流程测试
```
必测流程：
- [ ] 完整打卡一次
- [ ] 查看历史记录
- [ ] 查看数据统计
- [ ] 上传照片
- [ ] 测试所有按钮和功能
```

#### 3. 截图记录
```
必须截图：
- [ ] 首页/启动页
- [ ] 打卡界面
- [ ] 时间线/历史记录
- [ ] 数据统计
- [ ] 付费界面
- [ ] 设置页面
```

### Phase 3: 用户评价分析（1小时）

#### 1. App Store 评价
```
阅读数量：至少 20 条
关注内容：
- 5星好评：用户最喜欢什么？
- 1-2星差评：用户最不满意什么？
- 高频关键词：哪些词出现频率最高？
```

#### 2. 评价分类
```
正面评价：
- 功能类
- UI类
- 性能类
- 价格类

负面评价：
- Bug类
- 功能缺失类
- 设计类
- 价格类
```

### Phase 4: 报告整理（1小时）

#### 1. 填写竞品体验报告
使用模板：`竞品体验_模板.md`

#### 2. 关键信息补充
```
必填项：
- [ ] 基本信息
- [ ] 产品定位
- [ ] 核心功能评价
- [ ] 优缺点分析
- [ ] 差异化机会
```

#### 3. 截图整理
```
目录结构：
screenshots/
├── Ashtanga Yoga Days/
│   ├── 01_home.png
│   ├── 02_checkin.png
│   └── ...
├── Michael Gannon/
└── ...
```

---

## 📝 Chrome MCP 使用示例

### 示例 1: 搜索 YouTube 评测

```bash
# 在 Claude Code 中
# 访问 YouTube 搜索页面
chrome_navigate("https://www.youtube.com/results?search_query=Ashtanga+Yoga+Days+app+review")

# 读取页面内容
chrome_get_web_content(textContent=true)

# 截图保存
chrome_screenshot(savePng=true, name="youtube_search_results")
```

### 示例 2: 访问评测文章

```bash
# 导航到文章页面
chrome_navigate("https://example.com/ashtanga-yoga-app-review")

# 提取文章内容
chrome_get_web_content(textContent=true)

# 保存截图
chrome_screenshot(savePng=true, name="review_article")
```

### 示例 3: 批量处理多个竞品

```bash
# 创建待调研列表
competitors = [
  "Ashtanga Yoga Days",
  "Michael Gannon's Ashtanga Yoga",
  "每日瑜伽",
  "OH YOGA"
]

# 逐个搜索并保存信息
for competitor in competitors:
  search_url = f"https://www.youtube.com/results?search_query={competitor}+app+review"
  chrome_navigate(search_url)
  chrome_screenshot(savePng=true, name=f"{competitor}_youtube")
```

---

## 🎯 调研时间表

### Day 1（3小时）
- ⏰ 上午：信息收集（YouTube、博客、社区）
- ⏰ 下午：实际体验 app + 截图

### Day 2（2小时）
- ⏰ 上午：用户评价分析
- ⏰ 下午：报告整理

### Day 3（1小时）
- ⏰ 上午：补充调研和报告完善
- ⏰ 下午：生成竞品对比分析

---

## 📊 输出物清单

### 每个竞品
- [ ] 竞品体验报告（Markdown）
- [ ] 截图文件夹（6+ 张截图）
- [ ] 用户评价汇总表（Excel/CSV）

### 总结报告
- [ ] 竞品对比分析表
- [ ] 差异化机会清单
- [ ] 产品决策建议

---

## 💡 调研技巧

### 1. 从用户视角体验
- 不要把自己当产品经理，要当真实用户
- 问自己：这个 app 解决了我的问题吗？
- 记录第一感受和直觉反应

### 2. 关注细节
- UI 动画是否流畅？
- 按钮位置是否合理？
- 文字描述是否清晰？
- 错误提示是否友好？

### 3. 对比思考
- 和其他竞品有什么不同？
- 有哪些功能是重复的？
- 哪些功能是独特的？

### 4. 记录灵感
- 随时记录想法和洞察
- 不要怕想法"不成熟"
- 多问"为什么"

---

## 🚀 下一步行动

1. **立即开始**：选择第一个竞品（Ashtanga Yoga Days）
2. **使用 Chrome MCP**：搜索 YouTube 评测视频
3. **实际体验**：下载 app 并完整测试
4. **填写报告**：使用模板记录发现
5. **重复流程**：对每个竞品重复以上步骤

---

**创建日期**：2026-01-16
**维护者**：orange
**工具**：Chrome MCP + Claude Code
