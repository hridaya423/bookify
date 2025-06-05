import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, BookOpen, Calendar, Clock, Sparkles, Loader2 } from 'lucide-react';
import { useSupabase } from '@/providers/supabase-provider';

interface Book {
  id: string;
  title: string;
  author: string;
  status: 'past' | 'current' | 'planned';
  coverUrl: string | null;
  genre?: string[];
  user_id: string;  
  date_added: string;
  date_completed?: string;
  current_page?: number;
  total_pages?: number;
}

interface BookPreviewModalProps {
  book: Book;
  onClose: () => void;
  onUpdate?: () => void;
  isOpen: boolean;
}

export const BookPreviewModal: React.FC<BookPreviewModalProps> = ({ book, onClose, isOpen }) => {
  const { supabase } = useSupabase();
  const [similarBooks, setSimilarBooks] = useState<string | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  
  const progress = book.current_page && book.total_pages 
    ? (book.current_page / book.total_pages) * 100 
    : 0;

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const findSimilarBooks = async () => {
    setLoadingSimilar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const response = await fetch('/api/similar-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          book_id: book.id
        }),
      });

      if (!response.ok) throw new Error('Failed to get similar books');

      const data = await response.json();
      setSimilarBooks(data.recommendations);
    } catch (error) {
      console.error('Error finding similar books:', error);
      setSimilarBooks('Sorry, I encountered an error while finding similar books. Please try again.');
    } finally {
      setLoadingSimilar(false);
    }
  };

  const formatSimilarBooks = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        if (line.match(/^\d+\./)) {
          return (
            <h4 key={index} className="font-semibold mt-3 mb-1 text-primary">
              {line}
            </h4>
          );
        }
        if (line.startsWith('   ')) {
          return (
            <p key={index} className="ml-4 mb-1 text-sm text-muted-foreground">
              {line.trim()}
            </p>
          );
        }
        if (line.trim() === '') {
          return <div key={index} className="mb-2" />;
        }
        return (
          <p key={index} className="mb-1 text-sm">
            {line}
          </p>
        );
      });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl bg-background shadow-xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative pb-0">
          <Button 
            onClick={onClose}
            variant="ghost" 
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-6">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={`Cover of ${book.title}`}
                className="w-48 h-64 object-cover rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-48 h-64 bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{book.title}</h2>
                <p className="text-lg text-muted-foreground">by {book.author}</p>
              </div>
              {book.genre && book.genre.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {book.genre.map((g) => (
                    <span key={g} className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary font-medium">
                      {g}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reading Progress</span>
                  <span className="font-medium">
                    {book.current_page || 0} / {book.total_pages || 0} pages
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Added: {formatDate(book.date_added)}</span>
            </div>
            {book.date_completed && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 text-primary" />
                <span>Completed: {formatDate(book.date_completed)}</span>
              </div>
            )}
          </div>

          
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Find Similar Books</h3>
              <Button 
                onClick={findSimilarBooks}
                disabled={loadingSimilar}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loadingSimilar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {loadingSimilar ? 'Finding...' : 'Get Recommendations'}
              </Button>
            </div>
            
            {similarBooks && (
              <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {formatSimilarBooks(similarBooks)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};

