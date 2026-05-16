import React from 'react';
import { Text, StyleSheet } from 'react-native';

export default function FieldLabel({ label, colors, fontSizes }) {
  return (
    <Text style={[st.label, { color: colors.textSubtle, fontSize: fontSizes.xs }]}>
      {label.toUpperCase()}
    </Text>
  );
}

const st = StyleSheet.create({
  label: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.4, marginTop: 6 },
});
