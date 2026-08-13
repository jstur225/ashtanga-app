/**
 * 网页版内容安全过滤入口（与小程序共用 weapp/services/content-filter 词库）。
 * 满足微信提审 3.2.11「必须提供过滤不当内容的措施」。
 */
import { BLOCKED_WORDS, checkText, findBlockedWord } from '../weapp/services/content-filter'

export { BLOCKED_WORDS, checkText, findBlockedWord }
