// DeepSeek AI Service для анализа вакансий
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

export interface StructuredVacancyData {
  fullDescription: string;
  requirements: string;
  tasks: string;
  conditions: string;
  benefits: string;
  technologies: string[];
  experienceLevel: 'junior' | 'middle' | 'senior' | 'lead';
  employmentType: 'full_time' | 'part_time' | 'remote' | 'project' | 'contract' | 'internship' | 'temporary' | 'freelance';
  remoteWork: boolean;
  salaryRange?: {
    min?: number;
    max?: number;
    currency: string;
  };
}

// Конфигурация DeepSeek API
const DEEPSEEK_API_URL = 'https://api.cometapi.com/v1';
const DEEPSEEK_API_KEY = process.env.QWEN_API_KEY || '';

/**
 * Отправляет запрос к DeepSeek API
 */
async function callDeepSeekAPI(messages: any[], model: string = 'deepseek-chat'): Promise<string> {
  try {
    const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка DeepSeek API:', error);
    throw error;
  }
}

/**
 * Анализирует вакансию с помощью DeepSeek для структурирования описания
 */
export async function analyzeVacancyWithDeepSeek(description: string): Promise<StructuredVacancyData> {
  console.log('🤖 DeepSeek: Начинаем анализ вакансии');
  console.log('🔑 API Key:', DEEPSEEK_API_KEY ? 'Установлен' : 'НЕ УСТАНОВЛЕН');
  
  try {
    const prompt = `
Проанализируй описание вакансии и структурируй его на блоки. Верни JSON с анализом:

Описание вакансии: "${description}"

Верни JSON в формате:
{
  "fullDescription": "Полное описание вакансии",
  "requirements": "Требования к кандидату (список через запятую)",
  "tasks": "Обязанности и задачи (список через запятую)",
  "conditions": "Условия работы (список через запятую)",
  "benefits": "Льготы и преимущества (список через запятую)",
  "technologies": ["Figma", "Adobe Creative Suite", "Sketch"],
  "experienceLevel": "junior" | "middle" | "senior" | "lead",
  "employmentType": "full_time" | "part_time" | "remote" | "project" | "contract" | "internship" | "temporary" | "freelance",
  "remoteWork": true/false,
  "salaryRange": {"min": 50000, "max": 100000, "currency": "RUB"}
}

Важно: 
- Если информация не найдена, используй "Не указано"
- Верни ТОЛЬКО валидный JSON, без дополнительного текста
- Для requirements, tasks, conditions, benefits используй списки через запятую
`;

    const messages = [
      {
        role: 'system',
        content: 'Ты эксперт по анализу IT-вакансий. Структурируй описания вакансий и возвращай JSON с разбивкой на блоки.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await callDeepSeekAPI(messages, 'deepseek-chat');
    
    // Парсим JSON ответ
    try {
      const analysis = JSON.parse(response);
      return analysis;
    } catch (parseError) {
      console.error('Ошибка парсинга JSON от DeepSeek:', parseError);
      // Возвращаем заглушку при ошибке парсинга
      return {
        fullDescription: description || 'Описание не найдено',
        requirements: 'Требования не указаны',
        tasks: 'Обязанности не указаны',
        conditions: 'Условия не указаны',
        benefits: 'Льготы не указаны',
        technologies: ['Figma', 'Adobe Creative Suite'],
        experienceLevel: 'middle',
        employmentType: 'full_time',
        remoteWork: false,
        salaryRange: { min: 50000, max: 100000, currency: 'RUB' }
      };
    }
  } catch (error) {
    console.error('Ошибка DeepSeek анализа вакансии:', error);
    // Возвращаем заглушку при ошибке
    return {
      fullDescription: description || 'Описание не найдено',
      requirements: 'Требования не указаны',
      tasks: 'Обязанности не указаны',
      conditions: 'Условия не указаны',
      benefits: 'Льготы не указаны',
      technologies: ['Figma', 'Adobe Creative Suite'],
      experienceLevel: 'middle',
      employmentType: 'full_time',
      remoteWork: false,
      salaryRange: { min: 50000, max: 100000, currency: 'RUB' }
    };
  }
}

/**
 * Анализирует вакансию с помощью DeepSeek для классификации
 */
export async function analyzeVacancyWithDeepSeekClassification(
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

    const response = await callDeepSeekAPI(messages, 'deepseek-chat');
    
    // Парсим JSON ответ
    try {
      const analysis = JSON.parse(response);
      return analysis;
    } catch (parseError) {
      console.error('Ошибка парсинга JSON от DeepSeek:', parseError);
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
    console.error('Ошибка DeepSeek анализа вакансии:', error);
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
 * Проверяет доступность DeepSeek API
 */
export async function checkDeepSeekAPIAvailability(): Promise<boolean> {
  try {
    const response = await callDeepSeekAPI([
      {
        role: 'user',
        content: 'Привет!'
      }
    ], 'deepseek-chat');
    
    return response.length > 0;
  } catch (error) {
    console.error('DeepSeek API недоступен:', error);
    return false;
  }
}
