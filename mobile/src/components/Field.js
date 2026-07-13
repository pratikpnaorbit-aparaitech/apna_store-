import { Ionicons } from "@expo/vector-icons";
import { forwardRef, memo, useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme";

function Field({ label, error, icon, secureTextEntry, inputStyle, onBlur, onFocus, autoCapitalize = "none", ...inputProps }, forwardedRef) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const setInputRef = useCallback((node) => {
    inputRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  const handleFocus = useCallback((event) => {
    setFocused(true);
    onFocus?.(event);
  }, [onFocus]);

  const handleBlur = useCallback((event) => {
    setFocused(false);
    onBlur?.(event);
  }, [onBlur]);

  const toggleHidden = useCallback(() => {
    setHidden((value) => !value);
    inputRef.current?.focus();
  }, []);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.fieldFocused, error && styles.fieldError]}>
        {icon ? <Ionicons name={icon} size={19} color={focused ? colors.success : colors.muted} /> : null}
        <TextInput
          ref={setInputRef}
          {...inputProps}
          placeholderTextColor="#A19AA9"
          style={[styles.input, inputStyle]}
          secureTextEntry={hidden}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={16}
            style={styles.eyeButton}
            onPress={toggleHidden}
          >
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={21} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export default memo(forwardRef(Field));

const styles = StyleSheet.create({
  wrap: { marginBottom: 15 }, label: { color: colors.ink, fontSize: 13, fontWeight: "700", marginBottom: 7 },
  field: { height: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FBFAFC", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 10 },
  fieldFocused: { borderColor: colors.success, backgroundColor: "white", shadowColor: colors.success, shadowOpacity: .16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  fieldError: { borderColor: colors.danger, backgroundColor: "#FFF7F7" }, input: { flex: 1, color: colors.ink, fontSize: 15 }, eyeButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" }, error: { color: colors.danger, fontSize: 12, marginTop: 5 },
});
