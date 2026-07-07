export const colors = {
  purple: "#18A957",
  purpleDark: "#0B7136",
  purpleSoft: "#EAF9F0",
  pink: "#20BF63",
  pinkDark: "#128744",
  white: "#FFFFFF",
  background: "#F5FAF6",
  card: "#FFFFFF",
  ink: "#122218",
  muted: "#647269",
  border: "#E1EDE5",
  success: "#169B62",
  warning: "#F59E0B",
  danger: "#DC2626",
};

export const shadow = {
  shadowColor: "#174D2B",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

export const categoryVisuals = {
  "Grocery": ["basket-outline", "#EAFBF1"],
  "Food & Beverages": ["fast-food-outline", "#FFF1E8"],
  "Snacks & Drinks": ["cafe-outline", "#FFF6D8"],
  "Clothing & Fashion": ["shirt-outline", "#FCE7F3"],
  "Fashion & Lifestyle": ["shirt-outline", "#FCE7F3"],
  "Electronics": ["phone-portrait-outline", "#E8F1FF"],
  "Beauty & Cosmetics": ["sparkles-outline", "#FCE7F3"],
  "Beauty": ["sparkles-outline", "#FCE7F3"],
  "Personal Care": ["heart-outline", "#EAF9F0"],
  "Pharmacy": ["medkit-outline", "#E8FAF7"],
  "Books": ["book-outline", "#FFF2E2"],
  "Sports & Fitness": ["barbell-outline", "#E6F8F8"],
};

export const getCategoryVisual = (name) => categoryVisuals[name] || ["grid-outline", "#EDF8F1"];
