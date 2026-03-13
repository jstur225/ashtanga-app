const fs = require('fs');
const path = require('path');

// 组件提取配置
const components = [
  { name: 'SettingsModal', start: 1772, end: 2230 },
  { name: 'EditRecordModal', start: 522, end: 828 },
  { name: 'ShareCardModal', start: 829, end: 1126 },
  { name: 'AddPracticeModal', start: 1477, end: 1771 },
  { name: 'CustomPracticeModal', start: 279, end: 377 },
];

const inputFile = 'app/practice/page.tsx';
const outputDir = 'app/practice/components';

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 读取源文件
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

// 提取每个组件
components.forEach(({ name, start, end }) => {
  const componentLines = lines.slice(start - 1, end);
  const componentCode = componentLines.join('\n');
  
  // 添加必要的导入
  const imports = `import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Settings, User, Database, Cloud, Download, Upload, Trash2, AlertCircle } from "lucide-react"
import { toast } from 'sonner'
import type { UserProfile, PracticeRecord, PracticeOption } from "@/hooks/usePracticeData"

`;
  
  const fullCode = imports + componentCode;
  
  // 写入文件
  const outputFile = path.join(outputDir, `${name}.tsx`);
  fs.writeFileSync(outputFile, fullCode, 'utf8');
  
  console.log(`✅ Extracted ${name} (${end - start + 1} lines)`);
});

console.log('\n🎉 Component extraction complete!');
console.log('📝 Next steps:');
console.log('1. Review extracted components');
console.log('2. Update main file to use dynamic imports');
console.log('3. Test functionality');
