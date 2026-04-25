import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

export default function IngredientTag({ name, onRemove }) {
  const { colors } = useAppTheme();

  return (
    <View style={[st.tag, { backgroundColor: '#1c1917' }]}>
      <Text style={st.tagText}>{name.toUpperCase()}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={12} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, marginBottom: 6 },
  tagText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5, color: '#fff' },
});
