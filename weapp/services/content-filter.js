/**
 * 文本内容安全过滤（微信提审 3.2.11「必须提供过滤不当内容的措施」）
 *
 * - 纯本地敏感词检查：无网络请求、无 wx/浏览器依赖，小程序与网页版共用。
 * - 命中时返回命中的词，由调用方给出「内容包含不当词汇」提示并阻止保存。
 * - 词库为「明确违法违规」类词汇（色情/赌博/毒品/暴恐/政治敏感/诈骗传销），
 *   避免误伤正常练习日记表达；如需调整词库，只改 BLOCKED_WORDS 即可。
 */
const BLOCKED_WORDS = [
  // 色情/淫秽
  '色情', '情色', '淫秽', '淫乱', '裸聊', '裸照', '卖淫', '嫖娼', '嫖', '援交',
  '一夜情', '约炮', '招嫖', '性交易', '成人影片', '黄色网站', 'porn',
  // 赌博
  '赌博', '博彩', '六合彩', '赌场', '老虎机', '时时彩', '百家乐', '外围赌',
  '赌球', '赌资', '网赌', '赌债', 'casino', 'gambling',
  // 毒品
  '毒品', '冰毒', '海洛因', '大麻', '摇头丸', '可卡因', '鸦片', '吸毒', '贩毒',
  '制毒', '毒资', '迷药', '笑气', 'heroin', 'cocaine', 'methamphetamine',
  // 暴恐/枪支
  '恐怖袭击', '爆炸物', '军火', '枪支', '砍杀', '炸弹',
  // 政治敏感/邪教
  '法轮功', '六四', '天安门事件', '台独', '藏独', '疆独', '港独', '邪教',
  // 诈骗/传销/其他违法
  '传销', '电信诈骗', '洗钱', '代开发票', '发票代开', '假证', '办证刻章'
];

/**
 * 返回第一个命中的违规词；无命中返回 null。
 * @param {unknown} text
 * @returns {string|null}
 */
function findBlockedWord(text) {
  if (!text || typeof text !== 'string') return null;
  const lowered = text.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lowered.indexOf(word) >= 0) return word;
  }
  return null;
}

/**
 * 检查一段文本。
 * @param {unknown} text
 * @returns {{ ok: boolean, word: string | null }}
 */
function checkText(text) {
  const word = findBlockedWord(text);
  return word ? { ok: false, word } : { ok: true, word: null };
}

module.exports = { BLOCKED_WORDS, findBlockedWord, checkText };
