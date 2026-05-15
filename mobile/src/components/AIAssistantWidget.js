import React, { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  Animated,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { AIChatTypingSkeleton } from './SkeletonPlaceholder';
import { sendMessage, loadConversationHistory, saveFeedback, getRateLimitStatus, formatChatTime } from '../services/chatService';
import { useNetwork } from '../offline/network';

// Sit above the FloatingTabBar (~76px tall + 12px bottom margin + safe-area inset).
const TAB_BAR_CLEARANCE = 96;
const FAB_SIZE = 56;
const FAB_RIGHT = 16;
const HIDDEN_HANDLE_WIDTH = 14;

// Spring animation config matching web framer-motion
const SPRING_CONFIG = {
  stiffness: 320,
  damping: 26,
  mass: 1,
};

// Helper: dynamic welcome message based on recipe context (mirrors web)
function getWelcomeMessage(recipeContext) {
  if (recipeContext) {
    return `Hi! I see you're viewing **${recipeContext.title}**. Need substitutions, scaling help, or cooking tips?`;
  }
  return "Hi! I'm your CookMate AI assistant. Need help with a recipe or ingredient substitution?";
}

function getQuickActions(recipeContext) {
  if (recipeContext) {
    const mainIngredient = recipeContext.ingredients?.[0] || 'ingredient';
    return ['Make it vegan', `Substitute ${mainIngredient}`, 'Scale for 2 people', 'Storage tips'];
  }
  return ['Quick dinner ideas', 'Easy breakfast recipes', 'Meal plan this week'];
}

function getStarterQuestions(recipeContext) {
  if (recipeContext) {
    return [
      `How do I cook ${recipeContext.title}?`,
      'What ingredients do I need?',
      'How long does this take?',
      'Make this recipe vegan',
    ];
  }
  return [
    'Find me a chicken recipe',
    "What's a quick Filipino dinner?",
    'Substitute for calamansi?',
    'How to store leftover adobo?',
  ];
}

const AIAssistantWidget = forwardRef(function AIAssistantWidget({ onPress, recipeContext = null, navigation }, ref) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const fabBottom = TAB_BAR_CLEARANCE + Math.max(insets.bottom, 0);
  const [open, setOpen] = useState(false);
  const [fabHidden, setFabHidden] = useState(false);
  const fabSlideX = useRef(new Animated.Value(0)).current;
  const dragStartX = useRef(0);
  const currentFabX = useRef(0);
  const fabHiddenRef = useRef(false);
  const hiddenTranslateX = -Math.max(0, screenWidth - FAB_RIGHT - HIDDEN_HANDLE_WIDTH);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: getWelcomeMessage(recipeContext), timestamp: null },
  ]);
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [rateLimit, setRateLimit] = useState(null);
  const scrollViewRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Animation values for chat panel
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(20)).current;
  const panelScale = useRef(new Animated.Value(0.95)).current;

  // FAB icon animation
  const fabIconRotate = useRef(new Animated.Value(0)).current;
  const fabIconScale = useRef(new Animated.Value(1)).current;

  const toggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const openChat = useCallback(() => {
    setOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setOpen(false);
  }, []);

  // Update welcome message when recipeContext or open state changes
  useEffect(() => {
    if (open) {
      setMessages([{ role: 'assistant', content: getWelcomeMessage(recipeContext), timestamp: null }]);
    }
  }, [recipeContext, open]);

  // Load conversation history + rate limit when chat opens
  useEffect(() => {
    if (open) {
      loadConversationHistory()
        .then(history => {
          if (history.length > 0) {
            setMessages([
              { role: 'assistant', content: getWelcomeMessage(recipeContext), timestamp: null },
              ...history.slice(-19),
            ]);
          }
        })
        .catch(err => console.error('[AIChatWidget] Failed to load history:', err));

      getRateLimitStatus()
        .then(setRateLimit)
        .catch(err => console.error('[AIChatWidget] Failed to load rate limit:', err));
    }
  }, [open]);

  const updateRateLimit = useCallback(() => {
    getRateLimitStatus().then(setRateLimit).catch(() => {});
  }, []);

  const clampFabX = useCallback((value) => (
    Math.min(0, Math.max(hiddenTranslateX, value))
  ), [hiddenTranslateX]);

  const animateFab = useCallback((toValue, hidden) => {
    fabSlideX.stopAnimation();
    currentFabX.current = toValue;
    fabHiddenRef.current = hidden;
    setFabHidden(hidden);
    Animated.spring(fabSlideX, {
      toValue,
      stiffness: SPRING_CONFIG.stiffness,
      damping: SPRING_CONFIG.damping,
      mass: SPRING_CONFIG.mass,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        currentFabX.current = toValue;
        fabSlideX.setValue(toValue);
      }
    });
  }, [fabSlideX]);

  const hideFab = useCallback(() => {
    animateFab(hiddenTranslateX, true);
  }, [animateFab, hiddenTranslateX]);

  const showFab = useCallback(() => {
    animateFab(0, false);
  }, [animateFab]);

  const handleFabPress = () => {
    if (fabHidden) {
      showFab();
      return;
    }

    if (onPress) {
      onPress();
    }
    toggle();
  };

  useEffect(() => {
    const nextX = fabHiddenRef.current ? hiddenTranslateX : 0;
    currentFabX.current = nextX;
    fabSlideX.setValue(nextX);
    setFabHidden(fabHiddenRef.current);
  }, [fabSlideX, hiddenTranslateX]);

  useImperativeHandle(ref, () => ({
    open: () => {
      showFab();
      setOpen(true);
    },
  }), [showFab]);

  // Panel entrance/exit animations
  useEffect(() => {
    if (open) {
      // Entrance animation - spring from web
      Animated.parallel([
        Animated.spring(panelOpacity, {
          toValue: 1,
          stiffness: SPRING_CONFIG.stiffness,
          damping: SPRING_CONFIG.damping,
          useNativeDriver: true,
        }),
        Animated.spring(panelTranslateY, {
          toValue: 0,
          stiffness: SPRING_CONFIG.stiffness,
          damping: SPRING_CONFIG.damping,
          useNativeDriver: true,
        }),
        Animated.spring(panelScale, {
          toValue: 1,
          stiffness: SPRING_CONFIG.stiffness,
          damping: SPRING_CONFIG.damping,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(panelOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(panelTranslateY, {
          toValue: 20,
          duration: 220,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(panelScale, {
          toValue: 0.95,
          duration: 220,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [open, panelOpacity, panelTranslateY, panelScale]);

  // FAB icon rotation animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(fabIconRotate, {
        toValue: open ? 1 : 0,
        stiffness: 400,
        damping: 25,
        useNativeDriver: true,
      }),
      Animated.spring(fabIconScale, {
        toValue: open ? 1 : 1,
        stiffness: 400,
        damping: 25,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, fabIconRotate, fabIconScale]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isReplying]);

  const fabPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      fabSlideX.stopAnimation((value) => {
        const clampedValue = clampFabX(value);
        dragStartX.current = clampedValue;
        currentFabX.current = clampedValue;
        fabSlideX.setValue(clampedValue);
      });
    },
    onPanResponderMove: (_, gesture) => {
      const nextX = clampFabX(dragStartX.current + gesture.dx);
      currentFabX.current = nextX;
      fabSlideX.setValue(nextX);
    },
    onPanResponderRelease: (_, gesture) => {
      const projectedX = clampFabX(currentFabX.current + gesture.vx * 28);

      if (fabHiddenRef.current) {
        if (gesture.dx > 18 || gesture.vx > 0.25 || projectedX > hiddenTranslateX + 36) {
          showFab();
        } else {
          hideFab();
        }
        return;
      }

      if (gesture.dx < -18 || gesture.vx < -0.25 || projectedX < -36) {
        hideFab();
      } else {
        showFab();
      }
    },
    onPanResponderTerminate: () => {
      if (currentFabX.current < hiddenTranslateX / 2) {
        hideFab();
      } else {
        showFab();
      }
    },
  }), [clampFabX, fabSlideX, hiddenTranslateX, hideFab, showFab]);

  const buildHistory = useCallback((currentMessages) => {
    const welcomeContent = getWelcomeMessage(recipeContext);
    return currentMessages
      .filter(m => m.role !== 'assistant' || m.content !== welcomeContent)
      .slice(-20);
  }, [recipeContext]);

  const handleChatError = useCallback((err, setMsgs) => {
    const status = err?.response?.status;
    const message = err?.response?.data?.error || err?.message || '';
    const isDailyLimit = status === 429 && message.toLowerCase().includes('daily');
    const isBurstLimit = status === 429 && !isDailyLimit;
    const userFacingMsg = isDailyLimit
      ? "You've reached your daily message limit. Please come back tomorrow!"
      : isBurstLimit
        ? "You're sending messages too quickly. Please wait a moment before trying again."
        : "I'm having trouble connecting right now. Please try again in a moment!";
    setMsgs(current => [
      ...current,
      { role: 'assistant', content: userFacingMsg, timestamp: new Date().toISOString() },
    ]);
  }, []);

  const { isOnline } = useNetwork();

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || isReplying || !isOnline) return;

    setError(null);
    const userMessage = { role: 'user', content: question, timestamp: new Date().toISOString() };
    setMessages(current => [...current, userMessage]);
    setInput('');
    setIsReplying(true);

    try {
      const historyForContext = buildHistory(messages);
      const data = await sendMessage(question, historyForContext, recipeContext);
      setMessages(current => [
        ...current,
        { role: 'assistant', content: data.response, timestamp: new Date().toISOString() },
      ]);
      setLastResponse(data);
      updateRateLimit();
    } catch (err) {
      console.error('[AIChatWidget] Chat error:', err);
      handleChatError(err, setMessages);
    } finally {
      setIsReplying(false);
    }
  }, [input, isReplying, messages, recipeContext, buildHistory, handleChatError, updateRateLimit]);

  const handleQuickAction = useCallback((action) => {
    if (isReplying) return;
    setError(null);
    const userMessage = { role: 'user', content: action, timestamp: new Date().toISOString() };
    setMessages(current => [...current, userMessage]);
    setIsReplying(true);

    const historyForContext = [
      ...buildHistory(messages).slice(-19),
      userMessage,
    ];

    sendMessage(action, historyForContext, recipeContext)
      .then(data => {
        setMessages(current => [
          ...current,
          { role: 'assistant', content: data.response, timestamp: new Date().toISOString() },
        ]);
        setLastResponse(data);
        updateRateLimit();
      })
      .catch(err => {
        console.error('[AIChatWidget] Quick action error:', err);
        handleChatError(err, setMessages);
      })
      .finally(() => setIsReplying(false));
  }, [isReplying, messages, recipeContext, buildHistory, handleChatError, updateRateLimit]);

  const handleFeedback = useCallback(async (messageIndex, type) => {
    setFeedbackGiven(prev => ({ ...prev, [messageIndex]: type }));
    const aiMsg = messages[messageIndex]?.content || '';
    const userMsg = messages[messageIndex - 1]?.content || '';
    try {
      await saveFeedback(messageIndex, type, aiMsg, userMsg);
    } catch {
      // best-effort
    }
  }, [messages]);

  // FAB icon rotation interpolation
  const iconRotateInterpolate = fabIconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const renderFab = () => (
    <Animated.View
      {...fabPanResponder.panHandlers}
      style={[
        st.fabWrap,
        {
          bottom: fabBottom,
          transform: [{ translateX: fabSlideX }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          st.fab,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.brandShadow || colors.primary,
          },
        ]}
        onPress={handleFabPress}
        activeOpacity={0.85}
      >
        <Animated.View style={{ transform: [{ rotate: iconRotateInterpolate }, { scale: fabIconScale }] }}>
          <Ionicons name={open ? "close" : "chatbubble-ellipses"} size={24} color="#fff" />
        </Animated.View>
        {!open && (
          <View style={[st.fabDot, { borderColor: colors.background, backgroundColor: colors.primary }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  if (!open) {
    return renderFab();
  }

  return (
    <>
      {renderFab()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[st.overlay, { paddingBottom: fabBottom }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            st.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: panelOpacity,
              transform: [
                { translateY: panelTranslateY },
                { scale: panelScale },
              ],
            },
          ]}
        >
          {/* Header - matching web gradient */}
          <View style={[st.header, { backgroundColor: colors.primary }]}>
            <View style={st.headerLeft}>
              <View style={[st.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="sparkles" size={18} color="#fff" />
              </View>
              <View>
                <Text style={[st.headerTitle, { color: '#fff' }]}>CookMate AI</Text>
                <View style={st.statusRow}>
                  <View style={st.statusDot} />
                  <Text style={st.statusText}>Online & ready to help</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={closeChat} style={st.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={[st.msgList, { backgroundColor: isDark ? colors.background : '#fafaf9' }]}
            contentContainerStyle={st.msgListContent}
          >
            {messages.map((msg, i) => (
              <View key={i}>
                <View style={[st.messageRow, msg.role === 'user' ? st.userRow : st.aiRow]}>
                  {/* Avatar */}
                  <View style={[
                    st.avatar,
                    msg.role === 'user'
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: isDark ? colors.surfaceAlt : '#fff7ed' },
                  ]}>
                    <Ionicons
                      name={msg.role === 'user' ? 'person' : 'restaurant'}
                      size={14}
                      color={msg.role === 'user' ? '#fff' : colors.primary}
                    />
                  </View>

                  {/* Message Bubble */}
                  <View style={st.messageContent}>
                    <View style={[
                      st.msgBubble,
                      msg.role === 'user'
                        ? [st.userBubble, { backgroundColor: colors.primary }]
                        : [st.aiBubble, {
                            backgroundColor: isDark ? colors.surface : '#fff',
                            borderColor: colors.border,
                          }],
                    ]}>
                      <Text style={[st.msgText, { color: msg.role === 'user' ? '#fff' : colors.text }]}>
                        {msg.content}
                      </Text>
                    </View>
                    {/* Timestamp + Feedback */}
                    <View style={st.metaRow}>
                      <Text style={[st.timestamp, { color: colors.textSubtle }]}>
                        {msg.timestamp ? formatChatTime(msg.timestamp) : 'Now'}
                      </Text>
                      {msg.role === 'assistant' && i > 0 && (
                        <View style={st.feedbackRow}>
                          <TouchableOpacity
                            onPress={() => handleFeedback(i, 'up')}
                            style={st.feedbackBtn}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={feedbackGiven[i] === 'up' ? 'thumbs-up' : 'thumbs-up-outline'}
                              size={13}
                              color={feedbackGiven[i] === 'up' ? '#22c55e' : colors.textSubtle}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleFeedback(i, 'down')}
                            style={st.feedbackBtn}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={feedbackGiven[i] === 'down' ? 'thumbs-down' : 'thumbs-down-outline'}
                              size={13}
                              color={feedbackGiven[i] === 'down' ? '#ef4444' : colors.textSubtle}
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Matched recipe cards — shown after last AI response */}
                {msg.role === 'assistant' && i === messages.length - 1 && !isReplying &&
                 lastResponse?.matchedRecipes && lastResponse.matchedRecipes.length > 0 && (
                  <View style={st.recipeSuggWrap}>
                    <Text style={[st.recipeSuggLabel, { color: colors.textSubtle }]}>Suggested recipes:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {lastResponse.matchedRecipes.map(recipe => (
                        <TouchableOpacity
                          key={recipe.id}
                          onPress={() => {
                            if (navigation) {
                              navigation.navigate('RecipeDetail', { id: recipe.id });
                              closeChat();
                            }
                          }}
                          style={[st.recipeCard, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}
                          activeOpacity={0.8}
                        >
                          <Text style={[st.recipeCardTitle, { color: colors.text }]} numberOfLines={2}>{recipe.title}</Text>
                          <Text style={[st.recipeCardIngr, { color: colors.textSubtle }]} numberOfLines={1}>
                            {recipe.matchedIngredients.slice(0, 2).join(', ')}
                            {recipe.matchedIngredients.length > 2 ? '...' : ''}
                          </Text>
                          <View style={st.recipeCardView}>
                            <Ionicons name="open-outline" size={10} color={colors.primary} />
                            <Text style={[st.recipeCardViewText, { color: colors.primary }]}>View</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ))}

            {isReplying && (
              <View style={[st.messageRow, st.aiRow]}>
                <View style={[st.avatar, { backgroundColor: isDark ? colors.surfaceAlt : '#fff7ed' }]}>
                  <Ionicons name="restaurant" size={14} color={colors.primary} />
                </View>
                <View style={[st.aiBubble, {
                  backgroundColor: isDark ? colors.surface : '#fff',
                  borderColor: colors.border,
                  borderWidth: 1,
                  padding: 12,
                  borderRadius: 14,
                  borderTopLeftRadius: 4,
                }]}>
                  <AIChatTypingSkeleton colors={colors} />
                  <View style={st.typingLabelRow}>
                    <Text style={[st.typingLabel, { color: colors.textSubtle }]}>CookMate AI is typing</Text>
                    <View style={st.dotRow}>
                      {[0, 1, 2].map(n => (
                        <View key={n} style={[st.dot, { backgroundColor: colors.textSubtle }]} />
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Starter questions — only when just the welcome message is shown */}
            {messages.length === 1 && messages[0].role === 'assistant' && !isReplying && (
              <View style={st.starterWrap}>
                <Text style={[st.starterLabel, { color: colors.textSubtle }]}>Try asking:</Text>
                <View style={st.starterChips}>
                  {getStarterQuestions(recipeContext).map((q, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleQuickAction(q)}
                      style={[st.chip, { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceAlt : '#fff' }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[st.chipText, { color: colors.textSubtle }]}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View ref={messagesEndRef} style={st.messageEnd} />
          </ScrollView>

          {/* Input area */}
          <View style={[st.inputArea, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            {/* Offline notice */}
            {!isOnline && (
              <View style={[st.offlineNotice, { backgroundColor: isDark ? '#292524' : '#f5f5f4' }]}>
                <Text style={[st.offlineText, { color: colors.textSubtle }]}>📶 You're offline — AI chat is unavailable</Text>
              </View>
            )}
            {/* Rate limit bar */}
            {rateLimit && (
              <View style={st.rateLimitWrap}>
                <View style={st.rateLimitRow}>
                  <Text style={[st.rateLimitText, { color: colors.textSubtle }]}>
                    {rateLimit.remaining} messages remaining today
                  </Text>
                  <View style={[st.rateLimitTrack, { backgroundColor: isDark ? colors.border : '#e7e5e4' }]}>
                    <View style={[
                      st.rateLimitFill,
                      {
                        width: `${Math.max(0, Math.min(100, (rateLimit.remaining / rateLimit.dailyLimit) * 100))}%`,
                        backgroundColor: rateLimit.remaining > 20 ? '#4ade80' : rateLimit.remaining > 10 ? '#facc15' : '#f87171',
                      },
                    ]} />
                  </View>
                </View>
                {rateLimit.remaining <= 10 && (
                  <Text style={st.rateLimitWarn}>⚠️ Low on messages! Use them wisely.</Text>
                )}
              </View>
            )}
            {/* Quick action chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.quickChips}>
              {getQuickActions(recipeContext).map((action, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleQuickAction(action)}
                  disabled={isReplying}
                  style={[st.quickChip, { borderColor: colors.primary + '55', backgroundColor: isDark ? 'rgba(249,115,22,0.12)' : '#fff7ed', opacity: isReplying ? 0.5 : 1 }]}
                  activeOpacity={0.7}
                >
                  <Text style={[st.quickChipText, { color: colors.primary }]}>{action}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Text input + send */}
            <View style={st.inputRow}>
              <TextInput
                style={[st.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.background : '#fff' }]}
                placeholder={!isOnline ? "You're offline — AI chat unavailable" : 'Ask about recipes, ingredients, or meal ideas...'}
                placeholderTextColor={colors.textSubtle}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!isReplying && isOnline}
                multiline={false}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={isReplying || !input.trim() || !isOnline}
                style={[st.sendBtn, { backgroundColor: colors.primary, opacity: isReplying || !input.trim() || !isOnline ? 0.5 : 1 }]}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Footer hint */}
          <View style={[st.footerHint, { backgroundColor: colors.surface }]}>
            <Text style={[st.footerText, { color: colors.textSubtle }]}>
              CookMate AI suggests recipes based on your pantry & dietary preferences
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </>
  );
});

export default AIAssistantWidget;

const st = StyleSheet.create({
  fabWrap: { position: 'absolute', right: FAB_RIGHT, width: FAB_SIZE, height: FAB_SIZE, zIndex: 1000 },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fabDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
    zIndex: 999,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: 500,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
    marginBottom: FAB_SIZE + 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Geist_700Bold', fontSize: 15 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  statusText: {
    fontFamily: 'Geist_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  closeBtn: { padding: 4 },
  msgList: { maxHeight: 300 },
  msgListContent: { padding: 16, gap: 12 },
  messageRow: { flexDirection: 'row', gap: 8, maxWidth: '85%' },
  userRow: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiRow: { alignSelf: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  messageContent: { gap: 4 },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '100%',
  },
  userBubble: { borderTopRightRadius: 4 },
  aiBubble: { borderTopLeftRadius: 4, borderWidth: 1 },
  msgText: { fontFamily: 'Geist_400Regular', fontSize: 14, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginHorizontal: 4 },
  timestamp: { fontFamily: 'Geist_400Regular', fontSize: 10 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  feedbackBtn: { padding: 3 },
  // Matched recipe suggestion cards
  recipeSuggWrap: { marginLeft: 40, marginTop: 6, marginBottom: 4 },
  recipeSuggLabel: { fontFamily: 'Geist_500Medium', fontSize: 11, marginBottom: 6 },
  recipeCard: {
    width: 120,
    padding: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  recipeCardTitle: { fontFamily: 'Geist_700Bold', fontSize: 11, lineHeight: 15, marginBottom: 4 },
  recipeCardIngr: { fontFamily: 'Geist_400Regular', fontSize: 10, marginBottom: 4 },
  recipeCardView: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  recipeCardViewText: { fontFamily: 'Geist_700Bold', fontSize: 10 },
  // Typing indicator
  typingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  typingLabel: { fontFamily: 'Geist_400Regular', fontSize: 11 },
  dotRow: { flexDirection: 'row', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, opacity: 0.6 },
  // Starter questions
  starterWrap: { marginLeft: 40, marginTop: 6 },
  starterLabel: { fontFamily: 'Geist_400Regular', fontSize: 11, marginBottom: 6 },
  starterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  chipText: { fontFamily: 'Geist_400Regular', fontSize: 12 },
  messageEnd: { height: 8 },
  // Input area
  inputArea: { borderTopWidth: 1, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 8, gap: 8 },
  offlineNotice: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  offlineText: { fontFamily: 'Geist_600SemiBold', fontSize: 12 },
  rateLimitWrap: { gap: 3 },
  rateLimitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateLimitText: { fontFamily: 'Geist_400Regular', fontSize: 10, flexShrink: 1 },
  rateLimitTrack: { flex: 1, height: 4, borderRadius: 999, overflow: 'hidden' },
  rateLimitFill: { height: '100%', borderRadius: 999 },
  rateLimitWarn: { fontFamily: 'Geist_500Medium', fontSize: 10, color: '#f87171' },
  quickChips: { gap: 6, paddingBottom: 2 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  quickChipText: { fontFamily: 'Geist_600SemiBold', fontSize: 11 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    fontFamily: 'Geist_400Regular',
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 22,
    maxHeight: 80,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  footerHint: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
  footerText: { fontFamily: 'Geist_400Regular', fontSize: 10, textAlign: 'center' },
});
