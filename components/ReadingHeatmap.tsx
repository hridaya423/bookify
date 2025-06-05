'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { Calendar, Activity, BookOpen, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReadingActivity {
  date: string | null;
  pages_read: number;
  book_id: string | null;
}

interface HeatmapData {
  date: string;
  count: number;
  level: number;
  books?: string[];
}

export function ReadingHeatmap() {
  const { supabase } = useSupabase();
  const [readingData, setReadingData] = useState<ReadingActivity[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDays: 0,
    activeDays: 0,
    totalPages: 0,
    averagePages: 0,
    longestStreak: 0,
    currentStreak: 0
  });

  useEffect(() => {
    fetchReadingData();
  }, []);

  useEffect(() => {
    if (readingData.length > 0) {
      generateHeatmapData();
      calculateStats();
    }
  }, [readingData]);

  const fetchReadingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data, error } = await supabase
        .from('daily_reading')
        .select('date, pages_read, book_id')
        .eq('user_id', user.id)
        .gte('date', oneYearAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      setReadingData(data || []);
    } catch (error) {
      console.error('Error fetching reading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHeatmapData = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const dateMap = new Map<string, { pages: number; books: Set<string> }>();

    
    readingData.forEach(activity => {
      if (!activity.date || !activity.book_id) return;
      const date = activity.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { pages: 0, books: new Set() });
      }
      const existing = dateMap.get(date)!;
      existing.pages += activity.pages_read;
      existing.books.add(activity.book_id);
    });

    
    const heatmap: HeatmapData[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const activity = dateMap.get(dateStr);
      const pages = activity?.pages || 0;
      
      let level = 0;
      if (pages > 0) {
        if (pages < 10) level = 1;
        else if (pages < 25) level = 2;
        else if (pages < 50) level = 3;
        else level = 4;
      }

      heatmap.push({
        date: dateStr,
        count: pages,
        level,
        books: activity ? Array.from(activity.books) : []
      });

      current.setDate(current.getDate() + 1);
    }

    setHeatmapData(heatmap);
  };

  const calculateStats = () => {
    const totalDays = heatmapData.length;
    const activeDays = readingData.length;
    const totalPages = readingData.reduce((sum, activity) => sum + activity.pages_read, 0);
    const averagePages = activeDays > 0 ? Math.round(totalPages / activeDays) : 0;

    
    const sortedDates = heatmapData
      .filter(d => d.count > 0)
      .map(d => new Date(d.date))
      .sort((a, b) => b.getTime() - a.getTime());

    const { longestStreak, currentStreak } = calculateStreaks(sortedDates);

    setStats({
      totalDays,
      activeDays,
      totalPages,
      averagePages,
      longestStreak,
      currentStreak
    });
  };

  const calculateStreaks = (sortedDates: Date[]) => {
    if (sortedDates.length === 0) return { longestStreak: 0, currentStreak: 0 };

    let longestStreak = 1;
    let currentStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const diffDays = Math.abs(sortedDates[i-1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        tempStreak++;
        if (i === 1) currentStreak = tempStreak;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        if (i === 1) currentStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    return { longestStreak, currentStreak };
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-muted';
      case 1: return 'bg-green-200 dark:bg-green-900';
      case 2: return 'bg-green-300 dark:bg-green-800';
      case 3: return 'bg-green-400 dark:bg-green-700';
      case 4: return 'bg-green-500 dark:bg-green-600';
      default: return 'bg-muted';
    }
  };

  const getWeeksArray = () => {
    if (heatmapData.length === 0) return [];
    
    const weeks = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      weeks.push(heatmapData.slice(i, i + 7));
    }
    return weeks;
  };

  const getMonthLabels = () => {
    const months = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    for (let i = 0; i < 12; i++) {
      const month = new Date(startDate);
      month.setMonth(startDate.getMonth() + i);
      months.push(month.toLocaleDateString('en-US', { month: 'short' }));
    }
    return months;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Reading Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading activity data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Reading Activity Heatmap
        </CardTitle>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{stats.activeDays} active days</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{stats.totalPages} pages read</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>{stats.currentStreak} day current streak</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.activeDays}</div>
            <div className="text-sm text-muted-foreground">Active Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.averagePages}</div>
            <div className="text-sm text-muted-foreground">Avg Pages/Day</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.longestStreak}</div>
            <div className="text-sm text-muted-foreground">Longest Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.currentStreak}</div>
            <div className="text-sm text-muted-foreground">Current Streak</div>
          </div>
        </div>

        
        <div className="mb-2 ml-8">
          <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground">
            {getMonthLabels().map((month, index) => (
              <div key={index} className="text-center">
                {month}
              </div>
            ))}
          </div>
        </div>

        
        <div className="flex gap-1">
          
          <div className="flex flex-col gap-1 text-xs text-muted-foreground mr-2">
            <div className="h-3"></div>
            <div className="h-3 flex items-center">Mon</div>
            <div className="h-3"></div>
            <div className="h-3 flex items-center">Wed</div>
            <div className="h-3"></div>
            <div className="h-3 flex items-center">Fri</div>
            <div className="h-3"></div>
          </div>

          
          <div className="flex gap-1 overflow-x-auto">
            {getWeeksArray().map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`w-3 h-3 rounded-sm border border-border ${getLevelColor(day.level)} cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all`}
                    title={`${day.date}: ${day.count} pages read`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Less
          </div>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm border border-border ${getLevelColor(level)}`}
              />
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            More
          </div>
        </div>

        
        <div className="mt-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-4">
            <Badge variant="outline" className="text-xs">
              Light: 1-9 pages
            </Badge>
            <Badge variant="outline" className="text-xs">
              Medium: 10-24 pages
            </Badge>
            <Badge variant="outline" className="text-xs">
              Heavy: 25-49 pages
            </Badge>
            <Badge variant="outline" className="text-xs">
              Intense: 50+ pages
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 