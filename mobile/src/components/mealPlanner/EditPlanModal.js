import React, { useState } from 'react';
import {
  Alert, View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, Switch, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, getDaysInMonth } from 'date-fns';

const mealSlots = [
  { id: 'breakfast', label: 'Breakfast', color: '#fdba74' },
  { id: 'lunch', label: 'Lunch', color: '#fb923c' },
  { id: 'dinner', label: 'Dinner', color: '#f97316' },
];

const defaultMealTimes = {
  breakfast: { start: '07:00', end: '08:00' },
  lunch: { start: '11:00', end: '14:00' },
  dinner: { start: '18:00', end: '20:00' },
};

function formatSelectedPlannerDate(value) {
  return format(new Date(`${value}T00:00:00`), 'EEEE, MMM d, yyyy');
}

export default function EditPlanModal({ plan, colors, isDark, softBorder, isOnline, onClose, onSave }) {
  const initialDate = new Date(`${plan.planned_date}T00:00:00`);
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const [plannedDate, setPlannedDate] = useState(plan.planned_date);
  const [pickerYear, setPickerYear] = useState(initialDate.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(initialDate.getMonth());
  const [mealType, setMealType] = useState(plan.meal_type);
  const [reminderEnabled, setReminderEnabled] = useState(!!plan.reminder_enabled);
  const [customTimeEnabled, setCustomTimeEnabled] = useState(!!plan.custom_time_enabled);
  const [startTime, setStartTime] = useState(plan.start_time || '18:00');
  const [endTime, setEndTime] = useState(plan.end_time || '20:00');
  const [saving, setSaving] = useState(false);

  const bg = isDark ? '#1c1917' : '#ffffff';
  const headerBg = isDark ? '#1c1917' : '#ffffff';
  const sectionBg = isDark ? '#292524' : '#fff7ed';
  const inputBg = isDark ? '#292524' : '#ffffff';
  const textColor = colors.text;
  const mutedColor = colors.textMuted;
  const primaryColor = colors.primary;
  const years = Array.from({ length: 10 }, (_, i) => today.getFullYear() + i);
  const months = Array.from({ length: 12 }, (_, i) => i);
  const days = Array.from({ length: getDaysInMonth(new Date(pickerYear, pickerMonth, 1)) }, (_, i) => i + 1);

  const handleSave = async () => {
    if (!isOnline) {
      Alert.alert('You are offline', 'Cannot update while offline.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        planned_date: plannedDate,
        meal_type: mealType,
        reminder_enabled: reminderEnabled,
        custom_time_enabled: customTimeEnabled,
        start_time: startTime,
        end_time: endTime,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={[em.card, { backgroundColor: bg }]}>
          <View style={[em.header, { borderBottomColor: softBorder, backgroundColor: headerBg }]}>
            <View style={{ flex: 1 }}>
              <Text style={[em.kicker, { color: primaryColor }]}>EDIT MEAL</Text>
              <Text style={[em.title, { color: textColor }]} numberOfLines={2}>
                {plan.recipe?.title || 'Planned recipe'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={em.closeBtn}>
              <Ionicons name="close" size={22} color={mutedColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={em.body}>
            <Text style={[em.label, { color: mutedColor }]}>DATE</Text>
            <Text style={[em.selectedDate, { color: textColor }]}>{formatSelectedPlannerDate(plannedDate)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={em.dateScroll} contentContainerStyle={{ gap: 8 }}>
              {years.map((item) => {
                const active = item === pickerYear;
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setPickerYear(item)}
                    style={[
                      em.dateSegment,
                      { borderColor: active ? primaryColor : softBorder, backgroundColor: active ? primaryColor : inputBg },
                    ]}
                  >
                    <Text style={[em.dateSegmentText, { color: active ? '#fff' : textColor }]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={em.dateScroll} contentContainerStyle={{ gap: 8 }}>
              {months.map((item) => {
                const active = item === pickerMonth;
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setPickerMonth(item)}
                    style={[
                      em.dateSegment,
                      { borderColor: active ? primaryColor : softBorder, backgroundColor: active ? primaryColor : inputBg },
                    ]}
                  >
                    <Text style={[em.dateSegmentText, { color: active ? '#fff' : textColor }]}>
                      {format(new Date(pickerYear, item, 1), 'MMM').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={em.dateScroll} contentContainerStyle={{ gap: 8 }}>
              {days.map((day) => {
                const d = format(new Date(pickerYear, pickerMonth, day), 'yyyy-MM-dd');
                const disabled = d < todayKey;
                const active = plannedDate === d;
                return (
                <TouchableOpacity
                  key={d}
                  onPress={() => !disabled && setPlannedDate(d)}
                  disabled={disabled}
                  style={[
                    em.dateChip,
                    { borderColor: active ? primaryColor : softBorder, backgroundColor: active ? primaryColor : inputBg, opacity: disabled ? 0.35 : 1 },
                  ]}
                >
                  <Text style={[em.dateChipTop, { color: active ? '#fff' : mutedColor }]}>
                    {format(new Date(d + 'T00:00:00'), 'EEE').toUpperCase()}
                  </Text>
                  <Text style={[em.dateChipNum, { color: active ? '#fff' : textColor }]}>
                    {format(new Date(d + 'T00:00:00'), 'd')}
                  </Text>
                  <Text style={[em.dateChipMonth, { color: active ? '#fff' : mutedColor }]}>
                    {format(new Date(d + 'T00:00:00'), 'MMM yyyy').toUpperCase()}
                  </Text>
                </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[em.label, { color: mutedColor, marginTop: 16 }]}>MEAL TYPE</Text>
            <View style={em.mealTypeRow}>
              {mealSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  onPress={() => {
                    setMealType(slot.id);
                    setStartTime(defaultMealTimes[slot.id].start);
                    setEndTime(defaultMealTimes[slot.id].end);
                  }}
                  style={[
                    em.mealTypeBtn,
                    { borderColor: mealType === slot.id ? primaryColor : softBorder, backgroundColor: mealType === slot.id ? primaryColor : inputBg },
                  ]}
                >
                  <Text style={[em.mealTypeBtnText, { color: mealType === slot.id ? '#fff' : textColor }]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[em.section, { backgroundColor: sectionBg, borderColor: softBorder }]}>
              <View style={em.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[em.toggleLabel, { color: textColor }]}>Meal reminder</Text>
                  <Text style={[em.toggleDesc, { color: mutedColor }]}>Notify when the cooking window starts.</Text>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: isDark ? '#44403c' : '#d6d3d1', true: primaryColor }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={[em.divider, { backgroundColor: softBorder }]} />
              <View style={em.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[em.toggleLabel, { color: textColor }]}>Custom time</Text>
                  <Text style={[em.toggleDesc, { color: mutedColor }]}>Override the default {mealType} window.</Text>
                </View>
                <Switch
                  value={customTimeEnabled}
                  onValueChange={setCustomTimeEnabled}
                  trackColor={{ false: isDark ? '#44403c' : '#d6d3d1', true: primaryColor }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={em.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[em.label, { color: mutedColor }]}>START</Text>
                  <TextInput
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="18:00"
                    placeholderTextColor={mutedColor}
                    editable={customTimeEnabled}
                    style={[em.timeInput, { borderColor: softBorder, backgroundColor: inputBg, color: customTimeEnabled ? textColor : mutedColor, opacity: customTimeEnabled ? 1 : 0.5 }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[em.label, { color: mutedColor }]}>END</Text>
                  <TextInput
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="20:00"
                    placeholderTextColor={mutedColor}
                    editable={customTimeEnabled}
                    style={[em.timeInput, { borderColor: softBorder, backgroundColor: inputBg, color: customTimeEnabled ? textColor : mutedColor, opacity: customTimeEnabled ? 1 : 0.5 }]}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={[em.footer, { borderTopColor: softBorder, backgroundColor: isDark ? '#1c1917' : '#fff7ed' }]}>
            <TouchableOpacity onPress={onClose} style={[em.footerBtn, { borderColor: softBorder, backgroundColor: inputBg }]}>
              <Text style={[em.footerBtnText, { color: textColor }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !isOnline}
              style={[em.footerBtn, { backgroundColor: primaryColor, borderColor: primaryColor, opacity: saving || !isOnline ? 0.6 : 1 }]}
            >
              <Text style={[em.footerBtnText, { color: '#fff' }]}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const em = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 24 },
  card: { borderRadius: 32, overflow: 'hidden', maxHeight: '85%', shadowColor: '#1c1917', shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, gap: 12 },
  closeBtn: { paddingTop: 2 },
  kicker: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 2 },
  title: { fontFamily: 'Geist_800ExtraBold', fontSize: 17, letterSpacing: -0.3, lineHeight: 22 },
  body: { paddingHorizontal: 20, paddingVertical: 16, gap: 0 },
  label: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  selectedDate: { fontFamily: 'Geist_800ExtraBold', fontSize: 16, letterSpacing: -0.3, marginBottom: 10 },
  dateScroll: { marginBottom: 4 },
  dateSegment: { minWidth: 64, height: 38, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  dateSegmentText: { fontFamily: 'Geist_700Bold', fontSize: 12 },
  dateChip: { width: 76, paddingVertical: 10, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 2 },
  dateChipTop: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  dateChipNum: { fontFamily: 'Geist_800ExtraBold', fontSize: 20, lineHeight: 24 },
  dateChipMonth: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  mealTypeBtn: { flex: 1, height: 44, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mealTypeBtnText: { fontFamily: 'Geist_700Bold', fontSize: 12, letterSpacing: 0.5 },
  section: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontFamily: 'Geist_700Bold', fontSize: 13 },
  toggleDesc: { fontFamily: 'Geist_500Medium', fontSize: 11, marginTop: 1 },
  divider: { height: 1 },
  timeRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  timeInput: { height: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Geist_700Bold', fontSize: 14 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
  footerBtn: { flex: 1, height: 48, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footerBtnText: { fontFamily: 'Geist_700Bold', fontSize: 14 },
});
