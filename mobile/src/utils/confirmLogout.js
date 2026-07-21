import { confirmAction } from "./confirmAction";

export const confirmLogout = ({
  message,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Logout",
}) => {
  return confirmAction({
    title: "Logout",
    message,
    onConfirm,
    cancelText,
    confirmText,
    destructive: true,
  });
};
