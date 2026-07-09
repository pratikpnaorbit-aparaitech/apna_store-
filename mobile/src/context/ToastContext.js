import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadow } from "../theme";

const ToastContext = createContext({ showToast: () => {} });

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const showToast = useCallback(({ title = "Added to cart", message = "", type = "success", duration = 1700 } = {}) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ title, message, type });
    Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
    }, duration);
  }, [opacity]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
          <View style={[styles.toast, toast.type === "error" && styles.errorToast]}>
            <View style={[styles.icon, toast.type === "error" && styles.errorIcon]}>
              <Ionicons name={toast.type === "error" ? "alert-circle" : "checkmark"} size={17} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{toast.title}</Text>
              {toast.message ? <Text numberOfLines={1} style={styles.message}>{toast.message}</Text> : null}
            </View>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14, bottom: 86, zIndex: 9999, elevation: 9999 },
  toast: { minHeight: 58, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 10, ...shadow },
  errorToast: { borderColor: "#FECACA" },
  icon: { width: 30, height: 30, borderRadius: 11, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  errorIcon: { backgroundColor: colors.danger },
  title: { color: colors.ink, fontWeight: "900", fontSize: 13 },
  message: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
