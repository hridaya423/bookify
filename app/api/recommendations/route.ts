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


function filterThinkTags(text: string): string {
  
  let filtered = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  
  filtered = filtered.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  
  
  filtered = filtered.replace(/<\/?think(?:ing)?>/gi, '');
  
  
  return filtered.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
}

export async function POST(request: Request) {
  try {
    const { user_id, recommendation_type = 'books' } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const [booksResponse, settingsResponse] = await Promise.all([
      supabase
        .from('books')
        .select('*')
        .eq('user_id', user_id)
        .eq('status', 'past')
        .order('date_completed', { ascending: false })
        .limit(10),
      supabase
        .from('user_settings')
        .select('favorite_genres, reading_goal')
        .eq('user_id', user_id)
        .single()
    ]);

    if (booksResponse.error) throw booksResponse.error;
    if (settingsResponse.error) throw settingsResponse.error;

    const books = booksResponse.data;
    const userSettings = settingsResponse.data;

    const readingHistory = books.map(book => ({
      title: book.title,
      author: book.author,
      genres: book.genre || [],
      favorite: book.favorite,
      date_completed: book.date_completed
    }));

    const systemPrompt = "You are a knowledgeable book recommendation assistant. Your task is to provide thoughtful, personalized book recommendations based on a reader's history and preferences. Focus on making connections between their favorite genres, authors they've enjoyed, and potential new books they might like. Do not include any <think> tags in your response.";
    let userPrompt = '';
    
    if (recommendation_type === 'books') {
      userPrompt = `Based on the following reading history and preferences, suggest 5 books that the reader might enjoy:

Reading History:
${readingHistory.map(book => 
  `- "${book.title}" by ${book.author} (${book.genres.join(', ')})${book.favorite ? ' - Marked as favorite' : ''}`
).join('\n')}

Favorite Genres: ${userSettings.favorite_genres.join(', ')}
Reading Goal: ${userSettings.reading_goal} books per year

Please provide your recommendations in this exact format:

1. [Title] by [Author]
   Genre(s): [genres]
   Why you'll love it: [2-3 sentences connecting it to their reading history]

2. [Continue format for remaining recommendations...]

Make the recommendations diverse while staying relevant to their interests. Consider books they've marked as favorites and their preferred genres.`;
    } else if (recommendation_type === 'authors') {
      userPrompt = `Based on the reader's history, suggest 5 authors they would enjoy:

Reading History:
${readingHistory.map(book => 
  `- "${book.title}" by ${book.author} (${book.genres.join(', ')})${book.favorite ? ' - Marked as favorite' : ''}`
).join('\n')}

Favorite Genres: ${userSettings.favorite_genres.join(', ')}

Please provide your recommendations in this exact format:

1. [Author Name]
   Known for: [2-3 notable works]
   Why you'll enjoy their writing: [2-3 sentences connecting to their reading preferences]
   Start with: [Specific book recommendation]

2. [Continue format for remaining recommendations...]

Focus on authors who write in their preferred genres and have similar writing styles to their favorites.`;
    }

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
      max_tokens: 1000,
      temperature: 0.7
    });

    const rawRecommendations = completion.choices[0]?.message?.content || '';
    
    
    console.log('Raw AI response:', rawRecommendations.substring(0, 200) + '...');
    
    
    const recommendations = filterThinkTags(rawRecommendations);
    
    
    console.log('Filtered response:', recommendations.substring(0, 200) + '...');

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    
    
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