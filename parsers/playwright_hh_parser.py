# parsers/playwright_hh_parser.py

import asyncio
import logging
import random
from typing import List, Dict, Optional, Any
from urllib.parse import quote_plus, urljoin
import re

try:
    from playwright_base_parser import PlaywrightBaseParser
    from text_formatter import extract_formatted_text, extract_structured_sections, clean_text
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from playwright_base_parser import PlaywrightBaseParser
    from text_formatter import extract_formatted_text, extract_structured_sections, clean_text

class PlaywrightHHParser(PlaywrightBaseParser):
    """
    Продвинутый парсер HH.ru с использованием Playwright
    Обходит блокировки и JavaScript защиту
    """
    
    def __init__(self, headless: bool = True):
        super().__init__(headless=headless, slow_mo=200)
        self.base_url = 'https://hh.ru'
        self.search_url = 'https://hh.ru/search/vacancy'
        
        # Селекторы для HH.ru (обновленные)
        self.selectors = {
            'vacancy_cards': [
                '[data-qa="vacancy-serp__vacancy"]',
                '.vacancy-serp-item',
                '.serp-item'
            ],
            'vacancy_title': [
                '[data-qa="vacancy-serp__vacancy-title"]',
                '.serp-item__title',
                '.vacancy-serp-item__title'
            ],
            'company_name': [
                '[data-qa="vacancy-serp__vacancy-employer"]',
                '.serp-item__meta-info a',
                '.vacancy-serp-item__meta-info a'
            ],
            'salary': [
                '[data-qa="vacancy-serp__vacancy-compensation"]',
                '.serp-item__compensation',
                '.vacancy-serp-item__compensation'
            ],
            'location': [
                '[data-qa="vacancy-serp__vacancy-address"]',
                '.serp-item__meta-info',
                '.vacancy-serp-item__meta-info'
            ],
            'description_detail': [
                '[data-qa="vacancy-description"]',
                '.vacancy-description',
                '.g-user-content'
            ]
        }
    
    async def parse_search_page(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """Парсинг страницы поиска HH.ru с использованием Playwright"""
        
        # Формируем URL
        params = {
            'text': query,
            'area': '1',  # Москва
            'page': page - 1,  # HH использует 0-based индексацию
            'per_page': 50
        }
        
        url = f"{self.search_url}?{'&'.join([f'{k}={quote_plus(str(v))}' for k, v in params.items()])}"
        
        self.logger.info(f"Parsing HH.ru page {page}: {url}")
        
        # Навигируем на страницу
        if not await self.safe_navigate(url):
            self.logger.error(f"Failed to navigate to {url}")
            return []
        
        # Проверяем наличие капчи
        if not await self.bypass_captcha_check():
            self.logger.error("Captcha blocking access")
            return []
        
        # Ждем загрузки контента
        await asyncio.sleep(random.uniform(2, 4))
        
        # Ищем вакансии
        vacancies = []
        
        for selector in self.selectors['vacancy_cards']:
            vacancy_elements = await self.page.query_selector_all(selector)
            
            if vacancy_elements:
                self.logger.info(f"Found {len(vacancy_elements)} vacancy cards with selector: {selector}")
                
                for i, card_element in enumerate(vacancy_elements):
                    try:
                        vacancy_data = await self._extract_vacancy_from_element(card_element, i + 1)
                        if vacancy_data:
                            vacancies.append(vacancy_data)
                    except Exception as e:
                        self.logger.error(f"Error processing vacancy card {i + 1}: {str(e)}")
                        continue
                
                break
        
        if not vacancies:
            self.logger.warning("No vacancies found on the page")
        
        self.logger.info(f"Successfully extracted {len(vacancies)} vacancies from page {page}")
        return vacancies
    
    async def _extract_vacancy_from_element(self, card_element, card_number: int) -> Optional[Dict[str, Any]]:
        """Извлечение данных вакансии из элемента карточки"""
        
        # Извлекаем название и ссылку
        title_element = None
        title = ''
        vacancy_url = ''
        
        for selector in self.selectors['vacancy_title']:
            title_element = await card_element.query_selector(selector)
            if title_element:
                title = await title_element.text_content() or ''
                title = title.strip()
                
                # Ищем ссылку внутри заголовка или в самом элементе
                link_element = await title_element.query_selector('a')
                if not link_element:
                    link_element = title_element
                
                if link_element:
                    href = await link_element.get_attribute('href')
                    if href:
                        vacancy_url = urljoin(self.base_url, href)
                
                if title and vacancy_url:
                    break
        
        if not title or not vacancy_url:
            self.logger.warning(f"Card {card_number}: Missing title or URL")
            return None
        
        # Извлекаем название компании
        company = ''
        for selector in self.selectors['company_name']:
            element = await card_element.query_selector(selector)
            if element:
                company = await element.text_content() or ''
                company = company.strip()
                if company:
                    break
        
        if not company:
            company = 'Не указано'
        
        # Извлекаем зарплату
        salary_text = ''
        for selector in self.selectors['salary']:
            element = await card_element.query_selector(selector)
            if element:
                salary_text = await element.text_content() or ''
                salary_text = salary_text.strip()
                if salary_text:
                    break
        
        salary_min, salary_max, salary_currency = self._parse_salary(salary_text)
        
        # Извлекаем местоположение
        location = ''
        for selector in self.selectors['location']:
            element = await card_element.query_selector(selector)
            if element:
                location_text = await element.text_content() or ''
                location = location_text.strip()
                if location:
                    break
        
        if not location:
            location = 'Не указано'
        
        # Извлекаем краткое описание
        description = ''
        snippet_selectors = [
            '.serp-item__snippet',
            '.vacancy-serp-item__snippet',
            '.snippet'
        ]
        
        for selector in snippet_selectors:
            element = await card_element.query_selector(selector)
            if element:
                description = await element.text_content() or ''
                description = description.strip()
                if description:
                    break
        
        vacancy_data = {
            'external_id': self._extract_vacancy_id(vacancy_url),
            'source': 'hh',
            'url': vacancy_url,
            'title': title,
            'company': company,
            'location': location,
            'description': description,
            'salary_min': salary_min,
            'salary_max': salary_max,
            'salary_currency': salary_currency,
            'published_at': None,
            'employment_type': None,
            'experience_level': None,
            'remote_type': None
        }
        
        self.logger.debug(f"Card {card_number}: Extracted '{title}' at {company}")
        return vacancy_data
    
    async def extract_full_vacancy_details(self, vacancy_url: str) -> Dict[str, str]:
        """Извлечение полного описания вакансии с HH.ru"""
        try:
            self.logger.debug(f"Extracting details for: {vacancy_url}")
            
            # Навигируем на страницу вакансии
            if not await self.safe_navigate(vacancy_url):
                self.logger.error(f"Failed to navigate to vacancy: {vacancy_url}")
                return self._empty_details()
            
            # Проверяем капчу
            if not await self.bypass_captcha_check():
                self.logger.error("Captcha blocking vacancy page")
                return self._empty_details()
            
            # Ждем загрузки описания
            description_loaded = False
            for selector in self.selectors['description_detail']:
                if await self.wait_for_element(selector, timeout=10000):
                    description_loaded = True
                    break
            
            if not description_loaded:
                self.logger.warning(f"Description not loaded for {vacancy_url}")
                return self._empty_details()
            
            # Извлекаем полное описание
            full_description = ''
            for selector in self.selectors['description_detail']:
                element = await self.page.query_selector(selector)
                if element:
                    # Получаем HTML содержимое для лучшего форматирования
                    html_content = await element.inner_html()
                    if html_content and len(html_content) > 100:
                        # Используем text_formatter для обработки HTML
                        from bs4 import BeautifulSoup
                        soup = BeautifulSoup(html_content, 'html.parser')
                        full_description = extract_formatted_text(element)
                        
                        self.logger.debug(f"Found description: {len(full_description)} chars")
                        break
            
            # Если не нашли через HTML, пробуем через текст
            if not full_description:
                for selector in self.selectors['description_detail']:
                    full_description = await self.extract_text_safe(selector)
                    if full_description and len(full_description) > 50:
                        break
            
            # Извлекаем структурированные секции
            structured_sections = {}
            if full_description:
                # Создаем BeautifulSoup объект для анализа
                temp_html = f"<div>{full_description}</div>"
                soup = BeautifulSoup(temp_html, 'html.parser')
                structured_sections = extract_structured_sections(soup, full_description)
            
            # Очищаем данные
            details = {
                'full_description': clean_text(full_description) or 'Описание не найдено',
                'requirements': clean_text(structured_sections.get('requirements', '')),
                'tasks': clean_text(structured_sections.get('tasks', '')),
                'benefits': clean_text(structured_sections.get('benefits', '')),
                'conditions': clean_text(structured_sections.get('conditions', ''))
            }
            
            self.logger.info(f"Successfully extracted details for {vacancy_url}")
            return details
            
        except Exception as e:
            self.logger.error(f"Error extracting details for {vacancy_url}: {str(e)}")
            return self._empty_details()
    
    def _parse_salary(self, salary_text: str) -> tuple:
        """Парсинг зарплаты из текста"""
        if not salary_text:
            return None, None, None
        
        # Очищаем текст
        salary_clean = salary_text.replace('\xa0', ' ').replace(' ', ' ').strip()
        
        # Извлекаем валюту
        currency = None
        for curr in ['руб', 'rub', '₽', 'usd', '$', 'eur', '€']:
            if curr in salary_clean.lower():
                currency = curr
                break
        
        # Извлекаем числа
        numbers = re.findall(r'\d+', salary_clean.replace(' ', ''))
        
        if len(numbers) >= 2:
            return int(numbers[0]), int(numbers[1]), currency
        elif len(numbers) == 1:
            return int(numbers[0]), None, currency
        
        return None, None, currency
    
    def _extract_vacancy_id(self, url: str) -> str:
        """Извлечение ID вакансии из URL"""
        match = re.search(r'/vacancy/(\d+)', url)
        return match.group(1) if match else url.split('/')[-1]
    
    def _empty_details(self) -> Dict[str, str]:
        """Возвращает пустую структуру деталей вакансии"""
        return {
            'full_description': 'Описание не найдено',
            'requirements': '',
            'tasks': '',
            'benefits': '',
            'conditions': ''
        }
    
    async def parse_vacancies(self, query: str = 'дизайнер', pages: int = 3, extract_details: bool = True) -> List[Dict[str, Any]]:
        """Основной метод парсинга вакансий с HH.ru"""
        
        self.logger.info(f"Starting HH.ru parsing with Playwright: query='{query}', pages={pages}, details={extract_details}")
        
        # Инициализируем браузер
        await self.init_browser()
        
        all_vacancies = []
        
        try:
            for page in range(1, pages + 1):
                try:
                    page_vacancies = await self.parse_search_page(query, page)
                    
                    if extract_details and page_vacancies:
                        self.logger.info(f"Extracting details for {len(page_vacancies)} vacancies from page {page}")
                        
                        for vacancy in page_vacancies:
                            details = await self.extract_full_vacancy_details(vacancy['url'])
                            vacancy.update(details)
                            
                            # Небольшая пауза между запросами деталей
                            await asyncio.sleep(random.uniform(1, 3))
                    
                    all_vacancies.extend(page_vacancies)
                    
                    self.logger.info(f"Page {page}: collected {len(page_vacancies)} vacancies")
                    
                    # Пауза между страницами
                    if page < pages:
                        await asyncio.sleep(random.uniform(3, 6))
                    
                except Exception as e:
                    self.logger.error(f"Error parsing page {page}: {str(e)}")
                    continue
        
        finally:
            # Закрываем браузер
            await self.close()
        
        # Выводим статистику
        stats = self.get_performance_stats()
        self.logger.info("=== PLAYWRIGHT HH PERFORMANCE ===")
        self.logger.info(f"Runtime: {stats['runtime_seconds']}s")
        self.logger.info(f"Pages loaded: {stats['pages_loaded']} (Success: {stats['success_rate']}%)")
        self.logger.info(f"Avg Response Time: {stats['avg_response_time']}s")
        
        self.logger.info(f"HH.ru Playwright parsing completed. Total: {len(all_vacancies)} vacancies")
        return all_vacancies


async def main():
    """Тестирование парсера"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    parser = PlaywrightHHParser(headless=True)
    
    try:
        vacancies = await parser.parse_vacancies(
            query='дизайнер',
            pages=1,
            extract_details=True
        )
        
        print(f"\n=== РЕЗУЛЬТАТЫ PLAYWRIGHT HH ===")
        print(f"Найдено вакансий: {len(vacancies)}")
        
        if vacancies:
            print(f"\nПример вакансии:")
            v = vacancies[0]
            print(f"Название: {v['title']}")
            print(f"Компания: {v['company']}")
            print(f"URL: {v['url']}")
            print(f"Описание: {v['full_description'][:200]}...")
        
    except Exception as e:
        logging.error(f"Parsing failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())










