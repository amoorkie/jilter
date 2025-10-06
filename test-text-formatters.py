#!/usr/bin/env python3
"""
Тестирование различных подходов к извлечению текста из вакансий
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from bs4 import BeautifulSoup
import requests
import time

# Импортируем все варианты
try:
    from text_formatter import extract_formatted_text as original_extract, extract_structured_sections as original_sections
    from text_formatter_v1 import extract_simple_text as v1_extract
    from text_formatter_v2 import extract_content_without_headers as v2_extract
except ImportError as e:
    print(f"Ошибка импорта: {e}")
    sys.exit(1)


def test_vacancy_parsing():
    """
    Тестируем парсинг реальной вакансии с Habr
    """
    print("🧪 Тестирование различных подходов к извлечению текста вакансий")
    print("="*80)
    
    # URL тестовой вакансии с Habr
    test_url = "https://career.habr.com/vacancies/1000123456"  # Замените на реальный URL
    
    try:
        # Получаем HTML страницы
        print(f"📡 Загружаем вакансию с Habr...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(test_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Селекторы для поиска описания
        description_selectors = [
            '.vacancy-description',
            '.basic-section--appearance-vacancy-description',
            '.vacancy-section',
            '.job-description'
        ]
        
        description_element = None
        for selector in description_selectors:
            element = soup.select_one(selector)
            if element:
                description_element = element
                print(f"✅ Найден элемент: {selector}")
                break
        
        if not description_element:
            print("❌ Не удалось найти описание вакансии")
            return
        
        print(f"\n📝 Тестируем извлечение текста...")
        print("-" * 80)
        
        # Тест 1: Оригинальный подход (с разбиением на блоки)
        print("\n🔵 ПОДХОД 1: Оригинальный (с разбиением на блоки)")
        print("-" * 40)
        try:
            original_text = original_extract(description_element)
            original_sections = original_sections(original_text)
            
            print(f"📊 Длина текста: {len(original_text)} символов")
            print(f"📋 Найденные секции: {list(original_sections.keys())}")
            print(f"📝 Превью текста (первые 200 символов):")
            print(original_text[:200] + "..." if len(original_text) > 200 else original_text)
            
        except Exception as e:
            print(f"❌ Ошибка в оригинальном подходе: {e}")
        
        # Тест 2: Вариант 1 (весь текст без разбиения)
        print("\n🟢 ПОДХОД 2: Весь текст без разбиения")
        print("-" * 40)
        try:
            v1_text = v1_extract(description_element)
            
            print(f"📊 Длина текста: {len(v1_text)} символов")
            print(f"📝 Превью текста (первые 200 символов):")
            print(v1_text[:200] + "..." if len(v1_text) > 200 else v1_text)
            
        except Exception as e:
            print(f"❌ Ошибка в варианте 1: {e}")
        
        # Тест 3: Вариант 2 (только абзацы и списки)
        print("\n🟡 ПОДХОД 3: Только абзацы и списки (без заголовков)")
        print("-" * 40)
        try:
            v2_text = v2_extract(description_element)
            
            print(f"📊 Длина текста: {len(v2_text)} символов")
            print(f"📝 Превью текста (первые 200 символов):")
            print(v2_text[:200] + "..." if len(v2_text) > 200 else v2_text)
            
        except Exception as e:
            print(f"❌ Ошибка в варианте 2: {e}")
        
        # Сравнение результатов
        print("\n📊 СРАВНЕНИЕ РЕЗУЛЬТАТОВ")
        print("="*80)
        
        approaches = [
            ("Оригинальный", original_text if 'original_text' in locals() else ""),
            ("Вариант 1 (весь текст)", v1_text if 'v1_text' in locals() else ""),
            ("Вариант 2 (без заголовков)", v2_text if 'v2_text' in locals() else "")
        ]
        
        for name, text in approaches:
            if text:
                lines = text.count('\n')
                words = len(text.split())
                chars = len(text)
                print(f"{name:25}: {chars:4} символов, {words:3} слов, {lines:2} строк")
            else:
                print(f"{name:25}: Ошибка извлечения")
        
        print("\n🎯 РЕКОМЕНДАЦИИ:")
        print("-" * 40)
        
        if 'v1_text' in locals() and v1_text:
            print("✅ Вариант 1 (весь текст) - подходит если нужен полный контент")
        if 'v2_text' in locals() and v2_text:
            print("✅ Вариант 2 (без заголовков) - подходит для избежания дублирования заголовков")
        if 'original_text' in locals() and original_text:
            print("✅ Оригинальный подход - подходит если нужна структуризация")
        
    except requests.RequestException as e:
        print(f"❌ Ошибка загрузки страницы: {e}")
        print("💡 Попробуйте заменить test_url на реальный URL вакансии")
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")


def test_with_sample_html():
    """
    Тестируем с примером HTML
    """
    print("\n🧪 Тестирование с примером HTML")
    print("="*80)
    
    sample_html = """
    <div class="vacancy-description">
        <h3>Наши пожелания к кандидату:</h3>
        <ul>
            <li>Опыт работы в дизайне от 2 лет</li>
            <li>Знание Figma, Adobe Creative Suite</li>
            <li>Понимание принципов UX/UI</li>
        </ul>
        
        <h3>Что мы предлагаем:</h3>
        <p>Интересные проекты, дружная команда, возможность роста.</p>
        <ul>
            <li>Конкурентная зарплата</li>
            <li>Гибкий график</li>
            <li>Удаленная работа</li>
        </ul>
        
        <h3>Задачи:</h3>
        <p>Создание дизайна интерфейсов, работа с клиентами, участие в планировании.</p>
    </div>
    """
    
    soup = BeautifulSoup(sample_html, 'html.parser')
    description_element = soup.select_one('.vacancy-description')
    
    if not description_element:
        print("❌ Не удалось найти элемент описания")
        return
    
    print("📝 Тестируем с примером HTML...")
    print("-" * 40)
    
    # Тест всех подходов
    approaches = [
        ("Оригинальный", original_extract, original_sections),
        ("Вариант 1 (весь текст)", v1_extract, None),
        ("Вариант 2 (без заголовков)", v2_extract, None)
    ]
    
    for name, extract_func, sections_func in approaches:
        print(f"\n🔵 {name}")
        print("-" * 30)
        try:
            text = extract_func(description_element)
            print(f"📊 Длина: {len(text)} символов")
            print(f"📝 Результат:")
            print(text)
            
            if sections_func:
                sections = sections_func(text)
                print(f"📋 Секции: {sections}")
                
        except Exception as e:
            print(f"❌ Ошибка: {e}")


if __name__ == "__main__":
    print("🚀 Запуск тестирования подходов к извлечению текста")
    
    # Тест с примером HTML
    test_with_sample_html()
    
    # Тест с реальной вакансией (закомментировано, так как нужен реальный URL)
    # test_vacancy_parsing()
    
    print("\n✅ Тестирование завершено!")










