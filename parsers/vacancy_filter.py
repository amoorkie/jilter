#!/usr/bin/env python3
"""
Умная фильтрация вакансий для digital-дизайнеров

Версия: 1.0.0
Автор: AI Assistant
Дата: 2025-01-02
"""

import re
import logging
from typing import Dict, Any, List, Set

# Морфологический анализ (опционально)
try:
    import pymorphy2
    MORPH_AVAILABLE = True
except ImportError:
    MORPH_AVAILABLE = False
    logging.warning("pymorphy2 не установлен. Морфологический анализ недоступен.")


class VacancyFilter:
    """Класс для фильтрации вакансий digital-дизайнеров"""
    
    # Регулярные выражения для негативных контекстов
    NEGATIVE_PATTERNS = [
        # Дизайнер + не-digital сферы
        r'дизайн(?:ер(?:а|у|ом|ов|ами|ы)?|а|у|ом)?\s+(?:мебел|интерьер|ткани|одежд|обув|текстил|швей|полиграф|упаковк|лендшафт|ландшафт|архитектур|строитель|строительств|печат|изделий|производств|мод|фото|видео|веб-мастер|верстальщик|флорист|карандаш|ручк|каскад|лестниц|сад|садов|ювелир|керамик|стекл|металл|дерев|камн|бетон|кирпич)',
        
        # Дизайнер-конструктор и подобные
        r'дизайнер-(?:конструктор|технолог|проектировщик|архитектор|строитель)',
        
        # Специфичные не-digital роли
        r'(?:модельер|стилист|имиджмейкер|визажист|парикмахер|флорист|декоратор|оформитель)\s+(?:одежды|интерьеров|мероприятий|витрин|залов)',
        
        # Промышленный дизайн (не digital)
        r'(?:промышленный|индустриальный|технический|инженерный|конструкторский)\s+дизайн(?:ер)?',
        
        # Дизайн + физические материалы/процессы
        r'дизайн\s+(?:и\s+)?(?:производство|изготовление|пошив|вышивка|роспись|резьба|ковка|литье|штамповка)',
        
        # Традиционные ремесла
        r'(?:художественный|декоративно-прикладной|народный|этнический)\s+дизайн',
        
        # Архитектура и строительство
        r'(?:архитектурный|строительный|градостроительный|ландшафтный)\s+дизайн',
        
        # Полиграфия и печать (если не digital)
        r'(?:полиграфический|типографский|печатный)\s+дизайн',
        
        # Мода и текстиль
        r'(?:модный|fashion|текстильный|швейный)\s+дизайн(?:ер)?',
        
        # Специфичные исключения
        r'дизайн(?:ер)?\s+(?:по\s+)?(?:металлу|дереву|стеклу|керамике|коже|меху|обуви|сумок|аксессуаров|украшений|часов)',
        
        # Образовательные и консультационные роли (если не про digital)
        r'(?:преподаватель|учитель|инструктор|консультант|эксперт)\s+(?:по\s+)?дизайну\s+(?:одежды|интерьеров|ландшафта)',
    ]
    
    # Позитивные паттерны для digital-дизайна
    POSITIVE_PATTERNS = [
        # UI/UX роли
        r'(?:ui|ux|ui/ux|ux/ui)\s*(?:дизайнер|designer)',
        r'(?:продуктовый|интерфейсный|визуальный)\s+дизайнер',
        r'(?:product|interface|visual|interaction)\s+designer',
        
        # Digital-специфичные термины
        r'(?:веб|web|мобильный|mobile|цифровой|digital)\s+дизайн(?:ер)?',
        r'дизайн(?:ер)?\s+(?:интерфейсов|приложений|сайтов|веб-сайтов)',
        
        # Инструменты и процессы
        r'(?:figma|sketch|adobe\s+xd|photoshop|illustrator)',
        r'(?:прототипирование|wireframe|mockup|дизайн-система)',
        r'(?:user\s+experience|user\s+interface|пользовательский\s+опыт)',
    ]
    
    # Позитивные индикаторы (digital-дизайн)
    POSITIVE_KEYWORDS = {
        # Основные термины
        'ui', 'ux', 'ui/ux', 'ux/ui', 'uiux', 'uxui',
        'интерфейс', 'интерфейсы', 'интерфейсов', 'интерфейсный', 'интерфейсная',
        'прототип', 'прототипы', 'прототипов', 'прототипирование',
        'макет', 'макеты', 'макетов', 'макетирование',
        
        # Инструменты
        'figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'xd', 'after effects',
        'principle', 'framer', 'invision', 'zeplin', 'marvel', 'axure',
        'miro', 'figjam', 'whimsical', 'balsamiq',
        
        # Роли и специализации
        'продуктовый дизайнер', 'продуктовая дизайнер', 'product designer',
        'интерфейсный дизайнер', 'интерфейсная дизайнер',
        'визуальный дизайнер', 'визуальная дизайнер', 'visual designer',
        'ux дизайнер', 'ui дизайнер', 'ux-дизайнер', 'ui-дизайнер',
        'motion designer', 'motion дизайнер', 'моушн дизайнер',
        'web дизайнер', 'веб дизайнер', 'веб-дизайнер', 'web designer',
        'mobile дизайнер', 'мобильный дизайнер', 'mobile designer',
        'graphic designer', 'графический дизайнер',
        'арт-директор', 'арт директор', 'art director', 'creative director',
        'дизайн-лид', 'design lead', 'lead designer', 'senior designer',
        
        # Процессы и методологии
        'дизайн-мышление', 'design thinking', 'дизайн мышление',
        'user experience', 'user interface', 'пользовательский опыт',
        'interaction design', 'ixd', 'интеракшн дизайн',
        'дизайн-систем', 'design system', 'дизайн система',
        'user research', 'пользовательские исследования',
        'usability', 'юзабилити', 'тестирование интерфейсов',
        
        # Артефакты и результаты
        'wireframe', 'вайрфрейм', 'каркас',
        'mockup', 'мокап', 'мокапы',
        'иконки', 'иконка', 'icons', 'icon design',
        'типографик', 'typography', 'шрифт',
        'цветоведени', 'color theory', 'цветовая схема',
        'a11y', 'accessibility', 'доступность',
        'responsive', 'адаптив', 'мобильная версия',
        
        # Формы слова "дизайн"
        'дизайн', 'дизайна', 'дизайну', 'дизайном', 'дизайне',
        'дизайнер', 'дизайнера', 'дизайнеру', 'дизайнером', 'дизайнере',
        'дизайнеры', 'дизайнеров', 'дизайнерам', 'дизайнерами', 'дизайнерах',
        'дизайнил', 'дизайнила', 'дизайнить', 'дизайнят',
        
        # Дополнительные термины
        'лендинг', 'landing', 'сайт', 'website', 'приложение', 'app',
        'интерфейсы', 'dashboard', 'дашборд', 'админка',
        'брендинг', 'branding', 'айдентика', 'identity',
        'презентации', 'presentation design'
    }
    
    # Негативные индикаторы (не digital-дизайн)
    NEGATIVE_KEYWORDS = {
        # Архитектура и строительство
        'архитектур', 'архитектор', 'строитель', 'строит', 'строим', 'строительств',
        'проектировщик', 'инженер-проектировщик', 'чертежи', 'сметы',
        'бетон', 'кирпич', 'фундамент', 'кровля', 'фасад',
        
        # Мода и текстиль
        'одежд', 'мода', 'модный', 'швей', 'швея', 'портной',
        'текстил', 'ткани', 'выкройки', 'коллекция одежды',
        'fashion', 'стилист', 'имидж', 'показ мод',
        
        # Полиграфия и печать
        'полиграф', 'печат', 'типография', 'офсет', 'флексо',
        'буклет', 'листовки', 'календари', 'визитки',
        'препресс', 'постпечатная обработка',
        
        # Ландшафт и интерьер (если не digital)
        'лендш', 'ландшафт', 'садовод', 'озеленение',
        'интерьер', 'мебель', 'декор', 'ремонт',
        
        # Фотография (если основная специальность)
        'фотограф', 'фото-', 'фотосъемка', 'фотостудия',
        'свадебная съемка', 'портретная съемка',
        
        # IT-разработка (если не дизайн)
        'backend', 'frontend', 'fullstack', 'full-stack',
        'программист', 'разработчик', 'developer',
        'python', 'java', 'javascript', 'react', 'vue', 'angular',
        'node.js', 'php', 'c++', 'c#', '.net',
        'базы данных', 'sql', 'mongodb', 'postgresql',
        'devops', 'системный администратор', 'sysadmin',
        'тестировщик', 'qa', 'автотесты',
        'аналитик', 'data scientist', 'ml', 'машинное обучение',
        'security', 'информационная безопасность',
        
        # Маркетинг и продажи (если не дизайн)
        'маркетолог', 'smm', 'контент-менеджер', 'копирайтер',
        'seo', 'контекстная реклама', 'таргетинг',
        'менеджер по продажам', 'продаж', 'sales',
        'call-центр', 'телефонные продажи',
        
        # Другие профессии
        'курьер', 'водител', 'логист', 'грузчик',
        'администратор', 'секретарь', 'офис-менеджер',
        'бухгалтер', 'экономист', 'финансист',
        'юрист', 'правовед', 'нотариус',
        'hr', 'рекрутер', 'кадровик',
        'врач', 'медсестра', 'фармацевт',
        'учитель', 'преподаватель', 'тренер',
        'повар', 'официант', 'бармен',
        'охранник', 'консьерж', 'уборщик'
    }
    
    # Исключения - слова, которые могут быть в негативном списке, но в контексте дизайна допустимы
    CONTEXT_EXCEPTIONS = {
        'frontend': ['дизайн', 'ui', 'ux', 'интерфейс', 'макет'],
        'разработчик': ['дизайн', 'ui', 'ux', 'интерфейс'],
        'программист': ['дизайн', 'ui', 'ux'],
        'маркетолог': ['креатив', 'дизайн', 'визуал', 'брендинг']
    }
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Инициализируем морфологический анализатор
        if MORPH_AVAILABLE:
            try:
                self.morph = pymorphy2.MorphAnalyzer()
                self.logger.info("Морфологический анализатор инициализирован")
            except Exception as e:
                self.logger.warning(f"Ошибка инициализации морфологического анализатора: {e}")
                self.morph = None
        else:
            self.morph = None
    
    def _normalize_text(self, text: str) -> str:
        """Нормализация текста для анализа с морфологией"""
        if not text:
            return ""
        
        # Приводим к нижнему регистру
        text = text.lower()
        
        # Убираем лишние пробелы и символы
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s\-/]', ' ', text)
        
        # Морфологическая нормализация (если доступна)
        if self.morph:
            try:
                words = text.split()
                normalized_words = []
                
                for word in words:
                    if len(word) > 2:  # Игнорируем короткие слова
                        parsed = self.morph.parse(word)[0]
                        normalized_words.append(parsed.normal_form)
                    else:
                        normalized_words.append(word)
                
                text = ' '.join(normalized_words)
            except Exception as e:
                self.logger.debug(f"Ошибка морфологической нормализации: {e}")
        
        return text.strip()
    
    def _has_positive_patterns(self, text: str) -> tuple[bool, List[str]]:
        """Проверка на наличие позитивных паттернов (регулярные выражения)"""
        found_patterns = []
        
        for pattern in self.POSITIVE_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                found_patterns.extend(matches)
        
        return len(found_patterns) > 0, found_patterns
    
    def _has_positive_indicators(self, text: str) -> tuple[bool, List[str]]:
        """Проверка на наличие позитивных индикаторов"""
        # Сначала проверяем паттерны (более точные)
        has_patterns, pattern_matches = self._has_positive_patterns(text)
        
        # Затем проверяем обычные ключевые слова
        found_keywords = []
        for keyword in self.POSITIVE_KEYWORDS:
            if keyword in text:
                found_keywords.append(keyword)
        
        # Объединяем результаты
        all_matches = pattern_matches + found_keywords
        return len(all_matches) > 0, all_matches
    
    def _has_negative_patterns(self, text: str) -> tuple[bool, List[str]]:
        """Проверка на наличие негативных паттернов (регулярные выражения)"""
        found_patterns = []
        
        for pattern in self.NEGATIVE_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                found_patterns.extend(matches)
        
        return len(found_patterns) > 0, found_patterns
    
    def _has_negative_indicators(self, text: str, title: str = "") -> tuple[bool, List[str]]:
        """Проверка на наличие негативных индикаторов с учетом контекста"""
        # Сначала проверяем паттерны (более точные)
        has_patterns, pattern_matches = self._has_negative_patterns(text)
        if has_patterns:
            return True, [f"Паттерн: {match}" for match in pattern_matches[:3]]  # Показываем первые 3
        
        # Затем проверяем обычные ключевые слова
        found_keywords = []
        
        for keyword in self.NEGATIVE_KEYWORDS:
            if keyword in text:
                # Проверяем исключения по контексту
                if keyword in self.CONTEXT_EXCEPTIONS:
                    context_words = self.CONTEXT_EXCEPTIONS[keyword]
                    has_context = any(ctx_word in text for ctx_word in context_words)
                    
                    if has_context:
                        self.logger.debug(f"Негативное слово '{keyword}' найдено, но есть контекст дизайна")
                        continue
                
                found_keywords.append(keyword)
        
        return len(found_keywords) > 0, found_keywords
    
    def _analyze_title_weight(self, title: str) -> float:
        """Анализ веса заголовка (заголовок важнее описания)"""
        title_normalized = self._normalize_text(title)
        
        # Высокий вес, если в заголовке есть четкие дизайнерские термины
        high_weight_terms = [
            'дизайнер', 'designer', 'ui', 'ux', 'продуктовый дизайнер',
            'интерфейсный дизайнер', 'визуальный дизайнер', 'арт-директор'
        ]
        
        for term in high_weight_terms:
            if term in title_normalized:
                return 2.0  # Высокий вес
        
        # Средний вес для общих дизайнерских терминов
        medium_weight_terms = ['дизайн', 'design', 'creative', 'visual']
        
        for term in medium_weight_terms:
            if term in title_normalized:
                return 1.5  # Средний вес
        
        return 1.0  # Обычный вес
    
    def is_vacancy_relevant(self, vacancy_data: Dict[str, Any]) -> tuple[bool, str]:
        """
        Проверяет релевантность вакансии для digital-дизайнеров
        
        Returns:
            tuple: (is_relevant: bool, reason: str)
        """
        try:
            # Извлекаем и нормализуем текстовые поля
            title = self._normalize_text(vacancy_data.get('title', ''))
            company = self._normalize_text(vacancy_data.get('company', ''))
            description = self._normalize_text(vacancy_data.get('description', ''))
            full_description = self._normalize_text(vacancy_data.get('full_description', ''))
            requirements = self._normalize_text(vacancy_data.get('requirements', ''))
            tasks = self._normalize_text(vacancy_data.get('tasks', ''))
            
            # Объединяем все поля для анализа
            combined_text = ' '.join([
                title, company, description, full_description, requirements, tasks
            ])
            
            if not combined_text.strip():
                return False, "Пустое описание вакансии"
            
            # Анализируем заголовок отдельно (он важнее)
            title_weight = self._analyze_title_weight(title)
            
            # Проверяем позитивные индикаторы
            has_positive, positive_keywords = self._has_positive_indicators(combined_text)
            
            if not has_positive:
                return False, "Отсутствуют ключевые слова digital-дизайна"
            
            # Проверяем негативные индикаторы
            has_negative, negative_keywords = self._has_negative_indicators(combined_text, title)
            
            if has_negative:
                # Если негативные индикаторы в заголовке - точно отклоняем
                title_has_negative, title_negative = self._has_negative_indicators(title)
                if title_has_negative:
                    return False, f"Негативные индикаторы в заголовке: {', '.join(title_negative)}"
                
                # Если заголовок имеет высокий вес дизайна, игнорируем негативные в описании
                if title_weight >= 2.0:
                    self.logger.info(f"Заголовок имеет высокий дизайнерский вес, игнорируем негативные в описании")
                else:
                    return False, f"Негативные индикаторы: {', '.join(negative_keywords)}"
            
            # Дополнительная проверка качества
            positive_score = len(positive_keywords) * title_weight
            
            if positive_score < 1.5:
                return False, f"Низкий рейтинг релевантности: {positive_score:.1f}"
            
            reason = f"Релевантная вакансия (рейтинг: {positive_score:.1f}, ключевые слова: {', '.join(positive_keywords[:3])})"
            return True, reason
            
        except Exception as e:
            self.logger.error(f"Ошибка при фильтрации вакансии: {e}")
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
                self.logger.info(f"✅ Принята: {vacancy.get('title', 'Без названия')} - {reason}")
            else:
                stats['filtered_out'] += 1
                stats['reasons'][reason] = stats['reasons'].get(reason, 0) + 1
                self.logger.debug(f"❌ Отклонена: {vacancy.get('title', 'Без названия')} - {reason}")
        
        return filtered_vacancies, stats


