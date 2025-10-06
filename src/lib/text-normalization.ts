// src/lib/text-normalization.ts

export interface NormalizedText {
  normalized: string;
  tokens: string[];
}

/**
 * Нормализация текста для поиска токсичных токенов
 */
export function normalizeText(text: string): NormalizedText {
  if (!text) return { normalized: '', tokens: [] };

  // 1. Базовая очистка
  let normalized = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0400-\u04FF]/g, ' ') // Удаляем все кроме букв, цифр, пробелов и кириллицы
    .replace(/\s+/g, ' ') // Множественные пробелы в один
    .trim();

  // 2. Удаление HTML тегов и эмодзи
  normalized = normalized
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 3. Простая лемматизация (базовая)
  normalized = lemmatizeText(normalized);

  // 4. Токенизация
  const tokens = tokenizeText(normalized);

  return {
    normalized,
    tokens
  };
}

/**
 * Простая лемматизация для русского и английского текста
 */
function lemmatizeText(text: string): string {
  // Базовые правила лемматизации
  const lemmatizationRules = [
    // Русские окончания
    { pattern: /(ый|ая|ое|ые|ого|ой|ому|ому|ым|ым|ом|ом|ую|ую|ых|ых|ыми|ыми|ых|ых)\b/g, replacement: '' },
    { pattern: /(ая|ое|ые|ого|ой|ому|ому|ым|ым|ом|ом|ую|ую|ых|ых|ыми|ыми|ых|ых)\b/g, replacement: '' },
    { pattern: /(ия|ии|ию|ией|ий|ия|ии|ию|ией)\b/g, replacement: '' },
    { pattern: /(ов|ов|ам|ами|ах|ах)\b/g, replacement: '' },
    { pattern: /(ей|ей|ям|ями|ях|ях)\b/g, replacement: '' },
    { pattern: /(ом|ом|ем|ем|ой|ой|ей|ей)\b/g, replacement: '' },
    { pattern: /(у|у|ю|ю|е|е|о|о|а|а|я|я)\b/g, replacement: '' },
    
    // Английские окончания
    { pattern: /(ing|ed|er|est|ly|s|es|ies|ied|ying)\b/g, replacement: '' },
    { pattern: /(tion|sion|ness|ment|ful|less|able|ible)\b/g, replacement: '' },
    
    // Общие сокращения
    { pattern: /\b(не|без|с|по|от|до|для|при|над|под|за|про|через|между|среди|вокруг|около|вместо|вследствие|благодаря|согласно|вопреки|навстречу|наперекор|наперерез|наперехват|наперегонки|наперебой|наперевес|наперекор|наперехват|наперегонки|наперебой|наперевес)\b/g, replacement: '' },
  ];

  let lemmatized = text;
  for (const rule of lemmatizationRules) {
    lemmatized = lemmatized.replace(rule.pattern, rule.replacement);
  }

  return lemmatized.replace(/\s+/g, ' ').trim();
}

/**
 * Токенизация текста с созданием n-грамм
 */
function tokenizeText(text: string): string[] {
  const words = text.split(/\s+/).filter(word => word.length > 2);
  const tokens: string[] = [];

  // Добавляем отдельные слова
  tokens.push(...words);

  // Создаем биграммы (2-граммы)
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]} ${words[i + 1]}`);
  }

  // Создаем триграммы (3-граммы)
  for (let i = 0; i < words.length - 2; i++) {
    tokens.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  // Создаем 4-граммы
  for (let i = 0; i < words.length - 3; i++) {
    tokens.push(`${words[i]} ${words[i + 1]} ${words[i + 2]} ${words[i + 3]}`);
  }

  return tokens;
}

/**
 * Проверка совпадения токсичного токена с текстом
 */
export function matchToxicToken(text: string, token: string, type: 'phrase' | 'regex' = 'phrase'): boolean {
  if (type === 'regex') {
    try {
      const regex = new RegExp(token, 'i');
      return regex.test(text);
    } catch {
      return false;
    }
  }

  // Для фраз ищем точное совпадение в нормализованном тексте
  const normalized = normalizeText(text);
  return normalized.normalized.includes(token.toLowerCase()) || 
         normalized.tokens.includes(token.toLowerCase());
}

/**
 * Поиск всех совпадений токсичных токенов в тексте
 */
export function findToxicMatches(text: string, toxicTokens: Array<{
  id: number;
  phrase_norm: string;
  type: 'phrase' | 'regex';
  weight: number;
}>): Array<{
  token_id: number;
  phrase_norm: string;
  weight: number;
}> {
  const matches: Array<{
    token_id: number;
    phrase_norm: string;
    weight: number;
  }> = [];

  for (const token of toxicTokens) {
    if (matchToxicToken(text, token.phrase_norm, token.type)) {
      matches.push({
        token_id: token.id,
        phrase_norm: token.phrase_norm,
        weight: token.weight
      });
    }
  }

  return matches;
}

