/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BookOpen, Trophy, Calendar, TrendingUp, Target, Library, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

interface DailyProgress {
  pages_read: number;
  date: string;
  book_id: string;
  user_id: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  status: string;
  current_page?: number;
  total_pages?: number;
  date_completed?: string;
  genre?: string[];
  user_id: string;
}

interface DatabaseBook {
  author: string;
  coverurl: string | null;
  created_at: string | null;
  current_page: number | null;
  date_added: string | null;
  date_completed: string | null;
  favorite: boolean | null;
  genre: string[];
  id: string;
  status: string;
  title: string;
  total_pages: number | null;
  user_id: string | null;
}

interface ReadingStats {
  totalBooks: number;
  booksThisYear: number;
  booksLastYear: number;
  averageBooksPerMonth: number;
  completionRate: number;
  favoriteGenres: { genre: string; count: number }[];
  currentStreak: number;
  monthlyStats: { name: string; books: number; pages: number }[];
  readingGoalProgress: number;
  totalPagesRead: number;
  averagePagesPerDay: number;
  dailyReadingProgress: DailyProgress[];
}

interface UserSettings {
  user_id: string;
  reading_goal: number;
  favorite_genres: string[];
}

interface UserProfile {
  id: string;
  full_name?: string;
}

const calculateStreak = (dailyProgress: DailyProgress[]): number => {
  if (!dailyProgress?.length) return 0;
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const sortedProgress = [...dailyProgress].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  let lastDate = today;
  
  for (const entry of sortedProgress) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      streak++;
      lastDate = entryDate;
    } else {
      break;
    }
  }

  const lastEntry = new Date(sortedProgress[0]?.date);
  lastEntry.setHours(0, 0, 0, 0);
  const timeDiff = today.getTime() - lastEntry.getTime();
  if (timeDiff > 86400000) { 
    return 0;
  }
  
  return streak;
};

