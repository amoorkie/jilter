import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

export interface EnhancedVacancyData {
  external_id: string;
  source: string;
  url: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  published_at: string;
  // Структурированные поля
  full_description: string;
  requirements: string;
  tasks: string;
  benefits: string;
  conditions: string;
  company_logo?: string;
  company_url?: string;
  employment_type?: string;
  experience_level?: string;
  remote_type?: string;
}

export class EnhancedHabrParser {
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };

  async init(): Promise<void> {
    console.log('🚀 Инициализация улучшенного Habr парсера...');
    console.log('✅ Habr парсер инициализирован');
  }

  async close(): Promise<void> {
    console.log('🔒 Habr парсер закрыт');
  }

  async parseDesignVacancies(limit: number = 10): Promise<EnhancedVacancyData[]> {
    console.log(`🔍 Парсинг дизайн вакансий с Habr (лимит: ${limit})...`);
    
    const vacancies: EnhancedVacancyData[] = [];
    
    try {
      // Переходим на страницу поиска дизайн вакансий
      const searchUrl = 'https://career.habr.com/vacancies?q=дизайнер&type=all';
      console.log(`📄 Переходим на: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, { 
        responseType: 'arraybuffer',
        headers: this.headers
      });
      
      const html = iconv.decode(Buffer.from(response.data), 'utf-8');
      const $ = cheerio.load(html);

      // Собираем ссылки на вакансии - используем более надежные селекторы
      const vacancyLinks = $('.vacancy-card__title a').map((i, link) => ({
        href: $(link).attr('href'),
        title: $(link).text().trim()
      })).get().filter(item => item.href);

      console.log(`📋 Найдено ${vacancyLinks.length} вакансий на главной странице`);
      
      // Если не нашли через основной селектор, пробуем альтернативные
      if (vacancyLinks.length === 0) {
        console.log('🔍 Пробуем альтернативные селекторы...');
        const altLinks = $('a[href*="/vacancies/"]').not('[href*="/companies/"]').map((i, link) => ({
          href: $(link).attr('href'),
          title: $(link).text().trim()
        })).get().filter(item => item.href && item.title);
        
        console.log(`📋 Альтернативные ссылки: ${altLinks.length}`);
        if (altLinks.length > 0) {
          vacancyLinks.push(...altLinks);
        }
      }

      // Ограничиваем количество для тестирования
      const limitedLinks = vacancyLinks.slice(0, limit);
      
      for (let i = 0; i < limitedLinks.length; i++) {
        const link = limitedLinks[i];
        console.log(`\n🔍 Обрабатываем вакансию ${i + 1}/${limitedLinks.length}: ${link.title}`);
        
        try {
          const vacancyData = await this.parseSingleVacancy(link.href!);
          if (vacancyData) {
            vacancies.push(vacancyData);
            console.log(`✅ Вакансия обработана: ${vacancyData.title}`);
          }
        } catch (error) {
          console.error(`❌ Ошибка при обработке вакансии ${link.href}:`, error);
        }
        
        // Небольшая пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('❌ Ошибка при парсинге Habr:', error);
    }

    console.log(`\n🎉 Парсинг завершен. Обработано: ${vacancies.length} вакансий`);
    return vacancies;
  }

  private async parseSingleVacancy(vacancyUrl: string): Promise<EnhancedVacancyData | null> {
    try {
      console.log(`📄 Переходим на страницу вакансии: ${vacancyUrl}`);
      
      // Переходим на страницу вакансии - исправляем URL
      const fullUrl = vacancyUrl.startsWith('http') ? vacancyUrl : `https://career.habr.com${vacancyUrl}`;
      console.log(`📄 Полный URL: ${fullUrl}`);
      
      const response = await axios.get(fullUrl, { 
        responseType: 'arraybuffer',
        headers: this.headers
      });
      
      const html = iconv.decode(Buffer.from(response.data), 'utf-8');
      const $ = cheerio.load(html);

      // Извлекаем основную информацию - используем более общие селекторы
      const title = $('h1').text().trim() || '';
      
      // Ищем компанию более точно
      const companyLinks = $('a[href*="/companies/"]');
      let company = '';
      if (companyLinks.length > 0) {
        // Берем первую ссылку на компанию
        company = companyLinks.first().text().trim();
      }
      
      // Ищем локацию в тексте страницы
      const pageText = $('body').text();
      const locationMatch = pageText.match(/Местоположение и тип занятости[\s\S]*?(?=Компания|$)/);
      const location = locationMatch ? locationMatch[0].trim() : '';
      
      // Извлекаем зарплату
      let salary_min: number | undefined;
      let salary_max: number | undefined;
      let salary_currency: string | undefined;
      
      try {
        // Ищем зарплату в тексте страницы - улучшенный regex
        const salaryMatch = pageText.match(/от (\d+)\s*₽/);
        if (salaryMatch) {
          salary_min = parseInt(salaryMatch[1]);
          salary_currency = '₽';
        }
      } catch (e) {
        // Зарплата не найдена
      }

      // Извлекаем дату публикации - улучшенный regex
      const dateMatch = pageText.match(/(\d{1,2} \w+)/);
      const published_at = dateMatch ? dateMatch[0] : '';

      // Извлекаем полное описание
      const full_description = this.extractFullDescription($);

      // Извлекаем дополнительную информацию
      const company_logo = this.extractCompanyLogo($);
      const company_url = this.extractCompanyUrl($);
      const employment_type = this.extractEmploymentType($);
      const experience_level = this.extractExperienceLevel($);
      const remote_type = this.extractRemoteType($);

      // Создаем базовое описание для карточки
      const description = this.createBasicDescription(title, company, full_description);

      const vacancyData: EnhancedVacancyData = {
        external_id: this.generateExternalId(vacancyUrl),
        source: 'habr',
        url: vacancyUrl,
        title,
        company,
        location,
        description,
        salary_min,
        salary_max,
        salary_currency,
        published_at,
        full_description,
        requirements: '', // Убираем дробление на блоки - используем только полное описание
        tasks: '',
        benefits: '',
        conditions: '',
        company_logo,
        company_url,
        employment_type,
        experience_level,
        remote_type
      };

      return vacancyData;

    } catch (error) {
      console.error(`❌ Ошибка при парсинге вакансии ${vacancyUrl}:`, error);
      return null;
    }
  }

  private extractFullDescription($: cheerio.CheerioAPI): string {
    try {
      // Ищем основной блок с описанием вакансии - используем универсальные селекторы
      const selectors = [
        '.basic-section--appearance-vacancy-description',
        '.vacancy-description',
        '.vacancy-details',
        '[class*="vacancy-description"]',
        '[class*="vacancy-details"]',
        '.style-ugc',
        '.vacancy-card__description',
        '.description'
      ];

      for (const selector of selectors) {
        const descriptionElement = $(selector);
        if (descriptionElement.length > 0) {
          const description = descriptionElement.text().trim();
          if (description && description.length > 100) {
            console.log(`✅ Найдено описание через селектор: ${selector} (${description.length} символов)`);
            return description;
          }
        }
      }

      // Если не нашли через селекторы, ищем в тексте страницы
      const pageText = $('body').text();
      const descriptionMatch = pageText.match(/Мы работаем с общественными и социальными учреждениями[\s\S]*?(?=Поделиться|Смотреть ещё|$)/);
      if (descriptionMatch) {
        console.log(`✅ Найдено описание через текстовый поиск (${descriptionMatch[0].length} символов)`);
        return descriptionMatch[0].trim();
      }

      console.log('⚠️ Полное описание не найдено');
      return '';
    } catch (e) {
      console.log('⚠️ Полное описание не найдено');
      return '';
    }
  }

  private extractRequirements($: cheerio.CheerioAPI): string {
    try {
      // Ищем блок с требованиями по тексту - улучшенный regex
      const pageText = $('body').text();
      const requirementsMatch = pageText.match(/Требования:[\s\S]*?(?=Мы предлагаем:|Задачи:|Условия:|$)/);
      if (requirementsMatch) {
        return requirementsMatch[0].trim();
      }
      return '';
    } catch (e) {
      console.log('⚠️ Требования не найдены');
      return '';
    }
  }

  private extractTasks($: cheerio.CheerioAPI): string {
    try {
      // Ищем блок с задачами по тексту - улучшенный regex
      const pageText = $('body').text();
      const tasksMatch = pageText.match(/Задачи:[\s\S]*?(?=Требования:|Мы предлагаем:|Условия:|$)/);
      if (tasksMatch) {
        return tasksMatch[0].trim();
      }
      return '';
    } catch (e) {
      console.log('⚠️ Задачи не найдены');
      return '';
    }
  }

  private extractBenefits($: cheerio.CheerioAPI): string {
    try {
      // Ищем блок с льготами по тексту - улучшенный regex
      const pageText = $('body').text();
      const benefitsMatch = pageText.match(/Мы предлагаем:[\s\S]*?(?=Поделиться|Смотреть ещё|Требования:|Задачи:|$)/);
      if (benefitsMatch) {
        return benefitsMatch[0].trim();
      }
      return '';
    } catch (e) {
      console.log('⚠️ Льготы не найдены');
      return '';
    }
  }

  private extractConditions($: cheerio.CheerioAPI): string {
    try {
      // Ищем блок с условиями по тексту
      const pageText = $('body').text();
      const conditionsMatch = pageText.match(/Условия:[\s\S]*?(?=Мы предлагаем:|Поделиться|$)/);
      if (conditionsMatch) {
        return conditionsMatch[0].trim();
      }
      return '';
    } catch (e) {
      console.log('⚠️ Условия не найдены');
      return '';
    }
  }

  private extractCompanyLogo($: cheerio.CheerioAPI): string {
    try {
      const logoUrl = $('.vacancy-card__company-logo img').attr('src') || '';
      return logoUrl || '';
    } catch (e) {
      return '';
    }
  }

  private extractCompanyUrl($: cheerio.CheerioAPI): string {
    try {
      const companyUrl = $('.vacancy-card__company-name a').attr('href') || '';
      return companyUrl || '';
    } catch (e) {
      return '';
    }
  }

  private extractEmploymentType($: cheerio.CheerioAPI): string {
    try {
      const employmentType = $('.vacancy-card__employment-type').text().trim();
      return employmentType || '';
    } catch (e) {
      return '';
    }
  }

  private extractExperienceLevel($: cheerio.CheerioAPI): string {
    try {
      const experienceLevel = $('.vacancy-card__experience-level').text().trim();
      return experienceLevel || '';
    } catch (e) {
      return '';
    }
  }

  private extractRemoteType($: cheerio.CheerioAPI): string {
    try {
      const remoteType = $('.vacancy-card__remote-type').text().trim();
      return remoteType || '';
    } catch (e) {
      return '';
    }
  }

  private createBasicDescription(title: string, company: string, fullDescription: string): string {
    if (fullDescription) {
      return fullDescription.substring(0, 200) + '...';
    }
    return `Вакансия: ${title} в компании ${company}. Подробности на странице вакансии.`;
  }

  private generateExternalId(url: string): string {
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    return `habr_${lastPart}`;
  }
}
