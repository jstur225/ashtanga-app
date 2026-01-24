// 创建maskable icon: 白色背景 + 图标居中
// 需要先安装: npm install sharp

const sharp = require('sharp');
const fs = require('fs');

async function createMaskableIcon() {
  try {
    // 读取原始图标
    const sourceIcon = 'public/icon.png';

    // 创建512x512的白色背景
    const background = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).png().toBuffer();

    // 将原始图标调整为居中位置（占中间60%，即307x307）
    const resizedLogo = await sharp(sourceIcon)
      .resize(307, 307, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    // 合成到白色背景上
    const result = await sharp(background)
      .composite([
        {
          input: resizedLogo,
          gravity: 'center' // 居中
        }
      ])
      .png()
      .toFile('public/icon-maskable.png');

    console.log('✅ Maskable icon创建成功！');
    console.log('📁 保存位置: public/icon-maskable.png');
    console.log('📐 尺寸: 512x512');
    console.log('🎨 样式: 白色背景 + 图标居中');

  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    console.log('\n💡 请先安装依赖: npm install sharp');
  }
}

createMaskableIcon();
