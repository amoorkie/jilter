# parsers/enhanced_hh_parser.py

import logging
from typing import List, Dict, Optional, Any
from urllib.parse import quote_plus, urljoin
from bs4 import BeautifulSoup

try:
    from enhanced_base_parser import EnhancedBaseParser
    from text_formatter import extract_formatted_text, extract_structured_sections, clean_text
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from enhanced_base_parser import EnhancedBaseParser
    from text_formatter import extract_formatted_text, extract_structured_sections, clean_text

class EnhancedHHParser(EnhancedBaseParser):
    """
    Улучшенный парсер для HH.ru с применением всех best practices:
    - User-Agent rotation
    - Rate limiting
    - Retry logic
    - Fallback selectors
    - Enhanced logging
    """
    
    def __init__(self):
        super().__init__(delay_range=(2.0, 4.0), max_retries=3)  # Более консервативный rate limiting для HH
        self.base_url = 'https://hh.ru'
        self.search_url = 'https://hh.ru/search/vacancy'
        
        # Fallback селекторы для различных элементов HH.ru
        self.selectors = {
            'vacancy_cards': [
                'div[data-qa="vacancy-serp__vacancy"]',
                '.vacancy-serp-item',
                '.serp-item',
                '.vacancy-list-item'
            ],
            'vacancy_title': [
                'a[data-qa="vacancy-serp__vacancy-title"]',
                'span[data-qa="serp-item__title"] a',
                '.serp-item__title a',
                '.vacancy-serp-item__title a',
                'h3 a',
                '.vacancy-title a',
                '[data-qa*="title"] a'
            ],
            'company_name': [
                'a[data-qa="vacancy-serp__vacancy-employer"]',
                '.vacancy-serp-item__meta-info-company a',
                '.serp-item__meta-info a',
                '.company-name a',
                '.vacancy-company a'
            ],
            'salary': [
                'span[data-qa="vacancy-serp__vacancy-compensation"]',
                '.vacancy-serp-item__compensation',
                '.serp-item__compensation',
                '.salary',
                '.vacancy-salary'
            ],
            'location': [
                'div[data-qa="vacancy-serp__vacancy-address"]',
                '.vacancy-serp-item__meta-info',
                '.serp-item__meta-info',
                '.location',
                '.vacancy-location'
            ],
            'description_detail': [
                'div[data-qa="vacancy-description"]',
                '.vacancy-description',
                '.g-user-content',
                '.vacancy-section',
                '.vacancy-details'
            ]
        }
    
    def parse_search_page(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """Парсинг страницы поиска HH.ru с улучшенной логикой"""
        
        params = {
            'text': query,
            'area': '1',  # Москва
            'page': page - 1,  # HH использует 0-based индексацию
            'per_page': 50
        }
        
        # Формируем URL с параметрами
        url = f"{self.search_url}?{'&'.join([f'{k}={quote_plus(str(v))}' for k, v in params.items()])}"
        
        self.logger.info(f"Parsing HH.ru page {page}: {url}")
        
        response = self._make_request_with_retry(url)
        if not response:
            self.logger.error(f"Failed to fetch search page {page}")
            return []
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Ищем карточки вакансий с fallback логикой
        vacancy_cards = []
        for selector in self.selectors['vacancy_cards']:
            vacancy_cards = soup.select(selector)
            if vacancy_cards:
                self.logger.info(f"Found {len(vacancy_cards)} vacancies with selector: {selector}")
                break
        
        if not vacancy_cards:
            self.logger.warning("No vacancy cards found on the page")
            return []
        
        vacancies = []
        
        for i, card in enumerate(vacancy_cards):
            try:
                vacancy_data = self._extract_vacancy_from_card(card, i + 1)
                if vacancy_data:
                    vacancies.append(vacancy_data)
                    
            except Exception as e:
                self.logger.error(f"Error processing vacancy card {i + 1}: {str(e)}")
                continue
        
        self.logger.info(f"Successfully extracted {len(vacancies)} vacancies from page {page}")
        return vacancies
    
    def _extract_vacancy_from_card(self, card, card_number: int) -> Optional[Dict[str, Any]]:
        """Извлечение данных вакансии из карточки с fallback селекторами"""
        
        # Извлекаем название и ссылку
        title_element = None
        for selector in self.selectors['vacancy_title']:
            title_element = card.select_one(selector)
            if title_element:
                break
        
        if not title_element:
            self.logger.warning(f"Card {card_number}: No title element found")
            return None
        
        title = title_element.get_text(strip=True)
        vacancy_url = title_element.get('href', '')
        
        if vacancy_url and not vacancy_url.startswith('http'):
            vacancy_url = urljoin(self.base_url, vacancy_url)
        
        if not title or not vacancy_url:
            self.logger.warning(f"Card {card_number}: Missing title or URL")
            return None
        
        # Извлекаем название компании
        company = self.extract_with_fallback(card, self.selectors['company_name']) or 'Не указано'
        
        # Извлекаем зарплату
        salary_text = self.extract_with_fallback(card, self.selectors['salary']) or ''
        salary_min, salary_max, salary_currency = self._parse_salary(salary_text)
        
        # Извлекаем местоположение
        location = self.extract_with_fallback(card, self.selectors['location']) or 'Не указано'
        
        # Извлекаем краткое описание (если есть)
        description = self.extract_with_fallback(card, [
            '.vacancy-serp-item__snippet',
            '.serp-item__snippet',
            '.snippet',
            '.vacancy-snippet'
        ]) or ''
        
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
            'published_at': None,  # HH не всегда показывает дату в списке
            'employment_type': None,
            'experience_level': None,
            'remote_type': None
        }
        
        self.logger.debug(f"Card {card_number}: Extracted '{title}' at {company}")
        return vacancy_data
    
    def extract_full_vacancy_details(self, vacancy_url: str) -> Dict[str, str]:
        """Извлечение полного описания вакансии со страницы HH.ru"""
        try:
            self.logger.debug(f"Extracting details for: {vacancy_url}")
            
            response = self._make_request_with_retry(vacancy_url)
            if not response:
                self.logger.error(f"Failed to fetch vacancy details: {vacancy_url}")
                return self._empty_details()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Ищем основной блок с описанием с сохранением форматирования
            full_description = ''
            description_element = None
            
            for selector in self.selectors['description_detail']:
                element = soup.select_one(selector)
                if element:
                    # Используем форматтер для сохранения структуры
                    full_description = extract_formatted_text(element)
                    description_element = element
                    if full_description and len(full_description) > 100:
                        self.logger.debug(f"Found description with selector {selector}: {len(full_description)} chars")
                        break
            
            # Извлекаем структурированные секции
            structured_sections = extract_structured_sections(soup, full_description)
            
            # Очищаем текст от лишних символов
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
        
        # Удаляем лишние пробелы и приводим к нижнему регистру
        salary_clean = salary_text.replace('\xa0', ' ').replace(' ', ' ').strip()
        
        # Извлекаем валюту
        currency = None
        for curr in ['руб', 'rub', '₽', 'usd', '$', 'eur', '€']:
            if curr in salary_clean.lower():
                currency = curr
                break
        
        # Извлекаем числа
        import re
        numbers = re.findall(r'\d+', salary_clean.replace(' ', ''))
        
        if len(numbers) >= 2:
            return int(numbers[0]), int(numbers[1]), currency
        elif len(numbers) == 1:
            return int(numbers[0]), None, currency
        
        return None, None, currency
    
    def _extract_vacancy_id(self, url: str) -> str:
        """Извлечение ID вакансии из URL"""
        import re
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
    
    def parse_vacancies(self, query: str = 'дизайнер', pages: int = 3, extract_details: bool = True) -> List[Dict[str, Any]]:
        """Основной метод парсинга вакансий с HH.ru"""
        
        self.logger.info(f"Starting HH.ru parsing: query='{query}', pages={pages}, details={extract_details}")
        
        all_vacancies = []
        
        for page in range(1, pages + 1):
            try:
                page_vacancies = self.parse_search_page(query, page)
                
                if extract_details:
                    self.logger.info(f"Extracting details for {len(page_vacancies)} vacancies from page {page}")
                    
                    for vacancy in page_vacancies:
                        details = self.extract_full_vacancy_details(vacancy['url'])
                        vacancy.update(details)
                
                all_vacancies.extend(page_vacancies)
                
                self.logger.info(f"Page {page}: collected {len(page_vacancies)} vacancies")
                
            except Exception as e:
                self.logger.error(f"Error parsing page {page}: {str(e)}")
                continue
        
        self.log_performance_summary()
        
        self.logger.info(f"HH.ru parsing completed. Total: {len(all_vacancies)} vacancies")
        return all_vacancies


def main():
    """Тестирование парсера"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    parser = EnhancedHHParser()
    
    try:
        vacancies = parser.parse_vacancies(
            query='дизайнер',
            pages=2,
            extract_details=True
        )
        
        print(f"\n=== РЕЗУЛЬТАТЫ ===")
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
    main()
