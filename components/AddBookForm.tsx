'use client';

import { useState, FormEvent, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSupabase } from '@/providers/supabase-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BookOpen, User, HashIcon, Link, BookMarked, X, Search, ChevronDown, Library } from 'lucide-react';
import { seriesDetectionService } from '@/lib/seriesDetection';

interface AddBookFormProps {
  onComplete: () => void;
  prefilledData?: {
    title?: string;
    author?: string;
    coverUrl?: string;
    totalPages?: number;
    seriesName?: string;
    seriesOrder?: number;
    categories?: string[];
  };
}

interface BookData {
  title: string;
  author: string;
  status: 'planned' | 'current' | 'past';
  coverurl: string | null;
  user_id: string;
  genre: string[];
  favorite: boolean;
  total_pages: number | null;
  current_page: number;
  date_completed: string | null;
  
  series_name: string | null;
  series_order: number | null;
  series_total_books: number | null;
  is_part_of_series: boolean | null;
}

interface BookSuggestion {
  id: string;
  title: string;
  authors: string[];
  publishedDate?: string;
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
  description?: string;
  categories?: string[];
}

interface GoogleBooksResponse {
  items?: Array<{
    id: string;
    volumeInfo?: {
      title?: string;
      authors?: string[];
      publishedDate?: string;
      pageCount?: number;
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
      };
      description?: string;
      categories?: string[];
    };
  }>;
}

