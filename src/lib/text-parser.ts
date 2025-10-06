// src/lib/text-parser.ts

export interface ParsedVacancy {
  full_description: string;
  sections: { title: string; content: string }[];
}

// Паттерны для поиска заголовков секций (только 3 блока)
const SECTION_HEADER_PATTERNS = [
  // Требования (включая навыки, квалификацию, опыт)
  /(?:^|\n)\s*(?:требования|ожидания|что\s+мы\s+ждем|необходимые\s+навыки|квалификация|опыт\s+работы|нужно|необходимо|кого\s+мы\s+ищем|ты\s+нам\s+подходишь|кандидат|skills?|навыки|компетенции)[\s\:\-]/gi,
  
  // Условия работы (включая преимущества, льготы, график, зарплату)
  /(?:^|\n)\s*(?:условия|условия\s+работы|формат\s+работы|график\s+работы|локация|офис|график|режим\s+работы|место\s+работы|работаем|трудоустройство|мы\s+предлагаем|льготы|преимущества|что\s+мы\s+предлагаем|бонусы|дополнительные\s+возможности|плюсы|benefits?|перки|зарплата|компенсации|оплата|доход)[\s\:\-]/gi,
];

interface HeaderMatch {
  name: string;
  index: number;
  matchText: string;
}

function findHeaders(text: string): HeaderMatch[] {
  console.log("DEBUG: Поиск заголовков в тексте:", text.substring(0, 200) + "...");
  
  const headers: HeaderMatch[] = [];
  
  SECTION_HEADER_PATTERNS.forEach((pattern, patternIndex) => {
    const matches = Array.from(text.matchAll(pattern));
    console.log(`DEBUG: Паттерн ${patternIndex} нашел ${matches.length} совпадений:`, matches.map(m => m[0]));
    
    matches.forEach(match => {
      if (match.index !== undefined) {
        // Определяем название секции по найденному тексту (улучшенная логика)
        const matchText = match[0];
        let sectionName = '';
        
        const lowerMatch = matchText.toLowerCase().replace(/[\:\-\s]+/g, ' ').trim();
        
        // Группируем всё только в 3 блока
        if (/(?:требования|ожидания|навыки|квалификация|кандидат|skills?|ищем|подходишь|компетенци)/.test(lowerMatch)) {
          sectionName = 'Требования';
        } else if (/(?:условия|график|формат|режим|место|работаем|трудоустройство|офис|локация|предлагаем|льготы|преимущества|бонусы|плюсы|benefits?|перки|зарплата|компенсации|оплата|доход)/.test(lowerMatch)) {
          sectionName = 'Условия';
        } else {
          // Всё остальное (включая задачи, обязанности, описание компании) идёт в "Описание вакансии"
          sectionName = 'Описание вакансии';
        }
        
        headers.push({
          name: sectionName,
          index: match.index,
          matchText: matchText,
        });
      }
    });
  });
  
  // Сортируем по индексу и убираем дубликаты
  const sortedHeaders = headers
    .sort((a, b) => a.index - b.index)
    .filter((header, index, arr) => {
      // Убираем дубликаты по индексу (в пределах 50 символов)
      return index === 0 || Math.abs(header.index - arr[index - 1].index) > 50;
    });
  
  console.log("DEBUG: Финальные заголовки:", sortedHeaders);
  return sortedHeaders;
}

