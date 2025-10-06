// lib/hh-parser.ts
import { chromium } from 'playwright';

export interface Vacancy {
  id: string;
  title: string;
  salary: string;
  company: string;
  url: string;
  companyLogo?: string;
  companyUrl?: string;
  description?: string;
  city?: string;
  salary_from?: number;
  salary_to?: number;
  is_remote?: boolean;
}

export const parseHHVacancies = async (query: string = "javascript"): Promise<Vacancy[]> => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Устанавливаем User-Agent и другие заголовки
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    console.log(`🔍 Открываем HH.ru: https://hh.ru/search/vacancy?text=${query}`);
    
    // Открываем страницу поиска
    await page.goto(`https://hh.ru/search/vacancy?text=${encodeURIComponent(query)}&area=1`, {
      waitUntil: 'networkidle',
    });

    // Ждем появления вакансий
    await page.waitForSelector('[data-qa="vacancy-serp__vacancy"]', { timeout: 10000 });

    // Добавляем задержку перед парсингом
    await page.waitForTimeout(2000);

    // Проверяем, есть ли вакансии
    const vacancyCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-qa="vacancy-serp__vacancy"]').length;
    });

    console.log(`📊 Найдено карточек: ${vacancyCount}`);

    if (vacancyCount === 0) {
      console.log('⚠️ Вакансии не найдены на странице');
      return [];
    }

    // Собираем данные
    const vacancies = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-qa="vacancy-serp__vacancy"]');
      const results = [];

      console.log(`🔍 Обрабатываем ${cards.length} карточек...`);

      cards.forEach((card, index) => {
        try {
          // Заголовок вакансии
          const titleElement = card.querySelector('[data-qa="serp-item__title"]');
          const title = titleElement?.textContent?.trim() || '';

          // Ссылка на вакансию - ищем среди всех ссылок
          const allLinks = Array.from(card.querySelectorAll('a'));
          const vacancyLink = allLinks.find(link => 
            link.getAttribute('href')?.includes('/vacancy/')
          );
          const url = vacancyLink?.getAttribute('href') || '';

          // Компания - ищем среди всех ссылок на работодателя
          const companyLinks = allLinks.filter(link => 
            link.getAttribute('href')?.includes('/employer/')
          );
          const companyElement = companyLinks.find(link => link.textContent?.trim()) || companyLinks[0];
          const company = companyElement?.textContent?.trim() || '';

          // Ссылка на компанию
          const companyUrl = companyElement?.getAttribute('href') || '';

          // Логотип компании
          const logoElement = card.querySelector('img[src*="employer-logo"]');
          const logo = logoElement?.getAttribute('src') || '';

          // Зарплата - ищем в тексте карточки
          const salaryText = Array.from(card.querySelectorAll('*')).find(el => {
            const text = el.textContent || '';
            return text.includes('₽') || 
                   text.includes('руб') ||
                   text.match(/\d+\s*[₽руб]/) ||
                   text.includes('за месяц') ||
                   text.includes('за год');
          });

          const salary = salaryText?.textContent?.trim() || 'Не указана';

          if (title && company && url) {
            results.push({
              id: `hh-${index}`,
              title,
              salary,
              company,
              url: url.startsWith('http') ? url : `https://hh.ru${url}`,
              companyLogo: logo ? (logo.startsWith('http') ? logo : `https://hh.ru${logo}`) : undefined,
              companyUrl: companyUrl ? (companyUrl.startsWith('http') ? companyUrl : `https://hh.ru${companyUrl}`) : undefined
            });
            console.log(`✅ Добавлена вакансия ${index + 1}: ${title} в ${company}`);
          } else {
            console.log(`⚠️ Пропускаем карточку ${index}: неполные данные (title: ${!!title}, company: ${!!company}, url: ${!!url})`);
          }
        } catch (error) {
          console.error(`❌ Ошибка при парсинге вакансии ${index}:`, error);
        }
      });

      console.log(`📊 Итого обработано: ${cards.length}, успешно: ${results.length}`);
      return results;
    });

    console.log(`✅ Собрано вакансий: ${vacancies.length}`);
    return vacancies;

  } catch (error) {
    console.error('❌ Ошибка парсинга HH.ru:', error);
    return [];
  } finally {
    await browser.close();
  }
};
