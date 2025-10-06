import { analyzeVacancy, analyzeSearchQuery, matchVacancyToQuery, VacancyAnalysis, SearchQueryAnalysis } from './gemini-service';
import { Employment, Specialization } from '@/lib/types/employment';

// Расширенный интерфейс вакансии с AI-анализом
export interface EnhancedVacancy {
  id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  salary: {
    min?: number;
    max?: number;
    currency: string;
  };
  url: string;
  source: string;
  publishedAt: string;
  
  // AI-анализ
  aiAnalysis: VacancyAnalysis;
  relevanceScore: number;
  matchReasons: string[];
  missingRequirements: string[];
  extraBenefits: string[];
}

// Интерфейс для умного поиска
export interface SmartSearchResult {
  vacancies: EnhancedVacancy[];
  total: number;
  queryAnalysis: SearchQueryAnalysis;
  recommendations: {
    toLearn: string[];
    careerPath: string[];
  };
  filters: {
    applied: string[];
    suggested: string[];
  };
}

/**
 * Улучшенный парсер с AI-анализом
 */
export class EnhancedVacancyParser {
  private aiEnabled: boolean;
  
  constructor(aiEnabled: boolean = true) {
    this.aiEnabled = aiEnabled;
  }

  /**
   * Парсит и анализирует вакансии с помощью AI
   */
  async parseAndAnalyzeVacancies(
    rawVacancies: Array<{
      id: string;
      title: string;
      description: string;
      company: string;
      location: string;
      salary?: { min?: number; max?: number; currency?: string };
      url: string;
      source: string;
      publishedAt: string;
    }>,
    searchQuery: string
  ): Promise<EnhancedVacancy[]> {
    console.log(`🧠 Начинаем AI-анализ ${rawVacancies.length} вакансий...`);
    
    const enhancedVacancies: EnhancedVacancy[] = [];
    
    for (const vacancy of rawVacancies) {
      try {
        // AI-анализ вакансии
        const aiAnalysis = this.aiEnabled 
          ? await analyzeVacancy(vacancy.title, vacancy.description, vacancy.company)
          : this.getFallbackAnalysis(vacancy);
        
        // Сравнение с поисковым запросом
        const match = this.aiEnabled
          ? await matchVacancyToQuery(vacancy, searchQuery)
          : this.getFallbackMatch();
        
        const enhancedVacancy: EnhancedVacancy = {
          ...vacancy,
          salary: typeof vacancy.salary === 'string' 
            ? vacancy.salary 
            : { ...vacancy.salary, currency: vacancy.salary?.currency || 'RUB' },
          aiAnalysis,
          relevanceScore: match.relevanceScore,
          matchReasons: match.matchReasons,
          missingRequirements: match.missingRequirements,
          extraBenefits: match.extraBenefits
        };
        
        enhancedVacancies.push(enhancedVacancy);
        
        console.log(`✅ Проанализирована вакансия: ${vacancy.title} (релевантность: ${match.relevanceScore}%)`);
        
      } catch (error) {
        console.error(`❌ Ошибка анализа вакансии ${vacancy.title}:`, error);
        
        // Добавляем вакансию с fallback данными
        const fallbackVacancy: EnhancedVacancy = {
          ...vacancy,
          salary: typeof vacancy.salary === 'string' 
            ? vacancy.salary 
            : { ...vacancy.salary, currency: vacancy.salary?.currency || 'RUB' },
          aiAnalysis: this.getFallbackAnalysis(vacancy),
          relevanceScore: 50,
          matchReasons: [],
          missingRequirements: [],
          extraBenefits: []
        };
        
        enhancedVacancies.push(fallbackVacancy);
      }
    }
    
    console.log(`🎉 AI-анализ завершен! Обработано ${enhancedVacancies.length} вакансий`);
    return enhancedVacancies;
  }

