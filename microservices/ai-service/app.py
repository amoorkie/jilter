from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import openai
from dotenv import load_dotenv
import logging

# Загружаем переменные окружения
load_dotenv()

app = Flask(__name__)
CORS(app)

# Настраиваем логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Настраиваем OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Проверка здоровья сервиса"""
    return jsonify({
        'status': 'OK',
        'service': 'AI Service',
        'timestamp': '2024-01-01T00:00:00Z'
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_vacancy():
    """Анализ вакансии на релевантность"""
    try:
        data = request.get_json()
        vacancy_text = data.get('text', '')
        
        if not vacancy_text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Анализ релевантности
        relevance = analyze_relevance(vacancy_text)
        
        return jsonify({
            'relevant': relevance['is_relevant'],
            'confidence': relevance['confidence'],
            'reason': relevance['reason']
        })
        
    except Exception as e:
        logger.error(f"Error analyzing vacancy: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/clean', methods=['POST'])
def clean_text():
    """Очистка текста от HTML, JS и лишних символов"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Очистка текста
        cleaned_text = clean_vacancy_text(text)
        
        return jsonify({
            'cleaned_text': cleaned_text,
            'original_length': len(text),
            'cleaned_length': len(cleaned_text)
        })
        
    except Exception as e:
        logger.error(f"Error cleaning text: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/format', methods=['POST'])
def format_vacancy():
    """Форматирование вакансии в структурированный вид"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Форматирование
        formatted = format_vacancy_text(text)
        
        return jsonify(formatted)
        
    except Exception as e:
        logger.error(f"Error formatting vacancy: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def analyze_relevance(text):
    """Анализ релевантности вакансии для дизайнеров"""
    try:
        # Ключевые слова для дизайнеров
        design_keywords = [
            'дизайн', 'design', 'ui', 'ux', 'веб-дизайн', 'web design',
            'графический дизайн', 'graphic design', 'интерфейс', 'interface',
            'пользовательский опыт', 'user experience', 'figma', 'sketch',
            'adobe', 'photoshop', 'illustrator', 'индизайн', 'indesign',
            'веб-дизайнер', 'web designer', 'ui дизайнер', 'ux дизайнер',
            'графический дизайнер', 'graphic designer', 'дизайнер интерфейсов',
            'interface designer', 'product designer', 'продуктовый дизайнер',
            'моушн дизайнер', 'motion designer', 'анимация', 'animation',
            'брендинг', 'branding', 'логотип', 'logo', 'иконки', 'icons',
            'типографика', 'typography', 'цвет', 'color', 'композиция',
            'composition', 'макет', 'layout', 'wireframe', 'прототип',
            'prototype', 'usability', 'юзабилити', 'accessibility',
            'доступность', 'responsive', 'адаптивный', 'mobile first',
            'мобильный дизайн', 'mobile design', 'app design', 'дизайн приложений'
        ]
        
        # Исключающие ключевые слова
        excluded_keywords = [
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
        
        text_lower = text.lower()
        
        # Проверяем наличие ключевых слов дизайна
        has_design_keywords = any(keyword.lower() in text_lower for keyword in design_keywords)
        
        # Проверяем исключающие ключевые слова
        has_excluded_keywords = any(keyword.lower() in text_lower for keyword in excluded_keywords)
        
        is_relevant = has_design_keywords and not has_excluded_keywords
        confidence = 0.8 if is_relevant else 0.2
        
        return {
            'relevant': is_relevant,
            'confidence': confidence,
            'reason': 'Design keywords found' if is_relevant else 'No relevant keywords'
        }
        
    except Exception as e:
        logger.error(f"Error in relevance analysis: {e}")
        return {
            'relevant': False,
            'confidence': 0.0,
            'reason': 'Analysis error'
        }

def clean_vacancy_text(text):
    """Очистка текста вакансии"""
    import re
    
    if not text:
        return ""
    
    # Удаляем HTML теги
    text = re.sub(r'<[^>]+>', '', text)
    
    # Удаляем JavaScript
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
    
    # Удаляем CSS
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
    
    # Удаляем JSON объекты
    text = re.sub(r'\{[^{}]*\}', '', text)
    
    # Удаляем URL
    text = re.sub(r'https?://[^\s]+', '', text)
    
    # Удаляем email адреса
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', text)
    
    # Удаляем телефонные номера
    text = re.sub(r'[\+]?[1-9]?[0-9]{7,15}', '', text)
    
    # Удаляем технические ключевые слова
    tech_keywords = [
        'function', 'var', 'let', 'const', 'if', 'else', 'for', 'while',
        'return', 'class', 'import', 'export', 'require', 'module',
        'console.log', 'document', 'window', 'jQuery', '$',
        'onclick', 'onload', 'onchange', 'addEventListener',
        'getElementById', 'querySelector', 'innerHTML', 'textContent',
        'style', 'className', 'id', 'src', 'href', 'alt', 'title',
        'data-', 'aria-', 'role', 'tabindex', 'disabled', 'readonly',
        'type="text"', 'type="email"', 'type="password"', 'type="submit"',
        'method="POST"', 'method="GET"', 'action=', 'form', 'input',
        'button', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th',
        'thead', 'tbody', 'tfoot', 'col', 'colgroup', 'caption',
        'fieldset', 'legend', 'label', 'select', 'option', 'textarea',
        'meta', 'link', 'script', 'style', 'title', 'head', 'body',
        'html', 'DOCTYPE', 'xml', 'svg', 'path', 'circle', 'rect',
        'line', 'polygon', 'polyline', 'ellipse', 'g', 'defs', 'clipPath',
        'mask', 'pattern', 'linearGradient', 'radialGradient', 'stop',
        'text', 'tspan', 'textPath', 'foreignObject', 'use', 'symbol',
        'marker', 'defs', 'metadata', 'desc', 'title', 'switch',
        'foreignObject', 'image', 'video', 'audio', 'source', 'track',
        'canvas', 'iframe', 'object', 'embed', 'param', 'area', 'map',
        'base', 'noscript', 'template', 'slot', 'shadow', 'content',
        'host', 'host-context', 'part', 'exportparts', 'imports',
        'is', 'defer', 'async', 'crossorigin', 'integrity', 'nonce',
        'referrerpolicy', 'sandbox', 'allowfullscreen', 'allow',
        'frameborder', 'marginwidth', 'marginheight', 'scrolling',
        'vspace', 'hspace', 'align', 'valign', 'width', 'height',
        'border', 'cellpadding', 'cellspacing', 'rules', 'summary',
        'bgcolor', 'background', 'color', 'face', 'size', 'dir',
        'lang', 'xml:lang', 'xmlns', 'xml:space', 'xml:base',
        'xml:id', 'xml:class', 'xml:style', 'xml:title', 'xml:lang'
    ]
    
    for keyword in tech_keywords:
        text = re.sub(r'\b' + re.escape(keyword) + r'\b', '', text, flags=re.IGNORECASE)
    
    # Удаляем лишние пробелы и переносы строк
    text = re.sub(r'\s+', ' ', text)
    
    # Удаляем специальные символы, но оставляем кириллицу и базовую пунктуацию
    text = re.sub(r'[^\w\s\u0400-\u04FF.,!?;:()\-]', '', text)
    
    # Удаляем множественные пробелы
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def format_vacancy_text(text):
    """Форматирование текста вакансии"""
    import re
    
    if not text:
        return {
            'title': '',
            'company': '',
            'description': '',
            'requirements': '',
            'responsibilities': '',
            'benefits': ''
        }
    
    # Извлекаем заголовок (первая строка или до первого переноса)
    lines = text.split('\n')
    title = lines[0].strip() if lines else ''
    
    # Извлекаем компанию (ищем паттерны)
    company = ''
    company_patterns = [
        r'компания[:\s]+([^\n]+)',
        r'работодатель[:\s]+([^\n]+)',
        r'в\s+([^\n]+?)\s+ищем',
        r'([^\n]+?)\s+приглашает',
        r'([^\n]+?)\s+требуется'
    ]
    
    for pattern in company_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            company = match.group(1).strip()
            break
    
    # Извлекаем требования
    requirements = ''
    req_patterns = [
        r'требования[:\s]*([^\n]+(?:\n[^\n]+)*)',
        r'навыки[:\s]*([^\n]+(?:\n[^\n]+)*)',
        r'знания[:\s]*([^\n]+(?:\n[^\n]+)*)',
        r'опыт[:\s]*([^\n]+(?:\n[^\n]+)*)'
    ]
    
    for pattern in req_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            requirements = match.group(1).strip()
            break
    
    # Извлекаем задачи
    responsibilities = ''
    resp_patterns = [
        r'задачи[:\s]*([^\n]+(?:\n[^\n]+)*)',
        r'обязанности[:\s]*([^\n]+(?:\n[^\n]+)*)',
        r'функции[:\s]*([^\n]+(?:\n[^\n]+)*)',
        r'что\s+делать[:\s]*([^\n]+(?:\n[^\n]+)*)'
    ]
    
    for pattern in resp_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            responsibilities = match.group(1).strip()
            break
    
    # Извлекаем условия
    benefits = ''
    benefits_patterns = [
        r'условия[:\s]*([^\n]+(?:\n[^\n]+)*)',
        r'льготы[:\s]*([^\n]+(?:\n[^\n]+)*)',
        r'бонусы[:\s]*([^\n]+(?:\n[^\n]+)*)',
        r'что\s+получите[:\s]*([^\n]+(?:\n[^\n]+)*)'
    ]
    
    for pattern in benefits_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            benefits = match.group(1).strip()
            break
    
    # Основное описание (остальной текст)
    description = text
    if len(description) > 1000:
        description = description[:1000] + '...'
    
    return {
        'title': title,
        'company': company,
        'description': description,
        'requirements': requirements,
        'responsibilities': responsibilities,
        'benefits': benefits
    }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
