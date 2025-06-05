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
    const { user_id, book_id } = await request.json();

    if (!user_id || !book_id) {
      return NextResponse.json(
        { error: 'User ID and Book ID are required' },
        { status: 400 }
      );
    }

    
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', book_id)
      .eq('user_id', user_id)
      .single();

    if (bookError || !book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    
    const { data: userBooks, error: booksError } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'past')
      .order('date_completed', { ascending: false })
      .limit(20);

    if (booksError) throw booksError;

    
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('favorite_genres')
      .eq('user_id', user_id)
      .single();

    if (settingsError) throw settingsError;

    const readingHistory = userBooks?.map(b => ({
      title: b.title,
      author: b.author,
      genres: b.genre || [],
      favorite: b.favorite
    })) || [];

    const systemPrompt = `You are a book recommendation expert. Analyze the given book and user's reading history to suggest similar books they would enjoy. Focus on books with similar themes, writing styles, genres, or authors. Provide both popular and lesser-known recommendations.`;

    const userPrompt = `Based on this book and the user's reading history, suggest 8-10 similar books:

TARGET BOOK:
Title: "${book.title}"
Author: ${book.author}
Genres: ${book.genre?.join(', ') || 'Not specified'}
${book.series_name ? `Series: ${book.series_name} #${book.series_order}` : ''}

USER'S READING HISTORY:
${readingHistory.length > 0 ? readingHistory.map(b => 
  `- "${b.title}" by ${b.author} (${b.genres.join(', ')})${b.favorite ? ' ⭐ Favorite' : ''}`
).join('\n') : 'No reading history available'}

USER'S FAVORITE GENRES: ${userSettings.favorite_genres?.join(', ') || 'Not specified'}

Please provide recommendations in this exact format:

1. [Title] by [Author]
   Genres: [genres]
   Why it's similar: [2-3 sentences explaining the connection to the target book]
   Match score: [1-10 based on similarity]

2. [Continue format for remaining recommendations...]

Focus on:
- Similar themes, mood, or writing style
- Same or related genres
- Authors with comparable storytelling approaches
- Books the user hasn't read based on their history
- Mix of popular and hidden gems
- Consider if they enjoy series vs standalone books

Avoid recommending books already in their reading history.`;

    const completion = await groq.chat.completions.create({
      model: "deepseek-r1-distill-llama-70b",
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

    const recommendations = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ 
      recommendations,
      basedOn: {
        title: book.title,
        author: book.author,
        genres: book.genre
      }
    });
  } catch (error) {
    console.error('Error generating similar book recommendations:', error);
    
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
      { error: 'Error generating recommendations. Please try again.' },
      { status: 500 }
    );
  }
} 