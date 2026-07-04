import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";

export default function PrimaryButton({ title, onPress, loading, disabled, style }) {
  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [style, { opacity: disabled ? .55 : pressed ? .9 : 1 }]}>
      <LinearGradient colors={[colors.pink, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.text}>{title}</Text>}
      </LinearGradient>
    </Pressable>
  );
}
const styles = StyleSheet.create({ button: { height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center" }, text: { color: "white", fontSize: 16, fontWeight: "800" } });
