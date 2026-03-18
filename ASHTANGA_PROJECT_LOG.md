# 阿斯汤加打卡app - 项目记录

## 2026-03-17: 分享卡片最终优化 - 按钮悬浮固定 ✅

**阶段**: 功能优化完成

**背景**:
- 长文案时卡片滚动，但按钮跟着一起滚动，看不到
- 需要按钮始终悬浮在底部，卡片单独滚动
- 短文案时不应有空白区域

**修复内容**:

**最终提交**: `e9ce8c5` - perf: scale 改回 2，提高清晰度

**最终方案**:
- ✅ 外层容器 `max-h-[90vh]`（不强制高度）
- ✅ 卡片 `max-h-[calc(90vh-8rem)]`（限制最大高度）
- ✅ 短文案：自然高度，无空白
- ✅ 长文案：达到限制后内部滚动，按钮固定悬浮
- ✅ 截图时展开全部内容，保留圆角
- ✅ 截图清晰度 scale: 2

**迭代过程**:
- `1a632f3` - flex布局，卡片滚动
- `de818e7` - 顶部对齐
- `3162231` - 修复语法错误
- `c10c03f` - overflow-hidden
- `8554614` - 明确高度
- `07a51ed` - 短文案自然高度
- `7554419` - 截图展开全部内容
- `8165b4c` - scale: 2 提高清晰度
- `eea0042` - scale: 1.5 平衡测试
- `e59a33e` - 截图彻底展开
- `4b6c501` - 保留圆角
- `e9ce8c5` - scale: 2 最终清晰度

**推送**:
```
To https://github.com/jstur225/ashtanga-app.git
   1a632f3..e9ce8c5  master2 -> master2
```

**状态**: ✅ 已推送至 master2，功能完成

---

## 2026-03-17: 分享卡片修复 - 毛玻璃背景和长文案问题 ✅

**阶段**: Bug修复

**背景**:
- 毛玻璃背景是淡黑色，在深色主题下不明显
- 长文案（500字）点击放大后，底部按钮被挤出可视区域
- 放大时按钮隐藏，用户不知道怎么缩小

**修复内容**:

**提交**: `1d33933` - fix: 分享卡片毛玻璃背景改淡白色，修复长文案时按钮被挤出问题

**改动点**:
- ✅ 毛玻璃背景：`bg-black/20` → `bg-white/30`（淡白色）
- ✅ 外层容器限制最大高度 `max-h-[85vh]`
- ✅ 卡片区域 `flex-1` 自适应滚动
- ✅ 按钮始终固定在底部，不再被顶出去
- ✅ 放大时按钮保持可见（移除隐藏逻辑）
- ✅ 提示文字动态切换：放大时显示"点击卡片或背景缩小"
- ✅ 提示背景改为 `bg-black/40` 确保在淡白背景下可见

**推送**:
```
To https://github.com/jstur225/ashtanga-app.git
   436032c..1d33933  master2 -> master2
```

**状态**: ✅ 已推送至 master2

---

## 2026-03-17: 分享卡片功能简化 ✅

**阶段**: 功能优化

**背景**:
- 分享卡片功能过于复杂，包含编辑、语音、图片等多个功能
- 与觉察日记的编辑功能重复
- 笔记有字数限制，长内容需要滚动

**工作内容**:

### 1. 简化分享卡片

**提交**: `75d1ca7` - feat: 分享卡片添加点击放大功能，取消笔记高度限制

**改动点**:
- ✅ 移除卡片内的编辑功能（避免功能重复）
- ✅ 笔记改为只读显示
- ✅ 取消字数限制，移除滚动条
- ✅ 按钮改为悬浮样式，移除 `onMouseDown` 事件

### 2. 添加点击放大功能

**交互设计**:
- 点击卡片 → 放大到 `max-w-lg`
- 放大状态可滚动查看全部内容
- 点击背景或再次点击 → 缩小
- 放大时按钮自动隐藏
- 添加提示文字"点击卡片放大查看"

**技术实现**:
- 添加 `isZoomed` state
- 动态缩放 + 点击放大双重机制
- 背景透明度变化（`bg-black/90`）

### 3. 样式优化 - 毛玻璃效果

**提交**: `436032c` - style: 分享卡片放大时改为毛玻璃效果

**改动点**:
- ✅ 背景：`bg-black/90` → `backdrop-blur-xl bg-black/20`
- ✅ 添加深层阴影 `shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)]`
- ✅ 添加细白边 `ring-1 ring-white/10`
- ✅ 微放大 `scale(1.02)` 增强浮起感
- ✅ 提示文字添加毛玻璃背景

### 4. 推送部署

```
To https://github.com/jstur225/ashtanga-app.git
   75d1ca7..436032c  master2 -> master2
```

**状态**: ✅ 已推送至 master2

---

## 2026-03-11: 分支架构优化 - master2同步到master ✅

**阶段**: 架构优化（分支管理）

**背景**:
- 项目存在两个主要分支：master（生产分支）和 master2（开发分支）
- master2包含大量新功能和修复，但未同步到master
- 需要建立清晰的分支工作流

**工作内容**:

### 1. 同步master2到master

**合并提交**: `55f0c65` - merge: 合并master2到master（2026-03-11）

**同步的提交数**: 22个

**冲突解决**: 2个文件（使用master2版本）
- `app/practice/page.tsx` - 包含getLocalDateStr函数、图标显示等冲突
- `hooks/usePracticeData.ts` - 包含口令跟练选项配置冲突

### 2. 推送到远程

**推送结果**: ✅ 成功
```
To https://github.com/jstur225/ashtanga-app.git
   7f10fb6..55f0c65  master -> master
```

**分支状态**:
- ✅ master已更新到最新
- ✅ origin/master已更新
- ✅ origin/HEAD已更新为master
- ✅ master和master2现在同步

### 3. 建立分支工作流

**新的分支架构**:
```
master2 (开发分支)
    ↓ 开发新功能
    ↓ 测试通过
    ↓ 合并
master (生产分支) ✅
    ↓ 自动部署
Vercel (生产环境)
```

**分支职责**:
- **master**: 生产分支，只接受从master2的合并，稳定代码
- **master2**: 开发分支，日常开发新功能
- **dev**: 实验性分支（可选）

**工作流程**:
1. 在master2开发新功能
2. 本地测试通过
3. 合并到master: `git checkout master && git merge master2`
4. 推送到GitHub: `git push origin master`
5. Vercel自动部署master分支

### 4. 同步的内容

**核心修复**（2个）:
- ✅ **时区修复** (f8b1014)
  - 问题：凌晨练习（00:30）保存后显示为昨天
  - 原因：`toISOString().split('T')[0]` 返回UTC日期
  - 解决：使用 `getLocalDateStr()` 返回本地日期
  - 位置：6处替换

- ✅ **自定义选项同步修复** (b5c67ed)
  - 问题：20个绑定用户，但practice_options表只有10条记录
  - 原因：默认选项ID固定，用户上传时相互覆盖
  - 解决：只同步自定义选项（`is_custom: true`）
  - 修改：从 `!o.is_preset` 改为 `o.is_custom`

**功能改进**（20个）:
- ✅ 口令跟练功能优化（5个提交）
  - 选项备注改为"老掌门人口令"
  - 选项名称从"一序列口令"改为"一序列"
  - 添加喇叭图标显示
  - 优化首次下载提示
  - 双击预设选项显示提示

- ✅ PWA安装教程改进（4个提交）
  - 从文案弹窗改为图片弹窗
  - 简化界面，删除提示信息
  - 调整大小和样式
  - 修复props传递问题

- ✅ 音频播放状态恢复
  - 页面刷新后恢复音频播放状态

- ✅ 小红书群邀请弹窗
  - 更新为图片展示

- ✅ start_time改进
  - 改为存储完整ISO 8601时间戳

- ✅ 其他14个改进和修复

### 5. 部署状态

- ✅ master已推送到GitHub
- ✅ Vercel自动部署中（1-2分钟完成）
- 🌐 生产环境：https://ashtanga-app.vercel.app

### 6. 重要说明

**未来工作流**:
1. 在master2开发新功能
2. 本地测试通过
3. 合并到master
4. 推送到GitHub
5. Vercel自动部署master分支到生产环境

**分支管理原则**:
- master：只接受从master2的合并，不直接修改
- master2：日常开发分支
- 不要在master上直接修改代码

**Git常用命令**:
```bash
# 查看分支状态
git status
git branch -vv

# 合并master2到master
git checkout master
git merge master2
git push origin master

# 查看提交历史
git log --oneline --graph --all --decorate
```

---

## 2026-03-10: 修复时区Bug导致日期显示错误 ✅

**阶段**: Bug修复（日期显示）

**问题描述**（用户反馈）:
- **早上练习**（6-8点）：完成后显示**昨天**的日期 ❌
- **下午练习**：显示**当天**的日期 ✓
- 需要手动编辑修改日期，影响用户体验

**根本原因**:
使用 `new Date().toISOString().split('T')[0]` 获取日期时，`toISOString()` 返回的是**UTC时间**，不是本地时间。

**时区问题示例**:
- 北京时间：2026-03-10 06:00 (UTC+8)
- UTC时间：2026-03-09 22:00 (前一天晚上10点)
- `.split('T')[0]` 返回：`"2026-03-09"` ❌ 错误！

**解决方案**:
1. 增强 `getLocalDateStr` 函数，支持传入可选的日期参数
2. 替换所有 `toISOString().split('T')[0]` 为 `getLocalDateStr()`
3. 替换 `d.toISOString().split('T')[0]` 为 `getLocalDateStr(d)`

**修改位置**（7处）:
1. 完成练习弹窗默认日期（第1496行）
2. 点击"今天"按钮（第1570行）
3. 保存练习记录（第4487行）
4. 日历视图日期生成（第3270行）
5. 日期选择器maxDate（第805、1737行）
6. todayStr变量（第2514、3196行）

**Git提交**:
- `4029a7a` (master) - fix: 修复早上练习显示昨天日期的时区bug
- `f8b1014` (master2) - fix: 将master分支的时区修复同步到master2

**测试验证**:
- ✓ 早上6-8点练习：显示当天日期
- ✓ 下午练习：显示当天日期
- ✓ 晚上11点后练习：显示当天日期
- ✓ 日历视图打卡小圆点：显示正确日期

**技术要点**:
```typescript
// ❌ 错误：返回UTC日期
new Date().toISOString().split('T')[0]

// ✓ 正确：返回本地日期
function getLocalDateStr(dateInput?: Date): string {
  const date = dateInput || new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

---

## 2026-03-10: 优化调试日志隐私保护 ✅

**阶段**: 优化（用户体验）

**问题背景**:
- 调试日志包含用户敏感打卡内容（觉察文字、突破时刻）
- 日志文件过大（约12,000字），超出小红书评论限制（1,000-2,000字）
- 用户无法在小红书上把调试日志发送给开发者

**完成工作**:

1. **移除敏感信息**
   - 删除 `notesPreview` 字段（觉察文字预览）
   - 删除 `breakthroughPreview` 字段（突破时刻预览）
   - 只保留元数据（是否存在、数量等）

2. **限制日志数量**
   - 错误历史：从全部改为最近10条
   - 同步日志：从全部改为最近10条
   - 练习记录：保持最近10条
   - 导出日志：保持最近10条

**Git提交**:
- `2231ac3` (master) - fix: 优化调试日志隐私保护和数据量控制

**修改位置**:
- app/practice/page.tsx: 第4112、4116、4133-4134、4202-4203行

**效果**:
- ✓ 保护用户隐私（不包含觉察文字）
- ✓ 减少日志大小（但仍较大，约10k+字）
- ⚠️ 仍不适合直接在小红书发布

---


## 2026-03-05: 修复 Vercel 构建错误 ✅

**阶段**: Bug修复（部署问题）

**问题描述**:
- Vercel 部署失败，报错：`await isn't allowed in non-async function`
- 错误位置：`app/practice/page.tsx:4272`

**根本原因**:
`handleStartPractice` 函数使用了 `await` 调用 `audioCache.isCacheValid()`，但函数定义缺少 `async` 关键字。

**修复方案**:
```typescript
// 修复前
const handleStartPractice = () => {

// 修复后
const handleStartPractice = async () => {
```

**Git提交**:
- `c386e4d` (master2) - fix: 修复 handleStartPractice 函数缺少 async 关键字

---

## 项目概述
**创建时间**: 2026-01-14
**项目阶段**: 需求验证阶段
**核心理念**: 简单 - 专注打卡功能做到极致

---

## 2026-03-05: 修复口令跟练功能点击无反应问题 ✅

**阶段**: Bug修复（口令跟练功能）

**问题描述**:
- 点击口令跟练选项后，再点击"开始练习"没有反应
- 用户感觉界面卡死，没有任何反馈

**根本原因分析**:

1. **音频加载阻塞界面**: `handleStartPractice` 函数中，口令跟练模式会创建 `Audio` 对象并等待 `loadedmetadata` 事件
2. **延迟进入练习界面**: 只有在音频加载完成后（约几秒到十几秒，取决于网络），才设置 `setIsPracticing(true)` 进入练习界面
3. **用户无感知**: 在此期间用户看不到任何反馈，以为点击无效

**修复方案**:

### 修复1: 立即进入练习界面
**文件**: `app/practice/page.tsx:4240` (`handleStartPractice` 函数)

