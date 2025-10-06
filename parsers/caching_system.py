# parsers/caching_system.py

import json
import hashlib
import sqlite3
import time
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List
from pathlib import Path
import logging

class CachingSystem:
    """
    Система кэширования для парсеров вакансий
    Сохраняет результаты запросов и избегает повторного парсинга
    """
    
    def __init__(self, cache_db_path: str = "data/parser_cache.db", default_ttl: int = 3600):
        self.cache_db_path = cache_db_path
        self.default_ttl = default_ttl  # TTL в секундах (по умолчанию 1 час)
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Создаем директорию если не существует
        Path(cache_db_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Инициализация БД кэша
        self._init_cache_db()
    
    def _init_cache_db(self):
        """Инициализация базы данных кэша"""
        try:
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            # Таблица для кэширования запросов
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cache_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cache_key TEXT UNIQUE NOT NULL,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    hit_count INTEGER DEFAULT 0,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Таблица для метрик кэша
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cache_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    total_requests INTEGER DEFAULT 0,
                    cache_hits INTEGER DEFAULT 0,
                    cache_misses INTEGER DEFAULT 0,
                    last_cleanup TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Инициализируем метрики если их нет
            cursor.execute("SELECT COUNT(*) FROM cache_metrics")
            if cursor.fetchone()[0] == 0:
                cursor.execute("""
                    INSERT INTO cache_metrics (total_requests, cache_hits, cache_misses)
                    VALUES (0, 0, 0)
                """)
            
            # Создаем индексы
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cache_key ON cache_entries(cache_key)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_expires_at ON cache_entries(expires_at)")
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Cache database initialized: {self.cache_db_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize cache database: {str(e)}")
            raise
    
    def _generate_cache_key(self, source: str, query: str, page: int, **kwargs) -> str:
        """Генерация ключа кэша на основе параметров запроса"""
        # Создаем уникальный ключ из параметров
        cache_data = {
            'source': source,
            'query': query.lower().strip(),
            'page': page,
            **kwargs
        }
        
        # Сортируем ключи для консистентности
        cache_string = json.dumps(cache_data, sort_keys=True)
        
        # Создаем хэш
        cache_key = hashlib.md5(cache_string.encode()).hexdigest()
        
        return f"{source}_{cache_key}"
    
    def get(self, source: str, query: str, page: int, **kwargs) -> Optional[List[Dict[str, Any]]]:
        """Получение данных из кэша"""
        cache_key = self._generate_cache_key(source, query, page, **kwargs)
        
        try:
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            # Обновляем метрики - общее количество запросов
            cursor.execute("UPDATE cache_metrics SET total_requests = total_requests + 1")
            
            # Ищем запись в кэше
            cursor.execute("""
                SELECT data, expires_at FROM cache_entries 
                WHERE cache_key = ? AND expires_at > ?
            """, (cache_key, datetime.now().isoformat()))
            
            result = cursor.fetchone()
            
            if result:
                # Кэш найден и не истек
                data_json, expires_at = result
                
                # Обновляем статистику доступа
                cursor.execute("""
                    UPDATE cache_entries 
                    SET hit_count = hit_count + 1, last_accessed = ? 
                    WHERE cache_key = ?
                """, (datetime.now().isoformat(), cache_key))
                
                # Обновляем метрики - попадание в кэш
                cursor.execute("UPDATE cache_metrics SET cache_hits = cache_hits + 1")
                
                conn.commit()
                conn.close()
                
                # Десериализуем данные
                cached_data = json.loads(data_json)
                
                self.logger.info(f"Cache HIT for {source}/{query}/page{page}: {len(cached_data)} items")
                return cached_data
            
            else:
                # Кэш не найден или истек
                cursor.execute("UPDATE cache_metrics SET cache_misses = cache_misses + 1")
                conn.commit()
                conn.close()
                
                self.logger.debug(f"Cache MISS for {source}/{query}/page{page}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error retrieving from cache: {str(e)}")
            return None
    
    def set(self, source: str, query: str, page: int, data: List[Dict[str, Any]], ttl: Optional[int] = None, **kwargs):
        """Сохранение данных в кэш"""
        if ttl is None:
            ttl = self.default_ttl
        
        cache_key = self._generate_cache_key(source, query, page, **kwargs)
        expires_at = datetime.now() + timedelta(seconds=ttl)
        
        try:
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            # Сериализуем данные
            data_json = json.dumps(data, ensure_ascii=False)
            
            # Сохраняем в кэш (REPLACE для обновления существующих записей)
            cursor.execute("""
                REPLACE INTO cache_entries (cache_key, data, expires_at)
                VALUES (?, ?, ?)
            """, (cache_key, data_json, expires_at.isoformat()))
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Cached {len(data)} items for {source}/{query}/page{page} (TTL: {ttl}s)")
            
        except Exception as e:
            self.logger.error(f"Error saving to cache: {str(e)}")
    
    def invalidate(self, source: str, query: str, page: int, **kwargs):
        """Инвалидация конкретной записи кэша"""
        cache_key = self._generate_cache_key(source, query, page, **kwargs)
        
        try:
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM cache_entries WHERE cache_key = ?", (cache_key,))
            
            deleted_count = cursor.rowcount
            conn.commit()
            conn.close()
            
            if deleted_count > 0:
                self.logger.info(f"Invalidated cache for {source}/{query}/page{page}")
            
        except Exception as e:
            self.logger.error(f"Error invalidating cache: {str(e)}")
    
    def invalidate_source(self, source: str):
        """Инвалидация всех записей для источника"""
        try:
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM cache_entries WHERE cache_key LIKE ?", (f"{source}_%",))
            
            deleted_count = cursor.rowcount
            conn.commit()
            conn.close()
            
            self.logger.info(f"Invalidated {deleted_count} cache entries for source: {source}")
            
        except Exception as e:
            self.logger.error(f"Error invalidating source cache: {str(e)}")
    
    def cleanup_expired(self):
        """Очистка истекших записей кэша"""
        try:
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            # Удаляем истекшие записи
            cursor.execute("DELETE FROM cache_entries WHERE expires_at <= ?", (datetime.now().isoformat(),))
            
            deleted_count = cursor.rowcount
            
            # Обновляем время последней очистки
            cursor.execute("UPDATE cache_metrics SET last_cleanup = ?", (datetime.now().isoformat(),))
            
            conn.commit()
            conn.close()
            
            if deleted_count > 0:
                self.logger.info(f"Cleaned up {deleted_count} expired cache entries")
            
        except Exception as e:
            self.logger.error(f"Error cleaning up cache: {str(e)}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Получение статистики кэша"""
        try:
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            # Общие метрики
            cursor.execute("SELECT total_requests, cache_hits, cache_misses, last_cleanup FROM cache_metrics")
            metrics = cursor.fetchone()
            
            if not metrics:
                return {"error": "No metrics found"}
            
            total_requests, cache_hits, cache_misses, last_cleanup = metrics
            
            # Статистика записей
            cursor.execute("SELECT COUNT(*) FROM cache_entries")
            total_entries = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM cache_entries WHERE expires_at > ?", (datetime.now().isoformat(),))
            active_entries = cursor.fetchone()[0]
            
            # Размер кэша
            cursor.execute("SELECT SUM(LENGTH(data)) FROM cache_entries")
            cache_size_bytes = cursor.fetchone()[0] or 0
            
            # Топ источников
            cursor.execute("""
                SELECT SUBSTR(cache_key, 1, INSTR(cache_key, '_') - 1) as source, COUNT(*) as count
                FROM cache_entries 
                WHERE expires_at > ?
                GROUP BY source 
                ORDER BY count DESC 
                LIMIT 5
            """, (datetime.now().isoformat(),))
            
            top_sources = cursor.fetchall()
            
            conn.close()
            
            # Вычисляем коэффициенты
            hit_ratio = (cache_hits / max(total_requests, 1)) * 100
            
            return {
                'total_requests': total_requests,
                'cache_hits': cache_hits,
                'cache_misses': cache_misses,
                'hit_ratio': round(hit_ratio, 2),
                'total_entries': total_entries,
                'active_entries': active_entries,
                'expired_entries': total_entries - active_entries,
                'cache_size_mb': round(cache_size_bytes / (1024 * 1024), 2),
                'last_cleanup': last_cleanup,
                'top_sources': top_sources
            }
            
        except Exception as e:
            self.logger.error(f"Error getting cache stats: {str(e)}")
            return {"error": str(e)}
    
    def print_cache_stats(self):
        """Вывод статистики кэша в консоль"""
        stats = self.get_cache_stats()
        
        if "error" in stats:
            print(f"Error getting cache stats: {stats['error']}")
            return
        
        print("\n" + "="*50)
        print("СТАТИСТИКА КЭШИРОВАНИЯ")
        print("="*50)
        print(f"Всего запросов: {stats['total_requests']}")
        print(f"Попаданий в кэш: {stats['cache_hits']}")
        print(f"Промахов кэша: {stats['cache_misses']}")
        print(f"Коэффициент попаданий: {stats['hit_ratio']}%")
        print(f"Записей в кэше: {stats['active_entries']}/{stats['total_entries']}")
        print(f"Размер кэша: {stats['cache_size_mb']} MB")
        print(f"Последняя очистка: {stats['last_cleanup']}")
        
        if stats['top_sources']:
            print(f"\nТоп источников:")
            for source, count in stats['top_sources']:
                print(f"  {source}: {count} записей")
        
        print("="*50)


# Глобальный экземпляр кэша
cache_system = CachingSystem()


class CachedParser:
    """
    Миксин для добавления кэширования в парсеры
    """
    
    def __init__(self, cache_ttl: int = 3600):
        self.cache = cache_system
        self.cache_ttl = cache_ttl
        self.cache_enabled = True
    
    def enable_cache(self, ttl: Optional[int] = None):
        """Включение кэширования"""
        self.cache_enabled = True
        if ttl:
            self.cache_ttl = ttl
    
    def disable_cache(self):
        """Отключение кэширования"""
        self.cache_enabled = False
    
    def get_cached_or_parse(self, source: str, query: str, page: int, parse_function, **kwargs):
        """
        Получение данных из кэша или выполнение парсинга
        
        Args:
            source: Источник (hh, habr, etc.)
            query: Поисковый запрос
            page: Номер страницы
            parse_function: Функция парсинга для выполнения если кэш пуст
            **kwargs: Дополнительные параметры для кэша
        """
        
        if self.cache_enabled:
            # Пробуем получить из кэша
            cached_data = self.cache.get(source, query, page, **kwargs)
            if cached_data is not None:
                return cached_data
        
        # Выполняем парсинг
        data = parse_function(query, page)
        
        if self.cache_enabled and data:
            # Сохраняем в кэш
            self.cache.set(source, query, page, data, self.cache_ttl, **kwargs)
        
        return data


def main():
    """Тестирование системы кэширования"""
    logging.basicConfig(level=logging.INFO)
    
    cache = CachingSystem()
    
    # Тестовые данные
    test_data = [
        {'title': 'UI/UX Designer', 'company': 'Test Company', 'url': 'http://example.com/1'},
        {'title': 'Product Designer', 'company': 'Another Company', 'url': 'http://example.com/2'}
    ]
    
    print("Testing cache system...")
    
    # Сохраняем в кэш
    cache.set('habr', 'дизайнер', 1, test_data, ttl=60)
    
    # Читаем из кэша
    cached = cache.get('habr', 'дизайнер', 1)
    print(f"Cached data: {len(cached) if cached else 0} items")
    
    # Статистика
    cache.print_cache_stats()
    
    # Очистка истекших
    cache.cleanup_expired()


if __name__ == "__main__":
    main()










