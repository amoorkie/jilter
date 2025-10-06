#!/usr/bin/env python3
"""
Единый Python парсер для всех источников дизайнерских вакансий

Объединяет парсеры: HH.ru, HireHi, Habr Career, GetMatch, Geekjob
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
from datetime import datetime
from typing import List, Dict, Optional, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

# Исправление совместимости с Python 3.13
try:
    import inspect
    if not hasattr(inspect, 'getargspec'):
        # Добавляем getargspec для совместимости с pymorphy2
        def getargspec(func):
            try:
                sig = inspect.signature(func)
                args = []
                varargs = None
                varkw = None
                defaults = []
                
                for param_name, param in sig.parameters.items():
                    if param.kind == inspect.Parameter.POSITIONAL_OR_KEYWORD:
                        args.append(param_name)
                        if param.default != inspect.Parameter.empty:
                            defaults.append(param.default)
                    elif param.kind == inspect.Parameter.VAR_POSITIONAL:
                        varargs = param_name
                    elif param.kind == inspect.Parameter.VAR_KEYWORD:
                        varkw = param_name
                
                return inspect.ArgSpec(args, varargs, varkw, defaults)
            except:
                return inspect.ArgSpec([], None, None, [])
        
        inspect.getargspec = getargspec
        print("✅ Applied Python 3.13 compatibility fix for pymorphy2")
except Exception as e:
    print(f"⚠️ Compatibility fix failed: {e}")

# Импортируем фильтр вакансий
from vacancy_filter import filter_vacancy

# Импортируем очистку данных
try:
    from text_cleaner import clean_vacancy_data
except ImportError:
    print("WARNING: text_cleaner not found, data cleaning disabled")
    clean_vacancy_data = lambda x: x

# Импортируем нормализацию текста
try:
    from text_normalizer import normalize_vacancy_text
except ImportError:
    print("WARNING: text_normalizer not found, text normalization disabled")
    normalize_vacancy_text = lambda x: x

# Импортируем наши парсеры
try:
    from hh_parser import HHParser
    from hirehi_parser import HireHiParser
    from habr_parser import HabrParser
    from getmatch_parser import GetMatchParser
    from geekjob_simple import GeekjobParser
except ImportError as e:
    print(f"Ошибка импорта парсеров: {e}")
    print("Убедитесь, что все файлы парсеров находятся в той же директории")
    sys.exit(1)


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
                        company TEXT,
                        salary TEXT,
                        location TEXT,
                        description TEXT,
                        full_description TEXT,
                        requirements TEXT,
                        tasks TEXT,
                        benefits TEXT,
                        conditions TEXT,
                        employment_type TEXT,
                        experience_level TEXT,
                        remote_type TEXT,
                        company_logo TEXT,
                        company_url TEXT,
                        published_at DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_external_id ON vacancies(external_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON vacancies(source)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON vacancies(created_at)")
                
                conn.commit()
                logging.info(f"База данных инициализирована: {self.db_path}")
                
        except sqlite3.Error as e:
            logging.error(f"Ошибка инициализации базы данных: {e}")
            raise
    
    def save_vacancy(self, vacancy_data: Dict[str, Any]) -> bool:
        """Сохранение вакансии в базу данных с фильтрацией"""
        try:
            # Очищаем и форматируем данные вакансии
            vacancy_data = clean_vacancy_data(vacancy_data)
            
            # Нормализуем текст вакансии
            vacancy_data = normalize_vacancy_text(vacancy_data)
            
            # Проверяем релевантность вакансии
            is_relevant, reason = filter_vacancy(vacancy_data)
            
            if not is_relevant:
                logging.info(f"🚫 Вакансия отфильтрована: {vacancy_data.get('title', 'Без названия')} - {reason}")
                return False
            
            logging.info(f"✅ Вакансия сохранена: {vacancy_data.get('title', 'Без названия')}")
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute(
                    "SELECT id FROM vacancies WHERE external_id = ?",
                    (vacancy_data['external_id'],)
                )
                
                if cursor.fetchone():
                    logging.debug(f"Вакансия уже существует: {vacancy_data['external_id']}")
                    return False
                
                cursor.execute("""
                    INSERT INTO vacancies (
                        external_id, source, url, title, company, location,
                        description, salary_min, salary_max, salary_currency, published_at,
                        ai_specialization, ai_employment, ai_experience, ai_technologies,
                        ai_salary_min, ai_salary_max, ai_remote, ai_relevance_score, ai_summary,
                        is_approved, is_rejected, moderation_notes, moderated_by,
                        full_description, requirements, tasks, benefits, conditions,
                        company_logo, company_url, employment_type, experience_level, remote_type
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    vacancy_data['external_id'],
                    vacancy_data.get('source', ''),
                    vacancy_data['url'],
                    vacancy_data['title'],
                    vacancy_data.get('company', ''),
                    vacancy_data.get('location', ''),
                    vacancy_data.get('description', ''),
                    None,      # salary_min
                    None,      # salary_max
                    'RUB',     # salary_currency
                    vacancy_data.get('published_at'),
                    'design',  # ai_specialization
                    '[]',      # ai_employment
                    'junior',  # ai_experience
                    '[]',      # ai_technologies
                    None,      # ai_salary_min
                    None,      # ai_salary_max
                    False,     # ai_remote
                    0.8,       # ai_relevance_score
                    'Дизайнерская вакансия',  # ai_summary
                    False,     # is_approved
                    False,     # is_rejected
                    '',        # moderation_notes
                    '',        # moderated_by
                    vacancy_data.get('full_description', ''),
                    vacancy_data.get('requirements', ''),
                    vacancy_data.get('tasks', ''),
                    vacancy_data.get('benefits', ''),
                    vacancy_data.get('conditions', ''),
                    vacancy_data.get('company_logo', ''),
                    vacancy_data.get('company_url', ''),
                    vacancy_data.get('employment_type', ''),
                    vacancy_data.get('experience_level', ''),
                    vacancy_data.get('remote_type', '')
                ))
                
                conn.commit()
                logging.info(f"Сохранена вакансия: {vacancy_data['title']} - {vacancy_data.get('company', 'N/A')}")
                return True
                
        except sqlite3.Error as e:
            logging.error(f"Ошибка сохранения вакансии: {e}")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Получение статистики по базе данных"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Общее количество
                cursor.execute("SELECT COUNT(*) FROM vacancies")
                total = cursor.fetchone()[0]
                
                # По источникам
                cursor.execute("""
                    SELECT source, COUNT(*) FROM vacancies 
                    GROUP BY source
                """)
                by_source = dict(cursor.fetchall())
                
                # За последние 24 часа
                cursor.execute("""
                    SELECT COUNT(*) FROM vacancies 
                    WHERE created_at > datetime('now', '-1 day')
                """)
                last_24h = cursor.fetchone()[0]
                
                return {
                    'total': total,
                    'by_source': by_source,
                    'last_24h': last_24h
                }
                
        except sqlite3.Error as e:
            logging.error(f"Ошибка получения статистики: {e}")
            return {}