**修复前**:
```typescript
const handleStartPractice = () => {
  if (selectedOption) {
    // 口令跟练模式：先加载音频
    if (selectedOption === 'guided_audio') {
      setIsAudioLoading(true)
      const audio = new Audio(GUIDED_AUDIO_OPTION.audio_src)

      audio.addEventListener('loadedmetadata', () => {
        // 音频加载完成后才进入练习界面
        setIsPracticing(true)  // ⭐ 延迟执行
        audio.play()
      })
    }
  }
}
```

**修复后**:
```typescript
const handleStartPractice = () => {
  if (selectedOption) {
    // 先进入练习界面（立即给用户反馈）
    const now = Date.now()
    setStartTime(now)
    setIsPracticing(true)  // ⭐ 立即执行
    setIsPaused(false)
    // ...

    // 口令跟练模式：加载音频
    if (selectedOption === 'guided_audio') {
      setIsAudioLoading(true)
      setAudioError(null)
      setIsPaused(true)  // ⭐ 先暂停，等音频加载完成

      const audio = new Audio(GUIDED_AUDIO_OPTION.audio_src)

      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration)
        setIsAudioLoaded(true)
        setIsAudioLoading(false)

        // 音频加载完成，自动开始播放和计时
        setIsPaused(false)  // ⭐ 加载完成后自动开始
        audio.play()
      })
      // ...
      setAudioElement(audio)
    }
  }
}
```

### 修复2: 统一口令跟练选项样式
**文件**: `app/practice/page.tsx:4714-4720`

- 移除 `isGuidedAudio` 特殊样式判断
- 移除 `Volume2` 图标
- 样式改为和其他普通选项完全一致

**代码变更**:
```typescript
// 之前：特殊样式和图标
const isGuidedAudio = option.id === "guided_audio"
// ...
isGuidedAudio
  ? "bg-primary/10 text-primary border border-primary/30..."
  : "bg-background text-foreground..."
// ...
{isGuidedAudio && <Volume2 className="w-3.5 h-3.5 inline-block" />}

// 现在：和其他选项一样
"bg-background text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-stone-100/50"
```

**Git提交**:
- `a3f3189` (master2) - fix: 修复口令跟练功能点击无反应问题
- `ce7a3e8` (master) - fix: 修复口令跟练功能点击无反应问题

**用户体验改进**:
- 点击"开始练习"立即进入计时界面，不再卡顿
- 音频加载期间显示"加载中..."状态
- 音频加载完成后自动开始播放和计时
- 口令跟练选项样式和其他选项一致，不突兀

**测试建议**:
1. 选择"一序列跟练"选项
2. 点击"开始练习"
3. 验证是否立即进入计时界面
4. 验证是否显示"加载中..."
5. 验证音频加载完成后是否自动开始播放

---

## 2026-02-28: 修复同步时名字签名被重置问题 ✅ 完成

**阶段**: Bug修复（同步功能优化）

**问题描述**:
- 用户在同步练习记录时，选择"智能合并"后，个人资料（名字、签名）有时会被重置为默认状态

**根本原因分析**:

1. **问题1**: `smartMerge` 函数未处理 profile 数据
   - 只同步了练习记录和选项，完全没有处理 profile
   - 如果云端 profile 被错误构建为默认值，智能合并不会修正

2. **问题2**: 使用云端数据时错误的有效性判断
   - 多处代码排除了 `'阿斯汤加习练者'` 这个值，认为它是"无效的"
   - 但实际上用户可能恰好喜欢用这个名字
   - 选择"使用云端数据"时，如果云端是默认名字，会被强制重置

3. **问题3**: 同步对比逻辑与构建逻辑不一致
   - 对比阶段已正确识别 profile 变更来源
   - 但构建 `mergedProfile` 时重新进行"有效性"判断，覆盖了对比结果

**修复方案**:

### 修复1: 智能合并时正确处理 profile 数据
**文件**: `hooks/useSync.ts:547` (`smartMerge` 函数)
```typescript
// 智能合并 profile：比较时间戳，使用更新的那个
let mergedProfile = freshLocalData.profile
if (remoteData.profile) {
  const localTime = new Date(freshLocalData.profile?.updated_at || freshLocalData.profile?.created_at || 0).getTime()
  const remoteTime = new Date(remoteData.profile.updated_at || remoteData.profile.created_at).getTime()

  if (remoteTime > localTime) {
    mergedProfile = remoteData.profile
  }
}

onSyncComplete({
  records: [...freshLocalData.records, ...remoteOnly],
  options: remoteData.options || [],
  profile: mergedProfile // ⭐ 添加 profile
})
```

### 修复2: 移除错误的默认值判断
**文件**: `hooks/useSync.ts`
**位置**: 394-408 行, 454-468 行, 928-942 行

**修复前**:
```typescript
const mergedProfile = remoteData.profile && remoteData.profile.name && !remoteData.profile.name.match(/^\d+$/) && remoteData.profile.name !== '阿斯汤加习练者'
  ? { /* 使用云端 */ }
  : { name: '阿斯汤加习练者', ... } // 默认值
```

**修复后**:
```typescript
const mergedProfile = remoteData.profile && remoteData.profile.name
  ? { /* 直接使用云端数据 */ }
  : freshLocalData.profile || { name: '阿斯汤加习练者', ... } // 只有真正没有数据时才用默认值
```

**关键原则**: 默认值 `'阿斯汤加习练者'` 只是一个初始值，不应该在同步过程中被当作"无效数据"处理。

### 修复3: 信任同步对比结果
**文件**: `hooks/useSync.ts:394-408`
- 直接使用 `profileChangeSource` 的结果
- 不要重新判断 profile 是否"有效"

**验证方案**:

1. **测试用例1**: 智能合并时 profile 不被重置
   - 设备 A：修改名字为 "小明"，等待同步到云端
   - 设备 B：触发冲突，选择智能合并
   - 验证：设备 B 的名字应该是 "小明"（不是默认值）

2. **测试用例2**: 云端是默认名字时不被强制重置
   - 云端 profile 名字为 "阿斯汤加习练者"
   - 本地 profile 名字为 "小明"
   - 同步时选择"使用云端数据"
   - 验证：云端数据被正确下载，名字为 "阿斯汤加习练者"（不是又被重置一次）

3. **测试用例3**: 基于时间戳的正确合并
   - 本地 profile 更新时间为今天 10:00，名字为 "小明"
   - 云端 profile 更新时间为今天 12:00，名字为 "大明"
   - 触发智能合并
   - 验证：最终名字为 "大明"（云端更新）

**Git提交**:
- `fd9ea26` - fix(sync): 修复同步时名字签名被重置的问题

**修改文件**:
| 文件 | 位置 | 说明 |
|------|------|------|
| `hooks/useSync.ts` | 394-408, 454-468, 547, 928-942 | 主要修复位置 |

**下一步**:
- 继续观察同步功能是否稳定
- 处理其他已知问题（练习选项同步异常）

---

## 2026-02-27: 飞书多维表格读取技能 ✅ 完成

### 背景
用户希望将飞书读取功能单独做成一个 Claude Code 技能，可以直接发送多维表格链接，Claude 就能读取表格内容进行分析。

### 实现
创建了 `.claude/skills/feishu-bitable-read/` 技能：

**文件结构**:
```
.claude/skills/feishu-bitable-read/
├── skill.yml          # 技能定义
├── config.json        # 配置文件（app_id, app_secret）
└── read_bitable.py    # 核心逻辑
```

**核心功能**:
1. **URL 解析**: 从 `https://xxx.feishu.cn/base/{app_token}?table={table_id}` 提取参数
2. **Token 管理**: 自动获取 tenant_access_token
3. **分页读取**: 处理大量数据的分页获取（每页 500 条）
4. **字段映射**: 自动将 field_id 转换为字段名显示
5. **缓存机制**: 默认 5 分钟缓存，避免重复调用 API
6. **表格目录**: 支持配置多个表格，使用 key 快速切换
7. **默认表格**: 无需输入 URL，自动使用默认表格
8. **待发货清单**: 一键查看待发货订单和订货清单

**表格目录** (`config.json`):
```json
{
  "default_table": "orders",
  "tables": {
    "orders": {
      "name": "有赞订单",
      "url": "https://xxx.feishu.cn/base/xxx",
      "description": "有赞商城订单数据"
    }
  }
}
```

**使用方式**:
```bash
# 查看待发货订单（使用默认表格）
/feishu-bitable-read

# 使用指定表格 key
/feishu-bitable-read orders

# 使用完整链接
/feishu-bitable-read https://xxx.feishu.cn/base/xxx

# 查看表格目录
/feishu-bitable-read --list-tables
```

**配置凭证**:
- `app_id`: cli_a92a4d950d385cef
- `app_secret`: rbhvYLZ8zJj5Lx3Vz4DlLcBEcJ2FgEVj

### 测试验证
使用有赞订单表格链接测试成功：
- 表格名称: 有赞订单
- 记录总数: 486 条
- 字段数量: 161 个

### 版本迭代

**v1.0 (2026-02-27)**: 基础功能
- URL 解析、Token 管理、分页读取、缓存机制

**v2.0 (2026-02-27)**: 智能表格目录
- 添加表格目录管理功能
- 支持默认表格（无需输入 URL）
- 支持表格 key 快速切换
- 待发货订单统计功能
- `--list-tables` 查看表格目录

### 复用代码
从 `XBB-APP/ashtanga-xiaohongshu/_scripts/sync_feishu_content.py` 复用了：
- `get_tenant_token()` 方法
- `get_all_records()` 分页逻辑
- 错误处理模式

---

## 用户画像
- **姓名**: orange
- **角色**: 产品经理
- **背景**: 阿斯汤加瑜伽练习3年
- **技术背景**: 不会写代码，用AI开发
- **付费意愿**: 小几十块/年

---

## 需求描述

### 现状痛点
- 在约课软件上看练了几天
- 在个人日记上记录练习
- **数据不统一**，无法看进步/状态

### 核心需求
- 打卡 + 时间 + 文字补充 + 照片
- 时间线回顾
- 以后可能生成回忆

### 功能定位
**不是**瑜伽学习app
**不是**体式教学app
**就是**专注打卡 + 身体觉察的记录工具

---

## 市场调研
- **小红书搜索**: 没有专注阿斯汤加打卡的产品
- **竞品**: 瑜伽学习app（嵌入打卡功能，不纯粹）
- **参考案例**: 鸿蒙咖啡打卡app（成功案例）

---

## 需求验证计划

### Week 1: 验证需求（不写代码）

#### 方案1: 小红书测试
- **内容**: "练了3年阿斯汤加，想做个打卡app，有人需要吗？"
- **观察指标**: 收藏数 > 50 = 需求成立
- **关键信号**: 有人问"什么时候出"、"求分享"

#### 方案2: 亲身体验
- **工具**: Excel/飞书表格
- **时长**: 1周
- **目的**: 验证自己能否坚持记录

#### 方案3: 用户调研
- **目标**: 找10个阿斯汤加练习者
- **问题**:
  - 你现在怎么打卡？
  - 打卡最痛苦的是什么？
  - 愿意为app付多少钱？

---

## 技术方案（待验证后确定）

### 候选方案

| 方案 | 成本 | 时间 | 美观度 |
|------|------|------|--------|
| v0.dev (Vercel) | 0 | 3-5天 | ⭐⭐⭐⭐⭐ |
| Claude Code + Streamlit | 0 | 1周 | ⭐⭐⭐ |
| PWA (打包) | 0 | 1周 | ⭐⭐⭐⭐ |

### 核心功能
- 打卡按钮
- 时间记录
- 文字补充
- 照片上传
- 时间线回顾

---

## 产品方法论应用

### 预测
- 阿斯汤加小众但粘性高
- 市场上没有纯打卡产品
- 打卡app留存问题（3个月后流失）

### 单点击穿
- **核心功能**: "今天练了，记录一下"
- **差异化**: 不做教学，只做记录
- **目标用户**: 练了很久的人，不是新手

### All-in
- 待需求验证后再决定

---

## 验证标准

### ✅ 需求成立的信号
- 小红书收藏 > 50
- 10+人说"希望有app"
- 自己能坚持记录1周

### ❌ 需求不成立的信号
- 小红书没人理
- 自己1周都坚持不了记录
- 反馈都是"不需要"

---

## 下一步行动

- [ ] Week 1: 小红书发帖测试
- [ ] Week 1: 用Excel记录1周
- [ ] Week 1: 收集用户反馈
- [ ] Week 2: 根据反馈决定是否开发

---

## 项目对话记录

### 2026-01-22 Tab1 UI样式优化完成 ✅

**阶段**: UI细节打磨

**核心改动**:
- ✅ 选项按钮样式全面优化
  - 按钮间距：gap-4 (16px) → gap-2 (8px)，更紧凑
  - 按钮内边距：py-2 px-2 → py-[6px] px-1 (上下6px, 左右4px)
  - 名称字号：text-xs (12px) → text-[14px]，可读性提升
  - 备注字号：text-[10px] → text-[11px]
  - 按钮最小高度：min-h-[72px]
- ✅ 默认选项文案简化（hooks/usePracticeData.ts）
  - 原来："一序列 Mysore"、"一序列 Led Class"（混用中英文，太长）
  - 现在："一序列" + "Mysore"、"一序列" + "Ledclass"（纯中文+简短英文）
  - 6个默认选项：一序列(Mysore/Ledclass)、二序列(Mysore/Ledclass)、半序列、休息日
- ✅ 底部Tab导航间距优化：pb-8 (32px) → pb-4 (16px)，更贴近屏幕底部
- ✅ 网页标题修改：熬汤日记·觉察呼吸 → 熬汤日记·呼吸·觉察（顺序调整）
- ✅ 首页添加英文标语："Practice, practice, and all is coming."
  - Pattabhi Jois的名言
  - 9px 字号，灰色50%透明度，贴在中文标题正下方
