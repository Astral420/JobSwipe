import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AlertType, AlertButton, showGlobalAlert } from './alertTypes';

const { width: SCREEN_W } = Dimensions.get('window');

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

const ALERT_CONFIG = {
  success: {
    icon: 'check-circle' as const,
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
  error: {
    icon: 'alert-circle' as const,
    color: '#EF4444',
    bgColor: '#FEE2E2',
  },
  warning: {
    icon: 'alert' as const,
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  info: {
    icon: 'information' as const,
    color: '#3B82F6',
    bgColor: '#DBEAFE',
  },
  confirm: {
    icon: 'help-circle' as const,
    color: '#7C3AED',
    bgColor: '#EDE9FE',
  },
};

export function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
}: CustomAlertProps) {
  const T = useTheme();
  const config = ALERT_CONFIG[type];

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.alertBox, { backgroundColor: T.surface, borderColor: T.border }]}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <MaterialCommunityIcons name={config.icon} size={32} color={config.color} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: T.textPrimary }]}>{title}</Text>

          {/* Message */}
          {message && <Text style={[styles.message, { color: T.textSub }]}>{message}</Text>}

          {/* Buttons */}
          <View style={[styles.buttonContainer, buttons.length > 2 && styles.buttonContainerVertical]}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    buttons.length === 1 && { flex: 1 },
                    buttons.length === 2 && { flex: 1 },
                    buttons.length > 2 && { width: '100%' },
                    isCancel && { backgroundColor: T.surfaceHigh, borderColor: T.border, borderWidth: 1 },
                    isDestructive && { backgroundColor: T.danger },
                    !isCancel && !isDestructive && { backgroundColor: config.color },
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && { color: T.textSub },
                      !isCancel && { color: '#fff' },
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  alertBox: {
    width: SCREEN_W - 64,
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

// Helper function to show alerts easily
export class AlertHelper {
  static show(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: AlertType = 'info'
  ) {
    showGlobalAlert(title, message, buttons, type);
  }

  static success(title: string, message?: string, onPress?: () => void) {
    this.show(title, message, [{ text: 'OK', onPress }], 'success');
  }

  static error(title: string, message?: string, onPress?: () => void) {
    this.show(title, message, [{ text: 'OK', onPress }], 'error');
  }

  static warning(title: string, message?: string, onPress?: () => void) {
    this.show(title, message, [{ text: 'OK', onPress }], 'warning');
  }

  static info(title: string, message?: string, onPress?: () => void) {
    this.show(title, message, [{ text: 'OK', onPress }], 'info');
  }

  static confirm(
    title: string,
    message?: string,
    onConfirm?: () => void,
    onCancel?: () => void
  ) {
    this.show(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'Confirm', onPress: onConfirm },
      ],
      'confirm'
    );
  }
}
