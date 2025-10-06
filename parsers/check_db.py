#!/usr/bin/env python3
"""
Скрипт для проверки базы данных вакансий
"""

import sqlite3
import sys

def check_database(db_path="geekjob_vacancies.db"):
    """Проверка содержимого базы данных"""
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            
            # Общая статистика
            cursor.execute("SELECT COUNT(*) FROM vacancies WHERE source='geekjob'")
            total = cursor.fetchone()[0]
            print(f"Всего вакансий Geekjob: {total}")
            
            if total > 0:
                # Последние вакансии
                cursor.execute("""
                    SELECT title, company, url 
                    FROM vacancies 
                    WHERE source='geekjob' 
                    ORDER BY created_at DESC 
                    LIMIT 5
                """)
                
                rows = cursor.fetchall()
                print(f"\nПоследние {len(rows)} вакансий:")
                for i, (title, company, url) in enumerate(rows, 1):
                    print(f"{i}. {title}")
                    print(f"   Компания: {company}")
                    print(f"   URL: {url}")
                    print()
            
            return True
            
    except sqlite3.Error as e:
        print(f"Ошибка базы данных: {e}")
        return False
    except Exception as e:
        print(f"Общая ошибка: {e}")
        return False

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "geekjob_vacancies.db"
    check_database(db_path)











