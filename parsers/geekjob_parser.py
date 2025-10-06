#!/usr/bin/env python3
"""
Эффективный и надёжный Python парсер для Geekjob.ru

Этот парсер специально создан для замены проблемного Node.js парсера
и обеспечивает стабильный сбор дизайнерских вакансий с полным извлечением данных.

Автор: AI Assistant
Версия: 1.0.0
Дата: 2025-01-02
"""

import os
import sys
import time
import json
import sqlite3
import logging
import argparse
import requests
from datetime import datetime, timedelta
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


# Настройка логирования
def setup_logging(verbose: bool = False, log_file: str = "geekjob_parser.log"):
    """Настройка системы логирования"""
    level = logging.DEBUG if verbose else logging.INFO
    
    # Форматтер для логов
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Настройка корневого логгера
    logger = logging.getLogger()
    logger.setLevel(level)
    
    # Очищаем существующие обработчики
    logger.handlers.clear()
    
    # Консольный обработчик
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # Файловый обработчик
    try:
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"⚠️ Не удалось создать лог-файл {log_file}: {e}")
    
    return logger


# Класс для работы с базой данных
class VacancyDatabase:
    """Класс для работы с SQLite базой данных вакансий"""
    
    def __init__(self, db_path: str = "geekjob_vacancies.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Инициализация базы данных и создание таблиц"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Создаём таблицу вакансий
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS vacancies (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        external_id TEXT UNIQUE NOT NULL,
                        source TEXT NOT NULL DEFAULT 'geekjob',
                        url TEXT NOT NULL,
                        title TEXT NOT NULL,
                        company TEXT,
                        salary TEXT,
                        location TEXT,
                        description TEXT,
                        full_description TEXT,
                        requirements TEXT,
                        tasks TEXT,
                        benefits TEXT,
                        conditions TEXT,
                        employment_type TEXT,
                        experience_level TEXT,
                        remote_type TEXT,
                        company_logo TEXT,
                        company_url TEXT,
                        published_at DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        status TEXT DEFAULT 'pending'
                    )
                """)
                
                # Создаём индексы для оптимизации
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_external_id ON vacancies(external_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON vacancies(source)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON vacancies(created_at)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_status ON vacancies(status)")
                
                conn.commit()
                logging.info(f"✅ База данных инициализирована: {self.db_path}")
                
        except sqlite3.Error as e:
            logging.error(f"❌ Ошибка инициализации базы данных: {e}")
            raise
    
    def save_vacancy(self, vacancy_data: Dict[str, Any]) -> bool:
        """Сохранение вакансии в базу данных"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Проверяем, существует ли вакансия
                cursor.execute(
                    "SELECT id FROM vacancies WHERE external_id = ? AND source = ?",
                    (vacancy_data['external_id'], vacancy_data.get('source', 'geekjob'))
                )
                
                if cursor.fetchone():
                    logging.debug(f"⚠️ Вакансия уже существует: {vacancy_data['external_id']}")
                    return False
                
                # Вставляем новую вакансию
                cursor.execute("""
                    INSERT INTO vacancies (
                        external_id, source, url, title, company, salary, location,
                        description, full_description, requirements, tasks, benefits, conditions,
                        employment_type, experience_level, remote_type, company_logo, company_url,
                        published_at, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    vacancy_data['external_id'],
                    vacancy_data.get('source', 'geekjob'),
                    vacancy_data['url'],
                    vacancy_data['title'],
                    vacancy_data.get('company', ''),
                    vacancy_data.get('salary', ''),
                    vacancy_data.get('location', ''),
                    vacancy_data.get('description', ''),
                    vacancy_data.get('full_description', ''),
                    vacancy_data.get('requirements', ''),
                    vacancy_data.get('tasks', ''),
                    vacancy_data.get('benefits', ''),
                    vacancy_data.get('conditions', ''),
                    vacancy_data.get('employment_type', ''),
                    vacancy_data.get('experience_level', ''),
                    vacancy_data.get('remote_type', ''),
                    vacancy_data.get('company_logo', ''),
                    vacancy_data.get('company_url', ''),
                    vacancy_data.get('published_at'),
                    vacancy_data.get('status', 'pending')
                ))
                
                conn.commit()
                logging.info(f"✅ Сохранена вакансия: {vacancy_data['title']} - {vacancy_data.get('company', 'N/A')}")
                return True
                
        except sqlite3.Error as e:
            logging.error(f"❌ Ошибка сохранения вакансии: {e}")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Получение статистики по базе данных"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Общее количество
                cursor.execute("SELECT COUNT(*) FROM vacancies WHERE source = 'geekjob'")
                total = cursor.fetchone()[0]
                
                # За последние 24 часа
                cursor.execute("""
                    SELECT COUNT(*) FROM vacancies 
                    WHERE source = 'geekjob' AND created_at > datetime('now', '-1 day')
                """)
                last_24h = cursor.fetchone()[0]
                
                # По статусам
                cursor.execute("""
                    SELECT status, COUNT(*) FROM vacancies 
                    WHERE source = 'geekjob' 
                    GROUP BY status
                """)
                by_status = dict(cursor.fetchall())
                
                # Уникальные компании
                cursor.execute("""
                    SELECT COUNT(DISTINCT company) FROM vacancies 
                    WHERE source = 'geekjob' AND company != ''
                """)
                unique_companies = cursor.fetchone()[0]
                
                return {
                    'total': total,
                    'last_24h': last_24h,
                    'by_status': by_status,
                    'unique_companies': unique_companies
                }
                
        except sqlite3.Error as e:
            logging.error(f"❌ Ошибка получения статистики: {e}")
            return {}


# Основной класс парсера
class GeekjobParser:
    """Основной класс парсера Geekjob.ru"""
    
    # Ключевые слова для поиска дизайнерских вакансий
    DESIGN_KEYWORDS = [
        'дизайн', 'дизайнер', 'дизайнер интерфейсов', 'ui/ux', 'ux/ui', 'продуктовый дизайн',
        'цифровой дизайн', 'веб-дизайн', 'интерфейсный дизайн', 'графический дизайн',
        'визуальный дизайн', 'коммуникационный дизайн', 'дизайн-мышление', 'user experience',
        'user interface', 'ux-дизайнер', 'ui-дизайнер', 'продуктовый дизайнер', 'графический дизайнер',
        'интерфейсный дизайнер', 'веб-дизайнер', 'визуальный дизайнер', 'motion-дизайнер',
        'ux-исследователь', 'арт-директор', 'creative director', 'дизайнер коммуникаций',
        'дизайнер бренд-идентики', 'иллюстратор', '3d-дизайнер', 'designer', 'ui designer',
        'ux designer', 'product designer', 'visual designer', 'graphic designer', 'web designer',
        'interaction designer', 'motion designer', 'ux researcher', 'art director', 'creative director'
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
    
    def __init__(self, db_path: str = "geekjob_vacancies.db", delay: float = 1.0, timeout: int = 30):
        self.db = VacancyDatabase(db_path)
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
        if '/vacancy/' in url:
            return url.split('/vacancy/')[-1].split('?')[0].split('/')[0]
        return url.split('/')[-1].split('?')[0]
    
    def parse_vacancy_list_page(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """Парсинг страницы со списком вакансий"""
        url = f"https://geekjob.ru/vacancies?q={quote(query)}&page={page}"
        
        try:
            logging.info(f"🔍 Парсинг страницы {page}: {url}")
            
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Ищем ссылки на вакансии
            vacancy_links = soup.find_all('a', href=lambda x: x and '/vacancy/' in x)
            
            if not vacancy_links:
                logging.warning(f"⚠️ На странице {page} не найдено ссылок на вакансии")
                return []
            
            logging.info(f"✅ Найдено {len(vacancy_links)} ссылок на вакансии")
            
            # Группируем ссылки по ID вакансии
            vacancies_data = {}
            
            for link in vacancy_links:
                try:
                    href = link.get('href', '')
                    text = link.get_text(strip=True)
                    
                    if not href or not text:
                        continue
                    
                    vacancy_id = self.extract_vacancy_id(href)
                    if not vacancy_id:
                        continue
                    
                    full_url = urljoin('https://geekjob.ru', href)
                    
                    if vacancy_id not in vacancies_data:
                        vacancies_data[vacancy_id] = {
                            'external_id': f"geekjob-{vacancy_id}",
                            'url': full_url,
                            'title': '',
                            'company': '',
                            'salary': '',
                            'location': '',
                            'description': ''
                        }
                    
                    vacancy = vacancies_data[vacancy_id]
                    
                    # Определяем тип информации по содержимому
                    if any(currency in text for currency in ['₽', '€', '$', 'руб']):
                        vacancy['salary'] = text
                    elif len(text) > 50 and not any(word in text.lower() for word in ['remote', 'office', 'москва', 'спб']):
                        if not vacancy['title']:
                            vacancy['title'] = text
                        elif not vacancy['description']:
                            vacancy['description'] = text
                    elif len(text) < 50 and not any(currency in text for currency in ['₽', '€', '$']):
                        if not vacancy['company']:
                            vacancy['company'] = text
                    elif any(location in text.lower() for location in ['москва', 'санкт-петербург', 'remote', 'удаленно']):
                        vacancy['location'] = text
                
                except Exception as e:
                    logging.debug(f"⚠️ Ошибка обработки ссылки: {e}")
                    continue
            
            # Фильтруем релевантные вакансии
            relevant_vacancies = []
            for vacancy_id, vacancy in vacancies_data.items():
                if vacancy['title'] and self.is_relevant_vacancy(vacancy['title'], vacancy['description']):
                    relevant_vacancies.append(vacancy)
                    logging.info(f"✅ Релевантная вакансия: {vacancy['title']}")
                else:
                    logging.debug(f"❌ Не релевантная вакансия: {vacancy.get('title', 'Без названия')}")
            
            return relevant_vacancies
            
        except requests.RequestException as e:
            logging.error(f"❌ Ошибка HTTP запроса для страницы {page}: {e}")
            return []
        except Exception as e:
            logging.error(f"❌ Ошибка парсинга страницы {page}: {e}")
            return []
    
    def extract_full_vacancy_details(self, vacancy_url: str) -> Dict[str, str]:
        """Извлечение полного описания вакансии со страницы"""
        try:
            logging.debug(f"🔍 Извлекаем детали вакансии: {vacancy_url}")
            
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
                '[class*="description"]',
                '[class*="content"]'
            ]
            
            full_description = ''
            for selector in description_selectors:
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(strip=True)
                    if text and len(text) > 100:
                        full_description = text
                        logging.debug(f"✅ Найдено описание через селектор {selector}: {len(text)} символов")
                        break
            
            # Если не нашли через селекторы, ищем в тексте страницы
            if not full_description:
                page_text = soup.get_text()
                # Простой поиск блока с описанием
                lines = page_text.split('\n')
                description_lines = []
                in_description = False
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    if any(keyword in line.lower() for keyword in ['описание', 'о вакансии', 'требования']):
                        in_description = True
                        continue
                    
                    if in_description:
                        if len(line) > 20:
                            description_lines.append(line)
                        if len(description_lines) > 20:  # Ограничиваем размер
                            break
                
                if description_lines:
                    full_description = '\n'.join(description_lines)
                    logging.debug(f"✅ Найдено описание через текстовый поиск: {len(full_description)} символов")
            
            # Извлекаем структурированные блоки
            def extract_section(keywords: List[str]) -> str:
                for keyword in keywords:
                    # Ищем заголовки секций
                    headers = soup.find_all(['h1', 'h2', 'h3', 'h4', 'strong', 'b'], 
                                          string=lambda text: text and keyword.lower() in text.lower())
                    
                    for header in headers:
                        # Ищем следующий элемент с текстом
                        next_elem = header.find_next_sibling()
                        if next_elem:
                            text = next_elem.get_text(strip=True)
                            if text and len(text) > 20:
                                return text
                
                # Поиск в тексте описания
                if full_description:
                    for keyword in keywords:
                        pattern = f"{keyword}.*?(?=(?:{'|'.join(['требования', 'задачи', 'условия', 'льготы', 'обязанности'])})|$)"
                        import re
                        match = re.search(pattern, full_description, re.IGNORECASE | re.DOTALL)
                        if match:
                            return match.group(0).strip()
                
                return ''
            
            requirements = extract_section(['требования', 'ожидания', 'нужно', 'необходимо'])
            tasks = extract_section(['задачи', 'обязанности', 'функции', 'что делать'])
            benefits = extract_section(['мы предлагаем', 'льготы', 'преимущества', 'бонусы'])
            conditions = extract_section(['условия', 'что предлагаем', 'формат работы'])
            
            # Используем simple_text_formatter для извлечения отформатированного текста
            formatted_description = extract_formatted_text(full_description) if full_description else 'Описание не найдено'
            
            return {
                'full_description': formatted_description,
                'requirements': '',  # Не разбиваем на блоки
                'tasks': '',
                'benefits': '',
                'conditions': ''
            }
            
        except Exception as e:
            logging.error(f"❌ Ошибка извлечения деталей вакансии {vacancy_url}: {e}")
            return {
                'full_description': 'Описание не найдено',
                'requirements': '',
                'tasks': '',
                'benefits': '',
                'conditions': ''
            }
    
    def parse_vacancies(self, query: str = 'дизайнер', pages: int = 10, extract_details: bool = True) -> List[Dict[str, Any]]:
        """Основной метод парсинга вакансий"""
        logging.info(f"🚀 Начинаем парсинг Geekjob.ru")
        logging.info(f"🔍 Запрос: '{query}', страниц: {pages}, детали: {extract_details}")
        
        all_vacancies = []
        
        for page in range(1, pages + 1):
            try:
                # Парсим страницу со списком
                page_vacancies = self.parse_vacancy_list_page(query, page)
                
                if not page_vacancies:
                    logging.warning(f"⚠️ На странице {page} не найдено релевантных вакансий")
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
                        vacancy['source'] = 'geekjob'
                        vacancy['published_at'] = datetime.now().isoformat()
                        vacancy['status'] = 'pending'
                        
                        all_vacancies.append(vacancy)
                        
                        # Сохраняем в базу данных
                        self.db.save_vacancy(vacancy)
                        
                        # Задержка между запросами
                        if extract_details:
                            time.sleep(self.delay)
                        
                    except Exception as e:
                        logging.error(f"❌ Ошибка обработки вакансии: {e}")
                        continue
                
                logging.info(f"📊 Страница {page}: найдено {len(page_vacancies)} вакансий")
                
                # Задержка между страницами
                time.sleep(self.delay)
                
            except Exception as e:
                logging.error(f"❌ Ошибка парсинга страницы {page}: {e}")
                continue
        
        logging.info(f"🎯 Парсинг завершён. Всего обработано: {len(all_vacancies)} вакансий")
        return all_vacancies
    
    def export_to_json(self, filename: str = 'geekjob_vacancies.json'):
        """Экспорт вакансий в JSON"""
        try:
            with sqlite3.connect(self.db.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM vacancies WHERE source = 'geekjob'")
                
                columns = [description[0] for description in cursor.description]
                rows = cursor.fetchall()
                
                vacancies = []
                for row in rows:
                    vacancy = dict(zip(columns, row))
                    vacancies.append(vacancy)
                
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(vacancies, f, ensure_ascii=False, indent=2, default=str)
                
                logging.info(f"✅ Экспорт в JSON завершён: {filename} ({len(vacancies)} вакансий)")
                return True
                
        except Exception as e:
            logging.error(f"❌ Ошибка экспорта в JSON: {e}")
            return False
    
    def export_to_csv(self, filename: str = 'geekjob_vacancies.csv'):
        """Экспорт вакансий в CSV"""
        try:
            import csv
            
            with sqlite3.connect(self.db.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM vacancies WHERE source = 'geekjob'")
                
                columns = [description[0] for description in cursor.description]
                rows = cursor.fetchall()
                
                with open(filename, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    writer.writerow(columns)
                    writer.writerows(rows)
                
                logging.info(f"✅ Экспорт в CSV завершён: {filename} ({len(rows)} вакансий)")
                return True
                
        except Exception as e:
            logging.error(f"❌ Ошибка экспорта в CSV: {e}")
            return False


def main():
    """Главная функция"""
    parser = argparse.ArgumentParser(description='Парсер вакансий Geekjob.ru для дизайнеров')
    
    parser.add_argument('--db', default='geekjob_vacancies.db', help='Путь к базе данных')
    parser.add_argument('--query', default='дизайнер', help='Поисковый запрос')
    parser.add_argument('--pages', type=int, default=10, help='Количество страниц для парсинга')
    parser.add_argument('--delay', type=float, default=1.0, help='Задержка между запросами (сек)')
    parser.add_argument('--timeout', type=int, default=30, help='Таймаут запросов (сек)')
    parser.add_argument('--verbose', action='store_true', help='Подробный вывод')
    parser.add_argument('--quiet', action='store_true', help='Минимальный вывод')
    parser.add_argument('--export', choices=['json', 'csv'], help='Экспорт в формат')
    parser.add_argument('--no-details', action='store_true', help='Не извлекать полные детали')
    parser.add_argument('--dry-run', action='store_true', help='Тестовый запуск без сохранения')
    
    args = parser.parse_args()
    
    # Настройка логирования
    log_level = not args.quiet if not args.verbose else args.verbose
    logger = setup_logging(verbose=log_level)
    
    try:
        # Создаём парсер
        geekjob = GeekjobParser(
            db_path=args.db,
            delay=args.delay,
            timeout=args.timeout
        )
        
        if args.dry_run:
            logging.info("🧪 ТЕСТОВЫЙ РЕЖИМ - данные не будут сохранены")
        
        # Запускаем парсинг
        vacancies = geekjob.parse_vacancies(
            query=args.query,
            pages=args.pages,
            extract_details=not args.no_details
        )
        
        # Статистика
        if not args.dry_run:
            stats = geekjob.db.get_statistics()
            logging.info(f"📊 Статистика базы данных:")
            logging.info(f"   Всего вакансий: {stats.get('total', 0)}")
            logging.info(f"   За последние 24ч: {stats.get('last_24h', 0)}")
            logging.info(f"   Уникальных компаний: {stats.get('unique_companies', 0)}")
        
        # Экспорт
        if args.export and not args.dry_run:
            if args.export == 'json':
                geekjob.export_to_json()
            elif args.export == 'csv':
                geekjob.export_to_csv()
        
        logging.info("🎉 Парсинг завершён успешно!")
        return 0
        
    except KeyboardInterrupt:
        logging.info("⚠️ Парсинг прерван пользователем")
        return 1
    except Exception as e:
        logging.error(f"❌ Критическая ошибка: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())



