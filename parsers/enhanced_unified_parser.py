# parsers/enhanced_unified_parser.py

import logging
import sqlite3
import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from enhanced_hh_parser import EnhancedHHParser
    from enhanced_habr_parser import EnhancedHabrParser
    from vacancy_filter import VacancyFilter
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from enhanced_hh_parser import EnhancedHHParser
    from enhanced_habr_parser import EnhancedHabrParser
    from vacancy_filter import VacancyFilter

class EnhancedUnifiedParser:
    """
    Улучшенный унифицированный парсер с поддержкой:
    - Множественных источников
    - Параллельного парсинга
    - Мониторинга производительности
    - Фильтрации качества
    - Детального логирования
    """
    
    def __init__(self, db_path: str = "data/vacancies.db", parallel: bool = True):
        self.db_path = db_path
        self.parallel = parallel
        
        # Инициализация парсеров
        self.parsers = {
            'hh': EnhancedHHParser(),
            'habr': EnhancedHabrParser()
        }
        
        # Инициализация фильтра
        self.filter = VacancyFilter()
        
        # Настройка логирования
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Статистика
        self.stats = {
            'total_found': 0,
            'total_saved': 0,
            'total_filtered': 0,
            'by_source': {},
            'start_time': datetime.now()
        }
        
        # Инициализация БД
        self.init_database()
    
    def init_database(self):
        """Инициализация базы данных SQLite"""
        try:
            # Создаем директорию, если не существует
            db_dir = Path(self.db_path).parent
            db_dir.mkdir(parents=True, exist_ok=True)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Создаем таблицу с полной схемой
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS vacancies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    external_id TEXT,
                    source TEXT NOT NULL,
                    url TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    company TEXT,
                    location TEXT,
                    description TEXT,
                    salary_min INTEGER,
                    salary_max INTEGER,
                    salary_currency TEXT,
                    published_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ai_specialization TEXT,
                    ai_employment TEXT,
                    ai_experience TEXT,
                    ai_technologies TEXT,
                    ai_salary_min INTEGER,
                    ai_salary_max INTEGER,
                    ai_remote TEXT,
                    ai_relevance_score REAL,
                    ai_summary TEXT,
                    is_approved BOOLEAN DEFAULT 0,
                    is_rejected BOOLEAN DEFAULT 0,
                    moderation_notes TEXT,
                    moderated_at DATETIME,
                    moderated_by TEXT,
                    full_description TEXT,
                    requirements TEXT,
                    tasks TEXT,
                    benefits TEXT,
                    conditions TEXT,
                    company_logo TEXT,
                    company_url TEXT,
                    employment_type TEXT,
                    experience_level TEXT,
                    remote_type TEXT
                )
            """)
            
            # Создаем индексы для производительности
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON vacancies(source)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_external_id ON vacancies(external_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON vacancies(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_url ON vacancies(url)")
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Database initialized: {self.db_path}")
            
        except Exception as e:
            self.logger.error(f"Database initialization failed: {str(e)}")
            raise
    
    def parse_source(self, source: str, query: str, pages: int, extract_details: bool = True) -> List[Dict[str, Any]]:
        """Парсинг одного источника"""
        if source not in self.parsers:
            self.logger.error(f"Unknown source: {source}")
            return []
        
        parser = self.parsers[source]
        
        try:
            self.logger.info(f"Starting {source} parsing...")
            vacancies = parser.parse_vacancies(query, pages, extract_details)
            
            self.logger.info(f"{source}: found {len(vacancies)} vacancies")
            return vacancies
            
        except Exception as e:
            self.logger.error(f"Error parsing {source}: {str(e)}")
            return []
    
    def parse_all_sources(self, 
                         query: str = 'дизайнер',
                         pages_per_source: int = 3,
                         extract_details: bool = True,
                         sources: Optional[List[str]] = None) -> Dict[str, List[Dict[str, Any]]]:
        """
        Парсинг всех источников (параллельно или последовательно)
        """
        
        if sources is None:
            sources = list(self.parsers.keys())
        
        self.logger.info(f"Starting unified parsing:")
        self.logger.info(f"Sources: {', '.join(sources)}")
        self.logger.info(f"Query: '{query}', pages per source: {pages_per_source}")
        self.logger.info(f"Extract details: {extract_details}, parallel: {self.parallel}")
        
        results = {}
        
        if self.parallel and len(sources) > 1:
            # Параллельный парсинг
            self.logger.info("Using parallel parsing")
            
            with ThreadPoolExecutor(max_workers=len(sources)) as executor:
                future_to_source = {
                    executor.submit(self.parse_source, source, query, pages_per_source, extract_details): source
                    for source in sources
                }
                
                for future in as_completed(future_to_source):
                    source = future_to_source[future]
                    try:
                        results[source] = future.result()
                    except Exception as e:
                        self.logger.error(f"Parallel parsing failed for {source}: {str(e)}")
                        results[source] = []
        else:
            # Последовательный парсинг
            self.logger.info("Using sequential parsing")
            
            for source in sources:
                results[source] = self.parse_source(source, query, pages_per_source, extract_details)
        
        # Обновляем статистику
        for source, vacancies in results.items():
            self.stats['by_source'][source] = {
                'found': len(vacancies),
                'saved': 0,
                'filtered': 0
            }
            self.stats['total_found'] += len(vacancies)
        
        return results
    
    def save_vacancy(self, vacancy: Dict[str, Any]) -> bool:
        """Сохранение одной вакансии в БД"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Проверяем, есть ли уже такая вакансия
            cursor.execute("SELECT id FROM vacancies WHERE url = ?", (vacancy['url'],))
            if cursor.fetchone():
                self.logger.debug(f"Vacancy already exists: {vacancy.get('external_id', 'unknown')}")
                conn.close()
                return False
            
            # Фильтрация вакансии
            is_relevant, filter_reason = self.filter.is_vacancy_relevant(vacancy)
            
            if not is_relevant:
                self.logger.info(f"🚫 Vacancy filtered: {vacancy.get('title', 'Unknown')} - {filter_reason}")
                self.stats['total_filtered'] += 1
                if vacancy['source'] in self.stats['by_source']:
                    self.stats['by_source'][vacancy['source']]['filtered'] += 1
                conn.close()
                return False
            
            # Подготавливаем данные для вставки
            insert_data = {
                'external_id': vacancy.get('external_id', ''),
                'source': vacancy.get('source', ''),
                'url': vacancy.get('url', ''),
                'title': vacancy.get('title', ''),
                'company': vacancy.get('company', ''),
                'location': vacancy.get('location', ''),
                'description': vacancy.get('description', ''),
                'salary_min': vacancy.get('salary_min'),
                'salary_max': vacancy.get('salary_max'),
                'salary_currency': vacancy.get('salary_currency'),
                'published_at': vacancy.get('published_at'),
                'full_description': vacancy.get('full_description', ''),
                'requirements': vacancy.get('requirements', ''),
                'tasks': vacancy.get('tasks', ''),
                'benefits': vacancy.get('benefits', ''),
                'conditions': vacancy.get('conditions', ''),
                'employment_type': vacancy.get('employment_type'),
                'experience_level': vacancy.get('experience_level'),
                'remote_type': vacancy.get('remote_type'),
                'ai_specialization': 'design',
                'ai_employment': json.dumps([vacancy.get('employment_type', 'full-time')]),
                'ai_experience': vacancy.get('experience_level', 'any'),
                'ai_remote': vacancy.get('remote_type') == 'remote',
                'ai_relevance_score': 0.8,  # Базовая релевантность для прошедших фильтр
                'company_logo': vacancy.get('company_logo'),
                'company_url': vacancy.get('company_url')
            }
            
            # SQL запрос
            columns = ', '.join(insert_data.keys())
            placeholders = ', '.join(['?' for _ in insert_data])
            
            cursor.execute(
                f"INSERT INTO vacancies ({columns}) VALUES ({placeholders})",
                list(insert_data.values())
            )
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"✅ Saved vacancy: {vacancy.get('title', 'Unknown')} - {vacancy.get('company', 'Unknown')}")
            self.stats['total_saved'] += 1
            if vacancy['source'] in self.stats['by_source']:
                self.stats['by_source'][vacancy['source']]['saved'] += 1
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving vacancy: {str(e)}")
            return False
    
    def save_all_vacancies(self, results: Dict[str, List[Dict[str, Any]]]) -> Dict[str, int]:
        """Сохранение всех вакансий в БД"""
        saved_counts = {}
        
        for source, vacancies in results.items():
            saved_count = 0
            
            self.logger.info(f"Saving {len(vacancies)} vacancies from {source}")
            
            for vacancy in vacancies:
                if self.save_vacancy(vacancy):
                    saved_count += 1
            
            saved_counts[source] = saved_count
            self.logger.info(f"{source}: saved {saved_count}/{len(vacancies)} vacancies")
        
        return saved_counts
    
    def get_statistics(self) -> Dict[str, Any]:
        """Получение статистики парсинга"""
        runtime = (datetime.now() - self.stats['start_time']).total_seconds()
        
        return {
            'runtime_seconds': round(runtime, 2),
            'total_found': self.stats['total_found'],
            'total_saved': self.stats['total_saved'],
            'total_filtered': self.stats['total_filtered'],
            'success_rate': round((self.stats['total_saved'] / max(self.stats['total_found'], 1)) * 100, 2),
            'by_source': self.stats['by_source']
        }
    
    def print_summary(self):
        """Вывод итоговой статистики"""
        stats = self.get_statistics()
        
        print("\n" + "="*60)
        print("РЕЗУЛЬТАТЫ ПАРСИНГА ВСЕХ ИСТОЧНИКОВ")
        print("="*60)
        print(f"Найдено вакансий: {stats['total_found']}")
        print(f"Сохранено в БД: {stats['total_saved']}")
        print(f"Отфильтровано: {stats['total_filtered']}")
        print(f"Процент релевантных: {stats['success_rate']}%")
        print(f"Время выполнения: {stats['runtime_seconds']}s")
        
        print(f"\nПо источникам:")
        for source, source_stats in stats['by_source'].items():
            print(f"  {source:10}: найдено {source_stats['found']:3}, сохранено {source_stats['saved']:3}, отфильтровано {source_stats['filtered']:3}")
        
        print(f"\nПарсинг завершён успешно!")


