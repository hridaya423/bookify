
'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSupabase } from '@/providers/supabase-provider';
import { useEffect, useState } from 'react';
import BookShelf from '@/components/BookShelf';
import { AddBookForm } from '@/components/AddBookForm';
import { AddSeriesForm } from '@/components/AddSeriesForm';
import { SeriesDashboard } from '@/components/SeriesDashboard';
import { ReadingHeatmap } from '@/components/ReadingHeatmap';
import { NaturalQueryChat } from '@/components/NaturalQueryChat';
import { ReadingAnalysis } from '@/components/ReadingAnalysis';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Library, History, Clock, Plus, ChevronDown, Activity, MessageCircle, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import ReadingDashboard from '@/components/ReadingStats';
import { Session } from '@supabase/supabase-js';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

export default function Home() {
  const { supabase } = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddSeries, setShowAddSeries] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 mx-auto">
            <div className="w-full h-full border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-lg text-muted-foreground animate-pulse">
            Loading your magical library...
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <motion.div 
            className="w-full max-w-md space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="text-center space-y-3 mb-8">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">
                Bookify
              </h1>
              <p className="text-muted-foreground">Your enchanted reading companion</p>
            </div>
            <div className="bg-card/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 space-y-6 border border-border">
                              <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-semibold">Welcome Back</h2>
                  <p className="text-sm text-muted-foreground">Sign in to access your library</p>
                </div>
              <Button
                  onClick={async () => {
                    try {
                      const { error } = await supabase.auth.signInWithPassword({
                        email: 'demo@bookify.com',
                        password: 'demo123'
                      });
                      if (error) throw error;
                    } catch (error) {
                      console.error('Error signing in:', error);
                      alert('Failed to sign in with demo account. Please try again.');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-red-400 to-pink-500 text-white hover:opacity-90"
                >
                  Try Demo Account
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                  </div>
                </div>
              <Auth 
                supabaseClient={supabase} 
                appearance={{ 
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: '#f87171',
                        brandAccent: '#ef4444',
                      },
                    },
                  },
                }}
                providers={['google']}
                redirectTo={`${window.location.origin}/`}
              />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.div 
          className="flex items-center justify-between"
          {...fadeIn}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-red-400 to-pink-500 rounded-lg">
              <Library className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">
              Your Reading Journey
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2 bg-gradient-to-r from-red-400 to-pink-500 text-white hover:opacity-90 transition-opacity rounded-lg px-4 py-2">
                <Plus className="h-4 w-4" />
                Add Books
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => {
                setShowAddBook(true);
                setShowAddSeries(false);
              }}>
                <BookOpen className="h-4 w-4 mr-2" />
                Add Single Book
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setShowAddSeries(true);
                setShowAddBook(false);
              }}>
                <Library className="h-4 w-4 mr-2" />
                Add Complete Series
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>

        <motion.div {...fadeIn}>
          <ReadingDashboard />
        </motion.div>

        <AnimatePresence>
          {showAddBook && (
            <AddBookForm onComplete={() => setShowAddBook(false)} />
          )}
        </AnimatePresence>

        {showAddSeries && (
          <AddSeriesForm 
            onComplete={() => {
              setShowAddSeries(false);
              
              window.location.reload();
            }} 
            onCancel={() => setShowAddSeries(false)}
          />
        )}

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="mb-4 p-1 bg-card/50 backdrop-blur-sm border border-border rounded-xl grid grid-cols-7 w-full">
            <TabsTrigger 
              value="current" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-400 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg"
            >
              <BookOpen className="h-4 w-4" />
              Current
            </TabsTrigger>
            <TabsTrigger 
              value="planned"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-400 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg"
            >
              <Clock className="h-4 w-4" />
              Planned
            </TabsTrigger>
            <TabsTrigger 
              value="past"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-400 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg"
            >
              <History className="h-4 w-4" />
              Completed
            </TabsTrigger>
            <TabsTrigger 
              value="series"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-400 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg"
            >
              <Library className="h-4 w-4" />
              Series
            </TabsTrigger>
            <TabsTrigger 
              value="heatmap"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-400 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg"
            >
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger 
              value="chat"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-400 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg"
            >
              <MessageCircle className="h-4 w-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger 
              value="analysis"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-400 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg"
            >
              <Brain className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-20rem)] rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6">
            <TabsContent value="current">
              <motion.div {...fadeIn}>
                <BookShelf status="current" />
              </motion.div>
            </TabsContent>
            
            <TabsContent value="planned">
              <motion.div {...fadeIn}>
                <BookShelf status="planned" />
              </motion.div>
            </TabsContent>
            
            <TabsContent value="past">
              <motion.div {...fadeIn}>
                <BookShelf status="past" />
              </motion.div>
            </TabsContent>
            
            <TabsContent value="series">
              <motion.div {...fadeIn}>
                {session?.user?.id && <SeriesDashboard userId={session.user.id} />}
              </motion.div>
            </TabsContent>
            
            <TabsContent value="heatmap">
              <motion.div {...fadeIn}>
                <ReadingHeatmap />
              </motion.div>
            </TabsContent>
            
            <TabsContent value="chat">
              <motion.div {...fadeIn}>
                <NaturalQueryChat />
              </motion.div>
            </TabsContent>
            
            <TabsContent value="analysis">
              <motion.div {...fadeIn}>
                <ReadingAnalysis />
              </motion.div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </main>
    </div>
  );
}