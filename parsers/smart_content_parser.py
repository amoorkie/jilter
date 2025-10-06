"""
Умный парсер контента с правильным распределением по блокам
"""

import re
from bs4 import BeautifulSoup, NavigableString
from typing import Dict, List, Optional


class SmartContentParser:
    """
    Умный парсер для правильного распределения контента по блокам
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
    
    def parse_content(self, element) -> Dict[str, str]:
        """
        Парсит контент и правильно распределяет по блокам
        """
        if not element:
            return {
                'full_description': '',
                'requirements': '',
                'tasks': '',
                'conditions': ''
            }
        
        # Извлекаем блоки с заголовками
        blocks = self._extract_blocks_with_headers(element)
        
        # Распределяем по категориям
        result = {
            'full_description': '',
            'requirements': '',
            'tasks': '',
            'conditions': ''
        }
        
        all_content = []
        
        for title, content in blocks.items():
            if not content.strip():
                continue
            
            # Добавляем в полное описание
            all_content.append(f"{title}:\n{content}")
            
            # Определяем категорию
            category = self._categorize_block(title, content)
            
            if category in result:
                if result[category]:
                    result[category] += f"\n\n{title}:\n{content}"
                else:
                    result[category] = f"{title}:\n{content}"
        
        result['full_description'] = '\n\n'.join(all_content)
        
        return result
    
    def _extract_blocks_with_headers(self, element) -> Dict[str, str]:
        """
        Извлекает блоки контента с заголовками
        """
        blocks = {}
        
        # Находим все заголовки
        headers = element.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        
        for header in headers:
            title = header.get_text(strip=True)
            content = []
            
            # Ищем следующий элемент после заголовка
            next_elem = header.find_next_sibling()
            while next_elem and next_elem.name not in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                if next_elem.name in ['ul', 'ol']:
                    for li in next_elem.find_all('li'):
                        content.append(f"• {li.get_text(strip=True)}")
                elif next_elem.name in ['p', 'div']:
                    text = next_elem.get_text(strip=True)
                    if text:
                        content.append(text)
                next_elem = next_elem.find_next_sibling()
            
            content_text = '\n'.join(content)
            if content_text.strip():
                blocks[title] = content_text
        
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


# Глобальный экземпляр парсера
smart_parser = SmartContentParser()


def extract_smart_content(element) -> Dict[str, str]:
    """
    Умное извлечение контента с правильным распределением по блокам
    """
    return smart_parser.parse_content(element)


# Функции для совместимости
def extract_formatted_text(element):
    """Алиас для совместимости"""
    result = extract_smart_content(element)
    return result['full_description']


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


def clean_text(text: str) -> str:
    """
    Очищает текст от лишних символов
    """
    if not text:
        return ''
    
    # Убираем лишние пробелы и переносы
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    # Убираем двоеточия в начале
    text = re.sub(r'^:\s*', '', text)
    
    return text










