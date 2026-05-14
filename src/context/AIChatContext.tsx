import React, { createContext, useContext, useState, useCallback } from 'react';

export interface RecipeContext {
  id: number;
  title: string;
  ingredients: string[];
  instructions?: string[];
  category?: string;
  region?: string;
}

interface AIChatContextValue {
  isOpen: boolean;
  recipeContext: RecipeContext | null;
  openChat: (recipe?: RecipeContext) => void;
  closeChat: () => void;
  toggleChat: () => void;
  clearRecipeContext: () => void;
}

const AIChatContext = createContext<AIChatContextValue>({
  isOpen: false,
  recipeContext: null,
  openChat: () => {},
  closeChat: () => {},
  toggleChat: () => {},
  clearRecipeContext: () => {},
});

export function AIChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [recipeContext, setRecipeContext] = useState<RecipeContext | null>(null);

  const openChat = useCallback((recipe?: RecipeContext) => {
    if (recipe) {
      setRecipeContext(recipe);
    }
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const clearRecipeContext = useCallback(() => {
    setRecipeContext(null);
  }, []);

  return (
    <AIChatContext.Provider value={{ isOpen, recipeContext, openChat, closeChat, toggleChat, clearRecipeContext }}>
      {children}
    </AIChatContext.Provider>
  );
}

export function useAIChat() {
  return useContext(AIChatContext);
}
