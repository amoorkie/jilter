// YandexGPT AI Service для анализа вакансий
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

/**
 * Анализирует вакансию с помощью YandexGPT
 */
export async function analyzeVacancyWithYandexGPT(
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

    // Здесь будет запрос к YandexGPT API
    // Пока возвращаем заглушку
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
  } catch (error) {
    console.error('Ошибка YandexGPT анализа:', error);
    throw error;
  }
}

/**
 * Анализирует поисковый запрос с помощью YandexGPT
 */
export async function analyzeSearchQueryWithYandexGPT(
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

    // Здесь будет запрос к YandexGPT API
    // Пока возвращаем заглушку
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
  } catch (error) {
    console.error('Ошибка YandexGPT анализа запроса:', error);
    throw error;
  }
}

/**
 * Находит подходящие вакансии с помощью YandexGPT
 */
export async function findMatchingVacanciesWithYandexGPT(
  query: string,
  vacancies: any[]
): Promise<any[]> {
  try {
    // Здесь будет логика поиска подходящих вакансий
    // Пока возвращаем все вакансии
    return vacancies;
  } catch (error) {
    console.error('Ошибка YandexGPT поиска:', error);
    throw error;
  }
}















