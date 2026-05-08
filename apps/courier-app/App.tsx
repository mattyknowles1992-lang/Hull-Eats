import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { CourierDelivery } from "@hull-eats/types";

const env = globalThis as {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const apiBaseUrl = (env.process?.env?.EXPO_PUBLIC_API_URL ?? "https://hull-eats-api.onrender.com").replace(/\/$/, "");
const brandBlue = "#23CDFF";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string | null;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

const demoRoute = [
  { latitude: 53.7579, longitude: -0.3415 },
  { latitude: 53.7558, longitude: -0.3482 },
  { latitude: 53.7529, longitude: -0.3569 },
  { latitude: 53.7507, longitude: -0.3636 },
  { latitude: 53.7489, longitude: -0.3702 },
];

type CourierAccount = {
  id: string;
  courierProfileId: string;
  fullName: string;
  email: string;
  phone: string;
  username: string;
  vehicleType: string;
  status: string;
  driverStatus: string;
  rating: number;
  completedDeliveries: number;
  weeklyEarnings: number;
  rewardPoints: number;
  nextPayoutDate: string | null;
};

type CourierLoginResponse = {
  token: string;
  courier: CourierAccount;
};

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const demoLocationIndex = useRef(0);

  const [courierToken, setCourierToken] = useState<string | null>(null);
  const [courierAccount, setCourierAccount] = useState<CourierAccount | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [orderInput, setOrderInput] = useState("HE-1002");
  const [pinInput, setPinInput] = useState("");
  const [delivery, setDelivery] = useState<CourierDelivery | null>(null);
  const [jobs, setJobs] = useState<CourierDelivery[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Scan the receipt QR. If it will not scan, enter the order number printed on the receipt.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const activeStatus = delivery?.status.replaceAll("_", " ") ?? "ready";
  const canComplete = Boolean(delivery && delivery.status !== "delivered");

  const activeStep = useMemo(() => {
    if (!delivery) {
      return 0;
    }

    if (delivery.status === "delivered") {
      return 3;
    }

    if (delivery.courierLocation) {
      return 2;
    }

    return 1;
  }, [delivery]);

  const loadJobs = useCallback(async () => {
    if (!courierToken) {
      setJobs([]);
      return;
    }

    try {
      const nextJobs = await apiRequest<CourierDelivery[]>("/v1/courier/jobs", { token: courierToken });
      setJobs(nextJobs);
    } catch {
      setJobs([]);
    }
  }, [courierToken]);

  const loginCourier = useCallback(async () => {
    setIsWorking(true);
    setLoginError(null);

    try {
      const response = await apiRequest<CourierLoginResponse>("/v1/courier/auth/login", {
        method: "POST",
        body: {
          username: loginUsername.trim(),
          password: loginPassword,
        },
      });

      setCourierToken(response.token);
      setCourierAccount(response.courier);
      setLoginPassword("");
      setStatusMessage("Signed in. Scan the receipt QR or use the printed order number backup.");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Courier sign in failed.");
    } finally {
      setIsWorking(false);
    }
  }, [loginPassword, loginUsername]);

  const signOutCourier = useCallback(() => {
    locationSubscription.current?.remove();
    setCourierToken(null);
    setCourierAccount(null);
    setDelivery(null);
    setJobs([]);
    setStatusMessage("Signed out.");
  }, []);

  useEffect(() => {
    void loadJobs();

    return () => {
      locationSubscription.current?.remove();
    };
  }, [loadJobs]);

  const sendLocation = useCallback(async (nextDelivery: CourierDelivery, location: { latitude: number; longitude: number; accuracyMeters?: number }) => {
    const updated = await apiRequest<CourierDelivery>(`/v1/courier/deliveries/${nextDelivery.deliveryId}/location`, {
      method: "POST",
      body: location,
      token: courierToken,
    });

    setDelivery(updated);
  }, [courierToken]);

  const sendDemoLocation = useCallback(
    async (nextDelivery: CourierDelivery) => {
      const point = demoRoute[demoLocationIndex.current % demoRoute.length]!;
      demoLocationIndex.current += 1;
      await sendLocation(nextDelivery, { ...point, accuracyMeters: 25 });
      setStatusMessage("Demo courier position sent to customer tracking.");
    },
    [sendLocation],
  );

  const startLocationSharing = useCallback(
    async (nextDelivery: CourierDelivery) => {
      locationSubscription.current?.remove();

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        await sendDemoLocation(nextDelivery);
        setStatusMessage("Location permission was blocked, so the app sent a demo courier position.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await sendLocation(nextDelivery, {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracyMeters: current.coords.accuracy ?? undefined,
      });

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20,
          timeInterval: 5000,
        },
        (position) => {
          void sendLocation(nextDelivery, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy ?? undefined,
          });
        },
      );

      setStatusMessage("Live location is now being sent to customer tracking.");
    },
    [sendDemoLocation, sendLocation],
  );

  const startDelivery = useCallback(
    async (scanCode?: string) => {
      const reference = scanCode ?? orderInput.trim();

      if (!reference) {
        setErrorMessage("Enter an order number or scan the receipt QR.");
        return;
      }

      setIsWorking(true);
      setErrorMessage(null);

      try {
        const nextDelivery = await apiRequest<CourierDelivery>("/v1/courier/deliveries/start", {
          method: "POST",
          body: scanCode ? { scanCode } : { orderNumber: reference },
          token: courierToken,
        });

        setDelivery(nextDelivery);
        setPinInput("");
        setIsScanning(false);
        setStatusMessage(`${nextDelivery.orderNumber} started. Navigation and live tracking are ready.`);
        await startLocationSharing(nextDelivery);
        void Linking.openURL(nextDelivery.navigationUrl);
        await loadJobs();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to start this delivery.");
      } finally {
        setIsWorking(false);
      }
    },
    [courierToken, loadJobs, orderInput, startLocationSharing],
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (!isScanning) {
        return;
      }

      setIsScanning(false);
      setOrderInput(data);
      void startDelivery(data);
    },
    [isScanning, startDelivery],
  );

  const openScanner = useCallback(async () => {
    setErrorMessage(null);

    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();

      if (!permission.granted) {
        setErrorMessage("Camera permission is needed to scan the order QR code.");
        return;
      }
    }

    setIsScanning(true);
  }, [cameraPermission?.granted, requestCameraPermission]);

  const completeDelivery = useCallback(async () => {
    if (!delivery) {
      return;
    }

    setIsWorking(true);
    setErrorMessage(null);

    try {
      const completed = await apiRequest<CourierDelivery>(`/v1/courier/deliveries/${delivery.deliveryId}/complete`, {
        method: "POST",
        body: { confirmationCode: pinInput.trim() },
        token: courierToken,
      });

      locationSubscription.current?.remove();
      setDelivery(completed);
      setStatusMessage(`${completed.orderNumber} marked as delivered.`);
      await loadJobs();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to complete delivery.");
    } finally {
      setIsWorking(false);
    }
  }, [courierToken, delivery, loadJobs, pinInput]);

  const changePassword = useCallback(async () => {
    if (!currentPassword || !newPassword) {
      setPasswordNotice("Enter your current password and a new password.");
      return;
    }

    setIsWorking(true);
    setPasswordNotice(null);

    try {
      const updated = await apiRequest<CourierAccount>("/v1/courier/me/password", {
        method: "POST",
        body: { currentPassword, newPassword },
        token: courierToken,
      });

      setCourierAccount(updated);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordNotice("Password updated.");
    } catch (error) {
      setPasswordNotice(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setIsWorking(false);
    }
  }, [courierToken, currentPassword, newPassword]);

  if (!courierToken || !courierAccount) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.loginHero}>
            <Image source={require("./assets/hull-eats-logo.jpeg")} style={styles.loginLogo} />
            <Text style={styles.eyebrow}>Courier sign in</Text>
            <Text style={styles.title}>Verified couriers only.</Text>
            <Text style={styles.copy}>Use the courier username or email created in the Hull Eats admin panel.</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Sign in</Text>
            <TextInput
              style={styles.input}
              value={loginUsername}
              onChangeText={setLoginUsername}
              autoCapitalize="none"
              placeholder="Username or email"
              placeholderTextColor="#87909d"
            />
            <TextInput
              style={styles.input}
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry
              placeholder="Password"
              placeholderTextColor="#87909d"
            />
            <Pressable style={styles.primaryButton} onPress={loginCourier} disabled={isWorking}>
              <Text style={styles.primaryButtonText}>Sign in</Text>
            </Pressable>
            {isWorking ? <ActivityIndicator color={brandBlue} /> : null}
            {loginError ? <Text style={styles.error}>{loginError}</Text> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image source={require("./assets/hull-eats-logo.jpeg")} style={styles.logo} />
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Hull Eats courier</Text>
            <Text style={styles.title}>Hi, {courierAccount.fullName.split(" ")[0]}.</Text>
          </View>
          <Pressable onPress={signOutCourier}>
            <Text style={styles.statusPill}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statValue}>{courierAccount.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This week</Text>
            <Text style={styles.statValue}>£{courierAccount.weeklyEarnings.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Rewards</Text>
            <Text style={styles.statValue}>{courierAccount.rewardPoints}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Payout</Text>
            <Text style={styles.statSmall}>
              {courierAccount.nextPayoutDate ? new Date(courierAccount.nextPayoutDate).toLocaleDateString("en-GB") : "Weekly"}
            </Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Account security</Text>
          <Text style={styles.copy}>Change the temporary password from admin once you have signed in.</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Current password"
            placeholderTextColor="#87909d"
          />
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="New password"
            placeholderTextColor="#87909d"
          />
          <Pressable style={styles.secondaryButton} onPress={changePassword} disabled={isWorking}>
            <Text style={styles.secondaryButtonText}>Update password</Text>
          </Pressable>
          {passwordNotice ? <Text style={passwordNotice === "Password updated." ? styles.success : styles.error}>{passwordNotice}</Text> : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Start delivery</Text>
          <Text style={styles.copy}>{statusMessage}</Text>

          {isScanning ? (
            <View style={styles.scannerWrap}>
              <CameraView
                style={styles.scanner}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <Pressable style={styles.secondaryButton} onPress={() => setIsScanning(false)}>
                <Text style={styles.secondaryButtonText}>Close scanner</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.scanGrid}>
              <Pressable style={styles.primaryButton} onPress={openScanner} disabled={isWorking}>
                <Text style={styles.primaryButtonText}>Scan receipt QR</Text>
              </Pressable>
              <TextInput
                style={styles.input}
                value={orderInput}
                onChangeText={setOrderInput}
                autoCapitalize="characters"
                placeholder="Backup order number"
                placeholderTextColor="#87909d"
              />
              <Pressable style={styles.secondaryButton} onPress={() => startDelivery()} disabled={isWorking}>
                <Text style={styles.secondaryButtonText}>Use order number backup</Text>
              </Pressable>
              <Pressable style={styles.ghostButton} onPress={loadJobs} disabled={isWorking}>
                <Text style={styles.ghostButtonText}>Refresh jobs</Text>
              </Pressable>
            </View>
          )}

          {isWorking ? <ActivityIndicator color={brandBlue} /> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        </View>

        {delivery ? (
          <View style={styles.deliveryCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardKicker}>{delivery.orderNumber}</Text>
                <Text style={styles.cardTitle}>{delivery.customerName}</Text>
              </View>
              <Text style={styles.statusPill}>{delivery.status.replaceAll("_", " ")}</Text>
            </View>

            <View style={styles.stepRow}>
              {["Scan", "Navigate", "Live", "PIN"].map((step, index) => (
                <View key={step} style={styles.step}>
                  <View style={[styles.stepDot, index <= activeStep ? styles.stepDotActive : null]} />
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.addressBlock}>
              <Text style={styles.label}>Pickup</Text>
              <Text style={styles.address}>{delivery.pickupAddress}</Text>
              <Text style={styles.label}>Dropoff</Text>
              <Text style={styles.address}>{delivery.dropoffAddress}</Text>
              <Text style={styles.label}>Customer phone</Text>
              <Text style={styles.address}>{delivery.customerPhone}</Text>
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.primaryButton} onPress={() => Linking.openURL(delivery.navigationUrl)}>
                <Text style={styles.primaryButtonText}>Open navigation</Text>
              </Pressable>
              <Pressable style={styles.ghostButton} onPress={() => setDelivery(null)}>
                <Text style={styles.ghostButtonText}>Cancel current scan</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => sendDemoLocation(delivery)}>
                <Text style={styles.secondaryButtonText}>Send location ping</Text>
              </Pressable>
            </View>

            <View style={styles.pinBox}>
              <Text style={styles.label}>Customer PIN</Text>
              <TextInput
                style={styles.pinInput}
                value={pinInput}
                onChangeText={setPinInput}
                keyboardType="number-pad"
                placeholder="Enter PIN"
                placeholderTextColor="#87909d"
                secureTextEntry={false}
              />
              <Pressable style={styles.primaryButton} onPress={completeDelivery} disabled={!canComplete || isWorking}>
                <Text style={styles.primaryButtonText}>Confirm delivered</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Available delivery receipts</Text>
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <Pressable key={job.deliveryId} style={styles.jobRow} onPress={() => startDelivery(job.orderNumber)}>
                <View>
                  <Text style={styles.jobTitle}>{job.orderNumber}</Text>
                  <Text style={styles.jobMeta}>{job.dropoffAddress}</Text>
                </View>
                <Text style={styles.jobStatus}>{job.status.replaceAll("_", " ")}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.copy}>No delivery receipts are waiting right now.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7fbff",
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 44,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 18,
  },
  loginHero: {
    gap: 12,
    paddingTop: 26,
  },
  loginLogo: {
    width: 104,
    height: 104,
    borderRadius: 28,
    marginBottom: 8,
    shadowColor: "#04111a",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    shadowColor: "#04111a",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: "#087fa1",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#071118",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 34,
    marginTop: 8,
  },
  statusPill: {
    backgroundColor: "#071118",
    borderColor: "rgba(35, 205, 255, 0.45)",
    borderWidth: 1,
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: "capitalize",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: "#ffffff",
    borderColor: "rgba(35, 205, 255, 0.16)",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  statLabel: {
    color: "#687382",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statValue: {
    color: "#071118",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 6,
  },
  statSmall: {
    color: "#071118",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    gap: 14,
    padding: 18,
    borderColor: "rgba(35, 205, 255, 0.16)",
    borderWidth: 1,
    shadowColor: "#071118",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  panelTitle: {
    color: "#151515",
    fontSize: 22,
    fontWeight: "900",
  },
  copy: {
    color: "#626a75",
    fontSize: 15,
    lineHeight: 22,
  },
  scanGrid: {
    gap: 12,
  },
  input: {
    backgroundColor: "#f3f5f7",
    borderColor: "#dce1e7",
    borderRadius: 14,
    borderWidth: 1,
    color: "#151515",
    fontSize: 18,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: brandBlue,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#071118",
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  ghostButton: {
    alignItems: "center",
    backgroundColor: "rgba(35, 205, 255, 0.12)",
    borderColor: "rgba(35, 205, 255, 0.42)",
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  ghostButtonText: {
    color: "#087fa1",
    fontSize: 15,
    fontWeight: "900",
  },
  error: {
    backgroundColor: "#ffe9e5",
    borderRadius: 12,
    color: "#a72818",
    fontWeight: "800",
    padding: 12,
  },
  success: {
    backgroundColor: "rgba(35, 205, 255, 0.14)",
    borderRadius: 12,
    color: "#087fa1",
    fontWeight: "900",
    padding: 12,
  },
  scannerWrap: {
    gap: 12,
  },
  scanner: {
    aspectRatio: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  deliveryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    gap: 18,
    padding: 18,
    borderColor: "rgba(35, 205, 255, 0.18)",
    borderWidth: 1,
    shadowColor: "#071118",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardKicker: {
    color: "#087fa1",
    fontSize: 13,
    fontWeight: "900",
  },
  cardTitle: {
    color: "#151515",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 4,
  },
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  step: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  stepDot: {
    backgroundColor: "#d9dee6",
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  stepDotActive: {
    backgroundColor: brandBlue,
  },
  stepText: {
    color: "#626a75",
    fontSize: 12,
    fontWeight: "800",
  },
  addressBlock: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    gap: 6,
    padding: 14,
  },
  label: {
    color: "#7d8490",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 6,
    textTransform: "uppercase",
  },
  address: {
    color: "#151515",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  actionRow: {
    gap: 10,
  },
  pinBox: {
    backgroundColor: "#071118",
    borderRadius: 18,
    gap: 12,
    padding: 14,
  },
  pinInput: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    color: "#151515",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  jobRow: {
    alignItems: "center",
    borderColor: "#e3e7ed",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
  },
  jobTitle: {
    color: "#151515",
    fontSize: 17,
    fontWeight: "900",
  },
  jobMeta: {
    color: "#626a75",
    marginTop: 3,
    maxWidth: 220,
  },
  jobStatus: {
    color: "#087fa1",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "capitalize",
  },
});