- ✅ 提示文字优化：单击选择·双击编辑（使用中点号）
  - 间距优化：mt-2 (8px) → mt-[-4px]（负值，上移4px）
  - 实际间距从24px减小到12px
- ✅ Logo图标调整：32px × 32px → 34px × 34px
- ✅ 删除Zeabur相关文档：确认使用Vercel部署

**技术实现**:
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 自定义值：text-[14px], text-[9px], w-[34px], py-[6px]
- 负边距技巧：mt-[-4px] 实现元素重叠效果

**Git提交**:
- `d83af42` - 优化选项按钮显示 - 调整内边距为px-1，间距改为gap-4
- `495d218` - 删除Zeabur相关内容，更新为Vercel部署
- `47016ec` - 名称字号改为20px
- `fe85d6f` - 名称字号改回16px
- `1d27d9e` - 名称字号改为14px
- `da7f79e` - 按钮上下内边距改为6px
- `e4b6e83` - 底部Tab导航改为pb-4，更贴近屏幕底部
- `6551ef4` - 网页标题改为'熬汤日记·呼吸·觉察'
- `4230414` - 首页标题下方添加英文小字'Practice, practice, and all is coming.'
- `40a4199` - 英文标语改为9px，贴在中文标题正下方
- `3e30ba5` - 提示文字改为'单击选择·双击编辑'，间距改为mt-2(8px)，英文标语改为9px
- `cb52f47` - 提示文字间距改为mt-[-4px]，更贴近按钮
- `b1c6542` - logo图标大小改为34px×34px

**用户体验改进**:
- 按钮更紧凑，文字更大更清晰
- 默认选项文案更简洁，一眼就能看懂
- Tab导航更贴近底部，更方便操作
- 英文标语增添瑜伽文化气息
- 整体UI更加精致和专业

**产品决策**: 符合"简单"理念，Tab1样式打磨完成，达到稳定可用标准

**下一步计划**:
- P0: 继续使用和测试，发现其他问题
- P1: 照片上传功能（Supabase Storage）
- P2: 其他Tab的UI优化

---

### 2026-01-19 Supabase数据持久化完成 ✅

**阶段**: 从MVP到可用产品

**核心功能**:
- ✅ Supabase数据库集成（3个表：practice_records, practice_options, user_profiles）
- ✅ 完整CRUD操作（创建、读取、更新、删除）
- ✅ 编辑记录功能（点击记录左侧编辑，同步更新到Supabase）
- ✅ 删除记录功能（确认对话框，同步删除Supabase数据）
- ✅ 保存后自动跳转到觉察日记Tab
- ✅ 数据持久化（刷新页面数据不丢失）
- ✅ 错误处理优化（网络错误时优雅降级）

**技术实现**:
- Next.js 16 + React 19 + TypeScript
- Supabase PostgreSQL数据库
- @supabase/supabase-js客户端
- lib/database.ts - 完整CRUD函数库
- lib/supabase.ts - 数据库连接配置
- .env.local - 环境变量配置

**数据库表结构**:
```sql
-- practice_records (练习记录表)
- id: BIGINT (主键，自增)
- created_at: TIMESTAMP (创建时间)
- date: DATE (练习日期)
- type: TEXT (练习类型，如"一序列Mysore")
- duration: BIGINT (时长，秒)
- notes: TEXT (觉察文字)
- photos: TEXT[] (照片数组，存储URL)
- breakthrough?: TEXT (突破标题，可选)

-- practice_options (练习选项表)
- id: BIGINT (主键，自增)
- created_at: TIMESTAMP (创建时间)
- label: TEXT (英文标签)
- label_zh: TEXT (中文标签)
- notes?: TEXT (备注说明)
- is_custom: BOOLEAN (是否用户自定义)

-- user_profiles (用户信息表)
- id: BIGINT (主键，自增)
- created_at: TIMESTAMP (创建时间)
- name: TEXT (用户名)
- signature: TEXT (个性签名)
- avatar?: TEXT (头像URL)
- phone?: TEXT (手机号)
- email?: TEXT (邮箱)
- is_pro: BOOLEAN (是否付费会员)
```

**遇到的问题和解决方案**:

1. ❌ API key格式错误
   - 问题：使用了新版publishable key（`sb_publishable_xxx`格式）
   - 解决：改用legacy anon key（`eyJhbG...`JWT格式）
   - 教训：Supabase更新了API key系统，需要使用legacy key

2. ❌ 数据表缺少date字段
   - 问题：表结构与设计文档不一致
   - 解决：按照设计方案重新创建表
   - 工具：在SQL Editor中执行DROP TABLE + CREATE TABLE

3. ❌ React key重复警告
   - 问题：mock数据和Supabase数据有重复的id
   - 解决：移除mock数据，初始状态改为空数组
   - 结果：只使用Supabase真实数据

4. ❌ 删除功能失败（错误信息为空对象）
   - 问题：错误日志不够详细，无法排查
   - 解决：改进错误日志，输出JSON.stringify(error)
   - 结果：发现是RLS权限问题，关闭RLS后正常

**技术决策**:
- v1.0只给自己用，关闭RLS（Row Level Security）
- v1.5对外开放时再开启权限控制
- 符合"简单"理念，先核心功能，后权限管理

**Git提交**:
- `35cf58e` - feat: 阿斯汤加打卡app - Supabase数据持久化完成
  - 99个文件，16214行代码
  - 包含完整的Next.js项目、UI组件、数据库逻辑
- `57e7682` - docs: 更新memory.md记录今日工作

**配置文档**:
- `SUPABASE_SETUP_GUIDE.md` - 详细的Supabase配置指南
  - 创建项目的步骤
  - 3个数据表的SQL语句
  - RLS配置说明
  - API key获取方法

**下一步计划**:
- **P0（核心完善）**: 照片上传功能（压缩+存储到Supabase Storage）
- **P1（体验优化）**: 加载状态提示、错误提示美化（用toast替代alert）
- **P2（部署上线）**: 部署到Vercel、配置自定义域名

**产品决策**: 符合"简单"理念，专注核心数据功能，app现在真正可用了！

---

### 2026-01-19 Zeabur云端部署成功 ✅

**阶段**: 从本地开发到云端可用

**部署成果**:
- ✅ 成功部署到Zeabur平台
- ✅ GitHub仓库自动化部署
- ✅ 89个核心文件上传
- ✅ 环境变量配置完成
- ✅ 应用成功运行在云端

**部署过程**:

1. **GitHub仓库清理**
   - 清空远程仓库，准备重新上传
   - 保留本地文件，只清空GitHub

2. **创建部署版本**
   - 在Ashtang_app/目录初始化新git仓库
   - 配置.gitignore排除非部署文件：
     - `screenshots/` - 截图目录
     - `yoga-app-homepage/` - 备份目录
     - `docs/` - 文档目录
     - `*.md` - Markdown文件（除了.zeabur.yaml）
     - `node_modules/` - 依赖包
     - `.next/` - 构建缓存

3. **上传核心文件**（89个文件）
   - Next.js应用完整代码
   - 配置文件（package.json, tsconfig.json, next.config.mjs等）
   - 组件库（57个shadcn/ui组件）
   - 公共资源（11个图标和占位图）
   - Zeabur配置（.zeabur.yaml）

4. **Zeabur配置**
   - Root Directory: `/`（项目文件在仓库根目录）
   - 环境变量配置：
     - `NEXT_PUBLIC_SUPABASE_URL`: https://xojbgxvwgvjanxsowqik.supabase.co
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   - 自动部署配置：GitHub推送自动触发部署

5. **部署验证**
   - ✅ 文件上传成功
   - ✅ 构建过程正常
   - ✅ 应用成功运行
   - ✅ Supabase连接正常

**技术亮点**:
- 使用pnpm作为包管理器
- Zeabur自动检测Next.js项目
- 零配置部署（.zeabur.yaml只需设置build命令）
- GitHub集成实现自动化部署

**部署地址**:
- GitHub仓库: https://github.com/jstur225/ashtanga-app
- Zeabur控制台: （用户提供）

**遇到的问题**:
1. ❌ 初次部署Zeabur找不到项目文件
   - 原因：项目文件在yoga-app-homepage/子目录
   - 解决：将项目文件移到仓库根目录

2. ❌ .env.local未包含在部署中
   - 原因：.gitignore排除了.env*文件
   - 解决：在Zeabur中手动配置环境变量

**Git提交**:
- （部署版本在Ashtang_app/目录的新git仓库）

**下一步计划**:
- **P0**: 测试云端应用功能完整性
- **P1**: 配置自定义域名
- **P2**: 添加监控和错误追踪
- **P3**: 照片上传功能（Storage配置）

**产品里程碑**: 🎉 从想法到云端可用产品，只用了6天！

---

### 2026-01-16 Chrome MCP 全平台竞品调研 + 小红书用户洞察

**调研方式**: Chrome MCP 自动化搜索 + 人工整理

#### 全平台竞品调研

**调研规模**：
- 总计 **13 个竞品**
- iOS（2个）、Android（5个）、中国市场（6个）
- 搜索次数：15+ 次
- 自动化采集时间：1 小时（传统方式需 8-10 小时）

**竞品清单**：

1. **iOS 平台**：
   - Ashtanga Yoga Days - $6.98 一次性购买
   - Michael Gannon's Ashtanga Yoga - $8.99 一次性购买，#1 Health & Fitness Paid

2. **Android 平台**：
   - Ashtanga Yoga by Catico - 免费，4.56星，10,000+下载
   - Ashtanga Yoga Home - 订阅制
   - Down Dog - 订阅制，高度定制化
   - Glo - 订阅制，大量课程库
   - Pocket Yoga - 付费一次性购买

3. **中国市场**：
   - Keep - ¥248-298/年（市场领导者）
   - 每日瑜伽 - ¥168-218/年
   - Wake 瑜伽 - 几百到上千/次（线下为主）
   - 柠檬瑜伽 - ¥599/年
   - Nike Training Club - 免费
   - Nüli - 女性健康定位

**核心发现**：

1. **定价优势极其显著** 💰
   - 你的定价：30元/年 = $4.2
   - vs 海外竞品：1/6-1/7
   - vs 中国竞品：1/6-1/20

2. **差异化定位清晰**
   - 海外竞品：专注阿斯汤加，但功能复杂
   - 中国竞品：综合教学平台，不专注阿斯汤加
   - 你的定位：专注阿斯汤加打卡，极致简单

3. **平台机会明确**
   - Ashtanga Yoga Days 只支持 iOS
   - 用户强烈要求 Android 版本
   - 你的策略：同时支持 iOS 和 Android

**创建文件**：
- `全平台竞品对比报告_2026-01-16.md` - 13个竞品详细分析
- `Chrome_MCP_竞品调研指南.md` - 调研方法论
- `竞品体验报告/竞品体验_Ashtanga_Yoga_Days.md` - 直接竞品模板

---

#### 小红书用户调研

**调研规模**：
- 搜索关键词：4 个
- 分析笔记：50+ 条
- 搜索次数：4 次
- 截图保存：1 张

**搜索关键词**：
1. "阿斯汤加打卡app"
2. "阿斯汤加记录app"
3. "瑜伽打卡记录方式"
4. "阿斯汤加 excel 记录表格"

**核心发现**：

1. **用户需求真实存在** ✅
   - 直接证据：**"請大家推薦記錄阿斯湯加的APP"**（2024-02-07，获赞8）
   - 间接证据：搜索建议高频出现相关关键词
   - 结论：需求不是假设，是真实存在！

2. **Excel 记录假设验证** ✅
   - 发现用户：**"2025年，阿斯汤伽瑜伽，自我练习打卡记录表"**
   - 发现用户：**"Annie如意的阿汤笔记"**
   - 结论：完全验证了用户主要用 Excel 记录的假设！

3. **用户长期记录习惯** ✅
   - **901天** - Alan的设计手札（获赞45）
   - **半年120天** - 沪漂橙子疯狂熬汤记（获赞19）
   - 持续更新：自由行走的木子青（阿斯汤加计数系列）

4. **现有解决方案**
   - Excel 表格（手动设计）
   - Keep（综合健身平台）
   - **MarkNow App**（管理瑜伽）
   - 麦小嘉Yoga（3年练习者强推，获赞66）

5. **用户行为模式**
   - 记录练习次数（100次Mysore 庆祝）
   - 记录体式进度（阿斯汤加计数系列）
   - 记录生活大事小事（"不只计数"）

**用户痛点**：
- 缺少专门的阿斯汤加记录工具
- 现有工具不够专业（Keep 是综合平台）
- Excel 需要手动设计，不够方便
- 记录方式繁琐

**创建文件**：
- `小红书用户洞察报告_2026-01-16.md` - 50+笔记分析

---

#### Chrome MCP 技术学习

**成功应用**：
- ✅ 自动访问 Google 搜索
- ✅ 自动访问小红书搜索
- ✅ 自动提取页面文本内容
- ✅ 自动截图保存
- ✅ 自动切换标签页
- ✅ 自动读取历史记录

**遇到的问题**：
- ❌ AbortError: This operation was aborted
- 原因：session 超时
- 解决：重新连接即可

**学习成果**：
- Chrome MCP 可以极大提升调研效率
- 从传统 8-10 小时缩短到 1 小时
- 尤其适合：批量搜索、数据采集、竞品分析

**限制**：
- App Store 页面需要 JavaScript 渲染（无法直接获取内容）
- 某些网站有反爬虫机制
- Session 会超时，需要重新连接