# Глобальный экземпляр фильтра
vacancy_filter = VacancyFilter()


def filter_vacancy(vacancy_data: Dict[str, Any]) -> tuple[bool, str]:
    """
    Удобная функция для фильтрации одной вакансии
    
    Args:
        vacancy_data: Данные вакансии
        
    Returns:
        tuple: (is_relevant, reason)
    """
    return vacancy_filter.is_vacancy_relevant(vacancy_data)


def filter_vacancies_list(vacancies: List[Dict[str, Any]]) -> tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Удобная функция для фильтрации списка вакансий
    
    Args:
        vacancies: Список вакансий
        
    Returns:
        tuple: (filtered_vacancies, stats)
    """
    return vacancy_filter.filter_vacancies(vacancies)


if __name__ == "__main__":
    # Тестирование фильтра
    test_vacancies = [
        {
            'title': 'UI/UX дизайнер',
            'company': 'IT компания',
            'description': 'Ищем дизайнера интерфейсов для работы с Figma',
            'requirements': 'Опыт работы с UI/UX, знание Figma, Sketch'
        },
        {
            'title': 'Frontend разработчик',
            'company': 'Веб-студия',
            'description': 'Нужен программист для верстки сайтов',
            'requirements': 'JavaScript, React, HTML, CSS'
        },
        {
            'title': 'Дизайнер одежды',
            'company': 'Модный дом',
            'description': 'Создание коллекций одежды',
            'requirements': 'Опыт в fashion индустрии'
        }
    ]
    
    filtered, stats = filter_vacancies_list(test_vacancies)
    
    print(f"Всего вакансий: {stats['total']}")
    print(f"Релевантных: {stats['relevant']}")
    print(f"Отфильтровано: {stats['filtered_out']}")
    print("\nПричины фильтрации:")
    for reason, count in stats['reasons'].items():
        print(f"  {reason}: {count}")
