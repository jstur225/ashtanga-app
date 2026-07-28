# 坐立体式接入状态

更新时间：2026-07-28  
分支：`master2`

## 当前结论

- 坐立体式已按手册第 21–53 章整理为 33 张正式卡片。
- 坐立体式第 21–53 章的 Vinyasa 总数、凝视点和分步动作说明已接入详情页。
- APP 数据已从旧的 35 张坐立图调整为 33 张。
- `Urdhva Dhanurasana` 和轮式后的 `Paschimottanasana` 已移动到坐立体式末尾。
- 结束体式已从 `Sarvangasana` 开始，当前为 13 张。
- 当前一序列总数为 94 张：
  - 拜日 A：11
  - 拜日 B：19
  - 站立体式：18
  - 坐立体式：33
  - 结束体式：13

## 坐立体式最终顺序

1. `dandasana.png`
2. `paschimottanasana-a.png`
3. `paschimottanasana-b.png`
4. `paschimottanasana-c.png`
5. `purvottanasana.png`
6. `ardha-baddha-padma-paschimottanasana.png`
7. `triang-mukha-eka-pada-paschimottanasana.png`
8. `janu-sirsasana-a.png`
9. `janu-sirsasana-b.png`
10. `janu-sirsasana-c.png`
11. `marichyasana-a.png`
12. `marichyasana-b.png`
13. `marichyasana-c.png`
14. `marichyasana-d.png`
15. `navasana.png`
16. `bhujapidasana-02.png`
17. `kurmasana.png`
18. `supta-kurmasana.png`
19. `garbha-pindasana.png`
20. `kukkutasana.png`
21. `baddha-konasana-a.png`
22. `baddha-konasana-b.png`
23. `upavishta-konasana-01.png`
24. `upavishta-konasana-02.png`
25. `supta-konasana-01.png`
26. `supta-konasana-02.png`
27. `supta-padangusthasana-01.png`
28. `supta-padangusthasana-02.png`
29. `ubhaya-padangusthasana-02.png`
30. `urdhva-mukha-paschimottanasana-02.png`
31. `setu-bandhasana.png`
32. `urdhva-dhanurasana.png`
33. `paschimottanasana.png`

## 本轮去重/迁移

- `bhujapidasana-01.png`：不再展示，只保留 `bhujapidasana-02.png`。
- `baddha-konasana-c.png`：不再展示，只保留 A/B。
- `ubhaya-padangusthasana-01.png`：不再展示，只保留 `ubhaya-padangusthasana-02.png`。
- `urdhva-mukha-paschimottanasana-01.png`：不再展示，只保留 `urdhva-mukha-paschimottanasana-02.png`。
- `finishing/urdhva-dhanurasana.png`：迁移为 `seated/urdhva-dhanurasana.png`。
- `finishing/paschimottanasana.png`：迁移为 `seated/paschimottanasana.png`。

## 关键输出

- 坐立最终透明母版：
  - `output/primary-series-ip-v3/seated/final/`
- APP 正式 WebP：
  - `public/poses/primary-series-ip-v1/seated/`
- 坐立总联系表：
  - `output/primary-series-ip-v3/seated/review/seated-v3-overall-contact-sheet.png`
- 坐立状态清单：
  - `output/primary-series-ip-v3/seated/review/seated-v3-overall-status.json`
- 发布脚本：
  - `scripts/publish-seated-v3-final.mjs`
- 手册说明抽取脚本：
  - `scripts/extract-handbook-instructions.mjs`
- 坐立动作说明数据：
  - `lib/seated-instructions.ts`

## 已验证

- 数据计数：`surya-a=11`、`surya-b=19`、`standing=18`、`seated=33`、`finishing=13`，总数 94。
- 所有体式数据引用的 WebP 与缩略图均存在。
- `npm.cmd run typecheck` 通过。
- `npm.cmd run lint` 通过。
- `npx.cmd vitest run __tests__/pose-images.test.ts __tests__/poses-tab.test.tsx` 通过。
- 坐立详情页测试已覆盖 `Dandasana` 的手册动作说明展示。

## 下一步

1. 在手机端检查坐立体式列表和详情页显示效果。
2. 如手机端比例或留白需要再调，只替换对应文件，不改变名称和顺序。
3. 继续推进结束体式图片审核与内容接入。
