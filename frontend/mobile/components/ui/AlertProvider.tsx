import React, { useState, useCallback } from 'react';
import { CustomAlert } from './CustomAlert';
import { AlertState, setGlobalAlertHandler } from './alertTypes';

export function AlertProvider() {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = useCallback(({ title, message, buttons, type }: Omit<AlertState, 'visible'>) => {
    setAlertState({
      visible: true,
      type: type || 'info',
      title,
      message,
      buttons: buttons || [{ text: 'OK', style: 'default' }],
    });
  }, []);

  // Set the global handler when this component mounts
  React.useEffect(() => {
    setGlobalAlertHandler(showAlert);
    return () => {
      setGlobalAlertHandler(null);
    };
  }, [showAlert]);

  const handleClose = () => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <CustomAlert
      visible={alertState.visible}
      type={alertState.type}
      title={alertState.title}
      message={alertState.message}
      buttons={alertState.buttons}
      onClose={handleClose}
    />
  );
}

AlertProvider.displayName = 'AlertProvider';
