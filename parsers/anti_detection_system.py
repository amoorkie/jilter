#!/usr/bin/env python3
"""
Система обхода блокировок для продакшена

Включает:
- Ротацию прокси
- Ротацию User-Agent
- Случайные задержки
- Управление сессиями
- Обработку капчи
- Browser automation с Playwright

Автор: AI Assistant
Версия: 1.0.0
"""

import os
import sys
import time
import random
import json
import logging
import requests
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Tuple
from urllib.parse import urljoin, quote
from bs4 import BeautifulSoup
import hashlib
import base64
from dataclasses import dataclass
from enum import Enum

# Playwright для сложных случаев
try:
    from playwright.async_api import async_playwright, Browser, BrowserContext, Page
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("WARNING: Playwright not installed. Install with: pip install playwright")

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RequestMethod(Enum):
    REQUESTS = "requests"
    PLAYWRIGHT = "playwright"

@dataclass
class ProxyConfig:
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    protocol: str = "http"
    
    def to_dict(self) -> Dict[str, str]:
        """Конвертация в формат для requests"""
        proxy_url = f"{self.protocol}://"
        if self.username and self.password:
            proxy_url += f"{self.username}:{self.password}@"
        proxy_url += f"{self.host}:{self.port}"
        
        return {
            "http": proxy_url,
            "https": proxy_url
        }

@dataclass
class UserAgentConfig:
    user_agent: str
    accept: str
    accept_language: str
    accept_encoding: str
    connection: str = "keep-alive"
    upgrade_insecure_requests: str = "1"

