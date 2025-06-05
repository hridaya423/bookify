'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { seriesDetectionService } from '@/lib/seriesDetection';
import { BookOpen, CheckCircle, Clock, Plus, ArrowRight, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { AnimatePresence } from 'framer-motion';
import { AddBookForm } from '@/components/AddBookForm';

interface SeriesBook {
  id: string;
  title: string;
  author: string;
  status: 'planned' | 'current' | 'past';
  series_name: string;
  series_order: number;
  coverurl?: string;
  total_pages?: number;
  current_page?: number;
}

interface SeriesProgressProps {
  seriesName: string;
  userId: string;
}

export function SeriesProgress({ seriesName, userId }: SeriesProgressProps) {
  const [seriesBooks, setSeriesBooks] = useState<SeriesBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherBooksInSeries, setOtherBooksInSeries] = useState<string[]>([]);
  const [showAddBook, setShowAddBook] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');
  const [showFullForm, setShowFullForm] = useState(false);
  const [autoSelectedBook, setAutoSelectedBook] = useState<{
    id: string;
    title: string;
    authors: string[];
    publishedDate?: string;
    pageCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    description?: string;
    categories?: string[];
  } | null>(null);
  const [updatingBook, setUpdatingBook] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    book: SeriesBook | null;
  }>({ isOpen: false, book: null });
  const { supabase } = useSupabase();
  const { toast } = useToast();

  useEffect(() => {
    loadSeriesBooks();
  }, [seriesName, userId]);

  const loadSeriesBooks = async () => {
    setLoading(true);
    try {
      const books = await seriesDetectionService.getSeriesBooks(seriesName, userId, supabase);
      setSeriesBooks(books as SeriesBook[]);
      
      
      if (books.length > 0) {
        
        const booksArray = books as SeriesBook[];
        const highestOrderBook = booksArray.reduce((highest, current) => 
          current.series_order > highest.series_order ? current : highest
        );
        
        const allSeriesBooks = await seriesDetectionService.findOtherBooksInSeries({
          series_name: highestOrderBook.series_name,
          series_order: highestOrderBook.series_order,
          author: highestOrderBook.author
        });
        
        
        const userBookTitles = booksArray.map(book => book.title.toLowerCase());
        const newBooks = allSeriesBooks.filter(bookTitle => 
          !userBookTitles.includes(bookTitle.toLowerCase())
        );
        
        setOtherBooksInSeries(newBooks);
      }
    } catch (error) {
      console.error('Error loading series books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestedBook = async (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    
    
    try {
      const searchQuery = encodeURIComponent(suggestion);
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${searchQuery}&maxResults=5`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          
          const bestMatch = data.items[0];
          const bookData = {
            id: bestMatch.id,
            title: bestMatch.volumeInfo?.title || suggestion,
            authors: bestMatch.volumeInfo?.authors || [],
            publishedDate: bestMatch.volumeInfo?.publishedDate,
            pageCount: bestMatch.volumeInfo?.pageCount,
            imageLinks: bestMatch.volumeInfo?.imageLinks,
            description: bestMatch.volumeInfo?.description,
            categories: bestMatch.volumeInfo?.categories
          };
          
          
          setAutoSelectedBook(bookData);
        }
      }
    } catch (error) {
      console.error('Error fetching book details:', error);
    }
    
    setShowAddBook(true);
    setShowFullForm(true); 
  };

  const handleBookAdded = () => {
    setShowAddBook(false);
    setSelectedSuggestion('');
    setShowFullForm(false);
    setAutoSelectedBook(null);
    
    loadSeriesBooks();
  };

  const openDeleteDialog = (book: SeriesBook) => {
    setDeleteDialog({ isOpen: true, book });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, book: null });
  };

  const confirmDeleteBook = async () => {
    const book = deleteDialog.book;
    if (!book) return;

    try {
      setUpdatingBook(book.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Attempting to delete series book:', { bookId: book.id, userId: user.id, title: book.title, seriesName: book.series_name });

      
      const { error: dailyReadingError } = await supabase
        .from('daily_reading')
        .delete()
        .eq('book_id', book.id)
        .eq('user_id', user.id);

      if (dailyReadingError) {
        console.error('Error deleting daily reading records:', dailyReadingError);
        throw new Error(`Failed to delete related reading records: ${dailyReadingError.message || 'Unknown error'}`);
      }

      console.log('Daily reading records deleted successfully');

      
      const { data, error } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id)
        .eq('user_id', user.id);

      console.log('Delete response:', { data, error });

      if (error) {
        console.error('Supabase delete error:', error);
        throw new Error(`Database error: ${error.message || 'Unknown error'}`);
      }

      
      await loadSeriesBooks();
      
      toast({
        title: "Book deleted",
        description: `"${book.title}" has been removed from your library`,
      });

      closeDeleteDialog();
    } catch (err) {
      console.error('Error deleting book:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        errorObject: err
      });
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred while deleting the book';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUpdatingBook(null);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2">Loading series...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (seriesBooks.length === 0) {
    return null;
  }

  const progress = seriesDetectionService.calculateSeriesProgress(seriesBooks);
  const sortedBooks = [...seriesBooks].sort((a, b) => a.series_order - b.series_order);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'past':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'current':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'planned':
        return <BookOpen className="w-4 h-4 text-gray-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'past':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'current':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteBook}
        title="Delete Book from Series"
        message="Are you sure you want to delete this book from the series? This action cannot be undone."
        itemName={deleteDialog.book?.title || ''}
        isDeleting={updatingBook === deleteDialog.book?.id}
      />
      
      <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-red-500" />
          {seriesName} Series
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress: {progress.completedBooks} of {progress.totalBooks} books</span>
            <span>{Math.round(progress.progressPercentage)}% complete</span>
          </div>
          <Progress value={progress.progressPercentage} className="w-full" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        <div className="space-y-3">
          {sortedBooks.map((book) => (
            <div
              key={book.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors group"
            >
              {book.coverurl && (
                <img
                  src={book.coverurl}
                  alt={book.title}
                  className="w-12 h-16 object-cover rounded border"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(book.status)}
                  <span className="font-medium text-gray-900 truncate">
                    Book {book.series_order}: {book.title}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getStatusColor(book.status)}`}>
                    {book.status === 'past' ? 'Completed' : 
                     book.status === 'current' ? 'Reading' : 'Planned'}
                  </Badge>
                  
                  {book.status === 'current' && book.current_page && book.total_pages && (
                    <span className="text-xs text-gray-500">
                      Page {book.current_page} of {book.total_pages}
                    </span>
                  )}
                </div>
              </div>

              
              <div 
                className="book-actions"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      disabled={updatingBook === book.id}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDeleteDialog(book);
                      }}
                      onSelect={(e) => {
                        e.preventDefault();
                      }}
                      disabled={updatingBook === book.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Book
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        
        {otherBooksInSeries.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-blue-500" />
              Others in Series
            </h4>
            <div className="space-y-2">
              {otherBooksInSeries.map((suggestion: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded border border-dashed border-gray-300 bg-gray-50"
                >
                  <span className="text-sm text-gray-700">{suggestion}</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs"
                    onClick={() => handleAddSuggestedBook(suggestion)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        
        <AnimatePresence>
          {showAddBook && !showFullForm && (
            <div className="border-t pt-4">
              <AddBookFormWithSuggestion 
                suggestion={selectedSuggestion}
                seriesName={seriesName}
                seriesBooks={seriesBooks}
                onComplete={handleBookAdded}
                onCancel={() => setShowAddBook(false)}
                onCustomize={() => setShowFullForm(true)}
              />
            </div>
          )}
          {showAddBook && showFullForm && (
            <div className="border-t pt-4">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Auto-selected:</strong> {autoSelectedBook?.title || selectedSuggestion} (Book #{seriesBooks.length + 1} in {seriesName} series)
                </div>
                {autoSelectedBook && (
                  <div className="mt-2 flex items-center gap-3">
                    {autoSelectedBook.imageLinks?.thumbnail && (
                      <img
                        src={autoSelectedBook.imageLinks.thumbnail.replace('http:', 'https:')}
                        alt={autoSelectedBook.title}
                        className="w-12 h-16 object-cover rounded border"
                      />
                    )}
                    <div>
                      <div className="font-medium text-blue-900">{autoSelectedBook.title}</div>
                      <div className="text-sm text-blue-700">by {autoSelectedBook.authors.join(', ')}</div>
                      {autoSelectedBook.pageCount && (
                        <div className="text-xs text-blue-600">{autoSelectedBook.pageCount} pages</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <AddBookForm 
                onComplete={handleBookAdded}
                prefilledData={{
                  title: autoSelectedBook?.title || selectedSuggestion,
                  author: autoSelectedBook?.authors?.[0] || '',
                  coverUrl: autoSelectedBook?.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
                  totalPages: autoSelectedBook?.pageCount || undefined,
                  seriesName: seriesName,
                  seriesOrder: seriesBooks.length + 1,
                  categories: autoSelectedBook?.categories || []
                }}
              />
            </div>
          )}
        </AnimatePresence>

        
        <div className="border-t pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{progress.completedBooks}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{progress.currentlyReading}</div>
              <div className="text-xs text-gray-500">Reading</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{progress.plannedBooks}</div>
              <div className="text-xs text-gray-500">Planned</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}


function AddBookFormWithSuggestion({ 
  suggestion, 
  seriesName, 
  seriesBooks, 
  onComplete, 
  onCancel,
  onCustomize
}: {
  suggestion: string;
  seriesName: string;
  seriesBooks: SeriesBook[];
  onComplete: () => void;
  onCancel: () => void;
  onCustomize: () => void;
}) {
  const { supabase } = useSupabase();
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  const getNextSeriesOrder = () => {
    if (seriesBooks.length === 0) return 1;
    const maxOrder = Math.max(...seriesBooks.map(book => book.series_order));
    return maxOrder + 1;
  };

  const handleQuickAdd = async () => {
    if (!suggestion.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        console.error('Error getting user:', error);
        return;
      }

      const nextOrder = getNextSeriesOrder();
      
      
      const firstBook = seriesBooks.find(book => book.series_order === 1) || seriesBooks[0];
      const author = firstBook?.author || '';

      const bookData = {
        user_id: data.user.id,
        title: suggestion,
        author: author,
        status: 'planned' as const,
        coverurl: null,
        genre: [], 
        favorite: false,
        total_pages: null,
        current_page: 0,
        date_completed: null,
        
        series_name: seriesName,
        series_order: nextOrder,
        series_total_books: null,
        is_part_of_series: true
      };

      const { error: insertError } = await supabase
        .from('books')
        .insert([bookData]);

      if (insertError) {
        console.error('Error adding book:', insertError);
        console.error('Book data that failed:', bookData);
        alert(`Failed to add book: ${insertError.message || 'Unknown error'}. Please try again.`);
        return;
      }

      onComplete();
    } catch (error) {
      console.error('Error adding suggested book:', error);
      alert('Failed to add book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-blue-800">Add Series Book</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-blue-600 hover:text-blue-800"
        >
          Cancel
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="p-3 bg-white rounded border">
          <div className="text-sm text-gray-600 mb-1">Suggested Title:</div>
          <div className="font-medium text-gray-900">{suggestion}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Series:</span>
            <span className="ml-2 font-medium">{seriesName}</span>
          </div>
          <div>
            <span className="text-gray-600">Book #:</span>
            <span className="ml-2 font-medium">{getNextSeriesOrder()}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleQuickAdd}
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Quick Add
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCustomize}
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            Customize
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SeriesProgress; 