def main():
    """Главная функция"""
    parser = argparse.ArgumentParser(description='Enhanced unified vacancy parser')
    
    parser.add_argument('--db', default='data/vacancies.db', help='Database path')
    parser.add_argument('--query', default='дизайнер', help='Search query')
    parser.add_argument('--pages', type=int, default=3, help='Pages per source')
    parser.add_argument('--sources', nargs='+', choices=['hh', 'habr'], help='Sources to parse')
    parser.add_argument('--extract-details', action='store_true', default=True, help='Extract full details')
    parser.add_argument('--no-parallel', action='store_true', help='Disable parallel parsing')
    parser.add_argument('--verbose', action='store_true', help='Verbose logging')
    parser.add_argument('--quiet', action='store_true', help='Quiet mode')
    
    args = parser.parse_args()
    
    # Настройка логирования
    log_level = logging.DEBUG if args.verbose else (logging.WARNING if args.quiet else logging.INFO)
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('enhanced_unified_parser.log', encoding='utf-8')
        ]
    )
    
    try:
        # Создаём парсер
        unified_parser = EnhancedUnifiedParser(
            db_path=args.db,
            parallel=not args.no_parallel
        )
        
        # Запускаем парсинг
        results = unified_parser.parse_all_sources(
            query=args.query,
            pages_per_source=args.pages,
            extract_details=args.extract_details,
            sources=args.sources
        )
        
        # Сохраняем результаты
        saved_counts = unified_parser.save_all_vacancies(results)
        
        # Выводим статистику
        unified_parser.print_summary()
        
        return 0
        
    except Exception as e:
        logging.error(f"Critical error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
