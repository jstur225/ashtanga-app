import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const inputDir = path.join(root, 'output', 'primary-series-ip-v3', 'standing', 'aligned-full')
const outputDir = path.join(root, 'output', 'primary-series-ip-v3', 'standing', 'contact-sheets')
const output = path.join(outputDir, 'standing-v3-review-numbered.png')

const poses = [
  ['padangusthasana.png', '手抓大脚趾式'],
  ['padahastasana.png', '手压脚掌式'],
  ['trikonasana-01.png', '三角伸展式'],
  ['trikonasana-02.png', '扭转三角式'],
  ['parsvakonasana-01.png', '侧角伸展式'],
  ['parsvakonasana-02.png', '扭转侧角式'],
  ['prasarita-padottanasana-a.png', '双角式 A'],
  ['prasarita-padottanasana-b.png', '双角式 B'],
  ['prasarita-padottanasana-c.png', '双角式 C'],
  ['prasarita-padottanasana-d.png', '双角式 D'],
  ['parsvottanasana.png', '加强侧伸展式'],
  ['utthita-hasta-padangusthasana-01.png', '单腿手抓大脚趾式'],
  ['utthita-hasta-padangusthasana-02.png', '单腿侧伸展式'],
  ['utthita-hasta-padangusthasana-03.png', '单腿前伸式'],
  ['ardha-baddha-padmottanasana.png', '半莲花加强前屈式'],
  ['utkatasana.png', '幻椅式'],
  ['virabhadrasana-1.png', '战士一式'],
  ['virabhadrasana-2.png', '战士二式'],
]

const columns = 3
const tileWidth = 680
const imageSize = 600
const captionHeight = 130
const headerHeight = 150
const rows = Math.ceil(poses.length / columns)
const width = tileWidth * columns
const height = headerHeight + rows * (imageSize + captionHeight)
const background = '#F9F7F2'

const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

const composites = []
for (let index = 0; index < poses.length; index += 1) {
  const [file, chinese] = poses[index]
  const column = index % columns
  const row = Math.floor(index / columns)
  const left = column * tileWidth + 40
  const top = headerHeight + row * (imageSize + captionHeight)

  const poseImage = await sharp(path.join(inputDir, file))
    .resize(imageSize, imageSize, { fit: 'fill' })
    .png()
    .toBuffer()
  composites.push({ input: poseImage, left, top })

  const number = String(index + 1).padStart(2, '0')
  const caption = Buffer.from(`
    <svg width="${tileWidth}" height="${captionHeight}">
      <rect width="${tileWidth}" height="${captionHeight}" fill="${background}"/>
      <circle cx="74" cy="48" r="34" fill="#2A4B3C"/>
      <text x="74" y="59" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#FFFFFF">${number}</text>
      <text x="125" y="55" font-family="Microsoft YaHei, Noto Sans CJK SC, SimHei, sans-serif" font-size="34" font-weight="700" fill="#26352E">${escapeXml(chinese)}</text>
      <text x="40" y="106" font-family="Arial, sans-serif" font-size="23" fill="#66716B">${escapeXml(file)}</text>
    </svg>
  `)
  composites.push({ input: caption, left: column * tileWidth, top: top + imageSize })
}

const header = Buffer.from(`
  <svg width="${width}" height="${headerHeight}">
    <rect width="${width}" height="${headerHeight}" fill="${background}"/>
    <text x="60" y="68" font-family="Microsoft YaHei, Noto Sans CJK SC, SimHei, sans-serif" font-size="44" font-weight="700" fill="#26352E">站立体式 · 完整编号联系表</text>
    <text x="60" y="116" font-family="Microsoft YaHei, Noto Sans CJK SC, SimHei, sans-serif" font-size="25" fill="#66716B">01–18 为应用内真实顺序；图片保留实际缩放和统一脚底基线</text>
  </svg>
`)
composites.unshift({ input: header, left: 0, top: 0 })

await fs.mkdir(outputDir, { recursive: true })
await sharp({
  create: {
    width,
    height,
    channels: 3,
    background,
  },
})
  .composite(composites)
  .png({ compressionLevel: 9 })
  .toFile(output)

console.log(output)
