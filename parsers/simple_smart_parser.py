#!/usr/bin/env python3
"""
Простой умный парсер для правильного распределения контента по блокам
"""

import re
from bs4 import BeautifulSoup, NavigableString
from typing import Dict, List


def extract_smart_content(element) -> Dict[str, str]:
    """
    Умное извлечение контента с правильным распределением по блокам
    """
    if not element:
        return {
            'full_description': '',
            'requirements': '',
            'tasks': '',
            'conditions': ''
        }
    
    # Извлекаем все блоки с заголовками
    blocks = extract_blocks_with_headers(element)
    
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
        category = categorize_block(title, content)
        
        if category in result:
            if result[category]:
                result[category] += f"\n\n{title}:\n{content}"
            else:
                result[category] = f"{title}:\n{content}"
    
    result['full_description'] = '\n\n'.join(all_content)
    
    return result


def extract_blocks_with_headers(element) -> Dict[str, str]:
    """
    Извлекает блоки контента с заголовками
    """
    blocks = {}
    current_title = "Описание"
    current_content = []
    
    def process_element(elem):
        nonlocal current_title, current_content
        
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
        elif tag_name in ['ul', 'ol']:
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
                process_element(child)
    
    process_element(element)
    
    # Сохраняем последний блок
    if current_content:
        content_text = ' '.join(current_content).strip()
        if content_text:
            blocks[current_title] = content_text
    
    return blocks


def categorize_block(title: str, content: str) -> str:
    """
    Определяет категорию блока по заголовку и содержимому
    """
    title_lower = title.lower()
    content_lower = content.lower()
    
    # Паттерны для требований
    requirements_patterns = [
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
    ]
    
    # Паттерны для условий
    conditions_patterns = [
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
    ]
    
    # Паттерны для задач
    tasks_patterns = [
        r'задачи',
        r'обязанности',
        r'что\s+предстоит',
        r'работа\s+включает',
        r'вам\s+предстоит',
        r'функции',
        r'ответственность'
    ]
    
    # Проверяем паттерны для требований
    for pattern in requirements_patterns:
        if re.search(pattern, title_lower) or re.search(pattern, content_lower):
            return 'requirements'
    
    # Проверяем паттерны для условий
    for pattern in conditions_patterns:
        if re.search(pattern, title_lower) or re.search(pattern, content_lower):
            return 'conditions'
    
    # Проверяем паттерны для задач
    for pattern in tasks_patterns:
        if re.search(pattern, title_lower) or re.search(pattern, content_lower):
            return 'tasks'
    
    # По умолчанию - описание
    return 'full_description'


def test_simple_smart_parser():
    """
    Тестируем простой умный парсер
    """
    html = '''
    <div class="vacancy-description">
        <h3>Наши пожелания к кандидату:</h3>
        <ul>
            <li>Опыт работы в дизайне от 2 лет</li>
            <li>Знание Figma, Adobe Creative Suite</li>
        </ul>
        
        <h3>Что мы предлагаем:</h3>
        <ul>
            <li>Конкурентная зарплата</li>
            <li>Гибкий график</li>
        </ul>
        
        <h3>Задачи:</h3>
        <p>Создание дизайна интерфейсов</p>
    </div>
    '''
    
    soup = BeautifulSoup(html, 'html.parser')
    element = soup.select_one('.vacancy-description')
    
    # Отладочная информация
    print('🔍 ОТЛАДКА:')
    print(f'Элемент найден: {element is not None}')
    if element:
        print(f'HTML элемента: {str(element)[:200]}...')
    
    # Извлекаем блоки
    blocks = extract_blocks_with_headers(element)
    print(f'Найденные блоки: {list(blocks.keys())}')
    for title, content in blocks.items():
        print(f'  {title}: {content[:100]}...')
    
    result = extract_smart_content(element)
    
    print('\n🧠 ПРОСТОЙ УМНЫЙ ПАРСЕР - РЕЗУЛЬТАТЫ:')
    print('='*60)
    
    for key, value in result.items():
        print(f'\n🔹 {key.upper()}:')
        print(f'Длина: {len(value)} символов')
        if value:
            print('Содержимое:')
            print(value)
        else:
            print('(пусто)')
    
    print(f'\n🎯 ПРОВЕРКА ПРАВИЛЬНОСТИ:')
    print('-' * 30)
    
    # Проверяем правильность распределения
    if "пожелания" in result['requirements'].lower():
        print("✅ 'Наши пожелания' → requirements")
    else:
        print("❌ 'Наши пожелания' не попали в requirements")
    
    if "предлагаем" in result['conditions'].lower():
        print("✅ 'Что мы предлагаем' → conditions")
    else:
        print("❌ 'Что мы предлагаем' не попали в conditions")
    
    if "задачи" in result['tasks'].lower():
        print("✅ 'Задачи' → tasks")
    else:
        print("❌ 'Задачи' не попали в tasks")


if __name__ == "__main__":
    test_simple_smart_parser()
