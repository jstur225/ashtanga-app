import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const handbookPath = path.join(
  root,
  '..',
  '02-学习课题',
  '瑜伽玛拉 180',
  '瑜伽玛拉_完整参考手册_v2.md',
)
const outputPath = path.join(root, 'lib', 'finishing-instructions.ts')

const poseFiles = [
  'sarvangasana.png',
  'halasana.png',
  'karnapidasana.png',
  'urdhva-padmasana.png',
  'pindasana.png',
  'matsyasana.png',
  'uttana-padasana.png',
  'sirsasana-01.png',
  'sirsasana-02.png',
  'baddha-padmasana.png',
  'padmasana.png',
  'utpluthih.png',
  'savasana.png',
]

const drishtiSanskritByChinese = new Map([
  ['\u9f3b\u5c16', 'nāsāgre'],
  ['\u811a\u8dbe', 'pādayoragre'],
  ['\u624b\u6307', 'hastāgre'],
  ['\u62c7\u6307', 'aṅguṣṭhamadhye'],
  ['\u4fa7\u8fb9', 'pārśva'],
  ['\u7709\u5fc3', 'bhrūmadhye'],
  ['\u809a\u8110', 'nābhicakre'],
  ['\u2014', ''],
])

function stripMarkdown(value) {
  return value
    .replaceAll('**', '')
    .replaceAll('`', '')
    .replace(/<br\s*\/?\s*>/gi, '\uff1b')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseTableRow(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null
  if (/^\|\s*-+/.test(trimmed)) return null
  const cells = trimmed
    .slice(1, -1)
    .split('|')
    .map(cell => cell.trim())
  if (cells.length < 3) return null
  if (cells[0] === 'V') return null
  return {
    rawCount: cells[0],
    rawBreath: cells[1],
    rawAction: cells.slice(2).join('|'),
  }
}

function parseHeadingTitle(title) {
  const match = title.match(/^(.+?)\s+([A-Z][\s\S]*)$/)
  if (!match) return { cueName: title.trim(), sanskrit: title.trim() }
  return {
    cueName: match[1].trim(),
    sanskrit: match[2].trim(),
  }
}

function getSections(markdown) {
  const headings = [...markdown.matchAll(/^## (\d+)\. ([^\n]+)$/gm)]
  return new Map(headings.map((heading, index) => {
    const start = heading.index + heading[0].length + 1
    const end = headings[index + 1]?.index ?? markdown.length
    return [Number(heading[1]), {
      title: heading[2],
      body: markdown.slice(start, end),
    }]
  }))
}

function parseSection(number, sections) {
  const section = sections.get(number)
  if (!section) throw new Error(`Missing handbook section ${number}`)

  const { cueName, sanskrit } = parseHeadingTitle(section.title)
  const body = section.body
  const metaLine = body.split('\n').find(line => /^V\s*=/.test(line) && line.includes('|'))
  if (!metaLine) throw new Error(`Missing V/drishti metadata in section ${number}`)

  const vinyasaCountMatch = metaLine.match(/V\s*=\s*(\d+)/)
  const vinyasaCount = vinyasaCountMatch ? Number(vinyasaCountMatch[1]) : undefined
  const drishti = metaLine.split('|').slice(1).join('|').replace(/^[^:：]*[:：]\s*/, '').trim()
  const holdRegex = new RegExp('^\\u2192\\s*\\u505c\\u7559\\s*(\\d+)\\s*\\u4e2a\\u547c\\u5438')
  const steps = []

  for (const line of body.split('\n')) {
    const row = parseTableRow(line)
    if (!row) continue

    const action = stripMarkdown(row.rawAction)
    if (!action) continue

    const holdMatch = action.match(holdRegex)
    if (holdMatch && steps.length > 0) {
      steps[steps.length - 1].holdBreaths = Number(holdMatch[1])
      steps[steps.length - 1].isAsana = true
      continue
    }

    const isAsana = row.rawCount.includes('**') || row.rawAction.includes('**')
    const count = stripMarkdown(row.rawCount) || '\u2014'
    const breath = stripMarkdown(row.rawBreath) || '\u2014'
    steps.push({
      count,
      breath,
      action,
      ...(isAsana ? { isAsana: true } : {}),
    })
  }

  if (steps.length === 0) throw new Error(`No steps parsed in section ${number}`)

  return {
    sanskrit,
    cueName,
    aliases: [],
    ...(vinyasaCount === undefined ? {} : { vinyasaCount }),
    drishti,
    drishtiSanskrit: drishtiSanskritByChinese.get(drishti) ?? '',
    steps,
  }
}

const markdown = await fs.readFile(handbookPath, 'utf8')
const sections = getSections(markdown)
const entries = poseFiles.map((file, index) => {
  const sectionNumber = 54 + index
  return [`finishing/${file}`, parseSection(sectionNumber, sections)]
})

const source = `import type { StandingInstruction } from './pose-instructions'

// Generated from the handbook: chapters 54-66.
// Run: node scripts/extract-finishing-handbook-instructions.mjs
export const FINISHING_INSTRUCTIONS: Record<string, StandingInstruction> = ${JSON.stringify(Object.fromEntries(entries), null, 2)}
`

await fs.writeFile(outputPath, source)
console.log(`Wrote ${entries.length} finishing instructions to ${path.relative(root, outputPath)}`)
