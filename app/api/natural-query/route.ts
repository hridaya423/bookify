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
    const { user_id, query } = await request.json();

    if (!user_id || !query) {
      return NextResponse.json(
        { error: 'User ID and query are required' },
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
        .limit(30)
    ]);

    if (booksResponse.error) throw booksResponse.error;

    const books = booksResponse.data;
    const userSettings = settingsResponse.data;
    const recentReadingActivity = readingProgressResponse.data || [];

    
    const userProfile = {
      totalBooks: books.length,
      completedBooks: books.filter(b => b.status === 'past').length,
      currentlyReading: books.filter(b => b.status === 'current').length,
      plannedBooks: books.filter(b => b.status === 'planned').length,
      favoriteBooks: books.filter(b => b.favorite),
      favoriteGenres: userSettings?.favorite_genres || [],
      readingGoal: userSettings?.reading_goal || 0,
      recentActivity: recentReadingActivity.length > 0,
      genreDistribution: getGenreDistribution(books),
      authorPreferences: getAuthorPreferences(books),
      seriesProgress: getSeriesProgress(books),
      readingPace: calculateReadingPace(recentReadingActivity)
    };

    const systemPrompt = `You are an AI assistant specialized in book recommendations and reading analysis. You have access to the user's complete reading library and history. Provide personalized, thoughtful responses based on their reading patterns, preferences, and current library.

You can:
- Recommend books based on their reading history and preferences
- Answer questions about their reading habits and patterns
- Suggest reading goals and challenges
- Help them discover new genres or authors
- Analyze their reading trends
- Find books in their library that match specific criteria
- Suggest what to read next from their current collection

Always be conversational, helpful, and provide specific, actionable recommendations.`;

    const userPrompt = `User Query: "${query}"

User's Reading Profile:
- Total Books: ${userProfile.totalBooks}
- Completed: ${userProfile.completedBooks}, Currently Reading: ${userProfile.currentlyReading}, Planned: ${userProfile.plannedBooks}
- Reading Goal: ${userProfile.readingGoal} books per year
- Favorite Genres: ${userProfile.favoriteGenres.join(', ') || 'Not specified'}
- Recent Reading Activity: ${userProfile.recentActivity ? 'Active' : 'Inactive'}

Reading Library:
${books.slice(0, 30).map(book => 
  `- "${book.title}" by ${book.author} (${book.genre?.join(', ') || 'No genre'}) - ${book.status}${book.favorite ? ' ⭐' : ''}${book.series_name ? ` [${book.series_name} #${book.series_order}]` : ''}`
).join('\n')}
${books.length > 30 ? `\n... and ${books.length - 30} more books` : ''}

Favorite Books:
${userProfile.favoriteBooks.slice(0, 10).map(book => 
  `- "${book.title}" by ${book.author} (${book.genre?.join(', ') || 'No genre'})`
).join('\n')}

Genre Distribution:
${Object.entries(userProfile.genreDistribution).slice(0, 5).map(([genre, count]) => 
  `- ${genre}: ${count} books`
).join('\n')}

Top Authors:
${Object.entries(userProfile.authorPreferences).slice(0, 5).map(([author, count]) => 
  `- ${author}: ${count} books`
).join('\n')}

Please provide a comprehensive, personalized response to their query. If they're asking for recommendations, suggest 5-8 specific books. If they're asking about their reading habits, provide detailed insights. Always be specific and reference their actual reading history when relevant.`;

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
      max_tokens: 1500,
      temperature: 0.7
    });

    const response = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ 
      response,
      query,
      userProfile: {
        totalBooks: userProfile.totalBooks,
        completedBooks: userProfile.completedBooks,
        favoriteGenres: userProfile.favoriteGenres,
        readingGoal: userProfile.readingGoal
      }
    });
  } catch (error) {
    console.error('Error processing natural language query:', error);
    
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
      { error: 'Error processing query. Please try again.' },
      { status: 500 }
    );
  }
}


function getGenreDistribution(books: any[]) {
  const distribution: { [key: string]: number } = {};
  books.forEach(book => {
    if (book.genre) {
      book.genre.forEach((genre: string) => {
        distribution[genre] = (distribution[genre] || 0) + 1;
      });
    }
  });
  return Object.entries(distribution)
    .sort(([,a], [,b]) => b - a)
    .reduce((acc, [genre, count]) => ({ ...acc, [genre]: count }), {});
}

function getAuthorPreferences(books: any[]) {
  const authors: { [key: string]: number } = {};
  books.forEach(book => {
    authors[book.author] = (authors[book.author] || 0) + 1;
  });
  return Object.entries(authors)
    .sort(([,a], [,b]) => b - a)
    .reduce((acc, [author, count]) => ({ ...acc, [author]: count }), {});
}

function getSeriesProgress(books: any[]) {
  const series: { [key: string]: { total: number; read: number } } = {};
  books.forEach(book => {
    if (book.is_part_of_series && book.series_name) {
      if (!series[book.series_name]) {
        series[book.series_name] = { total: 0, read: 0 };
      }
      series[book.series_name].total++;
      if (book.status === 'past') {
        series[book.series_name].read++;
      }
    }
  });
  return series;
}

function calculateReadingPace(readingActivity: any[]) {
  if (readingActivity.length === 0) return 0;
  const totalPages = readingActivity.reduce((sum, activity) => sum + activity.pages_read, 0);
  const uniqueDays = new Set(readingActivity.map(activity => activity.date)).size;
  return uniqueDays > 0 ? Math.round(totalPages / uniqueDays) : 0;
} 