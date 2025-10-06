// src/lib/database/service.ts
import { supabase, isSupabaseConfigured } from './config';
import { normalizeText } from '../text-normalization';
import { calculateVacancyScore, VacancyData, ToxicToken, CompanyStats } from '../scoring-system';
import { cache } from '../cache/redis';

export interface DatabaseVacancy {
  id: number;
  source: string;
  url: string;
  title: string;
  company: string;
  city?: string;
  salary_from?: number;
  salary_to?: number;
  is_remote?: boolean;
  description_raw?: string;
  description_normalized?: string;
  tokens?: any;
  scraped_at: string;
  score?: number;
  matched_tokens?: any;
}

export interface ToxicTokenDB {
  id: number;
  phrase_raw: string;
  phrase_norm: string;
  type: 'phrase' | 'regex';
  weight: number;
  examples: any;
  created_at: string;
}

export interface UserFilter {
  id: number;
  user_id: string;
  token_id: number;
  action: 'hide' | 'show';
  created_at: string;
}

export interface GlobalTokenStats {
  id: number;
  token_id: number;
  hides_count: number;
  unique_users: number;
  last_used_at: string;
}

/**
 * Сохранение вакансии в базу данных с нормализацией
 */
export async function saveVacancy(vacancy: {
  source: string;
  url: string;
  title: string;
  company: string;
  city?: string;
  salary_from?: number;
  salary_to?: number;
  is_remote?: boolean;
  description?: string;
}): Promise<DatabaseVacancy | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.log('⚠️ Supabase не настроен, пропускаем сохранение в БД');
    return null;
  }

  try {
    // Нормализуем описание если есть
    let normalizedData = null;
    if (vacancy.description) {
      normalizedData = normalizeText(vacancy.description);
    }

    const { data, error } = await supabase
      .from('vacancies')
      .insert({
        source: vacancy.source,
        url: vacancy.url,
        title: vacancy.title,
        company: vacancy.company,
        city: vacancy.city,
        salary_from: vacancy.salary_from,
        salary_to: vacancy.salary_to,
        is_remote: vacancy.is_remote,
        description_raw: vacancy.description,
        description_normalized: normalizedData?.normalized,
        tokens: normalizedData?.tokens
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения вакансии:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Ошибка при сохранении вакансии:', error);
    return null;
  }
}

/**
 * Получение вакансий с фильтрацией и скорингом
 */
export async function getVacanciesWithScoring(
  query: string,
  filters: {
    source?: string[];
    minSalary?: number;
    remote?: boolean;
    scoreMin?: number;
  },
  userId: string = 'anonymous'
): Promise<{
  vacancies: Array<DatabaseVacancy & { score: number; matchedTokens: any[]; reasons: string[] }>;
  total: number;
}> {
  if (!isSupabaseConfigured || !supabase) {
    console.log('⚠️ Supabase не настроен, возвращаем пустой результат');
    return { vacancies: [], total: 0 };
  }

  try {
    // Получаем токсичные токены
    const { data: toxicTokens, error: tokensError } = await supabase
      .from('toxic_tokens')
      .select('*');

    if (tokensError) {
      console.error('Ошибка получения токсичных токенов:', tokensError);
      return { vacancies: [], total: 0 };
    }

    // Получаем пользовательские фильтры
    const { data: userFilters, error: filtersError } = await supabase
      .from('user_filters')
      .select('token_id, action')
      .eq('user_id', userId)
      .eq('action', 'hide');

    if (filtersError) {
      console.error('Ошибка получения пользовательских фильтров:', filtersError);
    }

    // Получаем статистику компаний
    const { data: companyStats, error: statsError } = await supabase
      .from('global_token_stats')
      .select(`
        token_id,
        hides_count,
        unique_users
      `);

    if (statsError) {
      console.error('Ошибка получения статистики:', statsError);
    }

    // Получаем вакансии
    let queryBuilder = supabase
      .from('vacancies')
      .select('*')
      .order('scraped_at', { ascending: false });

    // Применяем фильтры
    if (filters.source && filters.source.length > 0) {
      queryBuilder = queryBuilder.in('source', filters.source);
    }

    if (filters.minSalary) {
      queryBuilder = queryBuilder.or(`salary_from.gte.${filters.minSalary},salary_to.gte.${filters.minSalary}`);
    }

    if (filters.remote !== undefined) {
      queryBuilder = queryBuilder.eq('is_remote', filters.remote);
    }

    const { data: vacancies, error: vacanciesError } = await queryBuilder;

    if (vacanciesError) {
      console.error('Ошибка получения вакансий:', vacanciesError);
      return { vacancies: [], total: 0 };
    }

    // Применяем скоринг
    const scoredVacancies = vacancies.map(vacancy => {
      const vacancyData: VacancyData = {
        id: vacancy.id.toString(),
        title: vacancy.title,
        company: vacancy.company,
        salary_from: vacancy.salary_from,
        salary_to: vacancy.salary_to,
        is_remote: vacancy.is_remote,
        description: vacancy.description_raw || '',
        source: vacancy.source as 'geekjob' | 'hh'
      };

      const toxicTokensList: ToxicToken[] = toxicTokens?.map(token => ({
        id: token.id,
        phrase_norm: token.phrase_norm,
        type: token.type,
        weight: token.weight
      })) || [];

      const companyStatsList: CompanyStats[] = companyStats?.map(stat => ({
        company: vacancy.company,
        hides_count: stat.hides_count,
        unique_users: stat.unique_users
      })) || [];

      const userFilterIds = userFilters?.map(f => f.token_id) || [];

      const scoreResult = calculateVacancyScore(
        vacancyData,
        toxicTokensList,
        companyStatsList,
        userFilterIds
      );

      return {
        ...vacancy,
        score: scoreResult.score,
        matchedTokens: scoreResult.matchedTokens,
        reasons: scoreResult.reasons
      };
    });

    // Фильтруем по порогу скора
    const filteredVacancies = scoredVacancies.filter(v => 
      filters.scoreMin === undefined || v.score >= filters.scoreMin
    );

    return {
      vacancies: filteredVacancies,
      total: filteredVacancies.length
    };

  } catch (error) {
    console.error('Ошибка при получении вакансий с скорингом:', error);
    return { vacancies: [], total: 0 };
  }
}

/**
 * Получение рекомендаций фильтров
 */
export async function getFilterSuggestions(minUsers: number = 50): Promise<Array<{
  token_id: number;
  phrase_norm: string;
  hides_count: number;
  unique_users: number;
  recommendation_strength: number;
}>> {
  if (!isSupabaseConfigured || !supabase) {
    console.log('⚠️ Supabase не настроен, возвращаем моковые рекомендации');
    return [
      {
        token_id: 1,
        phrase_norm: 'без зарплат',
        hides_count: 1203,
        unique_users: 156,
        recommendation_strength: 4.2
      },
      {
        token_id: 2,
        phrase_norm: 'молод динамичн коллектив',
        hides_count: 892,
        unique_users: 134,
        recommendation_strength: 3.8
      }
    ];
  }

  const cacheKey = `filter_suggestions_${minUsers}`;
  
  // Проверяем кэш
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('📦 Получены рекомендации из кэша');
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('global_token_stats')
      .select(`
        token_id,
        hides_count,
        unique_users,
        toxic_tokens!inner(phrase_norm)
      `)
      .gte('unique_users', minUsers)
      .order('hides_count', { ascending: false });

    if (error) {
      console.error('Ошибка получения рекомендаций:', error);
      return [];
    }

    const result = data.map(stat => ({
      token_id: stat.token_id,
      phrase_norm: (stat.toxic_tokens as any).phrase_norm,
      hides_count: stat.hides_count,
      unique_users: stat.unique_users,
      recommendation_strength: Math.min(5, Math.log10(1 + stat.hides_count))
    }));

    // Кэшируем на 15 минут
    cache.set(cacheKey, result, 15 * 60 * 1000);

    return result;

  } catch (error) {
    console.error('Ошибка при получении рекомендаций:', error);
    return [];
  }
}

