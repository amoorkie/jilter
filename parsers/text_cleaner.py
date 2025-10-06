#!/usr/bin/env python3
"""
Утилиты для очистки и форматирования текста

Исправляет проблемы с пробелами, форматирует названия компаний
и улучшает читаемость текста.
"""

import re
from typing import Dict, Any

class TextCleaner:
    """Класс для очистки и форматирования текста"""
    
    def __init__(self):
        # Паттерны для исправления пробелов
        self.spacing_patterns = [
            # Пробелы перед заглавными буквами после строчных
            (r'([а-яё])([А-ЯЁ])', r'\1 \2'),
            # Пробелы перед цифрами после букв
            (r'([а-яёА-ЯЁ])(\d)', r'\1 \2'),
            # Пробелы после цифр перед буквами
            (r'(\d)([а-яёА-ЯЁ])', r'\1 \2'),
            # Пробелы перед специальными символами
            (r'([а-яёА-ЯЁ])([\/\-\(\)])', r'\1 \2'),
            # Пробелы после специальных символов
            (r'([\/\-\(\)])([а-яёА-ЯЁ])', r'\1 \2'),
            # Пробелы перед слэшами в UI/UX
            (r'([а-яё])([A-Z])', r'\1 \2'),
            # Пробелы в названиях компаний
            (r'(ООО|ОАО|ЗАО|ИП|ИОО|АО)([А-ЯЁ])', r'\1 \2'),
            # Пробелы в сокращениях
            (r'([а-яё])([A-Z][a-z])', r'\1 \2'),
        ]
        
        # Паттерны для форматирования названий компаний
        self.company_patterns = [
            (r'ООО([А-ЯЁ])', r'ООО \1'),
            (r'ОАО([А-ЯЁ])', r'ОАО \1'),
            (r'ЗАО([А-ЯЁ])', r'ЗАО \1'),
            (r'ИП([А-ЯЁ])', r'ИП \1'),
            (r'ИОО([А-ЯЁ])', r'ИОО \1'),
            (r'АО([А-ЯЁ])', r'АО \1'),
        ]
    
    def clean_text(self, text: str) -> str:
        """Основная функция очистки текста"""
        if not text:
            return text
        
        # Применяем паттерны для исправления пробелов
        cleaned_text = text
        for pattern, replacement in self.spacing_patterns:
            cleaned_text = re.sub(pattern, replacement, cleaned_text)
        
        # Нормализуем множественные пробелы
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text)
        
        # Убираем пробелы в начале и конце
        cleaned_text = cleaned_text.strip()
        
        return cleaned_text
    
    def format_company_name(self, company_name: str) -> str:
        """Форматирование названия компании"""
        if not company_name:
            return company_name
        
        formatted_name = company_name
        
        # Применяем паттерны для названий компаний
        for pattern, replacement in self.company_patterns:
            formatted_name = re.sub(pattern, replacement, formatted_name)
        
        # Нормализуем пробелы
        formatted_name = re.sub(r'\s+', ' ', formatted_name).strip()
        
        return formatted_name
    
    def fix_common_spacing_issues(self, text: str) -> str:
        """Исправление частых проблем с пробелами"""
        if not text:
            return text
        
        # Специальные случаи
        fixes = [
            # "в поискеUX/UI" -> "в поиске UX/UI"
            (r'в поиске([A-Z])', r'в поиске \1'),
            # "UI/UXдизайнер" -> "UI/UX дизайнер"
            (r'UI/UX([а-яё])', r'UI/UX \1'),
            # "UX/UIдизайнер" -> "UX/UI дизайнер"
            (r'UX/UI([а-яё])', r'UX/UI \1'),
            # "вебдизайнер" -> "веб дизайнер"
            (r'веб([а-яё])', r'веб \1'),
            # "графикдизайнер" -> "график дизайнер"
            (r'график([а-яё])', r'график \1'),
            # "продуктдизайнер" -> "продукт дизайнер"
            (r'продукт([а-яё])', r'продукт \1'),
        ]
        
        cleaned_text = text
        for pattern, replacement in fixes:
            cleaned_text = re.sub(pattern, replacement, cleaned_text)
        
        return cleaned_text
    
    def clean_vacancy_data(self, vacancy_data: dict) -> dict:
        """Очистка данных вакансии"""
        cleaned_data = vacancy_data.copy()
        
        # Очищаем заголовок
        if 'title' in cleaned_data:
            cleaned_data['title'] = self.clean_text(cleaned_data['title'])
            cleaned_data['title'] = self.fix_common_spacing_issues(cleaned_data['title'])
        
        # Очищаем название компании
        if 'company' in cleaned_data:
            cleaned_data['company'] = self.format_company_name(cleaned_data['company'])
        
        # Очищаем описание
        if 'description' in cleaned_data:
            cleaned_data['description'] = self.clean_text(cleaned_data['description'])
            cleaned_data['description'] = self.fix_common_spacing_issues(cleaned_data['description'])
        
        # Очищаем полное описание
        if 'full_description' in cleaned_data:
            cleaned_data['full_description'] = self.clean_text(cleaned_data['full_description'])
            cleaned_data['full_description'] = self.fix_common_spacing_issues(cleaned_data['full_description'])
        
        return cleaned_data

# Глобальный экземпляр для использования в парсерах
text_cleaner = TextCleaner()

def clean_text(text: str) -> str:
    """Быстрая функция для очистки текста"""
    return text_cleaner.clean_text(text)

def format_company_name(company_name: str) -> str:
    """Быстрая функция для форматирования названия компании"""
    return text_cleaner.format_company_name(company_name)

def clean_vacancy_data(vacancy_data: dict) -> dict:
    """Быстрая функция для очистки данных вакансии"""
    return text_cleaner.clean_vacancy_data(vacancy_data)

# Примеры использования
if __name__ == "__main__":
    cleaner = TextCleaner()
    
    # Тестируем исправление пробелов
    test_cases = [
        "Мы в поискеUX/UI-дизайнера",
        "ОООАлкионика",
        "вебдизайнер",
        "UI/UXдизайнер",
        "продуктдизайнер"
    ]
    
    print("🧪 Тестирование очистки текста:")
    for test_case in test_cases:
        cleaned = cleaner.clean_text(test_case)
        print(f"  '{test_case}' -> '{cleaned}'")
    
    # Тестируем форматирование названий компаний
    company_cases = [
        "ОООАлкионика",
        "ОАОГазпром",
        "ЗАОРога и копыта",
        "ИПИванов"
    ]
    
    print("\n🏢 Тестирование форматирования названий компаний:")
    for company in company_cases:
        formatted = cleaner.format_company_name(company)
        print(f"  '{company}' -> '{formatted}'")
