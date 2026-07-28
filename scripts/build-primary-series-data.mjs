import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourcePath = path.join(root, 'output/primary-series-assets/materials-index.csv')
const targetPath = path.join(root, 'lib/pose-data.ts')

const SECTION_NAMES = {
  'surya-a': '拜日 A',
  'surya-b': '拜日 B',
  standing: '站立体式',
  seated: '坐立体式',
  finishing: '结束体式',
}

const NAME_MAP = {
  'SURYA NAMASKARA A': ['拜日 A', 'Sūrya Namaskāra A', ['拜日式 A']],
  'SURYA NAMASKARA B': ['拜日 B', 'Sūrya Namaskāra B', ['拜日式 B']],
  PADANGUSTHASANA: ['手抓大脚趾式', 'Padangusthasana', []],
  PADAHASTASANA: ['手压脚掌式', 'Padahastasana', ['手在脚下式']],
  TRIKONASANA: ['三角伸展式', 'Trikonasana', ['三角式']],
  PARSVAKONASANA: ['侧角伸展式', 'Parsvakonasana', ['侧角式']],
  'PRASARITA PADHOTTANASANA': ['双角式', 'Prasarita Padottanasana', ['宽腿前屈式']],
  PARSVOTTANASANA: ['加强侧伸展式', 'Parsvottanasana', ['侧伸展式']],
  'UTTHITA HASTA PADANGUSTHASANA': ['单腿手抓大脚趾式', 'Utthita Hasta Padangusthasana', ['单腿站立伸展式']],
  'ARDHA BADDHA PADMOTTANASANA': ['半莲花加强前屈式', 'Ardha Baddha Padmottanasana', ['半束莲花站立前屈式']],
  UTKATASANA: ['幻椅式', 'Utkatasana', ['椅子式']],
  VIRABADRASANA: ['战士式', 'Virabhadrasana', ['勇士式']],
  DANDASANA: ['手杖式', 'Dandasana', ['坐山式']],
  PASCHIMOTTANASANA: ['坐立前屈式', 'Paschimottanasana', ['背部伸展式']],
  PURVOTTANASANA: ['反台式', 'Purvottanasana', ['东面伸展式']],
  'ARDHA BADDHA PADMA PASCHIMOTTANASANA': ['半束莲花坐立前屈式', 'Ardha Baddha Padma Paschimottanasana', []],
  'TRIANG MUKHA EKA PADA PASCHIMOTTANASANA': ['单腿折叠坐立前屈式', 'Trianga Mukhaikapada Paschimottanasana', []],
  'JANU SIRSASANA': ['单腿头碰膝式', 'Janu Sirsasana', ['头碰膝式']],
  MARICHYASANA: ['圣哲马里奇式', 'Marichyasana', ['马里奇式']],
  NAVASANA: ['船式', 'Navasana', []],
  BUJAPIDASANA: ['肩压式', 'Bhujapidasana', ['双臂支撑式']],
  KURMASANA: ['龟式', 'Kurmasana', []],
  'SUPTA KURMASANA': ['睡龟式', 'Supta Kurmasana', ['卧龟式']],
  'GARBHA PINDASANA': ['胎儿式', 'Garbha Pindasana', ['胎藏式']],
  KUKKUTASANA: ['公鸡式', 'Kukkutasana', []],
  BADDHAKONASANA: ['束角式', 'Baddha Konasana', []],
  'UPAVISTHA KONASANA': ['坐角式', 'Upavistha Konasana', []],
  'SUPTA KONASANA': ['仰卧角式', 'Supta Konasana', []],
  'SUPTA PADANGUSTHASANA': ['仰卧手抓大脚趾式', 'Supta Padangusthasana', []],
  'UBHAYA PADANGUSTHASANA': ['双手抓大脚趾式', 'Ubhaya Padangusthasana', []],
  'URDVA MUKHA PASCHIMOTTANASANA': ['向上坐立前屈式', 'Urdhva Mukha Paschimottanasana', []],
  'SETU BANDHASANA': ['桥式', 'Setu Bandhasana', ['桥锁式']],
  'URDVA DANURASANA': ['轮式', 'Urdhva Dhanurasana', ['上弓式']],
  SARVANGASANA: ['肩倒立式', 'Sarvangasana', []],
  HALASANA: ['犁式', 'Halasana', []],
  KARNAPIDASANA: ['膝碰耳式', 'Karnapidasana', ['耳压膝式']],
  'URDVA PADMASANA': ['倒立莲花式', 'Urdhva Padmasana', ['向上莲花式']],
  PINDASANA: ['胎儿收束式', 'Pindasana', ['团身式']],
  MATSYASANA: ['鱼式', 'Matsyasana', []],
  'UTTANA PADASANA': ['伸展腿式', 'Uttana Padasana', ['上举腿式']],
  SIRSASANA: ['头倒立式', 'Sirsasana', []],
  'BADDHA PADMASANA': ['束莲花式', 'Baddha Padmasana', []],
  'YOGA MUDRA': ['瑜伽身印', 'Yoga Mudra', ['瑜伽印式']],
  PADMASANA: ['莲花式', 'Padmasana', []],
  UTPLUTHIH: ['上提式', 'Utpluthih', ['上提莲花式']],
  SAVASANA: ['休息术', 'Savasana', ['挺尸式', '大休息']],
}

