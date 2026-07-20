import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../navigation/roleConfig";

export function useRequireAuth(navigation) {
  const { user, requestAuthentication } = useAuth();

  return useCallback((intent) => {
    if (user?.role === ROLES.USER) {
      navigation.navigate(intent.name, intent.params);
      return true;
    }

    requestAuthentication(intent);
    navigation.navigate("Login");
    return false;
  }, [navigation, requestAuthentication, user?.role]);
}
