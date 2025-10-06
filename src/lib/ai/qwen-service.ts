// Qwen AI Service для анализа вакансий
import { Employment, Specialization } from '@/lib/types/employment';

// Интерфейсы для AI-анализа
export interface VacancyAnalysis {
  specialization: Specialization;
  employment: Employment[];
  experience: 'junior' | 'middle' | 'senior' | 'lead';
  technologies: string[];
  salary: {
    min?: number;
    max?: number;
    currency: string;
  };
  remote: boolean;
  requirements: string[];
  benefits: string[];
  relevanceScore: number; // 0-100
  summary: string;
}

export interface SearchQueryAnalysis {
  intent: string;
  specialization: Specialization[];
  employment: Employment[];
  experience: string[];
  technologies: string[];
  location: string;
  salary: {
    min?: number;
    max?: number;
  };
  remote: boolean;
}

// Конфигурация Qwen API
const QWEN_API_URL = 'https://api.cometapi.com/v1';
const QWEN_API_KEY = process.env.QWEN_API_KEY || '';

/**
 * Отправляет запрос к Qwen API
 */
async function callQwenAPI(messages: any[], model: string = 'deepseek-chat'): Promise<string> {
  try {
    const response = await fetch(`${QWEN_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Qwen API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка Qwen API:', error);
    throw error;
  }
}

/**
 * Анализирует вакансию с помощью Qwen
 */
export async function analyzeVacancyWithQwen(
  title: string,
  description: string,
  company: string
): Promise<VacancyAnalysis> {
  try {
    const prompt = `
Проанализируй вакансию и верни JSON с анализом:

Вакансия: "${title}"
Компания: "${company}"
Описание: "${description}"

Верни JSON в формате:
{
  "specialization": "frontend" | "backend" | "fullstack" | "mobile" | "devops" | "qa" | "design" | "other",
  "employment": ["full_time", "part_time", "remote", "project", "contract", "internship", "temporary", "freelance"],
  "experience": "junior" | "middle" | "senior" | "lead",
  "technologies": ["React", "TypeScript", "Node.js"],
  "salary": {"min": 50000, "max": 100000, "currency": "RUB"},
  "remote": true/false,
  "requirements": ["Опыт работы с React", "Знание TypeScript"],
  "benefits": ["Удаленная работа", "Гибкий график"],
  "relevanceScore": 85,
  "summary": "Краткое описание вакансии"
}

Важно: верни ТОЛЬКО валидный JSON, без дополнительного текста.
`;

    const messages = [
      {
        role: 'system',
        content: 'Ты эксперт по анализу IT-вакансий. Анализируй вакансии и возвращай структурированный JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await callQwenAPI(messages, 'deepseek-chat');
    
    // Парсим JSON ответ
    try {
      const analysis = JSON.parse(response);
      return analysis;
    } catch (parseError) {
      console.error('Ошибка парсинга JSON от Qwen:', parseError);
      // Возвращаем заглушку при ошибке парсинга
      return {
        specialization: 'design',
        employment: ['full_time'],
        experience: 'middle',
        technologies: ['Figma', 'Adobe Creative Suite'],
        salary: { min: 50000, max: 100000, currency: 'RUB' },
        remote: false,
        requirements: ['Опыт работы с дизайном'],
        benefits: ['Удаленная работа'],
        relevanceScore: 75,
        summary: 'Вакансия дизайнера'
      };
    }
  } catch (error) {
    console.error('Ошибка Qwen анализа вакансии:', error);
    // Возвращаем заглушку при ошибке
    return {
      specialization: 'design',
      employment: ['full_time'],
      experience: 'middle',
      technologies: ['Figma', 'Adobe Creative Suite'],
      salary: { min: 50000, max: 100000, currency: 'RUB' },
      remote: false,
      requirements: ['Опыт работы с дизайном'],
      benefits: ['Удаленная работа'],
      relevanceScore: 75,
      summary: 'Вакансия дизайнера'
    };
  }
}

/**
 * Анализирует поисковый запрос с помощью Qwen
 */
export async function analyzeSearchQueryWithQwen(
  query: string
): Promise<SearchQueryAnalysis> {
  try {
    const prompt = `
Проанализируй поисковый запрос и верни JSON с анализом:

Запрос: "${query}"

Верни JSON в формате:
{
  "intent": "Поиск работы дизайнером",
  "specialization": ["design"],
  "employment": ["full_time", "remote"],
  "experience": ["middle", "senior"],
  "technologies": ["Figma", "Sketch"],
  "location": "Москва",
  "salary": {"min": 80000, "max": 150000},
  "remote": true
}

Важно: верни ТОЛЬКО валидный JSON, без дополнительного текста.
`;

    const messages = [
      {
        role: 'system',
        content: 'Ты эксперт по анализу поисковых запросов для IT-вакансий. Анализируй запросы и возвращай структурированный JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await callQwenAPI(messages, 'deepseek-chat');
    
    try {
      const analysis = JSON.parse(response);
      return analysis;
    } catch (parseError) {
      console.error('Ошибка парсинга JSON от Qwen:', parseError);
      return {
        intent: 'Поиск работы дизайнером',
        specialization: ['design'],
        employment: ['full_time', 'remote'],
        experience: ['middle'],
        technologies: ['Figma'],
        location: 'Москва',
        salary: { min: 80000, max: 150000 },
        remote: true
      };
    }
  } catch (error) {
    console.error('Ошибка Qwen анализа запроса:', error);
    return {
      intent: 'Поиск работы дизайнером',
      specialization: ['design'],
      employment: ['full_time', 'remote'],
      experience: ['middle'],
      technologies: ['Figma'],
      location: 'Москва',
      salary: { min: 80000, max: 150000 },
      remote: true
    };
  }
}

/**
 * Находит подходящие вакансии с помощью Qwen
 */
export async function findMatchingVacanciesWithQwen(
  query: string,
  vacancies: any[]
): Promise<any[]> {
  try {
    const prompt = `
Найди подходящие вакансии для запроса: "${query}"

Доступные вакансии:
${vacancies.map(v => `- ${v.title} в ${v.company}`).join('\n')}

Верни JSON с ID подходящих вакансий в порядке релевантности:
{
  "matchedVacancies": ["vacancy_id_1", "vacancy_id_2"],
  "reasons": ["Соответствует специализации", "Подходящий опыт"]
}

Важно: верни ТОЛЬКО валидный JSON, без дополнительного текста.
`;

    const messages = [
      {
        role: 'system',
        content: 'Ты эксперт по подбору IT-вакансий. Находи подходящие вакансии и возвращай структурированный JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await callQwenAPI(messages, 'deepseek-chat');
    
    try {
      const result = JSON.parse(response);
      return result.matchedVacancies || [];
    } catch (parseError) {
      console.error('Ошибка парсинга JSON от Qwen:', parseError);
      return vacancies; // Возвращаем все вакансии при ошибке
    }
  } catch (error) {
    console.error('Ошибка Qwen поиска:', error);
    return vacancies; // Возвращаем все вакансии при ошибке
  }
}

/**
 * Проверяет доступность Qwen API
 */
export async function checkQwenAPIAvailability(): Promise<boolean> {
  try {
    const response = await callQwenAPI([
      {
        role: 'user',
        content: 'Привет!'
      }
    ], 'qwen2.5');
    
    return response.length > 0;
  } catch (error) {
    console.error('Qwen API недоступен:', error);
    return false;
  }
}
