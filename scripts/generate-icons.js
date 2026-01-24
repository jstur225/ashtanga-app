// 这个脚本用于生成PWA所需的图标
// 需要安装: npm install sharp

const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
  const sourceIcon = 'public/icon.png'; // 1024x1024

  // 生成512x512 (用于maskable icon)
  await sharp(sourceIcon)
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .toFile('public/icon-512.png')
    .catch(() => console.log('512x512 generation skipped'));

  // 生成192x192 (Android标准尺寸)
  await sharp(sourceIcon)
    .resize(192, 192, { fit: 'inside', withoutEnlargement: true })
    .toFile('public/icon-192.png')
    .catch(() => console.log('192x192 generation skipped'));

  console.log('✅ Icons generated successfully!');
}

generateIcons().catch(console.error);
