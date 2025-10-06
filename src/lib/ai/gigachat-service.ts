// GigaChat API сервис для анализа вакансий
// Документация: https://developers.sber.ru/docs/ru/gigachat/api/overview
import * as https from 'https';

export interface GigaChatAnalysisResult {
  fullDescription: string;
  requirements: string;
  tasks: string;
  conditions: string;
  benefits: string;
  technologies: string[];
  experienceLevel: 'junior' | 'middle' | 'senior' | 'lead' | 'unknown';
  employmentType: 'full_time' | 'part_time' | 'project' | 'freelance' | 'internship' | 'volunteer' | 'unknown';
  remoteWork: boolean;
  salaryRange?: {
    min: number | null;
    max: number | null;
    currency: string;
  };
}

interface GigaChatCompletionRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  stream: boolean;
  max_tokens: number;
  temperature: number;
}

interface GigaChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class GigaChatService {
  private authorizationKey: string;
  private baseUrl: string;
  private authUrl: string;
  private model: string;

  constructor() {
    // Согласно документации: https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/post-token
    // Нужен авторизационный ключ (Base64 от Client ID:Client Secret)
    this.authorizationKey = process.env.GIGACHAT_AUTHORIZATION_KEY || '';
    this.baseUrl = 'https://gigachat.devices.sberbank.ru/api/v1';
    this.authUrl = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
    this.model = 'GigaChat:latest';

    console.log('🔍 Отладка GigaChat сервиса:');
    console.log('📝 GIGACHAT_AUTHORIZATION_KEY:', this.authorizationKey ? 'УСТАНОВЛЕН' : 'НЕ УСТАНОВЛЕН');
    console.log('📝 Длина ключа:', this.authorizationKey.length);
    console.log('📝 Первые 20 символов:', this.authorizationKey.substring(0, 20) + '...');

    if (!this.authorizationKey) {
      console.error('GigaChatService: Отсутствует переменная окружения GIGACHAT_AUTHORIZATION_KEY');
      console.log('🔑 Получить ключ можно на: https://developers.sber.ru/');
    } else {
      console.log('🔑 GigaChat авторизационный ключ найден');
    }
  }

  private async makeHttpsRequest(url: string, options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        rejectUnauthorized: false // Отключаем проверку SSL сертификатов
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data))
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  private async getAccessToken(): Promise<string> {
    try {
      console.log('🔐 Получаем токен доступа GigaChat...');
      
      // Отключаем проверку SSL сертификатов для GigaChat API
      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
      
      // Генерируем уникальный идентификатор запроса (RqUID) в формате UUID4
      const rqUID = crypto.randomUUID();
      
      // Используем https модуль для обхода проблем с SSL
      const response = await this.makeHttpsRequest(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'RqUID': rqUID,
          'Authorization': `Basic ${this.authorizationKey}`,
        },
        body: 'scope=GIGACHAT_API_PERS',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Ошибка получения токена: ${response.status} ${response.statusText}`);
        console.error(`📝 Детали ошибки: ${errorText}`);
        console.error(`🔑 RqUID: ${rqUID}`);
        throw new Error(`Ошибка получения токена: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Токен доступа GigaChat получен успешно');
      console.log(`⏰ Токен действителен до: ${new Date(data.expires_at * 1000).toLocaleString()}`);
      return data.access_token;
    } catch (error) {
      console.error('GigaChatService: Ошибка при получении токена:', error);
      throw error;
    }
  }

  async analyzeVacancy(vacancyText: string): Promise<string | null> {
    if (!this.authorizationKey) {
      console.error('GigaChatService: GIGACHAT_AUTHORIZATION_KEY не задан. Пропуск анализа.');
      return null;
    }

    try {
      const accessToken = await this.getAccessToken();

      const prompt = `Проанализируй следующее описание вакансии дизайнера и структурируй информацию в JSON формате:

{
  "fullDescription": "полное описание вакансии",
  "requirements": "требования к кандидату",
  "tasks": "обязанности и задачи",
  "conditions": "условия работы",
  "benefits": "льготы и преимущества",
  "technologies": ["технологии", "инструменты"],
  "experienceLevel": "junior|middle|senior|lead|unknown",
  "employmentType": "full_time|part_time|project|freelance|internship|volunteer|unknown",
  "remoteWork": true/false,
  "salaryRange": {"min": число, "max": число, "currency": "валюта"}
}

Вакансия: ${vacancyText}`;

      const requestBody: GigaChatCompletionRequest = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        max_tokens: 1024,
        temperature: 0.7,
      };

      const response = await this.makeHttpsRequest(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка API GigaChat: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const data: GigaChatCompletionResponse = await response.json();

      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message.content.trim();
        return content;
      } else {
        console.warn('GigaChatService: API вернул пустой ответ для анализа вакансии.');
        return null;
      }
    } catch (error) {
      console.error('GigaChatService: Ошибка при анализе вакансии:', error);
      return null;
    }
  }
}

// Функция для анализа вакансии с GigaChat
export async function analyzeVacancyWithGigaChat(vacancyText: string): Promise<GigaChatAnalysisResult> {
  const service = new GigaChatService();
  
  try {
    console.log('🤖 Запускаем AI-анализ с GigaChat...');
    const result = await service.analyzeVacancy(vacancyText);
    
    if (result) {
      try {
        const parsed = JSON.parse(result);
        console.log('✅ GigaChat анализ завершен успешно');
        return parsed;
      } catch (parseError) {
        console.warn('⚠️ Ошибка парсинга JSON от GigaChat, используем fallback');
        return {
          fullDescription: vacancyText,
          requirements: 'Требования не указаны',
          tasks: 'Обязанности не указаны',
          conditions: 'Условия не указаны',
          benefits: 'Льготы не указаны',
          technologies: [],
          experienceLevel: 'middle',
          employmentType: 'full_time',
          remoteWork: false,
          salaryRange: undefined
        };
      }
    } else {
      console.warn('⚠️ GigaChat не вернул результат, используем fallback');
      return {
        fullDescription: vacancyText,
        requirements: 'Требования не указаны',
        tasks: 'Обязанности не указаны',
        conditions: 'Условия не указаны',
        benefits: 'Льготы не указаны',
        technologies: [],
        experienceLevel: 'middle',
        employmentType: 'full_time',
        remoteWork: false,
        salaryRange: undefined
      };
    }
  } catch (error) {
    console.error('❌ Ошибка GigaChat анализа:', error);
    return {
      fullDescription: vacancyText,
      requirements: 'Требования не указаны',
      tasks: 'Обязанности не указаны',
      conditions: 'Условия не указаны',
      benefits: 'Льготы не указаны',
      technologies: [],
      experienceLevel: 'middle',
      employmentType: 'full_time',
      remoteWork: false,
      salaryRange: undefined
    };
  }
}

// Функция для фильтрации вакансий с GigaChat
export async function filterVacanciesWithGigaChat(vacancies: any[]): Promise<any[]> {
  const service = new GigaChatService();
  
  if (!service['authorizationKey']) {
    console.log('⚠️ GigaChat ключ не настроен, пропускаем фильтрацию');
    return vacancies;
  }
  
  try {
    console.log('🔍 Запускаем AI-фильтрацию с GigaChat...');
    // Здесь можно добавить логику фильтрации
    return vacancies;
  } catch (error) {
    console.error('❌ Ошибка GigaChat фильтрации:', error);
    return vacancies;
  }
}

