import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const finalDir = path.join(root, 'output', 'primary-series-ip-v3', 'seated', 'final')
const publicDir = path.join(root, 'public', 'poses', 'primary-series-ip-v1', 'seated')
const seatedV1Dir = path.join(root, 'output', 'primary-series-ip-v1', 'masters', 'seated')
const finishingV1Dir = path.join(root, 'output', 'primary-series-ip-v1', 'masters', 'finishing')
const generatedDir = path.join(root, 'output', 'primary-series-ip-v3', 'seated', 'generated')
const suppliedDir = path.join(generatedDir, 'user-supplied', 'normalized')

const retained = file => path.join(seatedV1Dir, file)
const finishing = file => path.join(finishingV1Dir, file)
const candidate = (batch, file) => path.join(generatedDir, `batch-${batch}`, 'normalized', file)
const supplied = file => path.join(suppliedDir, file)

const poses = [
  ['dandasana.png', retained('dandasana.png')],
  ['paschimottanasana-a.png', retained('paschimottanasana-a.png')],
  ['paschimottanasana-b.png', candidate('01', '03-paschimottanasana-b-transparent-v1.png')],
  ['paschimottanasana-c.png', supplied('04-paschimottanasana-c-transparent-v1.png')],
  ['purvottanasana.png', supplied('05-purvottanasana-transparent-v1.png')],
  ['ardha-baddha-padma-paschimottanasana.png', supplied('06-ardha-baddha-padma-paschimottanasana-transparent-v1.png')],
  ['triang-mukha-eka-pada-paschimottanasana.png', candidate('02', '07-triang-mukha-eka-pada-paschimottanasana-transparent-v1.png')],
  ['janu-sirsasana-a.png', candidate('01', '08-janu-sirsasana-a-transparent-v1.png')],
  ['janu-sirsasana-b.png', candidate('02', '09-janu-sirsasana-b-transparent-v1.png')],
  ['janu-sirsasana-c.png', candidate('03', '10-janu-sirsasana-c-transparent-v1.png')],
  ['marichyasana-a.png', retained('marichyasana-a.png')],
  ['marichyasana-b.png', supplied('12-marichyasana-b-transparent-v1.png')],
  ['marichyasana-c.png', retained('marichyasana-c.png')],
  ['marichyasana-d.png', supplied('14-marichyasana-d-transparent-v1.png')],
  ['navasana.png', retained('navasana.png')],
  ['bhujapidasana-02.png', supplied('16-bhujapidasana-02-transparent-v1.png')],
  ['kurmasana.png', retained('kurmasana.png')],
  ['supta-kurmasana.png', candidate('03', '18-supta-kurmasana-transparent-v1.png')],
  ['garbha-pindasana.png', supplied('19-garbha-pindasana-transparent-v1.png')],
  ['kukkutasana.png', candidate('04', '20-kukkutasana-transparent-v1.png')],
  ['baddha-konasana-a.png', supplied('21-baddha-konasana-a-transparent-v1.png')],
  ['baddha-konasana-b.png', supplied('22-baddha-konasana-b-transparent-v1.png')],
  ['upavishta-konasana-01.png', retained('upavishta-konasana-01.png')],
  ['upavishta-konasana-02.png', retained('upavishta-konasana-02.png')],
  ['supta-konasana-01.png', supplied('25-supta-konasana-01-transparent-v1.png')],
  ['supta-konasana-02.png', retained('supta-konasana-02.png')],
  ['supta-padangusthasana-01.png', retained('supta-padangusthasana-01.png')],
  ['supta-padangusthasana-02.png', retained('supta-padangusthasana-02.png')],
  ['ubhaya-padangusthasana-02.png', retained('ubhaya-padangusthasana-02.png')],
  ['urdhva-mukha-paschimottanasana-02.png', retained('urdhva-mukha-paschimottanasana-02.png')],
  ['setu-bandhasana.png', supplied('31-setu-bandhasana-transparent-v1.png')],
  ['urdhva-dhanurasana.png', finishing('urdhva-dhanurasana.png')],
  ['paschimottanasana.png', supplied('33-paschimottanasana-transparent-v1.png')],
]

if (poses.length !== 33) {
  throw new Error(`Expected 33 seated poses, got ${poses.length}`)
}

const uniqueNames = new Set(poses.map(([file]) => file))
if (uniqueNames.size !== poses.length) {
  throw new Error('Duplicate seated output filenames detected')
}

await fs.mkdir(finalDir, { recursive: true })
await fs.mkdir(publicDir, { recursive: true })

for (const [file, source] of poses) {
  await fs.access(source)

  const pngBuffer = await sharp(source)
    .ensureAlpha()
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const finalPath = path.join(finalDir, file)
  const baseName = file.replace(/\.png$/i, '')
  const publicPath = path.join(publicDir, `${baseName}.webp`)
  const thumbPath = path.join(publicDir, `${baseName}-thumb.webp`)

  await fs.writeFile(finalPath, pngBuffer)
  await sharp(pngBuffer)
    .webp({ quality: 82, effort: 6, alphaQuality: 100 })
    .toFile(publicPath)
  await sharp(pngBuffer)
    .resize(320, 320, { fit: 'fill' })
    .webp({ quality: 82, effort: 6, alphaQuality: 100 })
    .toFile(thumbPath)
}

await fs.writeFile(
  path.join(finalDir, 'manifest.json'),
  `${JSON.stringify(poses.map(([file, source], index) => ({
    order: index + 1,
    file,
    source: path.relative(root, source).replaceAll('\\', '/'),
  })), null, 2)}\n`,
)

console.log(`Published ${poses.length} seated poses`)
console.log(path.relative(root, finalDir))
console.log(path.relative(root, publicDir))