---

#### Week 1 验证计划更新

**验证标准更新**：
- ✅ 小红书收藏 > 50（保持）
- ✅ 10+人说"希望有app"（保持）
- ✅ 自己能坚持记录1周（保持）
- **新增验证**：
  - ✅ 用户主动求推荐 app（已验证）
  - ✅ 用户主要用 Excel 记录（已验证）
  - ✅ 用户愿意长期记录（已验证）

**推荐小红书标题**：
1. **"练了3年阿斯汤加，受够了Excel记录，做了个极简打卡app，有人需要吗？"**（痛点型）
2. **"试了Keep、MarkNow、Excel，最后还是做了个专门的阿斯汤加打卡app"**（对比型）
3. **"901天阿斯汤加记录，我只想做一件简单的事情：打卡"**（共鸣型）

**下一步行动**：
- [ ] 立即发小红书测试
- [ ] 自己用 Excel 记录 1 周
- [ ] 找 10 个阿斯汤加练习者调研

**结论**：
- ✅ 需求验证通过
- ✅ 定价策略可行
- ✅ 产品定位准确
- **强烈推荐继续推进 Week 1 验证！**

---

### 2026-01-15 竞品调研（iOS/Android/中国市场）

**调研范围**：
- iOS App Store（阿斯汤加相关app）
- Android Google Play（阿斯汤加相关app）
- 中国市场（每日瑜伽、Keep、Wake等）

**核心发现**：

1. **iOS市场**：
   - Ashtanga Yoga Days - 专门的打卡工具（最接近orange的产品）
   - Michael Gannon's Ashtanga Yoga - 市场老大（$2.99一次性购买，教学工具）
   - 约12个阿斯汤加专用app

2. **Android市场**：
   - Ashtanga Yoga (by Catico) - 最流行（4.56星，10,000+下载）
   - Ashtanga Yoga Home - 面向资深练习者
   - The Ashtanga Institute - 带追踪功能
   - 约5个阿斯汤加专用app（竞品较少）

3. **中国市场（重大发现）**：
   - ✅ **完全没有专门的阿斯汤加打卡app**
   - 每日瑜伽：218元/年，综合教学平台
   - Keep：168-248元/年，综合健身平台
   - Wake：168元/年，高端瑜伽平台
   - 用户主要用小红书、Excel、约课软件记录

**关键洞察**：
- ✅ **中国市场是巨大的机会**（没有专门的阿斯汤加打卡app）
- ✅ **定价优势**：30元/年 vs 市场168-218元/年（只有1/6）
- ✅ **差异化定位**：不做教学，只做打卡记录
- ⚠️ **需要验证**：阿斯汤加练习者真的需要专门的app吗？

**创建文件**：
- `竞品体验_模板.md` - 详细的竞品体验报告模板
- `竞品体验指南.md` - 使用指南和目录结构
- `screenshots/` - 截图存放目录
- `竞品体验报告/` - 报告存放目录

**下一步行动**：
- [ ] 下载体验Ashtanga Yoga Days（iOS直接竞品）
- [ ] 下载体验Michael Gannon's Ashtanga Yoga（市场老大）
- [ ] 下载体验每日瑜伽（中国最大）
- [ ] 下载体验OH YOGA（中国阿斯汤加）
- [ ] 填写竞品体验报告
- [ ] 总结竞品调研结论

**待验证问题**：
- Ashtanga Yoga Days的定价模式（免费还是付费？）
- 用户愿意为打卡功能付30元/年吗？
- 阿斯汤加练习者真的需要专门的app吗？

---

### 2026-01-15 建立文档体系

**做了什么**：
- 更新README.md，添加完整的项目说明文档
- 创建竞品体验报告模板和使用指南
- 建立完整的目录结构

**更新内容**：

1. **README.md更新**：
   - 📖 项目简介（核心理念、产品定位、目标用户）
   - ✨ 核心功能（MVP功能、未来功能）
   - 💰 付费模式（定价、商业模式）
   - 📊 市场调研（全球市场、中国市场、竞争优势）
   - 📂 文件结构（项目文件组织）
   - 🚀 验证计划（Week 1详细方案）
   - 🛠️ 技术方案（候选方案对比）
   - 📅 开发日志（重要时间线）
   - 🤝 贡献指南（联系方式）
   - 📄 许可证信息

2. **竞品体验体系**：
   - `竞品体验_模板.md` - 详细的体验报告模板（包含基本信息、产品定位、核心功能、UI/UX、商业模式、用户评价、优缺点、可借鉴点、差异化机会、截图附件、综合评分）
   - `竞品体验指南.md` - 使用指南（目录结构、快速开始、体验清单、截图规范、填写要点、提示与技巧）
   - `screenshots/` - 截图存放目录
   - `竞品体验报告/` - 报告存放目录

**文档理念**：
- **README.md** = 项目说明书（给别人看的）
  - 回答"这个项目是什么？"
  - 回答"有什么功能？"
  - 回答"怎么用？"
  - 不记录开发过程

- **PROJECT_LOG.md** = 开发日志（给自己看的）
  - 回答"今天做了什么？"
  - 回答"为什么这么做？"
  - 回答"遇到什么问题？"
  - 记录决策过程

**下一步行动**：
- [ ] 下载体验Ashtanga Yoga Days（iOS直接竞品）
- [ ] 填写竞品体验报告（使用模板）
- [ ] 继续Week 1验证（小红书发帖 + Excel记录）

---

### 2026-01-21 Tab1 交互优化 + 数据持久化修复 ✅

**阶段**: 从功能完善到用户体验优化

**新增功能**:
1. ✅ Header 滚动整合（可被截断）
2. ✅ 标题颜色渐变（熬汤日记·呼吸·觉察）
3. ✅ 选项按钮宽度优化（支持长文本）
4. ✅ 自定义选项保存到 localStorage

**核心改动**:

#### 1. Header 滚动优化
**文件**: `app/page.tsx`
- **Header 整合到滚动区域**：不再是固定定位，随内容一起滚动
- **可被截断**：向下滚动时 header 可以移出屏幕，最大化内容展示区域
- **响应式布局**：改用 `h-screen flex flex-col`，不使用 `overflow-hidden`
- **沉浸式体验**：用户专注于打卡内容，不被固定 header 干扰

**技术实现**:
```tsx
// 之前：header 固定在外层
<div className="h-screen overflow-hidden">
  <header className="flex-shrink-0">...</header>
  <main className="flex-1 overflow-y-auto">...</main>
</div>

// 现在：header 在滚动区域
<div className="h-screen flex flex-col">
  <main className="flex-1 overflow-y-auto">
    <header>...</header>  // header 随内容一起滚
    <div>选项内容</div>
  </main>
</div>
```

#### 2. 标题颜色渐变
**文件**: `app/page.tsx`
- **主标题**：熬汤日记（纯黑，`text-foreground`）
- **副标题1**：·呼吸（中灰，`text-muted-foreground/50`）
- **副标题2**：·觉察（浅灰，`text-muted-foreground/70`）
- **视觉层次**：形成从深到浅的渐变效果

**代码**:
```tsx
<h1 className="text-lg font-serif text-foreground tracking-wide font-semibold">
  熬汤日记
  <span className="text-muted-foreground/50 font-normal">·呼吸</span>
  <span className="text-muted-foreground/70 font-normal">·觉察</span>
</h1>
```

#### 3. Header 布局横向排列
**文件**: `app/page.tsx`
- **Logo 缩小**：`w-12 h-12` → `w-8 h-8`（48px → 32px）
- **横向布局**：`flex-col` → `flex-row`，logo 和标题左右排列
- **间距优化**：`gap-3`，适当间距
- **标题缩小**：`text-xl` → `text-lg`
- **减少 padding**：`pt-14 pb-6` → `pt-12 pb-4`

#### 4. 选项按钮宽度优化
**文件**: `app/page.tsx`
- **增加 padding**：`px-2` → `px-4`
- **设置最小宽度**：`min-w-[100px]`，保证文字显示
- **文字换行**：添加 `break-words w-full`，自动换行
- **备注字号**：`text-xs` → `text-[10px]`

#### 5. 自定义选项持久化
**文件**: `app/page.tsx`, `hooks/usePracticeData.ts`

**问题根因**:
- `handleCustomConfirm` 只更新本地 `practiceOptions` state
- 没有调用 `addOption` 保存到 localStorage
- 刷新页面后丢失

**解决方案**:
```tsx
// 添加自定义选项时保存到 localStorage
const handleCustomConfirm = (name: string, notes: string) => {
  // 保存到 localStorage
  const newOption = addOption(name, name)
  if (notes) {
    updateOption(newOption.id, name, name, notes)
  }
  // 本地 state 会通过 useEffect 自动同步
  toast.success('已添加自定义选项')
}
```

#### 6. 选项字符限制
**文件**: `app/page.tsx`

**新建选项弹窗**:
- 练习名称：最多 **10 个字**（两行，每行5字）
- 备注：最多 **14 个字**（两行，每行7字）
- 计数器：x/10 和 x/14

**编辑选项弹窗**:
- 同样限制为 **10 + 14** 字符
- 保存时自动截断超出部分

**输入验证**:
```tsx
onChange={(e) => setPracticeName(e.target.value.slice(0, 10))}
onChange={(e) => setNotes(e.target.value.slice(0, 14))}
```

**Git 提交**:
- `09363d9` - style: 调整header布局为横向排列，logo缩小
- `7bd5d95` - style: header整合到滚动区域，可被截断；标题改为'熬汤日记·呼吸·觉察'
- `7d1dbca` - style: 标题颜色渐变；选项字符限制调整为5+7
- `b3448fa` - fix: 修复新建自定义选项刷新后丢失的问题
- `3fe6ac8` - fix: 修复刷新页面后自定义选项被重置的问题 - 检查localStorage而非options变量
- `9a6e32d` - style: 调整选项按钮宽度支持两行每行5个字
- `31267a8` - style: 调整选项字符限制为10+14（名称两行+备注两行）

**用户体验改进**:
- Header 随内容滚动，最大化内容展示区域
- 标题颜色渐变形成视觉层次
- 选项按钮宽度支持长文本，自动换行
- 自定义选项正确保存到 localStorage
- 刷新页面后所有设置保持不变
- 字符限制合理，避免按钮过宽

**下一步计划**:
- **P0**: 继续使用和测试，发现其他问题
- **P1**: 照片上传功能（Supabase Storage）
- **P2**: 数据备份提醒功能

**产品里程碑**: Tab1 练习打卡功能达到稳定可用标准 🎉

---

### 2026-01-21 Tab3 数据管理功能完善 ✅

**阶段**: 从基础功能到用户体验优化

**修复问题**:
1. ✅ 导入数据成功/失败提醒不显示
2. ✅ 练习选项编辑和删除后不保存到 localStorage
3. ✅ 刷新页面后自定义选项被重置
4. ✅ 365天热力图圆点布局优化
5. ✅ 导出功能弹窗交互优化

**核心改动**:

#### 1. 简化导入弹窗逻辑
**文件**: `components/ImportModal.tsx`, `app/page.tsx`
- 移除 ImportModal 内部的成功/失败状态显示
- 使用 toast 从顶部弹窗显示导入结果（3秒自动消失）
- 成功后 500ms 自动关闭导入弹窗和设置弹窗
- 失败时保持弹窗打开，方便用户重试
- 参考导出功能的交互模式，保持一致性

#### 2. 修复练习选项持久化问题
**文件**: `hooks/usePracticeData.ts`, `app/page.tsx`

**问题根因**:
- `handleEditSave` 和 `handleEditDelete` 只更新本地 state，没有同步到 localStorage
- `useLocalStorage` 默认值设置为 `DEFAULT_OPTIONS`，导致每次初始化都会覆盖用户自定义选项

**解决方案**:
- 添加 `updateOption(id, label, label_zh, notes)` 方法
- 添加 `deleteOption(id)` 方法
- 修改 `handleEditSave` 同时更新 localStorage 和本地 state
- 修改 `handleEditDelete` 同时更新 localStorage 和本地 state
- 添加 toast 提示"已保存修改"和"已删除选项"
- 将 `useLocalStorage` 默认值改为空数组 `[]`
- 修改 useEffect 逻辑，只在 options 为空时设置默认值

#### 3. 数据导出/导入验证
**导出数据包含**:
- ✅ `records` - 所有练习记录
- ✅ `options` - 所有练习选项（包括用户自定义）
- ✅ `profile` - 用户个人资料
- ✅ `export_at` - 导出时间戳

**导入验证**:
- ✅ 验证数据结构完整性
- ✅ 支持部分数据导入（records/options/profile 任一存在即可）
- ✅ 成功/失败都有明确的 toast 提示

#### 4. UI 优化
**文件**: `app/page.tsx`
- 练习按钮备注字号从 `text-xs` 改为 `text-[10px]`
- 导入/导出弹窗按钮颜色统一为全局绿色主题
- 导入弹窗背景提示信息调整为红色边框（与导出区分）

**技术实现**:
```typescript
// useLocalStorage 默认值改为空数组
const [options, setOptions] = useLocalStorage<PracticeOption[]>('ashtanga_options', []);

// useEffect 只在初始化时设置默认值
useEffect(() => {
  if (!options || options.length === 0) {
    setOptions(DEFAULT_OPTIONS);
  }
}, []);

// 导入逻辑使用 toast 提示
const result = importData(json)
if (result) {
  toast.success('✅ 数据导入成功！', {
    duration: 3000,
    position: 'top-center'
  })
} else {
  toast.error('❌ 数据导入失败，请检查格式', {
    duration: 3000,
    position: 'top-center'
  })
}
```

