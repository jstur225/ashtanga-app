import { readFileSync } from 'fs'

const data = JSON.parse(readFileSync('D:/微信聊天记录/xwechat_files/xiao519216978_296f/msg/file/2026-05/ashtanga-debug-log-2026-05-20.json', 'utf-8'))

const keys = Object.keys(data)
console.log('=== 顶层 Key ===')
keys.forEach(k => {
  const v = data[k]
  const type = Array.isArray(v) ? `array[${v.length}]` : typeof v
  console.log(`  ${k}: ${type}`)
})

// Look for practice records, localData, etc.
const sectionNames = ['localStorageKeys', 'practiceData', 'localData', 'practiceRecords', 'records']

for (const section of sectionNames) {
  if (data[section]) {
    console.log(`\n=== ${section} ===`)
    const v = data[section]
    if (typeof v === 'object') {
      const subKeys = Object.keys(v)
      console.log(`  keys (${subKeys.length}): ${subKeys.slice(0, 20).join(', ')}`)
      if (subKeys.includes('2026-04-08')) {
        console.log('  >>> FOUND 2026-04-08 <<<')
        console.log(JSON.stringify(v['2026-04-08'], null, 2))
      }
    } else if (Array.isArray(v)) {
      console.log(`  array length: ${v.length}`)
      const hasDate = v.some(item => item && (item.date === '2026-04-08' || item.date?.includes('04-08')))
      console.log(`  has 04-08 entry: ${hasDate}`)
      if (hasDate) {
        v.filter(item => item && item.date === '2026-04-08').forEach(item => {
          console.log(JSON.stringify(item, null, 2))
        })
      }
    }
  }
}

// Deeper search for 04-08
console.log('\n=== 搜索所有 04-08 引用 ===')
function searchDeep(obj, path = '') {
  if (!obj || typeof obj !== 'object') return
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => searchDeep(item, `${path}[${i}]`))
    return
  }
  for (const [k, v] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${k}` : k
    if (k === '2026-04-08' || (typeof k === 'string' && k.includes('04-08'))) {
      console.log(`\n>>> Found at ${fullPath}:`)
      console.log(JSON.stringify(v, null, 2).substring(0, 500))
    }
    searchDeep(v, fullPath)
  }
}
searchDeep(data)
