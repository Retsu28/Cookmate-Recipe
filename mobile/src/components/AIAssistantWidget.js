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
import { sendMessage, loadConversationHistory, formatChatTime } from '../services/chatService';

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

const AIAssistantWidget = forwardRef(function AIAssistantWidget({ onPress }, ref) {
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
    { role: 'assistant', content: "Hi! I'm your CookMate AI assistant. Need help with a recipe or ingredient substitution?", timestamp: null },
  ]);
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState(null);
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

  // Load conversation history when chat opens
  useEffect(() => {
    if (open) {
      loadConversationHistory()
        .then(history => {
          if (history.length > 0) {
            // Prepend welcome message if we have history
            setMessages([
              { role: 'assistant', content: "Hi! I'm your CookMate AI assistant. Need help with a recipe or ingredient substitution?", timestamp: null },
              ...history
            ]);
          }
        })
        .catch(err => {
          console.error('[AIChatWidget] Failed to load history:', err);
        });
    }
  }, [open]);

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

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || isReplying) return;

    setError(null);
    const userMessage = { role: 'user', content: question, timestamp: new Date().toISOString() };
    setMessages(current => [...current, userMessage]);
    setInput('');
    setIsReplying(true);

    try {
      // Include last 10 messages for context (but not the welcome message)
      const historyForContext = messages
        .filter(m => m.role !== 'assistant' || m.content !== "Hi! I'm your CookMate AI assistant. Need help with a recipe or ingredient substitution?")
        .slice(-10);

      const { response } = await sendMessage(question, historyForContext);

      setMessages(current => [
        ...current,
        { role: 'assistant', content: response, timestamp: new Date().toISOString() },
      ]);
    } catch (err) {
      console.error('[AIChatWidget] Chat error:', err);
      const status = err?.response?.status;
      const message = err?.response?.data?.error || err.message || '';
      const isDailyLimit = status === 429 && message.toLowerCase().includes('daily');
      const isBurstLimit = status === 429 && !isDailyLimit;
      const userFacingMsg = isDailyLimit
        ? "You've reached your daily message limit. Please come back tomorrow!"
        : isBurstLimit
          ? "You're sending messages too quickly. Please wait a moment before trying again."
          : "I'm having trouble connecting right now. Please try again in a moment!";
      setError(status === 429 ? userFacingMsg : 'Sorry, I had trouble connecting. Please try again!');
      setMessages(current => [
        ...current,
        { role: 'assistant', content: userFacingMsg, timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsReplying(false);
    }
  }, [input, isReplying, messages]);

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
              <View key={i} style={[st.messageRow, msg.role === 'user' ? st.userRow : st.aiRow]}>
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
                    <Text style={[
                      st.msgText,
                      { color: msg.role === 'user' ? '#fff' : colors.text }
                    ]}>
                      {msg.content}
                    </Text>
                  </View>
                  {/* Timestamp */}
                  <Text style={[st.timestamp, { color: colors.textSubtle }]}>
                    {msg.timestamp ? formatChatTime(msg.timestamp) : 'Now'}
                  </Text>
                </View>
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
                </View>
              </View>
            )}
            <View ref={messagesEndRef} style={st.messageEnd} />
          </ScrollView>

          {/* Input */}
          <View style={[st.inputRow, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              style={[st.input, { color: colors.text }]}
              placeholder="Ask about recipes, ingredients, or meal ideas..."
              placeholderTextColor={colors.textSubtle}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!isReplying}
              multiline={false}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={isReplying || !input.trim()}
              style={[
                st.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: isReplying || !input.trim() ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
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
  msgList: { maxHeight: 320 },
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
  userBubble: {
    borderTopRightRadius: 4,
  },
  aiBubble: {
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  msgText: { fontFamily: 'Geist_400Regular', fontSize: 14, lineHeight: 20 },
  timestamp: { fontFamily: 'Geist_400Regular', fontSize: 10, marginTop: 2, marginHorizontal: 4 },
  messageEnd: { height: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Geist_400Regular',
    fontSize: 14,
    paddingVertical: 10,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  footerHint: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  footerText: {
    fontFamily: 'Geist_400Regular',
    fontSize: 10,
    textAlign: 'center',
  },
});
