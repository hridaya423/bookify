/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { Book, Search,  SortAsc, SortDesc, Grid, List, BookOpen, Calendar, Star, Tag, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookPreviewModal } from '@/components/BookPreviewModal';

interface BookType {
  id: string;
  title: string;
  author: string;
  genre: string[];
  status: 'planned' | 'current' | 'past';
  favorite: boolean;
  date_added: string;
  date_completed?: string;
  coverUrl: string | null;
  total_pages?: number;
  current_page?: number;
  series_name?: string;
  series_order?: number;
  is_part_of_series?: boolean;
  user_id: string;
}

export default function LibraryPage() {
  const { supabase } = useSupabase();
  const [books, setBooks] = useState<BookType[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<BookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState('date_added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    filterAndSortBooks();
  }, [books, searchTerm, selectedGenre, selectedStatus, sortBy, sortOrder, showFavoritesOnly]);

  const fetchBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) throw error;
      
      const transformedBooks: BookType[] = (data || []).map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        genre: book.genre || [],
        status: book.status as 'planned' | 'current' | 'past',
        favorite: book.favorite || false,
        date_added: book.date_added || '',
        date_completed: book.date_completed || undefined,
        coverUrl: book.coverurl,
        total_pages: book.total_pages || undefined,
        current_page: book.current_page || undefined,
        series_name: book.series_name || undefined,
        series_order: book.series_order || undefined,
        is_part_of_series: book.is_part_of_series || false,
        user_id: book.user_id || user.id,
      }));
      
      setBooks(transformedBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortBooks = () => {
    let filtered = books;

    
    if (searchTerm) {
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.genre.some(g => g.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (book.series_name && book.series_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(book => book.genre.includes(selectedGenre));
    }

    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(book => book.status === selectedStatus);
    }

    
    if (showFavoritesOnly) {
      filtered = filtered.filter(book => book.favorite);
    }

    
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof BookType];
      let bValue: any = b[sortBy as keyof BookType];

      if (sortBy === 'date_added' || sortBy === 'date_completed') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }

      if (sortBy === 'title' || sortBy === 'author') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredBooks(filtered);
  };

  const getUniqueGenres = () => {
    const genres = new Set<string>();
    books.forEach(book => book.genre.forEach(g => genres.add(g)));
    return Array.from(genres).sort();
  };

  const getReadingProgress = (book: BookType) => {
    if (!book.total_pages || !book.current_page) return 0;
    return Math.round((book.current_page / book.total_pages) * 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'current': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'past': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const BookCard = ({ book }: { book: BookType }) => (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
      onClick={() => setSelectedBook(book)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {book.coverUrl ? (
            <img 
              src={book.coverUrl} 
              alt={book.title}
              className="w-16 h-20 object-cover rounded-md flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-20 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold line-clamp-2 leading-tight">
              {book.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className={getStatusColor(book.status)}>
                {book.status}
              </Badge>
              {book.favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {book.series_name && (
          <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
            <BookMarked className="w-3 h-3" />
            <span>{book.series_name} #{book.series_order}</span>
          </div>
        )}
        {book.status === 'current' && book.total_pages && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{getReadingProgress(book)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${getReadingProgress(book)}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mb-2">
          {book.genre.slice(0, 2).map((genre, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {genre}
            </Badge>
          ))}
          {book.genre.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{book.genre.length - 2} more
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Added: {formatDate(book.date_added)}
        </div>
      </CardContent>
    </Card>
  );

  const BookListItem = ({ book }: { book: BookType }) => (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={() => setSelectedBook(book)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {book.coverUrl ? (
            <img 
              src={book.coverUrl} 
              alt={book.title}
              className="w-12 h-16 object-cover rounded-md flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg line-clamp-1">{book.title}</h3>
                <p className="text-muted-foreground">{book.author}</p>
                {book.series_name && (
                  <p className="text-sm text-muted-foreground">
                    {book.series_name} #{book.series_order}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="secondary" className={getStatusColor(book.status)}>
                  {book.status}
                </Badge>
                {book.favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                <span>{book.genre.join(', ')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Added {formatDate(book.date_added)}</span>
              </div>
              {book.status === 'current' && book.total_pages && (
                <div className="flex items-center gap-2">
                  <span>Progress: {getReadingProgress(book)}%</span>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${getReadingProgress(book)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Book className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-lg font-medium">Loading your library...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Library</h1>
        <p className="text-muted-foreground">
          {books.length} books • {filteredBooks.length} shown
        </p>
      </div>

      
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search books, authors, genres, or series..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {getUniqueGenres().map((genre) => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="past">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_added">Date Added</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="author">Author</SelectItem>
                <SelectItem value="date_completed">Date Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>

            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star className="w-4 h-4" />
            </Button>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      
      <Tabs value="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="all">All Books ({filteredBooks.length})</TabsTrigger>
          <TabsTrigger value="current">Currently Reading ({filteredBooks.filter(b => b.status === 'current').length})</TabsTrigger>
          <TabsTrigger value="planned">Want to Read ({filteredBooks.filter(b => b.status === 'planned').length})</TabsTrigger>
          <TabsTrigger value="past">Completed ({filteredBooks.filter(b => b.status === 'past').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <Book className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No books found</h3>
              <p className="text-muted-foreground">
                {books.length === 0 
                  ? "Start building your library by adding some books!"
                  : "Try adjusting your search or filters."
                }
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBooks.map((book) => (
                <BookListItem key={book.id} book={book} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      
      {selectedBook && (
        <BookPreviewModal
          book={selectedBook}
          isOpen={!!selectedBook}
          onClose={() => setSelectedBook(null)}
          onUpdate={() => {
            fetchBooks();
            setSelectedBook(null);
          }}
        />
      )}
    </div>
  );
} 