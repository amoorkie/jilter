// LinkedIn парсер для дизайнерских вакансий
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface LinkedInVacancy {
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

function isRelevantVacancy(title: string, description: string = ''): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return DESIGN_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

function cleanCompanyName(company: string): string {
  let cleaned = company.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const companyLength = cleaned.length;
  if (companyLength > 10) {
    const halfLength = Math.floor(companyLength / 2);
    const firstHalf = cleaned.substring(0, halfLength);
    const secondHalf = cleaned.substring(halfLength);
    if (firstHalf === secondHalf && firstHalf.length > 5) {
      cleaned = firstHalf;
    }
  }
  return cleaned;
}

export async function parseLinkedInVacancies(query: string = 'дизайнер', pages: number = 2): Promise<LinkedInVacancy[]> {
  const allVacancies: LinkedInVacancy[] = [];

  try {
    console.log(`🎯 Начинаем парсинг LinkedIn для дизайнерских вакансий`);
    console.log(`🔍 Поисковый запрос: "${query}"`);
    console.log(`📄 Количество страниц: ${pages}`);

    for (let i = 0; i < pages; i++) {
      const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&start=${i * 25}`;
      console.log(`🔍 Парсинг LinkedIn страница ${i + 1}: ${url}`);

      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        // Ищем вакансии в LinkedIn
        const jobCards = $('.jobs-search__results-list li, .job-card-container, .job-card');
        console.log(`🔍 Найдено карточек на странице ${i + 1}: ${jobCards.length}`);

        jobCards.each((index, card) => {
          try {
            const $card = $(card);
            
            // Извлекаем данные вакансии
            const titleElement = $card.find('a[data-control-name="job_card_title_link"], .job-card-list__title a, .job-card-container__link');
            const title = titleElement.text().trim();
            const url = titleElement.attr('href') || '';

            const companyElement = $card.find('.job-card-container__company-name, .job-card-list__company-name, .job-card-container__metadata-item a');
            let company = companyElement.text().trim();
            company = cleanCompanyName(company);

            const locationElement = $card.find('.job-card-container__metadata-item, .job-card-list__location');
            const location = locationElement.text().trim() || 'Локация не указана';

            const salaryElement = $card.find('.job-card-container__salary, .job-card-list__salary');
            const salary = salaryElement.text().trim() || 'Не указана';

            const descriptionElement = $card.find('.job-card-container__description, .job-card-list__description');
            const description = descriptionElement.text().trim() || 'Описание не найдено';

            if (!isRelevantVacancy(title, description)) {
              console.log(`❌ Пропускаем нерелевантную вакансию: "${title}"`);
              return;
            }

            if (title && company && url) {
              allVacancies.push({
                id: `linkedin-${i}-${index}`,
                title,
                company,
                salary,
                url: url.startsWith('http') ? url : `https://www.linkedin.com${url}`,
                description,
                location,
                source: 'LinkedIn',
                publishedAt: new Date()
              });
            } else {
              console.log(`⚠️ Пропускаем карточку ${index}: неполные данные`);
            }
          } catch (error) {
            console.error(`❌ Ошибка при обработке карточки ${index} на LinkedIn:`, error);
          }
        });

        if (jobCards.length === 0 && i > 0) {
          console.log(`⚠️ На странице ${i + 1} нет вакансий, прекращаем парсинг`);
          break;
        }

      } catch (error) {
        console.error(`❌ Ошибка при парсинге LinkedIn страницы ${i + 1}:`, error);
      }
    }

    console.log(`🎯 LinkedIn итого: ${allVacancies.length} релевантных дизайнерских вакансий`);
    return allVacancies;

  } catch (error) {
    console.error('❌ Ошибка при парсинге LinkedIn:', error);
    return [];
  }
}















