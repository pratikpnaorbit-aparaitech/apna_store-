import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import Screen from "../components/Screen";
import ProductCard from "../components/ProductCard";
import StateView from "../components/StateView";
import { api, messageFromError } from "../api/client";
import { useAddress } from "../context/AddressContext";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { colors, getCategoryVisual, shadow } from "../theme";

const banners = [
  ["Big savings, tiny wait", "Up to 50% OFF", "#6D28D9", "🎁"],
  ["Fresh picks daily", "Farm-fresh essentials", "#E91E8C", "🥬"],
  ["Free delivery", "On your first order", "#0F9D75", "🛵"],
];
const BANNER_AUTO_SCROLL_MS = 3500;

const categoryImages = {
  vegetables: require("../../assets/categories/vegetables.png"),
  grocery: require("../../assets/categories/grocery.png"),
  beverages: require("../../assets/categories/beverages.png"),
  "food & beverages": require("../../assets/categories/beverages.png"),
};

function CategoryImage({ category, fallback }) {
  const [failed, setFailed] = useState(false);
  const source = categoryImages[String(category).trim().toLowerCase()];
  if (!source || failed) return <Ionicons name={fallback} size={27} color={colors.purple} />;
  return <Image source={source} onError={() => setFailed(true)} resizeMode="cover" style={styles.categoryImage} accessibilityLabel={`${category} category`} />;
}