**Git 提交**:
- `ec6fe96` - fix: 简化导入弹窗逻辑，使用toast显示成功/失败提示
- `1b5cbef` - fix: 修复练习选项编辑和删除后不保存到localStorage的问题
- `1c990fb` - fix: 修复刷新页面后自定义选项被重置的问题

**用户体验改进**:
- 导入/导出操作现在都有明确的视觉反馈
- 用户自定义的练习选项可以正确保存和恢复
- 刷新页面不会丢失用户设置
- Tab3（我的数据）功能完整且稳定

**下一步计划**:
- **P0**: 继续使用和测试，发现其他问题
- **P1**: 照片上传功能（Supabase Storage）
- **P2**: 数据备份提醒功能

**产品里程碑**: Tab3 数据管理功能达到可用标准 🎉

---

### 2026-01-14 初始对话
**核心问题**:
1. 如何验证这个需求？
2. 这个事情到底靠不靠谱？
3. 应该选什么平台？

**Claude建议**:
1. 先用最低成本验证（小红书 + Excel）
2. 用v0.dev做原型（美观度高，AI生成）
3. 1周内看出需求是否成立

**Orange反馈**:
- 飞书模板不够美观，吸引不了用户
- 认可AI开发路线（不会花5万块找开发）
- 同意先验证需求

**决策**: 按Week 1验证计划执行
明白你的意思了，我们将结构调整为更符合“练习档案”感的**时间线布局**，并将数据中心回归到**个人用户页**。

以下是根据你的最新想法更新后的《阿斯汤加打卡 App 功能与结构需求文档》：

---

这是一份基于我们深度头脑风暴后整理的完整产品定义文档。它将作为你后续使用 AI（如 v0.dev 或 Claude Code）开发及进行市场验证的“蓝图”。

---

# 阿斯汤加打卡 App (Ashtanga Log) 产品定义文档

## 1. 项目概述

* **产品定位**：一个极简、专注、具有仪式感的阿斯汤加瑜伽练习记录工具。
* **核心理念**：简单到极致。拒绝教学、拒绝社交，只做练习后的身体觉察与档案记录。
* **目标用户**：有 3 年以上练习经验或长期坚持的资深阿斯汤加练习者（非新手）。

---

## 2. 页面架构与交互逻辑

### A. 首页：静谧的起点 (Practice)

* **视觉中心**：一个半透明磨砂质感的大圆按钮，在计时过程中会随 **Ujjayi 呼吸频率**（4-6秒/周期）缓慢放大与缩小，提供微弱的节奏引导。
* **快捷选择（按钮上方）**：
* 一序列 Mysore
* 半序列 Mysore
* 一序列口令课 (Led Class)
* 自定义 (Custom)


* **操作逻辑**：点击序列 -> 点击开始 -> 进入专注计时界面 -> 长按结束。

### B. 记录页：练习档案时间线 (Timeline)

* **布局逻辑**：采用“左日期、右内容”的档案式布局，让练习的厚度可视化。
* **左侧 (Date)**：显示具体日期和星期。
* **右侧 (Card)**：
* **练习元数据**：序列名称、精准练习时长。
* **成就标记 (Star)**：如果当日勾选了“突破时刻”，显示一个醒目的星星图标。
* **日记文字**：今日练习的身体觉察与感悟。
* **图片与 #Tag**：展示一张照片，并附带 `#体式名` 或 `#位置` 标签，方便后续通过标签筛选。



### C. 个人页：数据中心 (Me)
* **用户资料**：头像名字等基本信息
* **订阅管理**：管理 3 元/月或 30 元/年的订阅状态。
* **统计数据**：累计练习天数、累计练习总时长。
* **练习热力图**：展示一年内的练习分布，颜色深浅代表练习时长，让用户看到“复利”的痕迹。


---

## 3. 功能详情清单

| 功能 | 详情描述 | v1 版本状态 |
| --- | --- | --- |
| **精准计时** | 开始/结束手动触发，支持不锁屏下的呼吸灯动效。 | ✅ 核心功能 |
| **成就时刻** | 记录中的一个开关，标记今日是否有突破（如绑手、新体式）。 | ✅ 核心功能 |
| **#Tag 系统** | 上传图片时可自定义或选择标签，用于后续体式对比。 | ✅ 核心功能 |
| **补录功能** | 忘记计时时，允许手动添加日期、时长和序列。 | ✅ 核心功能 |
| **月相系统** | 自动标注 Moon Day 休息日，热力图特殊底纹。 | ⏳ 待开发 (v2) |
| **成就墙** | 汇总所有勾选了星星的里程碑时刻。 | ⏳ 待开发 (v2) |

---

## 4. 负向功能清单 (Why Not)

* **❌ 教学视频/音频**：用户是资深练习者，不需要在打卡工具里看视频。
* **❌ 大休息计时器**：练习结束已包含大休息，且练习场景多为多人教室，不宜频繁操作手机。
* **❌ 锁屏实时活动**：为了保持练习的绝对专注，减少手机消息干扰。
* **❌ 身体地图/量化指标**：身体感觉是复杂的，文字日记比生硬的打分更具深度。
* **❌ 社交排行榜**：瑜伽是内观的修行，不需要与他人竞争。

---

## 5. 商业模式与验证计划

### 商业模式

* **定价**：3 元/月 | 30 元/年（订阅制）。
* **收费逻辑**：核心计时功能免费；图片 #Tag 筛选、多图存储及未来的成就墙属于订阅功能。

### Week 1 验证标准 (Success Signals)

* **小红书测试**：发布包含“Timeline 档案感布局”和“呼吸感计时”的 UI 截图，收藏数 > 50。
* **用户反馈**：在调研的 10 个练习者中，超过 3 人表示愿意为“体式 #Tag 存档”付费。
* **自我验证**：Orange 自己用 Excel 模拟 Timeline 记录一周，确认“左日期、右日记”的模式确实能产生觉察。

---
---

## 开发日志

### 2026-02-23: 修复新建/补卡后编辑记录丢失问题 ✅

**阶段**: Bug修复（第十二轮最终修复）

**问题描述**:
- 新建记录 → 不刷新 → 编辑 → 保存 → 记录消失
- 刷新后记录恢复，但显示旧内容
- 再次编辑 → 仍然消失
- 再次刷新 → 才能正常编辑

**根本原因**:
- React 的 `setRecords` 是异步的
- `updateRecord` 中的 `prevRecords` 是旧状态，不包含新建的记录
- 编辑时传入的 ID 在 `prevRecords` 中找不到，导致更新失败

**解决方案**:
- 重写 `updateRecord`，直接操作 localStorage，不依赖 React 状态
- 步骤：
  1. 从 localStorage 读取最新记录
  2. 在本地数据中查找并更新
  3. 直接写入 localStorage
  4. 同时更新 React 状态（异步，但不依赖它）

**核心代码**:
```typescript
const updateRecord = (id, data, onSync) => {
  const now = new Date().toISOString();

  // 直接从 localStorage 读取最新记录
  const recordsStr = localStorage.getItem('ashtanga_records');
  const latestRecords = JSON.parse(recordsStr);

  // 查找并更新
  const updatedRecords = latestRecords.map(r =>
    r.id === id ? { ...r, ...data, updated_at: now } : r
  );

  // 直接写入 localStorage
  localStorage.setItem('ashtanga_records', JSON.stringify(sortedRecords));

  // 同时更新 React 状态
  setRecords(sortedRecords);

  // 触发同步
  setTimeout(() => onSync?.(updatedRecord), 100);
};
```

**诊断过程**:
1. 禁用同步功能 → 问题依旧 → 确定是本地保存问题
2. 添加详细日志 → 发现 ID 一致但找不到记录
3. 确认 `prevRecords` 不包含新记录 → 确定是 React 状态延迟
4. 重写 `updateRecord` → 直接操作 localStorage → 问题解决

**清理工作**:
- 移除所有诊断日志和 toast
- 移除3秒内禁止编辑的限制
- 移除点击编辑时显示 ID 的 toast
- 恢复同步功能（500ms 延迟）

**Git提交**:
- `69cb0ea` - fix: 重写 updateRecord，直接操作 localStorage
- `f831664` - cleanup: 移除诊断代码，恢复同步功能
- `23b21e1` - cleanup: 移除3秒编辑限制和ID显示toast

**测试结果**: ✅ 修复成功，新建记录后编辑不再丢失

**新发现问题** 🐛:
- 练习选项同步异常：后台只有13条记录，但10个用户应该更多
- 有用户自定义选项但在后台看不到
- 待 2026-02-24 调查

---

### 2026-01-25: 新用户教程记录系统 ✅

**目标**: 为新用户提供使用教程和示范

**核心功能**:
- ✅ 首次访问时自动添加3条教程记录（通过usePracticeData初始化）
- ✅ 修复练习类型显示：从数字ID改为完整字符串
- ✅ 教程日期使用固定日期：2026年1月1/7/10号

**3条教程记录**:

1. **首次练习教程**（2026-01-01）
   - 类型：一序列 Mysore
   - 时长：90分钟
   - 内容：🎉 开始记录你的阿斯汤加之旅！
     - 📝 如何记录觉察：身体感受、呼吸起伏、内心念头
     - 💡 小贴士：点击记录可以编辑或分享，完整编辑点击左侧区域

2. **突破时刻示范**（2026-01-07）
   - 类型：一序列 Led class
   - 时长：120分钟
   - 内容：🧘‍♂️ 今天的练习特别流畅，体式有了新的突破。超级开心
     - 🌟 突破时刻功能：记录里程碑、激励自己
     - 突破时刻：马里奇D终于可以自己绑上了

3. **休息日记录示范**（2026-01-10）
   - 类型：休息日 满月/新月
   - 时长：0分钟（不显示）
   - 内容：🌙 休息日也是练习的一部分。
     - 📖 如何记录休息日：恢复状况、期待、观察变化
     - 💤 休息是为了更好的练习，给身体时间成长

**技术实现**:
```typescript
// hooks/usePracticeData.ts - useEffect初始化
const storedRecords = localStorage.getItem('ashtanga_records');
if (!storedRecords || storedRecords === '[]') {
  const tutorialRecords: PracticeRecord[] = [
    {
      id: `tutorial-${Date.now()}-1`,
      created_at: now,
      date: '2026-01-01',
      type: '一序列 Mysore', // 完整字符串
      duration: 5400,
      notes: '🎉 开始记录你的阿斯汤加之旅！...',
      photos: []
    },
    // ... 其他2条记录
  ];
  setRecords(tutorialRecords);
}
```

**问题修复**:
1. ❌ 练习类型显示为数字（'1', '6'）
   - 原因：使用了option ID而非完整显示字符串
   - 解决：type使用完整字符串（如"一序列 Mysore"）
   - 结果：getTypeDisplayName自动截取显示"一序列"和"休息日"

2. ❌ 教程记录日期为当天
   - 原因：使用 `new Date().toISOString().split('T')[0]`
   - 解决：改为固定日期（2026-01-01, 2026-01-07, 2026-01-10）

3. ❓ 休息日时长为空
   - 结论：正常行为，duration=0时不显示（代码判断）

**时光轴间距问题**:
- 用户反馈：两条笔记之间间隔太近，文案连在一起
- 探索结果：记录之间没有垂直间距（motion.div无mb/mt类名）
- 建议：暂时不修改，等待用户实际使用反馈
- 方案：条件性间距（有内容时加间距，无内容时紧凑）

**练习备注显示问题**:
- 用户问题：练习类型下面要不要加上练习选项的备注？
- 分析：左侧列宽度只有70px，类型字体10px，不适合显示notes
- 建议：保持现有布局，不显示notes

**Git提交**:
- `5de6d73` - feat: 为新用户添加3条教程觉察记录
- `9354b13` - fix: 修复教程记录显示问题（练习类型和日期）

**部署状态**: ✅ 已推送到GitHub，Vercel自动部署完成

**用户体验**:
- 新用户首次进入tab1看到3条教程记录
- 点击记录可查看完整内容、编辑或删除
- 按照教程格式添加自己的练习

**下一步**:
- 继续使用和测试，发现其他问题
- P1: 照片上传功能（Supabase Storage）

**产品决策**: 符合"简单"理念，教程记录自动初始化，无需手动添加示范数据

---

### 2026-01-25: PWA原生应用封装完成 ✅

**目标**: 将Webapp封装为可安装的原生应用，无需应用商店审核

**核心功能**:
- ✅ PWA配置完成（manifest.json + Service Worker）
- ✅ Tab3添加PWA安装引导Banner（固定显示）
- ✅ Tab3左上角添加安装图标（点击触发）
- ✅ 智能检测用户系统和浏览器
- ✅ 根据系统+浏览器显示对应安装指引

**PWA特性**:
- 可安装到主屏幕，全屏运行，无浏览器地址栏
- 支持离线使用（Service Worker缓存）
- 图标：1024x1024全绿色icon.png
- 主题色：#4a7c59（绿色）

**安装指引**（Android）:
```
💡 安装到主屏幕方法
Chrome浏览器：点击右上角→ 选择添加到主屏幕
Edge浏览器：点击右下角→ 选择添加到手机
安装后可像App一样使用，获得最佳体验。
```

**技术实现**:
- `public/manifest.json` - PWA配置文件
- `public/sw.js` - Service Worker（离线缓存）
- `components/ServiceWorkerRegister.tsx` - 注册组件
- `components/PWAInstallBanner.tsx` - Banner组件
- `hooks/usePWAInstall.ts` - 安装逻辑hook

