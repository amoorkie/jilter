#!/usr/bin/env python3
"""
Unicode PDF экспорт вакансий с поддержкой кириллицы
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
    from fpdf import FPDF
except ImportError:
    print("Ошибка: fpdf2 не установлен")
    print("Установите: pip install fpdf2")
    sys.exit(1)


class UnicodePDFExporter:
    """Unicode PDF экспорт с поддержкой кириллицы"""
    
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
            # Fallback - простая очистка
            return self.simple_text_extraction(html_content)
    
    def simple_text_extraction(self, text: str) -> str:
        """Простое извлечение текста без BeautifulSoup"""
        if not text:
            return ""
        
        # Декодируем HTML entities
        clean_text = html.unescape(text)
        
        # Удаляем HTML теги
        clean_text = re.sub(r'<[^>]+>', '', clean_text)
        
        # Убираем JavaScript код
        clean_text = re.sub(r'<script[^>]*>.*?</script>', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        clean_text = re.sub(r'<style[^>]*>.*?</style>', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        
        # Убираем лишние пробелы
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        return clean_text
    
    def create_unicode_pdf(self, vacancies: List[Dict[str, Any]], output_path: str) -> bool:
        """Создание Unicode PDF с поддержкой кириллицы"""
        try:
            pdf = FPDF()
            pdf.add_page()
            pdf.set_auto_page_break(auto=True, margin=15)
            
            # Добавляем Unicode шрифт (используем DejaVu Sans)
            try:
                pdf.add_font('DejaVu', '', 'DejaVuSans.ttf', uni=True)
                pdf.add_font('DejaVu', 'B', 'DejaVuSans-Bold.ttf', uni=True)
                font_name = 'DejaVu'
            except:
                # Fallback на встроенные шрифты
                font_name = 'Arial'
                print("Предупреждение: Используются встроенные шрифты, кириллица может отображаться некорректно")
            
            # Заголовок документа
            pdf.set_font(font_name, "B", 16)
            pdf.cell(0, 10, "ЭКСПОРТ ВАКАНСИЙ ДЛЯ ОБРАБОТКИ В CHATGPT", 0, 1, "C")
            pdf.ln(10)
            
            # Метаинформация
            pdf.set_font(font_name, "", 10)
            export_date = datetime.now().strftime("%d.%m.%Y %H:%M")
            pdf.cell(0, 5, f"Дата экспорта: {export_date}", 0, 1)
            pdf.cell(0, 5, f"Количество вакансий: {len(vacancies)}", 0, 1)
            pdf.ln(10)
            
            # Обработка каждой вакансии
            for i, vacancy in enumerate(vacancies, 1):
                # ID и заголовок вакансии
                pdf.set_font(font_name, "B", 14)
                pdf.cell(0, 8, f"ВАКАНСИЯ #{vacancy['id']}", 0, 1)
                
                # Заголовок
                pdf.set_font(font_name, "B", 12)
                clean_title = self.extract_clean_text(vacancy['title'])
                pdf.multi_cell(0, 6, clean_title)
                pdf.ln(2)
                
                # Компания
                pdf.set_font(font_name, "", 10)
                clean_company = self.extract_clean_text(vacancy['company'])
                pdf.cell(0, 5, f"Компания: {clean_company}", 0, 1)
                
                # Источник и дата
                pdf.cell(0, 5, f"Источник: {vacancy['source']}", 0, 1)
                if vacancy['published_at']:
                    published_date = vacancy['published_at'][:10] if len(vacancy['published_at']) > 10 else vacancy['published_at']
                    pdf.cell(0, 5, f"Дата: {published_date}", 0, 1)
                
                pdf.ln(3)
                
                # Описание
                if vacancy['full_description']:
                    pdf.set_font(font_name, "B", 10)
                    pdf.cell(0, 5, "Описание:", 0, 1)
                    
                    pdf.set_font(font_name, "", 10)
                    clean_description = self.extract_clean_text(vacancy['full_description'])
                    
                    if clean_description.strip():
                        # Разбиваем текст на абзацы
                        paragraphs = clean_description.split('\n')
                        for paragraph in paragraphs:
                            if paragraph.strip():
                                pdf.multi_cell(0, 5, paragraph)
                                pdf.ln(2)
                    else:
                        pdf.cell(0, 5, "[Текст не найден после очистки]", 0, 1)
                
                # Разделитель между вакансиями
                if i < len(vacancies):
                    pdf.ln(10)
                    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
                    pdf.ln(10)
            
            # Сохраняем PDF
            pdf.output(output_path)
            print(f"PDF файл создан: {output_path}")
            return True
            
        except Exception as e:
            print(f"Ошибка создания PDF: {e}")
            return False
    
    def export_vacancies_to_pdf(self, output_path: str = None) -> bool:
        """Экспорт всех вакансий в PDF"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"vacancies_unicode_{timestamp}.pdf"
        
        print("Unicode экспорт вакансий в PDF")
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
        success = self.create_unicode_pdf(vacancies, output_path)
        
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
    print("Unicode экспорт вакансий в PDF")
    print("="*50)
    
    # Путь к базе данных
    db_path = "data/vacancies.db"
    
    # Проверяем существование базы
    if not os.path.exists(db_path):
        print(f"База данных не найдена: {db_path}")
        return
    
    # Создаем экспортер
    exporter = UnicodePDFExporter(db_path)
    
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








