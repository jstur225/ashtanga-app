import pandas as pd

# 读取Excel文件
df = pd.read_excel(r'C:\Users\BIN\Desktop\阿斯汤加小红书文案风格.xlsx')

# 保存为txt文件
output_file = r'C:\Users\BIN\Desktop\阿斯汤加小红书文案风格.txt'
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(df.to_string())

print(f"已成功转换为txt文件：{output_file}")
print(f"共 {len(df)} 行数据")
