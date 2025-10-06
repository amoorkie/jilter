'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ParseStats {
  total_found: number;
  total_saved: number;
  by_source: Record<string, { found: number; saved: number }>;
  duration: number;
}

interface ParseResponse {
  success: boolean;
  message: string;
  stats?: ParseStats;
  output?: string;
  errors?: string;
  error?: string;
  details?: string;
}

interface PythonParserControlProps {
  onParseComplete?: () => void;
}

const PythonParserControl: React.FC<PythonParserControlProps> = ({ onParseComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ParseResponse | null>(null);
  const [query, setQuery] = useState('дизайнер');
  const [pages, setPages] = useState(5);
  const [selectedSources, setSelectedSources] = useState<string[]>(['hh', 'habr', 'geekjob', 'getmatch']);
  const [verbose, setVerbose] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const sources = [
    { id: 'hh', name: 'HH.ru', description: 'HeadHunter' },
    { id: 'habr', name: 'Habr Career', description: 'Хабр Карьера' },
    { id: 'getmatch', name: 'GetMatch', description: 'GetMatch.ru' },
    { id: 'geekjob', name: 'Geekjob', description: 'Geekjob.ru' }
  ];

  const handleSourceToggle = (sourceId: string) => {
    setSelectedSources(prev => 
      prev.includes(sourceId) 
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleParse = async () => {
    if (selectedSources.length === 0) {
      alert('Выберите хотя бы один источник');
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/python-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          pages,
          sources: selectedSources,
          verbose
        }),
      });

      const data = await response.json();
      setLastResult(data);
      
      // Вызываем callback для обновления данных в админке
      if (data.success && onParseComplete) {
        onParseComplete();
      }
    } catch (error) {
      console.error('Ошибка парсинга:', error);
      setLastResult({
        success: false,
        message: 'Ошибка парсинга',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Настройки парсинга */}
      <Card>
        <CardHeader>
          <CardTitle>Настройки парсинга</CardTitle>
          <CardDescription>Настройте параметры для сбора вакансий</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="query">Поисковый запрос</Label>
              <Input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите поисковый запрос"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pages">Количество страниц</Label>
              <Input
                id="pages"
                type="number"
                value={pages}
                onChange={(e) => setPages(parseInt(e.target.value) || 1)}
                min="1"
                max="10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Выберите источники</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={source.id}
                    checked={selectedSources.includes(source.id)}
                    onCheckedChange={() => handleSourceToggle(source.id)}
                  />
                  <Label htmlFor={source.id} className="text-sm">
                    {source.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="verbose"
              checked={verbose}
              onCheckedChange={(checked) => setVerbose(checked as boolean)}
            />
            <Label htmlFor="verbose">Подробный вывод</Label>
          </div>

          <Button 
            onClick={handleParse} 
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Парсинг...' : '🚀 Запустить парсинг'}
          </Button>
        </CardContent>
      </Card>

      {/* Результаты парсинга */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Результаты парсинга
              <Badge variant={lastResult.success ? "default" : "destructive"}>
                {lastResult.success ? 'Успешно' : 'Ошибка'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastResult.success && lastResult.stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{lastResult.stats.total_found}</div>
                  <div className="text-sm text-gray-600">Найдено</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{lastResult.stats.total_saved}</div>
                  <div className="text-sm text-gray-600">Сохранено</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{lastResult.stats.duration.toFixed(1)}с</div>
                  <div className="text-sm text-gray-600">Время</div>
                </div>
              </div>
            )}

            {lastResult.success && lastResult.stats && (
              <div className="space-y-2">
                <h4 className="font-semibold">По источникам:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(lastResult.stats.by_source).map(([source, stats]) => (
                    <div key={source} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{source}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">{stats.found} найдено</Badge>
                        <Badge variant="outline">{stats.saved} сохранено</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!lastResult.success && (
              <Alert variant="destructive">
                <AlertDescription>
                  {lastResult.error || lastResult.message}
                </AlertDescription>
              </Alert>
            )}

            {lastResult.output && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Вывод парсера</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOutput(!showOutput)}
                  >
                    {showOutput ? 'Скрыть' : 'Показать'}
                  </Button>
                </div>
                {showOutput && (
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {lastResult.output}
                  </pre>
                )}
              </div>
            )}

            {lastResult.errors && (
              <div className="space-y-2">
                <Label>Ошибки</Label>
                <pre className="bg-red-50 p-4 rounded-lg text-sm text-red-600 overflow-x-auto">
                  {lastResult.errors}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PythonParserControl;