function formatBlock(text: string): string {
  console.log("DEBUG: Форматирование блока:", text.substring(0, 100) + "...");
  
  if (!text || text.trim() === '') {
    return '';
  }
  
  // Нормализуем переносы строк и убираем лишние пробелы
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Разбиваем текст на строки, сохраняя пустые для абзацев
  const lines = normalizedText.split('\n').map(line => line.trim());
  console.log("DEBUG: Строки для форматирования:", lines);
  
  const allElements: string[] = [];
  let currentList: string[] = [];
  let listType: 'ol' | 'ul' | null = null;
  let currentParagraph: string[] = [];
  
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const paragraphText = currentParagraph.join(' ').trim();
      if (paragraphText) {
        allElements.push(`<p class="whitespace-pre-line">${paragraphText}</p>`);
      }
      currentParagraph = [];
    }
  };
  
  const flushList = () => {
    if (currentList.length > 0 && listType) {
      allElements.push(`<${listType}>${currentList.map(item => `<li>${item}</li>`).join('')}</${listType}>`);
      currentList = [];
      listType = null;
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Пустая строка - завершаем текущий абзац
    if (line === '') {
      flushParagraph();
      continue;
    }
    
    // Проверяем, является ли строка элементом списка (более гибкие паттерны)
    const numberedMatch = line.match(/^(\d+)[\.\)\:]\s+(.+)$/);
    const bulletMatch = line.match(/^[\-\•\*\+]\s+(.+)$/);
    
    if (numberedMatch || bulletMatch) {
      // Завершаем текущий абзац перед началом списка
      flushParagraph();
      
      const isNumbered = !!numberedMatch;
      const newListType = isNumbered ? 'ol' : 'ul';
      const itemText = isNumbered ? numberedMatch[2] : bulletMatch[1];
      
      // Если тип списка изменился, завершаем предыдущий список
      if (listType && listType !== newListType) {
        flushList();
      }
      
      listType = newListType;
      currentList.push(itemText.trim());
    } else {
      // Завершаем текущий список, если он есть
      flushList();
      
      // Добавляем строку к текущему абзацу
      currentParagraph.push(line);
    }
  }
  
  // Завершаем оставшиеся элементы
  flushParagraph();
  flushList();
  
  const result = allElements.join('\n');
  console.log("DEBUG: Результат форматирования:", result);
  return result;
}

export function parseAndFormatVacancyText(text: string): ParsedVacancy {
  console.log("DEBUG: Входной текст для парсинга:", text);

  if (!text || text.trim() === '') {
    return {
      full_description: '',
      sections: [],
    };
  }

  const headerMatches = findHeaders(text);
  console.log("DEBUG: Найденные заголовки:", headerMatches);

  const sections: { title: string; content: string }[] = [];
  let lastEndIndex = 0;

  for (let i = 0; i < headerMatches.length; i++) {
    const currentHeader = headerMatches[i];
    // Текст до текущего заголовка
    const blockContent = text.slice(lastEndIndex, currentHeader.index).trim();

    if (i === 0) {
      // Первый блок — это полное описание (до первого заголовка)
      if (blockContent) {
        sections.push({
          title: 'Описание вакансии', // Добавляем заголовок для общего описания
          content: blockContent,
        });
      }
    } else {
      // Предыдущий блок — это содержимое предыдущего заголовка
      const prevHeader = headerMatches[i - 1];
      sections.push({
        title: prevHeader.name,
        content: blockContent,
      });
    }

    // Установите индекс конца текущего блока (после заголовка)
    lastEndIndex = currentHeader.index + currentHeader.matchText.length;
  }

  // Добавьте последний блок (после последнего заголовка)
  const lastBlockContent = text.slice(lastEndIndex).trim();
  if (lastBlockContent && headerMatches.length > 0) {
    const lastHeader = headerMatches[headerMatches.length - 1];
    sections.push({
      title: lastHeader.name,
      content: lastBlockContent,
    });
  } else if (headerMatches.length === 0 && text.trim()) {
    // Если заголовков не было, весь текст идет в "Описание"
    sections.push({
      title: 'Описание вакансии',
      content: text.trim(),
    });
  }

  // Объединяем контент одинаковых секций
  const mergedSections: { [key: string]: string[] } = {};
  
  sections.forEach(section => {
    if (!mergedSections[section.title]) {
      mergedSections[section.title] = [];
    }
    mergedSections[section.title].push(section.content);
  });

  // Форматируем объединённые блоки
  const formattedSections = Object.entries(mergedSections).map(([title, contents]) => ({
    title,
    content: formatBlock(contents.join('\n\n')),
  }));

  console.log("DEBUG: Финальный результат парсинга:", { 
    full_description: formattedSections.find(s => s.title === 'Описание вакансии')?.content || '', 
    sections: formattedSections.filter(s => s.title !== 'Описание вакансии') 
  });

  // Возвращаем структуру: full_description для общего описания и только нужные секции
  const fullDescription = formattedSections.find(s => s.title === 'Описание вакансии')?.content || '';
  const otherSections = formattedSections.filter(s => s.title !== 'Описание вакансии');

  return {
    full_description: fullDescription,
    sections: otherSections,
  };
}