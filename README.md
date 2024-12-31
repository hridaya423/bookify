# 📚 Bookify

Bookify is a modern web application that helps readers track their books, set reading goals, and discover new recommendations. Built with Next.js, Supabase, and Tailwind CSS, Anthropic, it provides a seamless and engaging reading management experience.

![Bookify Logo](https://raw.githubusercontent.com/hridaya423/bookify/refs/heads/master/Bookify_logo-removebg-preview.png)

## ✨ Features

### 📖 Reading Management
- Track books you're currently reading
- Maintain a reading wishlist
- Record completed books
- Add notes and reviews

### 🎯 Personal Goals
- Set annual reading goals
- Track reading progress
- View reading statistics and insights
- Monitor monthly reading pace

### 🔍 Smart Recommendations
- Get personalized book recommendations
- Discover new authors based on your preferences
- Track reading patterns
- Explore similar books

### 👤 User Profiles
- Customize reading preferences
- Set favorite genres
- Track reading history
- Manage personal library

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Supabase account
- Claude API credits / Key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/hridaya423/bookify.git
cd bookify
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
CLAUDE_API_KEY=your-claude-apikey
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

## 📝 Database Schema

### Books Table
```
create table books (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  author text not null,
  genre text[] not null default '{}',
  status text not null check (status in ('planned', 'current', 'past')),
  favorite boolean default false,
  date_added timestamp with time zone default timezone('utc'::text, now()),
  date_completed timestamp with time zone,
  coverUrl text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add RLS policies
alter table books enable row level security;

create policy "Users can view their own books" on books
  for select using (auth.uid() = user_id);

create policy "Users can insert their own books" on books
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own books" on books
  for update using (auth.uid() = user_id);

create policy "Users can delete their own books" on books
  for delete using (auth.uid() = user_id);

create table user_settings (
  user_id uuid references auth.users(id) primary key,
  favorite_genres text[] default '{}',
  reading_goal integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add RLS policies
alter table user_settings enable row level security;

create policy "Users can view own settings" on user_settings
  for select using (auth.uid() = user_id);

create policy "Users can insert own settings" on user_settings
  for insert with check (auth.uid() = user_id);

create policy "Users can update own settings" on user_settings
  for update using (auth.uid() = user_id);

-- Add pages to books table
ALTER TABLE books 
ADD COLUMN total_pages integer,
ADD COLUMN current_page integer DEFAULT 0;

-- Create a new table for daily reading progress
CREATE TABLE daily_reading (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    book_id uuid REFERENCES books(id),
    pages_read integer NOT NULL,
    date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, book_id, date)
);

-- Add RLS policies for daily_reading
ALTER TABLE daily_reading ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reading progress" ON daily_reading
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading progress" ON daily_reading
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading progress" ON daily_reading
    FOR UPDATE USING (auth.uid() = user_id);
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Built with ❤️ by Hridya Agrawal