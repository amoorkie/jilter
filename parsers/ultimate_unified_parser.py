# parsers/ultimate_unified_parser.py

import asyncio
import logging
import sqlite3
import argparse
import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from enhanced_hh_parser import EnhancedHHParser
    from enhanced_habr_parser import EnhancedHabrParser
    from vacancy_filter import VacancyFilter
    from caching_system import CachingSystem, CachedParser
    from monitoring_system import MonitoringSystem, MonitoredParser
    
    # Опциональный импорт Playwright
    try:
        from playwright_hh_parser import PlaywrightHHParser
        PLAYWRIGHT_AVAILABLE = True
    except ImportError:
        PLAYWRIGHT_AVAILABLE = False
        
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from enhanced_hh_parser import EnhancedHHParser
    from enhanced_habr_parser import EnhancedHabrParser
    from vacancy_filter import VacancyFilter
    from caching_system import CachingSystem, CachedParser
    from monitoring_system import MonitoringSystem, MonitoredParser
    
    # Опциональный импорт Playwright
    try:
        from playwright_hh_parser import PlaywrightHHParser
        PLAYWRIGHT_AVAILABLE = True
    except ImportError:
        PLAYWRIGHT_AVAILABLE = False

class UltimateUnifiedParser(CachedParser, MonitoredParser):
    """
    Максимально продвинутый унифицированный парсер с:
    - Кэшированием результатов
    - Мониторингом и алертами
    - Fallback между парсерами
    - Автоматическим выбором лучшего парсера
    - Интеллектуальной фильтрацией
    - Подробной аналитикой
    """
    
    def __init__(self, db_path: str = "data/vacancies.db", use_playwright: bool = False):
        CachedParser.__init__(self, cache_ttl=1800)  # 30 минут кэш
        MonitoredParser.__init__(self)
        
        # Настройка логирования (сначала!)
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Настройка кодировки для Windows
        import sys
        if sys.platform == 'win32':
            import os
            os.environ['PYTHONIOENCODING'] = 'utf-8'
        
        self.db_path = db_path
        self.use_playwright = use_playwright
        
        # Инициализация парсеров
        self.parsers = {}
        self._init_parsers()
        
        # Инициализация систем
        self.filter = VacancyFilter()
        self.cache = CachingSystem()
        
        # Статистика
        self.stats = {
            'total_found': 0,
            'total_saved': 0,
            'total_filtered': 0,
            'total_cached': 0,
            'by_source': {},
            'start_time': datetime.now(),
            'performance': {}
        }
        
        # Настройки fallback
        self.fallback_enabled = True
        self.parser_priorities = ['habr', 'hh_enhanced', 'hh_playwright']
        
        # Инициализация БД
        self.init_database()
    
    def _init_parsers(self):
        """Инициализация всех доступных парсеров"""
        try:
            # Основные парсеры
            self.parsers['habr'] = EnhancedHabrParser()
            self.parsers['hh_enhanced'] = EnhancedHHParser()
            
            # Playwright парсер (если доступен и нужен)
            if self.use_playwright and PLAYWRIGHT_AVAILABLE:
                self.parsers['hh_playwright'] = PlaywrightHHParser()
            elif self.use_playwright and not PLAYWRIGHT_AVAILABLE:
                self.logger.warning("Playwright requested but not available. Install with: pip install playwright")
            
            self.logger.info(f"Initialized {len(self.parsers)} parsers: {list(self.parsers.keys())}")
            
        except Exception as e:
            self.logger.error(f"Error initializing parsers: {str(e)}")
            raise
    
    def init_database(self):
        """Инициализация базы данных с расширенной схемой"""
        try:
            db_dir = Path(self.db_path).parent
            db_dir.mkdir(parents=True, exist_ok=True)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Основная таблица вакансий (расширенная)
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
                    remote_type TEXT,
                    
                    -- Новые поля для аналитики
                    parser_used TEXT,
                    parse_time REAL,
                    quality_score REAL,
                    cache_hit BOOLEAN DEFAULT FALSE,
                    retry_count INTEGER DEFAULT 0
                )
            """)
            
            # Таблица производительности парсеров
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS parser_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    source TEXT NOT NULL,
                    query TEXT,
                    page INTEGER,
                    response_time REAL,
                    items_found INTEGER,
                    success_rate REAL,
                    cache_hit_rate REAL,
                    error_count INTEGER DEFAULT 0
                )
            """)
            
            # Добавляем новые колонки если их нет (для обратной совместимости)
            try:
                cursor.execute("ALTER TABLE vacancies ADD COLUMN parser_used TEXT")
            except sqlite3.OperationalError:
                pass  # Колонка уже существует
            
            try:
                cursor.execute("ALTER TABLE vacancies ADD COLUMN parse_time REAL")
            except sqlite3.OperationalError:
                pass
                
            try:
                cursor.execute("ALTER TABLE vacancies ADD COLUMN quality_score REAL")
            except sqlite3.OperationalError:
                pass
                
            try:
                cursor.execute("ALTER TABLE vacancies ADD COLUMN cache_hit BOOLEAN DEFAULT FALSE")
            except sqlite3.OperationalError:
                pass
                
            try:
                cursor.execute("ALTER TABLE vacancies ADD COLUMN retry_count INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
            
            # Создаем индексы
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON vacancies(source)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON vacancies(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_quality_score ON vacancies(quality_score)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_parser_performance ON parser_performance(timestamp, source)")
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Database initialized: {self.db_path}")
            
        except Exception as e:
            self.logger.error(f"Database initialization failed: {str(e)}")
            raise
    
    async def parse_source_with_fallback(self, source: str, query: str, pages: int, extract_details: bool = True) -> List[Dict[str, Any]]:
        """Парсинг источника с fallback на другие парсеры"""
        
        # Определяем приоритет парсеров для источника
        if source == 'hh':
            parser_options = ['hh_enhanced']
            if self.use_playwright and PLAYWRIGHT_AVAILABLE:
                parser_options.append('hh_playwright')
        elif source == 'habr':
            parser_options = ['habr']
        else:
            parser_options = [source] if source in self.parsers else []
        
        for parser_name in parser_options:
            if parser_name not in self.parsers:
                continue
                
            parser = self.parsers[parser_name]
            start_time = time.time()
            
            try:
                self.logger.info(f"Trying parser {parser_name} for {source}")
                
                # Проверяем кэш
                cache_key_params = {'extract_details': extract_details}
                cached_data = self.cache.get(source, query, 1, **cache_key_params) if pages == 1 else None
                
                if cached_data:
                    self.stats['total_cached'] += len(cached_data)
                    self.record_success(source, query, 1, 0, len(cached_data))
                    return cached_data
                
                # Выполняем парсинг
                if asyncio.iscoroutinefunction(parser.parse_vacancies):
                    # Асинхронный парсер (Playwright)
                    vacancies = await parser.parse_vacancies(query, pages, extract_details)
                else:
                    # Синхронный парсер
                    vacancies = parser.parse_vacancies(query, pages, extract_details)
                
                parse_time = time.time() - start_time
                
                # Записываем успех
                self.record_success(source, query, pages, parse_time, len(vacancies))
                
                # Добавляем метаинформацию
                for vacancy in vacancies:
                    vacancy['parser_used'] = parser_name
                    vacancy['parse_time'] = parse_time / len(vacancies) if vacancies else 0
                    vacancy['quality_score'] = self._calculate_quality_score(vacancy)
                
                # Кэшируем результат
                if vacancies and pages == 1:
                    self.cache.set(source, query, 1, vacancies, self.cache_ttl, **cache_key_params)
                
                self.logger.info(f"Successfully parsed {len(vacancies)} vacancies with {parser_name}")
                return vacancies
                
            except Exception as e:
                parse_time = time.time() - start_time
                error_msg = str(e)
                
                # Записываем ошибку
                self.record_failure(source, error_msg, query, pages)
                
                self.logger.warning(f"Parser {parser_name} failed for {source}: {error_msg}")
                
                # Если это не последний парсер, пробуем следующий
                if parser_name != parser_options[-1]:
                    self.logger.info(f"Falling back to next parser for {source}")
                    continue
                else:
                    self.logger.error(f"All parsers failed for {source}")
                    return []
        
        return []
    
    def _calculate_quality_score(self, vacancy: Dict[str, Any]) -> float:
        """Вычисление оценки качества вакансии"""
        score = 0.0
        
        # Базовые поля (40% от оценки)
        if vacancy.get('title'):
            score += 10
        if vacancy.get('company'):
            score += 10
        if vacancy.get('location'):
            score += 10
        if vacancy.get('url'):
            score += 10
        
        # Описание (30% от оценки)
        full_desc = vacancy.get('full_description', '')
        if full_desc:
            if len(full_desc) > 500:
                score += 30
            elif len(full_desc) > 200:
                score += 20
            else:
                score += 10
        
        # Структурированные данные (20% от оценки)
        for field in ['requirements', 'tasks', 'benefits', 'conditions']:
            if vacancy.get(field):
                score += 5
        
        # Зарплата (10% от оценки)
        if vacancy.get('salary_min') or vacancy.get('salary_max'):
            score += 10
        
        return min(score, 100.0)
    
    async def parse_all_sources(self, 
                               query: str = 'дизайнер',
                               pages_per_source: int = 3,
                               extract_details: bool = True,
                               sources: Optional[List[str]] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Умный парсинг всех источников с оптимизацией"""
        
        if sources is None:
            sources = ['habr', 'hh']
        
        self.logger.info(f"Starting ultimate parsing: {sources}, query='{query}', pages={pages_per_source}")
        
        results = {}
        
        # Параллельный парсинг источников
        if len(sources) > 1:
            tasks = []
            for source in sources:
                task = self.parse_source_with_fallback(source, query, pages_per_source, extract_details)
                tasks.append((source, task))
            
            # Выполняем задачи
            for source, task in tasks:
                try:
                    if asyncio.iscoroutine(task):
                        vacancies = await task
                    else:
                        vacancies = task
                    results[source] = vacancies
                except Exception as e:
                    self.logger.error(f"Failed to parse {source}: {str(e)}")
                    results[source] = []
        else:
            # Последовательный парсинг для одного источника
            for source in sources:
                results[source] = await self.parse_source_with_fallback(source, query, pages_per_source, extract_details)
        
        # Обновляем статистику
        for source, vacancies in results.items():
            self.stats['by_source'][source] = {
                'found': len(vacancies),
                'saved': 0,
                'filtered': 0,
                'avg_quality': sum(v.get('quality_score', 0) for v in vacancies) / max(len(vacancies), 1)
            }
            self.stats['total_found'] += len(vacancies)
        
        return results
    
    def save_vacancy_enhanced(self, vacancy: Dict[str, Any]) -> bool:
        """Расширенное сохранение вакансии с метаданными"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Проверяем дубликаты
            cursor.execute("SELECT id FROM vacancies WHERE url = ?", (vacancy['url'],))
            if cursor.fetchone():
                self.logger.debug(f"Vacancy already exists: {vacancy.get('external_id', 'unknown')}")
                conn.close()
                return False
            
            # ВРЕМЕННО ОТКЛЮЧАЕМ ФИЛЬТРАЦИЮ - сохраняем все вакансии
            # is_relevant, filter_reason = self.filter.is_vacancy_relevant(vacancy)
            # 
            # if not is_relevant:
            #     self.logger.info(f"🚫 Filtered: {vacancy.get('title', 'Unknown')} - {filter_reason}")
            #     self.stats['total_filtered'] += 1
            #     if vacancy['source'] in self.stats['by_source']:
            #         self.stats['by_source'][vacancy['source']]['filtered'] += 1
            #     conn.close()
            #     return False
            
            # Подготовка данных
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
                'company_logo': vacancy.get('company_logo'),
                'company_url': vacancy.get('company_url'),
                
                # AI поля
                'ai_specialization': 'design',
                'ai_employment': json.dumps([vacancy.get('employment_type', 'full-time')]),
                'ai_experience': vacancy.get('experience_level', 'any'),
                'ai_remote': vacancy.get('remote_type') == 'remote',
                'ai_relevance_score': 0.8,
                
                # Новые метаданные
                'parser_used': vacancy.get('parser_used', 'unknown'),
                'parse_time': vacancy.get('parse_time', 0),
                'quality_score': vacancy.get('quality_score', 0),
                'cache_hit': vacancy.get('cache_hit', False)
            }
            
            # SQL вставка
            columns = ', '.join(insert_data.keys())
            placeholders = ', '.join(['?' for _ in insert_data])
            
            cursor.execute(
                f"INSERT INTO vacancies ({columns}) VALUES ({placeholders})",
                list(insert_data.values())
            )
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"✅ Saved: {vacancy.get('title', 'Unknown')} - {vacancy.get('company', 'Unknown')}")
            self.stats['total_saved'] += 1
            if vacancy['source'] in self.stats['by_source']:
                self.stats['by_source'][vacancy['source']]['saved'] += 1
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving vacancy: {str(e)}")
            return False
    
    async def run_full_parsing(self, 
                              query: str = 'дизайнер',
                              pages_per_source: int = 3,
                              extract_details: bool = True,
                              sources: Optional[List[str]] = None) -> Dict[str, Any]:
        """Полный цикл парсинга с аналитикой"""
        
        start_time = time.time()
        
        try:
            # Парсинг
            results = await self.parse_all_sources(query, pages_per_source, extract_details, sources)
            
            # Сохранение
            for source, vacancies in results.items():
                saved_count = 0
                for vacancy in vacancies:
                    if self.save_vacancy_enhanced(vacancy):
                        saved_count += 1
                
                self.logger.info(f"{source}: saved {saved_count}/{len(vacancies)} vacancies")
            
            # Финальная статистика
            total_time = time.time() - start_time
            
            final_stats = {
                'runtime_seconds': round(total_time, 2),
                'total_found': self.stats['total_found'],
                'total_saved': self.stats['total_saved'],
                'total_filtered': self.stats['total_filtered'],
                'total_cached': self.stats['total_cached'],
                'success_rate': round((self.stats['total_saved'] / max(self.stats['total_found'], 1)) * 100, 2),
                'by_source': self.stats['by_source'],
                'cache_stats': self.cache.get_cache_stats(),
                'health_status': self.monitor.get_health_status()
            }
            
            return final_stats
            
        except Exception as e:
            self.logger.error(f"Critical error in full parsing: {str(e)}")
            return {'error': str(e)}
    
    def print_comprehensive_report(self, stats: Dict[str, Any]):
        """Подробный отчет о результатах парсинга"""
        
        try:
            print("\n" + "="*80)
            print("COMPREHENSIVE PARSING REPORT")
            print("="*80)
            
            if "error" in stats:
                print(f"Error: {stats['error']}")
                return
            
            # Основные метрики
            print(f"Runtime: {stats['runtime_seconds']}s")
            print(f"Found: {stats['total_found']} | Saved: {stats['total_saved']} | Filtered: {stats['total_filtered']}")
            print(f"Cached: {stats['total_cached']} | Success Rate: {stats['success_rate']}%")
            
            # По источникам
            print(f"\nBY SOURCE:")
            for source, source_stats in stats['by_source'].items():
                quality_indicator = "OK" if source_stats['avg_quality'] > 80 else "WARN" if source_stats['avg_quality'] > 60 else "FAIL"
                print(f"  {source:12}: {source_stats['found']:3} found -> {source_stats['saved']:3} saved "
                      f"({source_stats['filtered']:2} filtered) {quality_indicator} {source_stats['avg_quality']:.1f}%")
            
            # Кэш статистика
            cache_stats = stats.get('cache_stats', {})
            if cache_stats and 'hit_ratio' in cache_stats:
                print(f"\nCACHE PERFORMANCE:")
                print(f"  Hit Ratio: {cache_stats['hit_ratio']}% | Active Entries: {cache_stats['active_entries']}")
                print(f"  Cache Size: {cache_stats['cache_size_mb']} MB")
            
            # Состояние системы
            health = stats.get('health_status', {})
            if health and 'overall_status' in health:
                status_indicator = {"healthy": "OK", "warning": "WARN", "degraded": "DEGRADED", "critical": "CRITICAL"}.get(health['overall_status'], "UNKNOWN")
                print(f"\nSYSTEM HEALTH: {status_indicator} {health['overall_status'].upper()}")
                if health['active_alerts'] > 0:
                    print(f"  Active Alerts: {health['active_alerts']}")
            
            print("="*80)
        except UnicodeEncodeError:
            # Fallback для Windows без UTF-8
            print("\n" + "="*80)
            print("PARSING REPORT (simplified)")
            print("="*80)
            print(f"Runtime: {stats.get('runtime_seconds', 0)}s")
            print(f"Found: {stats.get('total_found', 0)} | Saved: {stats.get('total_saved', 0)} | Filtered: {stats.get('total_filtered', 0)}")
            print("="*80)


async def main():
    """Главная функция"""
    parser = argparse.ArgumentParser(description='Ultimate unified vacancy parser')
    
    parser.add_argument('--db', default='data/vacancies.db', help='Database path')
    parser.add_argument('--query', default='дизайнер', help='Search query')
    parser.add_argument('--pages', type=int, default=2, help='Pages per source')
    parser.add_argument('--sources', nargs='+', choices=['hh', 'habr'], help='Sources to parse')
    parser.add_argument('--extract-details', action='store_true', default=True, help='Extract full details')
    parser.add_argument('--use-playwright', action='store_true', help='Use Playwright for HH')
    parser.add_argument('--cache-ttl', type=int, default=1800, help='Cache TTL in seconds')
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
            logging.FileHandler('ultimate_parser.log', encoding='utf-8')
        ]
    )
    
    try:
        # Создаем парсер
        ultimate_parser = UltimateUnifiedParser(
            db_path=args.db,
            use_playwright=args.use_playwright
        )
        
        # Настраиваем кэш
        ultimate_parser.cache_ttl = args.cache_ttl
        
        # Запускаем парсинг
        stats = await ultimate_parser.run_full_parsing(
            query=args.query,
            pages_per_source=args.pages,
            extract_details=args.extract_details,
            sources=args.sources
        )
        
        # Выводим отчет
        ultimate_parser.print_comprehensive_report(stats)
        
        return 0
        
    except Exception as e:
        logging.error(f"Critical error: {e}")
        return 1


if __name__ == "__main__":
    exit(asyncio.run(main()))