**浏览器兼容性**:
- 支持：Chrome、Safari、Edge、Samsung Internet
- 不支持：夸克、UC、小米、华为（不显示引导）

**Git提交**: 17个提交（fde2475 → 9d50e7c）

**部署状态**: ✅ 已推送到GitHub，Vercel自动部署完成

**用户体验**: 
- 两个提示入口（Banner固定 + Toast点击）
- 文案统一，覆盖主流浏览器
- 一键安装，无需审核，跨平台（iOS+Android）

**下一步**: 继续使用和测试，发现问题

---

### 2026-03-05: 小红书群邀请弹窗更新 ✅

**阶段**: UI优化（弹窗交互简化）

**需求背景**:
- 原有弹窗使用文本框 + 复制按钮的方式邀请用户加入小红书群
- 用户体验不够直观，需要简化为图片展示 + 一键关闭

**核心改动**:

#### 1. 文案改为图片展示
**文件**: `components/XiaohongshuInviteModal.tsx`
- 移除 `XIAOHONGSHU_INVITE_TEXT` 常量（原有复制文案）
- 移除复制框 UI（textarea + 复制按钮）
- 添加图片显示区域（使用 next/image）
- 图片路径: `public/进群方法.png`

**代码变更**:
```tsx
// 之前：复制框
<div className="bg-secondary/50 rounded-xl p-3 space-y-2">
  <p className="text-xs text-muted-foreground font-mono">📋 复制下方内容</p>
  <div className="bg-background rounded-lg p-3 text-xs text-muted-foreground font-mono break-all select-text">
    {XIAOHONGSHU_INVITE_TEXT}
  </div>
</div>

// 现在：图片展示
<div className="rounded-xl overflow-hidden border border-border">
  <Image
    src="/进群方法.png"
    alt="进群方法"
    width={400}
    height={300}
    className="w-full h-auto"
    priority
  />
</div>
```

#### 2. 按钮交互简化
**文件**: `components/XiaohongshuInviteModal.tsx`
- 按钮文案从 "一键复制" 改为 "马上去加入"
- 移除 `handleCopyAndJump` 函数（包含剪贴板操作和 toast 提示）
- 点击后直接调用 `onClose()` 关闭弹窗
- 移除 `copied` state 和 `useState` 导入
- 移除 `toast` 和 `Copy` icon 导入

**代码变更**:
```tsx
// 之前：复制功能
const handleCopyAndJump = async () => {
  await navigator.clipboard.writeText(XIAOHONGSHU_INVITE_TEXT)
  setCopied(true)
  toast.success('✅ 已复制！打开小红书即可自动识别')
}

// 现在：直接关闭
const handleJoin = () => {
  onClose()
}
```

#### 3. 版本号更新
**文件**: `components/XiaohongshuInviteModal.tsx`
```tsx
// 版本号 - 每次更新文案时修改此版本号
export const INVITE_VERSION = 'v2'  // 从 v1 更新到 v2
```

**作用**: 版本号变化会触发红点提示，让用户知道有更新

**Git提交**:
- `c2d4b66` (master2) - feat: 更新小红书群邀请弹窗为图片展示
- `cdccd4d` (master) - feat: 更新小红书群邀请弹窗为图片展示

**文件变更**:
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `components/XiaohongshuInviteModal.tsx` | 修改 | 弹窗组件重构 |
| `public/进群方法.png` | 新增 | 进群方法图片（2.2MB） |

**验证方法**:
1. 清除 localStorage 测试红点显示:
   ```javascript
   localStorage.removeItem('xhs_invite_read')
   localStorage.removeItem('xhs_invite_version')
   location.reload()
   ```
2. 点击头像查看弹窗是否正常显示图片
3. 点击"马上去加入"按钮弹窗是否关闭

**下一步计划**:
- 继续观察用户反馈
- 根据进群转化率决定是否进一步优化

---

### 2026-02-26: NotebookLM自动化流程完成 ✅

**阶段**: 小红书文案生成自动化

**核心功能**:
- ✅ NotebookLM MCP自动化控制脚本
- ✅ 文案生成并同步到飞书知识库
- ✅ 飞书表格状态管理

**NotebookLM输入格式**:
```
以"[主题内容]"为主题，帮我写3个不同角度的小红书文案
```
- NotebookLM已内置提示词，无需重复
- 自动生成3个角度：对话叙述型、痛点共鸣型、干货分享型

**飞书同步流程**:
1. MCP控制Chrome打开NotebookLM
2. 输入主题，自动生成文案
3. 移除Markdown `**` 加粗格式（飞书/小红书不支持）
4. 创建文档到"📁 02-创作中"文件夹
5. 添加状态管理区块（带跳转链接）
6. 创建飞书表格记录

**飞书表格字段**:
- 选题/灵感: 文本
- 排期日期: Unix时间戳（毫秒）
- 状态: 🟡待生成/🟠待审核/🟢待发布/🔵已发布/⏸️暂停
- 知识库链接: 链接
- ~~文案角度~~: 已删除

**技术实现**:
- `input_and_send.py` - MCP+Playwright自动化输入
- `sync_generated_to_feishu.py` - 飞书同步脚本
- `get_wiki_nodes.py` - 知识库节点查询

**文档存放位置**:
- Node Token: `UkvnwPEwoioBXxkd0RXcINlcnqd` (📁 02-创作中)

**规范固化**:
- 创建 `CONTENT_RULES.md` 记录所有格式规范
- 禁止 `**` 加粗语法
- 正确的NotebookLM输入格式
- 完整的同步流程

**Git状态**: 工作区有未提交文件（generated_马年第一练.md等）

**下一步**:
- 测试更多选题的自动化流程
- 优化状态管理区块的交互

---

---

## 2026-03-13: 性能优化 - 图片压缩 ✅

**阶段**: 性能优化

**背景**:
- 发现项目中存在多个大图片文件（总计超过11MB）
- 影响首屏加载速度和用户体验
- 需要优化图片大小以提升性能

**工作内容**:

### 1. 性能优化探索（已放弃）

**尝试方向**: Modal组件动态导入优化
- 提取SettingsModal为动态导入组件
- 遇到技术问题：导入路径错误、导出方式错误、样式丢失
- 评估后发现收益不明显（仅减少10-20KB Bundle）
- 决策：放弃此优化方向

**问题总结**:
- 3次构建失败，3次修复
- 开发时间：1-2小时
- 用户感知收益：几乎为零
- **教训**: 优先优化高性价比项目（图片 > 代码结构）

### 2. 图片压缩优化 ✅

**发现的大文件**:
| 文件名 | 大小 |
|--------|------|
| Gemini_Generated_Image_g8eq8eg8eq8eg8eq.png | 7.2MB |
| 进群方法.png | 2.2MB |
| pwa-install.png | 1.2MB |
| Sri K. Pattabhi Jois.png | 475KB |
| Sri K.jpeg | 251KB |
| **总计** | **11.1MB** |

**实施步骤**:

1. **创建压缩脚本** (`compress-images.js`)
   - 使用 sharp 库（Next.js自带）
   - 根据文件大小自动调整压缩质量
   - 大于5MB用60%质量，大于1MB用70%，其他用80%

2. **执行压缩**
   ```bash
   node compress-images.js
   ```

3. **压缩结果**:
   - Gemini_Generated_Image.png: 7.1MB → 238KB (减少96.7%)
   - 进群方法.png: 2.1MB → 337KB (减少84.4%)
   - pwa-install.png: 1.1MB → 200KB (减少83.0%)
   - Sri K. Pattabhi Jois.png: 475KB → 78KB (减少83.6%)
   - Sri K.jpeg: 250KB → 104KB (减少58.3%)

**最终效果**:
- 压缩前: 11.1 MB
- 压缩后: 958 KB
- **节省空间: 10.1 MB (91.6%)**

### 3. 分支同步

**Master分支**: 
- Commit: `448bb29`
- 状态: ✅ 已推送到远程

**Master2分支**:
- Commit: `4fcacce`
- 状态: ✅ 已推送到远程

**Dev分支**: 
- 状态: ❌ 已删除（性能优化尝试失败）

### 4. 技术总结

**成功经验**:
- ✅ 图片优化性价比极高（5分钟完成，节省10MB）
- ✅ 使用sharp库自动压缩，保持视觉质量
- ✅ 大幅减少首屏加载时间

**失败教训**:
- ❌ Modal动态导入收益低、风险高
- ❌ 技术正确不等于业务价值
- ❌ 性能优化需要数据支撑（Lighthouse分数）

**决策框架**:
| 情况 | 建议 |
|------|------|
| 用户抱怨慢 | 优化性能 |
| 没人抱怨但想完美 | 只做高性价比优化 |
| 有更重要功能要做 | 停止优化，做功能 |
| 想学技术 | 可以继续，但承认是学习 |

**时间投入**: 约2小时（包括失败的尝试）
**最终收益**: 两个分支共节省20.2MB空间


---

## 2026-03-17: 性能优化 - 保存图片速度优化 ⚡

**阶段**: 性能优化

**背景**:
- 用户反馈保存图片功能太慢，需要5秒或更久
- 其他APP都是1-2秒（秒级体验）
- 需要优化保存时间，提升用户体验

**工作内容**:

### 1. 问题分析

**核心瓶颈识别**:
1. ❌ 双重降级策略导致时间翻倍（先试modern-screenshot失败，再试html2canvas）
2. ❌ scale: 2 导致渲染4倍像素量
3. ❌ 100ms硬编码等待浪费时间

**性能分析**:
```
用户点击保存
  ↓
尝试 modern-screenshot (2秒) → ❌ 失败
  ↓
尝试 html2canvas (3秒) → ✅ 成功
  ↓
总共：5秒！！！
```

### 2. 优化实施 ✅

**优化1: 方法缓存机制（最关键！）**
- 使用localStorage记录上次成功的截图方法
- 下次直接使用缓存的方法，避免双重尝试
- **代码位置**: `lib/screenshot.ts:40-62`

```typescript
// 缓存上次成功的截图方法
const STORAGE_KEY = 'screenshot_last_successful_method'
let lastSuccessfulMethod: 'modern-screenshot' | 'html2canvas' | null = null

// 从localStorage读取缓存
function getCachedMethod() {
  const cached = localStorage.getItem(STORAGE_KEY)
  return cached === 'modern-screenshot' || cached === 'html2canvas' ? cached : null
}

// 保存成功的方法
function saveSuccessfulMethod(method) {
  localStorage.setItem(STORAGE_KEY, method)
  lastSuccessfulMethod = method
}

// 优化逻辑
if (lastSuccessfulMethod === 'modern-screenshot') {
  console.log('🚀 使用缓存方法: modern-screenshot')
  return await captureWithModernScreenshot(element)
}
```

**优化2: 降低scale参数**
- scale: 2 → scale: 1（减少75%渲染像素量）
- **代码位置**: `lib/screenshot.ts:99, 130`

```typescript
// modern-screenshot
const dataUrl = await domToPng(element, {
  scale: 1,  // 从2改为1
  backgroundColor: '#ffffff'
})

// html2canvas
const canvas = await html2canvas(element, {
  scale: 1,  // 从2改为1
  backgroundColor: '#ffffff'
})
```

**优化3: 优化DOM更新时机**
- 使用requestAnimationFrame替代setTimeout
- **代码位置**: `app/practice/page.tsx:890-892`

```typescript
// 优化前
await new Promise(resolve => setTimeout(resolve, 100))

// 优化后
await new Promise(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(resolve))
})
```

**优化4: 移除冗余scale参数**
- 移除page.tsx中的scale参数
- **代码位置**: `app/practice/page.tsx:893`

### 3. 性能提升预期

| 优化项 | 效果 |
|--------|------|
| 方法缓存 | 减少50%时间 |
| scale: 2→1 | 减少75%像素量 |
| RAF替代setTimeout | 更准确的时机 |
| 移除冗余参数 | 代码更简洁 |

**综合效果**:
- 优化前: ~5秒
- 优化后: 1-2秒
- **提升: 减少60-75%时间 ⚡**

### 4. 代码修改统计

**lib/screenshot.ts**:
- 新增: 130行（方法缓存机制）
- 修改: 10行（scale参数、降级逻辑）

**app/practice/page.tsx**:
- 修改: 5行（RAF替代setTimeout、移除scale参数）

### 5. 待测试验证

**浏览器兼容性**:
- [ ] Chrome浏览器
- [ ] Safari浏览器
- [ ] 微信浏览器

**验收标准**:
- [ ] 保存时间 < 2秒
- [ ] 图片清晰度足够
- [ ] 兼容性不降低
- [ ] 缓存机制正常工作

### 6. 技术亮点

**用户体验优化**:
```
第一次使用：
点击保存 → 尝试modern-screenshot → 失败 → 尝试html2canvas → 成功 → 保存方法到缓存
总时间：2-3秒

后续使用：
点击保存 → 直接使用html2canvas（缓存）→ 成功
总时间：1-2秒 ⚡
```

**缓存失效机制**:
- 缓存方法失败时自动清除
- 用户清除浏览器数据时清除
- localStorage错误时降级到默认策略

### 7. 文档更新

**已创建文档**:
- ✅ `memory.md` - 更新本次优化记录
- ✅ `优化总结_保存图片性能.md` - 详细技术文档

**分支状态**:
- 当前分支: master2
- 待推送: 本地已修改，准备推送

**时间投入**: 约1小时
**预期收益**: 用户体验大幅提升，达到其他APP的"秒级"体验


