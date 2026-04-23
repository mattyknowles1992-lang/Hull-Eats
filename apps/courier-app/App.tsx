import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

const jobs = [
  { orderNumber: "HE-1002", status: "assigned", destination: "HU3 2AA" },
  { orderNumber: "HE-1003", status: "picked_up", destination: "HU1 4RT" },
];

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <Text style={styles.eyebrow}>Courier workflow</Text>
      <Text style={styles.title}>Hull Eats Driver App</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active jobs</Text>
        {jobs.map((job) => (
          <View key={job.orderNumber} style={styles.jobRow}>
            <View>
              <Text style={styles.jobTitle}>{job.orderNumber}</Text>
              <Text style={styles.jobMeta}>Dropoff {job.destination}</Text>
            </View>
            <Text style={styles.jobStatus}>{job.status.replaceAll("_", " ")}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f4ee",
    padding: 24,
  },
  eyebrow: {
    marginTop: 18,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: "#c85b31",
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#1f1d1a",
    marginTop: 8,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fffdf9",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#3a2a15",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    color: "#1f1d1a",
  },
  jobRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd3c5",
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f1d1a",
  },
  jobMeta: {
    marginTop: 4,
    color: "#6a645d",
  },
  jobStatus: {
    textTransform: "capitalize",
    color: "#9b6a00",
    fontWeight: "700",
  },
});