  /**
   * Умный поиск с AI-анализом
   */
  async smartSearch(
    query: string,
    rawVacancies: Array<{
      id: string;
      title: string;
      description: string;
      company: string;
      location: string;
      salary?: { min?: number; max?: number; currency?: string };
      url: string;
      source: string;
      publishedAt: string;
    }>,
    filters?: {
      specialization?: Specialization[];
      employment?: Employment[];
      experience?: string[];
      technologies?: string[];
      minSalary?: number;
      maxSalary?: number;
      remote?: boolean;
    }
  ): Promise<SmartSearchResult> {
    console.log(`🔍 Умный поиск: "${query}"`);
    
    // Анализ поискового запроса
    const queryAnalysis = this.aiEnabled
      ? await analyzeSearchQuery(query)
      : this.getFallbackQueryAnalysis(query);
    
    // Парсинг и анализ вакансий
    const enhancedVacancies = await this.parseAndAnalyzeVacancies(rawVacancies, query);
    
    // Применение фильтров
    let filteredVacancies = enhancedVacancies;
    
    if (filters) {
      filteredVacancies = this.applyFilters(enhancedVacancies, filters);
    }
    
    // Сортировка по релевантности
    filteredVacancies.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Генерация рекомендаций
    const recommendations = await this.generateSearchRecommendations(
      queryAnalysis,
      filteredVacancies.slice(0, 10) // Топ-10 для рекомендаций
    );
    
    // Предложения фильтров
    const suggestedFilters = this.generateFilterSuggestions(queryAnalysis, filteredVacancies);
    
    return {
      vacancies: filteredVacancies,
      total: filteredVacancies.length,
      queryAnalysis,
      recommendations,
      filters: {
        applied: this.getAppliedFilters(filters),
        suggested: suggestedFilters
      }
    };
  }

