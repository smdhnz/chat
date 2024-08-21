import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store the value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from localStorage then parse it
      const item = window.localStorage.getItem(key);
      // If item is null, return the initial value
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn("Error reading localStorage key “" + key + "”: ", error);
      return initialValue;
    }
  });

  // Use effect to update localStorage whenever the stored value changes
  useEffect(() => {
    try {
      // Save to localStorage
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn("Error saving localStorage key “" + key + "”: ", error);
    }
  }, [key, storedValue]);

  // Return a wrapped version of useState's setter function
  const setValue = (value: React.SetStateAction<T>) => {
    // Allow value to be a function so we have the same API as useState
    setStoredValue((prevValue) => {
      const newValue = value instanceof Function ? value(prevValue) : value;
      return newValue;
    });
  };

  return [storedValue, setValue] as const; // Return a tuple
}
