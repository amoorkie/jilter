# parsers/enhanced_base_parser.py

import requests
import random
import time
import logging
from typing import List, Dict, Optional, Any
from abc import ABC, abstractmethod
from datetime import datetime
import hashlib

class EnhancedBaseParser(ABC):
    """
    Базовый класс для всех парсеров с улучшенными возможностями:
    - User-Agent rotation
    - Rate limiting
    - Retry logic с exponential backoff
    - Fallback selectors
    - Enhanced logging
    """
    
    def __init__(self, delay_range: tuple = (1.0, 3.0), max_retries: int = 3):
        self.session = requests.Session()
        self.delay_range = delay_range
        self.max_retries = max_retries
        self.timeout = 15
        
        # Настройка логирования
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # User-Agent pool для rotation
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ]
        
        # Статистика для мониторинга
        self.stats = {
            'requests_made': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_response_time': 0,
            'start_time': datetime.now()
        }
    
    def _get_random_headers(self) -> Dict[str, str]:
        """Генерирует случайные headers для каждого запроса"""
        accept_languages = [
            'ru-RU,ru;q=0.9,en;q=0.8',
            'en-US,en;q=0.9,ru;q=0.8',
            'ru,en-US;q=0.9,en;q=0.8'
        ]
        
        return {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': random.choice(accept_languages),
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
            'DNT': '1'
        }
    
    def _apply_rate_limiting(self):
        """Применяет rate limiting между запросами"""
        delay = random.uniform(*self.delay_range)
        self.logger.debug(f"Rate limiting: waiting {delay:.2f} seconds")
        time.sleep(delay)
    
    def _make_request_with_retry(self, url: str, **kwargs) -> Optional[requests.Response]:
        """
        Выполняет HTTP запрос с retry логикой и exponential backoff
        """
        start_time = time.time()
        self.stats['requests_made'] += 1
        
        for attempt in range(self.max_retries):
            try:
                # Rate limiting перед каждым запросом
                if attempt > 0:  # Для повторных попыток
                    backoff_delay = (2 ** attempt) + random.uniform(0.1, 0.5)
                    self.logger.warning(f"Retry attempt {attempt + 1}/{self.max_retries} after {backoff_delay:.2f}s")
                    time.sleep(backoff_delay)
                else:
                    self._apply_rate_limiting()
                
                # Генерируем новые headers для каждой попытки
                headers = self._get_random_headers()
                
                self.logger.debug(f"Making request to {url} (attempt {attempt + 1})")
                
                response = self.session.get(
                    url,
                    headers=headers,
                    timeout=self.timeout,
                    **kwargs
                )
                
                response.raise_for_status()
                
                # Успешный запрос
                response_time = time.time() - start_time
                self.stats['successful_requests'] += 1
                self.stats['total_response_time'] += response_time
                
                self.logger.info(f"Successful request to {url} in {response_time:.2f}s")
                return response
                
            except requests.exceptions.RequestException as e:
                self.logger.warning(f"Request failed (attempt {attempt + 1}): {str(e)}")
                
                if attempt == self.max_retries - 1:
                    # Последняя попытка неудачна
                    self.stats['failed_requests'] += 1
                    self.logger.error(f"All {self.max_retries} attempts failed for {url}")
                    return None
        
        return None
    
    def extract_with_fallback(self, soup, selectors_list: List[str], attribute: Optional[str] = None) -> Optional[str]:
        """
        Пробует несколько селекторов по очереди для надежного извлечения данных
        
        Args:
            soup: BeautifulSoup объект
            selectors_list: Список CSS селекторов для попытки
            attribute: Атрибут для извлечения (если None, извлекает текст)
        
        Returns:
            Извлеченное значение или None
        """
        for i, selector in enumerate(selectors_list):
            try:
                elements = soup.select(selector)
                
                if elements:
                    element = elements[0]
                    
                    if attribute:
                        value = element.get(attribute)
                    else:
                        value = element.get_text(strip=True)
                    
                    if value:
                        self.logger.debug(f"Successful extraction with selector #{i+1}: {selector}")
                        return value
                        
            except Exception as e:
                self.logger.debug(f"Selector '{selector}' failed: {str(e)}")
                continue
        
        self.logger.warning(f"All {len(selectors_list)} selectors failed")
        return None
    
    def extract_multiple_with_fallback(self, soup, selectors_list: List[str], limit: Optional[int] = None) -> List[str]:
        """
        Извлекает множественные элементы с fallback логикой
        """
        for i, selector in enumerate(selectors_list):
            try:
                elements = soup.select(selector)
                
                if elements:
                    results = []
                    for element in elements[:limit] if limit else elements:
                        text = element.get_text(strip=True)
                        if text:
                            results.append(text)
                    
                    if results:
                        self.logger.debug(f"Extracted {len(results)} elements with selector #{i+1}: {selector}")
                        return results
                        
            except Exception as e:
                self.logger.debug(f"Multiple selector '{selector}' failed: {str(e)}")
                continue
        
        self.logger.warning(f"All {len(selectors_list)} multiple selectors failed")
        return []
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Возвращает статистику производительности парсера"""
        runtime = (datetime.now() - self.stats['start_time']).total_seconds()
        avg_response_time = (
            self.stats['total_response_time'] / self.stats['successful_requests'] 
            if self.stats['successful_requests'] > 0 else 0
        )
        success_rate = (
            self.stats['successful_requests'] / self.stats['requests_made'] 
            if self.stats['requests_made'] > 0 else 0
        )
        
        return {
            'runtime_seconds': runtime,
            'requests_made': self.stats['requests_made'],
            'successful_requests': self.stats['successful_requests'],
            'failed_requests': self.stats['failed_requests'],
            'success_rate': round(success_rate * 100, 2),
            'avg_response_time': round(avg_response_time, 2),
            'requests_per_minute': round(self.stats['requests_made'] / (runtime / 60), 2) if runtime > 0 else 0
        }
    
    def log_performance_summary(self):
        """Выводит сводку производительности парсера"""
        stats = self.get_performance_stats()
        self.logger.info("=== PERFORMANCE SUMMARY ===")
        self.logger.info(f"Runtime: {stats['runtime_seconds']:.1f}s")
        self.logger.info(f"Requests: {stats['requests_made']} (Success: {stats['success_rate']}%)")
        self.logger.info(f"Avg Response Time: {stats['avg_response_time']}s")
        self.logger.info(f"Rate: {stats['requests_per_minute']} req/min")
    
    @abstractmethod
    def parse_search_page(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """Абстрактный метод для парсинга страницы поиска"""
        pass
    
    @abstractmethod
    def extract_full_vacancy_details(self, vacancy_url: str) -> Dict[str, str]:
        """Абстрактный метод для извлечения полных деталей вакансии"""
        pass










