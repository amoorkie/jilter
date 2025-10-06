'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Vacancy } from '@/lib/parsers/unified-parser';
import { Employment } from '@/lib/types/employment';
import EmploymentFilter from '@/app/components/EmploymentFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [selectedEmployment, setSelectedEmployment] = useState<Employment[]>([]);
  const [reactions, setReactions] = useState<Record<string, {
    likes: number;
    dislikes: number;
    hearts: number;
    bookmarks: number;
    userReaction: 'likes' | 'dislikes' | 'hearts' | 'bookmarks' | null;
  }>>({});
  const [animations, setAnimations] = useState<Record<string, string>>({});

  const fetchVacancies = async (query: string = '', maxVacancies: number = 200, background: boolean = false) => {
    try {
      if (!background) {
        setLoading(true);
      }
      setError(null);
      
      const searchQuery = query.trim();
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          maxVacancies,
          employmentTypes: selectedEmployment
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при загрузке вакансий');
      }

      const data = await response.json();
      setVacancies(data.vacancies || []);
    } catch (error) {
      console.error('Ошибка при загрузке вакансий:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVacancies(currentQuery);
  };

  const handleReaction = (vacancyId: string, reactionType: 'likes' | 'dislikes' | 'hearts' | 'bookmarks') => {
    setReactions(prev => {
      const current = prev[vacancyId] || { likes: 0, dislikes: 0, hearts: 0, bookmarks: 0, userReaction: null };
      
      if (current.userReaction === reactionType) {
        return {
          ...prev,
          [vacancyId]: {
            ...current,
            [reactionType]: Math.max(0, current[reactionType] - 1),
            userReaction: null
          }
        };
      } else {
        const newReaction = {
          ...current,
          [reactionType]: current[reactionType] + 1,
          userReaction: reactionType
        };
        
        if (current.userReaction && current.userReaction !== reactionType) {
          newReaction[current.userReaction] = Math.max(0, current[current.userReaction] - 1);
        }
        
        return {
          ...prev,
          [vacancyId]: newReaction
        };
      }
    });

    setAnimations(prev => ({
      ...prev,
      [vacancyId]: 'animate-pulse'
    }));

    setTimeout(() => {
      setAnimations(prev => ({
        ...prev,
        [vacancyId]: ''
      }));
    }, 1000);
  };

  const filteredVacancies = vacancies.filter(vacancy => {
    if (selectedEmployment.length === 0) return true;
    return vacancy.employment?.some(emp => selectedEmployment.includes(emp as Employment)) || false;
  });
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Заголовок */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🎨 Вакансии для дизайнеров
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Находите лучшие вакансии в сфере дизайна
        </p>
      </div>

      {/* Поиск */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Поиск вакансий</CardTitle>
          <CardDescription>Найдите подходящие вакансии по ключевым словам</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              type="text"
              placeholder="Введите ключевые слова (например: UI/UX дизайнер, графический дизайнер)"
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Поиск...
                </>
              ) : (
                'Найти'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Фильтры */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Уточните поиск по типу занятости</CardDescription>
        </CardHeader>
        <CardContent>
          <EmploymentFilter
            selectedEmployment={selectedEmployment}
            onEmploymentChange={setSelectedEmployment}
          />
        </CardContent>
      </Card>

      {/* Результаты поиска */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Найденные вакансии
            </h2>
            <p className="text-gray-600">
              Найдено вакансий: {filteredVacancies.length}
            </p>
          </div>

          {filteredVacancies.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Вакансии не найдены
                </h3>
                <p className="text-gray-600">
                  Попробуйте изменить поисковый запрос или фильтры
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredVacancies.map((vacancy) => {
                const currentReactions = reactions[vacancy.id] || { 
                  likes: 0, dislikes: 0, hearts: 0, bookmarks: 0, userReaction: null 
                };
                const animationClass = animations[vacancy.id] || '';

                return (
                  <Link key={vacancy.id} href={`/vacancy/${vacancy.id}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {vacancy.title}
                          </h3>
                          <p className="text-gray-600 mb-2">{vacancy.company}</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {vacancy.employment?.map((emp, index) => (
                              <Badge key={index} variant="secondary">
                                {emp}
                              </Badge>
                            ))}
                            {vacancy.salary && (
                              <Badge variant="outline">
                                {vacancy.salary}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReaction(vacancy.id, 'likes')}
                            className={`${animationClass} ${currentReactions.userReaction === 'likes' ? 'bg-blue-50 text-blue-600' : ''}`}
                          >
                            👍 {currentReactions.likes}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReaction(vacancy.id, 'dislikes')}
                            className={`${animationClass} ${currentReactions.userReaction === 'dislikes' ? 'bg-red-50 text-red-600' : ''}`}
                          >
                            👎 {currentReactions.dislikes}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReaction(vacancy.id, 'hearts')}
                            className={`${animationClass} ${currentReactions.userReaction === 'hearts' ? 'bg-pink-50 text-pink-600' : ''}`}
                          >
                            ❤️ {currentReactions.hearts}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReaction(vacancy.id, 'bookmarks')}
                            className={`${animationClass} ${currentReactions.userReaction === 'bookmarks' ? 'bg-yellow-50 text-yellow-600' : ''}`}
                          >
                            🔖 {currentReactions.bookmarks}
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="flex justify-between items-center">
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span>Источник: {vacancy.source}</span>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline">
                            Поделиться
                          </Button>
                          <Button size="sm">
                            Откликнуться
                          </Button>
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
          </div>
      )}
    </div>
  );
}

