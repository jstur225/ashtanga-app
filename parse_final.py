import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('final.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the generated content
idx = content.find('2026要频繁大量记录自己的练习')
if idx != -1:
    section = content[idx:]
    # Look for next message or end
    end_idx = section.find('","article"')
    if end_idx == -1:
        end_idx = len(section)

    text = section[:end_idx]
    # Clean up
    text = text.replace('\\n', '\n')

    with open('generated_2026频繁记录.md', 'w', encoding='utf-8') as f:
        f.write('# 2026要频繁大量记录自己的练习\n\n')
        f.write(text)

    print('Saved to generated_2026频繁记录.md')
    print(f'Length: {len(text)} chars')
    print('\n=== Preview ===')
    print(text[:800])
else:
    print('Topic not found')
    print('Content preview:')
    print(content[:500])
