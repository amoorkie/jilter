'use client';

import { useState } from 'react';

interface TextNormalizerProps {
  onNormalize?: (normalized: string) => void;
  initialText?: string;
  type?: string;
}

export default function TextNormalizer({ 
  onNormalize, 
  initialText = '', 
  type = 'general' 
}: TextNormalizerProps) {
  const [originalText, setOriginalText] = useState(initialText);
  const [normalizedText, setNormalizedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNormalize = async () => {
    if (!originalText.trim()) {
      setError('Введите текст для нормализации');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/normalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: originalText,
          type: type
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка нормализации');
      }

      const data = await response.json();
      setNormalizedText(data.normalized);
      
      if (onNormalize) {
        onNormalize(data.normalized);
      }
    } catch (err) {
      setError('Ошибка при нормализации текста');
      console.error('Normalization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(normalizedText);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Исходный текст:
        </label>
        <textarea
          value={originalText}
          onChange={(e) => setOriginalText(e.target.value)}
          className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Введите текст для нормализации..."
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleNormalize}
          disabled={isLoading || !originalText.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Нормализация...' : 'Нормализовать'}
        </button>
        
        {normalizedText && (
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Копировать
          </button>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {normalizedText && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Нормализованный текст:
          </label>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <pre className="whitespace-pre-wrap text-sm">{normalizedText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}








