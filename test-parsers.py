#!/usr/bin/env python3
"""
Тест парсеров для проверки сохранения в базу данных
"""

import sys
import os
import sqlite3
from datetime import datetime

# Добавляем путь к парсерам
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from simple_unified_parser import SimpleUnifiedParser

def test_parsers():
    print("🧪 Тестирование парсеров...")
    
    # Создаем парсер
    parser = SimpleUnifiedParser(db_path="data/job_filter.db")
    
    print(f"📊 База данных: {parser.db.db_path}")
    
    # Проверяем структуру базы данных
    print("\n1️⃣ Проверка структуры базы данных...")
    try:
        with sqlite3.connect(parser.db.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(vacancies)")
            columns = cursor.fetchall()
            print(f"📋 Найдено колонок: {len(columns)}")
            
            # Проверяем ключевые колонки
            column_names = [col[1] for col in columns]
            required_columns = ['id', 'external_id', 'source', 'url', 'title', 'company', 'is_approved']
            
            for col in required_columns:
                if col in column_names:
                    print(f"✅ {col}")
                else:
                    print(f"❌ {col} - ОТСУТСТВУЕТ")
                    
    except Exception as e:
        print(f"❌ Ошибка проверки базы данных: {e}")
        return
    
    # Проверяем количество вакансий до парсинга
    print("\n2️⃣ Количество вакансий до парсинга...")
    try:
        with sqlite3.connect(parser.db.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM vacancies")
            count_before = cursor.fetchone()[0]
            print(f"📊 Вакансий в базе: {count_before}")
    except Exception as e:
        print(f"❌ Ошибка подсчета вакансий: {e}")
        return
    
    # Тестируем парсинг HH.ru
    print("\n3️⃣ Тестирование парсера HH.ru...")
    try:
        result = parser.parse_source('hh', 'дизайнер', pages=1)
        print(f"📊 Результат HH.ru: {result}")
    except Exception as e:
        print(f"❌ Ошибка парсинга HH.ru: {e}")
    
    # Проверяем количество вакансий после парсинга
    print("\n4️⃣ Количество вакансий после парсинга...")
    try:
        with sqlite3.connect(parser.db.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM vacancies")
            count_after = cursor.fetchone()[0]
            print(f"📊 Вакансий в базе: {count_after}")
            print(f"📈 Добавлено: {count_after - count_before}")
            
            # Показываем последние вакансии
            if count_after > count_before:
                cursor.execute("""
                    SELECT id, title, company, source, created_at 
                    FROM vacancies 
                    ORDER BY created_at DESC 
                    LIMIT 3
                """)
                recent_vacancies = cursor.fetchall()
                print("\n📋 Последние вакансии:")
                for vac in recent_vacancies:
                    print(f"  - {vac[1]} в {vac[2]} ({vac[3]}) - {vac[4]}")
                    
    except Exception as e:
        print(f"❌ Ошибка проверки после парсинга: {e}")

if __name__ == "__main__":
    test_parsers()

