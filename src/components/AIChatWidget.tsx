import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, ChefHat, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AIChatMessagesSkeleton } from '@/components/SkeletonScreen';
import { useAIChat } from '@/context/AIChatContext';
import { sendMessage, loadConversationHistory, type ChatMessage } from '@/services/chatService';

export function AIChatWidget() {
  const { isOpen, closeChat, toggleChat } = useAIChat();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm your CookMate AI assistant. Need help with a recipe or ingredient substitution?" }
  ]);
  const [input, setInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load conversation history when chat opens
  useEffect(() => {
    if (isOpen) {
      loadConversationHistory()
        .then(history => {
          if (history.length > 0) {
            // Prepend welcome message if we have history
            setMessages([
              { role: 'assistant', content: "Hi! I'm your CookMate AI assistant. Need help with a recipe or ingredient substitution?" },
              ...history
            ]);
          }
        })
        .catch(err => {
          console.error('[AIChatWidget] Failed to load history:', err);
          // Silently fail - user can still chat
        });
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const question = input.trim();

    if (!question || isReplying) return;

    setError(null);
    const userMessage: ChatMessage = { role: 'user', content: question };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsReplying(true);

    try {
      // Include last 10 messages for context (but not the welcome message)
      const historyForContext = messages
        .filter(m => m.role !== 'assistant' || m.content !== "Hi! I'm your CookMate AI assistant. Need help with a recipe or ingredient substitution?")
        .slice(-10);

      const { response } = await sendMessage(question, historyForContext);

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: response },
      ]);
    } catch (err) {
      console.error('[AIChatWidget] Chat error:', err);
      const apiErr = err as Error & { status?: number };
      const isDailyLimit = apiErr?.status === 429 && apiErr.message.toLowerCase().includes('daily');
      const isBurstLimit = apiErr?.status === 429 && !isDailyLimit;
      const userFacingMsg = isDailyLimit
        ? "You've reached your daily message limit. Please come back tomorrow!"
        : isBurstLimit
          ? "You're sending messages too quickly. Please wait a moment before trying again."
          : "I'm having trouble connecting right now. Please try again in a moment!";
      setError(apiErr?.status === 429 ? userFacingMsg : 'Sorry, I had trouble connecting. Please try again!');
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: userFacingMsg },
      ]);
    } finally {
      setIsReplying(false);
    }
  }, [input, isReplying, messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isReplying]);

  return (
    <motion.div layout className="fixed bottom-24 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      <AnimatePresence mode="sync">
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 26 } }}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
            className="mb-4 flex w-[calc(100vw-2rem)] max-w-96 flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl shadow-stone-950/20 sm:w-96 h-[60vh] sm:h-[500px] max-h-[480px] sm:max-h-[500px]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 flex items-center justify-between p-4 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 shadow-inner">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold">CookMate AI</p>
                  <p className="text-[10px] font-medium text-orange-50 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online & ready to help
                  </p>
                </div>
              </div>
              <button 
                onClick={closeChat}
                aria-label="Close chat"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-stone-50" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.role === 'user' 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      {msg.role === 'user' ? <User size={14} /> : <ChefHat size={14} />}
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-md' 
                          : 'bg-white border border-stone-300 text-stone-900 rounded-bl-md shadow-stone-200/50'
                      }`}>
                        {msg.content}
                      </div>
                      {/* Timestamp */}
                      <span className="text-[10px] text-stone-400 mt-1 px-1">
                        {msg.timestamp 
                          ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                          : 'Now'}
                      </span>
                    </div>
                  </div>
                ))}
                {isReplying && (
                  <div className="flex gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                      <ChefHat size={14} />
                    </div>
                    <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-md shadow-stone-200/50">
                      <AIChatMessagesSkeleton />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-stone-200">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask about recipes, ingredients, or meal ideas..."
                    disabled={isReplying}
                    className="pr-4 py-3 h-auto min-h-[44px] rounded-2xl border-stone-300 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all resize-none"
                  />
                </div>
                <Button 
                  onClick={handleSend}
                  disabled={isReplying || !input.trim()}
                  aria-label="Send message"
                  className="rounded-full w-11 h-11 p-0 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  <Send size={18} className="ml-0.5" />
                </Button>
              </div>
              <p className="text-[10px] text-stone-400 mt-2 text-center">
                CookMate AI suggests recipes based on your pantry & dietary preferences
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggleChat}
        aria-label={isOpen ? 'Close AI chat' : 'Open AI chat'}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full orange-gradient text-white shadow-xl shadow-orange-500/30"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <X size={24} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <MessageSquare size={24} />
            </motion.span>
          )}
        </AnimatePresence>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white" />
        )}
      </motion.button>
    </motion.div>
  );
}
