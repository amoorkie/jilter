// Детальная отладка HireHi парсера
const { chromium } = require('playwright');

async function debugHireHi() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🔍 Детальная отладка HireHi...');
    
    // Переходим на страницу с поиском
    const searchUrl = 'https://hirehi.ru/?q=javascript';
    console.log(`📄 Переходим на: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle' });
    console.log('✅ Страница загружена');
    
    // Ждем загрузки JavaScript
    await page.waitForTimeout(5000);
    console.log('⏰ Ждали 5 секунд для загрузки JS');
    
    // Проверяем, есть ли карточки
    const cards = await page.$$('.job-card');
    console.log(`🔍 Найдено ${cards.length} карточек с селектором .job-card`);
    
    if (cards.length === 0) {
      console.log('❌ Карточки не найдены, ищем альтернативные селекторы...');
      
      // Пробуем другие селекторы
      const alternativeSelectors = [
        '[class*="job"]',
        '[class*="card"]',
        '[class*="vacancy"]',
        'div[class*="job"]',
        'div[class*="card"]'
      ];
      
      for (const selector of alternativeSelectors) {
        const elements = await page.$$(selector);
        console.log(`🔍 Селектор ${selector}: ${elements.length} элементов`);
        
        if (elements.length > 0) {
          // Анализируем первый элемент
          const firstEl = elements[0];
          const text = await firstEl.textContent();
          const className = await firstEl.getAttribute('class');
          console.log(`   Класс: ${className}`);
          console.log(`   Текст: ${text.substring(0, 100)}...`);
        }
      }
      
      // Проверяем, есть ли вообще контент на странице
      const bodyText = await page.textContent('body');
      console.log(`📄 Общий текст страницы: ${bodyText.substring(0, 200)}...`);
      
      // Проверяем, есть ли ошибки в консоли
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('❌ Ошибка в консоли:', msg.text());
        }
      });
      
    } else {
      console.log('✅ Карточки найдены, анализируем...');
      
      // Анализируем первую карточку
      const firstCard = cards[0];
      const cardText = await firstCard.textContent();
      const cardHTML = await firstCard.innerHTML();
      
      console.log('📄 Текст карточки:', cardText.substring(0, 200));
      console.log('🏗️ HTML карточки:', cardHTML.substring(0, 300));
      
      // Ищем элементы внутри карточки
      const links = await firstCard.$$('a');
      console.log(`🔗 Ссылок в карточке: ${links.length}`);
      
      const images = await firstCard.$$('img');
      console.log(`🖼️ Изображений в карточке: ${images.length}`);
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'hirehi-debug.png' });
    console.log('📸 Скриншот сохранен как hirehi-debug.png');
    
  } catch (error) {
    console.error('❌ Ошибка при отладке:', error);
  } finally {
    await browser.close();
  }
}

debugHireHi();
