import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const outputDir = path.join(root, 'output', 'primary-series-ip-v3', 'seated', 'review')
const seatedReferenceDir = path.join(root, 'output', 'primary-series-assets', 'seated')
const finishingReferenceDir = path.join(root, 'output', 'primary-series-assets', 'finishing')
const seatedV1Dir = path.join(root, 'output', 'primary-series-ip-v1', 'masters', 'seated')
const finishingV1Dir = path.join(root, 'output', 'primary-series-ip-v1', 'masters', 'finishing')
const generatedDir = path.join(root, 'output', 'primary-series-ip-v3', 'seated', 'generated')

const retained = (order, file, name) => ({
  order,
  file,
  name,
  status: '保留现有图',
  source: path.join(seatedV1Dir, file),
  reference: path.join(seatedReferenceDir, file),
})

const candidate = (order, file, name, batch, input, status = '待人工核对') => ({
  order,
  file,
  name,
  status,
  source: path.join(generatedDir, `batch-${batch}`, 'normalized', input),
  reference: path.join(seatedReferenceDir, file),
})

const supplied = (order, file, name, input) => ({
  order,
  file,
  name,
  status: '用户补图',
  source: path.join(generatedDir, 'user-supplied', 'normalized', input),
  reference: path.join(seatedReferenceDir, file),
})

const finishing = (order, file, name) => ({
  order,
  file,
  name,
  status: '保留现有图',
  source: path.join(finishingV1Dir, file),
  reference: path.join(finishingReferenceDir, file),
})

const poses = [
  retained(1, 'dandasana.png', 'Dandasana'),
  retained(2, 'paschimottanasana-a.png', 'Paschimattanasana (1)'),
  candidate(3, 'paschimottanasana-b.png', 'Paschimattanasana (2)', '01', '03-paschimottanasana-b-transparent-v1.png', '用户已确认'),
  supplied(4, 'paschimottanasana-c.png', 'Paschimattanasana (3)', '04-paschimottanasana-c-transparent-v1.png'),
  supplied(5, 'purvottanasana.png', 'Purvatanasana', '05-purvottanasana-transparent-v1.png'),
  supplied(6, 'ardha-baddha-padma-paschimottanasana.png', 'Ardha Baddha Padma Paschimattanasana', '06-ardha-baddha-padma-paschimottanasana-transparent-v1.png'),
  candidate(7, 'triang-mukha-eka-pada-paschimottanasana.png', 'Triyang Mukha Eka Pada Paschimattanasana', '02', '07-triang-mukha-eka-pada-paschimottanasana-transparent-v1.png'),
  candidate(8, 'janu-sirsasana-a.png', 'Janu Shirshasana A', '01', '08-janu-sirsasana-a-transparent-v1.png', '用户已确认'),
  candidate(9, 'janu-sirsasana-b.png', 'Janu Shirshasana B', '02', '09-janu-sirsasana-b-transparent-v1.png'),
  candidate(10, 'janu-sirsasana-c.png', 'Janu Shirshasana C', '03', '10-janu-sirsasana-c-transparent-v1.png'),
  retained(11, 'marichyasana-a.png', 'Marichyasana A'),
  supplied(12, 'marichyasana-b.png', 'Marichyasana B', '12-marichyasana-b-transparent-v1.png'),
  retained(13, 'marichyasana-c.png', 'Marichyasana C'),
  supplied(14, 'marichyasana-d.png', 'Marichyasana D', '14-marichyasana-d-transparent-v1.png'),
  retained(15, 'navasana.png', 'Navasana'),
  supplied(16, 'bhujapidasana-02.png', 'Bhujapidasana', '16-bhujapidasana-02-transparent-v1.png'),
  retained(17, 'kurmasana.png', 'Kurmasana'),
  candidate(18, 'supta-kurmasana.png', 'Supta Kurmasana', '03', '18-supta-kurmasana-transparent-v1.png'),
  supplied(19, 'garbha-pindasana.png', 'Garbha Pindasana', '19-garbha-pindasana-transparent-v1.png'),
  candidate(20, 'kukkutasana.png', 'Kukkutasana', '04', '20-kukkutasana-transparent-v1.png'),
  supplied(21, 'baddha-konasana-a.png', 'Baddha Konasana (1)', '21-baddha-konasana-a-transparent-v1.png'),
  supplied(22, 'baddha-konasana-b.png', 'Baddha Konasana (2)', '22-baddha-konasana-b-transparent-v1.png'),
  retained(23, 'upavishta-konasana-01.png', 'Upavishta Konasana (1)'),
  retained(24, 'upavishta-konasana-02.png', 'Upavishta Konasana (2)'),
  supplied(25, 'supta-konasana-01.png', 'Supta Konasana (1)', '25-supta-konasana-01-transparent-v1.png'),
  retained(26, 'supta-konasana-02.png', 'Supta Konasana (2)'),
  retained(27, 'supta-padangusthasana-01.png', 'Supta Padangushtasana (1)'),
  retained(28, 'supta-padangusthasana-02.png', 'Supta Padangushtasana (2)'),
  retained(29, 'ubhaya-padangusthasana-02.png', 'Ubhaya Padangushtasana'),
  retained(30, 'urdhva-mukha-paschimottanasana-02.png', 'Urdhva Mukha Paschimattanasana'),
  supplied(31, 'setu-bandhasana.png', 'Setu Bandhasana', '31-setu-bandhasana-transparent-v1.png'),
  finishing(32, 'urdhva-dhanurasana.png', 'Urdhva Dhanurasana'),
  {
    ...supplied(33, 'paschimottanasana.png', 'Paschimattanasana', '33-paschimottanasana-transparent-v1.png'),
    reference: path.join(finishingReferenceDir, 'paschimottanasana.png'),
  },
]

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

