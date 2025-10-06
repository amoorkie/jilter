// lib/geekjob-parser.ts
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

export const parseGeekjobVacancies = async (query: string = "javascript"): Promise<Vacancy[]> => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Устанавливаем User-Agent и другие заголовки
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    console.log(`🔍 Открываем Geekjob.ru: https://geekjob.ru/?q=${query}`);
    
    // Открываем страницу
    await page.goto(`https://geekjob.ru/?q=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle', // Ждем завершения загрузки
    });

    // Ждем появления вакансий (с таймаутом)
    await page.waitForSelector('.collection-item', { timeout: 10000 });

    // Добавляем задержку перед парсингом
    await page.waitForTimeout(2000);

    // Проверяем, есть ли вакансии
    const vacancyCount = await page.evaluate(() => {
      return document.querySelectorAll('.collection-item').length;
    });

    console.log(`📊 Найдено карточек: ${vacancyCount}`);

    if (vacancyCount === 0) {
      console.log('⚠️ Вакансии не найдены на странице');
      return [];
    }

    // Собираем данные
    const vacancies = await page.evaluate(() => {
      const cards = document.querySelectorAll('.collection-item');
      const results = [];

      console.log(`🔍 Обрабатываем ${cards.length} карточек...`);

      cards.forEach((card, index) => {
        // Пропускаем элементы, которые не являются вакансиями (например, реклама)
        const vacancyLink = card.querySelector('a[href*="/vacancy/"]');
        if (!vacancyLink) {
          console.log(`⚠️ Пропускаем карточку ${index}: нет ссылки на вакансию`);
          return;
        }
        
        // Получаем все ссылки в элементе
        const allLinks = Array.from(card.querySelectorAll('a[href*="/vacancy/"]'));
        if (allLinks.length === 0) {
          console.log(`⚠️ Пропускаем карточку ${index}: нет ссылок на вакансии`);
          return;
        }
        
        // Заголовок вакансии - это текст первой ссылки на вакансию
        const titleElement = allLinks.find(link => 
          link.textContent?.trim() && 
          !link.querySelector('img') // Не ссылка с изображением
        ) || allLinks[0];
        
        // Название компании - это текст последней ссылки на вакансию
        const companyElement = allLinks[allLinks.length - 1];
        
        // Логотип компании
        const logoElement = card.querySelector('.vacancy-list-logo');
        
        // Ищем зарплату в тексте элемента
        const salaryText = Array.from(card.querySelectorAll('*')).find(el => 
          el.textContent?.includes('₽') || 
          el.textContent?.includes('руб') ||
          el.textContent?.match(/\d+\s*[₽руб]/)
        );

        const title = titleElement?.textContent?.trim() || '';
        const company = companyElement?.textContent?.trim() || '';
        const salary = salaryText?.textContent?.trim() || 'Не указана';
        const url = vacancyLink.getAttribute('href') || '';
        const logo = logoElement?.getAttribute('src') || '';
        
        if (title && company && url) {
          results.push({
            id: `geekjob-${index}`,
            title,
            salary,
            company,
            url: url.startsWith('http') ? url : `https://geekjob.ru${url}`,
            companyLogo: logo ? (logo.startsWith('http') ? logo : `https://geekjob.ru${logo}`) : undefined
          });
          console.log(`✅ Добавлена вакансия ${index + 1}: ${title} в ${company}`);
        } else {
          console.log(`⚠️ Пропускаем карточку ${index}: неполные данные (title: ${!!title}, company: ${!!company}, url: ${!!url})`);
        }
      });

      console.log(`📊 Итого обработано: ${cards.length}, успешно: ${results.length}`);
      return results;
    });

    console.log(`✅ Собрано вакансий: ${vacancies.length}`);
    return vacancies;

  } catch (error) {
    console.error('❌ Ошибка парсинга Geekjob:', error);
    return [];
  } finally {
    await browser.close();
  }
};