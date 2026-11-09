import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('weapp')
let changedFiles = 0

function updateDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      updateDirectory(filePath)
      continue
    }
    if (!entry.isFile() || !filePath.endsWith('.wxss')) continue

    const before = fs.readFileSync(filePath, 'utf8')
    const after = before
      .replace(
        /font-family:\s*'Songti SC',\s*STSong,\s*serif/g,
        "font-family: 'Ashtanga Serif', 'Songti SC', STSong, serif",
      )
      .replace(
        /font-family:\s*Georgia,\s*'Times New Roman',\s*serif/g,
        "font-family: 'Ashtanga Serif', Georgia, 'Times New Roman', serif",
      )
      .replace(
        /font-family:\s*serif/g,
        "font-family: 'Ashtanga Serif', serif",
      )

    if (after !== before) {
      fs.writeFileSync(filePath, after)
      changedFiles += 1
    }
  }
}

updateDirectory(root)
console.log(`Updated ${changedFiles} WXSS files.`)
