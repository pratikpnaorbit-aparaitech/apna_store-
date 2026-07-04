import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";

export default function Screen({ children, style, edges = ["top"] }) {
  return <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.background }, style]}>{children}</SafeAreaView>;
}
