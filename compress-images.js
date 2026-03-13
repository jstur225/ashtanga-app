const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 需要压缩的图片
const images = [
  'public/Gemini_Generated_Image_g8eq8eg8eq8eg8eq.png',
  'public/进群方法.png',
  'public/pwa-install.png',
  'public/Sri K. Pattabhi Jois.png',
  'public/Sri K.jpeg',
];

async function compressImage(inputPath) {
  const outputPath = inputPath.replace(/\.(png|jpg|jpeg)$/i, '.$2');
  
  try {
    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;
    
    // 根据文件大小设置不同的压缩质量
    let quality;
    if (originalSize > 5 * 1024 * 1024) {
      quality = 60; // 大于5MB，用60%质量
    } else if (originalSize > 1 * 1024 * 1024) {
      quality = 70; // 大于1MB，用70%质量
    } else {
      quality = 80; // 小于1MB，用80%质量
    }
    
    // 压缩图片
    await sharp(inputPath)
      .png({ quality: quality, compressionLevel: 9 })
      .jpeg({ quality: quality })
      .toFile(outputPath);
    
    const newStats = fs.statSync(outputPath);
    const newSize = newStats.size;
    const savedPercent = ((1 - newSize / originalSize) * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(inputPath)}`);
    console.log(`   ${formatSize(originalSize)} → ${formatSize(newSize)} (减少 ${savedPercent}%)`);
    
    // 替换原文件
    fs.unlinkSync(inputPath);
    fs.renameSync(outputPath, inputPath);
    
    return { originalSize, newSize };
  } catch (error) {
    console.error(`❌ ${inputPath}:`, error.message);
    return null;
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function main() {
  console.log('🖼️  开始压缩图片...\n');
  
  let totalOriginal = 0;
  let totalNew = 0;
  
  for (const image of images) {
    if (fs.existsSync(image)) {
      const result = await compressImage(image);
      if (result) {
        totalOriginal += result.originalSize;
        totalNew += result.newSize;
      }
    } else {
      console.log(`⚠️  文件不存在: ${image}`);
    }
  }
  
  const totalSaved = ((1 - totalNew / totalOriginal) * 100).toFixed(1);
  console.log(`\n📊 总计:`);
  console.log(`   ${formatSize(totalOriginal)} → ${formatSize(totalNew)} (减少 ${totalSaved}%)`);
  console.log(`   节省: ${formatSize(totalOriginal - totalNew)}`);
}

main();