  /**
   * Применяет фильтры к вакансиям
   */
  private applyFilters(
    vacancies: EnhancedVacancy[],
    filters: {
      specialization?: Specialization[];
      employment?: Employment[];
      experience?: string[];
      technologies?: string[];
      minSalary?: number;
      maxSalary?: number;
      remote?: boolean;
    }
  ): EnhancedVacancy[] {
    return vacancies.filter(vacancy => {
      // Фильтр по специализации
      if (filters.specialization && filters.specialization.length > 0) {
        if (!filters.specialization.includes(vacancy.aiAnalysis.specialization)) {
          return false;
        }
      }
      
      // Фильтр по типу занятости
      if (filters.employment && filters.employment.length > 0) {
        const hasMatchingEmployment = filters.employment.some(emp => 
          vacancy.aiAnalysis.employment.includes(emp)
        );
        if (!hasMatchingEmployment) {
          return false;
        }
      }
      
      // Фильтр по опыту
      if (filters.experience && filters.experience.length > 0) {
        if (!filters.experience.includes(vacancy.aiAnalysis.experience)) {
          return false;
        }
      }
      
      // Фильтр по технологиям
      if (filters.technologies && filters.technologies.length > 0) {
        const hasMatchingTech = filters.technologies.some(tech =>
          vacancy.aiAnalysis.technologies.some(vacancyTech =>
            vacancyTech.toLowerCase().includes(tech.toLowerCase())
          )
        );
        if (!hasMatchingTech) {
          return false;
        }
      }
      
      // Фильтр по зарплате
      if (filters.minSalary && vacancy.aiAnalysis.salary.min) {
        if (vacancy.aiAnalysis.salary.min < filters.minSalary) {
          return false;
        }
      }
      
      if (filters.maxSalary && vacancy.aiAnalysis.salary.max) {
        if (vacancy.aiAnalysis.salary.max > filters.maxSalary) {
          return false;
        }
      }
      
      // Фильтр по удаленной работе
      if (filters.remote !== undefined) {
        if (vacancy.aiAnalysis.remote !== filters.remote) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Генерирует рекомендации для поиска
   */
  private async generateSearchRecommendations(
    queryAnalysis: SearchQueryAnalysis,
    topVacancies: EnhancedVacancy[]
  ): Promise<{ toLearn: string[]; careerPath: string[] }> {
    if (!this.aiEnabled) {
      return { toLearn: [], careerPath: [] };
    }
    
    try {
      // Анализируем топовые вакансии для рекомендаций
      const technologies = topVacancies.flatMap(v => v.aiAnalysis.technologies);
      const experiences = topVacancies.map(v => v.aiAnalysis.experience);
      
      // Уникальные технологии
      const uniqueTechnologies = [...new Set(technologies)].slice(0, 5);
      
      // Рекомендации по карьерному пути
      const careerPath = this.generateCareerPath(experiences, queryAnalysis.specialization);
      
      return {
        toLearn: uniqueTechnologies,
        careerPath
      };
      
    } catch (error) {
      console.error('❌ Ошибка генерации рекомендаций:', error);
      return { toLearn: [], careerPath: [] };
    }
  }

  /**
   * Генерирует предложения фильтров
   */
  private generateFilterSuggestions(
    queryAnalysis: SearchQueryAnalysis,
    vacancies: EnhancedVacancy[]
  ): string[] {
    const suggestions: string[] = [];
    
    // Анализируем популярные специализации
    const specializations = vacancies.map(v => v.aiAnalysis.specialization);
    const specializationCounts = specializations.reduce((acc, spec) => {
      acc[spec] = (acc[spec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topSpecializations = Object.entries(specializationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([spec]) => spec);
    
    suggestions.push(...topSpecializations.map(spec => `Специализация: ${spec}`));
    
    // Анализируем популярные технологии
    const technologies = vacancies.flatMap(v => v.aiAnalysis.technologies);
    const techCounts = technologies.reduce((acc, tech) => {
      acc[tech] = (acc[tech] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topTechnologies = Object.entries(techCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tech]) => tech);
    
    suggestions.push(...topTechnologies.map(tech => `Технология: ${tech}`));
    
    return suggestions;
  }

  /**
   * Генерирует карьерный путь
   */
  private generateCareerPath(experiences: string[], specializations: Specialization[]): string[] {
    const paths: string[] = [];
    
    if (specializations.includes('frontend')) {
      paths.push('Junior Frontend → Middle Frontend → Senior Frontend → Tech Lead');
    }
    
    if (specializations.includes('backend')) {
      paths.push('Junior Backend → Middle Backend → Senior Backend → Architect');
    }
    
    if (specializations.includes('fullstack')) {
      paths.push('Junior Fullstack → Middle Fullstack → Senior Fullstack → CTO');
    }
    
    return paths;
  }

  /**
   * Получает примененные фильтры
   */
  private getAppliedFilters(filters?: any): string[] {
    if (!filters) return [];
    
    const applied: string[] = [];
    
    if (filters.specialization) applied.push(`Специализация: ${filters.specialization.join(', ')}`);
    if (filters.employment) applied.push(`Занятость: ${filters.employment.join(', ')}`);
    if (filters.experience) applied.push(`Опыт: ${filters.experience.join(', ')}`);
    if (filters.technologies) applied.push(`Технологии: ${filters.technologies.join(', ')}`);
    if (filters.minSalary) applied.push(`Мин. зарплата: ${filters.minSalary}`);
    if (filters.maxSalary) applied.push(`Макс. зарплата: ${filters.maxSalary}`);
    if (filters.remote !== undefined) applied.push(`Удаленка: ${filters.remote ? 'Да' : 'Нет'}`);
    
    return applied;
  }

  /**
   * Fallback анализ вакансии
   */
  private getFallbackAnalysis(vacancy: any): VacancyAnalysis {
    return {
      specialization: 'other',
      employment: ['full_time'],
      experience: 'middle',
      technologies: [],
      salary: { currency: 'RUB' },
      remote: false,
      requirements: [],
      benefits: [],
      relevanceScore: 50,
      summary: 'Анализ недоступен'
    };
  }

  /**
   * Fallback анализ запроса
   */
  private getFallbackQueryAnalysis(query: string): SearchQueryAnalysis {
    return {
      intent: query,
      specialization: ['other'],
      employment: ['full_time'],
      experience: ['middle'],
      technologies: [],
      location: '',
      salary: {},
      remote: false
    };
  }

  /**
   * Fallback сравнение
   */
  private getFallbackMatch(): any {
    return {
      relevanceScore: 50,
      matchReasons: [],
      missingRequirements: [],
      extraBenefits: []
    };
  }
}

// Экспорт для использования в других модулях
export const enhancedParser = new EnhancedVacancyParser();

