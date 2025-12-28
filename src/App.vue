<template>
  <div class="app-container">
    <h1 class="title">Crossword Solver</h1>

    <!-- Daily Word Link -->
    <div class="daily-word-section">
      <a
        href="https://www.binance.com/zh-CN/activity/word-of-the-day/entry"
        target="_blank"
        rel="noopener noreferrer"
        class="daily-word-link"
      >
        📚 Word of the Day
      </a>
    </div>

    <!-- Article Input Section -->
    <div class="input-section">
      <div class="input-group">
        <label for="article-text">Article Text:</label>
        <textarea
          id="article-text"
          v-model="articleInput"
          placeholder="Paste article text content..."
          rows="5"
        ></textarea>
        <button @click="loadWords" :disabled="loading">
          {{ loading ? "Loading..." : "Extract Words" }}
        </button>
      </div>

      <div v-if="wordCount > 0" class="word-count" @click="toggleWordList">
        Extracted {{ wordCount }} words (click to view)
      </div>
    </div>

    <!-- Word Length Input -->
    <div v-if="wordCount > 0" class="length-section">
      <div class="input-group">
        <label for="word-length">Word Length:</label>
        <input
          id="word-length"
          type="number"
          v-model.number="wordLength"
          min="3"
          max="20"
          @keyup.enter="startNewGame"
        />
        <button @click="startNewGame" :disabled="!wordLength || wordLength < 3">
          Start Game
        </button>
      </div>
    </div>

    <!-- 游戏区域 -->
    <div v-if="currentWord" class="game-section">
      <div class="word-display">
        <div
          v-for="(letter, index) in displayWord.split('')"
          :key="index"
          class="letter-box"
          :class="getLetterClass(index)"
          @click="toggleLetterState(index)"
        >
          <span class="letter">{{ letter.toUpperCase() }}</span>
        </div>
      </div>

      <div class="state-legend">
        <div class="legend-item">
          <span class="legend-box gray"></span>
          <span>Gray: Letter not in word</span>
        </div>
        <div class="legend-item">
          <span class="legend-box yellow"></span>
          <span>Yellow: Letter in word, wrong position</span>
        </div>
        <div class="legend-item">
          <span class="legend-box green"></span>
          <span>Green: Correct</span>
        </div>
      </div>

      <div class="actions">
        <button
          @click="getNextWord"
          :disabled="isAllGreen || filteredWords.length === 0"
        >
          Get Next Word
        </button>
        <button @click="clearAll" class="clear-btn">Clear All</button>
      </div>

      <div v-if="filteredWords.length > 0" class="word-list">
        <div class="word-list-header">
          Candidate Words ({{ filteredWords.length }}):
        </div>
        <div class="word-items">
          <span
            v-for="(word, index) in filteredWords.slice(0, 20)"
            :key="index"
            class="word-item"
            @click="selectWord(word)"
          >
            {{ word.toUpperCase() }}
          </span>
        </div>
      </div>

      <div v-if="isAllGreen" class="success-message">
        🎉 Congratulations! All letters are correct!
      </div>

      <div
        v-if="filteredWords.length === 0 && !isAllGreen"
        class="error-message"
      >
        ⚠️ No matching words found. Please check if feedback is correct.
      </div>
    </div>

    <!-- Guessed Words History -->
    <div v-if="guessedWords.length > 0" class="history-section">
      <div class="history-header">
        <span>Guessed Words:</span>
        <button @click="clearHistory" class="clear-history-btn">
          Clear History
        </button>
      </div>
      <div class="history-words">
        <div
          v-for="(word, index) in guessedWords"
          :key="index"
          class="history-word"
          @click="restartWithWord(word)"
        >
          {{ word.toUpperCase() }}
        </div>
      </div>
    </div>

    <!-- Word List Modal -->
    <div
      v-if="showWordList"
      class="word-list-modal"
      @click.self="closeWordList"
    >
      <div class="word-list-modal-content">
        <div class="word-list-modal-header">
          <h2>All Words ({{ wordCount }})</h2>
          <button class="close-btn" @click="closeWordList">×</button>
        </div>
        <div class="word-list-filter">
          <input
            type="text"
            v-model="wordListFilter"
            placeholder="Filter by letters (e.g., abc)"
            class="word-list-filter-input"
          />
          <span v-if="wordListFilter" class="filter-count">
            {{ filteredWordList.length }} words
          </span>
        </div>
        <div class="word-list-modal-body">
          <div class="word-list-grid">
            <span
              v-for="(word, index) in filteredWordList"
              :key="index"
              class="word-list-item"
            >
              {{ word.toUpperCase() }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { extractWordsFromText } from "./utils/wordExtractor";
import {
  filterWordsByFeedback,
  getRandomWord,
  type LetterFeedback,
  type LetterState,
} from "./utils/wordFilter";
import { getEffectiveLength, getSingularForm } from "./utils/wordPlural";

const articleInput = ref("");
const allWords = ref<string[]>([]);
const wordLength = ref<number>(5);
const currentWord = ref<string | null>(null);
const letterStates = ref<Map<number, LetterState>>(new Map());
const guessedWords = ref<string[]>([]);
const feedbacks = ref<LetterFeedback[][]>([]);
const loading = ref(false);
const showWordList = ref(false);
const wordListFilter = ref("");

const wordCount = computed(() => allWords.value.length);

// 显示单词（如果是复数，显示单数形式）
const displayWord = computed(() => {
  if (!currentWord.value) return "";
  return getSingularForm(currentWord.value);
});

// 过滤单词列表（根据输入的字母，不考虑顺序）
const filteredWordList = computed(() => {
  if (!wordListFilter.value.trim()) {
    return allWords.value;
  }

  const filterLetters = wordListFilter.value
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .split("");

  if (filterLetters.length === 0) {
    return allWords.value;
  }

  // 统计每个字母在过滤条件中出现的次数
  const letterCounts: Map<string, number> = new Map();
  for (const letter of filterLetters) {
    letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
  }

  return allWords.value.filter((word) => {
    const wordLower = word.toLowerCase();
    // 统计单词中每个字母的出现次数
    const wordLetterCounts: Map<string, number> = new Map();
    for (const letter of wordLower) {
      wordLetterCounts.set(letter, (wordLetterCounts.get(letter) || 0) + 1);
    }

    // 检查单词是否包含所有过滤字母（每个字母至少出现指定次数）
    for (const [letter, requiredCount] of letterCounts) {
      const actualCount = wordLetterCounts.get(letter) || 0;
      if (actualCount < requiredCount) {
        return false;
      }
    }

    return true;
  });
});

const filteredWords = computed(() => {
  if (!currentWord.value || feedbacks.value.length === 0) {
    // 使用有效长度（单数形式的长度）进行过滤
    return allWords.value.filter(
      (w) => getEffectiveLength(w) === wordLength.value
    );
  }
  return filterWordsByFeedback(
    allWords.value,
    feedbacks.value,
    wordLength.value
  );
});

const isAllGreen = computed(() => {
  if (!displayWord.value) return false;
  for (let i = 0; i < displayWord.value.length; i++) {
    if (getLetterState(i) !== "green") {
      return false;
    }
  }
  return true;
});

function loadWords() {
  if (!articleInput.value || !articleInput.value.trim()) {
    alert("Please enter article text content");
    return;
  }

  loading.value = true;

  // Use setTimeout to ensure UI updates
  setTimeout(() => {
    try {
      const words = extractWordsFromText(articleInput.value);
      allWords.value = words;
      if (words.length === 0) {
        alert("No words extracted. Please check your input.");
      }
    } catch (error) {
      console.error("Failed to extract words:", error);
      alert("Failed to extract words: " + (error as Error).message);
    } finally {
      loading.value = false;
    }
  }, 10);
}

function startNewGame() {
  if (wordLength.value < 3) {
    alert("Word length must be at least 3");
    return;
  }

  // 使用有效长度（单数形式的长度）进行过滤
  const availableWords = allWords.value.filter(
    (w) => getEffectiveLength(w) === wordLength.value
  );
  if (availableWords.length === 0) {
    alert(`No words found with length ${wordLength.value}`);
    return;
  }

  const word = getRandomWord(availableWords);
  if (word) {
    currentWord.value = word;
    letterStates.value.clear();
    feedbacks.value = [];
    guessedWords.value = [];
  }
}

function getLetterState(index: number): LetterState {
  return letterStates.value.get(index) || "none";
}

function toggleLetterState(index: number) {
  if (!currentWord.value) return;

  const currentState = getLetterState(index);
  let nextState: LetterState;

  switch (currentState) {
    case "none":
      nextState = "gray";
      break;
    case "gray":
      nextState = "yellow";
      break;
    case "yellow":
      nextState = "green";
      break;
    case "green":
      nextState = "none";
      break;
    default:
      nextState = "gray";
  }

  letterStates.value.set(index, nextState);
}

function getLetterClass(index: number): string {
  const state = getLetterState(index);
  return `letter-${state}`;
}

function getStateIcon(state: LetterState): string {
  switch (state) {
    case "gray":
      return "⚫";
    case "yellow":
      return "🟡";
    case "green":
      return "🟢";
    default:
      return "";
  }
}

function getNextWord() {
  if (!currentWord.value || !displayWord.value) return;

  // 保存当前反馈（使用单数形式）
  const feedback: LetterFeedback[] = [];
  for (let i = 0; i < displayWord.value.length; i++) {
    const state = getLetterState(i);
    if (state !== "none") {
      feedback.push({
        letter: displayWord.value[i],
        position: i,
        state: state,
      });
    }
  }

  // Check if all letters have feedback
  if (feedback.length === 0) {
    alert("Please set at least one letter's state");
    return;
  }

  if (feedback.length < displayWord.value.length) {
    const confirmContinue = confirm(
      `You only set ${feedback.length}/${displayWord.value.length} letters' states. Continue?`
    );
    if (!confirmContinue) {
      return;
    }
  }

  if (feedback.length > 0) {
    feedbacks.value.push(feedback);
    guessedWords.value.push(currentWord.value);
  }

  // Get next word
  const nextWord = getRandomWord(filteredWords.value);
  if (nextWord) {
    currentWord.value = nextWord;
    letterStates.value.clear();
  } else {
    console.log("Current feedback:", feedback);
    console.log("All feedbacks:", feedbacks.value);
    console.log(
      "Words before filtering:",
      allWords.value.filter((w) => w.length === wordLength.value).length
    );
    alert(
      `No matching words found.\n\nTried ${guessedWords.value.length} words.\nPlease check if feedback is correct, or try clearing and starting over.`
    );
  }
}

function selectWord(word: string) {
  // 如果单词已经在历史中，则重新开始
  const index = guessedWords.value.indexOf(word);
  if (index >= 0) {
    restartWithWord(word);
  } else {
    // 新单词，直接设置
    currentWord.value = word;
    letterStates.value.clear();
  }
}

function restartWithWord(word: string) {
  currentWord.value = word;
  letterStates.value.clear();
  // 清除该单词之后的所有反馈，保留该单词本身
  const index = guessedWords.value.indexOf(word);
  if (index >= 0) {
    feedbacks.value = feedbacks.value.slice(0, index);
    guessedWords.value = guessedWords.value.slice(0, index + 1);
  } else {
    // 如果单词不在历史中，说明是从候选列表选择的新单词
    // 不需要清除历史
  }
}

function clearAll() {
  currentWord.value = null;
  letterStates.value.clear();
  feedbacks.value = [];
  guessedWords.value = [];
}

function clearHistory() {
  guessedWords.value = [];
  feedbacks.value = [];
  if (currentWord.value) {
    letterStates.value.clear();
  }
}

function toggleWordList() {
  showWordList.value = !showWordList.value;
}

function closeWordList() {
  showWordList.value = false;
}
</script>

<style scoped>
.app-container {
  background: #2d2d2d;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  color: #e0e0e0;
}

.title {
  text-align: center;
  color: #f0b90b;
  margin-bottom: 20px;
  font-size: 2.5em;
}

.daily-word-section {
  text-align: center;
  margin-bottom: 30px;
}

.daily-word-link {
  display: inline-block;
  padding: 12px 24px;
  background: #1f1f1f;
  border: 2px solid #f0b90b;
  border-radius: 8px;
  color: #f0b90b;
  text-decoration: none;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s;
}

.daily-word-link:hover {
  background: #f0b90b;
  color: #1a1a1a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(240, 185, 11, 0.3);
}

.input-section,
.length-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #1f1f1f;
  border-radius: 12px;
  border: 1px solid #3a3a3a;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-group label {
  font-weight: 600;
  color: #e0e0e0;
}

