export interface Book {
    id: string;
    user_id: string;
    title: string;
    author: string;
    genre: string[];
    status: 'planned' | 'current' | 'past';
    favorite: boolean;
    date_added: string;
    date_completed?: string;
    coverUrl?: string;
  }
  
  export interface User {
    id: string;
    favorite_genres: string[];
    reading_goal: number;
  }