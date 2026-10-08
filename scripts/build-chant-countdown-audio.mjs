import { spawnSync } from 'node:child_process'
import { statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const source = path.join(root, 'weapp', 'audio', 'opening-chant.mp3')
const output = path.join(root, 'public', 'audio', 'opening-chant-countdown-180m-v1.m4a')

const result = spawnSync('ffmpeg', [
  '-y',
  '-f', 'lavfi',
  '-t', '10800',
  '-i', 'anullsrc=r=24000:cl=mono',
  '-i', source,
  '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[out]',
  '-map', '[out]',
  '-c:a', 'aac',
  '-b:a', '16k',
  '-ar', '24000',
  '-ac', '1',
  '-movflags', '+faststart',
  '-metadata', 'title=熬汤日记 · 开篇唱诵准备',
  output,
], { stdio: 'inherit' })

if (result.status !== 0) process.exit(result.status || 1)

const probe = spawnSync('ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration,size',
  '-of', 'default=noprint_wrappers=1',
  output,
], { encoding: 'utf8' })

if (probe.status !== 0) {
  process.stderr.write(probe.stderr || 'ffprobe failed\n')
  process.exit(probe.status || 1)
}

const durationMatch = probe.stdout.match(/duration=([\d.]+)/)
const duration = durationMatch ? Number(durationMatch[1]) : 0
if (duration < 10868 || duration > 10870) {
  throw new Error(`Unexpected countdown master duration: ${duration}`)
}

const sizeMiB = statSync(output).size / 1024 / 1024
process.stdout.write(`Generated ${output} (${duration.toFixed(3)}s, ${sizeMiB.toFixed(2)} MiB)\n`)
