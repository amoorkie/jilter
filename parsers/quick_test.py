#!/usr/bin/env python3
"""
Быстрый тест различных подходов к извлечению текста
"""

from bs4 import BeautifulSoup
import sys
import os

# Добавляем текущую директорию в путь
sys.path.append(os.path.dirname(__file__))

# Простой HTML для тестирования
html = '''
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
'''

def test_approaches():
    soup = BeautifulSoup(html, 'html.parser')
    element = soup.select_one('.vacancy-description')
    
    print("🧪 ТЕСТИРОВАНИЕ ПОДХОДОВ К ИЗВЛЕЧЕНИЮ ТЕКСТА")
    print("=" * 60)
    
    # Тест 1: Оригинальный подход
    print("\n🔵 ПОДХОД 1: Оригинальный (с разбиением на блоки)")
    print("-" * 50)
    try:
        from text_formatter import extract_formatted_text
        result1 = extract_formatted_text(element)
        print(f"📊 Длина: {len(result1)} символов")
        print("📝 Результат:")
        print(result1)
        print()
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    
    # Тест 2: Вариант 1 (весь текст)
    print("\n🟢 ПОДХОД 2: Весь текст без разбиения")
    print("-" * 50)
    try:
        from text_formatter_v1 import extract_simple_text
        result2 = extract_simple_text(element)
        print(f"📊 Длина: {len(result2)} символов")
        print("📝 Результат:")
        print(result2)
        print()
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    
    # Тест 3: Вариант 2 (без заголовков)
    print("\n🟡 ПОДХОД 3: Только абзацы и списки (без заголовков)")
    print("-" * 50)
    try:
        from text_formatter_v2 import extract_content_without_headers
        result3 = extract_content_without_headers(element)
        print(f"📊 Длина: {len(result3)} символов")
        print("📝 Результат:")
        print(result3)
        print()
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    
    # Сравнение
    print("\n📊 СРАВНЕНИЕ РЕЗУЛЬТАТОВ")
    print("=" * 60)
    
    results = []
    try:
        results.append(("Оригинальный", len(result1) if 'result1' in locals() else 0))
    except:
        results.append(("Оригинальный", 0))
    
    try:
        results.append(("Вариант 1", len(result2) if 'result2' in locals() else 0))
    except:
        results.append(("Вариант 1", 0))
    
    try:
        results.append(("Вариант 2", len(result3) if 'result3' in locals() else 0))
    except:
        results.append(("Вариант 2", 0))
    
    for name, length in results:
        print(f"{name:15}: {length:3} символов")
    
    print("\n🎯 АНАЛИЗ:")
    print("-" * 30)
    print("✅ Вариант 1 (весь текст) - сохраняет все заголовки и структуру")
    print("✅ Вариант 2 (без заголовков) - убирает дублирующие заголовки")
    print("✅ Оригинальный - разбивает на структурированные блоки")

if __name__ == "__main__":
    test_approaches()