export function AddBookForm({ onComplete, prefilledData }: AddBookFormProps) {
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [fetchingPageCount, setFetchingPageCount] = useState(false);
  const [title, setTitle] = useState(prefilledData?.title || '');
  const [author, setAuthor] = useState(prefilledData?.author || '');
  const [status, setStatus] = useState<BookData['status']>('planned');
  const [coverUrl, setCoverUrl] = useState(prefilledData?.coverUrl || '');
  const [totalPages, setTotalPages] = useState<number | null>(prefilledData?.totalPages || null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  
  const [bookSuggestions, setBookSuggestions] = useState<BookSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState(prefilledData?.title || '');
  const [hasSelectedBook, setHasSelectedBook] = useState(!!prefilledData?.title);
  
  
  const [isDetectingSeries, setIsDetectingSeries] = useState(false);
  const [seriesName, setSeriesName] = useState(prefilledData?.seriesName || '');
  const [seriesOrder, setSeriesOrder] = useState<number | null>(prefilledData?.seriesOrder || null);
  const [seriesTotalBooks, setSeriesTotalBooks] = useState<number | null>(null);
  const [isPartOfSeries, setIsPartOfSeries] = useState(!!prefilledData?.seriesName);
  
  const { supabase } = useSupabase();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleStatusChange = (value: string) => {
    setStatus(value as BookData['status']);
  };

  const resetForm = () => {
    setTitle(prefilledData?.title || '');
    setAuthor(prefilledData?.author || '');
    setCoverUrl(prefilledData?.coverUrl || '');
    setStatus('planned');
    setTotalPages(prefilledData?.totalPages || null);
    setError(null);
    setSearchQuery(prefilledData?.title || '');
    setBookSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setHasSelectedBook(!!prefilledData?.title);
    
    setSeriesName(prefilledData?.seriesName || '');
    setSeriesOrder(prefilledData?.seriesOrder || null);
    setSeriesTotalBooks(null);
    setIsPartOfSeries(!!prefilledData?.seriesName);
  };

  
  const detectSeries = async (book: BookSuggestion) => {
    setIsDetectingSeries(true);
    try {
      const bookInfo = {
        title: book.title,
        author: book.authors[0] || '',
        description: book.description,
        publishedDate: book.publishedDate
      };

      const detectedSeries = await seriesDetectionService.detectSeries(bookInfo);
      
      if (detectedSeries.isPartOfSeries) {
        setIsPartOfSeries(true);
        setSeriesName(detectedSeries.seriesName || '');
        setSeriesOrder(detectedSeries.seriesOrder || null);
        setSeriesTotalBooks(detectedSeries.totalBooks || null);
      } else {
        setIsPartOfSeries(false);
        setSeriesName('');
        setSeriesOrder(null);
        setSeriesTotalBooks(null);
      }
    } catch (error) {
      console.error('Error detecting series:', error);
    } finally {
      setIsDetectingSeries(false);
    }
  };

  const searchBooks = useCallback(async (query: string) => {
    if (!query || query.length < 2 || hasSelectedBook) {
      setBookSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setSearchLoading(true);
    setError(null);
      try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&fields=items(id,volumeInfo(title,authors,publishedDate,pageCount,imageLinks,description,categories))`
      );
      const data: GoogleBooksResponse = await response.json();
      
      if (data.items) {
        const suggestions: BookSuggestion[] = data.items.map(item => ({
          id: item.id,
          title: item.volumeInfo?.title || 'Unknown Title',
          authors: item.volumeInfo?.authors || ['Unknown Author'],
          publishedDate: item.volumeInfo?.publishedDate,
          pageCount: item.volumeInfo?.pageCount,
          imageLinks: item.volumeInfo?.imageLinks,
          description: item.volumeInfo?.description,
          categories: item.volumeInfo?.categories
        }));
        
        setBookSuggestions(suggestions);
        setShowSuggestions(true);
      } else {
        setBookSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching books:', error);
      setBookSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearchLoading(false);
    }
  }, [hasSelectedBook]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchBooks(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchBooks]);

  
  const checkForDuplicateBook = async (bookTitle: string, bookAuthor: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const trimmedTitle = bookTitle.trim();
      const trimmedAuthor = bookAuthor.trim();
      
      const { data: existingBooks, error: searchError } = await supabase
        .from('books')
        .select('id, title, author, status, series_name, series_order')
        .eq('user_id', user.id)
        .ilike('title', trimmedTitle)
        .ilike('author', trimmedAuthor);

      if (searchError) {
        console.error('Error checking for duplicates in preview:', searchError);
        return;
      }

      
      const duplicateBook = existingBooks?.find(book => 
        book.title.toLowerCase() === trimmedTitle.toLowerCase() && 
        book.author.toLowerCase() === trimmedAuthor.toLowerCase()
      );

      if (duplicateBook) {
        const statusText = duplicateBook.status === 'past' ? 'Completed' : 
                          duplicateBook.status === 'current' ? 'Currently Reading' : 'Planned';
        const seriesInfo = duplicateBook.series_name ? ` (${duplicateBook.series_name} #${duplicateBook.series_order})` : '';
        
        setError(`⚠️ This book is already in your library with status "${statusText}"${seriesInfo}.`);
      } else {
        
        if (error?.includes('already in your library')) {
          setError(null);
        }
      }
    } catch (err) {
      console.error('Error checking for duplicates:', err);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedSuggestionIndex(-1);
    
    if (hasSelectedBook && value !== title) {
      setHasSelectedBook(false);
    }
  };  
  const selectBook = async (book: BookSuggestion) => {
    setTitle(book.title);
    setAuthor(book.authors[0] || '');
    
    if (book.pageCount && book.pageCount > 0) {
      setTotalPages(book.pageCount);
    } else {
      setFetchingPageCount(true);
      try {
        const detailResponse = await fetch(
          `https://www.googleapis.com/books/v1/volumes/${book.id}?fields=volumeInfo(pageCount)`
        );
        const detailData = await detailResponse.json();
        if (detailData.volumeInfo?.pageCount) {
          setTotalPages(detailData.volumeInfo.pageCount);
        }
      } catch (error) {
        console.log('Could not fetch detailed page count:', error);
      } finally {
        setFetchingPageCount(false);
      }
    }
    
    const imageUrl = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail;
    if (imageUrl) {
      setCoverUrl(imageUrl.replace('http:', 'https:'));
    }
    
    setSearchQuery(book.title);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setBookSuggestions([]);
    setHasSelectedBook(true);
    
    
    await checkForDuplicateBook(book.title, book.authors[0] || '');
    
    
    await detectSeries(book);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || bookSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < bookSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : bookSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectBook(bookSuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  
  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestionRefs.current[selectedSuggestionIndex]) {
      suggestionRefs.current[selectedSuggestionIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedSuggestionIndex]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const userResult = await supabase.auth.getUser();
      
      if (userResult.error || !userResult.data.user) {
        throw new Error(userResult.error?.message || 'User not authenticated');
      }

      const user = userResult.data.user;

      const trimmedTitle = title.trim();
      const trimmedAuthor = author.trim();
      
      setCheckingDuplicates(true);
      const { data: existingBooks, error: searchError } = await supabase
        .from('books')
        .select('id, title, author, status, series_name, series_order')
        .eq('user_id', user.id)
        .ilike('title', trimmedTitle)
        .ilike('author', trimmedAuthor);

      setCheckingDuplicates(false);

      if (searchError) {
        console.error('Error checking for duplicates:', searchError);
      }

      const duplicateBook = existingBooks?.find(book => 
        book.title.toLowerCase() === trimmedTitle.toLowerCase() && 
        book.author.toLowerCase() === trimmedAuthor.toLowerCase()
      );

      if (duplicateBook) {
        const statusText = duplicateBook.status === 'past' ? 'Completed' : 
                          duplicateBook.status === 'current' ? 'Currently Reading' : 'Planned';
        const seriesInfo = duplicateBook.series_name ? ` (${duplicateBook.series_name} #${duplicateBook.series_order})` : '';
        
        throw new Error(`This book is already in your library with status "${statusText}"${seriesInfo}. Please check your existing books before adding duplicates.`);
      }

      const bookData: BookData = {
        title: trimmedTitle,
        author: trimmedAuthor,
        status,
        coverurl: coverUrl.trim() || null,
        user_id: user.id,
        genre: [],
        favorite: false,
        total_pages: totalPages,
        current_page: 0,
        date_completed: status === 'past' ? new Date().toISOString() : null,
        
        series_name: isPartOfSeries ? seriesName.trim() || null : null,
        series_order: isPartOfSeries ? seriesOrder : null,
        series_total_books: isPartOfSeries ? seriesTotalBooks : null,
        is_part_of_series: isPartOfSeries
      };
      
      const insertResult = await supabase
        .from('books')
        .insert(bookData)
        .select()
        .single();

      if (insertResult.error) {
        throw insertResult.error;
      }

      setSuccess(true);
      resetForm();
      setTimeout(() => {
        onComplete?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add book. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-400 to-pink-500 opacity-10 rounded-full transform translate-x-32 -translate-y-32" />

        <Button 
          onClick={onComplete}
          variant="ghost" 
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 z-10"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-red-400 to-pink-500 p-3 rounded-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">
              Add New Book
            </h2>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 animate-shake">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertDescription className="flex items-center gap-2 text-green-800">
                <BookMarked className="w-4 h-4" />
                Book added successfully!
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="bookSearch" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Search className="w-4 h-4 text-red-400" />
                Search for Book
              </Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="bookSearch"
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (bookSuggestions.length > 0 && !hasSelectedBook) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="w-full transition-all duration-200 border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 pr-10"
                  placeholder="Start typing a book title..."
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {searchLoading && (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
                
                
                {showSuggestions && bookSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
                    {bookSuggestions.map((book, index) => (
                                             <div
                         key={book.id}
                         ref={(el) => {
                           suggestionRefs.current[index] = el;
                         }}
                         onClick={() => selectBook(book)}
                         className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-red-50 transition-colors ${
                           selectedSuggestionIndex === index ? 'bg-red-50 border-red-200' : ''
                         }`}
                       >
                        <div className="flex gap-3">
                          {book.imageLinks?.thumbnail && (
                            <img
                              src={book.imageLinks.thumbnail.replace('http:', 'https:')}
                              alt={book.title}
                              className="w-12 h-16 object-cover rounded border"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{book.title}</h4>
                            <p className="text-sm text-gray-600 truncate">by {book.authors.join(', ')}</p>                            {book.publishedDate && (
                              <p className="text-xs text-gray-500">{book.publishedDate}</p>
                            )}
                            {book.pageCount && (
                              <p className="text-xs text-red-600 font-medium">{book.pageCount} pages</p>
                            )}
                            {!book.pageCount && (
                              <p className="text-xs text-gray-400">Pages: Not available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">Start typing to search millions of books from Google Books</p>
            </div>

            
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-400" />
                Title
              </Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  
                  if (e.target.value.trim() && author.trim()) {
                    const timeoutId = setTimeout(() => {
                      checkForDuplicateBook(e.target.value, author);
                    }, 500); 
                    return () => clearTimeout(timeoutId);
                  }
                }}
                required
                className="w-full transition-all duration-200 border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                placeholder="Book title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-red-400" />
                Author
              </Label>
              <Input
                id="author"
                type="text"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  
                  if (title.trim() && e.target.value.trim()) {
                    const timeoutId = setTimeout(() => {
                      checkForDuplicateBook(title, e.target.value);
                    }, 500); 
                    return () => clearTimeout(timeoutId);
                  }
                }}
                required
                className="w-full transition-all duration-200 border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                placeholder="Author name"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">              
              <div className="space-y-2">
                <Label htmlFor="totalPages" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <HashIcon className="w-4 h-4 text-red-400" />
                  Total Pages
                  {fetchingPageCount && (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="totalPages"
                    type="number"
                    value={totalPages || ''}
                    onChange={(e) => setTotalPages(parseInt(e.target.value) || null)}
                    className="w-full transition-all duration-200 border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    placeholder={fetchingPageCount ? "Fetching page count..." : "Number of pages"}
                    disabled={fetchingPageCount}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-red-400" />
                  Reading Status
                </Label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full transition-all duration-200 border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Plan to Read</SelectItem>
                    <SelectItem value="current">Currently Reading</SelectItem>
                    <SelectItem value="past">Already Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverUrl" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Link className="w-4 h-4 text-red-400" />
                Cover URL
              </Label>
              <Input
                id="coverUrl"
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className="w-full transition-all duration-200 border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                placeholder="https://"
              />
              {coverUrl && (
                <div className="mt-2">
                  <img 
                    src={coverUrl} 
                    alt="Book cover preview" 
                    className="w-24 h-36 object-cover rounded-lg shadow-md"
                    onError={() => setError('Invalid cover image URL')}
                  />
                </div>
              )}
            </div>

            
            {(isDetectingSeries || isPartOfSeries) && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Library className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-800">Series Information</h3>
                  {isDetectingSeries && (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {isPartOfSeries && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="seriesName" className="text-sm font-medium text-gray-700">
                        Series Name
                      </Label>
                      <Input
                        id="seriesName"
                        type="text"
                        value={seriesName}
                        onChange={(e) => setSeriesName(e.target.value)}
                        className="w-full transition-all duration-200 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="Series name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seriesOrder" className="text-sm font-medium text-gray-700">
                        Book Number
                      </Label>
                      <Input
                        id="seriesOrder"
                        type="number"
                        step="0.1"
                        value={seriesOrder || ''}
                        onChange={(e) => setSeriesOrder(parseFloat(e.target.value) || null)}
                        className="w-full transition-all duration-200 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seriesTotalBooks" className="text-sm font-medium text-gray-700">
                        Total Books (Optional)
                      </Label>
                      <Input
                        id="seriesTotalBooks"
                        type="number"
                        value={seriesTotalBooks || ''}
                        onChange={(e) => setSeriesTotalBooks(parseInt(e.target.value) || null)}
                        className="w-full transition-all duration-200 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="7"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPartOfSeries"
                    checked={isPartOfSeries}
                    onChange={(e) => setIsPartOfSeries(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="isPartOfSeries" className="text-sm font-medium text-gray-700">
                    This book is part of a series
                  </Label>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || checkingDuplicates}
              className="w-full bg-gradient-to-r from-red-400 to-pink-500 text-white py-4 rounded-xl transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            >
              {checkingDuplicates ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Checking for duplicates...
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding Book...
                </div>
              ) : (
                'Add to Library'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : null;
}

export default AddBookForm;