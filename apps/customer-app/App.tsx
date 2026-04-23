import { StatusBar } from "expo-status-bar";
import {
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const logo = require("./assets/hull-eats-logo.png");

const stores = [
  {
    id: "store_harbour_kitchen_hull",
    name: "Harbour Kitchen Hull",
    subtitle: "Modern comfort food",
    eta: "22 min",
    fee: "GBP 2.99",
    status: "Storefront live",
    summary: "Beautiful launch-ready storefront while the business finishes menu setup.",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "store_dockside_grocer_hull",
    name: "Dockside Grocer Hull",
    subtitle: "Groceries and convenience",
    eta: "18 min",
    fee: "GBP 3.49",
    status: "Stock onboarding",
    summary: "Perfect for businesses adding inventory in batches without breaking the customer app.",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "store_ember_burger_hull",
    name: "Ember Burger Hull",
    subtitle: "Burgers",
    eta: "24 min",
    fee: "GBP 2.49",
    status: "Opening soon",
    summary: "Customers can follow the brand now and order the moment the first items go live.",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
  },
];

const lanes = ["Restaurants", "Takeaways", "Deli & Cafe", "Bakeries", "Shops"];

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <View style={styles.brandCard}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <View style={styles.brandCopy}>
              <Text style={styles.eyebrow}>Hull Eats</Text>
              <Text style={styles.brandTitle}>Anything you want. Delivered.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.accountButton}>
            <Text style={styles.accountButtonText}>Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.searchPlaceholder}>Search takeaways, shops, and cafes...</Text>
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryPill}>
              <Text style={styles.deliveryPillText}>Delivering to Hull city centre</Text>
            </View>
            <View style={[styles.deliveryPill, styles.deliveryPillAccent]}>
              <Text style={[styles.deliveryPillText, styles.deliveryPillAccentText]}>Free delivery from GBP 9.99/mo</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lanesRow}>
            {lanes.map((lane, index) => (
              <View key={lane} style={[styles.lanePill, index === 0 && styles.lanePillActive]}>
                <Text style={[styles.lanePillText, index === 0 && styles.lanePillTextActive]}>{lane}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Businesses on Hull Eats</Text>
          <Text style={styles.sectionCopy}>Premium storefronts now, products later.</Text>
        </View>

        {stores.map((store) => (
          <ImageBackground key={store.id} source={{ uri: store.image }} imageStyle={styles.cardImage} style={styles.card}>
            <View style={styles.cardOverlay} />
            <View style={styles.cardTopRow}>
              <View style={styles.cardStatusPill}>
                <Text style={styles.cardStatusPillText}>{store.status}</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardSubtitle}>{store.subtitle}</Text>
              <Text style={styles.cardTitle}>{store.name}</Text>
              <Text style={styles.cardMeta}>
                {store.eta} / Delivery {store.fee}
              </Text>
              <Text style={styles.cardSummary}>{store.summary}</Text>
              <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.primaryButtonSmall}>
                  <Text style={styles.primaryButtonText}>Preview storefront</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButtonSmall}>
                  <Text style={styles.secondaryButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        ))}

        <View style={styles.membershipCard}>
          <Text style={styles.membershipEyebrow}>Hull Eats+</Text>
          <Text style={styles.membershipPrice}>GBP 9.99/mo</Text>
          <Text style={styles.membershipCopy}>
            Monthly Stripe subscription for free delivery, account perks, and launch access to new local businesses.
          </Text>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Join membership</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dock}>
          <View style={[styles.dockItem, styles.dockItemActive]}>
            <Text style={styles.dockItemActiveText}>Home</Text>
          </View>
          <View style={styles.dockItem}>
            <Text style={styles.dockItemText}>Browse</Text>
          </View>
          <View style={styles.dockItem}>
            <Text style={styles.dockItemText}>Orders</Text>
          </View>
          <View style={styles.dockItem}>
            <Text style={styles.dockItemText}>Account</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020814",
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 36,
  },
  topbar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  brandCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(188, 213, 255, 0.16)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  logo: {
    width: 64,
    height: 64,
  },
  brandCopy: {
    flex: 1,
  },
  eyebrow: {
    color: "#ffb47d",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  brandTitle: {
    marginTop: 4,
    color: "#f7fbff",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
  },
  accountButton: {
    minHeight: 52,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  accountButtonText: {
    color: "#f7fbff",
    fontSize: 14,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#ff6b00",
    shadowColor: "#ff6b00",
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  primaryButtonSmall: {
    minHeight: 46,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#ff6b00",
    shadowColor: "#ff6b00",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  searchCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(188, 213, 255, 0.14)",
    backgroundColor: "rgba(10, 24, 46, 0.92)",
  },
  searchPlaceholder: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "#7890ad",
    fontSize: 15,
  },
  deliveryRow: {
    marginTop: 12,
    gap: 10,
  },
  deliveryPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  deliveryPillAccent: {
    borderColor: "rgba(255, 107, 0, 0.28)",
    backgroundColor: "rgba(255, 107, 0, 0.1)",
  },
  deliveryPillText: {
    color: "#dce9ff",
    fontSize: 12,
    fontWeight: "800",
  },
  deliveryPillAccentText: {
    color: "#ffe4cf",
  },
  lanesRow: {
    gap: 10,
    paddingTop: 14,
    paddingRight: 12,
  },
  lanePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  lanePillActive: {
    borderColor: "rgba(255, 107, 0, 0.26)",
    backgroundColor: "rgba(255, 107, 0, 0.12)",
  },
  lanePillText: {
    color: "#dce9ff",
    fontSize: 13,
    fontWeight: "800",
  },
  lanePillTextActive: {
    color: "#ffe4cf",
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900",
  },
  sectionCopy: {
    marginTop: 8,
    color: "#9fb2c9",
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    minHeight: 280,
    marginBottom: 16,
    borderRadius: 28,
    overflow: "hidden",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOpacity: 0.32,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  cardImage: {
    borderRadius: 28,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 11, 23, 0.58)",
  },
  cardTopRow: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardStatusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  cardStatusPillText: {
    color: "#ffe4cf",
    fontSize: 12,
    fontWeight: "800",
  },
  cardContent: {
    padding: 18,
  },
  cardSubtitle: {
    color: "rgba(255, 228, 207, 0.9)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  cardTitle: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "900",
  },
  cardMeta: {
    marginTop: 8,
    color: "#e7eefb",
    fontSize: 14,
    fontWeight: "700",
  },
  cardSummary: {
    marginTop: 10,
    color: "#d4e1f2",
    fontSize: 14,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  secondaryButtonSmall: {
    minHeight: 46,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  membershipCard: {
    marginTop: 4,
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 107, 0, 0.12)",
  },
  membershipEyebrow: {
    color: "#ffd2b3",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  membershipPrice: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "900",
  },
  membershipCopy: {
    marginTop: 10,
    marginBottom: 18,
    color: "#ffe8d8",
    fontSize: 14,
    lineHeight: 22,
  },
  dock: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    padding: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(188, 213, 255, 0.14)",
    backgroundColor: "rgba(5, 15, 29, 0.92)",
  },
  dockItem: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  dockItemActive: {
    backgroundColor: "rgba(255, 107, 0, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.26)",
  },
  dockItemText: {
    color: "#8fa3bf",
    fontSize: 13,
    fontWeight: "800",
  },
  dockItemActiveText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
});
