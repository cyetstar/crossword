/**
 * 从纯文本中提取所有单词
 */
export function extractWordsFromText(text: string): string[] {
  // 提取单词：只保留字母，转换为小写，过滤掉太短的单词
  const words = text.toLowerCase().match(/[a-z]+/g) || [];

  // 去重并过滤
  const uniqueWords = Array.from(new Set(words)).filter(
    (word) => word.length >= 3
  ); // 至少3个字母的单词

  return uniqueWords;
}
