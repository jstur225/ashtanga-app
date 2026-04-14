#!/usr/bin/env node

/**
 * 未使用激活码导出脚本
 *
 * 使用方法:
 *   node scripts/export-codes.js                    # 导出所有未使用的码
 *   node scripts/export-codes.js --type=quarter     # 只导出季卡
 *   node scripts/export-codes.js --type=year        # 只导出年卡
 *   node scripts/export-codes.js --output=codes.txt # 指定输出文件
 *
 * 选项:
 *   --type     会员类型: quarter(季卡) 或 year(年卡)
 *   --output   输出文件路径 (默认: unused-codes-<timestamp>.txt)
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    type: null,
    output: null
  }

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1]
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1]
    }
  }

  return options
}

// 主函数
async function main() {
  const options = parseArgs()

  console.log('========================================')
  console.log('       未使用激活码导出工具')
  console.log('========================================')
  console.log()

  // 显示帮助
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('使用方法:')
    console.log('  node scripts/export-codes.js [--type=<quarter|year>] [--output=<文件路径>]')
    console.log()
    console.log('选项:')
    console.log('  --type     会员类型: quarter(季卡) 或 year(年卡)')
    console.log('  --output   输出文件路径 (默认: unused-codes-<timestamp>.txt)')
    console.log()
    console.log('示例:')
    console.log('  node scripts/export-codes.js')
    console.log('  node scripts/export-codes.js --type=quarter')
    console.log('  node scripts/export-codes.js --type=year --output=year-codes.txt')
    process.exit(0)
  }

  // 验证参数
  if (options.type && !['quarter', 'year'].includes(options.type)) {
    console.error('错误: --type 必须是 quarter 或 year')
    process.exit(1)
  }

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

  console.log('正在查询未使用的激活码...')

  // 构建查询
  let query = supabase
    .from('activation_codes')
    .select('code, type, duration_days, expires_at, created_at')
    .eq('used', false)

  if (options.type) {
    query = query.eq('type', options.type)
  }

  const { data: codes, error } = await query.order('created_at', { ascending: true })

  if (error) {
    console.error('查询错误:', error)
    process.exit(1)
  }

  if (!codes || codes.length === 0) {
    console.log('没有找到未使用的激活码')
    process.exit(0)
  }

  // 按类型分组
  const quarterCodes = codes.filter(c => c.type === 'quarter')
  const yearCodes = codes.filter(c => c.type === 'year')

  console.log()
  console.log('查询结果:')
  console.log(`  季卡 (90天): ${quarterCodes.length} 个`)
  console.log(`  年卡 (365天): ${yearCodes.length} 个`)
  console.log(`  总计: ${codes.length} 个`)
  console.log()

  // 生成输出内容
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outputFile = options.output || `unused-codes-${timestamp}.txt`

  let content = `未使用激活码导出\n`
  content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`
  content += `========================================\n\n`

  if (quarterCodes.length > 0) {
    content += `【季卡 - ${quarterCodes.length}个】\n`
    content += `格式: XXXX-XXXX-XXXX (90天会员)\n`
    content += `----------------------------------------\n`
    quarterCodes.forEach((code, index) => {
      content += `${index + 1}. ${code.code}\n`
    })
    content += `\n`
  }

  if (yearCodes.length > 0) {
    content += `【年卡 - ${yearCodes.length}个】\n`
    content += `格式: XXXX-XXXX-XXXX (365天会员)\n`
    content += `----------------------------------------\n`
    yearCodes.forEach((code, index) => {
      content += `${index + 1}. ${code.code}\n`
    })
    content += `\n`
  }

  content += `========================================\n`
  content += `注意: 请妥善保管激活码，避免泄露\n`

  // 写入文件
  const outputPath = path.resolve(outputFile)
  fs.writeFileSync(outputPath, content, 'utf-8')

  console.log(`已导出到: ${outputPath}`)
  console.log()
  console.log('导出摘要:')
  console.log(`  文件: ${outputFile}`)
  console.log(`  路径: ${outputPath}`)
  console.log(`  总计: ${codes.length} 个激活码`)
  console.log('========================================')
}

main().catch(err => {
  console.error('脚本错误:', err)
  process.exit(1)
})
