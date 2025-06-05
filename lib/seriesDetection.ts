import { SupabaseClient } from '@supabase/supabase-js';

interface SeriesInfo {
  isPartOfSeries: boolean;
  seriesName?: string;
  seriesOrder?: number;
  totalBooks?: number;
  confidence: number; 
}

interface BookInfo {
  title: string;
  author: string;
  description?: string;
  publishedDate?: string;
}

class SeriesDetectionService {
  
  private async detectSeriesWithAPI(bookInfo: BookInfo): Promise<SeriesInfo> {
    try {
      const response = await fetch('/api/detect-series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookInfo),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      } 

      const result: SeriesInfo = await response.json();
      return result;

    } catch (error) {
      console.error('API series detection failed:', error);
      
      
      return this.fallbackPatternDetection(bookInfo.title);
    }
  }

  
  private fallbackPatternDetection(title: string): SeriesInfo {
    const basicPatterns = [
      /book\s+(\d+)/i,
      /#(\d+)/,
      /\((\d+)\)/,
      /volume\s+(\d+)/i
    ];

    for (const pattern of basicPatterns) {
      const match = title.match(pattern);
      if (match) {
        const order = parseInt(match[1]);
        if (!isNaN(order)) {
          return {
            isPartOfSeries: true,
            seriesOrder: order,
            confidence: 0.5 
          };
        }
      }
    }

    return {
      isPartOfSeries: false,
      confidence: 0.3
    };
  }

  
  async detectSeries(bookInfo: BookInfo): Promise<SeriesInfo> {
    
    return await this.detectSeriesWithAPI(bookInfo);
  }

  
  async findOtherBooksInSeries(currentBook: { series_name: string; series_order: number; author: string }): Promise<string[]> {
    try {
      const response = await fetch('/api/find-series-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentBook),
      });

      if (response.ok) {
        const suggestions = await response.json();
        return Array.isArray(suggestions) ? suggestions : [];
      }
    } catch (error) {
      console.error('Error finding other books in series:', error);
    }

    
    return [];
  }

  
  async getSeriesBooks(seriesName: string, userId: string, supabase: SupabaseClient): Promise<unknown[]> {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .eq('series_name', seriesName)
        .order('series_order', { ascending: true });

      if (error) {
        console.error('Error fetching series books:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching series books:', error);
      return [];
    }
  }

  
  calculateSeriesProgress(seriesBooks: { status: string }[]): {
    totalBooks: number;
    completedBooks: number;
    currentlyReading: number;
    plannedBooks: number;
    progressPercentage: number;
  } {
    const totalBooks = seriesBooks.length;
    const completedBooks = seriesBooks.filter(book => book.status === 'past').length;
    const currentlyReading = seriesBooks.filter(book => book.status === 'current').length;
    const plannedBooks = seriesBooks.filter(book => book.status === 'planned').length;
    
    const progressPercentage = totalBooks > 0 ? (completedBooks / totalBooks) * 100 : 0;

    return {
      totalBooks,
      completedBooks,
      currentlyReading,
      plannedBooks,
      progressPercentage
    };
  }
}

export const seriesDetectionService = new SeriesDetectionService();
export type { SeriesInfo, BookInfo }; 