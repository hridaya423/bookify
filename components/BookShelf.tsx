'use client';

import { useState, useEffect } from 'react';
import { Book } from '../types';
import { useSupabase } from '@/providers/supabase-provider';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, Clock, MoreHorizontal, BookOpenCheck, Library } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

export default function BookShelf({ status }: { status: Book['status'] }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const { toast } = useToast();

  useEffect(() => {
    fetchBooks();
  }, [status, supabase]);

  async function fetchBooks() {
    try {
      setLoading(true);
      setError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('status', status)
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });
      if (error) throw error;
      setBooks(data || []);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function updateBookStatus(bookId: string, newStatus: Book['status']) {
    try {
      setUpdating(bookId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let updateData: Partial<Book> = { status: newStatus };
      if (newStatus === 'past') {
        updateData.date_completed = new Date().toISOString();
      }

      const { error } = await supabase
        .from('books')
        .update(updateData)
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (error) throw error;
      setBooks(books.filter(book => book.id !== bookId));
      
      toast({
        title: "Book updated",
        description: `Successfully moved to ${getStatusTitle(newStatus).toLowerCase()}`,
      });
    } catch (err) {
      console.error('Error updating book:', err);
      toast({
        title: "Error",
        description: "Failed to update book status",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  }

  const getStatusTitle = (bookStatus: Book['status'] = status) => {
    switch (bookStatus) {
      case 'past':
        return 'Past Reads';
      case 'current':
        return 'Currently Reading';
      case 'planned':
        return 'Plan to Read';
      default:
        return '';
    }
  };

  const getStatusIcon = (bookStatus: Book['status']) => {
    switch (bookStatus) {
      case 'past':
        return <BookOpenCheck className="h-5 w-5 text-emerald-500" />;
      case 'current':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'planned':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  const getAvailableActions = (currentStatus: Book['status']): Book['status'][] => {
    switch (currentStatus) {
      case 'planned':
        return ['current', 'past'];
      case 'current':
        return ['planned', 'past'];
      case 'past':
        return ['planned', 'current'];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-48 p-8">
        <Library className="h-8 w-8 animate-pulse text-red-400" />
        <p className="mt-4 text-red-500 font-medium">Loading your library...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-6 rounded-lg bg-red-50 border border-red-200 shadow-sm">
        <p className="font-medium">Error loading your library</p>
        <p className="text-sm mt-2 text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 pb-2 border-b border-gray-200">
        {getStatusIcon(status)}
        <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
          {getStatusTitle()}
        </h2>
      </div>
      
      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Library className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">No books in this section yet</p>
          <p className="text-sm text-gray-500 mt-2">Books you move to {getStatusTitle().toLowerCase()} will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <Card key={book.id} className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col">
              <CardHeader className="relative">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold text-gray-800 group-hover:text-red-500 transition-colors duration-200">
                    {book.title}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {getAvailableActions(status).map((newStatus) => (
                        <DropdownMenuItem
                          key={newStatus}
                          onClick={() => updateBookStatus(book.id, newStatus)}
                          disabled={updating === book.id}
                          className="p-3 cursor-pointer"
                        >
                          <span className="flex items-center">
                            {getStatusIcon(newStatus)}
                            <span className="ml-2">Move to {getStatusTitle(newStatus)}</span>
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                {book.coverUrl ? (
                  <div className="relative overflow-hidden rounded-lg mb-4 shadow-md group-hover:shadow-xl transition-shadow duration-200">
                    <Image
                      src={book.coverUrl}
                      alt={`Cover of ${book.title}`}
                      className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-red-100 to-red-200 rounded-lg mb-4 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-red-400" />
                  </div>
                )}
                <p className="font-medium text-gray-800">{book.author}</p>
                {book.genre && book.genre.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {book.genre.map((g) => (
                      <span key={g} className="px-2 py-1 text-xs rounded-full bg-red-50 text-red-600 font-medium">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="flex items-center text-sm text-gray-600">
                  {getStatusIcon(status)}
                  <span className="ml-2 font-medium">{getStatusTitle()}</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}