/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, User2, Bookmark, Target, Save, Loader2 } from 'lucide-react'

const UserProfile = () => {
  const supabase = createClientComponentClient()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([])
  const [readingGoal, setReadingGoal] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        setSession(currentSession)
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    const loadUserSettings = async () => {
      if (!session?.user?.id) return

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('favorite_genres, reading_goal')
          .eq('user_id', session.user.id)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            await supabase
              .from('user_settings')
              .insert({
                user_id: session.user.id,
                favorite_genres: [],
                reading_goal: 0
              })
          } else {
            throw error
          }
        } else if (data) {
          setFavoriteGenres(data.favorite_genres || [])
          setReadingGoal(data.reading_goal || 0)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        setError('Failed to load profile settings')
      }
    }

    if (session?.user) {
      loadUserSettings()
    }
  }, [session, supabase])

  const handleGenreChange = (inputValue: string) => {
    const genres = inputValue
      .split(',')
      .map(g => g.trim())
      .filter(g => g !== '')
    setFavoriteGenres(genres)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: session?.user?.id,
          favorite_genres: favoriteGenres,
          reading_goal: readingGoal,
        })

      if (error) throw error
      setSuccess(true)
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <Card className="max-w-xl mx-auto bg-white/50 backdrop-blur-sm">
        <CardContent className="flex flex-col justify-center items-center min-h-[300px] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-red-400" />
          <div className="text-red-500 font-medium">Loading your profile...</div>
        </CardContent>
      </Card>
    )
  }

  if (!session) {
    return (
      <Card className="max-w-xl mx-auto bg-white/50 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center text-center p-12 space-y-4">
          <User2 className="h-12 w-12 text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Welcome to Bookify</h3>
            <p className="text-gray-600 mt-2">Please sign in to customize your reading experience</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-xl mx-auto bg-white/50 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-shadow duration-300">
      <CardHeader className="border-b bg-gradient-to-r from-red-50 to-red-100">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-br from-red-400 to-red-600 p-3 rounded-full">
            <User2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
              Your Reading Profile
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{session.user.email}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {error && (
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Your reading preferences have been updated!</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Bookmark className="h-4 w-4 text-red-400" />
              <span>Favorite Genres</span>
            </label>
            <Input
              type="text"
              value={favoriteGenres.join(', ')}
              onChange={(e) => handleGenreChange(e.target.value)}
              placeholder="Fiction, Mystery, Science Fiction..."
              disabled={loading}
              className="border-red-100 focus:border-red-300 focus:ring-red-200"
            />
            <div className="flex flex-wrap gap-2 min-h-8">
              {favoriteGenres.map((genre, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="bg-gradient-to-r from-red-50 to-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200"
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Target className="h-4 w-4 text-red-400" />
              <span>Reading Goal</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                value={readingGoal}
                onChange={(e) => setReadingGoal(parseInt(e.target.value) || 0)}
                min="0"
                disabled={loading}
                className="border-red-100 focus:border-red-300 focus:ring-red-200 pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                books/year
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Save Settings</span>
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-lg">
          <div className="flex items-center space-x-2 text-red-600">
            <BookOpen className="h-5 w-5" />
            <span className="font-medium">Reading Stats</span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <p>Current Goal: {readingGoal} books per year</p>
            <p>Favorite Genres: {favoriteGenres.length ? favoriteGenres.join(', ') : 'None set'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default UserProfile