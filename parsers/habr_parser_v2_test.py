#!/usr/bin/env python3
"""
Тестовая версия Habr парсера с Вариантом 2 (без заголовков)
"""

import os
import sys
import time
import json
import logging
import requests
from datetime import datetime
from urllib.parse import urljoin, quote
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Any

try:
    from text_formatter_v2 import extract_content_without_headers, clean_text
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from text_formatter_v2 import extract_content_without_headers, clean_text

class HabrParserV2Test:
    """
    Тестовая версия Habr парсера с Вариантом 2 извлечения текста
    """
    
    def __init__(self):
        self.base_url = 'https://career.habr.com'
        self.search_url = 'https://career.habr.com/vacancies'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        # Настройка логирования
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def search_vacancies(self, query: str, pages: int = 1) -> List[Dict[str, Any]]:
        """
        Поиск вакансий на Habr Career
        """
        vacancies = []
        
        for page in range(1, pages + 1):
            try:
                self.logger.info(f"🔍 Парсинг страницы {page} для запроса '{query}'")
                
                # Параметры поиска
                params = {
                    'q': query,
                    'type': 'all',
                    'page': page
                }
                
                response = self.session.get(self.search_url, params=params, timeout=10)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Поиск карточек вакансий
                vacancy_cards = soup.select('.vacancy-card, .vacancy-list-item')
                
                if not vacancy_cards:
                    self.logger.warning(f"⚠️ На странице {page} не найдено вакансий")
                    break
                
                self.logger.info(f"📋 Найдено {len(vacancy_cards)} вакансий на странице {page}")
                
                for card in vacancy_cards:
                    try:
                        vacancy = self.parse_vacancy_card(card)
                        if vacancy:
                            vacancies.append(vacancy)
                    except Exception as e:
                        self.logger.error(f"❌ Ошибка парсинга карточки: {e}")
                        continue
                
                # Пауза между запросами
                time.sleep(1)
                
            except Exception as e:
                self.logger.error(f"❌ Ошибка парсинга страницы {page}: {e}")
                continue
        
        self.logger.info(f"✅ Всего найдено {len(vacancies)} вакансий")
        return vacancies
    
    def parse_vacancy_card(self, card) -> Optional[Dict[str, Any]]:
        """
        Парсинг карточки вакансии
        """
        try:
            # Заголовок и ссылка
            title_link = card.select_one('.vacancy-card__title a, .vacancy-card-title a, h3 a')
            if not title_link:
                return None
            
            title = title_link.get_text(strip=True)
            url = urljoin(self.base_url, title_link.get('href', ''))
            
            # Компания
            company_elem = card.select_one('.vacancy-card__company-title a, .vacancy-card__company a, .company-name a')
            company = company_elem.get_text(strip=True) if company_elem else 'Не указано'
            
            # Зарплата
            salary_elem = card.select_one('.vacancy-card__salary, .salary')
            salary = salary_elem.get_text(strip=True) if salary_elem else ''
            
            # Локация
            location_elem = card.select_one('.vacancy-card__meta, .location')
            location = location_elem.get_text(strip=True) if location_elem else ''
            
            # Дата публикации
            date_elem = card.select_one('.vacancy-card__date, .date')
            published_at = date_elem.get_text(strip=True) if date_elem else ''
            
            return {
                'title': title,
                'company': company,
                'url': url,
                'salary': salary,
                'location': location,
                'published_at': published_at,
                'source': 'habr'
            }
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка парсинга карточки: {e}")
            return None
    
    def get_vacancy_details(self, url: str) -> Dict[str, Any]:
        """
        Получение детальной информации о вакансии с Вариантом 2
        """
        try:
            self.logger.info(f"🔍 Получение деталей вакансии: {url}")
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Селекторы для поиска описания
            description_selectors = [
                '.vacancy-description',
                '.basic-section--appearance-vacancy-description',
                '.vacancy-section',
                '.job-description'
            ]
            
            description = ""
            for selector in description_selectors:
                element = soup.select_one(selector)
                if element:
                    # Используем Вариант 2: только абзацы и списки без заголовков
                    description = extract_content_without_headers(element)
                    if description:
                        break
            
            # Очистка текста
            description = clean_text(description)
            
            return {
                'full_description': description,
                'requirements': '',  # Не разбиваем на блоки в Варианте 2
                'tasks': '',
                'benefits': '',
                'conditions': ''
            }
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка получения деталей вакансии {url}: {e}")
            return {
                'full_description': '',
                'requirements': '',
                'tasks': '',
                'benefits': '',
                'conditions': ''
            }
    
    def parse_vacancies(self, query: str, pages: int = 1) -> List[Dict[str, Any]]:
        """
        Основной метод парсинга вакансий
        """
        self.logger.info(f"🚀 Начинаем парсинг Habr с запросом '{query}', страниц: {pages}")
        
        # Получаем список вакансий
        vacancies = self.search_vacancies(query, pages)
        
        # Получаем детали для каждой вакансии
        detailed_vacancies = []
        for i, vacancy in enumerate(vacancies, 1):
            self.logger.info(f"📄 Обрабатываем вакансию {i}/{len(vacancies)}: {vacancy['title']}")
            
            # Получаем детали
            details = self.get_vacancy_details(vacancy['url'])
            
            # Объединяем данные
            full_vacancy = {
                **vacancy,
                **details,
                'id': f"habr_{hash(vacancy['url'])}",
                'created_at': datetime.now().isoformat()
            }
            
            detailed_vacancies.append(full_vacancy)
            
            # Пауза между запросами
            time.sleep(1)
        
        self.logger.info(f"✅ Парсинг завершен. Обработано {len(detailed_vacancies)} вакансий")
        return detailed_vacancies


def main():
    """
    Тестирование парсера
    """
    parser = HabrParserV2Test()
    
    print("🧪 ТЕСТИРОВАНИЕ HABR ПАРСЕРА С ВАРИАНТОМ 2")
    print("=" * 50)
    
    # Тестируем парсинг
    vacancies = parser.parse_vacancies('дизайнер', pages=1)
    
    print(f"\n📊 Результаты:")
    print(f"Найдено вакансий: {len(vacancies)}")
    
    if vacancies:
        print(f"\n📋 Первая вакансия:")
        first = vacancies[0]
        print(f"Заголовок: {first['title']}")
        print(f"Компания: {first['company']}")
        print(f"URL: {first['url']}")
        print(f"Описание (первые 200 символов):")
        print(first['full_description'][:200] + "..." if len(first['full_description']) > 200 else first['full_description'])


if __name__ == "__main__":
    main()










