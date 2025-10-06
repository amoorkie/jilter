// AI-анализатор для структурирования описаний вакансий
import { GigaChatService } from './gigachat-service';
import { Employment } from '@/lib/types/employment';

export interface StructuredVacancyData {
  fullDescription: string;
  requirements: string;
  tasks: string;
  conditions: string;
  benefits: string;
  technologies: string[];
  experienceLevel: 'junior' | 'middle' | 'senior' | 'lead' | 'unknown';
  employmentType: Employment;
  remoteWork: boolean;
  salaryRange?: {
    min?: number;
    max?: number;
    currency: string;
  };
}

export class VacancyAnalyzer {
  private gigachatService: GigaChatService;

  constructor() {
    this.gigachatService = new GigaChatService();
  }

  async analyze(vacancyText: string): Promise<StructuredVacancyData | null> {
    if (!vacancyText) {
      console.warn('VacancyAnalyzer: Передан пустой текст вакансии для анализа.');
      return null;
    }

    console.log('VacancyAnalyzer: Начинаю анализ вакансии...');

    try {
      const rawJsonString = await this.gigachatService.analyzeVacancy(vacancyText);

      if (!rawJsonString) {
        console.error('VacancyAnalyzer: GigaChat вернул пустой ответ.');
        return null;
      }

      // Пытаемся распарсить JSON из строки, возвращённой GigaChat
      let parsedData: any;
      try {
        parsedData = JSON.parse(rawJsonString);
      } catch (parseError) {
        console.error('VacancyAnalyzer: Ошибка парсинга JSON из ответа GigaChat:', parseError);
        console.error('Сырой ответ:', rawJsonString);
        return null;
      }

      // Проверяем структуру возвращённого JSON
      if (parsedData && typeof parsedData === 'object' && parsedData.full_description !== undefined && parsedData.requirements !== undefined && parsedData.tasks !== undefined) {
        console.log('VacancyAnalyzer: Анализ успешно завершён.');
        return {
          fullDescription: parsedData.full_description || '',
          requirements: parsedData.requirements || '',
          tasks: parsedData.tasks || '',
          conditions: '',
          benefits: '',
          technologies: [],
          experienceLevel: 'unknown',
          employmentType: 'unknown',
          remoteWork: false,
          salaryRange: undefined
        };
      } else {
        console.error('VacancyAnalyzer: Ответ GigaChat не соответствует ожидаемой структуре.', parsedData);
        return null;
      }

    } catch (error) {
      console.error('VacancyAnalyzer: Необработанная ошибка при анализе:', error);
      return null;
    }
  }
}

export async function analyzeVacancyWithAI(
  title: string,
  company: string,
  description: string,
  url: string
): Promise<StructuredVacancyData> {
  console.log(`🧠 Запускаем AI-анализ для вакансии: "${title}" от "${company}"`);

  const analyzer = new VacancyAnalyzer();
  const vacancyText = `${title} - ${company}\n\n${description}`;
  
  try {
    const result = await analyzer.analyze(vacancyText);
    
    if (result) {
      console.log(`✅ AI-анализ успешно завершен для "${title}"`);
      return result;
    } else {
      console.log(`⚠️ AI-анализ не удался для "${title}", используем базовые данные`);
      return {
        fullDescription: description,
        requirements: '',
        tasks: '',
        conditions: '',
        benefits: '',
        technologies: [],
        experienceLevel: 'unknown',
        employmentType: 'unknown',
        remoteWork: false,
        salaryRange: undefined
      };
    }
  } catch (error) {
    console.error(`❌ Ошибка при AI-анализе вакансии "${title}":`, error);
    // Возвращаем базовые данные в случае ошибки AI
    return {
      fullDescription: description,
      requirements: '',
      tasks: '',
      conditions: '',
      benefits: '',
      technologies: [],
      experienceLevel: 'unknown',
      employmentType: 'unknown',
      remoteWork: false,
      salaryRange: undefined
    };
  }
}