// Canvas 绘制分享卡片 - 高性能方案
// 目标：将截图时间从 800ms-1500ms 降至 300ms 以内

interface ShareCardData {
  date: string
  type: string
  duration: number
  notes: string
  breakthrough?: string
  thisMonthDays: number
  totalCount: number
  totalHours: number
  profile: {
    name: string
    signature: string
    avatar?: string
  }
}

interface DrawOptions {
  scale?: number
}

// 颜色配置
const COLORS = {
  background: '#ffffff',  // 改为白色，去掉灰色外围
  cardBackground: '#ffffff',
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
  textMuted: '#999999',
  accentOrange: '#e67e22',
  border: '#e5e5e5',
}

// 字体配置（使用系统字体，确保加载速度）
const FONTS = {
  serif: "'Noto Serif SC', 'Songti SC', 'STSong', 'SimSun', serif",
  sans: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
}

/**
 * 加载图片
 */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/**
 * 文字自动换行
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  let currentLine = ''

  for (const char of text) {
    const testLine = currentLine + char
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = char
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

/**
 * 绘制圆角矩形
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * 绘制圆形头像
 */
function drawCircularAvatar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, x, y, size, size)
  ctx.restore()
}

/**
 * 主要绘制函数
 */
export async function drawShareCard(
  canvas: HTMLCanvasElement,
  data: ShareCardData,
  options?: DrawOptions,
): Promise<void> {
  const startTime = performance.now()
  const scale = options?.scale || 2

  // 基础尺寸配置
  const BASE_WIDTH = 360
  const PADDING = 0
  const HEADER_HEIGHT = 100
  const FOOTER_HEIGHT = 0  // 签名到底部无额外空白
  const LINE_HEIGHT = 24
  // 长文案完整显示，不限制高度

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法获取 Canvas 上下文')

  // 先设置 Canvas 尺寸和缩放
  // 估算最小高度（用于第一次字体测量）
  canvas.width = BASE_WIDTH * scale
  canvas.height = 800 * scale  // 临时高度
  ctx.scale(scale, scale)

  // 设置字体并计算换行（在 scale 之后，使用实际尺寸）
  ctx.font = `16px ${FONTS.serif}`
  const notesLines = wrapText(ctx, data.notes || '今日练习完成', BASE_WIDTH - 40)
  // 完整显示所有笔记，不限制高度
  const notesHeight = notesLines.length * LINE_HEIGHT

  // 动态计算总高度
  // HEADER(100) + 突破徽章(40/20) + 上分隔线(12) + notes + 下间距(12) + 20 + stats(60) + identity(43) + 底部间距(10)
  const breakthroughHeight = data.breakthrough ? 40 : 20
  const contentHeight = HEADER_HEIGHT + breakthroughHeight + 12 + notesHeight + 12 + 20 + 60 + 43 + 10
  const BASE_HEIGHT = contentHeight

  // 重新设置 Canvas 尺寸（考虑缩放）
  canvas.width = BASE_WIDTH * scale
  canvas.height = BASE_HEIGHT * scale

  // 重新应用缩放（因为修改了 canvas 尺寸会重置上下文）
  ctx.scale(scale, scale)

  // 清除画布（透明背景）
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT)

  // 绘制卡片背景（圆角矩形）- 填满整个 Canvas
  const cardX = 0
  const cardY = 0
  const cardWidth = BASE_WIDTH
  const cardHeight = BASE_HEIGHT
  const cornerRadius = 24

  // 先绘制圆角路径并裁剪，确保内容不超出圆角
  ctx.beginPath()
  ctx.moveTo(cornerRadius, 0)
  ctx.lineTo(cardWidth - cornerRadius, 0)
  ctx.quadraticCurveTo(cardWidth, 0, cardWidth, cornerRadius)
  ctx.lineTo(cardWidth, cardHeight - cornerRadius)
  ctx.quadraticCurveTo(cardWidth, cardHeight, cardWidth - cornerRadius, cardHeight)
  ctx.lineTo(cornerRadius, cardHeight)
  ctx.quadraticCurveTo(0, cardHeight, 0, cardHeight - cornerRadius)
  ctx.lineTo(0, cornerRadius)
  ctx.quadraticCurveTo(0, 0, cornerRadius, 0)
  ctx.closePath()

  // 保存路径用于裁剪
  ctx.save()
  ctx.clip()

  // 填充白色背景
  ctx.fillStyle = COLORS.cardBackground
  ctx.fill()

  // 当前绘制位置（从顶部开始，留出边距）
  let currentY = 20

  // === Header 区域 ===
  // 日期 · 类型
  ctx.fillStyle = COLORS.textSecondary
  ctx.font = `12px ${FONTS.serif}`
  ctx.textAlign = 'left'
  ctx.fillText(`${data.date} · ${data.type}`, 20, currentY + 16)
  currentY += 30

  // 时长（大号）
  ctx.fillStyle = COLORS.textPrimary
  ctx.font = `bold 36px ${FONTS.serif}`
  ctx.fillText(`${data.duration}`, 20, currentY + 32)

  // "分钟" 小字
  const durationWidth = ctx.measureText(String(data.duration)).width
  ctx.font = `16px ${FONTS.serif}`
  ctx.fillStyle = COLORS.textSecondary
  ctx.fillText('分钟', 20 + durationWidth + 6, currentY + 28)
  currentY += 50

  // 突破徽章（如果有）
  if (data.breakthrough) {
    ctx.fillStyle = 'rgba(230, 126, 34, 0.1)'
    drawRoundRect(ctx, 20, currentY, 100, 28, 14)
    ctx.fill()

    ctx.fillStyle = COLORS.accentOrange
    ctx.font = `bold 13px ${FONTS.serif}`
    ctx.textAlign = 'center'
    ctx.fillText(data.breakthrough, 70, currentY + 19)
    ctx.textAlign = 'left'
    currentY += 40
  } else {
    currentY += 20
  }

  // 绘制上分隔线
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(20, currentY)
  ctx.lineTo(cardWidth - 20, currentY)
  ctx.stroke()

  // 记录上分隔线位置
  const topLineY = currentY
  // 跳过上线条，准备绘制文案
  currentY += 12

  // === Notes 区域 ===
  ctx.fillStyle = COLORS.textPrimary
  ctx.font = `16px ${FONTS.serif}`

  // 使用之前计算好的换行结果，确保一致
  // 显示所有行（完整内容）
  notesLines.forEach((line, index) => {
    ctx.fillText(line, 20, currentY + index * LINE_HEIGHT)
  })

  currentY += notesLines.length * LINE_HEIGHT + 12

  // 绘制下分隔线（与上线条对称，上下间距相同）
  ctx.strokeStyle = COLORS.border
  ctx.beginPath()
  ctx.moveTo(20, currentY)
  ctx.lineTo(cardWidth - 20, currentY)
  ctx.stroke()
  currentY += 20

  // === Footer Stats 区域 ===
  const statsY = currentY
  const colWidth = (cardWidth - 40) / 3

  // 统计数据
  const stats = [
    { value: data.thisMonthDays, unit: '天', label: '本月熬汤' },
    { value: data.totalCount, unit: '次', label: '累计熬汤' },
    { value: data.totalHours, unit: '小时', label: '累计熬汤时长' },
  ]

  stats.forEach((stat, index) => {
    const centerX = 20 + colWidth * index + colWidth / 2

    // 数值（大号）- 先计算宽度
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = `bold 24px ${FONTS.serif}`
    const valueText = String(stat.value)
    const valueWidth = ctx.measureText(valueText).width

    // 数值右对齐到中心偏左
    ctx.textAlign = 'right'
    ctx.fillText(valueText, centerX - 2, statsY + 22)

    // 单位左对齐到中心偏右
    ctx.font = `13px ${FONTS.serif}`
    ctx.fillStyle = COLORS.textSecondary
    ctx.textAlign = 'left'
    ctx.fillText(stat.unit, centerX + 2, statsY + 20)

    // 标签（最小号）
    ctx.fillStyle = COLORS.textMuted
    ctx.font = `10px ${FONTS.sans}`
    ctx.textAlign = 'center'
    ctx.fillText(stat.label, centerX, statsY + 40)
  })

  ctx.textAlign = 'left'
  currentY = statsY + 60

  // === Footer Identity 区域 ===
  const identityY = currentY

  // 加载并绘制头像
  let avatarX = 20
  const avatarSize = 28

  if (data.profile.avatar) {
    const avatarImg = await loadImage(data.profile.avatar)
    if (avatarImg) {
      // 绘制圆形头像
      drawCircularAvatar(ctx, avatarImg, avatarX, identityY, avatarSize)
    } else {
      // 绘制占位符
      ctx.fillStyle = COLORS.accentOrange
      ctx.beginPath()
      ctx.arc(avatarX + avatarSize / 2, identityY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.font = `bold 12px ${FONTS.sans}`
      ctx.textAlign = 'center'
      ctx.fillText(data.profile.name.charAt(0), avatarX + avatarSize / 2, identityY + avatarSize / 2 + 4)
      ctx.textAlign = 'left'
    }
  } else {
    // 绘制默认头像背景
    ctx.fillStyle = COLORS.accentOrange
    ctx.beginPath()
    ctx.arc(avatarX + avatarSize / 2, identityY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = `bold 12px ${FONTS.sans}`
    ctx.textAlign = 'center'
    ctx.fillText(data.profile.name.charAt(0), avatarX + avatarSize / 2, identityY + avatarSize / 2 + 4)
    ctx.textAlign = 'left'
  }

  // 用户名
  ctx.fillStyle = COLORS.accentOrange
  ctx.font = `bold 14px ${FONTS.serif}`
  ctx.fillText(data.profile.name, avatarX + avatarSize + 8, identityY + 16)

  // 签名（如果有）- 放在用户名下
  if (data.profile.signature) {
    ctx.fillStyle = COLORS.textMuted
    ctx.font = `11px ${FONTS.serif}`
    ctx.fillText(data.profile.signature, avatarX + avatarSize + 8, identityY + 32)
  }

  // 品牌名（右侧，与签名同一行）
  ctx.fillStyle = COLORS.textMuted
  ctx.font = `italic 11px ${FONTS.serif}`
  ctx.textAlign = 'right'
  ctx.fillText('熬汤日记', cardWidth - 20, identityY + 32)
  ctx.textAlign = 'left'

  // 恢复裁剪前的状态
  ctx.restore()

  const endTime = performance.now()
  console.log(`🎨 Canvas 绘制完成，耗时: ${Math.round(endTime - startTime)}ms`)
}

/**
 * 导出图片为 DataURL
 */
export function exportToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png', 1.0)
}

/**
 * 触发图片下载
 */
export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 创建并绘制分享卡片（完整流程）
 */
export async function createShareCard(
  data: ShareCardData,
  options?: DrawOptions,
): Promise<{ success: boolean; dataUrl?: string; duration: number; error?: string }> {
  const startTime = performance.now()

  try {
    // 创建离屏 canvas
    const canvas = document.createElement('canvas')

    // 绘制卡片
    await drawShareCard(canvas, data, options)

    // 导出图片
    const dataUrl = exportToDataURL(canvas)
    const duration = Math.round(performance.now() - startTime)

    return {
      success: true,
      dataUrl,
      duration,
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
