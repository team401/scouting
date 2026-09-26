'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setDark(document.documentElement.classList.contains('dark')),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('team401-theme', next ? 'dark' : 'light');
    setDark(next);
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className={className}
      onClick={toggleTheme}
      aria-label={`Use ${dark ? 'light' : 'dark'} mode`}
      title={`Use ${dark ? 'light' : 'dark'} mode`}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
