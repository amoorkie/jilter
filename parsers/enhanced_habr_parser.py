# parsers/enhanced_habr_parser.py

import logging
from typing import List, Dict, Optional, Any
from urllib.parse import quote_plus, urljoin
from bs4 import BeautifulSoup
import re

try:
    from enhanced_base_parser import EnhancedBaseParser
    from simple_text_formatter import extract_formatted_text, clean_text
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from enhanced_base_parser import EnhancedBaseParser
    from simple_text_formatter import extract_formatted_text, clean_text

class EnhancedHabrParser(EnhancedBaseParser):
    """
    Улучшенный парсер для Habr Career с применением всех best practices
    """
    
    def __init__(self):
        super().__init__(delay_range=(1.5, 3.0), max_retries=3)
        self.base_url = 'https://career.habr.com'
        self.search_url = 'https://career.habr.com/vacancies'
        
        # Fallback селекторы для Habr Career
        self.selectors = {
            'vacancy_cards': [
                'div.vacancy-card',
                '.vacancy-list-item',
                '.job-card',
                '.vacancy-item'
            ],
            'vacancy_title': [
                '.vacancy-card__title a',
                '.vacancy-card-title a',
                'h3 a',
                '.title a',
                '.job-title a'
            ],
            'company_name': [
                '.vacancy-card__company-title a',
                '.vacancy-card__company a',
                '.company-name a',
                '.company a'
            ],
            'salary': [
                '.vacancy-card__salary',
                '.salary',
                '.compensation'
            ],
            'location': [
                '.vacancy-card__meta .vacancy-card__meta-item',
                '.location',
                '.vacancy-location'
            ],
            'tags': [
                '.vacancy-card__skills .inline-tag',
                '.skills .tag',
                '.tech-stack .tag'
            ],
            'description_detail': [
                '.basic-section--appearance-vacancy-description',
                '.vacancy-description',
                '.job-description',
                '.basic-section',
                '.content'
            ]
        }
    
    def parse_search_page(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """Парсинг страницы поиска Habr Career"""
        
        params = {
            'q': query,
            'page': page,
            'type': 'all'
        }
        
        url = f"{self.search_url}?{'&'.join([f'{k}={quote_plus(str(v))}' for k, v in params.items()])}"
        
        self.logger.info(f"Parsing Habr Career page {page}: {url}")
        
        response = self._make_request_with_retry(url)
        if not response:
            self.logger.error(f"Failed to fetch search page {page}")
            return []
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Ищем карточки вакансий
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
        """Извлечение данных вакансии из карточки Habr Career"""
        
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
        
        # Извлекаем местоположение и дополнительную информацию
        location_info = self.extract_multiple_with_fallback(card, self.selectors['location'])
        location = ', '.join(location_info) if location_info else 'Не указано'
        
        # Извлекаем технологии/навыки
        tech_stack = self.extract_multiple_with_fallback(card, self.selectors['tags'], limit=10)
        
        # Извлекаем краткое описание
        description = self.extract_with_fallback(card, [
            '.vacancy-card__description',
            '.vacancy-snippet',
            '.job-snippet'
        ]) or ''
        
        vacancy_data = {
            'external_id': self._extract_vacancy_id(vacancy_url),
            'source': 'habr',
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
            'remote_type': self._detect_remote_type(location),
            'tech_stack': tech_stack
        }
        
        self.logger.debug(f"Card {card_number}: Extracted '{title}' at {company}")
        return vacancy_data
    
    def extract_full_vacancy_details(self, vacancy_url: str) -> Dict[str, str]:
        """Извлечение полного описания вакансии со страницы Habr Career"""
        try:
            self.logger.debug(f"Extracting details for: {vacancy_url}")
            
            response = self._make_request_with_retry(vacancy_url)
            if not response:
                self.logger.error(f"Failed to fetch vacancy details: {vacancy_url}")
                return self._empty_details()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Ищем основной блок с описанием
            full_description = ''
            description_element = None
            
            for selector in self.selectors['description_detail']:
                element = soup.select_one(selector)
                if element:
                    full_description = extract_formatted_text(element)
                    description_element = element
                    if full_description and len(full_description) > 100:
                        self.logger.debug(f"Found description with selector {selector}: {len(full_description)} chars")
                        break
            
            # Просто извлекаем отформатированный текст как есть
            full_description = extract_formatted_text(description_element)
            full_description = clean_text(full_description)
            
            # Не разбиваем на блоки - все идет в full_description
            structured_sections = {
                'requirements': '',
                'tasks': '',
                'conditions': '',
                'benefits': ''
            }
            
            # Очищаем текст
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
    
    def _extract_habr_section(self, soup, keywords: List[str]) -> str:
        """Извлечение специфичных секций для Habr Career"""
        for keyword in keywords:
            # Ищем заголовки, содержащие ключевые слова
            headers = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b'])
            
            for header in headers:
                header_text = header.get_text(strip=True).lower()
                if keyword in header_text:
                    # Собираем текст после заголовка до следующего заголовка
                    content_parts = []
                    current = header.next_sibling
                    
                    while current:
                        if hasattr(current, 'name') and current.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                            break
                        
                        if hasattr(current, 'get_text'):
                            text = current.get_text(strip=True)
                            if text:
                                content_parts.append(text)
                        elif isinstance(current, str) and current.strip():
                            content_parts.append(current.strip())
                        
                        current = current.next_sibling
                    
                    if content_parts:
                        return '\n'.join(content_parts)
        
        return ''
    
    def _parse_salary(self, salary_text: str) -> tuple:
        """Парсинг зарплаты из текста"""
        if not salary_text:
            return None, None, None
        
        # Удаляем лишние символы
        salary_clean = re.sub(r'[^\d\s\-–—руб$€₽]', '', salary_text.lower())
        
        # Извлекаем валюту
        currency = None
        if 'руб' in salary_text.lower() or '₽' in salary_text:
            currency = 'RUB'
        elif '$' in salary_text:
            currency = 'USD'
        elif '€' in salary_text:
            currency = 'EUR'
        
        # Извлекаем числа
        numbers = re.findall(r'\d+', salary_clean.replace(' ', ''))
        
        if len(numbers) >= 2:
            return int(numbers[0]), int(numbers[1]), currency
        elif len(numbers) == 1:
            number = int(numbers[0])
            # Если число очень маленькое, возможно это зарплата в тысячах
            if number < 1000:
                number *= 1000
            return number, None, currency
        
        return None, None, currency
    
    def _detect_remote_type(self, location: str) -> Optional[str]:
        """Определение типа удаленной работы"""
        location_lower = location.lower()
        
        if 'удаленно' in location_lower or 'remote' in location_lower:
            return 'remote'
        elif 'гибрид' in location_lower or 'hybrid' in location_lower:
            return 'hybrid'
        else:
            return 'office'
    
    def _extract_vacancy_id(self, url: str) -> str:
        """Извлечение ID вакансии из URL"""
        match = re.search(r'/vacancies/(\d+)', url)
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
        """Основной метод парсинга вакансий с Habr Career"""
        
        self.logger.info(f"Starting Habr Career parsing: query='{query}', pages={pages}, details={extract_details}")
        
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
        
        self.logger.info(f"Habr Career parsing completed. Total: {len(all_vacancies)} vacancies")
        return all_vacancies


def main():
    """Тестирование парсера"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    parser = EnhancedHabrParser()
    
    try:
        vacancies = parser.parse_vacancies(
            query='дизайнер',
            pages=2,
            extract_details=True
        )
        
        print(f"\n=== РЕЗУЛЬТАТЫ HABR ===")
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
