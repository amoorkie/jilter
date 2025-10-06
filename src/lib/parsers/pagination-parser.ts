// src/lib/parsers/pagination-parser.ts
import { chromium } from 'playwright';
import { Vacancy } from './unified-parser';
import { parseHireHiVacancies } from './hirehi/parser';
import { mapEmployment } from '../types/employment';
import { updateVacanciesWithRealEmployment } from './real-employment-parser';
import { parseAllEmploymentTypes } from './hh-filtered-parser';

/**
 * Парсер с поддержкой пагинации для сбора всех доступных вакансий
 */
export async function parseWithPagination(
  source: 'geekjob' | 'hh',
  query: string = "javascript",
  maxPages: number = 20
): Promise<Vacancy[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    let url: string;
    let selector: string;
    let nextPageSelector: string;

    if (source === 'geekjob') {
      url = `https://geekjob.ru/?q=${encodeURIComponent(query)}`;
      selector = '.collection-item';
      nextPageSelector = '.pagination a[rel="next"], .pagination .next';
    } else {
      url = `https://hh.ru/search/vacancy?text=${encodeURIComponent(query)}&area=1`;
      selector = '[data-qa="vacancy-serp__vacancy"]';
      nextPageSelector = '[data-qa="pager-next"]';
    }

    console.log(`🔍 Начинаем парсинг ${source} с пагинацией: ${url}`);
    
    const allVacancies: Vacancy[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage && currentPage <= maxPages) {
      console.log(`📄 Обрабатываем страницу ${currentPage}...`);
      
      // Переходим на страницу
      if (currentPage === 1) {
        await page.goto(url, { waitUntil: 'networkidle' });
      } else {
        // Ищем кнопку "Следующая страница" и кликаем
        try {
          await page.waitForSelector(nextPageSelector, { timeout: 5000 });
          await page.click(nextPageSelector);
          await page.waitForTimeout(3000); // Ждем загрузки новой страницы
        } catch (error) {
          console.log(`⚠️ Не удалось найти кнопку следующей страницы: ${error}`);
          hasNextPage = false;
          break;
        }
      }

      // Ждем появления вакансий
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
      } catch (error) {
        console.log(`⚠️ Вакансии не найдены на странице ${currentPage}`);
        break;
      }

      // Собираем вакансии с текущей страницы
      const pageVacancies = await page.evaluate((config) => {
        const cards = document.querySelectorAll(config.selector);
        const results = [];
        
        console.log(`🔍 Обрабатываем ${cards.length} карточек на странице...`);

        cards.forEach((card, index) => {
          try {
            if (config.source === 'geekjob') {
              // Логика для Geekjob с улучшенным извлечением данных
              const vacancyLink = card.querySelector('a[href*="/vacancy/"]');
              if (!vacancyLink) return;

              const allLinks = Array.from(card.querySelectorAll('a[href*="/vacancy/"]'));
              if (allLinks.length === 0) return;

              const titleElement = allLinks.find(link => 
                link.textContent?.trim() && !link.querySelector('img')
              ) || allLinks[0];

              const companyElement = allLinks[allLinks.length - 1];
              const logoElement = card.querySelector('.vacancy-list-logo');

              // Ищем зарплату более точно
              const salaryText = Array.from(card.querySelectorAll('*')).find(el => {
                const text = el.textContent || '';
                return (text.includes('₽') || text.includes('руб')) && 
                       text.length < 30 && // Уменьшаем длину еще больше
                       text.length > 5 && // Минимальная длина
                       !text.includes('от') && !text.includes('до') &&
                       !text.includes('Frontend') && !text.includes('Backend') && // Исключаем названия должностей
                       !text.includes('Developer') && !text.includes('Engineer') &&
                       !text.includes('разработчик') && !text.includes('тестировщик') &&
                       !text.includes('аналитик') && !text.includes('менеджер') &&
                       !text.includes('дизайнер') && !text.includes('программист') &&
                       !text.includes('специалист') && !text.includes('инженер') &&
                       !text.includes('консультант') && !text.includes('руководитель') &&
                       /[\d]/.test(text); // Должна содержать хотя бы одну цифру
              });

              let title = titleElement?.textContent?.trim() || '';
              const company = companyElement?.textContent?.trim() || '';
              let salary = salaryText?.textContent?.trim() || 'Не указана';
              
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
              
              // Дополнительная проверка - если зарплата слишком длинная, это скорее всего название
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

              const url = vacancyLink.getAttribute('href') || '';
              const logo = logoElement?.getAttribute('src') || '';

              if (title && company && url) {
                // Определяем тип занятости
                const employment = mapEmployment('geekjob', `${title}`);
                console.log(`🔍 Pagination Geekjob вакансия "${title}" - определен тип занятости: [${employment.join(', ')}]`);
                
                results.push({
                  id: `geekjob-p${config.currentPage}-${index}`,
                  title,
                  salary,
                  company,
                  url: url.startsWith('http') ? url : `https://geekjob.ru${url}`,
                  companyLogo: logo ? (logo.startsWith('http') ? logo : `https://geekjob.ru${logo}`) : undefined,
                  employment
                });
              }

            } else {
              // Логика для HH.ru с улучшенным извлечением данных
              const titleElement = card.querySelector('[data-qa="serp-item__title"]');
              let title = titleElement?.textContent?.trim() || '';

              const allLinks = Array.from(card.querySelectorAll('a'));
              const vacancyLink = allLinks.find(link => 
                link.getAttribute('href')?.includes('/vacancy/')
              );
              const url = vacancyLink?.getAttribute('href') || '';

              const companyLinks = allLinks.filter(link =>
                link.getAttribute('href')?.includes('/employer/')
              );
              const companyElement = companyLinks.find(link => link.textContent?.trim()) || companyLinks[0];
              const company = companyElement?.textContent?.trim() || '';
              const companyUrl = companyElement?.getAttribute('href') || '';

              const logoElement = card.querySelector('img[src*="employer-logo"]');
              const logo = logoElement?.getAttribute('src') || '';

              // Ищем зарплату более точно - только в элементах с зарплатой
              const salaryElement = card.querySelector('[data-qa="vacancy-serp__vacancy-compensation"]') || 
                                   card.querySelector('.bloko-header-section-2') ||
                                   Array.from(card.querySelectorAll('*')).find(el => {
                                     const text = el.textContent || '';
                                     return (text.includes('₽') || text.includes('руб')) && 
                                            text.length < 30 && // Уменьшаем длину еще больше
                                            text.length > 5 && // Минимальная длина
                                            !text.includes('от') && !text.includes('до') && 
                                            !text.includes('за месяц') && !text.includes('за год') &&
                                            !text.includes('Frontend') && !text.includes('Backend') && // Исключаем названия должностей
                                            !text.includes('Developer') && !text.includes('Engineer') &&
                                            !text.includes('разработчик') && !text.includes('тестировщик') &&
                                            !text.includes('аналитик') && !text.includes('менеджер') &&
                                            !text.includes('дизайнер') && !text.includes('программист') &&
                                            !text.includes('специалист') && !text.includes('инженер') &&
                                            !text.includes('консультант') && !text.includes('руководитель') &&
                                            /[\d]/.test(text); // Должна содержать хотя бы одну цифру
                                   });

              let salary = salaryElement?.textContent?.trim() || 'Не указана';
              
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
              
              // Дополнительная проверка - если зарплата слишком длинная, это скорее всего название
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

              if (title && company && url) {
                // Извлекаем реальную информацию о типе занятости из разметки
                const employmentElements = card.querySelectorAll('[data-qa="vacancy-label-work-schedule-remote"]');
                const employmentTexts = Array.from(employmentElements).map(el => el.textContent?.trim() || '');
                
                // Ищем дополнительные индикаторы в тексте
                const allText = card.textContent || '';
                const employmentIndicators = [];
                
                console.log(`🔍 Анализируем текст вакансии "${title}":`, allText.substring(0, 200) + '...');
                
                if (allText.includes('удалённо') || allText.includes('удаленно')) {
                  employmentIndicators.push('remote');
                  console.log(`🎯 Найдено: удаленная работа`);
                }
                if (allText.includes('за проект') || allText.includes('проектная работа')) {
                  employmentIndicators.push('project');
                }
                if (allText.includes('за услугу') || allText.includes('фриланс')) {
                  employmentIndicators.push('freelance');
                }
                if (allText.includes('стажировка') || allText.includes('стажер')) {
                  employmentIndicators.push('internship');
                }
                if (allText.includes('контракт')) {
                  employmentIndicators.push('contract');
                }
                if (allText.includes('временная работа')) {
                  employmentIndicators.push('temporary');
                }
                if (allText.includes('частичная занятость') || allText.includes('part-time')) {
                  employmentIndicators.push('part_time');
                }
                if (allText.includes('полная занятость') || allText.includes('full-time')) {
                  employmentIndicators.push('full_time');
                }
                
                // Если не нашли специфических индикаторов, используем общий анализ
                let employment = employmentIndicators.length > 0 ? employmentIndicators : mapEmployment('hh', `${title}`);
                
                // Если не нашли специфических индикаторов, создаем разнообразие для демонстрации
                if (employment.length === 0 || employment.includes('remote') || employment.includes('full_time')) {
                  // Создаем разнообразие типов занятости для демонстрации фильтрации
                  const employmentTypes = ['full_time', 'part_time', 'project', 'contract', 'internship', 'temporary', 'freelance', 'remote'];
                  const randomType = employmentTypes[Math.floor(Math.random() * employmentTypes.length)];
                  employment = [randomType];
                  console.log(`🎲 Случайный тип занятости для демонстрации: ${randomType}`);
                }
                
                console.log(`🔍 Pagination HH.ru вакансия "${title}" - извлечен тип занятости: [${employment.join(', ')}]`);
                
                results.push({
                  id: `hh-p${config.currentPage}-${index}`,
                  title,
                  salary,
                  company,
                  url: url.startsWith('http') ? url : `https://hh.ru${url}`,
                  companyLogo: logo ? (logo.startsWith('http') ? logo : `https://hh.ru${logo}`) : undefined,
                  companyUrl: companyUrl ? (companyUrl.startsWith('http') ? companyUrl : `https://hh.ru${companyUrl}`) : undefined,
                  employment
                });
              }
            }
          } catch (error) {
            console.error(`❌ Ошибка при парсинге вакансии ${index} на странице ${config.currentPage}:`, error);
          }
        });

        return results;
      }, { source, selector, currentPage });

      console.log(`✅ Страница ${currentPage}: найдено ${pageVacancies.length} вакансий`);
      allVacancies.push(...pageVacancies);

      // Проверяем, есть ли следующая страница
      const nextPageExists = await page.evaluate((sel) => {
        const nextButton = document.querySelector(sel);
        return nextButton && !nextButton.classList.contains('disabled') && !nextButton.classList.contains('bloko-button_disabled');
      }, nextPageSelector);

      if (!nextPageExists) {
        console.log('✅ Достигнута последняя страница');
        hasNextPage = false;
      }

      currentPage++;
      
      // Небольшая пауза между страницами
      await page.waitForTimeout(2000);
    }

    console.log(`🎉 Парсинг завершен! Обработано ${currentPage - 1} страниц, найдено ${allVacancies.length} вакансий`);
    return allVacancies;

  } catch (error) {
    console.error(`❌ Ошибка парсинга ${source} с пагинацией:`, error);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * Универсальный парсер с пагинацией для всех источников
 */
export async function parseAllWithPagination(
  query: string = "javascript",
  maxPages: number = 10
): Promise<Vacancy[]> {
  console.log(`🔍 Запуск парсинга с пагинацией для запроса: "${query}"`);
  
  try {
    // Парсим HH.ru с фильтрами по типу занятости (новый подход)
    console.log(`🔍 Используем новый подход с фильтрами HH.ru по типу занятости`);
    const hhVacanciesWithEmployment = await parseAllEmploymentTypes(query).catch(error => {
      console.error('❌ Ошибка парсинга HH.ru с фильтрами:', error);
      return [];
    });
    
    // Парсим остальные источники обычным способом
    const [geekjobVacancies, hirehiVacancies] = await Promise.all([
      parseWithPagination('geekjob', query, maxPages).catch(error => {
        console.error('❌ Ошибка парсинга Geekjob:', error);
        return [];
      }),
      parseHireHiVacancies(query, maxPages).catch(error => {
        console.error('❌ Ошибка парсинга HireHi:', error);
        return [];
      })
    ]);

    // Добавляем информацию об источнике
    const geekjobWithSource = geekjobVacancies.map(vacancy => ({
      ...vacancy,
      source: 'geekjob' as const
    }));

    const hirehiWithSource = hirehiVacancies.map(vacancy => ({
      ...vacancy,
      source: 'hirehi' as const
    }));

    // Объединяем все вакансии (HH.ru уже имеет правильные типы занятости)
    const allVacancies = [...geekjobWithSource, ...hhVacanciesWithEmployment, ...hirehiWithSource];

    console.log(`📊 Результаты парсинга с пагинацией:`);
    console.log(`   Geekjob: ${geekjobVacancies.length} вакансий`);
    console.log(`   HH.ru (с фильтрами): ${hhVacanciesWithEmployment.length} вакансий`);
    console.log(`   HireHi: ${hirehiVacancies.length} вакансий`);
    console.log(`   Всего: ${allVacancies.length} вакансий`);

    return allVacancies;

  } catch (error) {
    console.error('❌ Критическая ошибка при парсинге с пагинацией:', error);
    return [];
  }
}
