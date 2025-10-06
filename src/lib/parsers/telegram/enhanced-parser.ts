// Улучшенный Telegram парсер с множественными методами
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface TelegramVacancy {
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
  'цифровой дизайн', 'веб-дизайнер', 'интерфейсный дизайн', 'графический дизайн',
  'визуальный дизайн', 'коммуникационный дизайн', 'дизайн-мышление', 'user experience',
  'user interface', 'ux-дизайнер', 'ui-дизайнер', 'продуктовый дизайнер', 'графический дизайнер',
  'интерфейсный дизайнер', 'веб-дизайнер', 'визуальный дизайнер', 'motion-дизайнер',
  'ux-исследователь', 'арт-директор', 'creative director', 'дизайнер коммуникаций',
  'дизайнер бренд-идентики', 'иллюстратор', '3d-дизайнер', 'designer', 'ui designer',
  'ux designer', 'product designer', 'visual designer', 'graphic designer', 'web designer',
  'interaction designer', 'motion designer', 'ux researcher', 'art director', 'creative director'
];

function isRelevantVacancy(text: string): boolean {
  const lowerText = text.toLowerCase();
  return DESIGN_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function extractVacancyInfo(text: string): Partial<TelegramVacancy> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const title = lines[0] || '';

  const salaryMatch = text.match(/(\d+[\s,]*\d*)\s*(₽|руб|рублей|USD|\$)/i);
  const salary = salaryMatch ? salaryMatch[0] : 'Не указана';

  const companyMatch = text.match(/(?:в|от|компания|company)\s+([А-Яа-яA-Za-z\s&.,-]+)/i);
  const company = companyMatch ? companyMatch[1].trim() : 'Компания не указана';

  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  const url = urlMatch ? urlMatch[1] : '';

  return {
    title,
    company,
    salary,
    url,
    description: text
  };
}

// Метод 1: RSS парсинг
export async function parseTelegramRSS(
  channelUsername: string,
  limit: number = 20
): Promise<TelegramVacancy[]> {
  const allVacancies: TelegramVacancy[] = [];

  try {
    console.log(`🎯 Начинаем RSS парсинг Telegram-канала @${channelUsername}`);
    
    const rssUrls = [
      `https://t.me/s/${channelUsername}/rss`,
      `https://t.me/${channelUsername}/rss`,
      `https://rsshub.app/telegram/channel/${channelUsername}`,
      `https://t.me/s/${channelUsername}`,
      `https://t.me/${channelUsername}`
    ];

    for (const rssUrl of rssUrls) {
      try {
        console.log(`🔍 Пробуем RSS: ${rssUrl}`);
        const response = await axios.get(rssUrl, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.data && response.data.length > 1000) {
          console.log(`✅ RSS доступен: ${response.data.length} символов`);
          
          const $ = cheerio.load(response.data);
          const items = $('item, entry, .tgme_widget_message');
          
          console.log(`📋 Найдено элементов: ${items.length}`);
          
          items.slice(0, limit).each((index, element) => {
            try {
              // Пробуем разные способы извлечения текста
              let title = $(element).find('title').text().trim();
              let description = $(element).find('description').text().trim();
              let link = $(element).find('link').attr('href') || $(element).find('a').attr('href') || '';
              
              // Если не нашли в стандартных полях, ищем в Telegram виджетах
              if (!title) {
                title = $(element).find('.tgme_widget_message_text').text().trim();
              }
              if (!description) {
                description = $(element).find('.tgme_widget_message_text').text().trim();
              }
              
              // Если все еще нет текста, берем весь текст элемента
              if (!title && !description) {
                const fullText = $(element).text().trim();
                title = fullText.substring(0, 100);
                description = fullText;
              }
              
              const combinedText = `${title} ${description}`.trim();
              
              if (combinedText && isRelevantVacancy(combinedText)) {
                console.log(`✅ Найдена релевантная вакансия: "${title}"`);
                const vacancyInfo = extractVacancyInfo(combinedText);
                
                allVacancies.push({
                  id: `telegram-rss-${channelUsername}-${index}`,
                  title: vacancyInfo.title || title || 'Вакансия дизайнера',
                  company: vacancyInfo.company || 'Компания не указана',
                  salary: vacancyInfo.salary || 'Не указана',
                  url: vacancyInfo.url || link,
                  description: vacancyInfo.description || description,
                  source: `Telegram RSS @${channelUsername}`,
                  publishedAt: new Date()
                });
              }
            } catch (error) {
              console.error(`❌ Ошибка обработки RSS элемента ${index}:`, error);
            }
          });
          
          if (allVacancies.length > 0) {
            console.log(`✅ RSS парсинг успешен: ${allVacancies.length} вакансий`);
            break;
          }
        }
      } catch (error) {
        console.log(`⚠️ RSS недоступен: ${rssUrl} - ${error.message}`);
      }
    }

    console.log(`🎯 RSS парсинг @${channelUsername} итого: ${allVacancies.length} вакансий`);
    return allVacancies;

  } catch (error) {
    console.error(`❌ Ошибка RSS парсинга @${channelUsername}:`, error);
    return [];
  }
}

