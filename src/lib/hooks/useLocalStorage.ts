'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize from localStorage (SSR-safe)
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      console.warn(`Error reading localStorage key "${key}":`, key);
      return initialValue;
    }
  });

  // Persist to localStorage whenever value changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      console.warn(`Error writing localStorage key "${key}"`, key);
    }
  }, [key, storedValue]);

  // Sync across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleStorageChange(e: StorageEvent) {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          // ignore malformed data
        }
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const nextValue = value instanceof Function ? value(prev) : value;
      return nextValue;
    });
  }, []);

  return [storedValue, setValue];
}
