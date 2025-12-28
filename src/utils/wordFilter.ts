import { getEffectiveLength, getSingularForm } from './wordPlural';

/**
 * 字母状态类型
 */
export type LetterState = 'gray' | 'yellow' | 'green' | 'none';

/**
 * 字母反馈信息
 */
export interface LetterFeedback {
  letter: string;
  position: number;
  state: LetterState;
}

/**
 * 根据反馈筛选单词
 */
export function filterWordsByFeedback(
  words: string[],
  feedbacks: LetterFeedback[][],
  wordLength: number
): string[] {
  // 使用有效长度（单数形式的长度）进行过滤
  let filtered = words.filter(word => getEffectiveLength(word) === wordLength);
  
  for (const feedback of feedbacks) {
    filtered = filtered.filter(word => {
      return matchesFeedback(word, feedback);
    });
  }
  
  return filtered;
}

/**
 * 检查单词是否匹配反馈
 */
function matchesFeedback(word: string, feedback: LetterFeedback[]): boolean {
  // 使用单数形式来匹配反馈（因为反馈是基于单数形式的）
  const singularWord = getSingularForm(word);
  const wordArray = singularWord.split('');
  
  // 收集每个位置的反馈
  const positionFeedback: Map<number, LetterFeedback> = new Map();
  for (const fb of feedback) {
    positionFeedback.set(fb.position, fb);
  }
  
  // 统计每个字母在反馈中的绿色+黄色数量（这是该字母在答案中的最小数量）
  const letterMinCount: Map<string, number> = new Map();
  // 记录每个字母是否有绿色或黄色
  const letterHasGreenOrYellow: Map<string, boolean> = new Map();
  
  for (const fb of feedback) {
    if (fb.state === 'green' || fb.state === 'yellow') {
      letterMinCount.set(fb.letter, (letterMinCount.get(fb.letter) || 0) + 1);
      letterHasGreenOrYellow.set(fb.letter, true);
    }
  }
  
  // 1. 检查绿色位置：必须完全匹配
  for (const fb of feedback) {
    if (fb.state === 'green') {
      if (wordArray[fb.position] !== fb.letter) {
        return false;
      }
    }
  }
  
  // 2. 检查黄色位置：字母必须存在，但不能在这个位置
  for (const fb of feedback) {
    if (fb.state === 'yellow') {
      // 黄色字母必须在单词中存在
      if (!wordArray.includes(fb.letter)) {
        return false;
      }
      // 黄色字母不能在当前位置
      if (wordArray[fb.position] === fb.letter) {
        return false;
      }
    }
  }
  
  // 3. 检查灰色位置
  for (const fb of feedback) {
    if (fb.state === 'gray') {
      const hasGreenOrYellow = letterHasGreenOrYellow.get(fb.letter) || false;
      
      if (!hasGreenOrYellow) {
        // 如果该字母没有绿色或黄色，则不能出现在单词中
        if (wordArray.includes(fb.letter)) {
          return false;
        }
      } else {
        // 如果该字母有绿色或黄色，那么灰色位置不能是这个字母
        if (wordArray[fb.position] === fb.letter) {
          return false;
        }
      }
    }
  }
  
  // 4. 检查字母数量：确保单词中包含足够的绿色和黄色字母
  for (const [letter, minCount] of letterMinCount) {
    const actualCount = wordArray.filter(l => l === letter).length;
    if (actualCount < minCount) {
      return false;
    }
  }
  
  // 5. 对于有灰色标记的字母，如果同时有绿色或黄色，需要确保总数等于要求数量
  // 因为灰色表示"这个位置不能是这个字母"，所以总数不能超过绿色+黄色的数量
  for (const fb of feedback) {
    if (fb.state === 'gray') {
      const hasGreenOrYellow = letterHasGreenOrYellow.get(fb.letter) || false;
      if (hasGreenOrYellow) {
        const minCount = letterMinCount.get(fb.letter) || 0;
        const actualCount = wordArray.filter(l => l === fb.letter).length;
        // 实际数量应该等于要求数量（不能多）
        if (actualCount > minCount) {
          return false;
        }
      }
    }
  }
  
  return true;
}

/**
 * 随机选择一个单词
 */
export function getRandomWord(words: string[]): string | null {
  if (words.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
}

