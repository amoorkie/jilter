#!/usr/bin/env python3
"""
Упрощенный фильтр вакансий без pymorphy2
Версия: 1.0.0
Автор: AI Assistant
Дата: 2025-01-02
"""

import re
import logging
from typing import Dict, Any, List, Set


class SimpleVacancyFilter:
    """Упрощенный фильтр вакансий для digital-дизайнеров"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Ключевые слова для digital-дизайна
        self.positive_keywords = [
            'ui', 'ux', 'веб', 'web', 'интерфейс', 'interface', 'мобильный', 'mobile',
            'приложение', 'app', 'сайт', 'site', 'дизайн', 'design', 'графический',
            'graphic', 'бренд', 'brand', 'логотип', 'logo', 'иконка', 'icon',
            'прототип', 'prototype', 'фигма', 'figma', 'sketch', 'adobe', 'photoshop',
            'illustrator', 'индизайн', 'indesign', 'xd', 'zeplin', 'invision',
            'пользователь', 'user', 'опыт', 'experience', 'интерактив', 'interactive'
        ]
        
        # Негативные ключевые слова (не digital)
        self.negative_keywords = [
            'мебель', 'интерьер', 'ткань', 'одежда', 'обувь', 'текстиль', 'швей',
            'полиграф', 'упаковка', 'ландшафт', 'архитектур', 'строитель',
            'печать', 'изделий', 'производств', 'мода', 'фото', 'видео',
            'флорист', 'карандаш', 'ручка', 'лестниц', 'сад', 'садов',
            'ювелир', 'керамик', 'стекл', 'металл', 'дерев', 'камн', 'бетон'
        ]
    
    def _normalize_text(self, text: str) -> str:
        """Нормализация текста"""
        if not text:
            return ""
        
        # Приводим к нижнему регистру
        text = text.lower()
        
        # Убираем лишние пробелы
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def _has_positive_keywords(self, text: str) -> bool:
        """Проверяет наличие позитивных ключевых слов"""
        text = self._normalize_text(text)
        
        for keyword in self.positive_keywords:
            if keyword.lower() in text:
                return True
        
        return False
    
    def _has_negative_keywords(self, text: str) -> bool:
        """Проверяет наличие негативных ключевых слов"""
        text = self._normalize_text(text)
        
        for keyword in self.negative_keywords:
            if keyword.lower() in text:
                return True
        
        return False
    
    def is_vacancy_relevant(self, vacancy_data: Dict[str, Any]) -> tuple[bool, str]:
        """
        Проверяет релевантность вакансии для digital-дизайнеров
        
        Returns:
            tuple: (is_relevant: bool, reason: str)
        """
        try:
            # Извлекаем текстовые поля
            title = vacancy_data.get('title', '')
            company = vacancy_data.get('company', '')
            description = vacancy_data.get('description', '')
            full_description = vacancy_data.get('full_description', '')
            
            # Объединяем все поля для анализа
            combined_text = ' '.join([
                title, company, description, full_description
            ])
            
            if not combined_text.strip():
                return False, "Пустое описание вакансии"
            
            # Проверяем позитивные ключевые слова
            if not self._has_positive_keywords(combined_text):
                return False, "Отсутствуют ключевые слова digital-дизайна"
            
            # Проверяем негативные ключевые слова
            if self._has_negative_keywords(combined_text):
                return False, "Содержит ключевые слова не-digital сфер"
            
            return True, "Соответствует критериям digital-дизайна"
            
        except Exception as e:
            self.logger.error(f"Ошибка анализа вакансии: {e}")
            return False, f"Ошибка анализа: {str(e)}"
    
    def filter_vacancies(self, vacancies: List[Dict[str, Any]]) -> tuple[List[Dict[str, Any]], Dict[str, int]]:
        """
        Фильтрует список вакансий
        
        Returns:
            tuple: (filtered_vacancies, stats)
        """
        filtered_vacancies = []
        stats = {
            'total': len(vacancies),
            'relevant': 0,
            'filtered_out': 0,
            'reasons': {}
        }
        
        for vacancy in vacancies:
            is_relevant, reason = self.is_vacancy_relevant(vacancy)
            
            if is_relevant:
                filtered_vacancies.append(vacancy)
                stats['relevant'] += 1
                self.logger.info(f"Принята: {vacancy.get('title', 'Без названия')} - {reason}")
            else:
                stats['filtered_out'] += 1
                stats['reasons'][reason] = stats['reasons'].get(reason, 0) + 1
                self.logger.debug(f"Отклонена: {vacancy.get('title', 'Без названия')} - {reason}")
        
        return filtered_vacancies, stats


# Глобальный экземпляр фильтра
simple_vacancy_filter = SimpleVacancyFilter()


def filter_vacancy(vacancy_data: Dict[str, Any]) -> tuple[bool, str]:
    """
    Удобная функция для фильтрации одной вакансии
    
    Args:
        vacancy_data: Данные вакансии
        
    Returns:
        tuple: (is_relevant, reason)
    """
    filter_instance = SimpleVacancyFilter()
    return filter_instance.is_vacancy_relevant(vacancy_data)


def filter_vacancies_list(vacancies: List[Dict[str, Any]]) -> tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Удобная функция для фильтрации списка вакансий
    
    Args:
        vacancies: Список вакансий
        
    Returns:
        tuple: (filtered_vacancies, stats)
    """
    return simple_vacancy_filter.filter_vacancies(vacancies)




