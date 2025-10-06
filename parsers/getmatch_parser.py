#!/usr/bin/env python3
"""
GetMatch парсер на Python для дизайнерских вакансий

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
    from text_cleaner import clean_vacancy_data
except ImportError:
    # Fallback для случая, когда модуль запускается напрямую
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from simple_text_formatter import extract_formatted_text, clean_text
    from text_cleaner import clean_vacancy_data


class GetMatchParser:
    """Парсер для GetMatch.ru"""
    
    # Ключевые слова для поиска дизайнерских вакансий
    DESIGN_KEYWORDS = [
        'дизайн', 'дизайнер', 'дизайнер интерфейсов', 'ui/ux', 'ux/ui', 'продуктовый дизайн',
        'цифровой дизайн', 'веб-дизайн', 'интерфейсный дизайн', 'графический дизайн',
        'визуальный дизайн', 'коммуникационный дизайн', 'user experience',
        'user interface', 'ux-дизайнер', 'ui-дизайнер', 'продуктовый дизайнер',
        'designer', 'ui designer', 'ux designer', 'product designer', 'visual designer',
        'motion дизайн', 'арт-директор', 'creative director', '3d дизайн'
    ]
    
    # Исключения - нерелевантные типы дизайна
    EXCLUDED_KEYWORDS = [
        'текстиль', 'текстильный', 'ткань', 'одежда', 'мода', 'fashion',
        'ювелирный', 'ювелир', 'украшения', 'бижутерия',
        'мебель', 'интерьер', 'декор', 'ландшафт', 'садовый',
        'промышленный', 'машиностроение', 'автомобильный',
        'упаковка', 'полиграфия', 'печать', 'типография',
        'архитектурный', 'строительный', 'реставрация',
        'косметический', 'парикмахер', 'маникюр', 'педикюр',
        'кулинарный', 'кондитер', 'повар', 'шеф-повар',
        'флористика', 'цветы', 'букет', 'свадебный',
        'тату', 'татуировка', 'пирсинг', 'боди-арт',
        'фотограф', 'фото', 'видео', 'монтаж',
        'звук', 'аудио', 'музыка', 'композитор',
        'танцы', 'хореограф', 'балет', 'современный танец',
        'актер', 'актриса', 'театр', 'кино',
        'писатель', 'журналист', 'копирайтер', 'редактор',
        'переводчик', 'лингвист', 'филолог',
        'психолог', 'психотерапевт', 'коуч',
        'тренер', 'фитнес', 'йога', 'пилатес',
        'массаж', 'массажист', 'спа', 'салон',
        'продавец', 'консультант', 'менеджер по продажам',
        'водитель', 'курьер', 'логист', 'склад',
        'охрана', 'охранник', 'секретарь', 'администратор',
        'уборщик', 'уборщица', 'дворник', 'садовник',
        'электрик', 'сантехник', 'слесарь', 'механик',
        'сварщик', 'токарь', 'фрезеровщик', 'слесарь-сборщик',
        'маляр', 'штукатур', 'плиточник', 'каменщик',
        'столяр', 'плотник', 'краснодеревщик', 'мебельщик',
        'швея', 'портной', 'закройщик', 'модельер',
        'обувщик', 'сапожник', 'кожевник', 'скорняк',
        'ювелир', 'гравер', 'чеканщик', 'литейщик',
        'стеклодув', 'керамист', 'гончар', 'скульптор',
        'художник', 'живописец', 'график', 'иллюстратор',
        'каллиграф', 'шрифтовик', 'типограф', 'печатник',
        'переплетчик', 'реставратор книг', 'библиотекарь',
        'архивариус', 'музейный работник', 'экскурсовод',
        'гид', 'переводчик-гид', 'туристический агент',
        'менеджер по туризму', 'организатор мероприятий',
        'декоратор', 'оформитель', 'витринист', 'мерчандайзер',
        'дизайнер одежды', 'модельер', 'стилист', 'имиджмейкер',
        'визажист', 'гример', 'парикмахер-стилист',
        'мастер маникюра', 'мастер педикюра', 'косметолог',
        'массажист', 'мастер по массажу', 'рефлексотерапевт',
        'ароматерапевт', 'эстетист', 'мастер по наращиванию',
        'мастер по татуажу', 'мастер по микроблейдингу',
        'мастер по ламинированию', 'мастер по лашмейкингу',
        'мастер по перманентному макияжу', 'мастер по бровям',
        'мастер по ресницам', 'лашмейкер', 'бровист',
        'мастер по ногтям', 'нейл-мастер', 'мастер по маникюру',
        'мастер по педикюру', 'подолог', 'мастер по стопам',
        'мастер по телу', 'мастер по лицу', 'эстетист',
        'косметолог-эстетист', 'дерматолог', 'трихолог',
        'мастер по волосам', 'колорист', 'мастер по окрашиванию',
        'мастер по стрижке', 'барбер', 'мастер по бороде',
        'мастер по усам', 'мастер по бритью', 'мастер по уходу',
        'мастер по укладке', 'мастер по прическам', 'стилист-парикмахер',
        'мастер по наращиванию волос', 'мастер по плетению',
        'мастер по афрокосичкам', 'мастер по дредам',
        'мастер по локонам', 'мастер по завивке', 'мастер по выпрямлению',
        'мастер по кератиновому выпрямлению', 'мастер по ботоксу',
        'мастер по филлерам', 'мастер по мезотерапии',
        'мастер по биоревитализации', 'мастер по плазмолифтингу',
        'мастер по карбокситерапии', 'мастер по озонотерапии',
        'мастер по криотерапии', 'мастер по ультразвуку',
        'мастер по радиочастотному лифтингу', 'мастер по лазеру',
        'мастер по фотоомоложению', 'мастер по IPL',
        'мастер по эпиляции', 'мастер по депиляции',
        'мастер по шугарингу', 'мастер по восковой депиляции',
        'мастер по лазерной эпиляции', 'мастер по электроэпиляции',
        'мастер по фотоэпиляции', 'мастер по элос-эпиляции',
        'мастер по SHR-эпиляции', 'мастер по AFT-эпиляции',
        'мастер по диодной эпиляции', 'мастер по александритовой эпиляции',
        'мастер по рубиновой эпиляции', 'мастер по сапфировой эпиляции',
        'мастер по неодимовой эпиляции', 'мастер по эрбиевой эпиляции',
        'мастер по углекислотной эпиляции', 'мастер по оксидной эпиляции',
        'мастер по азотной эпиляции', 'мастер по гелиевой эпиляции',
        'мастер по аргоновой эпиляции', 'мастер по ксеноновой эпиляции',
        'мастер по криптоновой эпиляции', 'мастер по радоновой эпиляции',
        'мастер по ториевой эпиляции', 'мастер по урановой эпиляции',
        'мастер по плутониевой эпиляции', 'мастер по америциевой эпиляции',
        'мастер по кюриевой эпиляции', 'мастер по берклиевой эпиляции',
        'мастер по калифорниевой эпиляции', 'мастер по эйнштейниевой эпиляции',
        'мастер по фермиевой эпиляции', 'мастер по менделевиевой эпиляции',
        'мастер по нобелиевой эпиляции', 'мастер по лоуренсиевой эпиляции',
        'мастер по резерфордиевой эпиляции', 'мастер по дубниевой эпиляции',
        'мастер по сиборгиевой эпиляции', 'мастер по бориевой эпиляции',
        'мастер по хассиевой эпиляции', 'мастер по мейтнериевой эпиляции',
        'мастер по дармштадтиевой эпиляции', 'мастер по рентгениевой эпиляции',
        'мастер по коперницииевой эпиляции', 'мастер по флеровиевой эпиляции',
        'мастер по ливермориевой эпиляции', 'мастер по оганессоновой эпиляции',
        'мастер по теннессиневой эпиляции', 'мастер по московиевой эпиляции'
    ]
    
    def __init__(self, delay: float = 1.0, timeout: int = 30):
        self.delay = delay
        self.timeout = timeout
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
        elif '/job/' in url:
            return url.split('/job/')[-1].split('?')[0].split('/')[0]
        return url.split('/')[-1].split('?')[0]
    
    def parse_vacancy_list_page(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """Парсинг страницы со списком вакансий GetMatch"""
        # GetMatch использует параметры для фильтрации по дизайну
        url = f"https://getmatch.ru/vacancies?q={quote(query)}&page={page}&category=design"
        
        try:
            logging.info(f"Парсинг GetMatch страницы {page}: {url}")
            
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Ищем вакансии по различным селекторам
            vacancy_selectors = [
                'div.vacancy-card',
                'div.job-card',
                'article.vacancy-item',
                'div[data-testid="vacancy-card"]',
                'div.card'
            ]
            
            vacancies_found = []
            for selector in vacancy_selectors:
                vacancies_found = soup.select(selector)
                if vacancies_found:
                    logging.info(f"Найдено {len(vacancies_found)} вакансий через селектор: {selector}")
                    break
            
            if not vacancies_found:
                # Попробуем найти ссылки на вакансии
                vacancy_links = soup.find_all('a', href=lambda x: x and ('/vacancies/' in x or '/job/' in x))
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
                        'a.vacancy-title',
                        'h3 a[href*="/vacancies/"]',
                        'h2 a[href*="/vacancies/"]',
                        'a[href*="/vacancies/"]',
                        'a[href*="/job/"]'
                    ]
                    
                    title_elem = None
                    for title_selector in title_selectors:
                        title_elem = vacancy_elem.select_one(title_selector)
                        if title_elem:
                            break
                    
                    if not title_elem:
                        # Ищем любую ссылку с текстом
                        all_links = vacancy_elem.find_all('a', href=True)
                        for link in all_links:
                            link_text = link.get_text(strip=True)
                            if link_text and len(link_text) > 10:
                                title_elem = link
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
                    full_url = urljoin('https://getmatch.ru', url)
                    
                    # Проверяем на дубликаты
                    if full_url in processed_urls:
                        continue
                    processed_urls.add(full_url)
                    
                    vacancy_id = self.extract_vacancy_id(full_url)
                    
                    # Извлекаем компанию
                    company_selectors = [
                        '.company-name',
                        '.vacancy-company',
                        '.job-company',
                        'a[href*="/companies/"]',
                        '.employer'
                    ]
                    
                    company = 'Компания не указана'
                    for company_selector in company_selectors:
                        company_elem = vacancy_elem.select_one(company_selector)
                        if company_elem:
                            company = company_elem.get_text(strip=True)
                            break
                    
                    # Если не нашли через селекторы, ищем в тексте
                    if company == 'Компания не указана':
                        # Ищем короткие строки, которые могут быть названием компании
                        all_text_elements = vacancy_elem.find_all(text=True)
                        for text_elem in all_text_elements:
                            text = text_elem.strip()
                            if (text and 
                                len(text) < 50 and 
                                len(text) > 3 and 
                                text != title and
                                not any(char.isdigit() for char in text) and
                                not any(currency in text for currency in ['₽', '$', '€'])):
                                company = text
                                break
                    
                    # Извлекаем зарплату
                    salary_selectors = [
                        '.salary',
                        '.vacancy-salary',
                        '.job-salary',
                        '[data-testid="salary"]'
                    ]
                    
                    salary = 'Не указана'
                    for salary_selector in salary_selectors:
                        salary_elem = vacancy_elem.select_one(salary_selector)
                        if salary_elem:
                            salary = salary_elem.get_text(strip=True)
                            break
                    
                    # Если не нашли через селекторы, ищем в тексте
                    if salary == 'Не указана':
                        elem_text = vacancy_elem.get_text()
                        if any(currency in elem_text for currency in ['₽', '$', '€', 'USD', 'EUR', 'RUB']):
                            import re
                            salary_match = re.search(r'[\d\s,]+\s*[₽$€]|[₽$€]\s*[\d\s,]+|\d+\s*(USD|EUR|RUB)', elem_text)
                            if salary_match:
                                salary = salary_match.group(0).strip()
                    
                    # Извлекаем краткое описание
                    description_selectors = [
                        '.vacancy-description',
                        '.job-description',
                        '.description',
                        '.snippet',
                        '.vacancy-snippet'
                    ]
                    
                    description = ''
                    for desc_selector in description_selectors:
                        desc_elem = vacancy_elem.select_one(desc_selector)
                        if desc_elem:
                            description = desc_elem.get_text(strip=True)
                            break
                    
                    # Если не нашли описание, берём длинный текст из элемента
                    if not description:
                        elem_text = vacancy_elem.get_text(strip=True)
                        # Разбиваем на строки и ищем самую длинную (но не заголовок)
                        lines = elem_text.split('\n')
                        for line in lines:
                            line = line.strip()
                            if (line and 
                                len(line) > 50 and 
                                line != title and 
                                line != company):
                                description = line
                                break
                    
                    # Извлекаем локацию
                    location_selectors = [
                        '.location',
                        '.vacancy-location',
                        '.job-location',
                        '[data-testid="location"]'
                    ]
                    
                    location = ''
                    for location_selector in location_selectors:
                        location_elem = vacancy_elem.select_one(location_selector)
                        if location_elem:
                            location = location_elem.get_text(strip=True)
                            break
                    
                    # Если не нашли локацию, ищем в тексте
                    if not location:
                        elem_text = vacancy_elem.get_text().lower()
                        cities = ['москва', 'санкт-петербург', 'спб', 'удаленно', 'remote', 'екатеринбург', 'новосибирск']
                        for city in cities:
                            if city in elem_text:
                                location = city.capitalize()
                                break
                    
                    vacancy_data = {
                        'external_id': f"getmatch-{vacancy_id}",
                        'url': full_url,
                        'title': title,
                        'company': company,
                        'salary': salary,
                        'location': location,
                        'description': description,
                        'source': 'getmatch'
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
    
    def extract_full_vacancy_details(self, vacancy_url: str) -> Dict[str, str]:
        """Извлечение полного описания вакансии со страницы GetMatch"""
        try:
            logging.debug(f"Извлекаем детали вакансии: {vacancy_url}")
            
            response = self.session.get(vacancy_url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Ищем основной блок с описанием
            description_selectors = [
                '.vacancy-description',
                '.job-description',
                '.description',
                '.vacancy-content',
                '.job-content',
                '.content',
                '.main-content'
            ]
            
            description_element = None
            
            for selector in description_selectors:
                element = soup.select_one(selector)
                if element:
                    description_element = element
                    logging.debug(f"Найден блок описания через селектор {selector}")
                    break
            
            # Если не нашли через селекторы, берём основной контент страницы
            if not description_element:
                main_content = soup.find('main') or soup.find('body')
                if main_content:
                    description_element = main_content
                    logging.debug("Используем основной контент страницы")
            
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
        """Основной метод парсинга вакансий GetMatch"""
        logging.info(f"Начинаем парсинг GetMatch")
        logging.info(f"Запрос: '{query}', страниц: {pages}, детали: {extract_details}")
        
        all_vacancies = []
        
        for page in range(1, pages + 1):
            try:
                # Парсим страницу со списком
                page_vacancies = self.parse_vacancy_list_page(query, page)
                
                if not page_vacancies:
                    logging.warning(f"На странице {page} не найдено релевантных вакансий")
                    continue
                
                # Извлекаем детали для каждой вакансии
                for vacancy in page_vacancies:
                    try:
                        if extract_details:
                            details = self.extract_full_vacancy_details(vacancy['url'])
                            vacancy.update(details)
                        
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
        
        logging.info(f"GetMatch парсинг завершён. Всего обработано: {len(all_vacancies)} вакансий")
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
            logging.FileHandler('getmatch_parser.log', encoding='utf-8')
        ]
    )
    
    parser = argparse.ArgumentParser(description='GetMatch парсер для дизайнерских вакансий')
    parser.add_argument('--query', default='дизайнер', help='Поисковый запрос')
    parser.add_argument('--pages', type=int, default=3, help='Количество страниц')
    parser.add_argument('--delay', type=float, default=1.0, help='Задержка между запросами')
    parser.add_argument('--no-details', action='store_true', help='Не извлекать полные детали')
    
    args = parser.parse_args()
    
    try:
        getmatch_parser = GetMatchParser(delay=args.delay)
        vacancies = getmatch_parser.parse_vacancies(
            query=args.query,
            pages=args.pages,
            extract_details=not args.no_details
        )
        
        print(f"\nНайдено {len(vacancies)} дизайнерских вакансий на GetMatch:")
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
