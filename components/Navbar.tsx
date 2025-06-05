/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabase } from '@/providers/supabase-provider';
import { BookOpen, User2, Sparkles, LogOut, LogIn, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Navbar() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const navItems = [
    { href: '/', label: 'Dashboard', icon: <BookOpen className="w-4 h-4" />, requiresAuth:true },
    { href: '/library', label: 'Library', icon: <Library className="w-4 h-4" />, requiresAuth: true },
    { href: '/profile', label: 'Profile', icon: <User2 className="w-4 h-4" />, requiresAuth: true },
    { href: '/recommendations', label: 'Recommendations', icon: <Sparkles className="w-4 h-4" />, requiresAuth: true },
  ];

  return (
    <nav className="bg-background/80 border-b border-border sticky top-0 z-40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center space-x-2"
            >
              <img src="https://raw.githubusercontent.com/hridaya423/bookify/refs/heads/master/Bookify_logo-removebg-preview.png" alt="Bookify" className="h-8"  />
            </Link>
            <div className="ml-10 flex items-center space-x-1">
              {navItems.filter(item => !item.requiresAuth || user).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${
                      pathname === item.href
                        ? 'bg-gradient-to-r from-red-400 to-red-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {user ? (
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            ) : (
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}