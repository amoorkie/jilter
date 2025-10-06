'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { VacancyRecord } from '@/lib/database/sqlite-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ExternalLink, MapPin, Building, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { CommentsSection } from '@/components/comments/CommentsSection';

export default function VacancyPage() {
  const params = useParams();
  const [vacancy, setVacancy] = useState<VacancyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVacancy = async () => {
      try {
        const response = await fetch(`/api/vacancy/${params.id}`);
        if (!response.ok) {
          throw new Error('Вакансия не найдена');
        }
        const data = await response.json();
        setVacancy(data.vacancy);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchVacancy();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="bg-white rounded-lg p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vacancy) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Вакансия не найдена</h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Вернуться на главную
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Навигация */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться к поиску
            </Button>
          </Link>
        </div>

        {/* Основная информация */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{vacancy.title}</CardTitle>
                <CardDescription className="text-lg flex items-center">
                  <Building className="w-4 h-4 mr-2" />
                  {vacancy.company}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant="secondary" className="w-fit">
                  {vacancy.source}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <a href={vacancy.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Открыть на сайте
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{vacancy.location || 'Не указано'}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>
                  {vacancy.salary_min && vacancy.salary_max 
                    ? `${vacancy.salary_min} - ${vacancy.salary_max} ${vacancy.salary_currency || 'руб.'}`
                    : 'Не указана'
                  }
                </span>
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>
                  {new Date(vacancy.published_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>

            {/* AI Анализ */}
            {vacancy.ai_specialization && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">AI Анализ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Специализация:</span> {vacancy.ai_specialization}
                  </div>
                  <div>
                    <span className="font-medium">Опыт:</span> {vacancy.ai_experience}
                  </div>
                  <div>
                    <span className="font-medium">Удаленно:</span> {vacancy.ai_remote ? 'Да' : 'Нет'}
                  </div>
                  <div>
                    <span className="font-medium">Релевантность:</span> {(vacancy.ai_relevance_score * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Описание вакансии */}
        <Card>
          <CardHeader>
            <CardTitle>Описание вакансии</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: vacancy.edited_description || vacancy.full_description || vacancy.description || 'Описание не найдено' 
              }}
            />
          </CardContent>
        </Card>

        {/* Секция комментариев */}
        <CommentsSection vacancyId={params.id as string} />
      </div>
    </div>
  );
}