export default function HomeScreen({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();
  const { selectedAddress } = useAddress();
  const requireAuth = useRequireAuth(navigation);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerListRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const bannerIndexRef = useRef(0);
  const bannerReadyRef = useRef(false);
  const bannerDraggingRef = useRef(false);
  const homeFocusedRef = useRef(false);
  const bannerWidth = Math.min(520, Math.max(260, screenWidth - 72));
  const bannerInterval = bannerWidth + 12;

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const [p, s] = await Promise.all([api.get("/inventory/public"), api.get("/stores/public")]);
      setProducts(Array.isArray(p.data) ? p.data : []);
      setStores(s.data?.data || []);
    } catch (e) {
      setError(messageFromError(e, "Could not load products."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const clearBannerTimer = useCallback(() => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = null;
  }, []);

  const scheduleBannerAutoScroll = useCallback(() => {
    clearBannerTimer();
    if (!homeFocusedRef.current || !bannerReadyRef.current || bannerDraggingRef.current) return;
    bannerTimerRef.current = setTimeout(() => {
      if (!homeFocusedRef.current || !bannerReadyRef.current || bannerDraggingRef.current || !bannerListRef.current) return;
      const nextIndex = (bannerIndexRef.current + 1) % banners.length;
      bannerIndexRef.current = nextIndex;
      setBannerIndex(nextIndex);
      bannerListRef.current.scrollToOffset({ offset: bannerInterval * nextIndex, animated: true });
      scheduleBannerAutoScroll();
    }, BANNER_AUTO_SCROLL_MS);
  }, [bannerInterval, clearBannerTimer]);

  useFocusEffect(useCallback(() => {
    homeFocusedRef.current = true;
    scheduleBannerAutoScroll();
    return () => {
      homeFocusedRef.current = false;
      bannerDraggingRef.current = false;
      clearBannerTimer();
    };
  }, [clearBannerTimer, scheduleBannerAutoScroll]));

  useEffect(() => () => clearBannerTimer(), [clearBannerTimer]);

  const categories = [...new Set(products.map((item) => item.category).filter(Boolean))].slice(0, 8);
  const submitSearch = () => search.trim() && navigation.navigate("Products", { search: search.trim(), title: `Results for “${search.trim()}”` });

  if (loading) return <Screen><StateView loading /></Screen>;
  if (error && !products.length) return <Screen><StateView icon="cloud-offline-outline" title="Couldn’t load the store" message={error} action="Try again" onAction={load} /></Screen>;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.purple} />}
      >
        <LinearGradient colors={[colors.purpleDark, colors.purple]} style={styles.hero}>
          <View style={styles.top}>
            <Pressable onPress={() => requireAuth({ name: "Location" })} style={{ flex: 1 }}>
              <Text style={styles.time}>Delivery in 6 minutes ⚡</Text>
              <View style={styles.addressRow}>
                <Ionicons name="location" size={14} color="rgba(255,255,255,.85)" />
                <Text numberOfLines={1} style={styles.address}>{selectedAddress?.address || "Choose delivery address"}</Text>
                <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,.72)" />
              </View>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("ProfileTab")} style={styles.avatar}>
              <Ionicons name="person" size={20} color={colors.purple} />
            </Pressable>
          </View>
          <View style={styles.search}>
            <Ionicons name="search" size={20} color={colors.muted} />
            <TextInput value={search} onChangeText={setSearch} onSubmitEditing={submitSearch} returnKeyType="search" placeholder="Search for products" placeholderTextColor="#938C9B" style={styles.searchInput} />
            <Ionicons name="mic-outline" size={20} color={colors.purple} />
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <FlatList
            ref={bannerListRef}
            horizontal
            data={banners}
            keyExtractor={(item) => item[0]}
            renderItem={({ item: banner }) => (
              <LinearGradient colors={[banner[2], banner[2] + "CC"]} style={[styles.banner, { width: bannerWidth }]}>
                <View>
                  <Text style={styles.bannerTitle}>{banner[0]}</Text>
                  <Text style={styles.bannerSub}>{banner[1]}</Text>
                  <Pressable onPress={() => navigation.navigate("OffersTab")} style={styles.shop}>
                    <Text style={styles.shopText}>SHOP NOW</Text>
                  </Pressable>
                </View>
                <Text style={styles.bannerEmoji}>{banner[3]}</Text>
              </LinearGradient>
            )}
            ItemSeparatorComponent={() => <View style={styles.bannerGap} />}
            snapToInterval={bannerInterval}
            decelerationRate="fast"
            disableIntervalMomentum
            directionalLockEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            onLayout={() => {
              bannerReadyRef.current = true;
              scheduleBannerAutoScroll();
            }}
            onScrollBeginDrag={() => {
              bannerDraggingRef.current = true;
              clearBannerTimer();
            }}
            onScrollEndDrag={() => {
              bannerDraggingRef.current = false;
              scheduleBannerAutoScroll();
            }}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.max(0, Math.min(banners.length - 1, Math.round(event.nativeEvent.contentOffset.x / bannerInterval)));
              bannerIndexRef.current = nextIndex;
              setBannerIndex(nextIndex);
              bannerDraggingRef.current = false;
              scheduleBannerAutoScroll();
            }}
            getItemLayout={(_, index) => ({ length: bannerInterval, offset: bannerInterval * index, index })}
          />
          <View style={styles.pagination} accessibilityLabel={`Banner ${bannerIndex + 1} of ${banners.length}`}>
            {banners.map((banner, index) => <View key={banner[0]} style={[styles.dot, index === bannerIndex && styles.dotActive]} />)}
          </View>

          <SectionHeader title="Shop by category" action="See all" onPress={() => navigation.navigate("CategoriesTab")} />
          <View style={styles.categories}>
            {categories.map((category) => {
              const visual = getCategoryVisual(category);
              return (
                <Pressable key={category} onPress={() => navigation.navigate("Products", { category, title: category })} style={styles.category}>
                  <View style={[styles.categoryIcon, { backgroundColor: visual[1] }]}>
                    <CategoryImage category={category} fallback={visual[0]} />
                  </View>
                  <Text numberOfLines={2} style={styles.categoryText}>{category}</Text>
                </Pressable>
              );
            })}
          </View>

          {stores.length ? (
            <>
              <SectionHeader title="Stores near you" action="View all" onPress={() => navigation.navigate("Stores")} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 11 }}>
                {stores.slice(0, 6).map((store) => (
                  <Pressable key={store._id} onPress={() => navigation.navigate("Products", { storeId: store._id, title: store.name })} style={styles.store}>
                    <View style={styles.storeLogo}><Text style={{ fontSize: 25 }}>🏪</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={styles.storeName}>{store.name}</Text>
                      <Text style={styles.storeMeta}>10–15 min • 4.5 ★</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          <SectionHeader title="Popular near you" action="See all" onPress={() => navigation.navigate("Products", { title: "Popular products" })} />
          <FlatList
            scrollEnabled={false}
            data={products.slice(0, 8)}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 12 }}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <ProductCard product={item} compact onPress={() => navigation.navigate("ProductDetail", { product: item })} />}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ title, action, onPress }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Pressable onPress={onPress}><Text style={styles.sectionAction}>{action} ›</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  hero: { padding: 18, paddingBottom: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  top: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  time: { color: "white", fontSize: 22, fontWeight: "900" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5, maxWidth: "95%" },
  address: { color: "rgba(255,255,255,.82)", fontSize: 12, maxWidth: "78%" },
  avatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: "rgba(255,255,255,.92)", alignItems: "center", justifyContent: "center", ...shadow },
  search: { height: 54, borderRadius: 18, backgroundColor: "white", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, ...shadow },
  searchInput: { flex: 1, marginHorizontal: 9, fontSize: 14, color: colors.ink },
  body: { padding: 16, paddingBottom: 30 },
  banner: { height: 160, borderRadius: 23, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bannerGap: { width: 12 },
  bannerTitle: { color: "white", fontSize: 21, fontWeight: "900", maxWidth: 190 },
  bannerSub: { color: "rgba(255,255,255,.82)", marginTop: 5, fontSize: 12 },
  bannerEmoji: { fontSize: 58 },
  shop: { backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: "flex-start", marginTop: 14 },
  shopText: { color: colors.purple, fontSize: 10, fontWeight: "900" },
  pagination: { height: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#C9D8CD" },
  dotActive: { width: 18, backgroundColor: colors.purple },
  section: { marginTop: 25, marginBottom: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  sectionAction: { color: colors.purple, fontSize: 12, fontWeight: "800" },
  categories: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
  category: { width: "23%", alignItems: "center" },
  categoryIcon: { width: 68, height: 65, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  categoryImage: { width: "100%", height: "100%", borderRadius: 20 },
  categoryText: { color: colors.ink, textAlign: "center", fontSize: 10.5, fontWeight: "700", marginTop: 7, lineHeight: 14 },
  store: { width: 210, backgroundColor: "white", borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 12, flexDirection: "row", alignItems: "center", gap: 11 },
  storeLogo: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  storeName: { color: colors.ink, fontWeight: "900" },
  storeMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
});