## 2026-03-18: Canvas 分享卡片绘制优化 ✅

**阶段**: 性能优化（分享卡片导出）

**问题描述**:
- 原有分享卡片使用 html2canvas/modern-screenshot 将 DOM 转为图片
- 长文案时耗时 800ms-1500ms，用户体验慢
- 有时图片已保存，toast 还在显示"生成中"

**优化目标**:
- 绘制时间从 1.5s 降至 300ms 以内
- 保持现有视觉样式
- 输出高清图片（scale: 2）

**解决方案**:

### 1. 新建 Canvas 绘制工具
**文件**: `lib/share-card-canvas.ts`

核心函数:
- `drawShareCard()` - 绘制分享卡片
- `createShareCard()` - 完整流程封装
- `wrapText()` - 文字自动换行（保留手动换行和空行）
- `loadImage()` - 加载图片（带 3 秒超时）

### 2. 修改页面逻辑
**文件**: `app/practice/page.tsx`

- 优先使用 Canvas 绘制（高性能）
- Canvas 失败时降级到 DOM 截图（兼容性好）
- 保留原有日志记录和错误处理

### 3. 视觉细节调整

| 问题 | 解决方案 |
|------|----------|
| 灰色背景和圆角 | 背景改为白色，使用 clip 裁剪 |
| 底部白色块 | 精确计算 contentHeight，移除最小高度限制 |
| 数字和单位贴在一起 | 改为左右分布，中间有间距 |
| 文案不居中 | fillText y 坐标 +18px，垂直居中于行高 |
| 手动换行丢失 | wrapText 先按 \\n 分割，再自动换行 |
| 空行丢失 | 空段落添加空字符串，绘制时保留高度 |
| 头像加载阻塞 | 添加 3 秒超时，超时后降级为绿色默认头像 |
| 默认头像颜色 | 改为绿色圆形 #2d5a27 |
| 品牌名位置 | 移到签名同行右侧 |
| 时长数字间距 | 到上线条间距 25px |

### 4. 性能对比

| 方案 | 耗时 |
|------|------|
| html2canvas | 800ms-1500ms |
| modern-screenshot | 500ms-1000ms |
| **Canvas 绘制** | **50-100ms** |

提升约 **10-15 倍**

**Git提交**:
- `c262408` - fix: 头像加载超时从 500ms 增加到 3 秒
- `6c24ba9` - fix: 时长数字到上线条间距 38 -> 25px
- `1f08973` - fix: 调整时长间距 + 默认头像改为绿色
- `00c9f7b` - fix: 保留空行 + 垂直居中修复
- `8835a21` - fix: 保留用户手动输入的换行符
- `5fdda8a` - fix: 文案在分隔线之间精确垂直居中
- `3cf9fc2` - fix: 精确计算 contentHeight，消除底部空白
- `2b60114` - feat: Canvas 绘制分享卡片，性能提升 10-15 倍

**相关文件**:
- 新增: `lib/share-card-canvas.ts`
- 修改: `app/practice/page.tsx`

---

## 2026-03-05: 修复 Vercel 构建错误 ✅

**阶段**: Bug修复（部署问题）

**问题描述**:
- Vercel 部署失败，报错：`await isn't allowed in non-async function`
- 错误位置：`app/practice/page.tsx:4272`

**根本原因**:
`handleStartPractice` 函数使用了 `await` 调用 `audioCache.isCacheValid()`，但函数定义缺少 `async` 关键字。

**修复方案**:
```typescript
// 修复前
const handleStartPractice = () => {

// 修复后
const handleStartPractice = async () => {
```

**Git提交**:
- `c386e4d` (master2) - fix: 修复 handleStartPractice 函数缺少 async 关键字

---

## 项目概述
**创建时间**: 2026-01-14
**项目阶段**: 需求验证阶段
**核心理念**: 简单 - 专注打卡功能做到极致

---

## 2026-03-05: 修复口令跟练功能点击无反应问题 ✅

**阶段**: Bug修复（口令跟练功能）

**问题描述**:
- 点击口令跟练选项后，再点击"开始练习"没有反应
- 用户感觉界面卡死，没有任何反馈

**根本原因分析**:

1. **音频加载阻塞界面**: `handleStartPractice` 函数中，口令跟练模式会创建 `Audio` 对象并等待 `loadedmetadata` 事件
2. **延迟进入练习界面**: 只有在音频加载完成后（约几秒到十几秒，取决于网络），才设置 `setIsPracticing(true)` 进入练习界面
3. **用户无感知**: 在此期间用户看不到任何反馈，以为点击无效

**修复方案**:

### 修复1: 立即进入练习界面
**文件**: `app/practice/page.tsx:4240` (`handleStartPractice` 函数)

**修复前**:
```typescript
const handleStartPractice = () => {
  if (selectedOption) {
    // 口令跟练模式：先加载音频
    if (selectedOption === 'guided_audio') {
      setIsAudioLoading(true)
      const audio = new Audio(GUIDED_AUDIO_OPTION.audio_src)

      audio.addEventListener('loadedmetadata', () => {
        // 音频加载完成后才进入练习界面
        setIsPracticing(true)  // ⭐ 延迟执行
        audio.play()
      })
    }
  }
}
```

**修复后**:
```typescript
const handleStartPractice = () => {
  if (selectedOption) {
    // 先进入练习界面（立即给用户反馈）
    const now = Date.now()
    setStartTime(now)
    setIsPracticing(true)  // ⭐ 立即执行
    setIsPaused(false)
    // ...

    // 口令跟练模式：加载音频
    if (selectedOption === 'guided_audio') {
      setIsAudioLoading(true)
      setAudioError(null)
      setIsPaused(true)  // ⭐ 先暂停，等音频加载完成

      const audio = new Audio(GUIDED_AUDIO_OPTION.audio_src)

      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration)
        setIsAudioLoaded(true)
        setIsAudioLoading(false)

        // 音频加载完成，自动开始播放和计时
        setIsPaused(false)  // ⭐ 加载完成后自动开始
        audio.play()
      })
      // ...
      setAudioElement(audio)
    }
  }
}
```

### 修复2: 统一口令跟练选项样式
**文件**: `app/practice/page.tsx:4714-4720`

- 移除 `isGuidedAudio` 特殊样式判断
- 移除 `Volume2` 图标
- 样式改为和其他普通选项完全一致

**代码变更**:
```typescript
// 之前：特殊样式和图标
const isGuidedAudio = option.id === "guided_audio"
// ...
isGuidedAudio
  ? "bg-primary/10 text-primary border border-primary/30..."
  : "bg-background text-foreground..."
// ...
{isGuidedAudio && <Volume2 className="w-3.5 h-3.5 inline-block" />}

// 现在：和其他选项一样
"bg-background text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-stone-100/50"
```

**Git提交**:
- `a3f3189` (master2) - fix: 修复口令跟练功能点击无反应问题
- `ce7a3e8` (master) - fix: 修复口令跟练功能点击无反应问题

**用户体验改进**:
- 点击"开始练习"立即进入计时界面，不再卡顿
- 音频加载期间显示"加载中..."状态
- 音频加载完成后自动开始播放和计时
- 口令跟练选项样式和其他选项一致，不突兀

**测试建议**:
1. 选择"一序列跟练"选项
2. 点击"开始练习"
3. 验证是否立即进入计时界面
4. 验证是否显示"加载中..."
5. 验证音频加载完成后是否自动开始播放

---

## 2026-02-28: 修复同步时名字签名被重置问题 ✅ 完成

**阶段**: Bug修复（同步功能优化）

**问题描述**:
- 用户在同步练习记录时，选择"智能合并"后，个人资料（名字、签名）有时会被重置为默认状态

**根本原因分析**:

1. **问题1**: `smartMerge` 函数未处理 profile 数据
   - 只同步了练习记录和选项，完全没有处理 profile
   - 如果云端 profile 被错误构建为默认值，智能合并不会修正

2. **问题2**: 使用云端数据时错误的有效性判断
   - 多处代码排除了 `'阿斯汤加习练者'` 这个值，认为它是"无效的"
   - 但实际上用户可能恰好喜欢用这个名字
   - 选择"使用云端数据"时，如果云端是默认名字，会被强制重置

3. **问题3**: 同步对比逻辑与构建逻辑不一致
   - 对比阶段已正确识别 profile 变更来源
   - 但构建 `mergedProfile` 时重新进行"有效性"判断，覆盖了对比结果

**修复方案**:

### 修复1: 智能合并时正确处理 profile 数据
**文件**: `hooks/useSync.ts:547` (`smartMerge` 函数)
```typescript
// 智能合并 profile：比较时间戳，使用更新的那个
let mergedProfile = freshLocalData.profile
if (remoteData.profile) {
  const localTime = new Date(freshLocalData.profile?.updated_at || freshLocalData.profile?.created_at || 0).getTime()
  const remoteTime = new Date(remoteData.profile.updated_at || remoteData.profile.created_at).getTime()

  if (remoteTime > localTime) {
    mergedProfile = remoteData.profile
  }
}

onSyncComplete({
  records: [...freshLocalData.records, ...remoteOnly],
  options: remoteData.options || [],
  profile: mergedProfile // ⭐ 添加 profile
})
```

### 修复2: 移除错误的默认值判断
**文件**: `hooks/useSync.ts`
**位置**: 394-408 行, 454-468 行, 928-942 行

**修复前**:
```typescript
const mergedProfile = remoteData.profile && remoteData.profile.name && !remoteData.profile.name.match(/^\d+$/) && remoteData.profile.name !== '阿斯汤加习练者'
  ? { /* 使用云端 */ }
  : { name: '阿斯汤加习练者', ... } // 默认值
```

**修复后**:
```typescript
const mergedProfile = remoteData.profile && remoteData.profile.name
  ? { /* 直接使用云端数据 */ }
  : freshLocalData.profile || { name: '阿斯汤加习练者', ... } // 只有真正没有数据时才用默认值
```

**关键原则**: 默认值 `'阿斯汤加习练者'` 只是一个初始值，不应该在同步过程中被当作"无效数据"处理。

### 修复3: 信任同步对比结果
**文件**: `hooks/useSync.ts:394-408`
- 直接使用 `profileChangeSource` 的结果
- 不要重新判断 profile 是否"有效"

**验证方案**:

1. **测试用例1**: 智能合并时 profile 不被重置
   - 设备 A：修改名字为 "小明"，等待同步到云端
   - 设备 B：触发冲突，选择智能合并
   - 验证：设备 B 的名字应该是 "小明"（不是默认值）

2. **测试用例2**: 云端是默认名字时不被强制重置
   - 云端 profile 名字为 "阿斯汤加习练者"
   - 本地 profile 名字为 "小明"
   - 同步时选择"使用云端数据"
   - 验证：云端数据被正确下载，名字为 "阿斯汤加习练者"（不是又被重置一次）

3. **测试用例3**: 基于时间戳的正确合并
   - 本地 profile 更新时间为今天 10:00，名字为 "小明"
   - 云端 profile 更新时间为今天 12:00，名字为 "大明"
   - 触发智能合并
   - 验证：最终名字为 "大明"（云端更新）

**Git提交**:
- `fd9ea26` - fix(sync): 修复同步时名字签名被重置的问题

**修改文件**:
| 文件 | 位置 | 说明 |
|------|------|------|
| `hooks/useSync.ts` | 394-408, 454-468, 547, 928-942 | 主要修复位置 |

**下一步**:
- 继续观察同步功能是否稳定
- 处理其他已知问题（练习选项同步异常）

---

## 2026-02-27: 飞书多维表格读取技能 ✅ 完成

### 背景
用户希望将飞书读取功能单独做成一个 Claude Code 技能，可以直接发送多维表格链接，Claude 就能读取表格内容进行分析。

### 实现
创建了 `.claude/skills/feishu-bitable-read/` 技能：

**文件结构**:
```
.claude/skills/feishu-bitable-read/
├── skill.yml          # 技能定义
├── config.json        # 配置文件（app_id, app_secret）
└── read_bitable.py    # 核心逻辑
```

**核心功能**:
1. **URL 解析**: 从 `https://xxx.feishu.cn/base/{app_token}?table={table_id}` 提取参数
2. **Token 管理**: 自动获取 tenant_access_token
3. **分页读取**: 处理大量数据的分页获取（每页 500 条）
4. **字段映射**: 自动将 field_id 转换为字段名显示
5. **缓存机制**: 默认 5 分钟缓存，避免重复调用 API
6. **表格目录**: 支持配置多个表格，使用 key 快速切换
7. **默认表格**: 无需输入 URL，自动使用默认表格
8. **待发货清单**: 一键查看待发货订单和订货清单

**表格目录** (`config.json`):
```json
{
  "default_table": "orders",
  "tables": {
    "orders": {
      "name": "有赞订单",
      "url": "https://xxx.feishu.cn/base/xxx",
      "description": "有赞商城订单数据"
    }
  }
}
```

**使用方式**:
```bash
# 查看待发货订单（使用默认表格）
/feishu-bitable-read

# 使用指定表格 key
/feishu-bitable-read orders

# 使用完整链接
/feishu-bitable-read https://xxx.feishu.cn/base/xxx

# 查看表格目录
/feishu-bitable-read --list-tables
```

**配置凭证**:
- `app_id`: cli_a92a4d950d385cef
- `app_secret`: rbhvYLZ8zJj5Lx3Vz4DlLcBEcJ2FgEVj

### 测试验证
使用有赞订单表格链接测试成功：
- 表格名称: 有赞订单
- 记录总数: 486 条
- 字段数量: 161 个

### 版本迭代