const SURYA_STEPS = {
  'surya-a/surya-a-01.png': ['Samasthitiḥ', '山式（准备）', '准备', '鼻尖', 'nāsāgre'],
  'surya-a/surya-a-02.png': ['Ekam', '双臂上举', '吸气', '拇指', 'aṅguṣṭhamadhye'],
  'surya-a/surya-a-03.png': ['Dve', '站立前屈', '呼气', '鼻尖', 'nāsāgre'],
  'surya-a/surya-a-04.png': ['Trīṇi', '半前屈', '吸气', '眉心', 'bhrūmadhye'],
  'surya-a/surya-a-05.png': ['Catvāri', '四柱支撑', '呼气', '鼻尖', 'nāsāgre'],
  'surya-a/surya-a-06.png': ['Pañca', '上犬式', '吸气', '眉心', 'bhrūmadhye'],
  'surya-a/surya-a-07.png': ['Ṣaṭ', '下犬式', '呼气，停留 5 次呼吸', '肚脐', 'nābhicakre'],
  'surya-a/surya-a-08.png': ['Sapta', '半前屈', '吸气', '眉心', 'bhrūmadhye'],
  'surya-a/surya-a-09.png': ['Aṣṭau', '站立前屈', '呼气', '鼻尖', 'nāsāgre'],
  'surya-a/surya-a-10.png': ['Nava', '双臂上举', '吸气', '拇指', 'aṅguṣṭhamadhye'],
  'surya-a/surya-a-11.png': ['Samasthitiḥ', '山式', '呼气', '鼻尖', 'nāsāgre'],
  'surya-b/surya-b-01.png': ['Samasthitiḥ', '山式（准备）', '准备', '鼻尖', 'nāsāgre'],
  'surya-b/surya-b-02.png': ['Ekam', '幻椅式', '吸气', '拇指', 'aṅguṣṭhamadhye'],
  'surya-b/surya-b-03.png': ['Dve', '站立前屈', '呼气', '鼻尖', 'nāsāgre'],
  'surya-b/surya-b-04.png': ['Trīṇi', '半前屈', '吸气', '眉心', 'bhrūmadhye'],
  'surya-b/surya-b-05.png': ['Catvāri', '四柱支撑', '呼气', '鼻尖', 'nāsāgre'],
  'surya-b/surya-b-06.png': ['Pañca', '上犬式', '吸气', '眉心', 'bhrūmadhye'],
  'surya-b/surya-b-07.png': ['Ṣaṭ', '下犬式', '呼气', '肚脐', 'nābhicakre'],
  'surya-b/surya-b-08.png': ['Sapta', '战士一式（右侧）', '吸气', '拇指', 'aṅguṣṭhamadhye'],
  'surya-b/surya-b-09.png': ['Aṣṭau', '四柱支撑', '呼气', '鼻尖', 'nāsāgre'],
  'surya-b/surya-b-10.png': ['Nava', '上犬式', '吸气', '眉心', 'bhrūmadhye'],
  'surya-b/surya-b-11.png': ['Daśa', '下犬式', '呼气', '肚脐', 'nābhicakre'],
  'surya-b/surya-b-12.png': ['Ekādaśa', '战士一式（左侧）', '吸气', '拇指', 'aṅguṣṭhamadhye'],
  'surya-b/surya-b-13.png': ['Dvādaśa', '四柱支撑', '呼气', '鼻尖', 'nāsāgre'],
  'surya-b/surya-b-14.png': ['Trayodaśa', '上犬式', '吸气', '眉心', 'bhrūmadhye'],
  'surya-b/surya-b-15.png': ['Caturdaśa', '下犬式', '呼气，停留 5 次呼吸', '肚脐', 'nābhicakre'],
  'surya-b/surya-b-16.png': ['Pañcadaśa', '半前屈', '吸气', '眉心', 'bhrūmadhye'],
  'surya-b/surya-b-17.png': ['Ṣoḍaśa', '站立前屈', '呼气', '鼻尖', 'nāsāgre'],
  'surya-b/surya-b-18.png': ['Saptadaśa', '幻椅式', '吸气', '拇指', 'aṅguṣṭhamadhye'],
  'surya-b/surya-b-19.png': ['Samasthitiḥ', '山式', '呼气', '鼻尖', 'nāsāgre'],
}

