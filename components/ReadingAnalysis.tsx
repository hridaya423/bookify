'use client';

import { useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { BarChart3, TrendingUp, Brain, Loader2, RefreshCw, Calendar, BookOpen, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalysisResponse {
  analysis: string;
  statistics: {
    totalBooks: number;
    completedBooks: number;
    currentlyReading: number;
    plannedBooks: number;
    completionRate: number;
    readingGoal: number;
    goalProgress: number;
    activeDays: number;
    totalPagesRead: number;
    averagePagesPerDay: number;
    longestStreak: number;
    currentStreak: number;
    genreDistribution: { [key: string]: { count: number; percentage: number } };
    authorStats: { [key: string]: number };
    averageTimePerBook: number;
  };
  timestamp: string;
}

export function ReadingAnalysis() {
  const { supabase } = useSupabase();
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to view your reading analysis');
      }

      const response = await fetch('/api/reading-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          analysis_type: 'comprehensive'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate analysis');
      }

      const data: AnalysisResponse = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error generating analysis:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate analysis');
    } finally {
      setLoading(false);
    }
  };

  const formatAnalysis = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('##')) {
          return (
            <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-primary">
              {line.replace(/##\s*/, '')}
            </h3>
          );
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <h4 key={index} className="font-medium mt-3 mb-1">
              {line.replace(/\*\*/g, '')}
            </h4>
          );
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <li key={index} className="ml-4 mb-1 list-disc">
              {line.replace(/^[-•]\s*/, '')}
            </li>
          );
        }
        if (line.trim() === '') {
          return <div key={index} className="mb-2" />;
        }
        return (
          <p key={index} className="mb-2 leading-relaxed">
            {line}
          </p>
        );
      });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Reading Insights
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Get personalized insights into your reading habits and patterns
              </p>
            </div>
            <Button 
              onClick={generateAnalysis} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {loading ? 'Analyzing...' : 'Generate Analysis'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600 dark:text-red-400">
              <p>{error}</p>
              <Button 
                variant="outline" 
                onClick={generateAnalysis} 
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Books</p>
                      <p className="text-2xl font-bold">{analysis.statistics.totalBooks}</p>
                    </div>
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                      <p className={`text-2xl font-bold ${getProgressColor(analysis.statistics.completionRate)}`}>
                        {analysis.statistics.completionRate}%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reading Goal</p>
                      <p className={`text-2xl font-bold ${getProgressColor(analysis.statistics.goalProgress)}`}>
                        {analysis.statistics.goalProgress}%
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                      <p className="text-2xl font-bold">{analysis.statistics.currentStreak}</p>
                      <p className="text-xs text-muted-foreground">days</p>
                    </div>
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            
            <Card>
              <CardHeader>
                <CardTitle>Reading Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{analysis.statistics.activeDays}</div>
                    <div className="text-sm text-muted-foreground">Active Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{analysis.statistics.totalPagesRead}</div>
                    <div className="text-sm text-muted-foreground">Pages Read</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{analysis.statistics.averagePagesPerDay}</div>
                    <div className="text-sm text-muted-foreground">Avg Pages/Day</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{analysis.statistics.longestStreak}</div>
                    <div className="text-sm text-muted-foreground">Longest Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            
            <Card>
              <CardHeader>
                <CardTitle>Genre Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analysis.statistics.genreDistribution)
                    .slice(0, 5)
                    .map(([genre, data]) => (
                      <div key={genre} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{genre}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${data.percentage}%` }}
                            />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {data.count} books
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Analysis & Recommendations
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generated on {new Date(analysis.timestamp).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {formatAnalysis(analysis.analysis)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reading Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Completed Books</span>
                    <span className="font-medium">{analysis.statistics.completedBooks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Currently Reading</span>
                    <span className="font-medium">{analysis.statistics.currentlyReading}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned Books</span>
                    <span className="font-medium">{analysis.statistics.plannedBooks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Time per Book</span>
                    <span className="font-medium">{analysis.statistics.averageTimePerBook} days</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Authors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analysis.statistics.authorStats)
                      .slice(0, 5)
                      .map(([author, count]) => (
                        <div key={author} className="flex justify-between">
                          <span className="text-sm truncate">{author}</span>
                          <Badge variant="outline">{count} books</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!analysis && !loading && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Ready for Your Reading Analysis</h3>
              <p className="text-muted-foreground mb-4">
                Get AI-powered insights into your reading habits, patterns, and personalized recommendations.
              </p>
              <Button onClick={generateAnalysis} className="flex items-center gap-2 mx-auto">
                <Brain className="w-4 h-4" />
                Generate Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 