import { readFileSync } from 'node:fs'

const checks = [
  {
    file: 'app/layout.tsx',
    requiredText: [
      '熬汤日记 - 阿斯汤加瑜伽练习记录与打卡工具',
      '免费在线记录阿斯汤加瑜伽练习',
      '熬汤日记,阿斯汤加,Ashtanga',
    ],
  },
  {
    file: 'app/page.tsx',
    requiredText: [
      '熬汤日记',
      '开始练习',
      '呼吸',
      '觉察',
      '练汤人的专属APP',
    ],
  },
  {
    file: 'README.md',
    requiredText: [
      '阿斯汤加打卡app',
      '一个专注阿斯汤加瑜伽打卡和身体觉察的记录工具',
    ],
  },
]

const errors = []

for (const check of checks) {
  const content = readFileSync(check.file, 'utf8')

  if (content.includes('\uFFFD')) {
    errors.push(`${check.file}: contains Unicode replacement characters`)
  }

  for (const text of check.requiredText) {
    if (!content.includes(text)) {
      errors.push(`${check.file}: missing expected text "${text}"`)
    }
  }
}

if (errors.length > 0) {
  console.error('Lightweight lint failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Lightweight lint passed: key user-facing copy is readable.')
