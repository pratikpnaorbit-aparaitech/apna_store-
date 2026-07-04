export const colors = {
  purple: "#6D28D9",
  purpleDark: "#4C1D95",
  purpleSoft: "#F3E8FF",
  pink: "#E91E8C",
  pinkDark: "#C71575",
  white: "#FFFFFF",
  background: "#F8F7FB",
  card: "#FFFFFF",
  ink: "#17131F",
  muted: "#736C7D",
  border: "#ECE8F1",
  success: "#169B62",
  warning: "#F59E0B",
  danger: "#DC2626",
};

export const shadow = {
  shadowColor: "#3B245E",
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
  "Personal Care": ["heart-outline", "#F3E8FF"],
  "Pharmacy": ["medkit-outline", "#E8FAF7"],
  "Books": ["book-outline", "#FFF2E2"],
  "Sports & Fitness": ["barbell-outline", "#E6F8F8"],
};

export const getCategoryVisual = (name) => categoryVisuals[name] || ["grid-outline", "#F1EEFF"];
