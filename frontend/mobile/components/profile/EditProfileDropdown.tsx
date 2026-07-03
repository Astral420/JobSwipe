import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface DropdownOption {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
}

interface EditProfileDropdownProps {
  saving: boolean;
  options: DropdownOption[];
}

export function EditProfileDropdown({ saving, options }: EditProfileDropdownProps) {
  const T = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleOptionPress = (option: DropdownOption) => {
    setShowDropdown(false);
    // Small delay to allow dropdown to close before action
    setTimeout(() => {
      option.onPress();
    }, 150);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.editBtn,
          { 
            borderColor: T.border, 
            backgroundColor: T.surfaceHigh 
          },
        ]}
        onPress={() => setShowDropdown(true)}
        activeOpacity={0.8}
        disabled={saving}
      >
        {saving ? (
          <Text style={[styles.editBtnText, { color: T.primary }]}>Saving...</Text>
        ) : (
          <>
            <MaterialCommunityIcons name="pencil-outline" size={14} color={T.primary} />
            <Text style={[styles.editBtnText, { color: T.primary }]}>Edit Profile</Text>
            <MaterialCommunityIcons name="chevron-down" size={14} color={T.primary} />
          </>
        )}
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownScrim}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={[styles.dropdown, { backgroundColor: T.surface, borderColor: T.border }]}>
              {options.map((option, index) => (
                <React.Fragment key={option.id}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: T.borderFaint }]} />}
                  <TouchableOpacity
                    style={[styles.dropdownOption, { backgroundColor: T.surface }]}
                    onPress={() => handleOptionPress(option)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: T.primary + '18' }]}>
                      <MaterialCommunityIcons name={option.icon} size={18} color={T.primary} />
                    </View>
                    <Text style={[styles.optionLabel, { color: T.textPrimary }]}>{option.label}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={T.textHint} />
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  editBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    borderWidth: 1.5, 
    borderRadius: 24, 
    paddingHorizontal: 16, 
    paddingVertical: 9, 
    marginBottom: 6 
  },
  editBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  dropdownScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: 140,
    paddingHorizontal: 24,
  },
  dropdownContainer: {
    alignItems: 'flex-end',
  },
  dropdown: {
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});
