import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

export default function SplashScreen() {
  const logo = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logo, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(180),
        Animated.timing(title, { toValue: 1, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(360),
        Animated.timing(tagline, { toValue: 1, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(progress, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [logo, progress, pulse, tagline, title]);

  return (
    <LinearGradient colors={["#086B32", "#18A957", "#52D382"]} style={styles.root}>
      <Animated.View style={[styles.logo, { opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [.72, 1] }) }] }]}>
        <Animated.Text style={[styles.bolt, { transform: [{ scale: pulse }] }]}>⚡</Animated.Text>
      </Animated.View>
      <Animated.Text style={[styles.brand, { opacity: title, transform: [{ translateY: title.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>Smart Store</Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: tagline, transform: [{ translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>Fresh, safe and delivered fast.</Animated.Text>
      <View style={styles.progressTrack}><Animated.View style={[styles.progressLine, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["12%", "100%"] }) }]} /></View>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({ root: { flex: 1, alignItems: "center", justifyContent: "center" }, logo: { width: 104, height: 104, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.17)", borderWidth: 1, borderColor: "rgba(255,255,255,.28)" }, bolt: { fontSize: 50 }, brand: { color: "white", fontSize: 34, fontWeight: "900", letterSpacing: -.8, marginTop: 22 }, tagline: { color: "rgba(255,255,255,.82)", fontSize: 14, marginTop: 8 }, progressTrack: { position: "absolute", bottom: 72, width: 150, height: 4, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,255,255,.22)" }, progressLine: { height: "100%", borderRadius: 4, backgroundColor: "white" } });
