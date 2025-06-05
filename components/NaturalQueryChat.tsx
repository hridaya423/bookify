'use client';

import { useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { Send, MessageCircle, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QueryResponse {
  response: string;
  query: string;
  userProfile: {
    totalBooks: number;
    completedBooks: number;
    favoriteGenres: string[];
    readingGoal: number;
  };
}

export function NaturalQueryChat() {
  const { supabase } = useSupabase();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your personal reading assistant. I can help you discover new books, analyze your reading habits, or answer questions about your library. Try asking me something like:\n\n• \"Suggest me some books that I would like\"\n• \"What are my reading patterns?\"\n• \"Find me a mystery book from my library\"\n• \"What should I read next?\"",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to use this feature');
      }

      const response = await fetch('/api/natural-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          query: input.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data: QueryResponse = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (content: string) => {
    
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('•') || line.startsWith('-')) {
          return (
            <div key={index} className="ml-4 mb-1">
              {line}
            </div>
          );
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <div key={index} className="font-semibold mb-2 mt-3">
              {line.replace(/\*\*/g, '')}
            </div>
          );
        }
        if (line.trim() === '') {
          return <div key={index} className="mb-2" />;
        }
        return (
          <div key={index} className="mb-1">
            {line}
          </div>
        );
      });
  };

  const suggestedQueries = [
    "Suggest me some books that I would like",
    "What are my reading patterns?",
    "Find me something similar to my favorite books",
    "What should I read next?",
    "How am I doing with my reading goal?",
    "Show me books I haven't finished",
    "Recommend a short book for this weekend"
  ];

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Ask Your Reading Assistant
          <Sparkles className="w-4 h-4 text-yellow-500" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm">
                    {message.type === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {formatMessage(message.content)}
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        
        {messages.length === 1 && (
          <div className="p-4 border-t">
            <div className="text-sm font-medium mb-2">Try asking:</div>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.slice(0, 4).map((query, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setInput(query)}
                >
                  {query}
                </Badge>
              ))}
            </div>
          </div>
        )}

        
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about books or your reading habits..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 