class AntiDetectionSystem:
    """
    Комплексная система обхода блокировок
    """
    
    def __init__(self, config_file: str = "anti_detection_config.json"):
        self.config_file = config_file
        self.config = self.load_config()
        
        # Инициализация компонентов
        self.proxies = self.load_proxies()
        self.user_agents = self.load_user_agents()
        self.sessions = {}
        self.request_history = []
        self.blocked_ips = set()
        self.captcha_handlers = {}
        
        # Статистика
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "blocked_requests": 0,
            "proxy_rotations": 0,
            "user_agent_rotations": 0,
            "captcha_encounters": 0
        }
        
        logger.info("🛡️ Система обхода блокировок инициализирована")
    
    def load_config(self) -> Dict[str, Any]:
        """Загрузка конфигурации"""
        default_config = {
            "request_delays": {
                "min": 1.0,
                "max": 3.0,
                "jitter": 0.5
            },
            "proxy_rotation": {
                "enabled": True,
                "rotation_interval": 10,  # запросов
                "health_check_interval": 30  # секунд
            },
            "user_agent_rotation": {
                "enabled": True,
                "rotation_interval": 5  # запросов
            },
            "session_management": {
                "enabled": True,
                "session_lifetime": 3600,  # секунд
                "max_requests_per_session": 50
            },
            "captcha_handling": {
                "enabled": True,
                "max_attempts": 3,
                "cooldown_period": 300  # секунд
            },
            "browser_automation": {
                "enabled": True,
                "headless": True,
                "timeout": 30000
            }
        }
        
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                # Объединяем с дефолтными настройками
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
            except Exception as e:
                logger.warning(f"⚠️ Ошибка загрузки конфигурации: {e}")
        
        return default_config
    
    def load_proxies(self) -> List[ProxyConfig]:
        """Загрузка списка прокси"""
        proxies = []
        
        # Прокси из переменных окружения
        proxy_list = os.getenv('PROXY_LIST', '')
        if proxy_list:
            for proxy_str in proxy_list.split(','):
                try:
                    parts = proxy_str.strip().split(':')
                    if len(parts) >= 2:
                        host = parts[0]
                        port = int(parts[1])
                        username = parts[2] if len(parts) > 2 else None
                        password = parts[3] if len(parts) > 3 else None
                        proxies.append(ProxyConfig(host, port, username, password))
                except Exception as e:
                    logger.warning(f"⚠️ Ошибка парсинга прокси {proxy_str}: {e}")
        
        # Прокси из файла
        proxy_file = os.getenv('PROXY_FILE', 'proxies.txt')
        if os.path.exists(proxy_file):
            try:
                with open(proxy_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            parts = line.split(':')
                            if len(parts) >= 2:
                                host = parts[0]
                                port = int(parts[1])
                                username = parts[2] if len(parts) > 2 else None
                                password = parts[3] if len(parts) > 3 else None
                                proxies.append(ProxyConfig(host, port, username, password))
            except Exception as e:
                logger.warning(f"⚠️ Ошибка загрузки прокси из файла: {e}")
        
        logger.info(f"📡 Загружено {len(proxies)} прокси")
        return proxies
    
    def load_user_agents(self) -> List[UserAgentConfig]:
        """Загрузка списка User-Agent"""
        user_agents = [
            # Chrome на Windows (2024-2025)
            UserAgentConfig(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                accept_language="ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                accept_encoding="gzip, deflate, br, zstd"
            ),
            UserAgentConfig(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                accept_language="ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                accept_encoding="gzip, deflate, br, zstd"
            ),
            # Chrome на macOS
            UserAgentConfig(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                accept_language="ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                accept_encoding="gzip, deflate, br, zstd"
            ),
            # Firefox на Windows (2024-2025)
            UserAgentConfig(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                accept_language="ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                accept_encoding="gzip, deflate, br, zstd"
            ),
            UserAgentConfig(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                accept_language="ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                accept_encoding="gzip, deflate, br, zstd"
            ),
            # Safari на macOS (2024-2025)
            UserAgentConfig(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                accept_language="ru-RU,ru;q=0.9,en;q=0.8",
                accept_encoding="gzip, deflate, br"
            ),
            UserAgentConfig(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                accept_language="ru-RU,ru;q=0.9,en;q=0.8",
                accept_encoding="gzip, deflate, br"
            ),
            # Edge на Windows (2024-2025)
            UserAgentConfig(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                accept_language="ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                accept_encoding="gzip, deflate, br, zstd"
            ),
            UserAgentConfig(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                accept_language="ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                accept_encoding="gzip, deflate, br, zstd"
            ),
            # Opera на Windows
            UserAgentConfig(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/116.0.0.0",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                accept_language="ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                accept_encoding="gzip, deflate, br, zstd"
            ),
            # Chrome на Linux
            UserAgentConfig(
                user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                accept_language="ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                accept_encoding="gzip, deflate, br, zstd"
            ),
            # Firefox на Linux
            UserAgentConfig(
                user_agent="Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
                accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                accept_language="ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                accept_encoding="gzip, deflate, br, zstd"
            )
        ]
        
        logger.info(f"🌐 Загружено {len(user_agents)} User-Agent")
        return user_agents
    
    def get_random_proxy(self) -> Optional[ProxyConfig]:
        """Получение случайного прокси"""
        if not self.proxies:
            return None
        
        # Фильтруем заблокированные прокси
        available_proxies = [p for p in self.proxies if p.host not in self.blocked_ips]
        if not available_proxies:
            # Если все прокси заблокированы, сбрасываем список
            self.blocked_ips.clear()
            available_proxies = self.proxies
        
        return random.choice(available_proxies)
    
    def get_random_user_agent(self) -> UserAgentConfig:
        """Получение случайного User-Agent"""
        return random.choice(self.user_agents)
    
    def get_session(self, base_url: str) -> requests.Session:
        """Получение или создание сессии"""
        if base_url not in self.sessions:
            self.sessions[base_url] = requests.Session()
            
            # Настройка сессии
            session = self.sessions[base_url]
            session.headers.update({
                'User-Agent': self.get_random_user_agent().user_agent,
                'Accept': self.get_random_user_agent().accept,
                'Accept-Language': self.get_random_user_agent().accept_language,
                'Accept-Encoding': self.get_random_user_agent().accept_encoding,
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            })
        
        return self.sessions[base_url]
    
    def add_random_delay(self, delay_type: str = 'normal'):
        """Добавление случайной задержки с человеческими паттернами"""
        delay_config = self.config['request_delays']
        
        if delay_type == 'fast':
            # Быстрые запросы (0.5-2 сек)
            base_delay = random.uniform(0.5, 2.0)
        elif delay_type == 'slow':
            # Медленные запросы (3-8 сек)
            base_delay = random.uniform(3.0, 8.0)
        elif delay_type == 'human':
            # Человеческие паттерны (1-4 сек с пиками)
            if random.random() < 0.1:  # 10% шанс на длинную паузу
                base_delay = random.uniform(5.0, 12.0)
            else:
                base_delay = random.uniform(1.0, 4.0)
        else:  # normal
            base_delay = random.uniform(delay_config['min'], delay_config['max'])
        
        # Добавляем jitter для естественности
        jitter = random.uniform(-delay_config['jitter'], delay_config['jitter'])
        delay = max(0.1, base_delay + jitter)
        
        logger.debug(f"⏱️ Задержка ({delay_type}): {delay:.2f}с")
        time.sleep(delay)
    
    def detect_blocking(self, response: requests.Response) -> bool:
        """Детекция блокировки по ответу"""
        if response.status_code == 403:
            return True
        if response.status_code == 429:
            return True
        if response.status_code == 503:
            return True
        
        # Проверка содержимого на признаки блокировки
        content_lower = response.text.lower()
        blocking_indicators = [
            'access denied',
            'blocked',
            'captcha',
            'cloudflare',
            'ddos protection',
            'rate limited',
            'too many requests',
            'заблокирован',
            'доступ запрещен',
            'капча'
        ]
        
        for indicator in blocking_indicators:
            if indicator in content_lower:
                return True
        
        return False
    
    def handle_captcha(self, response: requests.Response) -> bool:
        """Обработка капчи"""
        if 'captcha' in response.text.lower() or 'капча' in response.text.lower():
            logger.warning("🤖 Обнаружена капча")
            self.stats['captcha_encounters'] += 1
            
            # Здесь можно интегрировать сервисы решения капчи
            # Например, 2captcha, Anti-Captcha и т.д.
            
            return True
        return False
    
    async def make_request_with_playwright(self, url: str, **kwargs) -> Tuple[bool, str, Dict[str, Any]]:
        """Выполнение запроса через Playwright"""
        if not PLAYWRIGHT_AVAILABLE:
            logger.error("❌ Playwright не доступен")
            return False, "", {}
        
        try:
            async with async_playwright() as p:
                # Выбор браузера
                browser_type = p.chromium
                
                # Запуск браузера
                browser = await browser_type.launch(
                    headless=self.config['browser_automation']['headless'],
                    args=[
                        '--no-sandbox',
                        '--disable-blink-features=AutomationControlled',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor'
                    ]
                )
                
                # Создание контекста
                context = await browser.new_context(
                    user_agent=self.get_random_user_agent().user_agent,
                    viewport={'width': 1920, 'height': 1080},
                    locale='ru-RU',
                    timezone_id='Europe/Moscow'
                )
                
                # Создание страницы
                page = await context.new_page()
                
                # Настройка перехватчиков
                await page.route("**/*", lambda route: route.continue_())
                
                # Выполнение запроса
                response = await page.goto(url, timeout=self.config['browser_automation']['timeout'])
                
                if response:
                    content = await page.content()
                    status_code = response.status
                    
                    await browser.close()
                    
                    return True, content, {
                        'status_code': status_code,
                        'headers': dict(response.headers),
                        'method': 'playwright'
                    }
                else:
                    await browser.close()
                    return False, "", {}
                    
        except Exception as e:
            logger.error(f"❌ Ошибка Playwright: {e}")
            return False, "", {}
    
    def make_request_with_requests(self, url: str, **kwargs) -> Tuple[bool, str, Dict[str, Any]]:
        """Выполнение запроса через requests"""
        try:
            # Получение сессии
            session = self.get_session(url)
            
            # Настройка прокси
            proxy = self.get_random_proxy()
            if proxy:
                session.proxies.update(proxy.to_dict())
                logger.debug(f"🌐 Используем прокси: {proxy.host}:{proxy.port}")
            
            # Ротация User-Agent
            if self.stats['total_requests'] % self.config['user_agent_rotation']['rotation_interval'] == 0:
                ua_config = self.get_random_user_agent()
                session.headers.update({
                    'User-Agent': ua_config.user_agent,
                    'Accept': ua_config.accept,
                    'Accept-Language': ua_config.accept_language,
                    'Accept-Encoding': ua_config.accept_encoding
                })
                self.stats['user_agent_rotations'] += 1
                logger.debug("🔄 Ротация User-Agent")
            
            # Выполнение запроса
            response = session.get(url, timeout=30, **kwargs)
            self.stats['total_requests'] += 1
            
            # Проверка на блокировку
            if self.detect_blocking(response):
                logger.warning(f"🚫 Заблокирован запрос к {url}")
                self.stats['blocked_requests'] += 1
                
                # Блокируем прокси
                if proxy:
                    self.blocked_ips.add(proxy.host)
                    logger.warning(f"🚫 Прокси {proxy.host} заблокирован")
                
                return False, "", {}
            
            # Проверка на капчу
            if self.handle_captcha(response):
                return False, "", {}
            
            self.stats['successful_requests'] += 1
            return True, response.text, {
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'method': 'requests'
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка requests: {e}")
            return False, "", {}
    
    async def make_request(self, url: str, method: RequestMethod = RequestMethod.REQUESTS, **kwargs) -> Tuple[bool, str, Dict[str, Any]]:
        """Универсальный метод выполнения запроса"""
        # Добавляем задержку
        self.add_random_delay()
        
        # Выбор метода
        if method == RequestMethod.PLAYWRIGHT and PLAYWRIGHT_AVAILABLE:
            return await self.make_request_with_playwright(url, **kwargs)
        else:
            return self.make_request_with_requests(url, **kwargs)
    
    def make_request_sync(self, url: str, method: RequestMethod = RequestMethod.REQUESTS, **kwargs) -> requests.Response:
        """Синхронная версия make_request для совместимости"""
        # Добавляем задержку
        self.add_random_delay('human')
        
        # Для синхронной версии используем только requests с улучшенными заголовками
        try:
            # Получаем случайный User-Agent
            ua_config = self.get_random_user_agent()
            
            # Создаем сессию с улучшенными заголовками
            session = requests.Session()
            session.headers.update({
                'User-Agent': ua_config.user_agent,
                'Accept': ua_config.accept,
                'Accept-Language': ua_config.accept_language,
                'Accept-Encoding': ua_config.accept_encoding,
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
                'DNT': '1',
                'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"'
            })
            
            # Выполняем запрос
            response = session.get(url, timeout=30, allow_redirects=True)
            
            # Проверяем на блокировку
            if self.detect_blocking(response):
                logger.warning(f"🚫 Заблокирован запрос к {url}")
                # Возвращаем None вместо создания фейкового Response
                return None
            
            logger.info(f"✅ Успешный запрос к {url}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Ошибка запроса к {url}: {e}")
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Получение статистики"""
        success_rate = 0
        if self.stats['total_requests'] > 0:
            success_rate = (self.stats['successful_requests'] / self.stats['total_requests']) * 100
        
        return {
            **self.stats,
            'success_rate': success_rate,
            'blocked_ips_count': len(self.blocked_ips),
            'active_sessions': len(self.sessions)
        }
    
    def save_config(self):
        """Сохранение конфигурации"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            logger.info("💾 Конфигурация сохранена")
        except Exception as e:
            logger.error(f"❌ Ошибка сохранения конфигурации: {e}")

# Пример использования
async def main():
    """Пример использования системы обхода блокировок"""
    anti_detection = AntiDetectionSystem()
    
    # Тестирование запросов
    test_urls = [
        "https://httpbin.org/ip",
        "https://httpbin.org/user-agent",
        "https://httpbin.org/headers"
    ]
    
    for url in test_urls:
        logger.info(f"🔍 Тестируем {url}")
        
        # Сначала пробуем requests
        success, content, info = await anti_detection.make_request(url)
        if success:
            logger.info(f"✅ Успешно через requests: {info['status_code']}")
        else:
            # Если не получилось, пробуем Playwright
            logger.info("🔄 Пробуем через Playwright...")
            success, content, info = await anti_detection.make_request(url, method=RequestMethod.PLAYWRIGHT)
            if success:
                logger.info(f"✅ Успешно через Playwright: {info['status_code']}")
            else:
                logger.error("❌ Не удалось выполнить запрос")
        
        # Небольшая пауза между запросами
        await asyncio.sleep(2)
    
    # Выводим статистику
    stats = anti_detection.get_stats()
    logger.info(f"📊 Статистика: {stats}")

if __name__ == "__main__":
    asyncio.run(main())
