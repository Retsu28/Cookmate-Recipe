import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

export default function AIAssistantWidget({ onPress }) {
  const { colors, isDark } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your CookMate AI. Ask me anything about cooking, substitutions, or meal ideas." },
  ]);

  const toggle = () => setOpen(!open);

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input.trim() }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: "That's a great question! I'd suggest trying a lighter option like Greek yogurt instead of heavy cream." }]);
    }, 800);
  };

  if (!open) {
    return (
      <TouchableOpacity style={st.fab} onPress={toggle} activeOpacity={0.85}>
        <Ionicons name="chatbubble-ellipses" size={21} color="#fff" />
        <View style={[st.fabDot, { borderColor: '#0a0a0a' }]} />
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={st.overlay}
      pointerEvents="box-none"
    >
      <View style={[st.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header */}
        <View style={[st.header, { borderBottomColor: colors.border }]}>
          <View style={st.headerLeft}>
            <View style={st.headerIcon}>
              <Ionicons name="restaurant" size={14} color="#0a0a0a" />
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
            <View key={i} style={[st.msgBubble, msg.role === 'user' ? st.userBubble : [st.aiBubble, { backgroundColor: isDark ? colors.surfaceAlt : '#f5f5f4' }]]}>
              <Text style={[st.msgText, { color: msg.role === 'user' ? '#fff' : colors.text }]}>{msg.text}</Text>
            </View>
          ))}
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
          <TouchableOpacity onPress={send} style={st.sendBtn}>
            <Ionicons name="arrow-up" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  fab: { position: 'absolute', bottom: 20, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
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
  userBubble: { backgroundColor: '#1c1917', alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start' },
  msgText: { fontFamily: 'Geist_400Regular', fontSize: 13, lineHeight: 19 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, fontFamily: 'Geist_400Regular', fontSize: 14, paddingVertical: 8 },
  sendBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1c1917', alignItems: 'center', justifyContent: 'center' },
});
