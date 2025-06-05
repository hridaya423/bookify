'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { SeriesProgress } from './SeriesProgress';
import { BookOpen, TrendingUp, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SeriesBook {
  id: string;
  title: string;
  author: string;
  status: 'planned' | 'current' | 'past';
  series_name: string;
  series_order: number;
  coverurl?: string;
  total_pages?: number;
  current_page?: number;
}

interface SeriesSummary {
  series_name: string;
  total_books: number;
  completed_books: number;
  current_books: number;
  planned_books: number;
  progress_percentage: number;
  latest_book?: {
    title: string;
    status: string;
    series_order: number;
  };
}

interface SeriesDashboardProps {
  userId: string;
}

export function SeriesDashboard({ userId }: SeriesDashboardProps) {
  const [seriesList, setSeriesList] = useState<SeriesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const { supabase } = useSupabase();

  useEffect(() => {
    loadUserSeries();
  }, [userId]);

  const loadUserSeries = async () => {
    setLoading(true);
    try {
      
      const { data: seriesBooks, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .eq('is_part_of_series', true)
        .not('series_name', 'is', null);

      if (error) {
        console.error('Error loading series books:', error);
        return;
      }

      console.log('Loaded series books from database:', seriesBooks);

      
      const seriesMap = new Map<string, SeriesBook[]>();
      
      seriesBooks?.forEach(book => {
        const seriesBook = book as SeriesBook;
        if (seriesBook.series_name) {
          if (!seriesMap.has(seriesBook.series_name)) {
            seriesMap.set(seriesBook.series_name, []);
          }
          seriesMap.get(seriesBook.series_name)?.push(seriesBook);
        }
      });

      
      const summaries: SeriesSummary[] = Array.from(seriesMap.entries()).map(([seriesName, books]) => {
        const totalBooks = books.length;
        const completedBooks = books.filter(book => book.status === 'past').length;
        const currentBooks = books.filter(book => book.status === 'current').length;
        const plannedBooks = books.filter(book => book.status === 'planned').length;
        const progressPercentage = totalBooks > 0 ? (completedBooks / totalBooks) * 100 : 0;
        
        
        const latestBook = books.reduce((latest, book) => {
          return book.series_order > (latest?.series_order || 0) ? book : latest;
        }, null as SeriesBook | null);

        return {
          series_name: seriesName,
          total_books: totalBooks,
          completed_books: completedBooks,
          current_books: currentBooks,
          planned_books: plannedBooks,
          progress_percentage: progressPercentage,
          latest_book: latestBook ? {
            title: latestBook.title,
            status: latestBook.status,
            series_order: latestBook.series_order
          } : undefined
        };
      });

      
      summaries.sort((a, b) => b.progress_percentage - a.progress_percentage);
      setSeriesList(summaries);

    } catch (error) {
      console.error('Error loading user series:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getProgressBadgeColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-100 text-green-800 border-green-200';
    if (percentage >= 75) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2">Loading your series...</span>
        </div>
      </div>
    );
  }

  if (seriesList.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Series Found</h3>
          <p className="text-gray-500">
            Start adding books that are part of a series to track your progress!
          </p>
        </CardContent>
      </Card>
    );
  }

  
  const totalSeries = seriesList.length;
  const completedSeries = seriesList.filter(s => s.progress_percentage === 100).length;
  const totalBooksInSeries = seriesList.reduce((sum, s) => sum + s.total_books, 0);
  const totalCompletedBooks = seriesList.reduce((sum, s) => sum + s.completed_books, 0);

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalSeries}</div>
                <div className="text-sm text-gray-500">Active Series</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{completedSeries}</div>
                <div className="text-sm text-gray-500">Completed Series</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalBooksInSeries}</div>
                <div className="text-sm text-gray-500">Total Books</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round((totalCompletedBooks / totalBooksInSeries) * 100)}%
                </div>
                <div className="text-sm text-gray-500">Overall Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {seriesList.map((series) => (
          <Card 
            key={series.series_name}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedSeries(
              selectedSeries === series.series_name ? null : series.series_name
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{series.series_name}</span>
                <Badge className={getProgressBadgeColor(series.progress_percentage)}>
                  {Math.round(series.progress_percentage)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {series.completed_books} of {series.total_books} books
                </span>
                <span className={`font-medium ${getProgressColor(series.progress_percentage)}`}>
                  {Math.round(series.progress_percentage)}% complete
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${series.progress_percentage}%` }}
                />
              </div>

              {series.latest_book && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Latest:</span> Book {series.latest_book.series_order} - {series.latest_book.title}
                  <Badge 
                    className={`ml-2 text-xs ${
                      series.latest_book.status === 'past' ? 'bg-green-100 text-green-800' :
                      series.latest_book.status === 'current' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {series.latest_book.status === 'past' ? 'Completed' :
                     series.latest_book.status === 'current' ? 'Reading' : 'Planned'}
                  </Badge>
                </div>
              )}

              <div className="flex gap-4 text-xs text-gray-500">
                <span>📚 {series.completed_books} completed</span>
                <span>📖 {series.current_books} reading</span>
                <span>📋 {series.planned_books} planned</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      
      {selectedSeries && (
        <div className="mt-8">
          <SeriesProgress seriesName={selectedSeries} userId={userId} />
        </div>
      )}
    </div>
  );
}

export default SeriesDashboard; 