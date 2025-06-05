'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, BookOpen, Clock, CheckCircle, X, AlertCircle, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface SeriesBook {
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
}

interface SeriesSearchResult {
  seriesName: string;
  totalBooks: number;
  author: string;
  books: SeriesBook[];
}

interface AddSeriesFormProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function AddSeriesForm({ onComplete, onCancel }: AddSeriesFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SeriesSearchResult[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<SeriesSearchResult | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<'planned' | 'current' | 'past'>('planned');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  
  const searchSeries = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search-series?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        setShowResults(true);
      } else {
        console.error('Failed to search series');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching series:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    const timer = setTimeout(() => {
      searchSeries(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSeries = (series: SeriesSearchResult) => {
    setSelectedSeries(series);
    setShowResults(false);
  };

  const handleAddSeries = async () => {
    if (!selectedSeries) return;

    setAdding(true);
    setError(null);
    try {
      const response = await fetch('/api/add-series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seriesName: selectedSeries.seriesName,
          author: selectedSeries.author,
          books: selectedSeries.books,
          defaultStatus
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast({
          title: "Series Added Successfully!",
          description: result.message,
        });
        setTimeout(() => {
          onComplete?.();
        }, 1500);
      } else {
        setError(result.error || 'Failed to add series');
        toast({
          title: "Error Adding Series",
          description: result.error || 'Failed to add series',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding series:', error);
      const errorMessage = 'Something went wrong. Please try again.';
      setError(errorMessage);
      toast({
        title: "Error Adding Series",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSeries(null);
    setShowResults(false);
    setDefaultStatus('planned');
    setError(null);
    setSuccess(false);
  };

  const modalContent = (
    <div className="fixed inset-0 top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
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
              <Library className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">
              Add Complete Series
            </h2>
          </div>

          <p className="text-gray-600 mb-6">
            Search for a book series and add all books at once to your library
          </p>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertDescription className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                Series added successfully!
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="series-search">Search for a series</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="series-search"
                  type="text"
                  placeholder="e.g., Harry Potter, Lord of the Rings, Hunger Games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-red-200 focus:border-red-400"
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            
            {showResults && searchResults.length > 0 && (
              <div className="space-y-2">
                <Label>Search Results</Label>
                <ScrollArea className="h-64 border border-red-200 rounded-lg p-2 bg-gray-50">
                  <div className="space-y-2">
                    {searchResults.map((series, index) => (
                      <Card
                        key={index}
                        className="cursor-pointer hover:bg-red-50 border-red-100 transition-colors"
                        onClick={() => handleSelectSeries(series)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="font-medium text-gray-900">{series.seriesName}</h4>
                              <p className="text-sm text-gray-600">by {series.author}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {series.books.length} books found
                                </Badge>
                                {series.totalBooks > series.books.length && (
                                  <Badge variant="secondary" className="text-xs">
                                    ~{series.totalBooks} total
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-600">
                              Select
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            
            {showResults && searchResults.length === 0 && !loading && searchQuery && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No series found for &quot;{searchQuery}&quot;</p>
                <p className="text-sm">Try searching for a different series name</p>
              </div>
            )}

            
            {selectedSeries && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Selected Series</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSeries(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-green-800">{selectedSeries.seriesName}</h3>
                        <p className="text-green-700">by {selectedSeries.author}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">
                          {selectedSeries.books.length} books to add
                        </Badge>
                      </div>

                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-green-800">Books in this series:</h4>
                        <ScrollArea className="h-32">
                          <div className="space-y-1">
                            {selectedSeries.books.map((book, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm text-green-700">
                                <span className="font-medium">#{book.order}</span>
                                <span>{book.title}</span>
                                {book.pageCount && (
                                  <Badge variant="outline" className="text-xs">
                                    {book.pageCount} pages
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                
                <div className="space-y-3">
                  <Label>Default status for all books</Label>
                  <RadioGroup value={defaultStatus} onValueChange={(value: string) => setDefaultStatus(value as 'planned' | 'current' | 'past')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="planned" id="planned" />
                      <Label htmlFor="planned" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Reading List (Planned)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="current" id="current" />
                      <Label htmlFor="current" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-green-500" />
                        Currently Reading
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="past" id="past" />
                      <Label htmlFor="past" className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-gray-500" />
                        Already Read
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            
            <div className="flex gap-3 pt-4 border-t">
              {onCancel && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 border-gray-300"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={selectedSeries ? handleAddSeries : resetForm}
                disabled={!selectedSeries || adding}
                className="flex-1 bg-gradient-to-r from-red-400 to-pink-500 text-white hover:opacity-90"
              >
                {adding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Adding Series...
                  </>
                ) : selectedSeries ? (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add {selectedSeries.books.length} Books
                  </>
                ) : (
                  'Search for a Series'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : null;
} 