const csv = await fs.readFile(sourcePath, 'utf8')
const rows = csv.trim().split(/\r?\n/).slice(1).map(line => {
  const [filename, displayName, section, order, marker = ''] = line.split(',')
  if (!NAME_MAP[displayName]) throw new Error(`Missing name mapping: ${displayName}`)
  return { filename, displayName, section, order: Number(order), marker }
})

if (rows.length !== 94) throw new Error(`Expected 94 poses, found ${rows.length}`)

const rawRows = rows.map(row =>
  `  ['${row.filename}', '${row.displayName}', '${row.section}', ${row.order}, '${row.marker}'],`
).join('\n')

const names = Object.entries(NAME_MAP).map(([source, [zh, sanskrit, aliases]]) =>
  `  '${source}': { zh: '${zh}', sanskrit: '${sanskrit}', aliases: ${JSON.stringify(aliases)} },`
).join('\n')

const suryaSteps = Object.entries(SURYA_STEPS).map(([source, [count, cueName, breath, drishti, drishtiSanskrit]]) =>
  `  '${source}': { count: '${count}', cueName: '${cueName}', breath: '${breath}', drishti: '${drishti}', drishtiSanskrit: '${drishtiSanskrit}' },`
).join('\n')

const sections = Object.entries(SECTION_NAMES).map(([id, name]) =>
  `  { id: '${id}', name: '${name}' },`
).join('\n')

const output = `export type PoseSectionId = 'surya-a' | 'surya-b' | 'standing' | 'seated' | 'finishing'

export interface Pose {
  id: string
  name: string
  sanskrit: string
  aliases: string[]
  section: PoseSectionId
  order: number
  marker: string
  sourceFilename: string
  image: string
  thumbnail: string
  cueName?: string
  breath?: string
  drishti?: string
  drishtiSanskrit?: string
  assetStatus: 'generated' | 'needs-regeneration' | 'approved'
  instructionStatus: 'pending' | 'approved'
}

export interface PoseSection {
  id: PoseSectionId
  name: string
}

export const POSE_SECTIONS: PoseSection[] = [
${sections}
]

const NAMES: Record<string, { zh: string; sanskrit: string; aliases: string[] }> = {
${names}
}

const SURYA_STEPS: Record<string, { count: string; cueName: string; breath: string; drishti: string; drishtiSanskrit: string }> = {
${suryaSteps}
}

const RAW_POSES: Array<[string, string, PoseSectionId, number, string]> = [
${rawRows}
]

export const POSES: Pose[] = RAW_POSES.map(([sourceFilename, sourceName, section, order, marker]) => {
  const names = NAMES[sourceName]
  const basename = sourceFilename.split('/').pop()?.replace(/\\.png$/, '') ?? sourceFilename
  const suryaStep = SURYA_STEPS[sourceFilename]
  const name = suryaStep?.count ?? (marker ? \`\${names.zh} · \${marker}\` : names.zh)
  const publicBase = \`/poses/primary-series-ip-v1/\${sourceFilename.replace(/\\.png$/, '')}\`

  return {
    id: \`\${section}-\${basename}\`,
    name,
    sanskrit: suryaStep ? names.sanskrit : (marker ? \`\${names.sanskrit} · \${marker}\` : names.sanskrit),
    aliases: suryaStep ? [...names.aliases, suryaStep.cueName] : names.aliases,
    section,
    order,
    marker,
    sourceFilename,
    image: \`\${publicBase}.webp\`,
    thumbnail: \`\${publicBase}-thumb.webp\`,
    cueName: suryaStep?.cueName,
    breath: suryaStep?.breath,
    drishti: suryaStep?.drishti,
    drishtiSanskrit: suryaStep?.drishtiSanskrit,
    assetStatus: 'generated',
    instructionStatus: suryaStep ? 'approved' : 'pending',
  }
})
`

await fs.writeFile(targetPath, output, 'utf8')
console.log(`Generated ${rows.length} pose records at ${targetPath}`)
