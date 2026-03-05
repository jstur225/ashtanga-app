with open('final.txt', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('2026要频繁大量记录自己的练习')
if idx != -1:
    section = content[idx:]
    end_idx = section.find('","article"')
    if end_idx != -1:
        text = section[:end_idx-1]
        text = text.replace('\\n', '\n')
        with open('generated_2026频繁记录.md', 'w', encoding='utf-8') as f:
            f.write('# 2026要频繁大量记录自己的练习\n\n')
            f.write(text)
        print('Saved!')
    else:
        print('End not found')
else:
    print('Topic not found')
