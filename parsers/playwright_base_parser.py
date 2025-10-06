# parsers/playwright_base_parser.py

import asyncio
import logging
import random
import time
from typing import List, Dict, Optional, Any
from abc import ABC, abstractmethod
from datetime import datetime
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

class PlaywrightBaseParser(ABC):
    """
    Базовый класс для парсеров с использованием Playwright
    Для сайтов с JavaScript и защитой от ботов
    """
    
    def __init__(self, headless: bool = True, slow_mo: int = 100):
        self.headless = headless
        self.slow_mo = slow_mo
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # Настройка логирования
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Статистика
        self.stats = {
            'pages_loaded': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_response_time': 0,
            'start_time': datetime.now()
        }
        
        # User-Agent pool
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    
    async def init_browser(self):
        """Инициализация браузера с оптимальными настройками"""
        try:
            playwright = await async_playwright().start()
            
            # Запускаем браузер с настройками для обхода детекции
            self.browser = await playwright.chromium.launch(
                headless=self.headless,
                slow_mo=self.slow_mo,
                args=[
                    '--no-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-extensions',
                    '--disable-default-apps'
                ]
            )
            
            # Создаем контекст с рандомным User-Agent
            self.context = await self.browser.new_context(
                user_agent=random.choice(self.user_agents),
                viewport={'width': 1920, 'height': 1080},
                locale='ru-RU',
                timezone_id='Europe/Moscow'
            )
            
            # Устанавливаем дополнительные заголовки
            await self.context.set_extra_http_headers({
                'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            })
            
            # Создаем страницу
            self.page = await self.context.new_page()
            
            # Удаляем webdriver property для обхода детекции
            await self.page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                // Переопределяем plugins для более реалистичного вида
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                
                // Переопределяем languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['ru-RU', 'ru', 'en-US', 'en'],
                });
                
                // Маскируем автоматизацию
                window.chrome = {
                    runtime: {},
                };
            """)
            
            self.logger.info("Browser initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize browser: {str(e)}")
            raise
    
    async def safe_navigate(self, url: str, timeout: int = 30000) -> bool:
        """Безопасная навигация с retry логикой"""
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                start_time = time.time()
                
                self.logger.debug(f"Navigating to {url} (attempt {attempt + 1})")
                
                # Случайная задержка перед запросом
                if attempt > 0:
                    delay = random.uniform(2, 5)
                    self.logger.debug(f"Retry delay: {delay:.2f}s")
                    await asyncio.sleep(delay)
                
                response = await self.page.goto(
                    url, 
                    wait_until='domcontentloaded',
                    timeout=timeout
                )
                
                if response.status >= 400:
                    raise Exception(f"HTTP {response.status}: {response.status_text}")
                
                # Дополнительное ожидание для AJAX запросов
                await asyncio.sleep(random.uniform(1, 3))
                
                response_time = time.time() - start_time
                self.stats['successful_requests'] += 1
                self.stats['total_response_time'] += response_time
                self.stats['pages_loaded'] += 1
                
                self.logger.info(f"Successfully loaded {url} in {response_time:.2f}s")
                return True
                
            except Exception as e:
                self.logger.warning(f"Navigation attempt {attempt + 1} failed: {str(e)}")
                
                if attempt == max_retries - 1:
                    self.stats['failed_requests'] += 1
                    self.logger.error(f"All {max_retries} navigation attempts failed for {url}")
                    return False
                    
                # Exponential backoff
                await asyncio.sleep((2 ** attempt) + random.uniform(0.1, 0.5))
        
        return False
    
    async def wait_for_element(self, selector: str, timeout: int = 10000) -> bool:
        """Ожидание появления элемента с таймаутом"""
        try:
            await self.page.wait_for_selector(selector, timeout=timeout)
            return True
        except Exception as e:
            self.logger.debug(f"Element '{selector}' not found within {timeout}ms: {str(e)}")
            return False
    
    async def safe_click(self, selector: str, timeout: int = 5000) -> bool:
        """Безопасный клик с проверкой элемента"""
        try:
            await self.page.wait_for_selector(selector, timeout=timeout)
            
            # Скроллим к элементу
            await self.page.locator(selector).scroll_into_view_if_needed()
            
            # Небольшая задержка для имитации человеческого поведения
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            await self.page.click(selector)
            
            # Задержка после клика
            await asyncio.sleep(random.uniform(1, 2))
            
            return True
            
        except Exception as e:
            self.logger.warning(f"Failed to click '{selector}': {str(e)}")
            return False
    
    async def extract_text_safe(self, selector: str, default: str = '') -> str:
        """Безопасное извлечение текста"""
        try:
            element = await self.page.query_selector(selector)
            if element:
                text = await element.text_content()
                return text.strip() if text else default
            return default
        except Exception as e:
            self.logger.debug(f"Failed to extract text from '{selector}': {str(e)}")
            return default
    
    async def extract_attribute_safe(self, selector: str, attribute: str, default: str = '') -> str:
        """Безопасное извлечение атрибута"""
        try:
            element = await self.page.query_selector(selector)
            if element:
                value = await element.get_attribute(attribute)
                return value if value else default
            return default
        except Exception as e:
            self.logger.debug(f"Failed to extract {attribute} from '{selector}': {str(e)}")
            return default
    
    async def extract_multiple_safe(self, selector: str, attribute: Optional[str] = None) -> List[str]:
        """Безопасное извлечение множественных элементов"""
        try:
            elements = await self.page.query_selector_all(selector)
            results = []
            
            for element in elements:
                if attribute:
                    value = await element.get_attribute(attribute)
                    if value:
                        results.append(value.strip())
                else:
                    text = await element.text_content()
                    if text:
                        results.append(text.strip())
            
            return results
            
        except Exception as e:
            self.logger.debug(f"Failed to extract multiple from '{selector}': {str(e)}")
            return []
    
    async def handle_infinite_scroll(self, max_scrolls: int = 10, delay: float = 2.0) -> int:
        """Обработка бесконечного скролла"""
        scroll_count = 0
        last_height = await self.page.evaluate("document.body.scrollHeight")
        
        for i in range(max_scrolls):
            # Скроллим вниз
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            
            # Ждем загрузки контента
            await asyncio.sleep(delay)
            
            # Проверяем, изменилась ли высота страницы
            new_height = await self.page.evaluate("document.body.scrollHeight")
            
            if new_height == last_height:
                self.logger.debug(f"No more content to load after {i + 1} scrolls")
                break
            
            last_height = new_height
            scroll_count += 1
            
            self.logger.debug(f"Scroll {i + 1}/{max_scrolls}: height {new_height}")
        
        return scroll_count
    
    async def bypass_captcha_check(self) -> bool:
        """Проверка и попытка обхода капчи"""
        captcha_selectors = [
            '[data-qa="captcha"]',
            '.captcha',
            '#captcha',
            '.recaptcha',
            '.cloudflare-challenge'
        ]
        
        for selector in captcha_selectors:
            if await self.page.query_selector(selector):
                self.logger.warning(f"Captcha detected: {selector}")
                
                # Пауза для ручного решения или автоматического обхода
                await asyncio.sleep(random.uniform(5, 10))
                
                # Проверяем, исчезла ли капча
                if not await self.page.query_selector(selector):
                    self.logger.info("Captcha bypassed")
                    return True
                
                return False
        
        return True
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Получение статистики производительности"""
        runtime = (datetime.now() - self.stats['start_time']).total_seconds()
        avg_response_time = (
            self.stats['total_response_time'] / max(self.stats['successful_requests'], 1)
        )
        success_rate = (
            self.stats['successful_requests'] / max(self.stats['pages_loaded'], 1) * 100
        )
        
        return {
            'runtime_seconds': round(runtime, 2),
            'pages_loaded': self.stats['pages_loaded'],
            'successful_requests': self.stats['successful_requests'],
            'failed_requests': self.stats['failed_requests'],
            'success_rate': round(success_rate, 2),
            'avg_response_time': round(avg_response_time, 2),
            'pages_per_minute': round(self.stats['pages_loaded'] / (runtime / 60), 2) if runtime > 0 else 0
        }
    
    async def close(self):
        """Закрытие браузера и освобождение ресурсов"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            
            self.logger.info("Browser closed successfully")
            
        except Exception as e:
            self.logger.warning(f"Error closing browser: {str(e)}")
    
    @abstractmethod
    async def parse_search_page(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """Абстрактный метод для парсинга страницы поиска"""
        pass
    
    @abstractmethod
    async def extract_full_vacancy_details(self, vacancy_url: str) -> Dict[str, str]:
        """Абстрактный метод для извлечения полных деталей вакансии"""
        pass










