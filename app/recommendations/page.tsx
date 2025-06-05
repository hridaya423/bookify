/* eslint-disable @typescript-eslint/no-unused-vars */

'use client'
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Users, Target, TrendingUp, Sparkles, BookMarked, Award, BookOpenCheck } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSupabase } from '@/providers/supabase-provider';
import { Progress } from "@/components/ui/progress";


interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  genre: string[];
  status: 'planned' | 'current' | 'past';
  date_completed?: string;
}


interface ReadingGoals {
  yearlyGoal: number;
  progress: number;
  progressPercentage: number;
}

interface AuthorRecommendation {
  author: string;
  relevance: number;
  readCount: number;
}


const RecommendationsPage: React.FC = () => {
  const { supabase, user } = useSupabase();
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [authorRecommendations, setAuthorRecommendations] = useState<AuthorRecommendation[]>([]);
  const [readingGoals, setReadingGoals] = useState<ReadingGoals | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchReadingGoals();
      fetchAuthorRecommendations();
    }
  }, [user]);

  const fetchReadingGoals = async (): Promise<void> => {
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('reading_goal')
        .eq('user_id', user!.id)
        .single();

      if (settingsError) throw settingsError;

      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'past');

      if (booksError) throw booksError;

      const currentYear = new Date().getFullYear();
      const booksThisYear = (books as Book[])?.filter(book => 
        book.date_completed && new Date(book.date_completed).getFullYear() === currentYear
      ).length || 0;

      setReadingGoals({
        yearlyGoal: settings?.reading_goal || 0,
        progress: booksThisYear,
        progressPercentage: settings?.reading_goal ? 
          Math.min(100, Math.round((booksThisYear / settings.reading_goal) * 100)) : 0
      });
    } catch (error) {
      console.error('Error fetching reading goals:', error);
    }
  };

  const fetchAuthorRecommendations = async (): Promise<void> => {
    try {
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'past');

      if (booksError) throw booksError;

      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('favorite_genres')
        .eq('user_id', user!.id)
        .single();

      if (settingsError) throw settingsError;

      const favoriteGenres = settings?.favorite_genres || [];
      
      const authorCounts: Record<string, { count: number; genres: Set<string> }> = {};
      (books as Book[])?.forEach(book => {
        if (!authorCounts[book.author]) {
          authorCounts[book.author] = {
            count: 0,
            genres: new Set()
          };
        }
        authorCounts[book.author].count++;
        book.genre?.forEach(g => authorCounts[book.author].genres.add(g));
      });
      const relatedAuthors: AuthorRecommendation[] = Object.entries(authorCounts)
        .map(([author, data]) => ({
          author,
          relevance: [...data.genres].filter(g => favoriteGenres.includes(g)).length,
          readCount: data.count
        }))
        .sort((a, b) => b.relevance - a.relevance || b.readCount - a.readCount)
        .slice(0, 5);

      setAuthorRecommendations(relatedAuthors);
    } catch (error) {
      console.error('Error fetching author recommendations:', error);
    }
  };

  const fetchRecommendations = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user!.id
        }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setRecommendations(data.recommendations);
    } catch (err) {
      setError('Failed to fetch recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className="max-w-xl mx-auto bg-white/50 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center text-center p-12 space-y-4">
          <BookMarked className="h-12 w-12 text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Welcome to Bookify</h3>
            <p className="text-gray-600 mt-2">Please sign in to view your personalized reading recommendations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
            Your Reading Journey
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover your next favorite books based on your unique reading preferences and history
          </p>
        </div>

        <Tabs defaultValue="books" className="w-full">
          <TabsList className="grid w-full grid-cols-3 p-1 bg-red-50 rounded-xl">
            <TabsTrigger 
              value="books" 
              className="data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <span className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Books</span>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="authors"
              className="data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <span className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Authors</span>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="goals"
              className="data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <span className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Goals</span>
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="books" className="space-y-4 mt-6">
            <Card className="overflow-hidden border-red-100">
              <CardHeader className="border-b bg-gradient-to-r from-red-50 to-red-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-red-400 to-red-600 p-2 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Personalized Book Recommendations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Button 
                  onClick={fetchRecommendations}
                  disabled={loading}
                  className="w-full mb-6 bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {loading ? 'Finding Your Next Great Read...' : 'Get Fresh Recommendations'}
                </Button>

                {error && (
                  <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {recommendations && (
                  <div className="space-y-4">
                    {recommendations.split('\n\n').map((recommendation, index) => (
                      <Card key={index} className="border-red-100 hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-4">
                          <div className="flex space-x-3">
                            <BookOpenCheck className="h-5 w-5 text-red-400 flex-shrink-0 mt-1" />
                            <p className="text-gray-700">{recommendation}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authors" className="space-y-4 mt-6">
            <Card className="overflow-hidden border-red-100">
              <CardHeader className="border-b bg-gradient-to-r from-red-50 to-red-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-red-400 to-red-600 p-2 rounded-lg">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Authors You&apos;ll Love</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  {authorRecommendations.map((rec, index) => (
                    <Card key={index} className="border-red-100 hover:shadow-md transition-shadow duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="text-lg font-medium text-gray-800">{rec.author}</h3>
                            <p className="text-sm text-gray-500">
                              Matches your reading preferences
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-full">
                            <TrendingUp className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600">
                              {rec.readCount} books
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4 mt-6">
            <Card className="overflow-hidden border-red-100">
              <CardHeader className="border-b bg-gradient-to-r from-red-50 to-red-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-red-400 to-red-600 p-2 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Reading Goals & Progress</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {readingGoals && (
                  <div className="space-y-8">
                    <div className="p-6 bg-gradient-to-r from-red-50 to-red-100 rounded-xl">
                      <h3 className="text-lg font-medium mb-4">Yearly Reading Progress</h3>
                      <Progress 
                        value={readingGoals.progressPercentage} 
                        className="h-3 bg-red-100"
                        style={{
                          background: 'linear-gradient(to right, #f87171, #dc2626)',
                          borderRadius: '9999px'
                        }}
                      />
                      <div className="flex justify-between mt-2 text-sm text-gray-600">
                        <span>{readingGoals.progress} books read</span>
                        <span>Goal: {readingGoals.yearlyGoal} books</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-red-100 hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">Current Pace</h4>
                            <p className="text-3xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                              {Math.round((readingGoals.progress / (new Date().getMonth() + 1)) * 12)}
                            </p>
                            <p className="text-sm text-gray-500">Books projected this year</p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-red-100 hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">Monthly Target</h4>
                            <p className="text-3xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                              {Math.ceil((readingGoals.yearlyGoal - readingGoals.progress) / 
                                (12 - new Date().getMonth()))}
                            </p>
                            <p className="text-sm text-gray-500">Books needed per month</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
};

export default RecommendationsPage;