/**
 * Сохранение пользовательского фильтра
 */
export async function saveUserFilter(
  userId: string,
  tokenId: number,
  action: 'hide' | 'show'
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    console.log('⚠️ Supabase не настроен, фильтр не сохранен');
    return true; // Возвращаем true, чтобы UI не сломался
  }

  try {
    // Сначала удаляем существующий фильтр
    await supabase
      .from('user_filters')
      .delete()
      .eq('user_id', userId)
      .eq('token_id', tokenId);

    // Если action = 'hide', добавляем новый фильтр
    if (action === 'hide') {
      const { error } = await supabase
        .from('user_filters')
        .insert({
          user_id: userId,
          token_id: tokenId,
          action: 'hide'
        });

      if (error) {
        console.error('Ошибка сохранения фильтра:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Ошибка при сохранении фильтра:', error);
    return false;
  }
}

/**
 * Сохранение действия пользователя
 */
export async function saveUserAction(
  userId: string,
  vacancyId: number,
  action: 'hide_vacancy' | 'hide_company' | 'thumbs_up' | 'thumbs_down'
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    console.log('⚠️ Supabase не настроен, действие не сохранено');
    return true; // Возвращаем true, чтобы UI не сломался
  }

  try {
    const { error } = await supabase
      .from('user_actions')
      .insert({
        user_id: userId,
        vacancy_id: vacancyId,
        action
      });

    if (error) {
      console.error('Ошибка сохранения действия:', error);
      return false;
    }

    // Обновляем статистику токенов если это связано с токсичными фразами
    if (action === 'hide_vacancy' || action === 'thumbs_down') {
      // TODO: Обновить статистику токенов
      console.log('Обновляем статистику токенов для вакансии:', vacancyId);
    }

    return true;
  } catch (error) {
    console.error('Ошибка при сохранении действия:', error);
    return false;
  }
}

/**
 * Получение пользовательских фильтров
 */
export async function getUserFilters(userId: string): Promise<UserFilter[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.log('⚠️ Supabase не настроен, возвращаем пустые фильтры');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_filters')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Ошибка получения фильтров пользователя:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Ошибка при получении фильтров пользователя:', error);
    return [];
  }
}
