import { Alert, Platform } from 'react-native';

export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  onCancel?: () => void,
) {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n${message}` : title;
    // eslint-disable-next-line no-undef
    if (window.confirm(text)) {
      onConfirm();
    } else {
      onCancel?.();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'キャンセル', style: 'cancel', onPress: onCancel },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
