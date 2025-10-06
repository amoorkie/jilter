"""
Простой форматтер текста - просто вытягивает отформатированный текст как есть
"""

import re
from bs4 import BeautifulSoup, NavigableString
from typing import Dict, List, Optional


def extract_formatted_text(element) -> str:
    """
    Извлекает отформатированный текст из HTML элемента с сохранением HTML разметки
    """
    if not element:
        return ''
    
    def process_element(elem):
        if isinstance(elem, NavigableString):
            return str(elem).strip()
        
        tag_name = elem.name if hasattr(elem, 'name') else None
        
        # Обработка списков
        if tag_name in ['ul']:
            items = []
            for li in elem.find_all('li', recursive=False):
                li_text = process_element(li)
                if li_text:
                    items.append(f"<li>{li_text}</li>\n")
            return f"<ul>\n{''.join(items)}</ul>"
        
        elif tag_name in ['ol']:
            items = []
            for li in elem.find_all('li', recursive=False):
                li_text = process_element(li)
                if li_text:
                    items.append(f"<li>{li_text}</li>\n")
            return f"<ol>\n{''.join(items)}</ol>"
        
        # Обработка элементов списка
        elif tag_name == 'li':
            parts = []
            for child in elem.children:
                child_text = process_element(child)
                if child_text:
                    parts.append(child_text)
            return ''.join(parts)
        
        # Обработка абзацев
        elif tag_name in ['p']:
            parts = []
            for child in elem.children:
                child_text = process_element(child)
                if child_text:
                    parts.append(child_text)
            return f"<p>{''.join(parts)}</p>\n"
        
        # Обработка заголовков
        elif tag_name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            parts = []
            for child in elem.children:
                child_text = process_element(child)
                if child_text:
                    parts.append(child_text)
            return f"<{tag_name}>{''.join(parts)}</{tag_name}>\n"
        
        # Обработка жирного текста
        elif tag_name in ['strong', 'b']:
            parts = []
            for child in elem.children:
                child_text = process_element(child)
                if child_text:
                    parts.append(child_text)
            return f"<strong>{''.join(parts)}</strong>"
        
        # Обработка курсива
        elif tag_name in ['em', 'i']:
            parts = []
            for child in elem.children:
                child_text = process_element(child)
                if child_text:
                    parts.append(child_text)
            return f"<em>{''.join(parts)}</em>"
        
        # Обработка переносов строк
        elif tag_name in ['br']:
            return '<br>'
        
        # Обработка div - просто содержимое
        elif tag_name in ['div']:
            parts = []
            for child in elem.children:
                child_text = process_element(child)
                if child_text:
                    parts.append(child_text)
            return ''.join(parts)
        
        # Рекурсивная обработка
        else:
            parts = []
            for child in elem.children:
                child_text = process_element(child)
                if child_text:
                    parts.append(child_text)
            return ''.join(parts)
    
    result = process_element(element)
    
    # Если результат не содержит HTML тегов, пытаемся найти списки в тексте
    if not re.search(r'<[^>]+>', result):
        result = detect_lists_in_text(result)
    
    # Очищаем от лишних пробелов, но сохраняем переносы строк
    result = re.sub(r'>\s+<', '><', result)
    result = result.strip()
    
    return result


def clean_text(text: str) -> str:
    """
    Очищает текст от лишних символов
    """
    if not text:
        return ''
    
    # Убираем лишние пробелы и переносы
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    return text


def detect_lists_in_text(text: str) -> str:
    """
    Определяет списки в тексте и конвертирует их в HTML списки
    """
    if not text:
        return text
    
    lines = text.split('\n')
    result = []
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Проверяем, является ли строка началом списка
        if (line.startswith('• ') or 
            line.startswith('- ') or 
            line.startswith('* ') or
            (line and line[0].isdigit() and '. ' in line[:10])):
            
            # Определяем тип списка
            is_ordered = line[0].isdigit() and '. ' in line[:10]
            list_tag = 'ol' if is_ordered else 'ul'
            
            # Собираем все элементы списка
            list_items = []
            while i < len(lines):
                current_line = lines[i].strip()
                
                # Проверяем, является ли строка элементом списка
                if (current_line.startswith('• ') or 
                    current_line.startswith('- ') or 
                    current_line.startswith('* ') or
                    (current_line and current_line[0].isdigit() and '. ' in current_line[:10])):
                    
                    # Убираем маркер списка
                    if current_line.startswith('• '):
                        item_text = current_line[2:].strip()
                    elif current_line.startswith('- '):
                        item_text = current_line[2:].strip()
                    elif current_line.startswith('* '):
                        item_text = current_line[2:].strip()
                    elif current_line[0].isdigit() and '. ' in current_line[:10]:
                        # Для нумерованных списков
                        dot_pos = current_line.find('. ')
                        item_text = current_line[dot_pos + 2:].strip()
                    else:
                        item_text = current_line
                    
                    if item_text:
                        list_items.append(f"<li>{item_text}</li>\n")
                    i += 1
                else:
                    break
            
            # Добавляем HTML список
            if list_items:
                result.append(f"<{list_tag}>\n{''.join(list_items)}</{list_tag}>\n")
        else:
            # Обычная строка
            if line:
                result.append(f"<p>{line}</p>\n")
            i += 1
    
    return ''.join(result)


# Функции для совместимости
def extract_structured_sections(full_description: str) -> Dict[str, str]:
    """
    Возвращает пустые секции - не разбиваем на блоки
    """
    return {
        'requirements': '',
        'tasks': '',
        'benefits': '',
        'conditions': ''
    }

