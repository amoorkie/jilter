#!/usr/bin/env python3
"""
Простой скрипт запуска Geekjob Parser (без эмодзи для Windows)
"""

import os
import sys
import subprocess
from pathlib import Path

# Настройки проекта
PROJECT_PATH = Path("C:\\projects\\job-filter-mvp")
DATABASE_PATH = PROJECT_PATH / "database.db"
PARSER_PATH = PROJECT_PATH / "parsers" / "geekjob_simple.py"

def run_parser(query="дизайнер", pages=10, delay=1.0, verbose=False):
    """Запуск парсера с заданными параметрами"""
    
    if not PARSER_PATH.exists():
        print(f"Парсер не найден: {PARSER_PATH}")
        return False
    
    cmd = [
        sys.executable,
        str(PARSER_PATH),
        "--db", str(DATABASE_PATH),
        "--query", query,
        "--pages", str(pages),
        "--delay", str(delay)
    ]
    
    if verbose:
        cmd.append("--verbose")
    
    print(f"Запуск парсера...")
    print(f"   База данных: {DATABASE_PATH}")
    print(f"   Запрос: {query}")
    print(f"   Страниц: {pages}")
    print(f"   Задержка: {delay}с")
    print()
    
    try:
        result = subprocess.run(cmd, cwd=PROJECT_PATH)
        return result.returncode == 0
    except Exception as e:
        print(f"Ошибка запуска парсера: {e}")
        return False

def main():
    """Главная функция"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Запуск Geekjob Parser")
    parser.add_argument("--query", "-q", default="дизайнер", help="Поисковый запрос")
    parser.add_argument("--pages", "-p", type=int, default=10, help="Количество страниц")
    parser.add_argument("--delay", "-d", type=float, default=1.0, help="Задержка между запросами")
    parser.add_argument("--verbose", "-v", action="store_true", help="Подробный вывод")
    
    args = parser.parse_args()
    
    success = run_parser(
        query=args.query,
        pages=args.pages,
        delay=args.delay,
        verbose=args.verbose
    )
    
    if success:
        print("Парсинг завершён успешно!")
        print("Проверьте результаты в админ-панели Next.js")
    else:
        print("Парсинг завершён с ошибками")
        print("Проверьте логи в parsers/geekjob_parser.log")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())











