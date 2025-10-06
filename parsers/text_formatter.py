"""
Модуль для форматирования текста из HTML с сохранением структуры
"""

import re
import logging
from typing import List, Dict, Any

try:
    from bs4 import BeautifulSoup, NavigableString
except ImportError:
    print("Установите BeautifulSoup4: pip install beautifulsoup4")
    raise


def extract_formatted_text(element) -> str:
    """
    Извлекает текст из HTML элемента с сохранением форматирования
    - Списки (ul, ol, li) -> переносы строк с маркерами
    - Абзацы (p, div) -> двойные переносы строк
    - БЕЗ заголовков (h1-h6) -> избегаем дублирования в админ панели
    """
    if not element:
        return ''
    
    # Если это строка, возвращаем как есть
    if isinstance(element, str):
        return element.strip()
    
    result = []
    
    def process_element(elem, level=0):
        """Рекурсивная обработка элементов"""
        if isinstance(elem, NavigableString):
            text = str(elem).strip()
            if text:
                result.append(text)
            return
        
        tag_name = elem.name if hasattr(elem, 'name') else None
        
        if tag_name in ['ul', 'ol']:
            # Обработка списков
            for li in elem.find_all('li', recursive=False):
                result.append('\n• ')
                process_element(li, level + 1)
                
        elif tag_name == 'li':
            # Элемент списка
            for child in elem.children:
                process_element(child, level)
                
        elif tag_name in ['p', 'div', 'section']:
            # Абзацы и блоки
            if result and result[-1] != '\n\n':
                result.append('\n\n')
            
            for child in elem.children:
                process_element(child, level)
                
            if result and result[-1] != '\n\n':
                result.append('\n\n')
                
        elif tag_name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            # Пропускаем заголовки - избегаем дублирования в админ панели
            return
            
        elif tag_name in ['br']:
            # Переносы строк
            result.append('\n')
            
        elif tag_name in ['strong', 'b']:
            # Жирный текст (сохраняем содержимое)
            for child in elem.children:
                process_element(child, level)
                
        elif tag_name in ['em', 'i']:
            # Курсив (сохраняем содержимое)
            for child in elem.children:
                process_element(child, level)
                
        else:
            # Остальные элементы - просто извлекаем текст
            for child in elem.children:
                process_element(child, level)
    
    # Обрабатываем элемент
    process_element(element)
    
    # Собираем результат
    text = ''.join(result)
    
    # Очищаем лишние пробелы и переносы
    text = re.sub(r'\n{3,}', '\n\n', text)  # Не более 2 переносов подряд
    text = re.sub(r'[ \t]+', ' ', text)     # Убираем лишние пробелы
    text = text.strip()
    
    return text


def extract_structured_sections(soup: BeautifulSoup, full_description: str) -> Dict[str, str]:
    """
    Извлекает структурированные секции из HTML или текста
    """
    
    def find_section_by_headers(section_titles: List[str]) -> str:
        """Поиск секции по заголовкам в HTML"""
        for title in section_titles:
            # Ищем заголовок в HTML
            header_selectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'div', 'p']
            
            for selector in header_selectors:
                headers = soup.find_all(selector)
                for header in headers:
                    header_text = header.get_text().strip().lower()
                    if title.lower() in header_text:
                        # Нашли заголовок, ищем содержимое
                        content_element = None
                        
                        # Сначала ищем следующий элемент
                        next_sibling = header.find_next_sibling()
                        if next_sibling:
                            content_element = next_sibling
                        else:
                            # Ищем в родительском элементе
                            parent = header.find_parent()
                            if parent:
                                # Берём всё после заголовка в родителе
                                content_element = parent
                        
                        if content_element:
                            formatted_text = extract_formatted_text(content_element)
                            
                            # Убираем заголовок из текста если он попал
                            lines = formatted_text.split('\n')
                            filtered_lines = []
                            skip_header = True
                            
                            for line in lines:
                                line_clean = line.strip().lower()
                                if skip_header and title.lower() in line_clean:
                                    continue
                                skip_header = False
                                filtered_lines.append(line)
                            
                            result = '\n'.join(filtered_lines).strip()
                            if result and len(result) > 20:
                                return result
        
        return ''
    
    def find_section_in_text(section_titles: List[str]) -> str:
        """Поиск секции в обычном тексте"""
        if not full_description:
            return ''
        
        text_lower = full_description.lower()
        
        for title in section_titles:
            title_lower = title.lower()
            
            # Ищем заголовок в тексте
            patterns = [
                f'{title_lower}:',
                f'{title_lower}\n',
                f'{title_lower} ',
                f'**{title_lower}**',
                f'## {title_lower}',
                f'# {title_lower}'
            ]
            
            start_idx = -1
            for pattern in patterns:
                idx = text_lower.find(pattern)
                if idx != -1:
                    start_idx = idx + len(pattern)
                    break
            
            if start_idx == -1:
                continue
            
            # Ищем конец секции
            end_keywords = [
                'требования', 'задачи', 'обязанности', 'условия', 
                'мы предлагаем', 'льготы', 'преимущества', 'бонусы',
                'что мы ждем', 'ожидания', 'функции', 'график'
            ]
            
            end_idx = len(full_description)
            for end_keyword in end_keywords:
                if end_keyword != title_lower:
                    temp_idx = text_lower.find(end_keyword, start_idx)
                    if temp_idx != -1 and temp_idx < end_idx:
                        end_idx = temp_idx
            
            # Извлекаем текст секции
            section_text = full_description[start_idx:end_idx].strip()
            
            # Очищаем от лишних символов в начале
            section_text = re.sub(r'^[:\s\-•]+', '', section_text)
            
            if section_text and len(section_text) > 20:
                return section_text
        
        return ''
    
    # Определяем ключевые слова для каждой секции
    sections_keywords = {
        'requirements': [
            'Требования', 'Ожидания', 'Что мы ждём', 'Необходимые навыки',
            'Квалификация', 'Опыт работы', 'Нужно', 'Необходимо'
        ],
        'tasks': [
            'Задачи', 'Обязанности', 'Что предстоит делать', 'Функции',
            'Чем заниматься', 'В ваши задачи входит', 'Что делать'
        ],
        'benefits': [
            'Мы предлагаем', 'Льготы', 'Преимущества', 'Что мы предлагаем',
            'Бонусы', 'Дополнительные возможности'
        ],
        'conditions': [
            'Условия', 'Условия работы', 'Формат работы', 'График работы',
            'Локация', 'Офис', 'График'
        ]
    }
    
    result = {}
    
    # Извлекаем каждую секцию
    for section_key, keywords in sections_keywords.items():
        # Сначала пробуем найти в HTML структуре
        section_text = find_section_by_headers(keywords)
        
        # Если не нашли, ищем в обычном тексте
        if not section_text:
            section_text = find_section_in_text(keywords)
        
        result[section_key] = section_text
    
    return result


def clean_text(text: str) -> str:
    """Очистка текста от лишних символов и форматирование"""
    if not text:
        return ''
    
    # Убираем лишние двоеточия в начале
    text = re.sub(r'^[:\s]+', '', text)
    
    # Убираем множественные пробелы
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Убираем множественные переносы строк
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Убираем пробелы в начале и конце строк
    lines = text.split('\n')
    cleaned_lines = [line.strip() for line in lines]
    text = '\n'.join(cleaned_lines)
    
    return text.strip()
