// src/lib/parsers/hirehi/parser.ts
import { chromium } from 'playwright';
import { Vacancy } from '../unified-parser';
import { mapEmployment } from '../../types/employment';

/**
 * Парсер для HireHi.ru
 */
export async function parseHireHiVacancies(
  query: string = "javascript",
  maxPages: number = 3
): Promise<Vacancy[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    console.log(`🔍 Начинаем парсинг HireHi для запроса: "${query}"`);
    
    const allVacancies: Vacancy[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage && currentPage <= maxPages) {
      console.log(`📄 Обрабатываем страницу ${currentPage}...`);
      
      // Формируем URL для поиска
      const searchUrl = `https://hirehi.ru/?q=${encodeURIComponent(query)}&page=${currentPage}`;
      
      if (currentPage === 1) {
        await page.goto(searchUrl, { waitUntil: 'networkidle' });
      } else {
        // Для HireHi используем параметр page в URL
        await page.goto(searchUrl, { waitUntil: 'networkidle' });
      }

      // Ждем появления вакансий
      try {
        await page.waitForSelector('.job-card', { timeout: 15000 });
        // Дополнительная пауза для полной загрузки контента
        await page.waitForTimeout(3000);
      } catch (error) {
        console.log(`⚠️ Вакансии не найдены на странице ${currentPage}`);
        break;
      }

      // Собираем вакансии с текущей страницы
      const pageVacancies = await page.evaluate((config) => {
        // Используем найденный селектор .job-card
        const cards = document.querySelectorAll('.job-card');
        console.log(`🔍 Найдено ${cards.length} карточек с селектором .job-card`);

        const results = [];
        
        console.log(`🔍 Обрабатываем ${cards.length} карточек на странице...`);

        cards.forEach((card, index) => {
          try {
            // Ищем название вакансии - в HireHi это обычно в тексте карточки
            let title = '';
            const allText = card.textContent || '';
            const lines = allText.split('\n').map(line => line.trim()).filter(line => line);
            
            // Ищем строку с названием должности (обычно содержит "разработчик", "менеджер" и т.д.)
            for (const line of lines) {
              if (line.includes('разработчик') || line.includes('менеджер') || 
                  line.includes('дизайнер') || line.includes('аналитик') ||
                  line.includes('тестировщик') || line.includes('инженер') ||
                  line.includes('Frontend') || line.includes('Backend') ||
                  line.includes('Developer') || line.includes('Engineer')) {
                title = line;
                break;
              }
            }
            
            // Если не нашли по ключевым словам, берем самую длинную строку (кроме компании)
            if (!title) {
              const filteredLines = lines.filter(line => 
                line.length > 5 && 
                !line.includes('₽') && 
                !line.includes('руб') &&
                !line.includes('сегодня') && 
                !line.includes('вчера') &&
                !line.includes('Activa') && // Исключаем названия компаний
                !line.includes('Management')
              );
              
              if (filteredLines.length > 0) {
                title = filteredLines.reduce((longest, current) => 
                  current.length > longest.length ? current : longest
                );
              }
            }

            // Ищем компанию - обычно в начале текста
            let company = '';
            const companyElement = card.querySelector('.job-company-name');
            if (companyElement) {
              company = companyElement.textContent?.trim() || '';
            } else {
              // Если не нашли по селектору, ищем в тексте
              for (const line of lines) {
                if (line && !line.includes('₽') && !line.includes('руб') && 
                    !line.includes('разработчик') && !line.includes('менеджер') &&
                    !line.includes('сегодня') && !line.includes('вчера') &&
                    line.length > 2 && line.length < 50) {
                  company = line;
                  break;
                }
              }
            }

            // Ищем зарплату
            let salary = 'Не указана';
            const salaryElement = Array.from(card.querySelectorAll('*')).find(el => {
              const text = el.textContent || '';
              return (text.includes('₽') || text.includes('руб')) && 
                     text.length < 50 && 
                     text.length > 5 &&
                     /[\d]/.test(text);
            });

            if (salaryElement) {
              salary = salaryElement.textContent?.trim() || 'Не указана';
            }

            // Ищем ссылку на вакансию
            const vacancyLink = card.querySelector('a[href*="/vacancy/"]') || 
                               card.querySelector('a[href*="/job/"]') ||
                               card.querySelector('a');

            let url = vacancyLink?.getAttribute('href') || '';
            
            // Если ссылки нет, создаем URL на основе данных карточки
            if (!url) {
              // В HireHi ссылки могут быть динамическими, создаем URL на основе ID или данных
              const cardId = card.getAttribute('data-id') || card.getAttribute('id') || `hirehi-${index}`;
              url = `https://hirehi.ru/vacancy/${cardId}`;
            }

            // Очищаем название от зарплаты
            if (title.includes('₽') || title.includes('руб')) {
              const parts = title.split(/[₽руб]/);
              title = parts[0].trim();
            }
            
            // Очищаем зарплату от названия должности
            if (salary.includes('Frontend') || salary.includes('Backend') || 
                salary.includes('Developer') || salary.includes('Engineer') ||
                salary.includes('разработчик') || salary.includes('тестировщик') ||
                salary.includes('аналитик') || salary.includes('менеджер') ||
                salary.includes('дизайнер') || salary.includes('программист') ||
                salary.includes('специалист') || salary.includes('инженер') ||
                salary.includes('консультант') || salary.includes('руководитель')) {
              salary = 'Не указана';
            }
            
            // Дополнительная проверка - если зарплата слишком длинная
            if (salary.length > 30) {
              salary = 'Не указана';
            }
            
            // Проверяем, что зарплата содержит только цифры, пробелы, дефисы и символы валют
            if (salary !== 'Не указана' && !/^[\d\s\-₽руб\.\,]+$/.test(salary)) {
              salary = 'Не указана';
            }
            
            // Проверяем, что зарплата не равна названию должности
            if (salary === title) {
              salary = 'Не указана';
            }

            // Логируем данные для отладки
            console.log(`🔍 Карточка ${index}: title="${title}", company="${company}", salary="${salary}"`);
            
            if (title && company && url) {
              // Определяем тип занятости
              const employment = mapEmployment('hirehi', `${title} ${description || ''}`);
              
              results.push({
                id: `hirehi-p${config.currentPage}-${index}`,
                title,
                salary,
                company,
                url: url.startsWith('http') ? url : `https://hirehi.ru${url}`,
                source: 'hirehi',
                employment
              });
            } else {
              console.log(`❌ Пропускаем карточку ${index}: неполные данные`);
            }

          } catch (error) {
            console.error(`❌ Ошибка при парсинге вакансии ${index} на странице ${config.currentPage}:`, error);
          }
        });

        return results;
      }, { currentPage });

      console.log(`✅ Страница ${currentPage}: найдено ${pageVacancies.length} вакансий`);
      allVacancies.push(...pageVacancies);

      // Проверяем, есть ли следующая страница
      const nextPageExists = await page.evaluate(() => {
        // Ищем кнопку "Следующая страница" или пагинацию
        const nextButton = document.querySelector('.pagination .next, .pagination a[rel="next"], .next-page, [data-testid="next-page"]');
        return nextButton && !nextButton.classList.contains('disabled');
      });

      if (!nextPageExists) {
        console.log('✅ Достигнута последняя страница');
        hasNextPage = false;
      }

      currentPage++;
      
      // Небольшая пауза между страницами
      await page.waitForTimeout(2000);
    }

    console.log(`🎉 Парсинг HireHi завершен! Обработано ${currentPage - 1} страниц, найдено ${allVacancies.length} вакансий`);
    return allVacancies;

  } catch (error) {
    console.error('❌ Ошибка парсинга HireHi:', error);
    return [];
  } finally {
    await browser.close();
  }
}
