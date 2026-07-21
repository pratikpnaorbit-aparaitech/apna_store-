import { Alert, Platform } from "react-native";

export const confirmAction = ({
  title,
  message,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  destructive = false,
}) => {
  if (Platform.OS === "web") {
    const confirmed = typeof globalThis.confirm !== "function" || globalThis.confirm(message);
    return confirmed ? Promise.resolve(onConfirm()) : Promise.resolve();
  }

  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    { text: confirmText, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
  return Promise.resolve();
};
