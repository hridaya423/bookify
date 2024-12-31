/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { useSupabase } from '../providers/supabase-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Trophy, Calendar } from 'lucide-react';

interface DailyProgress {
  pages_read: number;
  date: string;
  book_id: string;
}

interface ReadingStreak {
  currentStreak: number;
  totalPagesRead: number;
  dailyProgress: DailyProgress[];
}

export default function ReadingProgress() {
  const { supabase, user } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [currentBook, setCurrentBook] = useState<any>(null);
  const [pagesRead, setPagesRead] = useState<number>(0);
  const [streak, setStreak] = useState<ReadingStreak>({
    currentStreak: 0,
    totalPagesRead: 0,
    dailyProgress: []
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadCurrentBook();
      loadReadingStreak();
    }
  }, [user]);

  const loadUserProfile = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user?.id)
      .single();
    
    if (profile?.full_name) {
      setUserName(profile.full_name);
    }
  };

  const loadCurrentBook = async () => {
    const { data: book } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'current')
      .single();

    if (book) {
      setCurrentBook(book);
      if (!book.total_pages) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(book.title)}+inauthor:${encodeURIComponent(book.author)}&maxResults=1`
          );
          const data = await response.json();
          if (data.items?.[0]?.volumeInfo?.pageCount) {
            await supabase
              .from('books')
              .update({ total_pages: data.items[0].volumeInfo.pageCount })
              .eq('id', book.id);
            book.total_pages = data.items[0].volumeInfo.pageCount;
          }
        } catch (error) {
          console.error('Error fetching book details:', error);
        }
      }
      setCurrentBook(book);
    }
  };

  const loadReadingStreak = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: progress } = await supabase
      .from('daily_reading')
      .select('*')
      .eq('user_id', user?.id)
      .order('date', { ascending: false });

    if (progress) {
      let streak = 0;
      let totalPages = 0;
      let lastDate = new Date(today);

      for (const entry of progress) {
        const entryDate = new Date(entry.date);
        const diffDays = Math.floor((lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          streak++;
          totalPages += entry.pages_read;
          lastDate = entryDate;
        } else {
          break;
        }
      }

      setStreak({
        currentStreak: streak,
        totalPagesRead: totalPages,
        dailyProgress: progress
      });
    }
  };

  const updateProgress = async () => {
    if (!currentBook || !pagesRead) return;

    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { error: progressError } = await supabase
        .from('daily_reading')
        .upsert({
          user_id: user?.id,
          book_id: currentBook.id,
          pages_read: pagesRead,
          date: today
        });

      if (progressError) throw progressError;

      const newCurrentPage = Math.min(
        (currentBook.current_page || 0) + pagesRead,
        currentBook.total_pages || Infinity
      );

      const { error: bookError } = await supabase
        .from('books')
        .update({ current_page: newCurrentPage })
        .eq('id', currentBook.id);

      if (bookError) throw bookError;

      loadReadingStreak();
      loadCurrentBook();
      setPagesRead(0);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{userName ? `${userName}'s Reading Progress` : 'Reading Progress'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Current Streak</p>
                <p className="text-2xl font-bold">{streak.currentStreak} days</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Pages Read Today</p>
                <p className="text-2xl font-bold">
                  {streak.dailyProgress[0]?.date === new Date().toISOString().split('T')[0]
                    ? streak.dailyProgress[0].pages_read
                    : 0}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Total Pages</p>
                <p className="text-2xl font-bold">{streak.totalPagesRead}</p>
              </div>
            </div>
          </div>

          {currentBook && (
            <div className="space-y-4">
              <h3 className="font-medium">Currently Reading: {currentBook.title}</h3>
              {currentBook.total_pages && (
                <Progress 
                  value={(currentBook.current_page / currentBook.total_pages) * 100} 
                  className="w-full h-2"
                />
              )}
              <div className="flex space-x-4">
                <Input
                  type="number"
                  placeholder="Pages read today"
                  value={pagesRead || ''}
                  onChange={(e) => setPagesRead(parseInt(e.target.value) || 0)}
                  className="w-40"
                />
                <Button onClick={updateProgress}>Update Progress</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}