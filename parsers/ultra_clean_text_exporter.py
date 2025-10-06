#!/usr/bin/env python3
"""
Ультра-чистый экспорт вакансий в текстовый файл
"""

import sqlite3
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
import re
import html
from bs4 import BeautifulSoup


class UltraCleanTextExporter:
    """Ультра-чистый экспорт вакансий в текстовый файл"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.connection = None
        
    def connect_to_database(self) -> bool:
        """Подключение к базе данных"""
        try:
            self.connection = sqlite3.connect(self.db_path)
            print(f"Подключение к базе данных: {self.db_path}")
            return True
        except sqlite3.Error as e:
            print(f"Ошибка подключения к базе данных: {e}")
            return False
    
    def get_vacancies_for_export(self) -> List[Dict[str, Any]]:
        """Получение вакансий для экспорта"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("""
                SELECT id, title, company, full_description, source, published_at
                FROM vacancies 
                WHERE full_description IS NOT NULL 
                AND full_description != ''
                ORDER BY id
            """)
            
            columns = [description[0] for description in cursor.description]
            vacancies = []
            
            for row in cursor.fetchall():
                vacancy = dict(zip(columns, row))
                vacancies.append(vacancy)
            
            print(f"Найдено вакансий для экспорта: {len(vacancies)}")
            return vacancies
            
        except sqlite3.Error as e:
            print(f"Ошибка получения вакансий: {e}")
            return []
    
    def ultra_clean_text(self, text: str) -> str:
        """Ультра-агрессивная очистка текста"""
        if not text:
            return ""
        
        # Декодируем HTML entities
        clean_text = html.unescape(text)
        
        # Удаляем все HTML теги
        clean_text = re.sub(r'<[^>]+>', '', clean_text)
        
        # Убираем JavaScript код (максимально агрессивно)
        js_patterns = [
            r'<script[^>]*>.*?</script>',
            r'<style[^>]*>.*?</style>',
            r'<noscript[^>]*>.*?</noscript>',
            r'var\s+\w+\s*=.*?;',
            r'function\s+\w+\(.*?\).*?}',
            r'window\.\w+\s*=.*?;',
            r'document\.\w+.*?;',
            r'Rating\s+Mail\.ru\s+counter',
            r'LiveInternet\s+Top100',
            r'top100\.ru',
            r'window\._tmr',
            r'd\.createElement',
            r'project:\s*\d+',
            r'st\.top100\.ru',
            r'https?://[^\s]+',
            r'\.js[^\w]',
            r'\.css[^\w]',
            r'analytics',
            r'tracking',
            r'counter',
            r'pixel',
            r'beacon',
            r'telegram',
            r'vkontakte',
            r'mail\.ru',
            r'rating',
            r'liveinternet',
            r'kraken',
            r'G\.json\..*?}',
            r'getSimilarVacanciesKey.*?}',
            r'{"body":.*?}',
            r'{"headers":.*?}',
            r'{"status":.*?}',
            r'{"statusText":.*?}',
            r'{"url":.*?}',
            r'{"responseType":.*?}',
            r'{"count":.*?}',
            r'{"offers":.*?}',
            r'{"id":.*?}',
            r'{"url":.*?}',
            r'{"position":.*?}',
            r'{"company":.*?}',
            r'{"name":.*?}',
            r'{"logotype":.*?}',
            r'{"salary_display_from":.*?}',
            r'{"salary_display_to":.*?}',
            r'{"salary_currency":.*?}',
            r'{"salary_hidden":.*?}',
            r'{"city":.*?}',
            r'{"country":.*?}',
            r'{"location_details":.*?}',
            r'{"specializations":.*?}',
            r'{"type":.*?}',
            r'{"locations":.*?}',
            r'{"relocation_options":.*?}',
            r'{"remote_options":.*?}',
            r'{"office_options":.*?}',
            r'{"display_locations":.*?}',
            r'{"metro":.*?}',
            r'{"similar_offers_url":.*?}',
            r'{"server":.*?}',
            r'{"date":.*?}',
            r'{"content-type":.*?}',
            r'{"content-length":.*?}',
            r'{"connection":.*?}',
            r'{"access-control-allow-credentials":.*?}',
            r'{"access-control-allow-headers":.*?}',
            r'{"access-control-allow-methods":.*?}',
            r'{"access-control-max-age":.*?}',
            r'{"isAnonymous":.*?}',
            r'{"role":.*?}',
            r'{"user":.*?}',
            r'{"morphs":.*?}',
            r'{"form_first":.*?}',
            r'{"form_second":.*?}',
            r'{"plural":.*?}',
            r'{"form_first_plural":.*?}',
            r'{"form5":.*?}',
            r'{"seo_morphs":.*?}',
            r'{"category":.*?}',
            r'{"slug":.*?}',
            r'{"name":.*?}',
            r'{"sort_order":.*?}',
            r'{"body":.*?}',
            r'{"headers":.*?}',
            r'{"status":.*?}',
            r'{"statusText":.*?}',
            r'{"url":.*?}',
            r'{"responseType":.*?}',
            r'{"count":.*?}',
            r'{"offers":.*?}',
            r'{"id":.*?}',
            r'{"url":.*?}',
            r'{"position":.*?}',
            r'{"company":.*?}',
            r'{"name":.*?}',
            r'{"logotype":.*?}',
            r'{"salary_display_from":.*?}',
            r'{"salary_display_to":.*?}',
            r'{"salary_currency":.*?}',
            r'{"salary_hidden":.*?}',
            r'{"city":.*?}',
            r'{"country":.*?}',
            r'{"location_details":.*?}',
            r'{"specializations":.*?}',
            r'{"type":.*?}',
            r'{"locations":.*?}',
            r'{"relocation_options":.*?}',
            r'{"remote_options":.*?}',
            r'{"office_options":.*?}',
            r'{"display_locations":.*?}',
            r'{"metro":.*?}',
            r'{"similar_offers_url":.*?}',
            r'{"server":.*?}',
            r'{"date":.*?}',
            r'{"content-type":.*?}',
            r'{"content-length":.*?}',
            r'{"connection":.*?}',
            r'{"access-control-allow-credentials":.*?}',
            r'{"access-control-allow-headers":.*?}',
            r'{"access-control-allow-methods":.*?}',
            r'{"access-control-max-age":.*?}',
            r'{"isAnonymous":.*?}',
            r'{"role":.*?}',
            r'{"user":.*?}',
            r'{"morphs":.*?}',
            r'{"form_first":.*?}',
            r'{"form_second":.*?}',
            r'{"plural":.*?}',
            r'{"form_first_plural":.*?}',
            r'{"form5":.*?}',
            r'{"seo_morphs":.*?}',
            r'{"category":.*?}',
            r'{"slug":.*?}',
            r'{"name":.*?}',
            r'{"sort_order":.*?}'
        ]
        
        for pattern in js_patterns:
            clean_text = re.sub(pattern, '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        
        # Убираем строки с техническими данными
        lines = clean_text.split('\n')
        clean_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Пропускаем технические строки
            if any(keyword in line.lower() for keyword in [
                'script', 'function', 'var ', 'window.', 'document.',
                'analytics', 'tracking', 'counter', 'pixel', 'beacon',
                'top100', 'telegram', 'vkontakte', 'mail.ru', 'rating',
                'liveinternet', 'kraken', 'project:', 'st.top100',
                'd.createElement', 'https://', 'http://', '.js', '.css',
                'opera', 'domcontentloaded', 'addEventListener',
                'getelementbyid', 'getelementsbytagname', 'parentnode',
                'insertbefore', 'async', 'text/javascript', 'json',
                'response', 'headers', 'status', 'body', 'offers',
                'similar', 'vacancies', 'specializations', 'locations',
                'salary', 'currency', 'hidden', 'city', 'country',
                'metro', 'access-control', 'content-type', 'server',
                'connection', 'credentials', 'methods', 'max-age',
                'anonymous', 'role', 'user', 'morphs', 'form_',
                'plural', 'seo_', 'category', 'slug', 'sort_order'
            ]):
                continue
            
            # Пропускаем строки с техническими символами
            if re.match(r'^[{}();,\s]+$', line):
                continue
            
            # Пропускаем строки с URL
            if line.startswith('http') or '.js' in line or '.css' in line:
                continue
            
            # Пропускаем строки с техническими данными
            if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*\s*=', line):
                continue
            
            # Пропускаем JSON строки
            if line.startswith('{') and line.endswith('}'):
                continue
            
            # Пропускаем строки с техническими данными
            if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*\s*:', line):
                continue
            
            clean_lines.append(line)
        
        clean_text = '\n'.join(clean_lines)
        
        # Заменяем HTML entities
        clean_text = clean_text.replace('&nbsp;', ' ')
        clean_text = clean_text.replace('&amp;', '&')
        clean_text = clean_text.replace('&lt;', '<')
        clean_text = clean_text.replace('&gt;', '>')
        clean_text = clean_text.replace('&quot;', '"')
        
        # Убираем лишние пробелы
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        # Убираем проблемные символы
        clean_text = clean_text.replace('\u200b', '')
        clean_text = clean_text.replace('\u200c', '')
        clean_text = clean_text.replace('\u200d', '')
        
        return clean_text
    
    def create_ultra_clean_text_file(self, vacancies: List[Dict[str, Any]], output_path: str) -> bool:
        """Создание ультра-чистого текстового файла с вакансиями"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                # Заголовок документа
                f.write("ЭКСПОРТ ВАКАНСИЙ ДЛЯ ОБРАБОТКИ В CHATGPT\n")
                f.write("=" * 60 + "\n\n")
                
                # Метаинформация
                export_date = datetime.now().strftime("%d.%m.%Y %H:%M")
                f.write(f"Дата экспорта: {export_date}\n")
                f.write(f"Количество вакансий: {len(vacancies)}\n\n")
                
                # Обработка каждой вакансии
                for i, vacancy in enumerate(vacancies, 1):
                    f.write(f"ВАКАНСИЯ #{vacancy['id']}\n")
                    f.write("-" * 40 + "\n")
                    
                    # Заголовок
                    clean_title = self.ultra_clean_text(vacancy['title'])
                    f.write(f"Заголовок: {clean_title}\n")
                    
                    # Компания
                    clean_company = self.ultra_clean_text(vacancy['company'])
                    f.write(f"Компания: {clean_company}\n")
                    
                    # Источник и дата
                    f.write(f"Источник: {vacancy['source']}\n")
                    if vacancy['published_at']:
                        published_date = vacancy['published_at'][:10] if len(vacancy['published_at']) > 10 else vacancy['published_at']
                        f.write(f"Дата: {published_date}\n")
                    
                    f.write("\n")
                    
                    # Описание
                    if vacancy['full_description']:
                        f.write("ОПИСАНИЕ:\n")
                        clean_description = self.ultra_clean_text(vacancy['full_description'])
                        
                        if clean_description.strip():
                            f.write(clean_description)
                        else:
                            f.write("[Текст не найден после очистки]")
                        
                        f.write("\n\n")
                    
                    # Разделитель между вакансиями
                    if i < len(vacancies):
                        f.write("=" * 60 + "\n\n")
            
            print(f"Текстовый файл создан: {output_path}")
            return True
            
        except Exception as e:
            print(f"Ошибка создания файла: {e}")
            return False
    
    def export_vacancies_to_text(self, output_path: str = None) -> bool:
        """Экспорт всех вакансий в текстовый файл"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"vacancies_ultra_clean_{timestamp}.txt"
        
        print("Ультра-чистый экспорт вакансий в текстовый файл")
        print("="*50)
        
        # Подключаемся к базе
        if not self.connect_to_database():
            return False
        
        # Получаем вакансии
        vacancies = self.get_vacancies_for_export()
        if not vacancies:
            print("Нет вакансий для экспорта")
            return False
        
        # Создаем текстовый файл
        success = self.create_ultra_clean_text_file(vacancies, output_path)
        
        if success:
            print(f"\nЭкспорт завершен успешно!")
            print(f"Файл: {output_path}")
            print(f"Вакансий экспортировано: {len(vacancies)}")
        
        return success
    
    def close_connection(self):
        """Закрытие соединения с базой данных"""
        if self.connection:
            self.connection.close()
            print("Соединение с базой данных закрыто")


def main():
    """Главная функция"""
    print("Ультра-чистый экспорт вакансий в текстовый файл")
    print("="*50)
    
    # Путь к базе данных
    db_path = "data/vacancies.db"
    
    # Проверяем существование базы
    if not os.path.exists(db_path):
        print(f"База данных не найдена: {db_path}")
        return
    
    # Создаем экспортер
    exporter = UltraCleanTextExporter(db_path)
    
    try:
        # Экспортируем вакансии
        success = exporter.export_vacancies_to_text()
        
        if success:
            print("\nГотово! Теперь:")
            print("1. Откройте созданный текстовый файл")
            print("2. Скопируйте содержимое")
            print("3. Вставьте в ChatGPT")
            print("4. Попросите ChatGPT переписать описания вакансий")
            print("5. Скопируйте результат обратно")
        
    except Exception as e:
        print(f"Критическая ошибка: {e}")
    finally:
        exporter.close_connection()


if __name__ == "__main__":
    main()








