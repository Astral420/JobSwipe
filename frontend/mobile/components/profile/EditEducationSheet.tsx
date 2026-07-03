import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AlertHelper } from '../ui/CustomAlert';
import { DatePickerModal } from '../ui/DatePickerModal';

interface EducationItem {
  id: number;
  degree: string;
  school: string;
  period: string;
}

interface EditEducationSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { degree: string; school: string; fieldOfStudy: string; startDate: string; endDate: string }) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  education: EducationItem[];
}

export function EditEducationSheet({ visible, onClose, onAdd, onDelete, education }: EditEducationSheetProps) {
  const T = useTheme();
  const [showAddForm, setShowAddForm] = useState(false);
  const [degree, setDegree] = useState('');
  const [school, setSchool] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isCurrentlyStudying, setIsCurrentlyStudying] = useState(false);

  const resetForm = () => {
    setDegree('');
    setSchool('');
    setFieldOfStudy('');
    setStartDate('');
    setEndDate('');
    setIsCurrentlyStudying(false);
    setShowAddForm(false);
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const handleAdd = async () => {
    if (!degree.trim() || !school.trim()) {
      AlertHelper.warning('Required Fields', 'Please fill in degree and school');
      return;
    }

    setSaving(true);
    try {
      const finalEndDate = isCurrentlyStudying ? '' : endDate;
      await onAdd({ degree, school, fieldOfStudy, startDate, endDate: finalEndDate });
      resetForm();
    } catch (err) {
      console.error('Add education error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (index: number) => {
    AlertHelper.confirm(
      'Delete Education',
      'Are you sure you want to delete this education entry?',
      async () => {
        try {
          await onDelete(index);
        } catch (err) {
          console.error('Delete error:', err);
        }
      }
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[styles.handle, { backgroundColor: T.borderFaint }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: T.textPrimary }]}>Education</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={20} color={T.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Existing Education */}
            {education.map((edu, index) => (
              <View key={edu.id} style={[styles.eduCard, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eduDegree, { color: T.textPrimary }]}>{edu.degree}</Text>
                  <Text style={[styles.eduSchool, { color: T.textSub }]}>{edu.school}</Text>
                  <Text style={[styles.eduPeriod, { color: T.textHint }]}>{edu.period}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialCommunityIcons name="delete-outline" size={20} color={T.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add New Form */}
            {showAddForm ? (
              <View style={[styles.addForm, { backgroundColor: T.surfaceHigh, borderColor: T.primary }]}>
                <Text style={[styles.formTitle, { color: T.textPrimary }]}>Add Education</Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[styles.label, { color: T.textHint }]}>School *</Text>
                    <View style={[styles.inputRow, { backgroundColor: T.surface, borderColor: T.border }]}>
                      <TextInput
                        style={[styles.inputText, { color: T.textPrimary }]}
                        value={school}
                        onChangeText={setSchool}
                        placeholder="MIT"
                        placeholderTextColor={T.textHint}
                      />
                    </View>
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[styles.label, { color: T.textHint }]}>Degree *</Text>
                    <View style={[styles.inputRow, { backgroundColor: T.surface, borderColor: T.border }]}>
                      <TextInput
                        style={[styles.inputText, { color: T.textPrimary }]}
                        value={degree}
                        onChangeText={setDegree}
                        placeholder="B.S."
                        placeholderTextColor={T.textHint}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: T.textHint }]}>Field of Study</Text>
                  <View style={[styles.inputRow, { backgroundColor: T.surface, borderColor: T.border }]}>
                    <TextInput
                      style={[styles.inputText, { color: T.textPrimary }]}
                      value={fieldOfStudy}
                      onChangeText={setFieldOfStudy}
                      placeholder="Computer Science"
                      placeholderTextColor={T.textHint}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[styles.label, { color: T.textHint }]}>Start</Text>
                    <TouchableOpacity
                      style={[styles.inputRow, { backgroundColor: T.surface, borderColor: T.border }]}
                      onPress={() => setShowStartPicker(true)}
                    >
                      <MaterialCommunityIcons name="calendar" size={14} color={T.textHint} />
                      <Text style={[styles.inputText, { color: startDate ? T.textPrimary : T.textHint }]}>
                        {startDate ? formatDateForDisplay(startDate) : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[styles.label, { color: T.textHint }]}>End</Text>
                    <TouchableOpacity
                      style={[styles.inputRow, { backgroundColor: T.surface, borderColor: T.border }]}
                      onPress={() => !isCurrentlyStudying && setShowEndPicker(true)}
                      disabled={isCurrentlyStudying}
                    >
                      <MaterialCommunityIcons name="calendar" size={14} color={T.textHint} />
                      <Text style={[styles.inputText, { color: (endDate || isCurrentlyStudying) ? T.textPrimary : T.textHint }]}>
                        {isCurrentlyStudying ? 'Present' : (endDate ? formatDateForDisplay(endDate) : 'Select date')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => {
                    setIsCurrentlyStudying(!isCurrentlyStudying);
                    if (!isCurrentlyStudying) {
                      setEndDate('');
                    }
                  }}
                >
                  <View style={[styles.checkbox, { borderColor: T.border, backgroundColor: isCurrentlyStudying ? T.primary : 'transparent' }]}>
                    {isCurrentlyStudying && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: T.textSub }]}>I currently study here</Text>
                </TouchableOpacity>

                {showStartPicker && (
                  <DatePickerModal
                    visible={showStartPicker}
                    onClose={() => setShowStartPicker(false)}
                    onSelect={(date) => setStartDate(date)}
                    initialDate={startDate}
                    maximumDate={new Date().toISOString().split('T')[0]}
                    title="Select Start Date"
                  />
                )}

                {showEndPicker && !isCurrentlyStudying && (
                  <DatePickerModal
                    visible={showEndPicker}
                    onClose={() => setShowEndPicker(false)}
                    onSelect={(date) => setEndDate(date)}
                    initialDate={endDate}
                    minimumDate={startDate}
                    maximumDate={new Date().toISOString().split('T')[0]}
                    title="Select End Date"
                  />
                )}

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.formButton, { backgroundColor: T.surface, borderColor: T.border }]}
                    onPress={resetForm}
                    disabled={saving}
                  >
                    <Text style={[styles.formButtonText, { color: T.textSub }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formButton, { backgroundColor: T.primary }]}
                    onPress={handleAdd}
                    disabled={saving}
                  >
                    <Text style={[styles.formButtonText, { color: '#fff' }]}>
                      {saving ? 'Adding...' : 'Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: T.primary + '18', borderColor: T.primary }]}
                onPress={() => setShowAddForm(true)}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={20} color={T.primary} />
                <Text style={[styles.addButtonText, { color: T.primary }]}>Add Education</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: T.primary }]}
              onPress={onClose}
            >
              <Text style={[styles.doneButtonText, { color: '#fff' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  content: { paddingHorizontal: 20, marginBottom: 16 },
  eduCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  eduDegree: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  eduSchool: { fontSize: 14, marginBottom: 2 },
  eduPeriod: { fontSize: 12 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingVertical: 16,
    marginTop: 8,
  },
  addButtonText: { fontSize: 14, fontWeight: '700' },
  addForm: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginTop: 8,
  },
  formTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
  },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  formButtonText: { fontSize: 14, fontWeight: '700' },
  footer: { paddingHorizontal: 20, paddingTop: 16 },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneButtonText: { fontSize: 15, fontWeight: '700' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
  },
});
