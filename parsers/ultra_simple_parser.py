#!/usr/bin/env python3
"""
Ультра-простой парсер для тестирования
"""

from bs4 import BeautifulSoup
import re


def test_ultra_simple():
    """
    Ультра-простой тест парсинга
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
    
    print('🔍 УЛЬТРА-ПРОСТОЙ ТЕСТ:')
    print('='*50)
    
    if not element:
        print("❌ Элемент не найден")
        return
    
    print("✅ Элемент найден")
    print(f"HTML: {str(element)[:200]}...")
    
    # Простое извлечение всех заголовков
    headers = element.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
    print(f"\n📋 Найденные заголовки: {len(headers)}")
    
    for i, header in enumerate(headers):
        print(f"  {i+1}. {header.get_text(strip=True)}")
    
    # Простое извлечение всех списков
    lists = element.find_all(['ul', 'ol'])
    print(f"\n📋 Найденные списки: {len(lists)}")
    
    for i, list_elem in enumerate(lists):
        items = list_elem.find_all('li')
        print(f"  {i+1}. Список с {len(items)} элементами")
        for j, item in enumerate(items):
            print(f"     {j+1}. {item.get_text(strip=True)}")
    
    # Простое извлечение всех абзацев
    paragraphs = element.find_all(['p', 'div'])
    print(f"\n📋 Найденные абзацы: {len(paragraphs)}")
    
    for i, p in enumerate(paragraphs):
        text = p.get_text(strip=True)
        if text and not any(child.name in ['ul', 'ol'] for child in p.children):
            print(f"  {i+1}. {text[:100]}...")
    
    print("\n🎯 РУЧНОЕ РАСПРЕДЕЛЕНИЕ:")
    print('-' * 30)
    
    # Ручное распределение по блокам
    result = {
        'requirements': '',
        'conditions': '',
        'tasks': '',
        'full_description': ''
    }
    
    # Ищем блоки по заголовкам
    for header in headers:
        title = header.get_text(strip=True).lower()
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
        
        # Определяем категорию
        if 'пожелания' in title or 'требования' in title:
            result['requirements'] = f"{header.get_text(strip=True)}:\n{content_text}"
            print(f"✅ {header.get_text(strip=True)} → requirements")
        elif 'предлагаем' in title or 'условия' in title:
            result['conditions'] = f"{header.get_text(strip=True)}:\n{content_text}"
            print(f"✅ {header.get_text(strip=True)} → conditions")
        elif 'задачи' in title or 'обязанности' in title:
            result['tasks'] = f"{header.get_text(strip=True)}:\n{content_text}"
            print(f"✅ {header.get_text(strip=True)} → tasks")
        else:
            result['full_description'] += f"{header.get_text(strip=True)}:\n{content_text}\n\n"
            print(f"✅ {header.get_text(strip=True)} → full_description")
    
    print(f"\n📊 РЕЗУЛЬТАТЫ:")
    print('-' * 20)
    
    for key, value in result.items():
        print(f"\n🔹 {key.upper()}:")
        print(f"Длина: {len(value)} символов")
        if value:
            print("Содержимое:")
            print(value)
        else:
            print("(пусто)")


if __name__ == "__main__":
    test_ultra_simple()










