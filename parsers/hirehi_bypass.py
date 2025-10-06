#!/usr/bin/env python3
"""
Специальный модуль для обхода блокировок HireHi.com

Использует:
- Множественные User-Agent
- Ротацию заголовков
- Случайные задержки
- Различные методы запросов
- Обход через рефереры

Автор: AI Assistant
Версия: 1.0.0
"""

import random
import time
import requests
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class HireHiBypass:
    """Специальный класс для обхода блокировок HireHi"""
    
    def __init__(self):
        self.session = requests.Session()
        self.user_agents = [
            # Мобильные User-Agent (менее подозрительные)
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            
            # Старые версии браузеров (менее подозрительные)
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            
            # Боты и индексаторы (иногда проходят)
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
            'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
            
            # Редкие браузеры
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/116.0.0.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        ]
        
        self.referers = [
            'https://www.google.com/',
            'https://www.bing.com/',
            'https://yandex.ru/',
            'https://duckduckgo.com/',
            'https://www.linkedin.com/',
            'https://github.com/',
            'https://stackoverflow.com/',
            'https://habr.com/',
            'https://vc.ru/'
        ]
        
        self.accept_headers = [
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        ]
    
    def get_random_headers(self) -> Dict[str, str]:
        """Получение случайных заголовков"""
        user_agent = random.choice(self.user_agents)
        referer = random.choice(self.referers)
        accept = random.choice(self.accept_headers)
        
        headers = {
            'User-Agent': user_agent,
            'Accept': accept,
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Referer': referer,
            'Cache-Control': 'max-age=0'
        }
        
        # Добавляем случайные заголовки
        if random.random() < 0.3:  # 30% шанс
            headers['DNT'] = '1'
        
        if random.random() < 0.5:  # 50% шанс
            headers['Sec-Fetch-Dest'] = 'document'
            headers['Sec-Fetch-Mode'] = 'navigate'
            headers['Sec-Fetch-Site'] = 'cross-site'
        
        return headers
    
    def make_request(self, url: str, max_retries: int = 3) -> Optional[requests.Response]:
        """Выполнение запроса с обходом блокировок"""
        
        for attempt in range(max_retries):
            try:
                # Случайная задержка между попытками
                if attempt > 0:
                    delay = random.uniform(2.0, 8.0)
                    logger.info(f"⏱️ Задержка {delay:.1f}с перед попыткой {attempt + 1}")
                    time.sleep(delay)
                
                # Получаем случайные заголовки
                headers = self.get_random_headers()
                
                # Создаем новую сессию для каждой попытки
                session = requests.Session()
                session.headers.update(headers)
                
                # Выполняем запрос
                logger.info(f"🔄 Попытка {attempt + 1}/{max_retries} для {url}")
                logger.debug(f"User-Agent: {headers['User-Agent'][:50]}...")
                
                response = session.get(url, timeout=30, allow_redirects=True)
                
                # Проверяем ответ
                if response.status_code == 200:
                    logger.info(f"✅ Успешный запрос на попытке {attempt + 1}")
                    return response
                elif response.status_code == 403:
                    logger.warning(f"🚫 403 Forbidden на попытке {attempt + 1}")
                    continue
                elif response.status_code == 429:
                    logger.warning(f"⏳ 429 Too Many Requests на попытке {attempt + 1}")
                    # Увеличиваем задержку для 429
                    time.sleep(random.uniform(10.0, 20.0))
                    continue
                else:
                    logger.warning(f"⚠️ HTTP {response.status_code} на попытке {attempt + 1}")
                    continue
                    
            except requests.exceptions.Timeout:
                logger.warning(f"⏰ Timeout на попытке {attempt + 1}")
                continue
            except requests.exceptions.ConnectionError:
                logger.warning(f"🔌 Connection Error на попытке {attempt + 1}")
                continue
            except Exception as e:
                logger.error(f"❌ Неожиданная ошибка на попытке {attempt + 1}: {e}")
                continue
        
        logger.error(f"❌ Все {max_retries} попыток не удались для {url}")
        return None
    
    def test_connectivity(self) -> bool:
        """Тестирование подключения к HireHi"""
        test_url = "https://hirehi.com/"
        
        try:
            response = self.make_request(test_url, max_retries=1)
            if response and response.status_code == 200:
                logger.info("✅ Тест подключения к HireHi успешен")
                return True
            else:
                logger.warning("⚠️ Тест подключения к HireHi не удался")
                return False
        except Exception as e:
            logger.error(f"❌ Ошибка теста подключения: {e}")
            return False

# Глобальный экземпляр
hirehi_bypass = HireHiBypass()

def get_hirehi_page(url: str) -> Optional[requests.Response]:
    """Удобная функция для получения страницы HireHi"""
    return hirehi_bypass.make_request(url)

def test_hirehi_access() -> bool:
    """Тестирование доступа к HireHi"""
    return hirehi_bypass.test_connectivity()


