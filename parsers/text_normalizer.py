#!/usr/bin/env python3
"""
Локальная нормализация текста вакансий без API
Альтернатива ChatGPT для случаев, когда API недоступен
"""

import re
import logging
from typing import Dict, Any, Optional
from text_cleaner import clean_vacancy_data

class TextNormalizer:
    """Локальная нормализация текста вакансий"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Паттерны для нормализации
        self.normalization_rules = {
            # Нормализация названий должностей
            'job_titles': {
                r'ui/ux\s*дизайнер': 'UI/UX дизайнер',
                r'ui\s*дизайнер': 'UI дизайнер', 
                r'ux\s*дизайнер': 'UX дизайнер',
                r'веб\s*дизайнер': 'Веб-дизайнер',
                r'графический\s*дизайнер': 'Графический дизайнер',
                r'продуктовый\s*дизайнер': 'Продуктовый дизайнер',
                r'дизайнер\s*интерфейсов': 'Дизайнер интерфейсов',
                r'дизайнер\s*опыта': 'Дизайнер пользовательского опыта'
            },
            
            # Нормализация навыков
            'skills': {
                r'figma': 'Figma',
                r'sketch': 'Sketch',
                r'adobe\s*photoshop': 'Adobe Photoshop',
                r'adobe\s*illustrator': 'Adobe Illustrator',
                r'adobe\s*xd': 'Adobe XD',
                r'principle': 'Principle',
                r'invision': 'InVision',
                r'zeplin': 'Zeplin'
            },
            
            # Нормализация типов занятости
            'employment': {
                r'удаленн[а-я]*\s*работа': 'Удаленная работа',
                r'офисн[а-я]*\s*работа': 'Офисная работа',
                r'гибридн[а-я]*\s*формат': 'Гибридный формат',
                r'полн[а-я]*\s*занятость': 'Полная занятость',
                r'частичн[а-я]*\s*занятость': 'Частичная занятость'
            }
        }
    
    def normalize_vacancy(self, vacancy: Dict[str, Any]) -> Dict[str, Any]:
        """Нормализация вакансии"""
        try:
            # Сначала применяем базовую очистку
            vacancy = clean_vacancy_data(vacancy)
            
            # Нормализуем каждое поле
            normalized_vacancy = vacancy.copy()
            
            # Нормализация заголовка
            if 'title' in normalized_vacancy:
                normalized_vacancy['title'] = self._normalize_text(
                    normalized_vacancy['title'], 
                    'job_titles'
                )
            
            # Нормализация описания
            if 'description' in normalized_vacancy:
                normalized_vacancy['description'] = self._normalize_text(
                    normalized_vacancy['description'],
                    ['job_titles', 'skills', 'employment']
                )
            
            # Нормализация полного описания
            if 'full_description' in normalized_vacancy:
                normalized_vacancy['full_description'] = self._normalize_text(
                    normalized_vacancy['full_description'],
                    ['job_titles', 'skills', 'employment']
                )
            
            # Нормализация требований
            if 'requirements' in normalized_vacancy:
                normalized_vacancy['requirements'] = self._normalize_text(
                    normalized_vacancy['requirements'],
                    ['skills', 'employment']
                )
            
            # Нормализация условий
            if 'conditions' in normalized_vacancy:
                normalized_vacancy['conditions'] = self._normalize_text(
                    normalized_vacancy['conditions'],
                    ['employment']
                )
            
            self.logger.info(f"✅ Вакансия нормализована: {normalized_vacancy.get('title', 'Без названия')}")
            return normalized_vacancy
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка нормализации: {e}")
            return vacancy
    
    def _normalize_text(self, text: str, rule_categories: list) -> str:
        """Нормализация текста по правилам"""
        if not text:
            return text
        
        normalized_text = text
        
        for category in rule_categories:
            if category in self.normalization_rules:
                for pattern, replacement in self.normalization_rules[category].items():
                    normalized_text = re.sub(
                        pattern, 
                        replacement, 
                        normalized_text, 
                        flags=re.IGNORECASE
                    )
        
        return normalized_text
    
    def normalize_batch(self, vacancies: list) -> list:
        """Нормализация списка вакансий"""
        normalized_vacancies = []
        
        for vacancy in vacancies:
            try:
                normalized_vacancy = self.normalize_vacancy(vacancy)
                normalized_vacancies.append(normalized_vacancy)
            except Exception as e:
                self.logger.error(f"❌ Ошибка нормализации вакансии: {e}")
                normalized_vacancies.append(vacancy)  # Возвращаем исходную
        
        return normalized_vacancies


def normalize_vacancy_text(vacancy: Dict[str, Any]) -> Dict[str, Any]:
    """Функция-обертка для нормализации вакансии"""
    normalizer = TextNormalizer()
    return normalizer.normalize_vacancy(vacancy)


# Пример использования
if __name__ == "__main__":
    # Настройка логирования
    logging.basicConfig(level=logging.INFO)
    
    # Тестовые данные
    test_vacancy = {
        'title': 'ui/ux дизайнер в команду',
        'company': 'ООО Технологии',
        'description': 'нужен ui дизайнер со знанием figma и sketch',
        'full_description': 'Работа с figma, adobe photoshop, принципы ux дизайна',
        'requirements': 'Знание figma, sketch, adobe xd',
        'conditions': 'удаленная работа, гибридный формат'
    }
    
    print("Тестирование локальной нормализации")
    print("=" * 50)
    
    print("Исходные данные:")
    for key, value in test_vacancy.items():
        print(f"  {key}: '{value}'")
    
    # Нормализация
    normalizer = TextNormalizer()
    normalized = normalizer.normalize_vacancy(test_vacancy)
    
    print("\nНормализованные данные:")
    for key, value in normalized.items():
        print(f"  {key}: '{value}'")
    
    print("\nТест завершен!")
