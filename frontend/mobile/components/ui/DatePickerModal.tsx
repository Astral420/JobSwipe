import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  initialDate?: string;
  minimumDate?: string;
  maximumDate?: string;
  title?: string;
}

export function DatePickerModal({
  visible,
  onClose,
  onSelect,
  initialDate,
  minimumDate,
  maximumDate,
  title = 'Select Date',
}: DatePickerModalProps) {
  const T = useTheme();
  const currentDate = initialDate ? new Date(initialDate) : new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());

  const minDate = minimumDate ? new Date(minimumDate) : new Date(1950, 0, 1);
  const maxDate = maximumDate ? new Date(maximumDate) : new Date();

  const years = Array.from(
    { length: maxDate.getFullYear() - minDate.getFullYear() + 1 },
    (_, i) => maxDate.getFullYear() - i
  );

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleConfirm = () => {
    const date = new Date(selectedYear, selectedMonth, 1);
    const formattedDate = date.toISOString().split('T')[0];
    onSelect(formattedDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modal, { backgroundColor: T.surface }]} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: T.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color={T.textSub} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickers}>
            {/* Month Picker */}
            <View style={[styles.pickerColumn, { flex: 2 }]}>
              <Text style={[styles.pickerLabel, { color: T.textHint }]}>Month</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {months.map((month, index) => {
                  const isDisabled =
                    (selectedYear === minDate.getFullYear() && index < minDate.getMonth()) ||
                    (selectedYear === maxDate.getFullYear() && index > maxDate.getMonth());
                  
                  return (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.option,
                        selectedMonth === index && { backgroundColor: T.primary + '20' },
                        isDisabled && { opacity: 0.3 },
                      ]}
                      onPress={() => !isDisabled && setSelectedMonth(index)}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: selectedMonth === index ? T.primary : T.textPrimary },
                        ]}
                      >
                        {month}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Year Picker */}
            <View style={[styles.pickerColumn, { flex: 1 }]}>
              <Text style={[styles.pickerLabel, { color: T.textHint }]}>Year</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.option,
                      selectedYear === year && { backgroundColor: T.primary + '20' },
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: selectedYear === year ? T.primary : T.textPrimary },
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: T.surface, borderColor: T.border, borderWidth: 1 }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: T.textSub }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: T.primary }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  pickers: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    height: 300,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
