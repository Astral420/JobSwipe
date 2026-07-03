// Shared types and global handler for alerts
export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

// Global state for alerts (outside React component lifecycle)
let globalShowAlert: ((props: Omit<AlertState, 'visible'>) => void) | null = null;

export function setGlobalAlertHandler(handler: ((props: Omit<AlertState, 'visible'>) => void) | null) {
  globalShowAlert = handler;
}

export function showGlobalAlert(title: string, message?: string, buttons?: AlertButton[], type: AlertType = 'info') {
  if (globalShowAlert) {
    globalShowAlert({ title, message, buttons, type });
  }
}
