const fs = require('fs');

const inputFile = 'app/practice/page.tsx';
const outputFile = 'app/practice/page.tsx';

// 读取文件
let content = fs.readFileSync(inputFile, 'utf8');
let originalLines = content.split('\n').length;

// 要移除的 console.log 模式（保留重要的调试信息）
const patternsToRemove = [
  /console\.log\(['"][💾🔄✅❌🔍]/g,  // 带emoji的日志
  /console\.log\('handleCustomPracticeConfirm called with:/g,
  /console\.log\('onAddOption function:/g,
  /console\.log\('calling onAddOption\.\.\.'/g,
  /console\.log\('onAddOption called'/g,
  /console\.log\('onAddOption is undefined!'/g,
  /console\.log\('Sync completed:'/g,
  /console\.log\('更新本地 profile:'/g,
  /  console\.log\(['"][^\n]*\['/g,  // 日志中的标签
];

// 统计
let removedCount = 0;

// 移除匹配的行
patternsToRemove.forEach(pattern => {
  const matches = content.match(pattern);
  if (matches) {
    removedCount += matches.length;
  }
  content = content.replace(pattern, '// REMOVED: $&');
});

// 写回文件
fs.writeFileSync(outputFile, content, 'utf8');

const newLines = content.split('\n').length;
console.log(`✅ Console.log 清理完成`);
console.log(`📊 统计:`);
console.log(`   - 原始行数: ${originalLines}`);
console.log(`   - 当前行数: ${newLines}`);
console.log(`   - 移除日志: ${removedCount} 个`);
console.log(`   - 保留: console.error (错误日志)`);
