// Google Gemini Service для AI-анализа вакансий
import { Employment } from '@/lib/types/employment';

export interface GeminiAnalysisResult {
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

export async function analyzeVacancyWithGemini(
  title: string,
  company: string,
  description: string,
  url: string
): Promise<GeminiAnalysisResult> {
  console.log(`🤖 Запускаем Gemini-анализ для вакансии: "${title}" от "${company}"`);

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'ВАШ_GEMINI_КЛЮЧ_ЗДЕСЬ') {
    throw new Error('Gemini API ключ не настроен');
  }

  const prompt = `
Проанализируй следующую вакансию и извлеки структурированную информацию.
Верни результат в формате JSON. Если какое-то поле не найдено, используй пустую строку или пустой массив.

Вакансия:
Заголовок: ${title}
Компания: ${company}
URL: ${url}
Описание:
${description}

Ожидаемый JSON формат:
{
  "fullDescription": "Полное описание вакансии, очищенное от лишнего текста, заголовков и навигации. Сохрани форматирование (списки, абзацы).",
  "requirements": "Список требований к кандидату, если есть, в виде HTML или Markdown.",
  "tasks": "Список обязанностей и задач, если есть, в виде HTML или Markdown.",
  "conditions": "Условия работы, график, местоположение, если есть, в виде HTML или Markdown.",
  "benefits": "Льготы и преимущества, если есть, в виде HTML или Markdown.",
  "technologies": ["технология1", "технология2"],
  "experienceLevel": "junior" | "middle" | "senior" | "lead" | "unknown",
  "employmentType": "full_time" | "part_time" | "project" | "freelance" | "internship" | "volunteer" | "unknown",
  "remoteWork": true | false,
  "salaryRange": {
    "min": 100000,
    "max": 200000,
    "currency": "RUB"
  }
}

Пример для employmentType:
- "Полная занятость" -> "full_time"
- "Частичная занятость" -> "part_time"
- "Проектная работа" -> "project"
- "Фриланс" -> "freelance"
- "Стажировка" -> "internship"
- "Волонтерство" -> "volunteer"

Пример для experienceLevel:
- "Без опыта" -> "junior"
- "От 1 года до 3 лет" -> "middle"
- "От 3 до 6 лет" -> "senior"
- "Более 6 лет" -> "lead"

Если зарплата указана в USD, конвертируй в RUB по курсу 90.
Если зарплата указана в KZT, конвертируй в RUB по курсу 0.2.
Если зарплата указана в EUR, конвертируй в RUB по курсу 100.

Извлекай только информацию, которая явно указана в описании.
Не придумывай информацию, если ее нет.
Обязательно верни валидный JSON.
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          topP: 1,
          topK: 32
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API ошибка: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const geminiResponse = data.candidates[0].content.parts[0].text.trim();
    
    console.log(`📝 Gemini ответ: ${geminiResponse.substring(0, 200)}...`);
    
    // Парсим JSON ответ (убираем markdown блоки)
    let cleanResponse = geminiResponse;
    if (cleanResponse.includes('```json')) {
      cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/```\n?$/, '');
    }
    if (cleanResponse.includes('```')) {
      cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/```\n?$/, '');
    }
    
    const parsedResponse = JSON.parse(cleanResponse.trim());
    
    // Валидация и приведение типов
    const result: GeminiAnalysisResult = {
      fullDescription: typeof parsedResponse.fullDescription === 'string' ? parsedResponse.fullDescription : description,
      requirements: typeof parsedResponse.requirements === 'string' ? parsedResponse.requirements : '',
      tasks: typeof parsedResponse.tasks === 'string' ? parsedResponse.tasks : '',
      conditions: typeof parsedResponse.conditions === 'string' ? parsedResponse.conditions : '',
      benefits: typeof parsedResponse.benefits === 'string' ? parsedResponse.benefits : '',
      technologies: Array.isArray(parsedResponse.technologies) ? parsedResponse.technologies.filter(item => typeof item === 'string') : [],
      experienceLevel: ['junior', 'middle', 'senior', 'lead'].includes(parsedResponse.experienceLevel) ? parsedResponse.experienceLevel : 'unknown',
      employmentType: ['full_time', 'part_time', 'project', 'freelance', 'internship', 'volunteer'].includes(parsedResponse.employmentType) ? parsedResponse.employmentType : 'unknown',
      remoteWork: typeof parsedResponse.remoteWork === 'boolean' ? parsedResponse.remoteWork : false,
      salaryRange: parsedResponse.salaryRange && typeof parsedResponse.salaryRange === 'object' ? {
        min: typeof parsedResponse.salaryRange.min === 'number' ? parsedResponse.salaryRange.min : undefined,
        max: typeof parsedResponse.salaryRange.max === 'number' ? parsedResponse.salaryRange.max : undefined,
        currency: typeof parsedResponse.salaryRange.currency === 'string' ? parsedResponse.salaryRange.currency : 'RUB'
      } : undefined
    };

    console.log(`✅ Gemini-анализ успешно завершен для "${title}"`);
    return result;
  } catch (error) {
    console.error(`❌ Ошибка при Gemini-анализе вакансии "${title}":`, error);
    throw error;
  }
}