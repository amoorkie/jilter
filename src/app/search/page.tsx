'use client'

import { useState, useEffect } from 'react'
import { Vacancy } from '@/lib/parsers/unified-parser'
import { Employment } from '@/lib/types/employment'
import EmploymentFilter from '@/app/components/EmploymentFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, MapPin, Building, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function SearchPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedEmployment, setSelectedEmployment] = useState<Employment[]>([])

  const fetchVacancies = async (searchQuery: string = '') => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery.trim(),
          maxVacancies: 200,
          employmentTypes: selectedEmployment
        }),
      })

      if (!response.ok) {
        throw new Error('Ошибка при загрузке вакансий')
      }

      const data = await response.json()
      setVacancies(data.vacancies || [])
    } catch (error) {
      console.error('Ошибка при загрузке вакансий:', error)
      setError(error instanceof Error ? error.message : 'Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchVacancies(query)
  }

  const filteredVacancies = vacancies.filter(vacancy => {
    if (selectedEmployment.length === 0) return true
    return vacancy.employmentTypes?.some(emp => selectedEmployment.includes(emp)) || false
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Заголовок */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🔍 Поиск вакансий
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Найдите подходящие вакансии по ключевым словам
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Поиск...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Найти
                </>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Результаты поиска
            </h2>
            <p className="text-gray-600">
              Найдено вакансий: {filteredVacancies.length}
            </p>
          </div>

          {filteredVacancies.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Вакансии не найдены
                </h3>
                <p className="text-gray-600">
                  Попробуйте изменить поисковый запрос или фильтры
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVacancies.map((vacancy) => (
                <Card key={vacancy.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg line-clamp-2">
                        {vacancy.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {vacancy.company}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {vacancy.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          {vacancy.location}
                        </div>
                      )}

                      {vacancy.salary && (
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                          <DollarSign className="h-4 w-4" />
                          {vacancy.salary}
                        </div>
                      )}

                      {vacancy.employmentTypes && vacancy.employmentTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {vacancy.employmentTypes.map((type, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="text-sm text-gray-500">
                        {vacancy.publishedAt && new Date(vacancy.publishedAt).toLocaleDateString('ru-RU')}
                      </div>

                      <Separator />

                      <div className="text-sm text-gray-700 line-clamp-3">
                        {vacancy.description}
                      </div>

                      <div className="pt-2">
                        <Link href={`/vacancy/${vacancy.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Подробнее
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


