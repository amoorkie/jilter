#!/usr/bin/env python3
"""
Упрощенный парсер без pymorphy2 для Python 3.13
Версия: 1.0.0
Автор: AI Assistant
Дата: 2025-01-02
"""

import os
import sys
import time
import json
import sqlite3
import logging
import argparse
import asyncio
from datetime import datetime
from typing import List, Dict, Optional, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

# Импортируем наши парсеры
try:
    from hh_parser import HHParser
    from habr_parser import HabrParser
    from getmatch_parser import GetMatchParser
    from geekjob_simple import GeekjobParser
except ImportError as e:
    print(f"Ошибка импорта парсеров: {e}")
    print("Убедитесь, что все файлы парсеров находятся в той же директории")
    sys.exit(1)

# Импортируем упрощенный фильтр вакансий
try:
    from simple_vacancy_filter import filter_vacancy
except ImportError:
    # Если фильтр недоступен, создаем заглушку
    def filter_vacancy(vacancy_data):
        return True, "Фильтр недоступен"


class VacancyDatabase:
    """Класс для работы с SQLite базой данных вакансий"""
    
    def __init__(self, db_path: str = "data/vacancies.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Инициализация базы данных и создание таблиц"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS vacancies (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        external_id TEXT UNIQUE NOT NULL,
                        source TEXT NOT NULL,
                        url TEXT NOT NULL,
                        title TEXT NOT NULL,
                        company TEXT NOT NULL,
                        -- Поля для дедупликации
                        title_hash TEXT,
                        company_hash TEXT,
                        url_hash TEXT,
                        location TEXT DEFAULT '',
                        description TEXT DEFAULT '',
                        salary_min INTEGER,
                        salary_max INTEGER,
                        salary_currency TEXT DEFAULT 'RUB',
                        published_at TEXT NOT NULL,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        ai_specialization TEXT DEFAULT 'other',
                        ai_employment TEXT DEFAULT '[]',
                        ai_experience TEXT DEFAULT 'junior',
                        ai_technologies TEXT DEFAULT '[]',
                        ai_salary_min INTEGER,
                        ai_salary_max INTEGER,
                        ai_remote BOOLEAN DEFAULT 0,
                        ai_relevance_score REAL DEFAULT 0,
                        ai_summary TEXT DEFAULT '',
                        is_approved BOOLEAN DEFAULT 0,
                        is_rejected BOOLEAN DEFAULT 0,
                        moderation_notes TEXT DEFAULT '',
                        moderated_at TEXT,
                        moderated_by TEXT DEFAULT '',
                        full_description TEXT DEFAULT '',
                        edited_description TEXT DEFAULT '',
                        requirements TEXT DEFAULT '',
                        tasks TEXT DEFAULT '',
                        benefits TEXT DEFAULT '',
                        conditions TEXT DEFAULT '',
                        company_logo TEXT DEFAULT '',
                        company_url TEXT DEFAULT '',
                        employment_type TEXT DEFAULT '',
                        experience_level TEXT DEFAULT '',
                        remote_type TEXT DEFAULT ''
                    )
                """)

                # Мягкая миграция недостающих колонок
                cursor.execute("PRAGMA table_info(vacancies)")
                existing_cols = {row[1] for row in cursor.fetchall()}
                def ensure(col: str, ddl: str):
                    if col not in existing_cols:
                        cursor.execute(f"ALTER TABLE vacancies ADD COLUMN {ddl}")
                ensure('salary_min', "salary_min INTEGER")
                ensure('salary_max', "salary_max INTEGER")
                ensure('salary_currency', "salary_currency TEXT DEFAULT 'RUB'")
                
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_external_id ON vacancies(external_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON vacancies(source)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON vacancies(created_at)")
                
                conn.commit()
                logging.info(f"База данных инициализирована: {self.db_path}")
                
        except sqlite3.Error as e:
            logging.error(f"Ошибка инициализации базы данных: {e}")
    
    def save_vacancy(self, vacancy: Dict[str, Any]) -> bool:
        """Сохранение вакансии в базу данных"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Проверяем, существует ли уже такая вакансия
                cursor.execute(
                    "SELECT id FROM vacancies WHERE external_id = ? AND source = ?",
                    (vacancy.get('external_id'), vacancy.get('source'))
                )
                
                if cursor.fetchone():
                    logging.debug(f"Вакансия уже существует: {vacancy.get('external_id')}")
                    return False
                
                # Подготавливаем данные для вставки
                values = (
                    vacancy.get('external_id'),
                    vacancy.get('source'),
                    vacancy.get('url'),
                    vacancy.get('title'),
                    vacancy.get('company'),
                    vacancy.get('title_hash'),
                    vacancy.get('company_hash'),
                    vacancy.get('url_hash'),
                    vacancy.get('location', ''),
                    vacancy.get('description', ''),
                    vacancy.get('salary_min'),
                    vacancy.get('salary_max'),
                    vacancy.get('salary_currency') or 'RUB',
                    vacancy.get('published_at'),
                    'other',  # ai_specialization
                    '[]',     # ai_employment
                    'junior', # ai_experience
                    '[]',     # ai_technologies
                    vacancy.get('salary_min'),  # ai_salary_min
                    vacancy.get('salary_max'),  # ai_salary_max
                    0,        # ai_remote
                    0.0,      # ai_relevance_score
                    '',       # ai_summary
                    None,     # is_approved = NULL (ожидает модерации)
                    None,     # is_rejected = NULL
                    '',       # moderation_notes
                    None,     # moderated_at
                    '',       # moderated_by
                    vacancy.get('full_description', ''),
                    '',       # edited_description
                    vacancy.get('requirements', ''),
                    vacancy.get('tasks', ''),
                    vacancy.get('benefits', ''),
                    vacancy.get('conditions', ''),
                    vacancy.get('company_logo', ''),
                    vacancy.get('company_url', ''),
                    vacancy.get('employment_type', ''),
                    vacancy.get('experience_level', ''),
                    vacancy.get('remote_type', '')
                )
                
                # Вставляем новую вакансию
                cursor.execute("""
                    INSERT INTO vacancies (
                        external_id, source, url, title, company, title_hash, company_hash, url_hash,
                        location, description, salary_min, salary_max, salary_currency, published_at,
                        ai_specialization, ai_employment, ai_experience, ai_technologies, ai_salary_min,
                        ai_salary_max, ai_remote, ai_relevance_score, ai_summary, is_approved, is_rejected,
                        moderation_notes, moderated_at, moderated_by, full_description, edited_description,
                        requirements, tasks, benefits, conditions, company_logo, company_url,
                        employment_type, experience_level, remote_type
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, values)
                
                conn.commit()
                logging.debug(f"Вакансия сохранена: {vacancy.get('title')}")
                return True
                
        except sqlite3.Error as e:
            logging.error(f"Ошибка сохранения вакансии: {e}")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Получение статистики по вакансиям"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Общая статистика
                cursor.execute("SELECT COUNT(*) FROM vacancies")
                total = cursor.fetchone()[0]
                
                # По источникам
                cursor.execute("""
                    SELECT source, COUNT(*) 
                    FROM vacancies 
                    GROUP BY source
                """)
                by_source = dict(cursor.fetchall())
                
                return {
                    'total': total,
                    'by_source': by_source
                }
                
        except sqlite3.Error as e:
            logging.error(f"Ошибка получения статистики: {e}")
            return {}


class SimpleUnifiedParser:
    """Упрощенный единый парсер без pymorphy2"""
    
    def __init__(self, db_path: str = "data/job_filter.db", delay: float = 1.0):
        self.db = VacancyDatabase(db_path)
        self.delay = delay
        
        # Инициализируем парсеры
        self.parsers = {
            'hh': HHParser(delay=delay),
            'habr': HabrParser(delay=delay),
            'getmatch': GetMatchParser(delay=delay),
            'geekjob': GeekjobParser(delay=delay)
        }
        
        # Настройка логирования для парсеров
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler('simple_unified_parser.log', encoding='utf-8')
            ]
        )
    
    async def parse_source(self, source_name: str, parser, query: str, pages: int, extract_details: bool) -> List[Dict[str, Any]]:
        """Парсинг одного источника"""
        try:
            logging.info(f"Запуск парсинга {source_name}")
            start_time = time.time()
            
            # Проверяем, является ли метод async
            if asyncio.iscoroutinefunction(parser.parse_vacancies):
                vacancies = await parser.parse_vacancies(
                    query=query,
                    pages=pages,
                    extract_details=extract_details
                )
            else:
                vacancies = parser.parse_vacancies(
                    query=query,
                    pages=pages,
                    extract_details=extract_details
                )
            
            end_time = time.time()
            duration = end_time - start_time
            
            logging.info(f"{source_name}: найдено {len(vacancies)} вакансий за {duration:.2f} сек")
            return vacancies
            
        except Exception as e:
            logging.error(f"Ошибка парсинга {source_name}: {e}")
            return []
    
    async def parse_all_sources(self, 
                         query: str = 'дизайнер', 
                         pages_per_source: int = 3, 
                         extract_details: bool = True,
                         sources: Optional[List[str]] = None,
                         parallel: bool = True) -> Dict[str, List[Dict[str, Any]]]:
        """Парсинг всех источников"""
        
        if sources is None:
            sources = list(self.parsers.keys())
        
        logging.info(f"Начинаем парсинг всех источников")
        logging.info(f"Источники: {', '.join(sources)}")
        logging.info(f"Запрос: '{query}', страниц на источник: {pages_per_source}")
        logging.info(f"Извлечение деталей: {extract_details}, параллельно: {parallel}")
        
        results = {}
        
        if parallel:
            # Параллельный парсинг с asyncio
            tasks = []
            
            for source_name in sources:
                if source_name in self.parsers:
                    parser = self.parsers[source_name]
                    task = asyncio.create_task(self.parse_source(
                        source_name, parser, query, pages_per_source, extract_details
                    ))
                    tasks.append((source_name, task))
            
            # Выполняем все задачи параллельно
            for source_name, task in tasks:
                try:
                    vacancies = await task
                    results[source_name] = vacancies
                except Exception as e:
                    logging.error(f"Ошибка парсинга {source_name}: {e}")
                    results[source_name] = []
        else:
            # Последовательный парсинг
            for source_name in sources:
                if source_name in self.parsers:
                    parser = self.parsers[source_name]
                    vacancies = await self.parse_source(
                        source_name, parser, query, pages_per_source, extract_details
                    )
                    results[source_name] = vacancies
                    
                    # Пауза между источниками
                    time.sleep(self.delay)
        
        return results
    
    def save_all_vacancies(self, results: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Dict[str, int]]:
        """Сохранение всех вакансий в базу данных"""
        def parse_salary_text(s: Optional[str]):
            if not s:
                return None, None, 'RUB'
            try:
                import re
                text = str(s)
                currency = 'RUB'
                if '₽' in text or 'руб' in text.lower():
                    currency = 'RUB'
                if '$' in text or 'usd' in text.lower():
                    currency = 'USD'
                if '€' in text or 'eur' in text.lower():
                    currency = 'EUR'
                nums = [int(x.replace(' ', '')) for x in re.findall(r"\d[\d\s]{2,}", text)]
                if len(nums) >= 2:
                    return nums[0], nums[1], currency
                if len(nums) == 1:
                    return nums[0], None, currency
            except Exception:
                pass
            return None, None, 'RUB'
        saved_counts = {}
        
        for source_name, vacancies in results.items():
            saved = 0
            filtered = 0
            for vacancy in vacancies:
                # Применяем фильтр релевантности
                is_relevant, reason = filter_vacancy(vacancy)
                if not is_relevant:
                    filtered += 1
                    logging.debug(f"Отфильтровано: {vacancy.get('title', 'Без названия')} - {reason}")
                    continue
                
                # Преобразуем строковую зарплату в поля min/max/currency, если нужно
                if 'salary_min' not in vacancy and 'salary_max' not in vacancy:
                    sal_min, sal_max, sal_cur = parse_salary_text(vacancy.get('salary'))
                    if sal_min is not None:
                        vacancy['salary_min'] = sal_min
                    if sal_max is not None:
                        vacancy['salary_max'] = sal_max
                    if sal_cur:
                        vacancy['salary_currency'] = sal_cur
                logging.info(f"Попытка сохранения вакансии: {vacancy.get('title', 'Без названия')}")
                logging.info(f"External ID: {vacancy.get('external_id')}")
                logging.info(f"Source: {vacancy.get('source')}")
                if self.db.save_vacancy(vacancy):
                    saved += 1
                    logging.info(f"Сохранена: {vacancy.get('title', 'Без названия')}")
                else:
                    logging.warning(f"Не удалось сохранить: {vacancy.get('title', 'Без названия')}")
            
            saved_counts[source_name] = {
                'found': len(vacancies),
                'saved': saved,
                'filtered': filtered
            }
            
            logging.info(f"{source_name}: сохранено {saved} из {len(vacancies)} вакансий")
        
        return saved_counts


def main():
    """Главная функция"""
    parser = argparse.ArgumentParser(description="Упрощенный парсер вакансий для Python 3.13")
    
    parser.add_argument("--db", default="data/vacancies.db", help="Путь к базе данных")
    parser.add_argument("--query", default="дизайнер", help="Поисковый запрос")
    parser.add_argument("--pages", "-p", type=int, default=3, help="Количество страниц на источник")
    parser.add_argument("--sources", nargs='+', 
                       choices=['hh', 'habr', 'getmatch', 'geekjob'],
                       help="Источники для парсинга")
    parser.add_argument("--verbose", "-v", action="store_true", help="Подробный вывод")
    parser.add_argument("--quiet", action="store_true", help="Тихий режим")
    parser.add_argument("--extract-details", action="store_true", default=True, help="Извлекать полные детали вакансий")
    parser.add_argument("--no-details", action="store_true", help="Не извлекать детали")
    parser.add_argument("--no-parallel", action="store_true", help="Отключить параллельный парсинг")
    parser.add_argument("--delay", type=float, default=1.0, help="Задержка между запросами")
    
    args = parser.parse_args()
    
    # Настройка логирования
    log_level = logging.DEBUG if args.verbose else (logging.WARNING if args.quiet else logging.INFO)
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('simple_unified_parser.log', encoding='utf-8')
        ]
    )
    
    try:
        # Создаём упрощенный парсер
        unified_parser = SimpleUnifiedParser(db_path=args.db, delay=args.delay)
        
        # Запускаем парсинг
        import asyncio
        results = asyncio.run(unified_parser.parse_all_sources(
            query=args.query,
            pages_per_source=args.pages,
            extract_details=args.extract_details or not args.no_details,
            sources=args.sources,
            parallel=not args.no_parallel
        ))
        
        # Сохраняем результаты
        saved_counts = unified_parser.save_all_vacancies(results)
        
        # Статистика
        stats = unified_parser.db.get_statistics()
        
        # Выводим результаты
        print("\n" + "=" * 60)
        print("РЕЗУЛЬТАТЫ ПАРСИНГА ВСЕХ ИСТОЧНИКОВ")
        print("=" * 60)
        
        total_found = sum(len(vacancies) for vacancies in results.values())
        total_saved = sum(stats.get('saved', 0) for stats in saved_counts.values())
        total_filtered = sum(stats.get('filtered', 0) for stats in saved_counts.values())
        
        print(f"Найдено вакансий: {total_found}")
        print(f"Сохранено в БД: {total_saved}")
        print(f"Отфильтровано: {total_filtered}")
        print(f"Процент релевантных: {(total_saved / total_found * 100) if total_found > 0 else 0:.1f}%")
        print()
        
        print("По источникам:")
        for source_name in results.keys():
            stats = saved_counts.get(source_name, {})
            found = stats.get('found', 0)
            saved = stats.get('saved', 0)
            print(f"  {source_name}: найдено {found}, сохранено {saved}")
        
        print(f"\nВсего в базе данных: {stats.get('total', 0)} вакансий")
        print(f"База данных: {args.db}")
        print(f"Лог файл: simple_unified_parser.log")

        # Машиночитаемая строка для API (не содержит кириллицы в ключах)
        try:
            import json as _json
            by_source = {k: {
                'found': saved_counts.get(k, {}).get('found', 0),
                'saved': saved_counts.get(k, {}).get('saved', 0)
            } for k in results.keys()}
            summary_json = _json.dumps({
                'total_found': int(total_found),
                'total_saved': int(total_saved),
                'by_source': by_source
            }, ensure_ascii=True)
            print(f"STATS:{summary_json}")
        except Exception:
            pass
        
        return 0
        
    except KeyboardInterrupt:
        print("\nПарсинг прерван пользователем")
        return 1
    except Exception as e:
        logging.error(f"Критическая ошибка: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