export default function ReadingDashboard() {
  const { supabase, user } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReadingStats>({
    totalBooks: 0,
    booksThisYear: 0,
    booksLastYear: 0,
    averageBooksPerMonth: 0,
    completionRate: 0,
    favoriteGenres: [],
    currentStreak: 0,
    monthlyStats: [],
    readingGoalProgress: 0,
    totalPagesRead: 0,
    averagePagesPerDay: 0,
    dailyReadingProgress: [],
  });
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [pagesRead, setPagesRead] = useState(0);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [userName, setUserName] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadUserProfile(),
        loadCurrentBook(),
        loadStats(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    if (user?.user_metadata?.full_name) {
      setUserName(user.user_metadata.full_name);
    } else if (user?.email) {
      setUserName(user.email.split('@')[0]);
    }
  };

  function convertDatabaseBook(dbBook: DatabaseBook): Book {
    return {
      id: dbBook.id,
      title: dbBook.title,
      author: dbBook.author,
      status: dbBook.status,
      current_page: dbBook.current_page || undefined,
      total_pages: dbBook.total_pages || undefined,
      date_completed: dbBook.date_completed || undefined,
      genre: dbBook.genre || [],
      user_id: dbBook.user_id || '',
    };
  }

  const loadCurrentBook = async () => {
    if (!user?.id) return
    const { data: dbBook } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'current')
      .single();

      if (dbBook) {
        let bookToSet = convertDatabaseBook(dbBook);
    
        if (!bookToSet.total_pages) {
          try {
            const response = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(bookToSet.title)}+inauthor:${encodeURIComponent(bookToSet.author)}&maxResults=1`
            );
            const data = await response.json();
            if (data.items?.[0]?.volumeInfo?.pageCount) {
              const totalPages = data.items[0].volumeInfo.pageCount;
              
              await supabase
                .from('books')
                .update({ total_pages: totalPages })
                .eq('id', bookToSet.id)
                .eq('user_id', user.id);

              bookToSet = {
                ...bookToSet,
                total_pages: totalPages
              };
            }
          } catch (error) {
            console.error('Error fetching book details:', error);
          }
        }
        setCurrentBook(bookToSet);
      }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    const [settingsResult, booksResult, dailyProgressResult] = await Promise.all([
      supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
      supabase.from('books').select('*').eq('user_id', user.id),
      supabase.from('daily_reading').select('*').eq('user_id', user.id).order('date', { ascending: false })
    ]);
    
    setUserSettings(settingsResult.data as UserSettings);

    const books = booksResult.data as Book[];
    const dailyProgress = dailyProgressResult.data as DailyProgress[];

    const currentYear = new Date().getFullYear();
    const completedBooks = books?.filter(book => 
      book.status === 'past' && book.date_completed
    ) || [];

    const booksThisYear = completedBooks.filter(book => 
      book.date_completed && new Date(book.date_completed).getFullYear() === currentYear
    );

    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(currentYear, i).toLocaleString('default', { month: 'short' }),
      books: 0,
      pages: 0
    }));

    dailyProgress?.forEach(progress => {
      const date = new Date(progress.date);
      if (date.getFullYear() === currentYear) {
        monthlyStats[date.getMonth()].pages += progress.pages_read || 0;
      }
    });

    booksThisYear.forEach(book => {
      if (book.date_completed) {
        const month = new Date(book.date_completed).getMonth();
        monthlyStats[month].books += 1;
      }
    });

    const genreCounts: Record<string, number> = {};
    books?.forEach(book => {
      if (book.genre) {
        book.genre.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }
    });

    const favoriteGenres = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      totalBooks: books?.length || 0,
      booksThisYear: booksThisYear.length,
      booksLastYear: completedBooks.filter(book => 
        book.date_completed && new Date(book.date_completed).getFullYear() === currentYear - 1
      ).length,
      averageBooksPerMonth: +(booksThisYear.length / 12).toFixed(1),
      completionRate: books?.length ? 
        +((completedBooks.length / books.length) * 100).toFixed(1) : 0,
      favoriteGenres,
      monthlyStats,
      currentStreak: calculateStreak(dailyProgress || []),
      readingGoalProgress: settingsResult.data?.reading_goal ? 
        Math.min(100, Math.round((booksThisYear.length / settingsResult.data.reading_goal) * 100)) : 0,
      totalPagesRead: dailyProgress?.reduce((sum, day) => sum + (day.pages_read || 0), 0) || 0,
      averagePagesPerDay: Math.round(
        (dailyProgress?.reduce((sum, day) => sum + (day.pages_read || 0), 0) || 0) / 30
      ),
      dailyReadingProgress: dailyProgress || []
    });
  };

  const updateProgress = async () => {
    if (!currentBook || !pagesRead || !user?.id) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      await Promise.all([
        supabase
          .from('daily_reading')
          .upsert({
            user_id: user.id,
            book_id: currentBook.id,
            pages_read: pagesRead,
            date: today
          }),
        supabase
          .from('books')
          .update({ 
            current_page: Math.min(
              (currentBook.current_page || 0) + pagesRead,
              currentBook.total_pages || Infinity
            )
          })
          .eq('id', currentBook.id)
      ]);

      setUpdateSuccess(true);
      setPagesRead(0);
      loadDashboardData();
      
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[600px] w-full flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-red-200 border-t-red-500 animate-spin" />
            <BookOpen className="absolute inset-0 m-auto w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <p className="text-gray-600 animate-pulse">Loading your reading journey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full space-y-8">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Trophy className="h-6 w-6 text-red-500" />
              </div>
              <span className="text-sm font-medium text-gray-500">Current Streak</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.currentStreak}</p>
              <p className="text-sm text-gray-500">consecutive days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Library className="h-6 w-6 text-orange-500" />
              </div>
              <span className="text-sm font-medium text-gray-500">Books This Year</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.booksThisYear}</p>
              <p className="text-sm text-gray-500">vs {stats.booksLastYear} last year</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-pink-500" />
              </div>
              <span className="text-sm font-medium text-gray-500">Daily Average</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.averagePagesPerDay}</p>
              <p className="text-sm text-gray-500">pages per day</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-500" />
              </div>
              <span className="text-sm font-medium text-gray-500">Completion Rate</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.completionRate}%</p>
              <p className="text-sm text-gray-500">of started books</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-8">

          <Card className="border-none bg-gradient-to-br from-red-50 to-pink-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-red-500" />
                Daily Reading Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.dailyReadingProgress.slice(-14)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('default', { 
                        day: 'numeric',
                        month: 'short' 
                      })}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pages_read" 
                      stroke="#f87171"
                      strokeWidth={2}
                      dot={{ fill: '#f87171', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#f87171' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-red-50 to-pink-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-red-500" />
                Monthly Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyStats}>
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#f87171" />
                  <YAxis yAxisId="right" orientation="right" stroke="#f97316" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="books" fill="#f87171" name="Books Completed" />
                  <Bar yAxisId="right" dataKey="pages" fill="#f97316" name="Pages Read" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">

          {currentBook && (
            <Card className="border-none bg-gradient-to-br from-red-50 to-pink-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-red-500" />
                  Currently Reading
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">{currentBook.title}</h3>
                  <p className="text-sm text-gray-600">by {currentBook.author}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">
                      {currentBook.current_page} / {currentBook.total_pages} pages
                    </span>
                  </div>
                  <Progress 
                    value={((currentBook.current_page ?? 0) / (currentBook.total_pages ?? 1)) * 100}
                    className="h-2 bg-red-100"
                  />
                </div>

                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="Pages read today"
                    value={pagesRead || ''}
                    onChange={(e) => setPagesRead(parseInt(e.target.value) || 0)}
                    className="flex-1 border-red-200 focus:border-red-400 focus:ring-red-200"
                  />
                  <Button 
                    onClick={updateProgress}
                    disabled={loading}
                    className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:opacity-90"
                  >
                    Update
                  </Button>
                </div>

                {updateSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-green-600 bg-green-50 p-3 rounded-lg"
                  >
                    Progress updated successfully!
                  </motion.div>
                )}
              </CardContent>
            </Card>
          )}

          {stats.favoriteGenres.length > 0 && (
            <Card className="border-none bg-gradient-to-br from-red-50 to-pink-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5 text-red-500" />
                  Top Genres
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.favoriteGenres.map(({ genre, count }, index) => (
                    <div 
                      key={genre}
                      className="flex items-center justify-between p-3 bg-white/50 backdrop-blur-sm rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">{genre}</span>
                      </div>
                      <span className="text-red-600 font-medium">{count} books</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {userSettings && userSettings.reading_goal > 0 && (
            <Card className="border-none bg-gradient-to-br from-red-50 to-pink-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-red-500" />
                  Annual Reading Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">
                    {stats.booksThisYear} of {userSettings.reading_goal} books
                  </span>
                </div>
                <Progress 
                  value={stats.readingGoalProgress} 
                  className="h-2 bg-red-100"
                />
                <p className="text-sm text-gray-500 text-right">
                  {stats.readingGoalProgress}% Complete
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 
