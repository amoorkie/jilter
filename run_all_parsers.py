#!/usr/bin/env python3
"""
Скрипт запуска всех Python парсеров для Next.js проекта

Версия: 1.0.0
Автор: AI Assistant
Дата: 2025-01-02
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path


def run_unified_parser(db_path: str = "data/job_filter.db", 
                      query: str = "дизайнер", 
                      pages: int = 3, 
                      sources: list = None,
                      verbose: bool = False,
                      extract_details: bool = True) -> bool:
    """Запуск единого парсера"""
    
    # Сначала пробуем упрощенный парсер для Python 3.13
    simple_parser_path = Path(__file__).parent / "parsers" / "simple_unified_parser.py"
    parser_path = Path(__file__).parent / "parsers" / "unified_parser.py"
    
    # Выбираем парсер
    if simple_parser_path.exists():
        parser_path = simple_parser_path
        print("Python: Используем упрощенный парсер для Python 3.13")
    elif parser_path.exists():
        print("Python: Используем стандартный парсер")
    else:
        print(f"Ошибка: Парсеры не найдены: {parser_path}, {simple_parser_path}")
        return False
    
    cmd = [
        sys.executable,
        str(parser_path),
        "--db", db_path,
        "--query", query,
        "--pages", str(pages)
    ]
    
    if sources:
        cmd.extend(["--sources"] + sources)
    
    if verbose:
        cmd.append("--verbose")
    
    if extract_details:
        cmd.append("--extract-details")
    
    print("Запуск Python парсера...")
    print(f"  База данных: {db_path}")
    print(f"  Запрос: {query}")
    print(f"  Страниц на источник: {pages}")
    print(f"  Источники: {sources or 'все'}")
    print()
    
    try:
        result = subprocess.run(cmd, cwd=Path(__file__).parent)
        return result.returncode == 0
    except Exception as e:
        print(f"Ошибка запуска парсера: {e}")
        return False


def main():
    """Главная функция"""
    parser = argparse.ArgumentParser(description="Запуск всех Python парсеров")
    
    parser.add_argument("--db", default="data/job_filter.db", help="Путь к базе данных")
    parser.add_argument("--query", "-q", default="дизайнер", help="Поисковый запрос")
    parser.add_argument("--pages", "-p", type=int, default=3, help="Количество страниц на источник")
    parser.add_argument("--sources", nargs='+', 
                       choices=['hh', 'habr', 'getmatch', 'geekjob'],
                       help="Источники для парсинга")
    parser.add_argument("--verbose", "-v", action="store_true", help="Подробный вывод")
    parser.add_argument("--extract-details", action="store_true", default=True, help="Извлекать полные детали вакансий")
    
    args = parser.parse_args()
    
    success = run_unified_parser(
        db_path=args.db,
        query=args.query,
        pages=args.pages,
        sources=args.sources,
        verbose=args.verbose,
        extract_details=args.extract_details
    )
    
    if success:
        print("Парсинг завершён успешно!")
        print("Проверьте результаты в админ-панели Next.js: http://localhost:3000/admin")
    else:
        print("Парсинг завершён с ошибками")
        print("Проверьте логи в parsers/unified_parser.log")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
