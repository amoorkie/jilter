#!/usr/bin/env python3
"""
Упрощённый парсер Geekjob.ru без эмодзи для Windows

Версия: 1.0.0 (Windows Compatible)
"""

import os
import sys
import time
import json
import sqlite3
import logging
import argparse
import requests
from datetime import datetime
from urllib.parse import urljoin, quote
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Any
try:
    from browser_fetch import get_html
except Exception:
    get_html = None


def setup_logging(verbose: bool = False, log_file: str = "geekjob_parser.log"):
    """Настройка системы логирования"""
    level = logging.DEBUG if verbose else logging.INFO
    
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    logger = logging.getLogger()
    logger.setLevel(level)
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
        print(f"Не удалось создать лог-файл {log_file}: {e}")
    
    return logger


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
                
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_external_id ON vacancies(external_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON vacancies(source)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON vacancies(created_at)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_status ON vacancies(status)")
                
                conn.commit()
                logging.info(f"База данных инициализирована: {self.db_path}")
                
        except sqlite3.Error as e:
            logging.error(f"Ошибка инициализации базы данных: {e}")
            raise
    
    def save_vacancy(self, vacancy_data: Dict[str, Any]) -> bool:
        """Сохранение вакансии в базу данных"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute(
                    "SELECT id FROM vacancies WHERE external_id = ? AND source = ?",
                    (vacancy_data['external_id'], vacancy_data.get('source', 'geekjob'))
                )
                
                if cursor.fetchone():
                    logging.debug(f"Вакансия уже существует: {vacancy_data['external_id']}")
                    return False
                
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
                logging.info(f"Сохранена вакансия: {vacancy_data['title']} - {vacancy_data.get('company', 'N/A')}")
                return True
                
        except sqlite3.Error as e:
            logging.error(f"Ошибка сохранения вакансии: {e}")
            return False


class GeekjobParser:
    """Основной класс парсера Geekjob.ru"""
    
    DESIGN_KEYWORDS = [
        'дизайн', 'дизайнер', 'ui/ux', 'ux/ui', 'продуктовый дизайн',
        'веб-дизайн', 'графический дизайн', 'визуальный дизайн',
        'ui-дизайнер', 'ux-дизайнер', 'продуктовый дизайнер',
        'designer', 'ui designer', 'ux designer', 'product designer'
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Connection': 'keep-alive'
        })
        return session
    
    def is_relevant_vacancy(self, title: str, description: str = '') -> bool:
        """Проверка релевантности вакансии для дизайнеров"""
        text = f"{title} {description}".lower()
        return any(keyword.lower() in text for keyword in self.DESIGN_KEYWORDS)
    
    def extract_vacancy_id(self, url: str) -> str:
        """Извлечение ID вакансии из URL"""
        if '/vacancy/' in url:
            return url.split('/vacancy/')[-1].split('?')[0].split('/')[0]
        return url.split('/')[-1].split('?')[0]
    
    def parse_vacancy_list_page(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """Парсинг страницы со списком вакансий"""
        url = f"https://geekjob.ru/vacancies?q={quote(query)}&page={page}"
        
        try:
            logging.info(f"Парсинг страницы {page}: {url}")
            
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Ищем ссылки на вакансии
            vacancy_links = soup.find_all('a', href=lambda x: x and '/vacancy/' in x)
            
            if not vacancy_links and get_html:
                html2 = get_html(url, timeout_ms=self.timeout * 1000, wait_selector='a[href*="/vacancy/"]')
                if html2:
                    soup = BeautifulSoup(html2, 'html.parser')
                    vacancy_links = soup.find_all('a', href=lambda x: x and '/vacancy/' in x)
            if not vacancy_links:
                logging.warning(f"На странице {page} не найдено ссылок на вакансии")
                return []
            
            logging.info(f"Найдено {len(vacancy_links)} ссылок на вакансии")
            
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
                    elif len(text) > 50:
                        if not vacancy['title']:
                            vacancy['title'] = text
                        elif not vacancy['description']:
                            vacancy['description'] = text
                    elif len(text) < 50 and not any(currency in text for currency in ['₽', '€', '$']):
                        if not vacancy['company']:
                            vacancy['company'] = text
                    elif any(location in text.lower() for location in ['москва', 'санкт-петербург', 'remote']):
                        vacancy['location'] = text
                
                except Exception as e:
                    logging.debug(f"Ошибка обработки ссылки: {e}")
                    continue
            
            # Фильтруем релевантные вакансии
            relevant_vacancies = []
            for vacancy_id, vacancy in vacancies_data.items():
                if vacancy['title'] and self.is_relevant_vacancy(vacancy['title'], vacancy['description']):
                    relevant_vacancies.append(vacancy)
                    logging.info(f"Релевантная вакансия: {vacancy['title']}")
                else:
                    logging.debug(f"Не релевантная вакансия: {vacancy.get('title', 'Без названия')}")
            
            return relevant_vacancies
            
        except requests.RequestException as e:
            logging.error(f"Ошибка HTTP запроса для страницы {page}: {e}")
            return []
        except Exception as e:
            logging.error(f"Ошибка парсинга страницы {page}: {e}")
            return []
    
    def parse_vacancies(self, query: str = 'дизайнер', pages: int = 10, extract_details: bool = False) -> List[Dict[str, Any]]:
        """Основной метод парсинга вакансий"""
        logging.info(f"Начинаем парсинг Geekjob.ru")
        logging.info(f"Запрос: '{query}', страниц: {pages}")
        
        all_vacancies = []
        
        for page in range(1, pages + 1):
            try:
                page_vacancies = self.parse_vacancy_list_page(query, page)
                
                if not page_vacancies:
                    logging.warning(f"На странице {page} не найдено релевантных вакансий")
                    continue
                
                for vacancy in page_vacancies:
                    try:
                        vacancy['source'] = 'geekjob'
                        vacancy['published_at'] = datetime.now().isoformat()
                        vacancy['status'] = 'pending'
                        
                        all_vacancies.append(vacancy)
                        self.db.save_vacancy(vacancy)
                        
                    except Exception as e:
                        logging.error(f"Ошибка обработки вакансии: {e}")
                        continue
                
                logging.info(f"Страница {page}: найдено {len(page_vacancies)} вакансий")
                time.sleep(self.delay)
                
            except Exception as e:
                logging.error(f"Ошибка парсинга страницы {page}: {e}")
                continue
        
        logging.info(f"Парсинг завершён. Всего обработано: {len(all_vacancies)} вакансий")
        return all_vacancies


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
    parser.add_argument('--dry-run', action='store_true', help='Тестовый запуск без сохранения')
    
    args = parser.parse_args()
    
    # Настройка логирования
    log_level = not args.quiet if not args.verbose else args.verbose
    logger = setup_logging(verbose=log_level)
    
    try:
        if args.dry_run:
            logging.info("ТЕСТОВЫЙ РЕЖИМ - данные не будут сохранены")
        
        geekjob = GeekjobParser(
            db_path=args.db,
            delay=args.delay,
            timeout=args.timeout
        )
        
        vacancies = geekjob.parse_vacancies(
            query=args.query,
            pages=args.pages
        )
        
        logging.info("Парсинг завершён успешно!")
        return 0
        
    except KeyboardInterrupt:
        logging.info("Парсинг прерван пользователем")
        return 1
    except Exception as e:
        logging.error(f"Критическая ошибка: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
