import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface BookToAdd {
  title: string;
  author: string;
  order: number;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
  categories?: string[];
}

interface AddSeriesRequest {
  seriesName: string;
  author: string;
  books: BookToAdd[];
  defaultStatus?: 'planned' | 'current' | 'past';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const requestData: AddSeriesRequest = await request.json();
    const { seriesName, author, books, defaultStatus = 'planned' } = requestData;

    if (!seriesName || !author || !books || books.length === 0) {
      return NextResponse.json(
        { error: 'Series name, author, and books are required' },
        { status: 400 }
      );
    }

    
    const { data: existingBooks, error: checkError } = await supabase
      .from('books')
      .select('title, series_name, series_order')
      .eq('user_id', user.id)
      .eq('series_name', seriesName);

    if (checkError) {
      console.error('Error checking existing books:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing books' },
        { status: 500 }
      );
    }

    
    const existingTitles = new Set(
      existingBooks?.map(book => book.title.toLowerCase()) || []
    );
    
    const newBooks = books.filter(
      book => !existingTitles.has(book.title.toLowerCase())
    );

    if (newBooks.length === 0) {
      return NextResponse.json({
        message: 'All books in this series are already in your library',
        added: 0,
        skipped: books.length,
        existingBooks: existingBooks?.length || 0
      });
    }

    
    const booksToInsert = newBooks.map(book => ({
      user_id: user.id,
      title: book.title,
      author: book.author,
      status: defaultStatus,
      coverurl: book.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
      genre: book.categories || [],
      favorite: false,
      total_pages: book.pageCount || null,
      current_page: 0,
      date_completed: defaultStatus === 'past' ? new Date().toISOString() : null,
      
      series_name: seriesName,
      series_order: book.order,
      series_total_books: books.length,
      is_part_of_series: true
    }));

    
    const { data: insertedBooks, error: insertError } = await supabase
      .from('books')
      .insert(booksToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting books:', insertError);
      return NextResponse.json(
        { error: 'Failed to add books to library' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully added ${newBooks.length} books from "${seriesName}" series`,
      added: newBooks.length,
      skipped: books.length - newBooks.length,
      totalBooks: books.length,
      seriesName,
      author,
      insertedBooks: insertedBooks?.length || 0
    });

  } catch (error) {
    console.error('Error adding series:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 