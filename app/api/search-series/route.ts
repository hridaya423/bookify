/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

interface SeriesSearchResult {
  seriesName: string;
  totalBooks: number;
  author: string;
  books: {
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
  }[];
}

interface GoogleBookItem {
  volumeInfo: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    categories?: string[];
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    
    const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40&orderBy=relevance`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch from Google Books API');
    }

    const data = await response.json();
    
    if (!data.items) {
      return NextResponse.json([]);
    }

    
    const seriesMap = new Map<string, {
      books: any[];
      author: string;
      totalEstimate: number;
    }>();

    data.items.forEach((item: GoogleBookItem) => {
      const book = item.volumeInfo;
      if (!book.title || !book.authors || book.authors.length === 0) return;

      const author = book.authors[0];
      
      const seriesInfo = extractSeriesInfo(book.title)  ;
      
      if (seriesInfo.seriesName) {
        const key = `${seriesInfo.seriesName}-${author}`;
        
        if (!seriesMap.has(key)) {
          seriesMap.set(key, {
            books: [],
            author: author,
            totalEstimate: 0
          });
        }
        
        const seriesData = seriesMap.get(key)!;
        seriesData.books.push({
          title: book.title,
          author: author,
          order: seriesInfo.order || seriesData.books.length + 1,
          publishedDate: book.publishedDate,
          description: book.description,
          pageCount: book.pageCount,
          imageLinks: book.imageLinks,
          categories: book.categories
        });
        
        
        if (seriesInfo.totalBooks && seriesInfo.totalBooks > seriesData.totalEstimate) {
          seriesData.totalEstimate = seriesInfo.totalBooks;
        }
      }
    });

    const seriesResults: SeriesSearchResult[] = [];
    
    seriesMap.forEach((seriesData, key) => {
      const [seriesName] = key.split('-');
      
      
      seriesData.books.sort((a, b) => a.order - b.order);
      
      
      const uniqueBooks = [];
      const seenTitles = new Set();
      
      for (const book of seriesData.books) {
        const normalizedTitle = book.title.toLowerCase().replace(/[^\w\s]/g, '');
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          uniqueBooks.push(book);
        }
      }

      
      if (uniqueBooks.length >= 2) {
        seriesResults.push({
          seriesName: seriesName,
          totalBooks: Math.max(seriesData.totalEstimate, uniqueBooks.length),
          author: seriesData.author,
          books: uniqueBooks
        });
      }
    });

    
    seriesResults.sort((a, b) => {
      const aRelevance = a.books.length * 2 + (a.totalBooks || 0);
      const bRelevance = b.books.length * 2 + (b.totalBooks || 0);
      return bRelevance - aRelevance;
    });

    return NextResponse.json(seriesResults.slice(0, 10)); 

  } catch (error) {
    console.error('Error searching for series:', error);
    return NextResponse.json({ error: 'Failed to search for series' }, { status: 500 });
  }
}

function extractSeriesInfo(title: string): { seriesName?: string; order?: number; totalBooks?: number } {
  const cleanTitle = title.toLowerCase();
  
  
  const patterns = [
    
    /^(.*?)\s+and\s+the\s+/i,
    
    /^(.*?):\s+/i,
    
    /^(.*?):\s*book\s*\d+/i,
    
    /^(.*?)\s*#\s*\d+/i,
    
    /^(.*?)\s+book\s+\d+/i,
    
    /^(.*?)\s*\(book\s*\d+\)/i,
    
    /^(.*?)\s+volume\s+\d+/i,
    
    /^(.*chronicles.*?):\s+/i,
  ];

  
  const orderPatterns = [
    /book\s*(\d+)/i,
    /#(\d+)/,
    /\(book\s*(\d+)\)/i,
    /volume\s*(\d+)/i,
    /part\s*(\d+)/i,
  ];

  let seriesName: string | undefined;
  let order: number | undefined;

  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      seriesName = match[1].trim();
      break;
    }
  }

  
  const knownSeries = [
    'harry potter',
    'lord of the rings',
    'chronicles of narnia',
    'hunger games',
    'twilight',
    'divergent',
    'maze runner',
    'foundation',
    'dune',
    'game of thrones',
    'wheel of time',
    'mistborn',
    'stormlight archive'
  ];

  if (!seriesName) {
    for (const series of knownSeries) {
      if (cleanTitle.includes(series)) {
        seriesName = series;
        break;
      }
    }
  }

  
  for (const pattern of orderPatterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      order = parseInt(match[1]);
      break;
    }
  }

  
  if (seriesName) {
    
    if (seriesName.toLowerCase().includes('harry potter')) {
      seriesName = 'Harry Potter';
      if (cleanTitle.includes('philosopher') || cleanTitle.includes('sorcerer')) order = 1;
      else if (cleanTitle.includes('chamber')) order = 2;
      else if (cleanTitle.includes('prisoner')) order = 3;
      else if (cleanTitle.includes('goblet')) order = 4;
      else if (cleanTitle.includes('phoenix')) order = 5;
      else if (cleanTitle.includes('prince')) order = 6;
      else if (cleanTitle.includes('hallows')) order = 7;
    }
    
    
    if (seriesName.toLowerCase().includes('lord of the rings')) {
      seriesName = 'The Lord of the Rings';
      if (cleanTitle.includes('fellowship')) order = 1;
      else if (cleanTitle.includes('two towers')) order = 2;
      else if (cleanTitle.includes('return')) order = 3;
    }
  }

  return { seriesName, order };
} 