.input-group textarea,
.input-group input[type="number"] {
  padding: 12px;
  border: 2px solid #3a3a3a;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
  background: #1a1a1a;
  color: #e0e0e0;
}

.input-group textarea:focus,
.input-group input[type="number"]:focus {
  outline: none;
  border-color: #f0b90b;
}

.input-group button {
  padding: 12px 24px;
  background: #f0b90b;
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.input-group button:hover:not(:disabled) {
  background: #d4a308;
}

.input-group button:disabled {
  background: #3a3a3a;
  color: #666;
  cursor: not-allowed;
}

.word-count {
  margin-top: 10px;
  color: #a0a0a0;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.3s;
  text-decoration: underline;
}

.word-count:hover {
  color: #f0b90b;
}

.game-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #1f1f1f;
  border-radius: 12px;
  border: 1px solid #3a3a3a;
}

.word-display {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.letter-box {
  width: 60px;
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3px solid #3a3a3a;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: #1a1a1a;
  position: relative;
  color: #e0e0e0;
}

.letter-box:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.letter-box.letter-gray {
  background: #4f4f4f;
  border-color: #4f4f4f;
  color: white;
}

.letter-box.letter-yellow {
  background: #f0b90b;
  border-color: #f0b90b;
  color: white;
}

.letter-box.letter-green {
  background: #28a473;
  border-color: #28a473;
  color: white;
}

.letter {
  font-size: 24px;
  font-weight: bold;
}

.state-indicator {
  font-size: 12px;
  margin-top: 2px;
}

.state-legend {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #a0a0a0;
}

.legend-box {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.legend-box.gray {
  background: #4f4f4f;
}

.legend-box.yellow {
  background: #f0b90b;
}

.legend-box.green {
  background: #28a473;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
}

.actions button {
  padding: 12px 24px;
  background: #f0b90b;
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.actions button:hover:not(:disabled) {
  background: #d4a308;
}

.actions button:disabled {
  background: #3a3a3a;
  color: #666;
  cursor: not-allowed;
}

.clear-btn {
  background: #e74c3c !important;
  color: white !important;
}

.clear-btn:hover:not(:disabled) {
  background: #c0392b !important;
}

.word-list {
  margin-top: 20px;
  padding: 15px;
  background: #1a1a1a;
  border-radius: 8px;
  border: 1px solid #3a3a3a;
}

.word-list-header {
  font-weight: 600;
  margin-bottom: 10px;
  color: #e0e0e0;
}

.word-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.word-item {
  padding: 8px 16px;
  background: #2d2d2d;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  color: #e0e0e0;
}

.word-item:hover {
  background: #f0b90b;
  color: #1a1a1a;
  border-color: #f0b90b;
  transform: translateY(-2px);
}

.success-message {
  text-align: center;
  padding: 20px;
  background: #1a3a2a;
  border: 2px solid #28a473;
  border-radius: 8px;
  color: #28a473;
  font-size: 18px;
  font-weight: 600;
  margin-top: 20px;
}

.error-message {
  text-align: center;
  padding: 20px;
  background: #3a1a1a;
  border: 2px solid #e74c3c;
  border-radius: 8px;
  color: #e74c3c;
  font-size: 16px;
  margin-top: 20px;
}

.history-section {
  padding: 20px;
  background: #1f1f1f;
  border-radius: 12px;
  border: 1px solid #3a3a3a;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-weight: 600;
  color: #e0e0e0;
}

.clear-history-btn {
  padding: 8px 16px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.clear-history-btn:hover {
  background: #c0392b;
}

.history-words {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.history-word {
  padding: 10px 20px;
  background: #2d2d2d;
  border: 2px solid #f0b90b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  color: #e0e0e0;
}

.history-word:hover {
  background: #f0b90b;
  color: #1a1a1a;
  transform: translateY(-2px);
}

.word-list-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.word-list-modal-content {
  background: #2d2d2d;
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
  border: 1px solid #3a3a3a;
}

.word-list-modal-header {
  padding: 20px;
  border-bottom: 2px solid #3a3a3a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.word-list-modal-header h2 {
  margin: 0;
  color: #e0e0e0;
  font-size: 1.5em;
}

.close-btn {
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}

.close-btn:hover {
  background: #c0392b;
}

.word-list-filter {
  padding: 15px 20px;
  border-bottom: 1px solid #3a3a3a;
  display: flex;
  align-items: center;
  gap: 10px;
}

.word-list-filter-input {
  flex: 1;
  padding: 10px 15px;
  background: #1a1a1a;
  border: 2px solid #3a3a3a;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 16px;
  transition: border-color 0.3s;
}

.word-list-filter-input:focus {
  outline: none;
  border-color: #f0b90b;
}

.filter-count {
  color: #a0a0a0;
  font-size: 14px;
  white-space: nowrap;
}

.word-list-modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.word-list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.word-list-item {
  padding: 10px;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
  color: #e0e0e0;
  transition: all 0.2s;
}

.word-list-item:hover {
  background: #f0b90b;
  color: #1a1a1a;
  border-color: #f0b90b;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .app-container {
    padding: 20px;
  }

  .title {
    font-size: 2em;
  }

  .letter-box {
    width: 50px;
    height: 50px;
  }

  .letter {
    font-size: 20px;
  }

  .state-legend {
    flex-direction: column;
    align-items: flex-start;
  }

  .word-list-modal {
    padding: 10px;
  }

  .word-list-modal-content {
    max-height: 90vh;
  }

  .word-list-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }

  .word-list-item {
    padding: 8px;
    font-size: 14px;
  }
}
</style>
