const sharp = require('sharp');
const path = require('path');

// 配置
const borderRadius = 180; // 圆角大小
const inputIcon = path.join(__dirname, '../public/icon.png');
const outputIcon = path.join(__dirname, '../public/icon-rounded.png');

async function addBorderRadius() {
  try {
    // 获取图片尺寸
    const metadata = await sharp(inputIcon).metadata();
    const { width, height } = metadata;

    // 创建圆角蒙版
    const svg = `
      <svg width="${width}" height="${height}">
        <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill="white"/>
      </svg>
    `;

    // 处理图片
    await sharp(inputIcon)
      .resize(width, height) // 确保尺寸正确
      .composite([
        {
          input: Buffer.from(svg),
          blend: 'dest-in'
        }
      ])
      .png()
      .toFile(outputIcon);

    console.log(`✅ 圆角图标已生成: ${outputIcon}`);
    console.log(`   尺寸: ${width}x${height}, 圆角: ${borderRadius}px`);

    // 同时生成apple-icon的圆角版本
    const inputApple = path.join(__dirname, '../public/apple-icon.png');
    const outputApple = path.join(__dirname, '../public/apple-icon-rounded.png');

    const appleMeta = await sharp(inputApple).metadata();
    await sharp(inputApple)
      .resize(appleMeta.width, appleMeta.height)
      .composite([
        {
          input: Buffer.from(svg.replace(/width="\d+"/, `width="${appleMeta.width}"`).replace(/height="\d+"/, `height="${appleMeta.height}"`)),
          blend: 'dest-in'
        }
      ])
      .png()
      .toFile(outputApple);

    console.log(`✅ Apple图标圆角已生成: ${outputApple}`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

addBorderRadius();
