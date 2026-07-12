import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";

export default function PrimaryButton({ title, onPress, loading, disabled, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: .97, useNativeDriver: true, speed: 35, bounciness: 4 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 35, bounciness: 4 }).start();
  return (
    <Animated.View style={[style, { transform: [{ scale }], opacity: disabled ? .55 : 1 }]}>
      <Pressable disabled={disabled || loading} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        <LinearGradient colors={[colors.pink, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.text}>{title}</Text>}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
const styles = StyleSheet.create({ button: { height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center" }, text: { color: "white", fontSize: 16, fontWeight: "800" } });
