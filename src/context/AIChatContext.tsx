import React, { createContext, useContext, useState, useCallback } from 'react';

interface AIChatContextValue {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const AIChatContext = createContext<AIChatContextValue>({
  isOpen: false,
  openChat: () => {},
  closeChat: () => {},
  toggleChat: () => {},
});

export function AIChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <AIChatContext.Provider value={{ isOpen, openChat, closeChat, toggleChat }}>
      {children}
    </AIChatContext.Provider>
  );
}

export function useAIChat() {
  return useContext(AIChatContext);
}