await fs.mkdir(outputDir, { recursive: true })

const imageSize = 230
const captionHeight = 70
const cellWidth = imageSize * 2
const cellHeight = imageSize + captionHeight
const columns = 4
const background = '#F9F7F2'

async function renderImage(input) {
  return sharp(input)
    .resize(imageSize, imageSize, { fit: 'contain', background })
    .flatten({ background })
    .png()
    .toBuffer()
}

function statusColor(status) {
  if (status === '用户已确认' || status === '用户补图') return '#2A6B50'
  if (status === '待重做') return '#B5483C'
  return '#6E706A'
}

async function makeTile(pose) {
  const [reference, current] = await Promise.all([
    renderImage(pose.reference),
    renderImage(pose.source),
  ])
  const caption = Buffer.from(`
    <svg width="${cellWidth}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#FFFFFF"/>
      <text x="${cellWidth / 2}" y="24" text-anchor="middle" font-family="Arial, Microsoft YaHei, sans-serif" font-size="15" font-weight="700" fill="#2A4B3C">${escapeXml(`${String(pose.order).padStart(2, '0')} ${pose.name}`)}</text>
      <text x="${imageSize / 2}" y="51" text-anchor="middle" font-family="Arial, Microsoft YaHei, sans-serif" font-size="11" fill="#6E706A">动作参考</text>
      <text x="${imageSize + imageSize / 2}" y="51" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="12" font-weight="600" fill="${statusColor(pose.status)}">${escapeXml(pose.status)}</text>
    </svg>
  `)
  return sharp({
    create: { width: cellWidth, height: cellHeight, channels: 3, background },
  }).composite([
    { input: reference, left: 0, top: 0 },
    { input: current, left: imageSize, top: 0 },
    { input: caption, left: 0, top: imageSize },
  ]).png().toBuffer()
}

const tiles = await Promise.all(poses.map(makeTile))
const rows = Math.ceil(tiles.length / columns)
const output = path.join(outputDir, 'seated-v3-overall-contact-sheet.png')
await sharp({
  create: {
    width: cellWidth * columns,
    height: cellHeight * rows,
    channels: 3,
    background,
  },
}).composite(tiles.map((input, index) => ({
  input,
  left: (index % columns) * cellWidth,
  top: Math.floor(index / columns) * cellHeight,
}))).png().toFile(output)

const manifest = poses.map(({ order, file, name, status, source, reference }) => ({
  order,
  file,
  name,
  status,
  source: path.relative(root, source).replaceAll('\\', '/'),
  reference: path.relative(root, reference).replaceAll('\\', '/'),
}))
await fs.writeFile(
  path.join(outputDir, 'seated-v3-overall-status.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
)

console.log(output)
console.log(`Rendered ${poses.length} seated poses in handbook order`)
