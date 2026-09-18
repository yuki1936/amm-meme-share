import { useEffect, useState } from 'react';
import type { Theme } from '../types';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('meme-share-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* 隐私模式下 localStorage 不可用，走默认主题 */
  }
  return 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#171a1b' : '#f6f8f8',
    );
    try {
      localStorage.setItem('meme-share-theme', theme);
    } catch {
      /* 隐私模式下 localStorage 不可用，忽略即可 */
    }
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark'),
  };
}
