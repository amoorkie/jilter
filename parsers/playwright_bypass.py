#!/usr/bin/env python3
"""
Продвинутый модуль обхода блокировок с Playwright

Использует:
- Полную эмуляцию браузера
- Случайные движения мыши
- Человеческие задержки
- Обход детекции автоматизации
- JavaScript выполнение

Автор: AI Assistant
Версия: 1.0.0
"""

import random
import time
import asyncio
from typing import Optional, Dict, Any
import logging
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

logger = logging.getLogger(__name__)

class PlaywrightBypass:
    """Продвинутый класс для обхода блокировок с Playwright"""
    
    def __init__(self):
        self.user_agents = [
            # Мобильные User-Agent
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            
            # Десктопные User-Agent
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        ]
        
        self.viewports = [
            {'width': 1920, 'height': 1080},
            {'width': 1366, 'height': 768},
            {'width': 1440, 'height': 900},
            {'width': 1536, 'height': 864},
            {'width': 1280, 'height': 720},
        ]
        
        self.locales = ['ru-RU', 'en-US', 'en-GB']
        self.timezones = ['Europe/Moscow', 'Europe/London', 'America/New_York']
    
    async def create_stealth_context(self, browser: Browser) -> BrowserContext:
        """Создание скрытного контекста браузера"""
        user_agent = random.choice(self.user_agents)
        viewport = random.choice(self.viewports)
        locale = random.choice(self.locales)
        timezone = random.choice(self.timezones)
        
        context = await browser.new_context(
            user_agent=user_agent,
            viewport=viewport,
            locale=locale,
            timezone_id=timezone,
            permissions=['geolocation'],
            geolocation={'latitude': 55.7558, 'longitude': 37.6176},  # Москва
            extra_http_headers={
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        )
        
        # Добавляем скрипты для обхода детекции
        await context.add_init_script("""
            // Удаляем webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            // Подделываем plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            // Подделываем languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ru-RU', 'ru', 'en-US', 'en'],
            });
            
            // Подделываем permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        """)
        
        return context
    
    async def human_like_behavior(self, page: Page):
        """Имитация человеческого поведения"""
        # Случайные движения мыши
        await page.mouse.move(
            random.randint(100, 800), 
            random.randint(100, 600)
        )
        
        # Случайная задержка
        await asyncio.sleep(random.uniform(0.5, 2.0))
        
        # Случайный скролл
        if random.random() < 0.3:  # 30% шанс
            await page.mouse.wheel(0, random.randint(100, 500))
            await asyncio.sleep(random.uniform(0.5, 1.5))
    
    async def make_request(self, url: str, max_retries: int = 3) -> Optional[str]:
        """Выполнение запроса с полной эмуляцией браузера"""
        
        async with async_playwright() as p:
            # Запускаем браузер с антидетект настройками
            browser = await p.chromium.launch(
                headless=True,  # Можем поставить False для отладки
                args=[
                    '--no-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-default-apps',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images',  # Ускоряем загрузку
                    '--disable-javascript',  # Отключаем JS для ускорения
                    '--disable-css',  # Отключаем CSS для ускорения
                    '--disable-fonts',  # Отключаем шрифты
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                ]
            )
            
            for attempt in range(max_retries):
                try:
                    # Создаем новый контекст для каждой попытки
                    context = await self.create_stealth_context(browser)
                    page = await context.new_page()
                    
                    # Случайная задержка перед запросом
                    await asyncio.sleep(random.uniform(1.0, 3.0))
                    
                    logger.info(f"🔄 Playwright попытка {attempt + 1}/{max_retries} для {url}")
                    
                    # Выполняем запрос с более коротким timeout
                    response = await page.goto(
                        url, 
                        wait_until='domcontentloaded',  # Ждем только загрузки DOM
                        timeout=15000  # Уменьшаем timeout до 15 секунд
                    )
                    
                    if response and response.status == 200:
                        # Имитируем человеческое поведение
                        await self.human_like_behavior(page)
                        
                        # Получаем HTML
                        html = await page.content()
                        
                        logger.info(f"✅ Playwright успешный запрос на попытке {attempt + 1}")
                        
                        await context.close()
                        await browser.close()
                        return html
                        
                    elif response and response.status == 403:
                        logger.warning(f"🚫 403 Forbidden на попытке {attempt + 1}")
                        await context.close()
                        continue
                        
                    elif response and response.status == 429:
                        logger.warning(f"⏳ 429 Too Many Requests на попытке {attempt + 1}")
                        await context.close()
                        # Увеличиваем задержку для 429
                        await asyncio.sleep(random.uniform(10.0, 20.0))
                        continue
                        
                    else:
                        logger.warning(f"⚠️ HTTP {response.status if response else 'Unknown'} на попытке {attempt + 1}")
                        await context.close()
                        continue
                        
                except Exception as e:
                    logger.error(f"❌ Ошибка Playwright на попытке {attempt + 1}: {e}")
                    try:
                        await context.close()
                    except:
                        pass
                    continue
            
            await browser.close()
            logger.error(f"❌ Все {max_retries} Playwright попыток не удались для {url}")
            return None

# Глобальный экземпляр
playwright_bypass = PlaywrightBypass()

async def get_page_with_playwright(url: str) -> Optional[str]:
    """Удобная функция для получения страницы через Playwright"""
    return await playwright_bypass.make_request(url)

def get_page_with_playwright_sync(url: str) -> Optional[str]:
    """Синхронная версия для совместимости"""
    try:
        # Проверяем, есть ли уже запущенный event loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Если loop уже запущен, создаем новый в отдельном потоке
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, get_page_with_playwright(url))
                return future.result()
        else:
            # Если loop не запущен, используем asyncio.run
            return asyncio.run(get_page_with_playwright(url))
    except RuntimeError:
        # Fallback - создаем новый event loop
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, get_page_with_playwright(url))
            return future.result()
