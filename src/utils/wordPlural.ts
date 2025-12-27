/**
 * 获取单词的单数形式
 */
export function getSingularForm(word: string): string {
  const lowerWord = word.toLowerCase();
  
  // 如果单词太短，直接返回
  if (lowerWord.length <= 3) {
    return lowerWord;
  }
  
  // 不规则复数形式（常见的一些）
  const irregularPlurals: Record<string, string> = {
    'children': 'child',
    'mice': 'mouse',
    'men': 'man',
    'women': 'woman',
    'feet': 'foot',
    'teeth': 'tooth',
    'geese': 'goose',
    'people': 'person',
    'leaves': 'leaf',
    'knives': 'knife',
    'wives': 'wife',
    'lives': 'life',
    'halves': 'half',
    'shelves': 'shelf',
    'wolves': 'wolf',
    'calves': 'calf',
    'elves': 'elf',
    'loaves': 'loaf',
    'thieves': 'thief',
    'cities': 'city',
    'countries': 'country',
    'stories': 'story',
    'studies': 'study',
    'bodies': 'body',
    'families': 'family',
    'parties': 'party',
    'dictionaries': 'dictionary',
    'universities': 'university',
  };
  
  if (irregularPlurals[lowerWord]) {
    return irregularPlurals[lowerWord];
  }
  
  // 以 ies 结尾的复数（如 cities -> city）
  if (lowerWord.endsWith('ies') && lowerWord.length > 4) {
    // 检查前一个字母是否是辅音
    const beforeIes = lowerWord.slice(0, -3);
    const lastChar = beforeIes[beforeIes.length - 1];
    if (lastChar && !['a', 'e', 'i', 'o', 'u'].includes(lastChar)) {
      return beforeIes + 'y';
    }
  }
  
  // 以 ves 结尾的复数（如 leaves -> leaf, knives -> knife）
  if (lowerWord.endsWith('ves') && lowerWord.length > 4) {
    const beforeVes = lowerWord.slice(0, -3);
    // 检查是否是 f 或 fe 结尾的单数
    if (lowerWord.endsWith('lves') || lowerWord.endsWith('rves')) {
      // 可能是 elf -> elves, shelf -> shelves 等
      return beforeVes + 'f';
    }
    // 其他情况可能是 knife -> knives
    if (beforeVes.endsWith('ie')) {
      return beforeVes.slice(0, -2) + 'ife';
    }
    if (beforeVes.endsWith('lf') || beforeVes.endsWith('rf')) {
      return beforeVes + 'e';
    }
  }
  
  // 以 es 结尾的复数（如 boxes, classes, watches）
  if (lowerWord.endsWith('es') && lowerWord.length > 4) {
    const beforeEs = lowerWord.slice(0, -2);
    const lastChar = beforeEs[beforeEs.length - 1];
    
    // 以 s, x, z, ch, sh 结尾的加 es
    if (lastChar && ['s', 'x', 'z', 'h'].includes(lastChar)) {
      // 检查是否是 ch 或 sh
      if (lowerWord.endsWith('ches') || lowerWord.endsWith('shes')) {
        return beforeEs;
      }
      // 其他情况（s, x, z）
      return beforeEs;
    }
    
    // 以 o 结尾的复数（如 tomatoes, potatoes）
    if (lastChar === 'o') {
      // 有些以 o 结尾的单词复数加 es，有些加 s
      // 这里假设是加 es 的情况
      return beforeEs;
    }
  }
  
  // 以 s 结尾的复数（最常见的情况）
  if (lowerWord.endsWith('s') && lowerWord.length > 3) {
    // 排除一些以 s 结尾但不是复数的单词（如 class, glass, pass, focus, basis 等）
    const nonPluralEndings = ['ss', 'us', 'is', 'as', 'os'];
    const lastTwo = lowerWord.slice(-2);
    
    // 如果以 ss, us, is, as, os 结尾，可能是单数形式
    if (nonPluralEndings.includes(lastTwo)) {
      // 检查是否是已知的复数形式（如 classes, focuses）
      if (lowerWord.endsWith('classes') || lowerWord.endsWith('focuses')) {
        return lowerWord.slice(0, -2);
      }
      // 其他情况可能是单数，直接返回
      return lowerWord;
    }
    
    // 检查是否是复数形式
    // 如果去掉 s 后，单词长度至少为 3
    const singular = lowerWord.slice(0, -1);
    
    // 如果去掉 s 后单词太短，可能不是复数
    if (singular.length < 3) {
      return lowerWord;
    }
    
    // 对于大多数情况，去掉 s 就是单数形式
    // 但需要排除一些特殊情况
    // 如果单词以辅音+s结尾，很可能是复数
    const lastCharOfSingular = singular[singular.length - 1];
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    
    if (lastCharOfSingular && !vowels.includes(lastCharOfSingular)) {
      // 以辅音结尾，很可能是复数
      return singular;
    }
    
    // 如果以元音结尾，也可能是复数（如 idea -> ideas, area -> areas）
    // 这种情况下，我们也假设是复数
    return singular;
  }
  
  // 不是复数形式，直接返回
  return lowerWord;
}

/**
 * 获取单词的有效长度（单数形式的长度）
 */
export function getEffectiveLength(word: string): number {
  const singular = getSingularForm(word);
  return singular.length;
}

/**
 * 检查单词是否是复数形式
 */
export function isPlural(word: string): boolean {
  const singular = getSingularForm(word);
  return singular !== word.toLowerCase();
}

