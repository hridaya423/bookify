/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    
    const [booksResponse, settingsResponse, readingProgressResponse] = await Promise.all([
      supabase
        .from('books')
        .select('*')
        .eq('user_id', user_id)
        .order('date_added', { ascending: false }),
      supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user_id)
        .single(),
      supabase
        .from('daily_reading')
        .select('*')
        .eq('user_id', user_id)
        .order('date', { ascending: false })
        .limit(90) 
    ]);

    if (booksResponse.error) throw booksResponse.error;

    const books = booksResponse.data;
    const userSettings = settingsResponse.data;
    const readingProgress = readingProgressResponse.data || [];

    
    const stats = calculateReadingStatistics(books, readingProgress, userSettings);

    const systemPrompt = `You are an expert reading analyst and data scientist. Analyze the user's reading habits and provide detailed, actionable insights. Your analysis should be encouraging, insightful, and help them become a better reader.

Provide analysis covering:
1. Reading Patterns & Habits
2. Genre Preferences & Diversity
3. Progress Toward Goals
4. Reading Consistency
5. Book Completion Rates
6. Recommendations for Improvement
7. Personalized Reading Challenges

Be specific, use data-driven insights, and provide actionable recommendations.`;

    const userPrompt = `Analyze this user's reading habits and provide comprehensive insights:

READING STATISTICS:
- Total Books: ${stats.totalBooks}
- Completed Books: ${stats.completedBooks}
- Currently Reading: ${stats.currentlyReading}
- Planned Books: ${stats.plannedBooks}
- Completion Rate: ${stats.completionRate}%
- Average Reading Days: ${stats.averageReadingDays}
- Annual Reading Goal: ${stats.readingGoal}
- Goal Progress: ${stats.goalProgress}%

READING ACTIVITY (Last 90 days):
- Total Days Active: ${stats.activeDays}
- Total Pages Read: ${stats.totalPagesRead}
- Average Pages/Day: ${stats.averagePagesPerDay}
- Longest Reading Streak: ${stats.longestStreak} days
- Current Streak: ${stats.currentStreak} days

GENRE BREAKDOWN:
${Object.entries(stats.genreDistribution).slice(0, 8).map(([genre, data]: [string, any]) => 
  `- ${genre}: ${data.count} books (${data.percentage}%)`
).join('\n')}

FAVORITE AUTHORS:
${Object.entries(stats.authorStats).slice(0, 5).map(([author, count]) => 
  `- ${author}: ${count} books`
).join('\n')}

SERIES PROGRESS:
${Object.entries(stats.seriesProgress).slice(0, 5).map(([series, data]: [string, any]) => 
  `- ${series}: ${data.completed}/${data.total} books (${Math.round(data.completed/data.total*100)}%)`
).join('\n')}

MONTHLY READING PATTERN:
${stats.monthlyStats.map((month: any) => 
  `- ${month.month}: ${month.booksCompleted} books, ${month.pagesRead} pages`
).join('\n')}

READING SPEED INSIGHTS:
- Fastest Book: ${stats.fastestRead?.title} (${stats.fastestRead?.days} days)
- Average Time per Book: ${stats.averageTimePerBook} days
- Books by Length: Short (${stats.booksByLength.short}), Medium (${stats.booksByLength.medium}), Long (${stats.booksByLength.long})

Please provide a detailed analysis covering:
1. **Reading Pattern Analysis**: What patterns do you see in their reading habits?
2. **Strengths**: What are they doing well?
3. **Areas for Improvement**: Where can they grow?
4. **Genre Diversity**: How diverse are their reading choices?
5. **Goal Assessment**: Are they on track for their annual goal?
6. **Consistency Insights**: How consistent is their reading?
7. **Personalized Recommendations**: 3-5 specific actionable suggestions
8. **Reading Challenges**: 2-3 fun challenges to try

Format your response with clear sections and be encouraging while being honest about areas for improvement.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    const analysis = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ 
      analysis,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating reading analysis:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid or missing Groq API key' },
          { status: 401 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Error generating analysis. Please try again.' },
      { status: 500 }
    );
  }
}

function calculateReadingStatistics(books: any[], readingProgress: any[], userSettings: any) {
  const currentYear = new Date().getFullYear();
  
  
  const totalBooks = books.length;
  const completedBooks = books.filter(b => b.status === 'past').length;
  const currentlyReading = books.filter(b => b.status === 'current').length;
  const plannedBooks = books.filter(b => b.status === 'planned').length;
  const completionRate = totalBooks > 0 ? Math.round((completedBooks / totalBooks) * 100) : 0;

  
  const readingGoal = userSettings?.reading_goal || 0;
  const booksThisYear = books.filter(b => 
    b.date_completed && new Date(b.date_completed).getFullYear() === currentYear
  ).length;
  const goalProgress = readingGoal > 0 ? Math.round((booksThisYear / readingGoal) * 100) : 0;

  
  const activeDays = new Set(readingProgress.map(r => r.date)).size;
  const totalPagesRead = readingProgress.reduce((sum, r) => sum + r.pages_read, 0);
  const averagePagesPerDay = activeDays > 0 ? Math.round(totalPagesRead / activeDays) : 0;

  
  const sortedDates = readingProgress
    .map(r => new Date(r.date))
    .sort((a, b) => b.getTime() - a.getTime());
  
  const { longestStreak, currentStreak } = calculateStreaks(sortedDates);

  
  const genreDistribution = calculateGenreDistribution(books);

  
  const authorStats = calculateAuthorStats(books);

  
  const seriesProgress = calculateSeriesProgress(books);

  
  const monthlyStats = calculateMonthlyStats(books, readingProgress);

  
  const completedBooksWithDates = books.filter(b => 
    b.status === 'past' && b.date_added && b.date_completed
  );

  const readingTimes = completedBooksWithDates.map(book => {
    const start = new Date(book.date_added);
    const end = new Date(book.date_completed);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { title: book.title, days, pages: book.total_pages || 0 };
  });

  const averageTimePerBook = readingTimes.length > 0 
    ? Math.round(readingTimes.reduce((sum, r) => sum + r.days, 0) / readingTimes.length)
    : 0;

  const fastestRead = readingTimes.length > 0 
    ? readingTimes.reduce((fastest, current) => 
        current.days < fastest.days ? current : fastest
      )
    : null;

  const averageReadingDays = readingTimes.length > 0 
    ? Math.round(readingTimes.reduce((sum, r) => sum + r.days, 0) / readingTimes.length)
    : 0;

  
  const booksByLength = {
    short: books.filter(b => b.total_pages && b.total_pages < 250).length,
    medium: books.filter(b => b.total_pages && b.total_pages >= 250 && b.total_pages < 500).length,
    long: books.filter(b => b.total_pages && b.total_pages >= 500).length
  };

  return {
    totalBooks,
    completedBooks,
    currentlyReading,
    plannedBooks,
    completionRate,
    readingGoal,
    booksThisYear,
    goalProgress,
    activeDays,
    totalPagesRead,
    averagePagesPerDay,
    longestStreak,
    currentStreak,
    genreDistribution,
    authorStats,
    seriesProgress,
    monthlyStats,
    averageTimePerBook,
    fastestRead,
    averageReadingDays,
    booksByLength
  };
}

function calculateStreaks(sortedDates: Date[]) {
  if (sortedDates.length === 0) return { longestStreak: 0, currentStreak: 0 };

  let longestStreak = 1;
  let currentStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const diffDays = Math.abs(sortedDates[i-1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays <= 1) {
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
}

function calculateGenreDistribution(books: any[]) {
  const distribution: { [key: string]: { count: number; percentage: number } } = {};
  const totalBooks = books.length;

  books.forEach(book => {
    if (book.genre && Array.isArray(book.genre)) {
      book.genre.forEach((genre: string) => {
        if (!distribution[genre]) {
          distribution[genre] = { count: 0, percentage: 0 };
        }
        distribution[genre].count++;
      });
    }
  });

  
  Object.keys(distribution).forEach(genre => {
    distribution[genre].percentage = totalBooks > 0 
      ? Math.round((distribution[genre].count / totalBooks) * 100)
      : 0;
  });

  return Object.fromEntries(
    Object.entries(distribution).sort(([,a], [,b]) => b.count - a.count)
  );
}

function calculateAuthorStats(books: any[]) {
  const authors: { [key: string]: number } = {};
  books.forEach(book => {
    authors[book.author] = (authors[book.author] || 0) + 1;
  });
  return Object.fromEntries(
    Object.entries(authors).sort(([,a], [,b]) => b - a)
  );
}

function calculateSeriesProgress(books: any[]) {
  const series: { [key: string]: { total: number; completed: number } } = {};
  
  books.forEach(book => {
    if (book.is_part_of_series && book.series_name) {
      if (!series[book.series_name]) {
        series[book.series_name] = { total: 0, completed: 0 };
      }
      series[book.series_name].total++;
      if (book.status === 'past') {
        series[book.series_name].completed++;
      }
    }
  });

  return series;
}

function calculateMonthlyStats(books: any[], readingProgress: any[]) {
  const months = [];
  const currentDate = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    const booksCompleted = books.filter(book => {
      if (!book.date_completed) return false;
      const completedDate = new Date(book.date_completed);
      return completedDate.getMonth() === targetDate.getMonth() && 
             completedDate.getFullYear() === targetDate.getFullYear();
    }).length;

    const pagesRead = readingProgress.filter(progress => {
      const progressDate = new Date(progress.date);
      return progressDate.getMonth() === targetDate.getMonth() && 
             progressDate.getFullYear() === targetDate.getFullYear();
    }).reduce((sum, p) => sum + p.pages_read, 0);

    months.push({
      month: monthName,
      booksCompleted,
      pagesRead
    });
  }

  return months;
} 