# 结束体式接入状态

更新时间：2026-07-28  
分支：`master2`

## 当前结论

- 结束体式已按手册第 54–66 章整理为 13 张正式卡片。
- 第 54–66 章的 Vinyasa 总数、凝视点和分步动作说明已接入详情页。
- 结束体式卡片显示中文名；详情页显示梵文主标题和中文副标题。
- 当前一序列总数保持 94 张：
  - 拜日 A：11
  - 拜日 B：19
  - 站立体式：18
  - 坐立体式：33
  - 结束体式：13

## 结束体式最终顺序

1. `sarvangasana.png`
2. `halasana.png`
3. `karnapidasana.png`
4. `urdhva-padmasana.png`
5. `pindasana.png`
6. `matsyasana.png`
7. `uttana-padasana.png`
8. `sirsasana-01.png`
9. `sirsasana-02.png`
10. `baddha-padmasana.png`
11. `padmasana.png`
12. `utpluthih.png`
13. `savasana.png`

## 本轮结构调整

- 手册第 61、62 章分别为 `Shirshasana (1)` 和 `Shirshasana (2)`。
- 当前素材库只有一张头倒立图，所以 `sirsasana-01.png` 与 `sirsasana-02.png` 暂时复用同一张头倒立素材。
- `yoga-mudra.png` 仍保留在旧素材目录中，但不再进入 APP 当前一序列展示。
- `urdhva-dhanurasana.png` 和轮式后的 `paschimottanasana.png` 已在上一轮迁移到坐立体式末尾，不再属于结束体式。

## 关键输出

- APP 正式 WebP：
  - `public/poses/primary-series-ip-v1/finishing/`
- 结束体式透明母版工作产物：
  - `output/primary-series-ip-v3/finishing/final/`
- 手册说明抽取脚本：
  - `scripts/extract-finishing-handbook-instructions.mjs`
- 图片发布脚本：
  - `scripts/publish-finishing-final.mjs`
- 结束动作说明数据：
  - `lib/finishing-instructions.ts`

## 已验证

- 数据计数：`surya-a=11`、`surya-b=19`、`standing=18`、`seated=33`、`finishing=13`，总数 94。
- 所有体式数据引用的 WebP 与缩略图均存在。
- 13 张结束体式正式 WebP 四角透明，无米色背景。
- `npm.cmd run typecheck` 通过。
- `npm.cmd run lint` 通过。
- `npx.cmd vitest run __tests__/pose-images.test.ts __tests__/poses-tab.test.tsx` 通过。

## 下一步

1. 在手机端检查结束体式列表与详情页显示效果。
2. 如果需要区分头倒立第 1/2 阶段，再单独补第二张头倒立素材。
3. 如有图片动作问题，只替换对应文件，不改变当前手册顺序。
