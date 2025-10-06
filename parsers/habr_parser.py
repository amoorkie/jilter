#!/usr/bin/env python3
"""
Habr Career парсер на Python для дизайнерских вакансий

Версия: 1.0.0
Автор: AI Assistant
Дата: 2025-01-02
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
    from simple_text_formatter import extract_formatted_text, clean_text
    from anti_detection_system import AntiDetectionSystem, RequestMethod
    from text_cleaner import clean_vacancy_data, clean_text as clean_text_spacing
except ImportError:
    # Fallback для случая, когда модуль запускается напрямую
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from simple_text_formatter import extract_formatted_text, clean_text
    from anti_detection_system import AntiDetectionSystem, RequestMethod
    from text_cleaner import clean_vacancy_data, clean_text as clean_text_spacing


class HabrParser:
    """Парсер для Habr Career"""
    
    # Ключевые слова для поиска дизайнерских вакансий
    DESIGN_KEYWORDS = [
        'дизайн', 'дизайнер', 'дизайнер интерфейсов', 'ui/ux', 'ux/ui', 'продуктовый дизайн',
        'цифровой дизайн', 'веб-дизайн', 'интерфейсный дизайн', 'графический дизайн',
        'визуальный дизайн', 'коммуникационный дизайн', 'user experience',
        'user interface', 'ux-дизайнер', 'ui-дизайнер', 'продуктовый дизайнер',
        'designer', 'ui designer', 'ux designer', 'product designer', 'visual designer',
        'motion дизайн', 'арт-директор', 'creative director'
    ]
    
    # Исключения - нерелевантные типы дизайна
    EXCLUDED_KEYWORDS = [
        'текстиль', 'текстильный', 'ткань', 'одежда', 'мода', 'fashion',
        'ювелирный', 'ювелир', 'украшения', 'бижутерия',
        'мебель', 'интерьер', 'декор', 'ландшафт', 'садовый',
        'промышленный', 'машиностроение', 'автомобильный',
        'упаковка', 'полиграфия', 'печать', 'типография',
        'архитектурный', 'строительный', 'недвижимость',
        'кулинарный', 'пищевой', 'ресторанный',
        'медицинский', 'фармацевтический',
        'сельскохозяйственный', 'агро',
        'спортивный', 'фитнес', 'здоровье'
    ]
    
    def __init__(self, delay: float = 1.0, timeout: int = 30, use_anti_detection: bool = True):
        self.delay = delay
        self.timeout = timeout
        self.use_anti_detection = use_anti_detection
        
        # Инициализация системы обхода блокировок
        if self.use_anti_detection:
            self.anti_detection = AntiDetectionSystem()
        else:
            self.anti_detection = None
            self.session = self._create_session()
        
    def _create_session(self) -> requests.Session:
        """Создание HTTP сессии с настройками"""
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        return session
    
    async def _make_request(self, url: str, method: str = 'requests') -> Optional[BeautifulSoup]:
        """Универсальный метод выполнения запроса с обходом блокировок"""
        if self.use_anti_detection and self.anti_detection:
            # Используем систему обхода блокировок
            request_method = RequestMethod.PLAYWRIGHT if method == 'playwright' else RequestMethod.REQUESTS
            
            success, content, info = await self.anti_detection.make_request(url, method=request_method)
            
            if success:
                logging.debug(f"✅ Успешный запрос к {url} через {info.get('method', 'unknown')}")
                return BeautifulSoup(content, 'html.parser')
            else:
                logging.warning(f"❌ Не удалось выполнить запрос к {url}")
                return None
        else:
            # Обычный запрос через requests
            try:
                response = self.session.get(url, timeout=self.timeout)
                response.raise_for_status()
                logging.debug(f"✅ Успешный запрос к {url} через requests")
                return BeautifulSoup(response.content, 'html.parser')
            except Exception as e:
                logging.error(f"❌ Ошибка запроса к {url}: {e}")
                return None
    
    def is_relevant_vacancy(self, title: str, description: str = '') -> bool:
        """Проверка релевантности вакансии для дизайнеров"""
        text = f"{title} {description}".lower()
        
        # Проверяем наличие ключевых слов дизайна
        has_design_keywords = any(keyword.lower() in text for keyword in self.DESIGN_KEYWORDS)
        
        # Проверяем отсутствие исключающих ключевых слов
        has_excluded_keywords = any(keyword.lower() in text for keyword in self.EXCLUDED_KEYWORDS)
        
        # Вакансия релевантна, если есть ключевые слова дизайна И нет исключающих
        return has_design_keywords and not has_excluded_keywords
    
    def extract_vacancy_id(self, url: str) -> str:
        """Извлечение ID вакансии из URL"""
        if '/vacancies/' in url:
            return url.split('/vacancies/')[-1].split('?')[0].split('/')[0]
        return url.split('/')[-1].split('?')[0]
    
    async def parse_vacancy_list_page(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """Парсинг страницы со списком вакансий Habr Career"""
        url = f"https://career.habr.com/vacancies?q={quote(query)}&page={page}&type=all"
        
        try:
            logging.info(f"Парсинг Habr Career страницы {page}: {url}")
            
            soup = await self._make_request(url)
            if not soup:
                logging.error(f"❌ Не удалось получить страницу {url}")
                return []
            
            # Ищем вакансии по различным селекторам
            vacancy_selectors = [
                'div.vacancy-card',
                'article.vacancy-card',
                'div.job-card',
                'div[data-testid="vacancy-card"]',
                'div.vacancy-item'
            ]
            
            vacancies_found = []
            for selector in vacancy_selectors:
                vacancies_found = soup.select(selector)
                if vacancies_found:
                    logging.info(f"Найдено {len(vacancies_found)} вакансий через селектор: {selector}")
                    break
            
            if not vacancies_found:
                # Fallback на Playwright напрямую, если стандартный способ не помог
                try:
                    from browser_fetch import get_html
                    html2 = get_html(url, timeout_ms=self.timeout * 1000, wait_selector='div.vacancy-card, article.vacancy-card, a[href*="/vacancies/"]')
                    if html2:
                        from bs4 import BeautifulSoup as _BS
                        soup = _BS(html2, 'html.parser')
                        for selector in vacancy_selectors:
                            vacancies_found = soup.select(selector)
                            if vacancies_found:
                                logging.info(f"(PW) Найдено {len(vacancies_found)} вакансий через селектор: {selector}")
                                break
                except Exception:
                    pass
            
            if not vacancies_found:
                # Попробуем найти ссылки на вакансии
                vacancy_links = soup.find_all('a', href=lambda x: x and '/vacancies/' in x)
                if vacancy_links:
                    logging.info(f"Найдено {len(vacancy_links)} ссылок на вакансии")
                    # Группируем по родительским элементам
                    parent_elements = []
                    for link in vacancy_links:
                        parent = link.find_parent(['div', 'article', 'section'])
                        if parent and parent not in parent_elements:
                            parent_elements.append(parent)
                    vacancies_found = parent_elements
                else:
                    logging.warning(f"На странице {page} не найдено вакансий")
                    return []
            
            parsed_vacancies = []
            processed_urls = set()  # Для избежания дубликатов
            
            for vacancy_elem in vacancies_found:
                try:
                    # Ищем ссылку на вакансию
                    title_selectors = [
                        'a.vacancy-card__title-link',
                        'h3 a[href*="/vacancies/"]',
                        'h2 a[href*="/vacancies/"]',
                        'a[href*="/vacancies/"]'
                    ]
                    
                    title_elem = None
                    for title_selector in title_selectors:
                        title_elem = vacancy_elem.select_one(title_selector)
                        if title_elem:
                            break
                    
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    url = title_elem.get('href', '')
                    
                    if not title or not url:
                        continue
                    
                    # Проверяем релевантность
                    if not self.is_relevant_vacancy(title):
                        logging.debug(f"Не релевантная вакансия: {title}")
                        continue
                    
                    # Полный URL
                    full_url = urljoin('https://career.habr.com', url)
                    
                    # Проверяем на дубликаты
                    if full_url in processed_urls:
                        continue
                    processed_urls.add(full_url)
                    
                    vacancy_id = self.extract_vacancy_id(full_url)
                    
                    # Извлекаем компанию
                    company_selectors = [
                        'a.vacancy-card__company-title',
                        '.company-name',
                        '.vacancy-company',
                        'a[href*="/companies/"]'
                    ]
                    
                    company = 'Компания не указана'
                    for company_selector in company_selectors:
                        company_elem = vacancy_elem.select_one(company_selector)
                        if company_elem:
                            company = company_elem.get_text(strip=True)
                            break
                    
                    # Извлекаем зарплату
                    salary_selectors = [
                        '.vacancy-card__salary',
                        '.salary',
                        '.vacancy-salary',
                        '[data-testid="salary"]'
                    ]
                    
                    salary = 'Не указана'
                    for salary_selector in salary_selectors:
                        salary_elem = vacancy_elem.select_one(salary_selector)
                        if salary_elem:
                            salary = salary_elem.get_text(strip=True)
                            break
                    
                    # Извлекаем краткое описание
                    description_selectors = [
                        '.vacancy-card__description',
                        '.vacancy-card__snippet',
                        '.description',
                        '.snippet'
                    ]
                    
                    description = ''
                    for desc_selector in description_selectors:
                        desc_elem = vacancy_elem.select_one(desc_selector)
                        if desc_elem:
                            description = desc_elem.get_text(strip=True)
                            break
                    
                    # Извлекаем локацию
                    location_selectors = [
                        '.vacancy-card__meta',
                        '.location',
                        '.vacancy-location',
                        '[data-testid="location"]'
                    ]
                    
                    location = ''
                    for location_selector in location_selectors:
                        location_elem = vacancy_elem.select_one(location_selector)
                        if location_elem:
                            location_text = location_elem.get_text(strip=True)
                            # Извлекаем только информацию о локации
                            if any(city in location_text.lower() for city in ['москва', 'спб', 'санкт-петербург', 'удаленно', 'remote']):
                                location = location_text
                            break
                    
                    vacancy_data = {
                        'external_id': f"habr-{vacancy_id}",
                        'url': full_url,
                        'title': title,
                        'company': company,
                        'salary': salary,
                        'location': location,
                        'description': description,
                        'source': 'habr'
                    }
                    
                    parsed_vacancies.append(vacancy_data)
                    logging.info(f"Найдена релевантная вакансия: {title} - {company}")
                    
                except Exception as e:
                    logging.error(f"Ошибка обработки вакансии: {e}")
                    continue
            
            return parsed_vacancies
            
        except requests.RequestException as e:
            logging.error(f"Ошибка HTTP запроса для страницы {page}: {e}")
            return []
        except Exception as e:
            logging.error(f"Ошибка парсинга страницы {page}: {e}")
            return []
    
    async def extract_full_vacancy_details(self, vacancy_url: str) -> Dict[str, str]:
        """Извлечение полного описания вакансии со страницы Habr Career"""
        try:
            logging.debug(f"Извлекаем детали вакансии: {vacancy_url}")
            
            soup = await self._make_request(vacancy_url)
            if not soup:
                logging.error(f"❌ Не удалось получить страницу вакансии {vacancy_url}")
                return {
                    'full_description': 'Описание не найдено',
                    'requirements': '',
                    'tasks': '',
                    'benefits': '',
                    'conditions': ''
                }
            
            # Ищем основной блок с описанием
            description_selectors = [
                '.basic-section--appearance-vacancy-description',
                '.vacancy-description',
                '.job-description',
                '.basic-section',
                '.content'
            ]
            
            description_element = None
            
            for selector in description_selectors:
                element = soup.select_one(selector)
                if element:
                    description_element = element
                    logging.debug(f"Найден блок описания через селектор {selector}")
                    break
            
            if not description_element:
                logging.warning(f"Не найден блок описания для {vacancy_url}")
                return {
                    'full_description': 'Описание не найдено',
                    'requirements': '',
                    'tasks': '',
                    'benefits': '',
                    'conditions': ''
                }
            
            # Просто извлекаем отформатированный текст как есть
            full_description = extract_formatted_text(description_element)
            full_description = clean_text(full_description)
            
            # Не разбиваем на блоки - все идет в full_description
            requirements = ''
            tasks = ''
            conditions = ''
            benefits = ''
            
            return {
                'full_description': full_description or 'Описание не найдено',
                'requirements': requirements or '',
                'tasks': tasks or '',
                'benefits': benefits or '',
                'conditions': conditions or ''
            }
            
        except Exception as e:
            logging.error(f"Ошибка извлечения деталей вакансии {vacancy_url}: {e}")
            return {
                'full_description': 'Описание не найдено',
                'requirements': 'Требования не указаны',
                'tasks': 'Задачи не указаны',
                'benefits': 'Льготы не указаны',
                'conditions': 'Условия не указаны'
            }
    
    async def parse_vacancies(self, query: str = 'дизайнер', pages: int = 3, extract_details: bool = True) -> List[Dict[str, Any]]:
        """Основной метод парсинга вакансий Habr Career"""
        logging.info(f"Начинаем парсинг Habr Career")
        logging.info(f"Запрос: '{query}', страниц: {pages}, детали: {extract_details}")
        
        all_vacancies = []
        
        for page in range(1, pages + 1):
            try:
                # Парсим страницу со списком
                page_vacancies = await self.parse_vacancy_list_page(query, page)
                
                if not page_vacancies:
                    logging.warning(f"На странице {page} не найдено релевантных вакансий")
                    continue
                
                # Извлекаем детали для каждой вакансии
                for vacancy in page_vacancies:
                    try:
                        if extract_details:
                            details = await self.extract_full_vacancy_details(vacancy['url'])
                            vacancy.update(details)
                        
                        # Очищаем и форматируем данные вакансии
                        vacancy = clean_vacancy_data(vacancy)
                        
                        # Добавляем метаданные
                        vacancy['published_at'] = datetime.now().isoformat()
                        vacancy['status'] = 'pending'
                        
                        all_vacancies.append(vacancy)
                        
                        # Задержка между запросами деталей
                        if extract_details:
                            time.sleep(self.delay)
                        
                    except Exception as e:
                        logging.error(f"Ошибка обработки вакансии: {e}")
                        continue
                
                logging.info(f"Страница {page}: найдено {len(page_vacancies)} вакансий")
                
                # Задержка между страницами
                time.sleep(self.delay)
                
            except Exception as e:
                logging.error(f"Ошибка парсинга страницы {page}: {e}")
                continue
        
        logging.info(f"Habr Career парсинг завершён. Всего обработано: {len(all_vacancies)} вакансий")
        return all_vacancies


def main():
    """Тестовая функция"""
    import argparse
    
    # Настройка логирования
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('habr_parser.log', encoding='utf-8')
        ]
    )
    
    parser = argparse.ArgumentParser(description='Habr Career парсер для дизайнерских вакансий')
    parser.add_argument('--query', default='дизайнер', help='Поисковый запрос')
    parser.add_argument('--pages', type=int, default=3, help='Количество страниц')
    parser.add_argument('--delay', type=float, default=1.0, help='Задержка между запросами')
    parser.add_argument('--no-details', action='store_true', help='Не извлекать полные детали')
    
    args = parser.parse_args()
    
    try:
        habr_parser = HabrParser(delay=args.delay)
        vacancies = habr_parser.parse_vacancies(
            query=args.query,
            pages=args.pages,
            extract_details=not args.no_details
        )
        
        print(f"\nНайдено {len(vacancies)} дизайнерских вакансий на Habr Career:")
        for i, vacancy in enumerate(vacancies, 1):
            print(f"{i}. {vacancy['title']}")
            print(f"   Компания: {vacancy['company']}")
            print(f"   Зарплата: {vacancy['salary']}")
            print(f"   URL: {vacancy['url']}")
            print()
        
    except Exception as e:
        logging.error(f"Критическая ошибка: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
