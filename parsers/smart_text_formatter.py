"""
Умный парсер текста вакансий с правильным распределением по блокам
"""

import re
import logging
from typing import Dict, List, Any, Optional
from bs4 import BeautifulSoup, NavigableString

try:
    from text_formatter import extract_formatted_text, clean_text
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from text_formatter import extract_formatted_text, clean_text


class SmartVacancyParser:
    """
    Умный парсер вакансий, который правильно распределяет контент по блокам
    """
    
    def __init__(self):
        # Паттерны для определения типа блока
        self.block_patterns = {
            'requirements': [
                r'требования',
                r'пожелания\s+к\s+кандидату',
                r'ожидания',
                r'что\s+мы\s+ждем',
                r'необходимые\s+навыки',
                r'квалификация',
                r'опыт\s+работы',
                r'нужно',
                r'необходимо',
                r'кого\s+мы\s+ищем',
                r'ты\s+нам\s+подходишь',
                r'кандидат',
                r'skills?',
                r'навыки',
                r'компетенции'
            ],
            'conditions': [
                r'что\s+мы\s+предлагаем',
                r'мы\s+предлагаем',
                r'условия',
                r'условия\s+работы',
                r'формат\s+работы',
                r'график\s+работы',
                r'локация',
                r'офис',
                r'график',
                r'режим\s+работы',
                r'место\s+работы',
                r'работаем',
                r'трудоустройство',
                r'льготы',
                r'преимущества',
                r'бонусы',
                r'дополнительные\s+возможности',
                r'плюсы',
                r'benefits?',
                r'перки',
                r'зарплата',
                r'компенсации',
                r'оплата',
                r'доход'
            ],
            'tasks': [
                r'задачи',
                r'обязанности',
                r'что\s+предстоит',
                r'работа\s+включает',
                r'вам\s+предстоит',
                r'функции',
                r'ответственность'
            ]
        }
        
        self.logger = logging.getLogger(__name__)
    
    def parse_vacancy_content(self, soup_or_element, selectors: List[str]) -> Dict[str, str]:
        """
        Парсит контент вакансии и правильно распределяет по блокам
        """
        # Находим основной блок описания
        description_element = None
        
        if soup_or_element and hasattr(soup_or_element, 'select_one'):
            # Это BeautifulSoup - ищем по селекторам
            for selector in selectors:
                element = soup_or_element.select_one(selector)
                if element:
                    description_element = element
                    break
        elif selectors and len(selectors) > 0:
            # Это элемент напрямую
            description_element = selectors[0]
        
        if not description_element:
            return {
                'full_description': '',
                'requirements': '',
                'tasks': '',
                'conditions': ''
            }
        
        # Разбираем контент на блоки
        blocks = self._extract_content_blocks(description_element)
        
        # Распределяем блоки по категориям
        result = {
            'full_description': '',
            'requirements': '',
            'tasks': '',
            'conditions': ''
        }
        
        # Собираем все блоки для full_description
        all_content = []
        
        for block_title, block_content in blocks.items():
            if block_content.strip():
                all_content.append(f"{block_title}:\n{block_content}")
                
                # Определяем категорию блока
                category = self._categorize_block(block_title, block_content)
                
                if category in result:
                    if result[category]:
                        result[category] += f"\n\n{block_title}:\n{block_content}"
                    else:
                        result[category] = f"{block_title}:\n{block_content}"
        
        # Объединяем все в full_description
        result['full_description'] = '\n\n'.join(all_content)
        
        # Очищаем все блоки
        for key in result:
            result[key] = clean_text(result[key])
        
        return result
    
    def _extract_content_blocks(self, element) -> Dict[str, str]:
        """
        Извлекает блоки контента с заголовками
        """
        blocks = {}
        current_title = "Описание"
        current_content = []
        
        def process_element(elem, level=0):
            if isinstance(elem, NavigableString):
                text = str(elem).strip()
                if text:
                    current_content.append(text)
                return
            
            tag_name = elem.name if hasattr(elem, 'name') else None
            
            # Обработка заголовков
            if tag_name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                # Сохраняем предыдущий блок
                if current_content:
                    content_text = ' '.join(current_content).strip()
                    if content_text:
                        blocks[current_title] = content_text
                
                # Начинаем новый блок
                current_title = elem.get_text(strip=True)
                current_content = []
                return
            
            # Обработка списков
            if tag_name in ['ul', 'ol']:
                for li in elem.find_all('li', recursive=False):
                    li_text = li.get_text(strip=True)
                    if li_text:
                        current_content.append(f"• {li_text}")
            
            # Обработка абзацев
            elif tag_name in ['p', 'div']:
                text = elem.get_text(strip=True)
                if text and not any(child.name in ['ul', 'ol'] for child in elem.children):
                    current_content.append(text)
            
            # Рекурсивная обработка
            else:
                for child in elem.children:
                    process_element(child, level + 1)
        
        process_element(element)
        
        # Сохраняем последний блок
        if current_content:
            content_text = ' '.join(current_content).strip()
            if content_text:
                blocks[current_title] = content_text
        
        return blocks
    
    def _categorize_block(self, title: str, content: str) -> str:
        """
        Определяет категорию блока по заголовку и содержимому
        """
        title_lower = title.lower()
        content_lower = content.lower()
        
        # Проверяем паттерны для требований
        for pattern in self.block_patterns['requirements']:
            if re.search(pattern, title_lower) or re.search(pattern, content_lower):
                return 'requirements'
        
        # Проверяем паттерны для условий
        for pattern in self.block_patterns['conditions']:
            if re.search(pattern, title_lower) or re.search(pattern, content_lower):
                return 'conditions'
        
        # Проверяем паттерны для задач
        for pattern in self.block_patterns['tasks']:
            if re.search(pattern, title_lower) or re.search(pattern, content_lower):
                return 'tasks'
        
        # По умолчанию - описание
        return 'full_description'


def extract_smart_vacancy_content(soup_or_element, selectors: List[str] = None) -> Dict[str, str]:
    """
    Умное извлечение контента вакансии с правильным распределением по блокам
    """
    parser = SmartVacancyParser()
    
    # Если передан элемент напрямую
    if hasattr(soup_or_element, 'select_one'):
        # Это BeautifulSoup
        return parser.parse_vacancy_content(soup_or_element, selectors or [])
    else:
        # Это элемент
        return parser.parse_vacancy_content(None, [soup_or_element])


# Функции для совместимости
def extract_formatted_text(element):
    """Алиас для совместимости"""
    return extract_smart_vacancy_content(element, ['.vacancy-description'])


def extract_structured_sections(full_description: str) -> Dict[str, str]:
    """
    Возвращает пустые секции, так как умный парсер уже распределяет по блокам
    """
    return {
        'requirements': '',
        'tasks': '',
        'benefits': '',
        'conditions': ''
    }