// Метод 2: Веб-скрапинг с улучшенными селекторами
export async function parseTelegramWeb(
  channelUsername: string,
  limit: number = 20
): Promise<TelegramVacancy[]> {
  const allVacancies: TelegramVacancy[] = [];
  
  const urls = [
    `https://t.me/s/${channelUsername}`,
    `https://t.me/${channelUsername}`,
    `https://t.me/s/${channelUsername}?embed=1`,
    `https://t.me/${channelUsername}?embed=1`
  ];

  for (const url of urls) {
    try {
      console.log(`🎯 Пробуем веб-парсинг @${channelUsername}: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 20000
      });

      const $ = cheerio.load(response.data);
      
      // Расширенные селекторы для Telegram
      const selectors = [
        '.tgme_widget_message',
        '.tgme_widget_message_wrap',
        '.tgme_widget_message_inner',
        '.tgme_widget_message_bubble',
        '.tgme_widget_message_text',
        '.tgme_widget_message_text_wrap',
        '.message',
        '.post',
        '[data-post]',
        'article',
        '.tgme_widget_message_date'
      ];
      
      let messages = $();
      for (const selector of selectors) {
        messages = $(selector);
        if (messages.length > 0) {
          console.log(`✅ Найден селектор: ${selector} (${messages.length} элементов)`);
          break;
        }
      }
      
      if (messages.length === 0) {
        // Если не нашли стандартные селекторы, ищем по тексту
        const allText = $.text();
        const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 20);
        
        console.log(`📋 Ищем по тексту: ${lines.length} строк`);
        
        let foundKeywords = 0;
        lines.forEach((line, index) => {
          const lowerLine = line.toLowerCase();
          const hasDesignKeyword = DESIGN_KEYWORDS.some(keyword => lowerLine.includes(keyword.toLowerCase()));
          
          if (hasDesignKeyword && isRelevantVacancy(line)) {
            foundKeywords++;
            const vacancyInfo = extractVacancyInfo(line);
            
            allVacancies.push({
              id: `telegram-text-${channelUsername}-${index}`,
              title: vacancyInfo.title || line.substring(0, 100),
              company: vacancyInfo.company || 'Компания не указана',
              salary: vacancyInfo.salary || 'Не указана',
              url: vacancyInfo.url || '',
              description: vacancyInfo.description,
              source: `Telegram Text @${channelUsername}`,
              publishedAt: new Date()
            });
          }
        });
        
        console.log(`🎯 Найдено ключевых слов дизайна: ${foundKeywords}`);
      } else {
        messages.slice(0, limit).each((index, element) => {
          try {
            const text = $(element).find('.tgme_widget_message_text').text().trim() || 
                        $(element).text().trim();
            const link = $(element).find('a').attr('href') || '';
            const time = $(element).find('.tgme_widget_message_date').text().trim();

            if (text && isRelevantVacancy(text)) {
              const vacancyInfo = extractVacancyInfo(text);
              
              allVacancies.push({
                id: `telegram-web-${channelUsername}-${index}`,
                title: vacancyInfo.title || text.substring(0, 100),
                company: vacancyInfo.company || 'Компания не указана',
                salary: vacancyInfo.salary || 'Не указана',
                url: vacancyInfo.url || link,
                description: vacancyInfo.description,
                source: `Telegram Web @${channelUsername}`,
                publishedAt: new Date()
              });
            }
          } catch (error) {
            console.error(`❌ Ошибка обработки сообщения ${index}:`, error);
          }
        });
      }

      if (allVacancies.length > 0) {
        console.log(`✅ Веб-парсинг успешен: ${allVacancies.length} вакансий`);
        break;
      }

    } catch (error) {
      console.log(`⚠️ Веб-парсинг недоступен: ${url} - ${error.message}`);
    }
  }

  console.log(`🎯 Веб-парсинг @${channelUsername} итого: ${allVacancies.length} вакансий`);
  return allVacancies;
}

// Метод 3: Комбинированный парсинг
export async function parseTelegramChannel(
  channelUsername: string, 
  limit: number = 20
): Promise<TelegramVacancy[]> {
  console.log(`🎯 Начинаем комбинированный парсинг Telegram-канала @${channelUsername}`);
  
  // Пробуем все методы параллельно
  const [rssVacancies, webVacancies] = await Promise.all([
    parseTelegramRSS(channelUsername, limit).catch(() => []),
    parseTelegramWeb(channelUsername, limit).catch(() => [])
  ]);

  // Объединяем результаты и убираем дубли
  const allVacancies = [...rssVacancies, ...webVacancies];
  const uniqueVacancies = allVacancies.filter((vacancy, index, self) => 
    index === self.findIndex(v => v.title === vacancy.title && v.company === vacancy.company)
  );

  console.log(`🎯 Комбинированный парсинг @${channelUsername} итого: ${uniqueVacancies.length} уникальных вакансий`);
  return uniqueVacancies;
}

export async function parseTelegramChannels(
  channelUsernames: string[], 
  limit: number = 20
): Promise<TelegramVacancy[]> {
  let allVacancies: TelegramVacancy[] = [];
  
  for (const username of channelUsernames) {
    try {
      const channelVacancies = await parseTelegramChannel(username, limit);
      allVacancies = allVacancies.concat(channelVacancies);
    } catch (error) {
      console.error(`❌ Ошибка парсинга канала @${username}:`, error);
    }
  }
  
  return allVacancies;
}
