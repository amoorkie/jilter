#!/usr/bin/env python3
"""
HTML экспорт вакансий с красивым форматированием как в админке
"""

import sqlite3
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
import re
import html
from bs4 import BeautifulSoup


class HTMLExporter:
    """HTML экспорт с красивым форматированием"""
    
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
    
    def extract_clean_text(self, html_content: str) -> str:
        """Извлечение чистого текста из HTML"""
        if not html_content:
            return ""
        
        try:
            # Парсим HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Удаляем скрипты и стили
            for script in soup(["script", "style", "noscript"]):
                script.decompose()
            
            # Получаем чистый текст
            text = soup.get_text(separator=' ', strip=True)
            
            # Дополнительная очистка
            text = re.sub(r'\s+', ' ', text)  # Убираем лишние пробелы
            text = text.strip()
            
            return text
            
        except Exception as e:
            print(f"Ошибка извлечения текста: {e}")
            return ""
    
    def format_vacancy_html(self, vacancy: Dict[str, Any]) -> str:
        """Форматирование вакансии в HTML как в админке"""
        html_content = f"""
        <div class="vacancy-container" style="margin-bottom: 40px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff;">
            <div class="vacancy-header" style="margin-bottom: 20px;">
                <h1 class="vacancy-title" style="font-size: 24px; font-weight: bold; color: #333; margin: 0 0 8px 0;">{html.escape(vacancy['title'])}</h1>
                <p class="vacancy-company" style="font-size: 16px; color: #666; margin: 0;">{html.escape(vacancy['company'])}</p>
            </div>
            
            <div class="vacancy-info" style="display: flex; gap: 40px; margin-bottom: 20px;">
                <div class="basic-info" style="flex: 1;">
                    <h3 style="font-size: 14px; font-weight: bold; color: #333; margin: 0 0 8px 0;">Основная информация</h3>
                    <p style="margin: 4px 0; font-size: 14px; color: #666;">Компания: {html.escape(vacancy['company'])}</p>
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
                    {self.format_description_text(vacancy['full_description'])}
                </div>
            </div>
            
            <div class="vacancy-requirements" style="margin-bottom: 20px;">
                <h3 style="font-size: 16px; font-weight: bold; color: #333; margin: 0 0 12px 0;">Ты нам подходишь, если:</h3>
                <div style="font-size: 14px; line-height: 1.6; color: #333;">
                    {self.format_requirements_text(vacancy['full_description'])}
                </div>
            </div>
            
            <div class="vacancy-qualities" style="margin-bottom: 20px;">
                <h3 style="font-size: 16px; font-weight: bold; color: #333; margin: 0 0 12px 0;">Какие твои личностные качества для нас важны:</h3>
                <div style="font-size: 14px; line-height: 1.6; color: #333;">
                    {self.format_qualities_text(vacancy['full_description'])}
                </div>
            </div>
        </div>
        """
        return html_content
    
    def format_description_text(self, text: str) -> str:
        """Форматирование текста описания"""
        if not text:
            return "<p>Описание не найдено</p>"
        
        # Извлекаем чистый текст
        clean_text = self.extract_clean_text(text)
        
        if not clean_text:
            return "<p>Описание не найдено</p>"
        
        # Разбиваем на абзацы
        paragraphs = clean_text.split('\n')
        formatted_paragraphs = []
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if paragraph:
                # Выделяем жирным ключевые слова
                paragraph = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', paragraph)
                paragraph = re.sub(r'\b(Арт-директор|дизайнер|UI/UX|UX/UI|Product Designer|Senior|Junior|Middle|Lead)\b', r'<strong>\1</strong>', paragraph, flags=re.IGNORECASE)
                formatted_paragraphs.append(f"<p style='margin: 0 0 12px 0;'>{paragraph}</p>")
        
        return '\n'.join(formatted_paragraphs)
    
    def format_requirements_text(self, text: str) -> str:
        """Форматирование требований в виде списка"""
        if not text:
            return "<p>Требования не найдены</p>"
        
        # Извлекаем чистый текст
        clean_text = self.extract_clean_text(text)
        
        if not clean_text:
            return "<p>Требования не найдены</p>"
        
        # Ищем требования по ключевым словам
        requirements = []
        
        # Разбиваем на предложения
        sentences = re.split(r'[.!?]+', clean_text)
        
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
                    requirements.append(f"<li style='margin: 4px 0;'>{sentence};</li>")
        
        if requirements:
            return f"<ul style='margin: 0; padding-left: 20px;'>{''.join(requirements)}</ul>"
        else:
            return "<p>Требования не найдены</p>"
    
    def format_qualities_text(self, text: str) -> str:
        """Форматирование личностных качеств в виде списка"""
        if not text:
            return "<p>Личностные качества не найдены</p>"
        
        # Извлекаем чистый текст
        clean_text = self.extract_clean_text(text)
        
        if not clean_text:
            return "<p>Личностные качества не найдены</p>"
        
        # Ищем личностные качества по ключевым словам
        qualities = []
        
        # Разбиваем на предложения
        sentences = re.split(r'[.!?]+', clean_text)
        
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
                    qualities.append(f"<li style='margin: 4px 0;'>{sentence};</li>")
        
        if qualities:
            return f"<ul style='margin: 0; padding-left: 20px;'>{''.join(qualities)}</ul>"
        else:
            return "<p>Личностные качества не найдены</p>"
    
    def create_html_file(self, vacancies: List[Dict[str, Any]], output_path: str) -> bool:
        """Создание HTML файла с красивым форматированием"""
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
                        background: #f5f5f5;
                        margin: 0;
                        padding: 20px;
                    }}
                    .container {{
                        max-width: 1200px;
                        margin: 0 auto;
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
                    @media print {{
                        body {{
                            background: white;
                            padding: 0;
                        }}
                        .container {{
                            box-shadow: none;
                            border-radius: 0;
                        }}
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
            
            # Сохраняем HTML файл
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_template)
            
            print(f"HTML файл создан: {output_path}")
            return True
            
        except Exception as e:
            print(f"Ошибка создания HTML файла: {e}")
            return False
    
    def export_vacancies_to_html(self, output_path: str = None) -> bool:
        """Экспорт всех вакансий в HTML"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"vacancies_html_{timestamp}.html"
        
        print("HTML экспорт вакансий с красивым форматированием")
        print("="*50)
        
        # Подключаемся к базе
        if not self.connect_to_database():
            return False
        
        # Получаем вакансии
        vacancies = self.get_vacancies_for_export()
        if not vacancies:
            print("Нет вакансий для экспорта")
            return False
        
        # Создаем HTML файл
        success = self.create_html_file(vacancies, output_path)
        
        if success:
            print(f"\nЭкспорт завершен успешно!")
            print(f"Файл: {output_path}")
            print(f"Вакансий экспортировано: {len(vacancies)}")
            print("\nДля создания PDF:")
            print("1. Откройте HTML файл в браузере")
            print("2. Нажмите Ctrl+P (Печать)")
            print("3. Выберите 'Сохранить как PDF'")
            print("4. Сохраните файл")
        
        return success
    
    def close_connection(self):
        """Закрытие соединения с базой данных"""
        if self.connection:
            self.connection.close()
            print("Соединение с базой данных закрыто")


def main():
    """Главная функция"""
    print("HTML экспорт вакансий с красивым форматированием")
    print("="*50)
    
    # Путь к базе данных
    db_path = "data/vacancies.db"
    
    # Проверяем существование базы
    if not os.path.exists(db_path):
        print(f"База данных не найдена: {db_path}")
        return
    
    # Создаем экспортер
    exporter = HTMLExporter(db_path)
    
    try:
        # Экспортируем вакансии
        success = exporter.export_vacancies_to_html()
        
        if success:
            print("\nГотово! Теперь:")
            print("1. Откройте созданный HTML файл в браузере")
            print("2. Нажмите Ctrl+P для печати")
            print("3. Выберите 'Сохранить как PDF'")
            print("4. Загрузите PDF в ChatGPT")
            print("5. Попросите ChatGPT переписать описания вакансий")
        
    except Exception as e:
        print(f"Критическая ошибка: {e}")
    finally:
        exporter.close_connection()


if __name__ == "__main__":
    main()