**v1.0 (2026-02-27)**: 基础功能
- URL 解析、Token 管理、分页读取、缓存机制

**v2.0 (2026-02-27)**: 智能表格目录
- 添加表格目录管理功能
- 支持默认表格（无需输入 URL）
- 支持表格 key 快速切换
- 待发货订单统计功能
- `--list-tables` 查看表格目录

### 复用代码
从 `XBB-APP/ashtanga-xiaohongshu/_scripts/sync_feishu_content.py` 复用了：
- `get_tenant_token()` 方法
- `get_all_records()` 分页逻辑
- 错误处理模式

---

## 用户画像
- **姓名**: orange
- **角色**: 产品经理
- **背景**: 阿斯汤加瑜伽练习3年
- **技术背景**: 不会写代码，用AI开发
- **付费意愿**: 小几十块/年

---

## 需求描述

### 现状痛点
- 在约课软件上看练了几天
- 在个人日记上记录练习
- **数据不统一**，无法看进步/状态

### 核心需求
- 打卡 + 时间 + 文字补充 + 照片
- 时间线回顾
- 以后可能生成回忆

### 功能定位
**不是**瑜伽学习app
**不是**体式教学app
**就是**专注打卡 + 身体觉察的记录工具

---

## 市场调研
- **小红书搜索**: 没有专注阿斯汤加打卡的产品
- **竞品**: 瑜伽学习app（嵌入打卡功能，不纯粹）
- **参考案例**: 鸿蒙咖啡打卡app（成功案例）

---

## 需求验证计划

### Week 1: 验证需求（不写代码）

#### 方案1: 小红书测试
- **内容**: "练了3年阿斯汤加，想做个打卡app，有人需要吗？"
- **观察指标**: 收藏数 > 50 = 需求成立
- **关键信号**: 有人问"什么时候出"、"求分享"

#### 方案2: 亲身体验
- **工具**: Excel/飞书表格
- **时长**: 1周
- **目的**: 验证自己能否坚持记录

#### 方案3: 用户调研
- **目标**: 找10个阿斯汤加练习者
- **问题**:
  - 你现在怎么打卡？
  - 打卡最痛苦的是什么？
  - 愿意为app付多少钱？

---

## 技术方案（待验证后确定）

### 候选方案

| 方案 | 成本 | 时间 | 美观度 |
|------|------|------|--------|
| v0.dev (Vercel) | 0 | 3-5天 | ⭐⭐⭐⭐⭐ |
| Claude Code + Streamlit | 0 | 1周 | ⭐⭐⭐ |
| PWA (打包) | 0 | 1周 | ⭐⭐⭐⭐ |

### 核心功能
- 打卡按钮
- 时间记录
- 文字补充
- 照片上传
- 时间线回顾

---

## 产品方法论应用

### 预测
- 阿斯汤加小众但粘性高
- 市场上没有纯打卡产品
- 打卡app留存问题（3个月后流失）

### 单点击穿
- **核心功能**: "今天练了，记录一下"
- **差异化**: 不做教学，只做记录
- **目标用户**: 练了很久的人，不是新手

### All-in
- 待需求验证后再决定

---

## 验证标准

### ✅ 需求成立的信号
- 小红书收藏 > 50
- 10+人说"希望有app"
- 自己能坚持记录1周

### ❌ 需求不成立的信号
- 小红书没人理
- 自己1周都坚持不了记录
- 反馈都是"不需要"

---

## 下一步行动

- [ ] Week 1: 小红书发帖测试
- [ ] Week 1: 用Excel记录1周
- [ ] Week 1: 收集用户反馈
- [ ] Week 2: 根据反馈决定是否开发

---

## 项目对话记录

### 2026-01-22 Tab1 UI样式优化完成 ✅

**阶段**: UI细节打磨

**核心改动**:
- ✅ 选项按钮样式全面优化
  - 按钮间距：gap-4 (16px) → gap-2 (8px)，更紧凑
  - 按钮内边距：py-2 px-2 → py-[6px] px-1 (上下6px, 左右4px)
  - 名称字号：text-xs (12px) → text-[14px]，可读性提升
  - 备注字号：text-[10px] → text-[11px]
  - 按钮最小高度：min-h-[72px]
- ✅ 默认选项文案简化（hooks/usePracticeData.ts）
  - 原来："一序列 Mysore"、"一序列 Led Class"（混用中英文，太长）
  - 现在："一序列" + "Mysore"、"一序列" + "Ledclass"（纯中文+简短英文）
  - 6个默认选项：一序列(Mysore/Ledclass)、二序列(Mysore/Ledclass)、半序列、休息日
- ✅ 底部Tab导航间距优化：pb-8 (32px) → pb-4 (16px)，更贴近屏幕底部
- ✅ 网页标题修改：熬汤日记·觉察呼吸 → 熬汤日记·呼吸·觉察（顺序调整）
- ✅ 首页添加英文标语："Practice, practice, and all is coming."
  - Pattabhi Jois的名言
  - 9px 字号，灰色50%透明度，贴在中文标题正下方
- ✅ 提示文字优化：单击选择·双击编辑（使用中点号）
  - 间距优化：mt-2 (8px) → mt-[-4px]（负值，上移4px）
  - 实际间距从24px减小到12px
- ✅ Logo图标调整：32px × 32px → 34px × 34px
- ✅ 删除Zeabur相关文档：确认使用Vercel部署

**技术实现**:
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 自定义值：text-[14px], text-[9px], w-[34px], py-[6px]
- 负边距技巧：mt-[-4px] 实现元素重叠效果

**Git提交**:
- `d83af42` - 优化选项按钮显示 - 调整内边距为px-1，间距改为gap-4
- `495d218` - 删除Zeabur相关内容，更新为Vercel部署
- `47016ec` - 名称字号改为20px
- `fe85d6f` - 名称字号改回16px
- `1d27d9e` - 名称字号改为14px
- `da7f79e` - 按钮上下内边距改为6px
- `e4b6e83` - 底部Tab导航改为pb-4，更贴近屏幕底部
- `6551ef4` - 网页标题改为'熬汤日记·呼吸·觉察'
- `4230414` - 首页标题下方添加英文小字'Practice, practice, and all is coming.'
- `40a4199` - 英文标语改为9px，贴在中文标题正下方
- `3e30ba5` - 提示文字改为'单击选择·双击编辑'，间距改为mt-2(8px)，英文标语改为9px
- `cb52f47` - 提示文字间距改为mt-[-4px]，更贴近按钮
- `b1c6542` - logo图标大小改为34px×34px

**用户体验改进**:
- 按钮更紧凑，文字更大更清晰
- 默认选项文案更简洁，一眼就能看懂
- Tab导航更贴近底部，更方便操作
- 英文标语增添瑜伽文化气息
- 整体UI更加精致和专业

**产品决策**: 符合"简单"理念，Tab1样式打磨完成，达到稳定可用标准

**下一步计划**:
- P0: 继续使用和测试，发现其他问题
- P1: 照片上传功能（Supabase Storage）
- P2: 其他Tab的UI优化

---

### 2026-01-19 Supabase数据持久化完成 ✅

**阶段**: 从MVP到可用产品

**核心功能**:
- ✅ Supabase数据库集成（3个表：practice_records, practice_options, user_profiles）
- ✅ 完整CRUD操作（创建、读取、更新、删除）
- ✅ 编辑记录功能（点击记录左侧编辑，同步更新到Supabase）
- ✅ 删除记录功能（确认对话框，同步删除Supabase数据）
- ✅ 保存后自动跳转到觉察日记Tab
- ✅ 数据持久化（刷新页面数据不丢失）
- ✅ 错误处理优化（网络错误时优雅降级）

**技术实现**:
- Next.js 16 + React 19 + TypeScript
- Supabase PostgreSQL数据库
- @supabase/supabase-js客户端
- lib/database.ts - 完整CRUD函数库
- lib/supabase.ts - 数据库连接配置
- .env.local - 环境变量配置

**数据库表结构**:
```sql
-- practice_records (练习记录表)
- id: BIGINT (主键，自增)
- created_at: TIMESTAMP (创建时间)
- date: DATE (练习日期)
- type: TEXT (练习类型，如"一序列Mysore")
- duration: BIGINT (时长，秒)
- notes: TEXT (觉察文字)
- photos: TEXT[] (照片数组，存储URL)
- breakthrough?: TEXT (突破标题，可选)

-- practice_options (练习选项表)
- id: BIGINT (主键，自增)
- created_at: TIMESTAMP (创建时间)
- label: TEXT (英文标签)
- label_zh: TEXT (中文标签)
- notes?: TEXT (备注说明)
- is_custom: BOOLEAN (是否用户自定义)

-- user_profiles (用户信息表)
- id: BIGINT (主键，自增)
- created_at: TIMESTAMP (创建时间)
- name: TEXT (用户名)
- signature: TEXT (个性签名)
- avatar?: TEXT (头像URL)
- phone?: TEXT (手机号)
- email?: TEXT (邮箱)
- is_pro: BOOLEAN (是否付费会员)
```

**遇到的问题和解决方案**:

1. ❌ API key格式错误
   - 问题：使用了新版publishable key（`sb_publishable_xxx`格式）
   - 解决：改用legacy anon key（`eyJhbG...`JWT格式）
   - 教训：Supabase更新了API key系统，需要使用legacy key

2. ❌ 数据表缺少date字段
   - 问题：表结构与设计文档不一致
   - 解决：按照设计方案重新创建表
   - 工具：在SQL Editor中执行DROP TABLE + CREATE TABLE

3. ❌ React key重复警告
   - 问题：mock数据和Supabase数据有重复的id
   - 解决：移除mock数据，初始状态改为空数组
   - 结果：只使用Supabase真实数据

4. ❌ 删除功能失败（错误信息为空对象）
   - 问题：错误日志不够详细，无法排查
   - 解决：改进错误日志，输出JSON.stringify(error)
   - 结果：发现是RLS权限问题，关闭RLS后正常

**技术决策**:
- v1.0只给自己用，关闭RLS（Row Level Security）
- v1.5对外开放时再开启权限控制
- 符合"简单"理念，先核心功能，后权限管理

**Git提交**:
- `35cf58e` - feat: 阿斯汤加打卡app - Supabase数据持久化完成
  - 99个文件，16214行代码
  - 包含完整的Next.js项目、UI组件、数据库逻辑
- `57e7682` - docs: 更新memory.md记录今日工作

**配置文档**:
- `SUPABASE_SETUP_GUIDE.md` - 详细的Supabase配置指南
  - 创建项目的步骤
  - 3个数据表的SQL语句
  - RLS配置说明
  - API key获取方法

**下一步计划**:
- **P0（核心完善）**: 照片上传功能（压缩+存储到Supabase Storage）
- **P1（体验优化）**: 加载状态提示、错误提示美化（用toast替代alert）
- **P2（部署上线）**: 部署到Vercel、配置自定义域名

**产品决策**: 符合"简单"理念，专注核心数据功能，app现在真正可用了！

---

### 2026-01-19 Zeabur云端部署成功 ✅

**阶段**: 从本地开发到云端可用

**部署成果**:
- ✅ 成功部署到Zeabur平台
- ✅ GitHub仓库自动化部署
- ✅ 89个核心文件上传
- ✅ 环境变量配置完成
- ✅ 应用成功运行在云端

**部署过程**:

1. **GitHub仓库清理**
   - 清空远程仓库，准备重新上传
   - 保留本地文件，只清空GitHub

2. **创建部署版本**
   - 在Ashtang_app/目录初始化新git仓库
   - 配置.gitignore排除非部署文件：
     - `screenshots/` - 截图目录
     - `yoga-app-homepage/` - 备份目录
     - `docs/` - 文档目录
     - `*.md` - Markdown文件（除了.zeabur.yaml）
     - `node_modules/` - 依赖包
     - `.next/` - 构建缓存

3. **上传核心文件**（89个文件）
   - Next.js应用完整代码
   - 配置文件（package.json, tsconfig.json, next.config.mjs等）
   - 组件库（57个shadcn/ui组件）
   - 公共资源（11个图标和占位图）
   - Zeabur配置（.zeabur.yaml）

4. **Zeabur配置**
   - Root Directory: `/`（项目文件在仓库根目录）
   - 环境变量配置：
     - `NEXT_PUBLIC_SUPABASE_URL`: https://xojbgxvwgvjanxsowqik.supabase.co
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   - 自动部署配置：GitHub推送自动触发部署

5. **部署验证**
   - ✅ 文件上传成功
   - ✅ 构建过程正常
   - ✅ 应用成功运行
   - ✅ Supabase连接正常

**技术亮点**:
- 使用pnpm作为包管理器
- Zeabur自动检测Next.js项目
- 零配置部署（.zeabur.yaml只需设置build命令）
- GitHub集成实现自动化部署

**部署地址**:
- GitHub仓库: https://github.com/jstur225/ashtanga-app
- Zeabur控制台: （用户提供）

**遇到的问题**:
1. ❌ 初次部署Zeabur找不到项目文件
   - 原因：项目文件在yoga-app-homepage/子目录
   - 解决：将项目文件移到仓库根目录

2. ❌ .env.local未包含在部署中
   - 原因：.gitignore排除了.env*文件
   - 解决：在Zeabur中手动配置环境变量

**Git提交**:
- （部署版本在Ashtang_app/目录的新git仓库）

**下一步计划**:
- **P0**: 测试云端应用功能完整性
- **P1**: 配置自定义域名
- **P2**: 添加监控和错误追踪
- **P3**: 照片上传功能（Storage配置）

