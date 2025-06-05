import { NextRequest, NextResponse } from 'next/server';

interface BookInSeries {
  title: string;
  author: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
}

export async function POST(request: NextRequest) {
  let currentBook;
  
  try {
    currentBook = await request.json();
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json([], { status: 400 });
  }

  try {
    
    const searchQueries = [
      
      `"${currentBook.series_name}" inauthor:"${currentBook.author}"`,
      
      `"${currentBook.series_name}" "${currentBook.author}"`,
      
      `intitle:"${currentBook.series_name}" inauthor:"${currentBook.author}"`
    ];

    const allBooks = new Set<string>();
    const bookDetails: BookInSeries[] = [];

    for (const query of searchQueries) {
      try {
        const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&orderBy=relevance`;
        const response = await fetch(searchUrl);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.items) {
            for (const item of data.items) {
              const book = item.volumeInfo;
              if (!book.title || !book.authors) continue;
              
              
              const title = book.title.toLowerCase();
              const seriesName = currentBook.series_name.toLowerCase();
              const author = book.authors[0]?.toLowerCase();
              const currentAuthor = currentBook.author.toLowerCase();
              
              
              const excludePatterns = [
                'guide', 'companion', 'magical year', 'cookbook', 'journal', 
                'diary', 'handbook', 'encyclopedia', 'lexicon', 'atlas',
                'illustrated', 'screenplay', 'script', 'tales of', 'fantastic beasts',
                'quidditch', 'beedle', 'cursed child', 'short stories',
                'collection', 'anthology', 'treasury', 'archive'
              ];
              
              const isExcluded = excludePatterns.some(pattern => title.includes(pattern));
              
              
              if (!isExcluded && author === currentAuthor && (
                title.includes(seriesName) ||
                title.includes(seriesName.split(' ')[0]) || 
                (seriesName.includes('harry potter') && title.includes('harry potter')) ||
                (seriesName.includes('lord of the rings') && title.includes('ring')) ||
                (seriesName.includes('chronicles') && title.includes('chronicles'))
              )) {
                const bookKey = `${book.title}-${book.authors[0]}`;
                if (!allBooks.has(bookKey)) {
                  allBooks.add(bookKey);
                  bookDetails.push({
                    title: book.title,
                    author: book.authors[0],
                    publishedDate: book.publishedDate,
                    description: book.description,
                    pageCount: book.pageCount,
                    imageLinks: book.imageLinks
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error with search query "${query}":`, error);
      }
    }

    
    const uniqueBooks = bookDetails.filter((book, index, arr) => {
      
      const isDuplicate = arr.slice(0, index).some(prevBook => 
        prevBook.title.toLowerCase() === book.title.toLowerCase() ||
        (prevBook.title.toLowerCase().includes(book.title.toLowerCase()) || 
         book.title.toLowerCase().includes(prevBook.title.toLowerCase()))
      );
      return !isDuplicate;
    });

    
    uniqueBooks.sort((a, b) => {
      if (a.publishedDate && b.publishedDate) {
        return new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime();
      }
      return a.title.localeCompare(b.title);
    });

    
    const suggestions = uniqueBooks
      .slice(0, 5)
      .map(book => book.title);

    return NextResponse.json(suggestions);

  } catch (error) {
    console.error('Error finding other books in series:', error);
    return NextResponse.json([]);
  }
} 