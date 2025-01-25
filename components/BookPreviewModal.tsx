import React from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, BookOpen, Calendar, Clock } from 'lucide-react';
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
}

const BookPreviewModal: React.FC<BookPreviewModalProps> = ({ book, onClose }) => {
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

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl bg-white/95 backdrop-blur-sm shadow-xl">
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
              <div className="w-48 h-64 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-red-400" />
              </div>
            )}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{book.title}</h2>
                <p className="text-lg text-gray-600">by {book.author}</p>
              </div>
              {book.genre && book.genre.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {book.genre.map((g) => (
                    <span key={g} className="px-3 py-1 text-sm rounded-full bg-red-50 text-red-600 font-medium">
                      {g}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reading Progress</span>
                  <span className="font-medium">
                    {book.current_page || 0} / {book.total_pages || 0} pages
                  </span>
                </div>
                <Progress value={progress} className="h-2 bg-red-100" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-red-400" />
              <span>Added: {formatDate(book.date_added)}</span>
            </div>
            {book.date_completed && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-red-400" />
                <span>Completed: {formatDate(book.date_completed)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};

export default BookPreviewModal;
