// Парсер для Designer.ru
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

export interface Vacancy {
  id: string;
  title: string;
  company: string;
  salary: string;
  url: string;
  description?: string;
  location?: string;
  source: string;
  publishedAt?: Date;
}

// Ключевые слова для поиска дизайнерских вакансий
const DESIGN_KEYWORDS = [
  'дизайн', 'дизайнер', 'дизайнер интерфейсов', 'ui/ux', 'ux/ui', 'продуктовый дизайн',
  'цифровой дизайн', 'веб-дизайн', 'интерфейсный дизайн', 'графический дизайн',
  'визуальный дизайн', 'коммуникационный дизайн', 'дизайн-мышление', 'user experience',
  'user interface', 'ux-дизайнер', 'ui-дизайнер', 'продуктовый дизайнер', 'графический дизайнер',
  'интерфейсный дизайнер', 'веб-дизайнер', 'визуальный дизайнер', 'motion-дизайнер',
  'ux-исследователь', 'арт-директор', 'creative director', 'дизайнер коммуникаций',
  'дизайнер бренд-идентики', 'иллюстратор', '3d-дизайнер', 'designer', 'ui designer',
  'ux designer', 'product designer', 'visual designer', 'graphic designer', 'web designer',
  'interaction designer', 'motion designer', 'ux researcher', 'art director', 'creative director'
];

// Функция для проверки релевантности вакансии
function isRelevantVacancy(title: string, description: string = ''): boolean {
  const text = `${title} ${description}`.toLowerCase();
  
  return DESIGN_KEYWORDS.some(keyword => 
    text.includes(keyword.toLowerCase())
  );
}

// Функция для очистки названия компании от дублей
function cleanCompanyName(company: string): string {
  let cleaned = company.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Проверяем на точное дублирование всего названия
  const companyLength = cleaned.length;
  if (companyLength > 10) {
    const halfLength = Math.floor(companyLength / 2);
    const firstHalf = cleaned.substring(0, halfLength);
    const secondHalf = cleaned.substring(halfLength);

    // Если вторая половина ТОЧНО повторяет первую
    if (firstHalf === secondHalf && firstHalf.length > 5) {
      cleaned = firstHalf;
    }
  }
  
  return cleaned;
}

export async function parseDesignerRuVacancies(query: string = 'дизайнер', pages: number = 3): Promise<Vacancy[]> {
  const vacancies: Vacancy[] = [];
  
  console.log(`🎯 Начинаем парсинг Designer.ru для дизайнерских вакансий`);
  console.log(`🔍 Поисковый запрос: "${query}"`);
  console.log(`📄 Количество страниц: ${pages}`);
  
  for (let i = 0; i < pages; i++) {
      const url = `https://designer.ru/`;
    try {
      console.log(`🔍 Парсинг Designer.ru страница ${i + 1}: ${url}`);
      
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      const html = iconv.decode(Buffer.from(response.data), 'utf-8');
      const $ = cheerio.load(html);

      let pageVacancies = 0;
      let relevantVacancies = 0;

      // Пробуем разные селекторы для поиска вакансий
      const vacancySelectors = [
        '.vacancy-card',
        '.vacancy-item',
        '.job-card',
        '[data-vacancy]',
        '.vacancy',
        '.post'
      ];

      let $vacancies = $();
      for (const selector of vacancySelectors) {
        $vacancies = $(selector);
        if ($vacancies.length > 0) {
          console.log(`✅ Найден селектор: ${selector} (${$vacancies.length} элементов)`);
          break;
        }
      }

      if ($vacancies.length === 0) {
        console.log(`⚠️ На странице ${i + 1} не найдено вакансий`);
        continue;
      }

      $vacancies.each((index, element) => {
        try {
          // Пробуем разные селекторы для заголовка
          const titleSelectors = [
            'a[href*="/vacancy/"]',
            'a[href*="/job/"]',
            '.vacancy-title',
            '.job-title',
            'h3 a',
            'h2 a',
            'a'
          ];
          
          let title = '';
          let url = '';
          for (const selector of titleSelectors) {
            const titleElement = $(element).find(selector).first();
            title = titleElement.text().trim();
            url = titleElement.attr('href') || '';
            if (title && url) break;
          }

          if (!title || !url) {
            console.log(`⚠️ Пропускаем вакансию ${index}: нет заголовка или ссылки`);
            return;
          }

          // Пробуем разные селекторы для компании
          const companySelectors = [
            '.company-name',
            '.vacancy-company',
            '.job-company',
            'a[href*="/company/"]',
            '.employer-name'
          ];
          
          let company = '';
          for (const selector of companySelectors) {
            const companyElement = $(element).find(selector);
            company = companyElement.text().trim();
            if (company) break;
          }

          if (!company) {
            // Если нет компании, используем заглушку
            company = 'Компания не указана';
            console.log(`⚠️ Вакансия "${title}": компания не указана, используем заглушку`);
          }

          company = cleanCompanyName(company);

          // Пробуем разные селекторы для зарплаты
          const salarySelectors = [
            '.salary',
            '.vacancy-salary',
            '.job-salary',
            '[class*="salary"]',
            '[class*="money"]'
          ];
          
          let salary = '';
          for (const selector of salarySelectors) {
            const salaryElement = $(element).find(selector);
            salary = salaryElement.text().trim();
            if (salary) break;
          }

          // Если не нашли через селекторы, ищем в тексте по паттерну
          if (!salary) {
            const allText = $(element).text();
            const salaryMatch = allText.match(/\d+[\s,]*\d*\s*[₽руб]/);
            if (salaryMatch) {
              salary = salaryMatch[0];
            }
          }

          if (!salary) {
            salary = 'Не указана';
          }

          // Пробуем разные селекторы для описания
          const descriptionSelectors = [
            '.vacancy-description',
            '.job-description',
            '.description',
            '.snippet',
            'p'
          ];
          
          let description = '';
          for (const selector of descriptionSelectors) {
            const descElement = $(element).find(selector);
            description = descElement.text().trim();
            if (description) break;
          }

          // Пробуем разные селекторы для локации
          const locationSelectors = [
            '.location',
            '.city',
            '.vacancy-location',
            '.job-location',
            '[class*="location"]'
          ];
          
          let location = '';
          for (const selector of locationSelectors) {
            const locElement = $(element).find(selector);
            location = locElement.text().trim();
            if (location) break;
          }

          // Проверяем релевантность
          if (!isRelevantVacancy(title, description)) {
            console.log(`❌ Не релевантная вакансия: "${title}"`);
            return;
          }

          pageVacancies++;
          relevantVacancies++;

          vacancies.push({
            id: `designer-ru-${i}-${index}`,
            title,
            company,
            salary,
            url: url.startsWith('http') ? url : `https://designer.ru${url}`,
            description,
            location,
            source: 'designer-ru',
            publishedAt: new Date()
          });

          console.log(`✅ Релевантная вакансия: "${title}" - ${company}`);

        } catch (error) {
          console.error(`❌ Ошибка обработки вакансии ${index}:`, error);
        }
      });

      console.log(`📊 Designer.ru страница ${i + 1}: ${pageVacancies} вакансий, ${relevantVacancies} релевантных`);
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Ошибка парсинга Designer.ru страница ${i + 1}:`, error);
    }
  }

  console.log(`🎯 Designer.ru итого: ${vacancies.length} релевантных дизайнерских вакансий`);
  return vacancies;
}
