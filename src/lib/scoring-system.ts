// src/lib/scoring-system.ts

export interface VacancyScore {
  score: number;
  matchedTokens: Array<{
    token_id: number;
    phrase_norm: string;
    weight: number;
  }>;
  reasons: string[];
}

export interface VacancyData {
  id: string;
  title: string;
  company: string;
  salary_from?: number;
  salary_to?: number;
  is_remote?: boolean;
  description: string;
  source: 'geekjob' | 'hh';
}

export interface ToxicToken {
  id: number;
  phrase_norm: string;
  type: 'phrase' | 'regex';
  weight: number;
}

export interface CompanyStats {
  company: string;
  hides_count: number;
  unique_users: number;
}

/**
 * Расчет скора вакансии
 */
export function calculateVacancyScore(
  vacancy: VacancyData,
  toxicTokens: ToxicToken[],
  companyStats: CompanyStats[] = [],
  userFilters: number[] = []
): VacancyScore {
  let score = 0;
  const reasons: string[] = [];
  const matchedTokens: Array<{
    token_id: number;
    phrase_norm: string;
    weight: number;
  }> = [];

  // 1. Положительные сигналы
  if (vacancy.salary_from || vacancy.salary_to) {
    score += 1;
    reasons.push('Указана зарплата');
  }

  if (vacancy.is_remote) {
    score += 1;
    reasons.push('Удаленная работа');
  }

  // 2. Поиск токсичных токенов
  const { findToxicMatches } = require('./text-normalization');
  const matches = findToxicMatches(vacancy.description, toxicTokens);

  for (const match of matches) {
    // Проверяем, включен ли фильтр пользователем
    if (userFilters.includes(match.token_id)) {
      score -= match.weight;
      matchedTokens.push(match);
      
      if (match.weight > 0) {
        reasons.push(`Токсичный токен: ${match.phrase_norm} (-${match.weight})`);
      } else {
        reasons.push(`Положительный сигнал: ${match.phrase_norm} (${Math.abs(match.weight)})`);
      }
    }
  }

  // 3. Репутационный штраф компании
  const companyStat = companyStats.find(stat => stat.company === vacancy.company);
  if (companyStat && companyStat.unique_users > 0) {
    const companyPenalty = Math.min(2, Math.log10(1 + companyStat.hides_count));
    score -= companyPenalty;
    reasons.push(`Репутационный штраф компании: -${companyPenalty.toFixed(1)}`);
  }

  return {
    score: Math.round(score * 10) / 10, // Округляем до 1 знака
    matchedTokens,
    reasons
  };
}

/**
 * Получение рекомендаций для пользователя
 */
export function getFilterSuggestions(
  globalStats: Array<{
    token_id: number;
    phrase_norm: string;
    hides_count: number;
    unique_users: number;
  }>,
  minUsers: number = 50
): Array<{
  token_id: number;
  phrase_norm: string;
  hides_count: number;
  unique_users: number;
  recommendation_strength: number;
}> {
  return globalStats
    .filter(stat => stat.unique_users >= minUsers)
    .map(stat => ({
      ...stat,
      recommendation_strength: Math.min(5, Math.log10(1 + stat.hides_count))
    }))
    .sort((a, b) => b.recommendation_strength - a.recommendation_strength);
}

/**
 * Применение пользовательских фильтров к списку вакансий
 */
export function applyUserFilters(
  vacancies: VacancyData[],
  toxicTokens: ToxicToken[],
  companyStats: CompanyStats[],
  userFilters: number[],
  scoreThreshold: number = 0
): Array<VacancyData & { score: number; matchedTokens: any[]; reasons: string[] }> {
  return vacancies
    .map(vacancy => {
      const scoreResult = calculateVacancyScore(vacancy, toxicTokens, companyStats, userFilters);
      return {
        ...vacancy,
        score: scoreResult.score,
        matchedTokens: scoreResult.matchedTokens,
        reasons: scoreResult.reasons
      };
    })
    .filter(vacancy => vacancy.score >= scoreThreshold)
    .sort((a, b) => b.score - a.score);
}

/**
 * Обновление статистики токенов
 */
export function updateTokenStats(
  tokenId: number,
  action: 'hide' | 'show',
  userId: string
): void {
  // Эта функция будет вызываться при действиях пользователя
  // В реальной реализации здесь будет запрос к базе данных
  console.log(`Updating stats for token ${tokenId}, action: ${action}, user: ${userId}`);
}

/**
 * Получение объяснения скора
 */
export function getScoreExplanation(score: number, reasons: string[]): string {
  if (score >= 2) {
    return 'Отличная вакансия!';
  } else if (score >= 0) {
    return 'Нормальная вакансия';
  } else if (score >= -2) {
    return 'Сомнительная вакансия';
  } else {
    return 'Плохая вакансия';
  }
}

