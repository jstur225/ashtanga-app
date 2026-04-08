const fs = require('fs');
const iconv = require('iconv-lite');
const csv = require('csv-parser');

const results = [];
fs.createReadStream('C:/Users/BIN/Desktop/5_filtered.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log('读取行数:', results.length);

    // 删除 #xxx[话题]# 格式的标签
    const cleanedResults = results.map(row => {
      const title = (row['笔记标题'] || '').replace(/#[^#]+\[话题\]#/g, '').trim();
      const content = (row['笔记内容'] || '').replace(/#[^#]+\[话题\]#/g, '').trim();
      return { ...row, '笔记标题': title, '笔记内容': content };
    });

    // 生成新的 CSV 内容
    const header = ['笔记标题', '笔记内容'];
    let output = header.join(',') + '\n';

    cleanedResults.forEach(row => {
      const line = header.map(h => {
        let val = row[h] || '';
        // 转义引号
        val = val.replace(/"/g, '""');
        // 如果包含逗号、换行或引号，用引号包裹
        if (val.includes(',') || val.includes('\n') || val.includes('\r') || val.includes('"')) {
          val = '"' + val + '"';
        }
        return val;
      }).join(',');
      output += line + '\n';
    });

    // 转回 GBK 编码并保存
    const gbkBuffer = iconv.encode(output, 'gbk');
    fs.writeFileSync('C:/Users/BIN/Desktop/5_cleaned.csv', gbkBuffer);

    console.log('✅ 已保存到: C:/Users/BIN/Desktop/5_cleaned.csv');
    console.log('   编码: GBK');
    console.log('   行数:', cleanedResults.length);

    // 显示前几行示例
    console.log('\n前5行预览:');
    cleanedResults.slice(0, 5).forEach((row, idx) => {
      console.log(`${idx + 1}. 标题: ${row['笔记标题']?.slice(0, 40)}...`);
      console.log(`   内容: ${row['笔记内容']?.slice(0, 60)}...`);
      console.log('');
    });
  });
