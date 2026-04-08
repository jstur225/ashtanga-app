const fs = require('fs');
const iconv = require('iconv-lite');
const csv = require('csv-parser');

const buffer = fs.readFileSync('C:/Users/BIN/Desktop/5.csv');
const content = iconv.decode(buffer, 'gbk');

// 首先把内容转成 UTF-8 并保存到临时文件
fs.writeFileSync('/tmp/temp_utf8.csv', content, 'utf8');

const results = [];

fs.createReadStream('/tmp/temp_utf8.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log('总行数:', results.length);
    console.log('\n表头:', Object.keys(results[0]));

    // 定义关键词
    const yogaKeywords = ['瑜伽', '阿斯汤加', '阿汤', '熬汤', 'mysore', 'ashtanga', 'yoga', '体式', '呼吸', '拜日式', 'kapo', '轮式', '后弯', '冥想', '轮下', '上犬', '下犬', '汤', '收束', '凝视', '串联'];
    const sportKeywords = ['运动', '健身', '锻炼', '身体', '肌肉', '练习', '攀岩', '垫'];

    const keepRows = [];
    const deleteRows = [];

    results.forEach((row, idx) => {
        const title = row['笔记标题'] || '';
        const content = row['笔记内容'] || '';
        const fullText = (title + ' ' + content).toLowerCase();

        const isYogaRelated = yogaKeywords.some(k => fullText.includes(k.toLowerCase()));
        const isSportRelated = sportKeywords.some(k => fullText.includes(k.toLowerCase()));

        if (isYogaRelated || isSportRelated) {
            keepRows.push(row);
        } else {
            deleteRows.push({idx, title, content});
        }
    });

    console.log('\n保留行数:', keepRows.length);
    console.log('删除行数:', deleteRows.length);

    console.log('\n=== 被删除的行（全部）===');
    deleteRows.forEach(d => {
        console.log(`行${d.idx + 2}: 标题=${d.title?.slice(0, 60)}`);
        console.log(`     内容=${d.content?.slice(0, 100)}...`);
        console.log('');
    });

    // 生成新的 CSV
    const header = Object.keys(results[0]);
    let output = header.join(',') + '\n';

    keepRows.forEach(row => {
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

    fs.writeFileSync('C:/Users/BIN/Desktop/5_filtered.csv', output, 'utf8');
    console.log('\n✅ 已保存过滤后的文件到: C:/Users/BIN/Desktop/5_filtered.csv');
    console.log(`   原文件: ${results.length} 行`);
    console.log(`   过滤后: ${keepRows.length} 行`);
    console.log(`   删除: ${deleteRows.length} 行`);
  });
