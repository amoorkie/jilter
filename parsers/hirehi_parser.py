#!/usr/bin/env python3
"""
HireHi парсер на Python для дизайнерских вакансий

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
    from anti_detection_system import AntiDetectionSystem, RequestMethod
    from blocking_monitor import log_blocking_event, log_success_event
    from hirehi_bypass import get_hirehi_page, test_hirehi_access
    from playwright_bypass import get_page_with_playwright_sync
except ImportError:
    # Fallback для случая, когда модуль запускается напрямую
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from simple_text_formatter import extract_formatted_text, clean_text
    from text_cleaner import clean_vacancy_data
    try:
        from anti_detection_system import AntiDetectionSystem, RequestMethod
        from blocking_monitor import log_blocking_event, log_success_event
        from hirehi_bypass import get_hirehi_page, test_hirehi_access
        from playwright_bypass import get_page_with_playwright_sync
    except ImportError:
        AntiDetectionSystem = None
        RequestMethod = None
        log_blocking_event = None
        log_success_event = None
        get_hirehi_page = None
        test_hirehi_access = None
        get_page_with_playwright_sync = None


class HireHiParser:
    """Парсер для HireHi.com"""
    
    # Ключевые слова для поиска дизайнерских вакансий
    DESIGN_KEYWORDS = [
        'дизайн', 'дизайнер', 'дизайнер интерфейсов', 'ui/ux', 'ux/ui', 'продуктовый дизайн',
        'цифровой дизайн', 'веб-дизайн', 'интерфейсный дизайн', 'графический дизайн',
        'визуальный дизайн', 'коммуникационный дизайн', 'user experience',
        'user interface', 'ux-дизайнер', 'ui-дизайнер', 'продуктовый дизайнер',
        'designer', 'ui designer', 'ux designer', 'product designer', 'visual designer'
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
        
        # Инициализируем антидетект систему
        if AntiDetectionSystem:
            self.anti_detection = AntiDetectionSystem()
            logging.info("🛡️ Антидетект система инициализирована для HireHi")
        else:
            self.anti_detection = None
            logging.warning("⚠️ Антидетект система недоступна для HireHi")
        
    def _create_session(self) -> requests.Session:
        """Создание HTTP сессии с настройками"""
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
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
        if '/job/' in url:
            return url.split('/job/')[-1].split('?')[0].split('/')[0]
        elif '/vacancy/' in url:
            return url.split('/vacancy/')[-1].split('?')[0].split('/')[0]
        return url.split('/')[-1].split('?')[0]
    
    def parse_vacancy_list_page(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """Парсинг страницы со списком вакансий HireHi"""
        url = f"https://hirehi.com/jobs?q={quote(query)}&page={page}"
        
        try:
            logging.info(f"Парсинг HireHi страницы {page}: {url}")
            
            # Используем Playwright как основной метод (самый эффективный)
            if get_page_with_playwright_sync:
                logging.info("🎭 Используем Playwright с полной эмуляцией браузера")
                html = get_page_with_playwright_sync(url)
                
                if html:
                    soup = BeautifulSoup(html, 'html.parser')
                    logging.info("✅ Успешный запрос через Playwright")
                    
                    # Логируем успех
                    if log_success_event:
                        log_success_event('hirehi', 3.0)  # Примерное время для Playwright
                else:
                    logging.warning("⚠️ Playwright не смог получить страницу, пробуем специальный модуль")
                    # Fallback на специальный модуль обхода
                    if get_hirehi_page:
                        response = get_hirehi_page(url)
                        
                        if response and response.status_code == 200:
                            soup = BeautifulSoup(response.content, 'html.parser')
                            logging.info("✅ Успешный запрос через специальный модуль обхода")
                            
                            # Логируем успех
                            if log_success_event:
                                log_success_event('hirehi', response.elapsed.total_seconds())
                        else:
                            logging.warning("⚠️ Специальный модуль обхода тоже не смог получить страницу")
                            # Fallback на обычный запрос
                            try:
                                response = self.session.get(url, timeout=self.timeout)
                                if response.status_code == 200:
                                    soup = BeautifulSoup(response.content, 'html.parser')
                                    logging.info("✅ Успешный fallback запрос")
                                    
                                    # Логируем успех
                                    if log_success_event:
                                        log_success_event('hirehi', response.elapsed.total_seconds())
                                else:
                                    raise requests.RequestException(f"HTTP {response.status_code}")
                            except requests.RequestException as e:
                                logging.error(f"❌ Все методы запроса не удались: {e}")
                                # Логируем блокировку
                                if log_blocking_event:
                                    log_blocking_event('hirehi', url, getattr(e.response, 'status_code', 0) if hasattr(e, 'response') else 0, 
                                                     str(e), self.session.headers.get('User-Agent', 'Unknown'))
                                return []
                    else:
                        logging.error("❌ Все модули обхода недоступны")
                        return []
            else:
                # Playwright недоступен, используем специальный модуль
                logging.warning("⚠️ Playwright недоступен, используем специальный модуль обхода")
                if get_hirehi_page:
                    response = get_hirehi_page(url)
                    
                    if response and response.status_code == 200:
                        soup = BeautifulSoup(response.content, 'html.parser')
                        logging.info("✅ Успешный запрос через специальный модуль обхода")
                        
                        # Логируем успех
                        if log_success_event:
                            log_success_event('hirehi', response.elapsed.total_seconds())
                    else:
                        logging.warning("⚠️ Специальный модуль обхода не смог получить страницу")
                        # Fallback на обычный запрос
                        try:
                            response = self.session.get(url, timeout=self.timeout)
                            response.raise_for_status()
                            soup = BeautifulSoup(response.content, 'html.parser')
                            
                            # Логируем успех
                            if log_success_event:
                                log_success_event('hirehi', response.elapsed.total_seconds())
                                
                        except requests.RequestException as e:
                            logging.warning(f"Обычный запрос не удался: {e}")
                            # Логируем блокировку
                            if log_blocking_event:
                                log_blocking_event('hirehi', url, getattr(e.response, 'status_code', 0) if hasattr(e, 'response') else 0, 
                                                 str(e), self.session.headers.get('User-Agent', 'Unknown'))
                            return []
                else:
                    logging.error("❌ Все модули обхода недоступны")
                    return []
            
            # Ищем вакансии по различным селекторам
            vacancy_selectors = [
                'div.job-card',
                'div.vacancy-card',
                'article.job-item',
                'div[data-testid="job-card"]',
                'a[href*="/job/"]',
                'a[href*="/vacancy/"]'
            ]
            
            vacancies_found = []
            for selector in vacancy_selectors:
                vacancies_found = soup.select(selector)
                if vacancies_found:
                    logging.info(f"Найдено {len(vacancies_found)} элементов через селектор: {selector}")
                    break
            
            if not vacancies_found:
                # Попробуем найти любые ссылки на вакансии
                job_links = soup.find_all('a', href=lambda x: x and ('/job/' in x or '/vacancy/' in x))
                if job_links:
                    logging.info(f"Найдено {len(job_links)} ссылок на вакансии")
                    vacancies_found = job_links
                else:
                    logging.warning(f"На странице {page} не найдено вакансий")
                    return []
            
            parsed_vacancies = []
            processed_urls = set()  # Для избежания дубликатов
            
            for vacancy_elem in vacancies_found:
                try:
                    # Если это ссылка, извлекаем данные из неё
                    if vacancy_elem.name == 'a':
                        title = vacancy_elem.get_text(strip=True)
                        url = vacancy_elem.get('href', '')
                        
                        if not title or not url:
                            continue
                        
                        # Ищем дополнительную информацию в родительском элементе
                        parent = vacancy_elem.find_parent()
                        company = ''
                        salary = ''
                        location = ''
                        description = ''
                        
                        if parent:
                            # Ищем компанию
                            company_elem = parent.find(['span', 'div', 'p'], string=lambda x: x and len(x) < 100)
                            if company_elem and company_elem != vacancy_elem:
                                company = company_elem.get_text(strip=True)
                            
                            # Ищем зарплату
                            salary_text = parent.get_text()
                            if any(currency in salary_text for currency in ['$', '€', '₽', 'USD', 'EUR', 'RUB']):
                                # Извлекаем зарплату регулярным выражением
                                import re
                                salary_match = re.search(r'[\d\s,]+\s*[$€₽]|[$€₽]\s*[\d\s,]+|\d+\s*(USD|EUR|RUB)', salary_text)
                                if salary_match:
                                    salary = salary_match.group(0).strip()
                    
                    else:
                        # Если это карточка вакансии, ищем ссылку внутри
                        title_elem = vacancy_elem.find('a', href=lambda x: x and ('/job/' in x or '/vacancy/' in x))
                        if not title_elem:
                            # Ищем заголовок по другим селекторам
                            title_elem = vacancy_elem.find(['h1', 'h2', 'h3', 'h4'])
                            if title_elem:
                                # Ищем ссылку рядом
                                link_elem = vacancy_elem.find('a', href=True)
                                if link_elem:
                                    title = title_elem.get_text(strip=True)
                                    url = link_elem.get('href', '')
                                else:
                                    continue
                            else:
                                continue
                        else:
                            title = title_elem.get_text(strip=True)
                            url = title_elem.get('href', '')
                        
                        if not title or not url:
                            continue
                        
                        # Извлекаем компанию
                        company_selectors = [
                            '.company-name',
                            '.job-company',
                            '.vacancy-company',
                            '[data-testid="company-name"]'
                        ]
                        
                        company = 'Компания не указана'
                        for company_selector in company_selectors:
                            company_elem = vacancy_elem.select_one(company_selector)
                            if company_elem:
                                company = company_elem.get_text(strip=True)
                                break
                        
                        # Извлекаем зарплату
                        salary_selectors = [
                            '.salary',
                            '.job-salary',
                            '.vacancy-salary',
                            '[data-testid="salary"]'
                        ]
                        
                        salary = 'Не указана'
                        for salary_selector in salary_selectors:
                            salary_elem = vacancy_elem.select_one(salary_selector)
                            if salary_elem:
                                salary = salary_elem.get_text(strip=True)
                                break
                        
                        # Извлекаем описание
                        description_selectors = [
                            '.job-description',
                            '.vacancy-description',
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
                            '.location',
                            '.job-location',
                            '.vacancy-location',
                            '[data-testid="location"]'
                        ]
                        
                        location = ''
                        for location_selector in location_selectors:
                            location_elem = vacancy_elem.select_one(location_selector)
                            if location_elem:
                                location = location_elem.get_text(strip=True)
                                break
                    
                    # Проверяем релевантность
                    if not self.is_relevant_vacancy(title, description):
                        logging.debug(f"Не релевантная вакансия: {title}")
                        continue
                    
                    # Полный URL
                    full_url = urljoin('https://hirehi.com', url)
                    
                    # Проверяем на дубликаты
                    if full_url in processed_urls:
                        continue
                    processed_urls.add(full_url)
                    
                    vacancy_id = self.extract_vacancy_id(full_url)
                    
                    vacancy_data = {
                        'external_id': f"hirehi-{vacancy_id}",
                        'url': full_url,
                        'title': title,
                        'company': company,
                        'salary': salary,
                        'location': location,
                        'description': description,
                        'source': 'hirehi'
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
        """Извлечение полного описания вакансии со страницы HireHi"""
        try:
            logging.debug(f"Извлекаем детали вакансии: {vacancy_url}")
            
            response = self.session.get(vacancy_url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Ищем основной блок с описанием
            description_selectors = [
                '.job-description',
                '.vacancy-description',
                '.description',
                '.job-content',
                '.vacancy-content',
                '[data-testid="job-description"]',
                '.content'
            ]
            
            description_element = None
            
            for selector in description_selectors:
                element = soup.select_one(selector)
                if element:
                    description_element = element
                    logging.debug(f"Найден блок описания через селектор {selector}")
                    break
            
            # Если не нашли через селекторы, берём весь текст страницы
            if not description_element:
                body = soup.find('body')
                if body:
                    description_element = body
                    logging.debug("Используем весь текст страницы")
            
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
        """Основной метод парсинга вакансий HireHi"""
        logging.info(f"Начинаем парсинг HireHi")
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
        
        logging.info(f"HireHi парсинг завершён. Всего обработано: {len(all_vacancies)} вакансий")
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
            logging.FileHandler('hirehi_parser.log', encoding='utf-8')
        ]
    )
    
    parser = argparse.ArgumentParser(description='HireHi парсер для дизайнерских вакансий')
    parser.add_argument('--query', default='дизайнер', help='Поисковый запрос')
    parser.add_argument('--pages', type=int, default=3, help='Количество страниц')
    parser.add_argument('--delay', type=float, default=1.0, help='Задержка между запросами')
    parser.add_argument('--no-details', action='store_true', help='Не извлекать полные детали')
    
    args = parser.parse_args()
    
    try:
        hirehi_parser = HireHiParser(delay=args.delay)
        vacancies = hirehi_parser.parse_vacancies(
            query=args.query,
            pages=args.pages,
            extract_details=not args.no_details
        )
        
        print(f"\nНайдено {len(vacancies)} дизайнерских вакансий на HireHi:")
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
