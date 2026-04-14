#!/usr/bin/env node

/**
 * 激活码生成脚本
 *
 * 使用方法:
 *   node scripts/generate-codes.js --type=quarter --count=100
 *   node scripts/generate-codes.js --type=year --count=50
 *   node scripts/generate-codes.js --type=quarter --count=10 --expires=2025-12-31
 *
 * 选项:
 *   --type     会员类型: quarter(季卡90天) 或 year(年卡365天)
 *   --count    生成数量
 *   --expires  激活码有效期(可选,格式: YYYY-MM-DD)
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    type: null,
    count: null,
    expires: null
  }

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1]
    } else if (arg.startsWith('--count=')) {
      options.count = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--expires=')) {
      options.expires = arg.split('=')[1]
    }
  }

  return options
}

// 生成随机激活码 (格式: XXXX-XXXX-XXXX)
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除易混淆字符: I,1,O,0
  const segments = []

  for (let i = 0; i < 3; i++) {
    let segment = ''
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    segments.push(segment)
  }

  return segments.join('-')
}

// 验证参数
function validateArgs(options) {
  if (!options.type || !['quarter', 'year'].includes(options.type)) {
    console.error('错误: --type 必须是 quarter 或 year')
    process.exit(1)
  }

  if (!options.count || options.count < 1 || options.count > 10000) {
    console.error('错误: --count 必须是 1-10000 之间的数字')
    process.exit(1)
  }

  if (options.expires) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(options.expires)) {
      console.error('错误: --expires 格式必须是 YYYY-MM-DD')
      process.exit(1)
    }
  }
}

// 主函数
async function main() {
  const options = parseArgs()

  console.log('========================================')
  console.log('       会员激活码生成工具')
  console.log('========================================')
  console.log()

  // 显示帮助
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('使用方法:')
    console.log('  node scripts/generate-codes.js --type=<quarter|year> --count=<数量> [--expires=<YYYY-MM-DD>]')
    console.log()
    console.log('选项:')
    console.log('  --type     会员类型: quarter(季卡90天) 或 year(年卡365天)')
    console.log('  --count    生成数量 (1-10000)')
    console.log('  --expires  激活码有效期 (可选,格式: YYYY-MM-DD)')
    console.log()
    console.log('示例:')
    console.log('  node scripts/generate-codes.js --type=quarter --count=100')
    console.log('  node scripts/generate-codes.js --type=year --count=50 --expires=2025-12-31')
    process.exit(0)
  }

  validateArgs(options)

  // 检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('错误: 缺少 Supabase 环境变量')
    console.error('请确保设置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // 连接 Supabase
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const durationDays = options.type === 'quarter' ? 90 : 365
  const expiresAt = options.expires ? `${options.expires}T23:59:59Z` : null

  console.log(`会员类型: ${options.type === 'quarter' ? '季卡 (90天)' : '年卡 (365天)'}`)
  console.log(`生成数量: ${options.count}`)
  if (expiresAt) {
    console.log(`码有效期: ${options.expires}`)
  }
  console.log()

  // 生成并插入激活码
  const codes = []
  const batchSize = 100
  let successCount = 0
  let duplicateCount = 0

  console.log('正在生成激活码...')

  for (let i = 0; i < options.count; i++) {
    const code = generateCode()
    codes.push({
      code,
      type: options.type,
      duration_days: durationDays,
      expires_at: expiresAt
    })

    // 批量插入
    if (codes.length >= batchSize || i === options.count - 1) {
      const { data, error } = await supabase
        .from('activation_codes')
        .insert(codes)
        .select('code')

      if (error) {
        // 检查是否是唯一性冲突
        if (error.message?.includes('unique constraint') || error.code === '23505') {
          duplicateCount += codes.length
          console.log(`  批次插入失败: 检测到 ${codes.length} 个重复码，将单独处理`)

          // 逐个尝试插入
          for (const codeData of codes) {
            const { error: singleError } = await supabase
              .from('activation_codes')
              .insert(codeData)

            if (singleError) {
              duplicateCount++
            } else {
              successCount++
            }
          }
        } else {
          console.error('插入错误:', error)
        }
      } else {
        successCount += codes.length
      }

      codes.length = 0 // 清空数组
      process.stdout.write(`\r  进度: ${Math.min(i + 1, options.count)}/${options.count}`)
    }
  }

  console.log()
  console.log()
  console.log('========================================')
  console.log('生成完成!')
  console.log(`成功: ${successCount} 个`)
  if (duplicateCount > 0) {
    console.log(`跳过(重复): ${duplicateCount} 个`)
  }
  console.log('========================================')
}

main().catch(err => {
  console.error('脚本错误:', err)
  process.exit(1)
})
