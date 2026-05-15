import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, ChefHat, User, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AIChatMessagesSkeleton } from '@/components/SkeletonScreen';
import { useAIChat, type RecipeContext } from '@/context/AIChatContext';
import { sendMessage, loadConversationHistory, saveFeedback, getRateLimitStatus, type ChatMessage, type ChatResponse, type RateLimitStatus } from '@/services/chatService';
import { useNavigate } from 'react-router-dom';

export function AIChatWidget() {
  const { isOpen, recipeContext, closeChat, toggleChat } = useAIChat();
  
  // Dynamic welcome based on recipe context
  const getWelcomeMessage = (recipe: RecipeContext | null): string => {
    if (recipe) {
      return `Hi! I see you're viewing **${recipe.title}**. Need substitutions, scaling help, or cooking tips?`;
    }
    return "Hi! I'm your CookMate AI assistant. Need help with a recipe or ingredient substitution?";
  };
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: getWelcomeMessage(null) }
  ]);
  
  // Update welcome when recipe context changes
  useEffect(() => {
    if (isOpen) {
      setMessages([{ role: 'assistant', content: getWelcomeMessage(recipeContext) }]);
    }
  }, [recipeContext, isOpen]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);
  const [input, setInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, 'up' | 'down'>>({});
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load conversation history and rate limit status when chat opens
  useEffect(() => {
    if (isOpen) {
      loadConversationHistory()
        .then(history => {
          if (history.length > 0) {
            // Prepend contextual welcome message if we have history
            setMessages(prev => [
              { role: 'assistant', content: getWelcomeMessage(recipeContext) },
              ...history.slice(-19) // Keep last 19 + welcome = 20 total
            ]);
          }
        })
        .catch(err => {
          console.error('[AIChatWidget] Failed to load history:', err);
          // Silently fail - user can still chat
        });
      
      // Load rate limit status
      getRateLimitStatus()
        .then(setRateLimit)
        .catch(err => console.error('[AIChatWidget] Failed to load rate limit:', err));
    }
  }, [isOpen, recipeContext]);

  // Update rate limit after each message sent
  const updateRateLimit = useCallback(() => {
    getRateLimitStatus()
      .then(setRateLimit)
      .catch(err => console.error('[AIChatWidget] Failed to update rate limit:', err));
  }, []);

  const handleSend = useCallback(async () => {
    const question = input.trim();

    if (!question || isReplying || isOffline) return;

    setError(null);
    const userMessage: ChatMessage = { role: 'user', content: question };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsReplying(true);

    try {
      // Include last 20 messages for context (but not the welcome message)
      const welcomeContent = getWelcomeMessage(recipeContext);
      const historyForContext = messages
        .filter(m => m.role !== 'assistant' || m.content !== welcomeContent)
        .slice(-20);

      const response = await sendMessage(question, historyForContext, recipeContext);

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: response.response },
      ]);
      setLastResponse(response);
      updateRateLimit(); // Update remaining message count
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

  // Generate quick action suggestions based on recipe context
  const getQuickActions = (recipe: RecipeContext | null): string[] => {
    if (recipe) {
      const mainIngredient = recipe.ingredients[0] || 'ingredient';
      return [
        "Make it vegan",
        `Substitute ${mainIngredient}`,
        "Scale for 2 people",
        "Storage tips"
      ];
    }
    return [
      "Quick dinner ideas",
      "Easy breakfast recipes",
      "Meal plan this week"
    ];
  };
  
  const quickActions = getQuickActions(recipeContext);
  
  const handleQuickAction = useCallback((action: string) => {
    if (isReplying) return;
    
    setError(null);
    const userMessage: ChatMessage = { role: 'user', content: action };
    setMessages((current) => [...current, userMessage]);
    setIsReplying(true);

    // Build history with this new message
    const welcomeContent = getWelcomeMessage(recipeContext);
    const historyForContext = [
      ...messages.filter(m => m.role !== 'assistant' || m.content !== welcomeContent).slice(-19),
      userMessage
    ];

    sendMessage(action, historyForContext, recipeContext)
      .then((response) => {
        setMessages((current) => [
          ...current,
          { role: 'assistant', content: response.response },
        ]);
        setLastResponse(response);
        updateRateLimit(); // Update remaining message count
      })
      .catch((err) => {
        console.error('[AIChatWidget] Chat error:', err);
        const apiErr = err as Error & { status?: number };
        const isDailyLimit = apiErr?.status === 429 && apiErr.message.toLowerCase().includes('daily');
        const isBurstLimit = apiErr?.status === 429 && !isDailyLimit;
        const userFacingMsg = isDailyLimit
          ? "You've reached your daily message limit. Please come back tomorrow!"
          : isBurstLimit
            ? "You're sending messages too quickly. Please wait a moment before trying again."
            : "I'm having trouble connecting right now. Please try again in a moment!";
        setMessages((current) => [
          ...current,
          { role: 'assistant', content: userFacingMsg },
        ]);
      })
      .finally(() => {
        setIsReplying(false);
      });
  }, [isReplying, messages, recipeContext, updateRateLimit]);

  // Suggested starter questions for empty chat
  const getStarterQuestions = (recipe: RecipeContext | null): string[] => {
    if (recipe) {
      return [
        `How do I cook ${recipe.title}?`,
        "What ingredients do I need?",
        "How long does this take?",
        "Make this recipe vegan"
      ];
    }
    return [
      "Find me a chicken recipe",
      "What's a quick Filipino dinner?",
      "Substitute for calamansi?",
      "How to store leftover adobo?"
    ];
  };

  const handleFeedback = async (messageIndex: number, type: 'up' | 'down') => {
    setFeedbackGiven(prev => ({ ...prev, [messageIndex]: type }));
    
    // Get the messages for context
    const aiMsg = messages[messageIndex]?.content || '';
    const userMsg = messages[messageIndex - 1]?.content || '';
    
    try {
      await saveFeedback(messageIndex, type, aiMsg, userMsg);
    } catch (err) {
      // Silently fail - feedback is best-effort
      console.error('[Chat Feedback] Failed to save:', err);
    }
  };

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
                  <div key={i}>
                    <div 
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
                        {/* Timestamp & Feedback */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-stone-400 px-1">
                            {msg.timestamp 
                              ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                              : 'Now'}
                          </span>
                          {/* Feedback buttons for AI messages */}
                          {msg.role === 'assistant' && i > 0 && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleFeedback(i, 'up')}
                                className={`p-1 rounded transition-colors ${
                                  feedbackGiven[i] === 'up' 
                                    ? 'text-green-500' 
                                    : 'text-stone-400 hover:text-green-500'
                                }`}
                                aria-label="Helpful"
                              >
                                <ThumbsUp size={12} />
                              </button>
                              <button
                                onClick={() => handleFeedback(i, 'down')}
                                className={`p-1 rounded transition-colors ${
                                  feedbackGiven[i] === 'down' 
                                    ? 'text-red-500' 
                                    : 'text-stone-400 hover:text-red-500'
                                }`}
                                aria-label="Not helpful"
                              >
                                <ThumbsDown size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Recipe Cards - shown after last AI response if recipes available */}
                    {msg.role === 'assistant' && 
                     i === messages.length - 1 && 
                     !isReplying && (
                      <div className="mt-3 ml-10">
                        {lastResponse?.matchedRecipes && lastResponse.matchedRecipes.length > 0 ? (
                          <>
                            <p className="text-xs font-medium text-stone-500 mb-2">Suggested recipes:</p>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {lastResponse.matchedRecipes.map((recipe) => (
                                <button
                                  key={recipe.id}
                                  onClick={() => {
                                    navigate(`/recipe/${recipe.id}`);
                                    closeChat();
                                  }}
                                  className="flex-shrink-0 w-32 p-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl hover:border-orange-300 hover:shadow-sm transition-all text-left"
                                >
                                  <p className="text-xs font-bold text-stone-800 dark:text-stone-100 line-clamp-2">{recipe.title}</p>
                                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                                    {recipe.matchedIngredients.slice(0, 2).join(', ')}
                                    {recipe.matchedIngredients.length > 2 && '...'}
                                  </p>
                                  <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-500">
                                    <ExternalLink size={10} />
                                    <span>View</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </>
                        ) : isReplying ? (
                          // Loading skeleton for recipe cards
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {[1, 2, 3].map((n) => (
                              <div
                                key={n}
                                className="flex-shrink-0 w-32 p-2 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl animate-pulse"
                              >
                                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2"></div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
                {isReplying && (
                  <div className="flex gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                      <ChefHat size={14} />
                    </div>
                    <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-md shadow-stone-200/50">
                      <AIChatMessagesSkeleton />
                      <div className="flex items-center gap-1 mt-2 text-xs text-stone-400 dark:text-stone-500">
                        <span>CookMate AI is typing</span>
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1 h-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1 h-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Starter Questions - only show with welcome message */}
                {messages.length === 1 && messages[0].role === 'assistant' && !isReplying && (
                  <div className="ml-10 mt-2">
                    <p className="text-xs text-stone-500 mb-2">Try asking:</p>
                    <div className="flex flex-wrap gap-2">
                      {getStarterQuestions(recipeContext).map((question, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(question)}
                          className="px-3 py-1.5 text-xs bg-white border border-stone-200 text-stone-600 rounded-full hover:border-orange-300 hover:text-orange-600 transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} className="h-2" />
              </div>
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-stone-200">
              {/* Offline notice */}
              {isOffline && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
                  <span className="text-base">📶</span>
                  <p className="text-xs font-semibold text-stone-600">You're offline — AI chat is unavailable</p>
                </div>
              )}
              {/* Rate Limit Indicator */}
              {rateLimit && (
                <div className="mb-3">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">
                      {rateLimit.remaining} messages remaining today
                    </span>
                    <div className="flex-1 mx-2 h-1 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          rateLimit.remaining > 20 ? 'bg-emerald-400' : 
                          rateLimit.remaining > 10 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${(rateLimit.remaining / rateLimit.dailyLimit) * 100}%` }}
                      />
                    </div>
                  </div>
                  {/* Warning when low on messages */}
                  {rateLimit.remaining <= 10 && (
                    <p className="text-[10px] text-red-500 dark:text-red-400 mt-1 px-2 font-medium">
                      ⚠️ Low on messages! Use them wisely.
                    </p>
                  )}
                </div>
              )}
              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action)}
                    disabled={isReplying}
                    className="px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-600 rounded-full border border-orange-200 hover:bg-orange-100 transition-colors disabled:opacity-50"
                  >
                    {action}
                  </button>
                ))}
              </div>
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
                    placeholder={isOffline ? 'You are offline — AI chat unavailable' : 'Ask about recipes, ingredients, or meal ideas...'}
                    disabled={isReplying || isOffline}
                    className="pr-4 py-3 h-auto min-h-[44px] rounded-2xl border-stone-300 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all resize-none disabled:bg-stone-50 disabled:text-stone-400"
                  />
                </div>
                <Button 
                  onClick={handleSend}
                  disabled={isReplying || !input.trim() || isOffline}
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
