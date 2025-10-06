#!/usr/bin/env python3
"""
HH.ru парсер на Python для дизайнерских вакансий

Версия: 1.0.0
Автор: AI Assistant
Дата: 2025-01-02
"""

import os
import sys
import time
import json
import sqlite3
import logging
import requests
import random
from datetime import datetime
from urllib.parse import urljoin, quote
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Any
try:
    from simple_text_formatter import extract_formatted_text, clean_text
    from text_cleaner import clean_vacancy_data
except ImportError:
    # Fallback для случая, когда модуль запускается напрямую
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from simple_text_formatter import extract_formatted_text, clean_text
    from text_cleaner import clean_vacancy_data


class HHParser:
    """Парсер для HH.ru"""
    
    # Ключевые слова для поиска дизайнерских вакансий
    DESIGN_KEYWORDS = [
        'дизайн', 'дизайнер', 'дизайнер интерфейсов', 'ui/ux', 'ux/ui', 'продуктовый дизайн',
        'цифровой дизайн', 'веб-дизайн', 'интерфейсный дизайн', 'графический дизайн',
        'визуальный дизайн', 'коммуникационный дизайн', 'дизайн-мышление', 'user experience',
        'user interface', 'ux-дизайнер', 'ui-дизайнер', 'продуктовый дизайнер', 'графический дизайнер',
        'интерфейсный дизайнер', 'веб-дизайнер', 'визуальный дизайнер', 'motion-дизайнер',
        'ux-исследователь', 'арт-директор', 'creative director', 'дизайнер коммуникаций',
        'designer', 'ui designer', 'ux designer', 'product designer', 'visual designer'
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
    
    def __init__(self, delay: float = 1.0, timeout: int = 30):
        self.delay = delay
        self.timeout = timeout
        self.session = self._create_session()
        
    def _create_session(self) -> requests.Session:
        """Создание HTTP сессии с настройками"""
        session = requests.Session()
        session.headers.update({
            'User-Agent': random.choice([
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            ]),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        return session
    
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
        if '/vacancy/' in url:
            return url.split('/vacancy/')[-1].split('?')[0]
        return url.split('/')[-1].split('?')[0]
    
    def parse_vacancy_list_page(self, query: str, page: int = 0) -> List[Dict[str, Any]]:
        """Парсинг страницы со списком вакансий HH.ru"""
        # HH.ru использует параметр page начиная с 0
        url = f"https://hh.ru/search/vacancy?text={quote(query)}&area=1&page={page}&per_page=50"
        
        try:
            logging.info(f"Парсинг HH.ru страницы {page + 1}: {url}")
            
            attempts = 3
            last_exc = None
            vacancies_found = []
            for attempt in range(1, attempts + 1):
                try:
                    # Переинициализируем сессию и заголовки на каждой попытке
                    self.session = self._create_session()
                    response = self.session.get(url, timeout=self.timeout)
                    response.raise_for_status()
                    html = response.content
                    soup = BeautifulSoup(html, 'html.parser')
                except Exception as e:
                    last_exc = e
                    soup = None
                
                vacancy_selectors = [
                    'div[data-qa="vacancy-serp__vacancy"]',
                    'div.vacancy-serp-item',
                    'div.serp-item',
                    'article.vacancy-card'
                ]
                
                if soup:
                    for selector in vacancy_selectors:
                        vacancies_found = soup.select(selector)
                        if vacancies_found:
                            logging.info(f"Найдено {len(vacancies_found)} вакансий через селектор: {selector}")
                            break
                
                if not vacancies_found:
                    # Пытаемся через браузерный рендеринг
                    try:
                        from browser_fetch import get_html
                    except Exception:
                        get_html = None
                    if get_html:
                        html2 = get_html(url, timeout_ms=self.timeout * 1000, wait_selector='[data-qa="vacancy-serp__vacancy"], article, .serp-item')
                        if html2:
                            soup = BeautifulSoup(html2, 'html.parser')
                            for selector in vacancy_selectors:
                                vacancies_found = soup.select(selector)
                                if vacancies_found:
                                    logging.info(f"(PW) Найдено {len(vacancies_found)} вакансий через селектор: {selector}")
                                    break
                
                if vacancies_found:
                    break
                # джиттер между попытками
                time.sleep(self.delay + random.uniform(0.8, 2.0))
            
            if not vacancies_found:
                logging.warning(f"На странице {page + 1} не найдено вакансий")
                if last_exc:
                    logging.debug(f"Последняя ошибка: {last_exc}")
                return []
            
            parsed_vacancies = []
            
            for vacancy_elem in vacancies_found:
                try:
                    # Извлекаем заголовок и ссылку
                    title_selectors = [
                        'a[data-qa="serp-item__title"]',
                        'a.bloko-link[data-qa="vacancy-serp__vacancy-title"]',
                        'h3 a',
                        'a.vacancy-serp-item__title'
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
                    full_url = urljoin('https://hh.ru', url)
                    vacancy_id = self.extract_vacancy_id(full_url)
                    
                    # Извлекаем компанию
                    company_selectors = [
                        'a[data-qa="vacancy-serp__vacancy-employer"]',
                        'div[data-qa="vacancy-serp__vacancy-employer"]',
                        '.vacancy-serp-item__meta-info-company',
                        '.company-name'
                    ]
                    
                    company = 'Компания не указана'
                    for company_selector in company_selectors:
                        company_elem = vacancy_elem.select_one(company_selector)
                        if company_elem:
                            company = company_elem.get_text(strip=True)
                            break
                    
                    # Извлекаем зарплату
                    salary_selectors = [
                        'span[data-qa="vacancy-serp__vacancy-compensation"]',
                        '.vacancy-serp-item__compensation',
                        '.salary'
                    ]
                    
                    salary = 'Не указана'
                    for salary_selector in salary_selectors:
                        salary_elem = vacancy_elem.select_one(salary_selector)
                        if salary_elem:
                            salary = salary_elem.get_text(strip=True)
                            break
                    
                    # Извлекаем краткое описание
                    description_selectors = [
                        'div[data-qa="vacancy-serp__vacancy_snippet_responsibility"]',
                        'div[data-qa="vacancy-serp__vacancy_snippet_requirement"]',
                        '.vacancy-serp-item__snippet',
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
                        'div[data-qa="vacancy-serp__vacancy-address"]',
                        '.vacancy-serp-item__meta-info',
                        '.location'
                    ]
                    
                    location = ''
                    for location_selector in location_selectors:
                        location_elem = vacancy_elem.select_one(location_selector)
                        if location_elem:
                            location = location_elem.get_text(strip=True)
                            break
                    
                    vacancy_data = {
                        'external_id': f"hh-{vacancy_id}",
                        'url': full_url,
                        'title': title,
                        'company': company,
                        'salary': salary,
                        'location': location,
                        'description': description,
                        'source': 'hh'
                    }
                    
                    parsed_vacancies.append(vacancy_data)
                    logging.info(f"Найдена релевантная вакансия: {title} - {company}")
                    
                except Exception as e:
                    logging.error(f"Ошибка обработки вакансии: {e}")
                    continue
            
            return parsed_vacancies
            
        except requests.RequestException as e:
            logging.error(f"Ошибка HTTP запроса для страницы {page + 1}: {e}")
            return []
        except Exception as e:
            logging.error(f"Ошибка парсинга страницы {page + 1}: {e}")
            return []
    
    def extract_full_vacancy_details(self, vacancy_url: str) -> Dict[str, str]:
        """Извлечение полного описания вакансии со страницы HH.ru"""
        try:
            logging.debug(f"Извлекаем детали вакансии: {vacancy_url}")
            
            response = self.session.get(vacancy_url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Ищем основной блок с описанием
            description_selectors = [
                'div[data-qa="vacancy-description"]',
                '.vacancy-description',
                '.g-user-content',
                '.vacancy-section'
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
    
    def parse_vacancies(self, query: str = 'дизайнер', pages: int = 3, extract_details: bool = True) -> List[Dict[str, Any]]:
        """Основной метод парсинга вакансий HH.ru"""
        logging.info(f"Начинаем парсинг HH.ru")
        logging.info(f"Запрос: '{query}', страниц: {pages}, детали: {extract_details}")
        
        all_vacancies = []
        
        for page in range(pages):
            try:
                # Парсим страницу со списком
                page_vacancies = self.parse_vacancy_list_page(query, page)
                
                if not page_vacancies:
                    logging.warning(f"На странице {page + 1} не найдено релевантных вакансий")
                    continue
                
                # Извлекаем детали для каждой вакансии
                for vacancy in page_vacancies:
                    try:
                        if extract_details:
                            details = self.extract_full_vacancy_details(vacancy['url'])
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
                
                logging.info(f"Страница {page + 1}: найдено {len(page_vacancies)} вакансий")
                
                # Задержка между страницами
                time.sleep(self.delay)
                
            except Exception as e:
                logging.error(f"Ошибка парсинга страницы {page + 1}: {e}")
                continue
        
        logging.info(f"HH.ru парсинг завершён. Всего обработано: {len(all_vacancies)} вакансий")
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
            logging.FileHandler('hh_parser.log', encoding='utf-8')
        ]
    )
    
    parser = argparse.ArgumentParser(description='HH.ru парсер для дизайнерских вакансий')
    parser.add_argument('--query', default='дизайнер', help='Поисковый запрос')
    parser.add_argument('--pages', type=int, default=3, help='Количество страниц')
    parser.add_argument('--delay', type=float, default=1.0, help='Задержка между запросами')
    parser.add_argument('--no-details', action='store_true', help='Не извлекать полные детали')
    
    args = parser.parse_args()
    
    try:
        hh_parser = HHParser(delay=args.delay)
        vacancies = hh_parser.parse_vacancies(
            query=args.query,
            pages=args.pages,
            extract_details=not args.no_details
        )
        
        print(f"\nНайдено {len(vacancies)} дизайнерских вакансий на HH.ru:")
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