class UnifiedParser:
    """Единый парсер для всех источников"""
    
    def __init__(self, db_path: str = "data/vacancies.db", delay: float = 1.0):
        self.db = VacancyDatabase(db_path)
        self.delay = delay
        
        # Инициализируем парсеры
        self.parsers = {
            'hh': HHParser(delay=delay),
            'hirehi': HireHiParser(delay=delay),
            'habr': HabrParser(delay=delay),
            'getmatch': GetMatchParser(delay=delay),
            'geekjob': GeekjobParser(delay=delay)
        }
    
    async def parse_source(self, source_name: str, parser, query: str, pages: int, extract_details: bool) -> List[Dict[str, Any]]:
        """Парсинг одного источника"""
        try:
            logging.info(f"Запуск парсинга {source_name}")
            start_time = time.time()
            
            # Проверяем, является ли метод async
            if hasattr(parser.parse_vacancies, '__code__') and 'async' in str(parser.parse_vacancies.__code__.co_flags):
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
            import asyncio
            tasks = []
            
            for source_name in sources:
                if source_name in self.parsers:
                    parser = self.parsers[source_name]
                    task = self.parse_source(
                        source_name, parser, query, pages_per_source, extract_details
                    )
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
        """Сохранение всех вакансий в базу данных с подробной статистикой"""
        detailed_stats = {}
        
        for source_name, vacancies in results.items():
            saved_count = 0
            filtered_count = 0
            error_count = 0
            
            for vacancy in vacancies:
                try:
                    if self.db.save_vacancy(vacancy):
                        saved_count += 1
                    else:
                        # Вакансия была отфильтрована или уже существует
                        filtered_count += 1
                except Exception as e:
                    logging.error(f"Ошибка сохранения вакансии из {source_name}: {e}")
                    error_count += 1
            
            detailed_stats[source_name] = {
                'found': len(vacancies),
                'saved': saved_count,
                'filtered': filtered_count,
                'errors': error_count
            }
            
            logging.info(f"{source_name}: найдено {len(vacancies)}, сохранено {saved_count}, отфильтровано {filtered_count}")
        
        return detailed_stats
    
    def export_to_json(self, filename: str = 'all_vacancies.json'):
        """Экспорт всех вакансий в JSON"""
        try:
            with sqlite3.connect(self.db.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM vacancies ORDER BY created_at DESC")
                
                columns = [description[0] for description in cursor.description]
                rows = cursor.fetchall()
                
                vacancies = []
                for row in rows:
                    vacancy = dict(zip(columns, row))
                    vacancies.append(vacancy)
                
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(vacancies, f, ensure_ascii=False, indent=2, default=str)
                
                logging.info(f"Экспорт в JSON завершён: {filename} ({len(vacancies)} вакансий)")
                return True
                
        except Exception as e:
            logging.error(f"Ошибка экспорта в JSON: {e}")
            return False


def main():
    """Главная функция"""
    parser = argparse.ArgumentParser(description='Единый парсер дизайнерских вакансий')
    
    parser.add_argument('--db', default='database.db', help='Путь к базе данных')
    parser.add_argument('--query', default='дизайнер', help='Поисковый запрос')
    parser.add_argument('--pages', type=int, default=3, help='Количество страниц на источник')
    parser.add_argument('--delay', type=float, default=1.0, help='Задержка между запросами')
    parser.add_argument('--sources', nargs='+', 
                       choices=['hh', 'hirehi', 'habr', 'getmatch', 'geekjob'],
                       help='Источники для парсинга')
    parser.add_argument('--no-details', action='store_true', help='Не извлекать полные детали')
    parser.add_argument('--extract-details', action='store_true', help='Извлекать полные детали (по умолчанию)')
    parser.add_argument('--no-parallel', action='store_true', help='Последовательный парсинг')
    parser.add_argument('--export', choices=['json'], help='Экспорт результатов')
    parser.add_argument('--verbose', action='store_true', help='Подробный вывод')
    parser.add_argument('--quiet', action='store_true', help='Минимальный вывод')
    
    args = parser.parse_args()
    
    # Настройка логирования
    log_level = logging.DEBUG if args.verbose else (logging.WARNING if args.quiet else logging.INFO)
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('unified_parser.log', encoding='utf-8')
        ]
    )
    
    try:
        # Создаём единый парсер
        unified_parser = UnifiedParser(db_path=args.db, delay=args.delay)
        
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
            filtered = stats.get('filtered', 0)
            errors = stats.get('errors', 0)
            print(f"  {source_name:10}: найдено {found:3}, сохранено {saved:3}, отфильтровано {filtered:3}, ошибок {errors:2}")
        
        print()
        print("Общая статистика БД:")
        print(f"  Всего вакансий: {stats.get('total', 0)}")
        print(f"  За последние 24ч: {stats.get('last_24h', 0)}")
        
        if stats.get('by_source'):
            print("  По источникам в БД:")
            for source, count in stats['by_source'].items():
                print(f"    {source:10}: {count}")
        
        # Экспорт
        if args.export:
            if args.export == 'json':
                unified_parser.export_to_json()
        
        print("\nПарсинг завершён успешно!")
        return 0
        
    except KeyboardInterrupt:
        logging.info("Парсинг прерван пользователем")
        return 1
    except Exception as e:
        logging.error(f"Критическая ошибка: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
