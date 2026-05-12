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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { AIChatTypingSkeleton } from './SkeletonPlaceholder';

// Sit above the FloatingTabBar (~76px tall + 12px bottom margin + safe-area inset).
const TAB_BAR_CLEARANCE = 96;
const FAB_SIZE = 52;
const FAB_RIGHT = 20;
const HIDDEN_HANDLE_WIDTH = 14;

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
    { role: 'assistant', text: "Hi! I'm your CookMate AI. Ask me anything about cooking, substitutions, or meal ideas." },
  ]);
  const [isReplying, setIsReplying] = useState(false);

  const toggle = () => setOpen(!open);

  const clampFabX = useCallback((value) => (
    Math.min(0, Math.max(hiddenTranslateX, value))
  ), [hiddenTranslateX]);

  const animateFab = useCallback((toValue, hidden) => {
    fabSlideX.stopAnimation();
    currentFabX.current = toValue;
    fabHiddenRef.current = hidden;
    setFabHidden(hidden);
    Animated.timing(fabSlideX, {
      toValue,
      duration: 160,
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

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input.trim() }]);
    setInput('');
    setIsReplying(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: "That's a great question! I'd suggest trying a lighter option like Greek yogurt instead of heavy cream." }]);
      setIsReplying(false);
    }, 800);
  };

  if (!open) {
    return (
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
          <Ionicons name="chatbubble-ellipses" size={21} color="#fff" />
          <View style={[st.fabDot, { borderColor: colors.surface }]} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[st.overlay, { paddingBottom: fabBottom }]}
      pointerEvents="box-none"
    >
      <View style={[st.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header */}
        <View style={[st.header, { borderBottomColor: colors.border, backgroundColor: colors.primarySoft }]}>
          <View style={st.headerLeft}>
            <View style={st.headerIcon}>
              <Ionicons name="restaurant" size={14} color={colors.primary} />
            </View>
            <Text style={[st.headerTitle, { color: colors.text }]}>AI Assistant</Text>
          </View>
          <TouchableOpacity onPress={toggle}>
            <Ionicons name="close" size={20} color={colors.textSubtle} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView style={st.msgList} contentContainerStyle={st.msgListContent}>
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                st.msgBubble,
                msg.role === 'user'
                  ? [st.userBubble, { backgroundColor: colors.primary }]
                  : [st.aiBubble, { backgroundColor: isDark ? colors.background : colors.primarySoft }],
              ]}
            >
              <Text style={[st.msgText, { color: msg.role === 'user' ? '#fff' : colors.text }]}>{msg.text}</Text>
            </View>
          ))}
          {isReplying && <AIChatTypingSkeleton colors={colors} />}
        </ScrollView>

        {/* Input */}
        <View style={[st.inputRow, { borderTopColor: colors.border }]}>
          <TextInput
            style={[st.input, { color: colors.text }]}
            placeholder="Ask something..."
            placeholderTextColor={colors.textSubtle}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={send}
            disabled={isReplying}
            style={[st.sendBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="arrow-up" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
});

export default AIAssistantWidget;

const st = StyleSheet.create({
  fabWrap: { position: 'absolute', right: FAB_RIGHT, width: FAB_SIZE, height: FAB_SIZE },
  fab: { width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', shadowColor: '#f97316', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  fabDot: { position: 'absolute', top: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#f97316', borderWidth: 2 },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 12 },
  panel: { borderWidth: 1, borderRadius: 20, overflow: 'hidden', maxHeight: 420, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { width: 28, height: 28, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7e5e4', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Geist_700Bold', fontSize: 14 },
  msgList: { maxHeight: 260 },
  msgListContent: { padding: 12, gap: 10 },
  msgBubble: { padding: 12, borderRadius: 14, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start' },
  msgText: { fontFamily: 'Geist_400Regular', fontSize: 13, lineHeight: 19 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, fontFamily: 'Geist_400Regular', fontSize: 14, paddingVertical: 8 },
  sendBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
