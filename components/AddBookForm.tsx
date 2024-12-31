'use client';

import { useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BookOpen, User, HashIcon, Link, BookMarked, X } from 'lucide-react';

export function AddBookForm({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState('planned');
  const [coverUrl, setCoverUrl] = useState('');
  const [totalPages, setTotalPages] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { supabase } = useSupabase();

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setCoverUrl('');
    setStatus('planned');
    setTotalPages(null);
    setError(null);
  };

  const fetchBookDetails = async (title, author) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}&maxResults=1`
      );
      const data = await response.json();
      if (data.items?.[0]?.volumeInfo?.pageCount) {
        setTotalPages(data.items[0].volumeInfo.pageCount);
      }
    } catch (error) {
      console.error('Error fetching book details:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const userResult = await supabase.auth.getUser();
      
      if (userResult.error || !userResult.data.user) {
        throw new Error(userResult.error?.message || 'User not authenticated');
      }

      if (!totalPages) {
        await fetchBookDetails(title, author);
      }

      const user = userResult.data.user;

      const bookData = {
        title: title.trim(),
        author: author.trim(),
        status,
        coverurl: coverUrl.trim() || null,
        user_id: user.id,
        genre: [],
        favorite: false,
        total_pages: totalPages,
        current_page: 0,
        date_completed: status === 'past' ? new Date().toISOString() : null
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">

        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-400 to-pink-500 opacity-10 rounded-full transform translate-x-32 -translate-y-32" />
        
        <Button 
          onClick={onComplete}
          variant="ghost" 
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100"
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
              <Label htmlFor="title" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-400" />
                Title
              </Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full transition-all duration-200 border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                placeholder="Enter book title"
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
                onChange={(e) => setAuthor(e.target.value)}
                required
                className="w-full transition-all duration-200 border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                placeholder="Enter author name"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="totalPages" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <HashIcon className="w-4 h-4 text-red-400" />
                  Total Pages
                </Label>
                <Input
                  id="totalPages"
                  type="number"
                  value={totalPages || ''}
                  onChange={(e) => setTotalPages(parseInt(e.target.value) || null)}
                  className="w-full transition-all duration-200 border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  placeholder="Auto-fetch"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-red-400" />
                  Reading Status
                </Label>
                <Select value={status} onValueChange={setStatus}>
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
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-400 to-pink-500 text-white py-4 rounded-xl transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
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
}

export default AddBookForm;