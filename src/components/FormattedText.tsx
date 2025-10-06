// src/components/FormattedText.tsx
import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  if (!text || text.trim() === '') {
    return <p className="text-gray-500 italic">Не указано</p>;
  }

  // Разбиваем текст на абзацы и фильтруем пустые строки
  const paragraphs = text
    .split('\n')
    .map(p => p.trim())
    .filter(p => p !== '');

  if (paragraphs.length === 0) {
    return <p className="text-gray-500 italic">Не указано</p>;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.map((paragraph, index) => {
        // Проверяем, является ли абзац элементом списка (начинается с "- ", "• ", "* ")
        if (/^[-•*]\s/.test(paragraph)) {
          // Собираем все последующие элементы списка
          const listItems = [paragraph];
          for (let i = index + 1; i < paragraphs.length; i++) {
            if (/^[-•*]\s/.test(paragraphs[i])) {
              listItems.push(paragraphs[i]);
            } else {
              break;
            }
          }
          
          return (
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 ml-4">
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex} className="text-gray-700 leading-relaxed">
                  {item.replace(/^[-•*]\s/, '')}
                </li>
              ))}
            </ul>
          );
        }

        // Проверяем, является ли абзац нумерованным списком (начинается с "1. ", "2. " и т.д.)
        if (/^\d+\.\s/.test(paragraph)) {
          // Собираем все последующие элементы нумерованного списка
          const listItems = [paragraph];
          for (let i = index + 1; i < paragraphs.length; i++) {
            if (/^\d+\.\s/.test(paragraphs[i])) {
              listItems.push(paragraphs[i]);
            } else {
              break;
            }
          }
          
          return (
            <ol key={`ordered-list-${index}`} className="list-decimal list-inside space-y-1 ml-4">
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex} className="text-gray-700 leading-relaxed">
                  {item.replace(/^\d+\.\s/, '')}
                </li>
              ))}
            </ol>
          );
        }

        // Проверяем, является ли абзац заголовком (содержит ":" в конце или написан ЗАГЛАВНЫМИ)
        if (paragraph.endsWith(':') || /^[А-ЯЁ\s]+$/.test(paragraph)) {
          return (
            <h4 key={index} className="font-semibold text-gray-900 mt-4 mb-2">
              {paragraph}
            </h4>
          );
        }

        // Обычный абзац с поддержкой жирного текста
        const formattedParagraph = paragraph
          // Жирный текст в **текст** или __текст__
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/__(.*?)__/g, '<strong>$1</strong>')
          // Курсив в *текст* или _текст_
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/_(.*?)_/g, '<em>$1</em>');

        return (
          <p 
            key={index} 
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedParagraph }}
          />
        );
      })}
    </div>
  );
};


export default FormattedText;
