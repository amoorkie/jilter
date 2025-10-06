#!/usr/bin/env python3
"""
PDF экспорт вакансий с красивым форматированием
"""

import sqlite3
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
import re
import html
from bs4 import BeautifulSoup

try:
    import pdfkit
except ImportError:
    print("Ошибка: pdfkit не установлен")
    print("Установите: pip install pdfkit")
    sys.exit(1)


class PDFExporter:
    """PDF экспорт с красивым форматированием"""
    
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
                SELECT id, title, company, full_description, source, published_at,
                       description, requirements, tasks, conditions, benefits
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
        """Ультра-агрессивная очистка текста от кода"""
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
    
    def format_vacancy_html(self, vacancy: Dict[str, Any]) -> str:
        """Форматирование вакансии в HTML как в админке"""
        # Очищаем заголовок и компанию
        clean_title = self.ultra_clean_text(vacancy['title'])
        clean_company = self.ultra_clean_text(vacancy['company'])
        
        # Очищаем описание
        clean_description = self.ultra_clean_text(vacancy['full_description'])
        
        html_content = f"""
        <div class="vacancy-container" style="margin-bottom: 40px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; page-break-inside: avoid;">
            <div class="vacancy-header" style="margin-bottom: 20px;">
                <h1 class="vacancy-title" style="font-size: 24px; font-weight: bold; color: #333; margin: 0 0 8px 0;">{html.escape(clean_title)}</h1>
                <p class="vacancy-company" style="font-size: 16px; color: #666; margin: 0;">{html.escape(clean_company)}</p>
            </div>
            
            <div class="vacancy-info" style="display: flex; gap: 40px; margin-bottom: 20px;">
                <div class="basic-info" style="flex: 1;">
                    <h3 style="font-size: 14px; font-weight: bold; color: #333; margin: 0 0 8px 0;">Основная информация</h3>
                    <p style="margin: 4px 0; font-size: 14px; color: #666;">Компания: {html.escape(clean_company)}</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #666;">Источник: {html.escape(vacancy['source'])}</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #666;">URL: <a href="#" style="color: #007bff; text-decoration: underline;">Открыть</a></p>
                </div>
                <div class="ai-analysis" style="flex: 1;">
                    <h3 style="font-size: 14px; font-weight: bold; color: #333; margin: 0 0 8px 0;">AI Анализ</h3>
                    <p style="margin: 4px 0; font-size: 14px; color: #666;">Специализация: design</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #666;">Занятость: </p>
                    <p style="margin: 4px 0; font-size: 14px; color: #666;">Опыт: junior</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #666;">Удаленно: Нет</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #666;">Релевантность: 80.0%</p>
                </div>
            </div>
            
            <div class="vacancy-description" style="margin-bottom: 20px;">
                <h3 style="font-size: 16px; font-weight: bold; color: #333; margin: 0 0 12px 0;">Описание вакансии</h3>
                <div style="font-size: 14px; line-height: 1.6; color: #333;">
                    {self.format_description_text(clean_description)}
                </div>
            </div>
            
            <div class="vacancy-requirements" style="margin-bottom: 20px;">
                <h3 style="font-size: 16px; font-weight: bold; color: #333; margin: 0 0 12px 0;">Ты нам подходишь, если:</h3>
                <div style="font-size: 14px; line-height: 1.6; color: #333;">
                    {self.format_requirements_text(clean_description)}
                </div>
            </div>
            
            <div class="vacancy-qualities" style="margin-bottom: 20px;">
                <h3 style="font-size: 16px; font-weight: bold; color: #333; margin: 0 0 12px 0;">Какие твои личностные качества для нас важны:</h3>
                <div style="font-size: 14px; line-height: 1.6; color: #333;">
                    {self.format_qualities_text(clean_description)}
                </div>
            </div>
        </div>
        """
        return html_content
    
    def format_description_text(self, text: str) -> str:
        """Форматирование текста описания"""
        if not text:
            return "<p>Описание не найдено</p>"
        
        # Разбиваем на абзацы
        paragraphs = text.split('\n')
        formatted_paragraphs = []
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if paragraph:
                # Выделяем жирным ключевые слова
                paragraph = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', paragraph)
                paragraph = re.sub(r'\b(Арт-директор|дизайнер|UI/UX|UX/UI|Product Designer|Senior|Junior|Middle|Lead)\b', r'<strong>\1</strong>', paragraph, flags=re.IGNORECASE)
                formatted_paragraphs.append(f"<p style='margin: 0 0 12px 0;'>{html.escape(paragraph)}</p>")
        
        return '\n'.join(formatted_paragraphs)
    
    def format_requirements_text(self, text: str) -> str:
        """Форматирование требований в виде списка"""
        if not text:
            return "<p>Требования не найдены</p>"
        
        # Ищем требования по ключевым словам
        requirements = []
        
        # Разбиваем на предложения
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and any(keyword in sentence.lower() for keyword in [
                'опыт', 'знание', 'умение', 'навык', 'требование', 'необходимо', 'должен', 'нужно',
                'adobe', 'figma', 'photoshop', 'illustrator', 'after effects', 'premiere',
                'дизайн', 'ux', 'ui', 'веб', 'мобильный', 'приложение'
            ]):
                # Очищаем от лишних символов
                sentence = re.sub(r'[;]+$', '', sentence)
                if sentence:
                    requirements.append(f"<li style='margin: 4px 0;'>{html.escape(sentence)};</li>")
        
        if requirements:
            return f"<ul style='margin: 0; padding-left: 20px;'>{''.join(requirements)}</ul>"
        else:
            return "<p>Требования не найдены</p>"
    
    def format_qualities_text(self, text: str) -> str:
        """Форматирование личностных качеств в виде списка"""
        if not text:
            return "<p>Личностные качества не найдены</p>"
        
        # Ищем личностные качества по ключевым словам
        qualities = []
        
        # Разбиваем на предложения
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and any(keyword in sentence.lower() for keyword in [
                'проактивность', 'ответственность', 'коммуникабельность', 'креативность',
                'внимательность', 'грамотность', 'инициативность', 'стрессоустойчивость',
                'командная работа', 'лидерство', 'аналитическое мышление'
            ]):
                # Очищаем от лишних символов
                sentence = re.sub(r'[;]+$', '', sentence)
                if sentence:
                    qualities.append(f"<li style='margin: 4px 0;'>{html.escape(sentence)};</li>")
        
        if qualities:
            return f"<ul style='margin: 0; padding-left: 20px;'>{''.join(qualities)}</ul>"
        else:
            return "<p>Личностные качества не найдены</p>"
    
    def create_pdf(self, vacancies: List[Dict[str, Any]], output_path: str) -> bool:
        """Создание PDF с красивым форматированием"""
        try:
            # HTML шаблон
            html_template = f"""
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Экспорт вакансий для ChatGPT</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        background: white;
                        margin: 0;
                        padding: 20px;
                    }}
                    .container {{
                        max-width: 1200px;
                        margin: 0 auto;
                    }}
                    .header {{
                        text-align: center;
                        margin-bottom: 40px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #e0e0e0;
                    }}
                    .header h1 {{
                        font-size: 28px;
                        font-weight: bold;
                        color: #333;
                        margin: 0 0 10px 0;
                    }}
                    .header p {{
                        font-size: 16px;
                        color: #666;
                        margin: 0;
                    }}
                    .vacancy-container {{
                        margin-bottom: 40px;
                        padding: 20px;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        background: #fff;
                        page-break-inside: avoid;
                    }}
                    .vacancy-header {{
                        margin-bottom: 20px;
                    }}
                    .vacancy-title {{
                        font-size: 24px;
                        font-weight: bold;
                        color: #333;
                        margin: 0 0 8px 0;
                    }}
                    .vacancy-company {{
                        font-size: 16px;
                        color: #666;
                        margin: 0;
                    }}
                    .vacancy-info {{
                        display: flex;
                        gap: 40px;
                        margin-bottom: 20px;
                    }}
                    .basic-info, .ai-analysis {{
                        flex: 1;
                    }}
                    .basic-info h3, .ai-analysis h3 {{
                        font-size: 14px;
                        font-weight: bold;
                        color: #333;
                        margin: 0 0 8px 0;
                    }}
                    .basic-info p, .ai-analysis p {{
                        margin: 4px 0;
                        font-size: 14px;
                        color: #666;
                    }}
                    .vacancy-description, .vacancy-requirements, .vacancy-qualities {{
                        margin-bottom: 20px;
                    }}
                    .vacancy-description h3, .vacancy-requirements h3, .vacancy-qualities h3 {{
                        font-size: 16px;
                        font-weight: bold;
                        color: #333;
                        margin: 0 0 12px 0;
                    }}
                    .vacancy-description div, .vacancy-requirements div, .vacancy-qualities div {{
                        font-size: 14px;
                        line-height: 1.6;
                        color: #333;
                    }}
                    .vacancy-description p {{
                        margin: 0 0 12px 0;
                    }}
                    .vacancy-requirements ul, .vacancy-qualities ul {{
                        margin: 0;
                        padding-left: 20px;
                    }}
                    .vacancy-requirements li, .vacancy-qualities li {{
                        margin: 4px 0;
                    }}
                    strong {{
                        font-weight: bold;
                        color: #333;
                    }}
                    a {{
                        color: #007bff;
                        text-decoration: underline;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>ЭКСПОРТ ВАКАНСИЙ ДЛЯ ОБРАБОТКИ В CHATGPT</h1>
                        <p>Дата экспорта: {datetime.now().strftime("%d.%m.%Y %H:%M")}</p>
                        <p>Количество вакансий: {len(vacancies)}</p>
                    </div>
                    
                    {''.join([self.format_vacancy_html(vacancy) for vacancy in vacancies])}
                </div>
            </body>
            </html>
            """
            
            # Настройки для PDF
            options = {
                'page-size': 'A4',
                'margin-top': '0.75in',
                'margin-right': '0.75in',
                'margin-bottom': '0.75in',
                'margin-left': '0.75in',
                'encoding': "UTF-8",
                'no-outline': None,
                'enable-local-file-access': None,
                'print-media-type': None,
                'disable-smart-shrinking': None
            }
            
            # Создаем PDF
            pdfkit.from_string(html_template, output_path, options=options)
            print(f"PDF файл создан: {output_path}")
            return True
            
        except Exception as e:
            print(f"Ошибка создания PDF: {e}")
            return False
    
    def export_vacancies_to_pdf(self, output_path: str = None) -> bool:
        """Экспорт всех вакансий в PDF"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"vacancies_pdf_{timestamp}.pdf"
        
        print("PDF экспорт вакансий с красивым форматированием")
        print("="*50)
        
        # Подключаемся к базе
        if not self.connect_to_database():
            return False
        
        # Получаем вакансии
        vacancies = self.get_vacancies_for_export()
        if not vacancies:
            print("Нет вакансий для экспорта")
            return False
        
        # Создаем PDF
        success = self.create_pdf(vacancies, output_path)
        
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
    print("PDF экспорт вакансий с красивым форматированием")
    print("="*50)
    
    # Путь к базе данных
    db_path = "data/vacancies.db"
    
    # Проверяем существование базы
    if not os.path.exists(db_path):
        print(f"База данных не найдена: {db_path}")
        return
    
    # Создаем экспортер
    exporter = PDFExporter(db_path)
    
    try:
        # Экспортируем вакансии
        success = exporter.export_vacancies_to_pdf()
        
        if success:
            print("\nГотово! Теперь:")
            print("1. Откройте созданный PDF файл")
            print("2. Загрузите его в ChatGPT")
            print("3. Попросите ChatGPT переписать описания вакансий")
            print("4. Скачайте обработанный PDF")
            print("5. Используйте импорт в админ панели")
        
    except Exception as e:
        print(f"Критическая ошибка: {e}")
    finally:
        exporter.close_connection()


if __name__ == "__main__":
    main()








