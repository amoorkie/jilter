"""
Вариант 1: Простое извлечение всего текста вакансии без разбиения на блоки
"""

import re
import logging
from typing import List, Dict, Any

try:
    from bs4 import BeautifulSoup, NavigableString
except ImportError:
    print("Установите BeautifulSoup4: pip install beautifulsoup4")
    raise


def extract_simple_text(element) -> str:
    """
    Извлекает весь текст из HTML элемента с базовым форматированием
    - Списки -> переносы строк с маркерами
    - Абзацы -> двойные переносы строк
    - Без разбиения на блоки
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
                process_element(child, level + 1)
                
        elif tag_name in ['p', 'div']:
            # Абзацы и блоки
            for child in elem.children:
                process_element(child, level + 1)
            result.append('\n\n')
            
        elif tag_name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            # Заголовки
            for child in elem.children:
                process_element(child, level + 1)
            result.append('\n\n')
            
        elif tag_name == 'br':
            # Перенос строки
            result.append('\n')
            
        else:
            # Обычные элементы
            for child in elem.children:
                process_element(child, level + 1)
    
    process_element(element)
    
    # Объединяем результат и очищаем
    text = ''.join(result)
    
    # Очистка лишних пробелов и переносов
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Убираем множественные переносы
    text = re.sub(r'[ \t]+', ' ', text)  # Убираем лишние пробелы
    text = re.sub(r'\n ', '\n', text)  # Убираем пробелы в начале строк
    
    return text.strip()


def extract_vacancy_content_v1(soup, selectors):
    """
    Вариант 1: Извлекает весь контент вакансии как единый блок
    """
    content = ""
    
    # Пробуем найти основной блок описания
    for selector in selectors:
        element = soup.select_one(selector)
        if element:
            content = extract_simple_text(element)
            if content:
                break
    
    return content


def clean_text_v1(text: str) -> str:
    """
    Очистка текста от лишних символов
    """
    if not text:
        return ""
    
    # Убираем лишние переносы
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    # Убираем лишние пробелы
    text = re.sub(r'[ \t]+', ' ', text)
    # Убираем пробелы в начале строк
    text = re.sub(r'\n ', '\n', text)
    
    return text.strip()


# Функции для совместимости с существующим кодом
def extract_formatted_text(element):
    """Алиас для совместимости"""
    return extract_simple_text(element)


def extract_structured_sections(full_description: str) -> Dict[str, str]:
    """
    Возвращает пустые секции, так как в варианте 1 мы не разбиваем на блоки
    """
    return {
        'requirements': '',
        'tasks': '',
        'benefits': '',
        'conditions': ''
    }


def clean_text(text: str) -> str:
    """Алиас для совместимости"""
    return clean_text_v1(text)










