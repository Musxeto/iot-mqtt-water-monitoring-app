import { DEFAULT_MQTT_CONFIG, loadMQTTConfig, MQTTConfig } from '@/config/mqtt';
import { Colors } from '@/constants/colors';
import { getLatestReadings, saveSensorReading } from '@/services/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Paho from 'paho-mqtt';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CLIENT_ID = 'ReactNative_App_' + Math.random().toString(16).substr(2, 8);

// --- SENSOR DATA TYPE ---
interface SensorData {
  temp: number;
  humidity: number;
  ph: number;
  nitrate: number;
  turbidity: number;
  level: number;
  status: string;
}

// --- SENSOR CARD PROPS ---
interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
  isAlert?: boolean;
  trend?: 'up' | 'down' | 'stable';
}

export default function HomeScreen() {
  // --- STATE MANAGEMENT ---
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [firebaseStatus, setFirebaseStatus] = useState('Not synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [readingCount, setReadingCount] = useState(0);
  const [mqttConfig, setMqttConfig] = useState<MQTTConfig>(DEFAULT_MQTT_CONFIG);
  const [sensorData, setSensorData] = useState<SensorData>({
    temp: 0,
    humidity: 0,
    ph: 7.0,
    nitrate: 0,
    turbidity: 0,
    level: 100,
    status: 'Waiting for data...'
  });
  const [previousData, setPreviousData] = useState<SensorData | null>(null);
  
  // Refs for tracking
  const sensorDataRef = useRef<SensorData>(sensorData);
  const clientRef = useRef<typeof Paho.Client.prototype | null>(null);

  // Keep ref updated with latest sensor data
  useEffect(() => {
    sensorDataRef.current = sensorData;
  }, [sensorData]);

  // --- Load MQTT Config ---
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await loadMQTTConfig();
        setMqttConfig(config);
      } catch {
        console.log('Using default MQTT config');
      }
    };
    loadConfig();
  }, []);

  // --- FIREBASE: Save data on every message ---
  const saveToFirebase = async (data: SensorData) => {
    try {
      setFirebaseStatus('Syncing...');
      await saveSensorReading(data);
      setLastSyncTime(new Date());
      setFirebaseStatus('Synced');
      setReadingCount(prev => prev + 1);
      console.log('Data saved to Firebase');
    } catch (error) {
      console.error('Firebase save error:', error);
      setFirebaseStatus('Sync failed');
    }
  };

  // --- FIREBASE: Load initial reading count ---
  useEffect(() => {
    const loadReadingCount = async () => {
      try {
        const readings = await getLatestReadings(100);
        setReadingCount(readings.length);
        if (readings.length > 0) {
          setFirebaseStatus('Connected');
        }
      } catch (error) {
        console.log('Could not load reading count:', error);
      }
    };
    loadReadingCount();
  }, []);

  // --- MQTT LOGIC ---
  useEffect(() => {
    const client = new Paho.Client(mqttConfig.broker, mqttConfig.port, CLIENT_ID);
    clientRef.current = client;

    const onConnect = () => {
      setConnectionStatus('Connected');
      console.log('Connected to MQTT!');
      client.subscribe(mqttConfig.topic);
    };

    const onConnectionLost = (responseObject: { errorCode: number; errorMessage: string }) => {
      if (responseObject.errorCode !== 0) {
        setConnectionStatus('Lost Connection');
        console.log('Connection Lost:', responseObject.errorMessage);
      }
    };

    const onMessageArrived = (message: { payloadString: string }) => {
      try {
        const jsonPayload = JSON.parse(message.payloadString);
        setPreviousData(sensorDataRef.current);
        setSensorData(jsonPayload);
        console.log('Data updated:', jsonPayload);
        
        // Save to Firebase
        saveToFirebase(jsonPayload);
      } catch (e) {
        console.log('Error parsing JSON:', e);
      }
    };

    // Set callbacks
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // Connect
    client.connect({
      onSuccess: onConnect,
      useSSL: mqttConfig.useSSL,
      onFailure: (e: unknown) => {
        setConnectionStatus('Failed to Connect');
        console.log(e);
      }
    });

    // Cleanup on unmount
    return () => {
      if (client.isConnected()) {
        client.disconnect();
      }
    };
  }, [mqttConfig]);

  // --- HELPER: GET STATUS COLOR ---
  const getStatusColor = () => {
    const s = sensorData.status || "";
    if (s.includes("WARN") || s.includes("ALERT")) return Colors.error;
    if (s.includes("Normal")) return Colors.success;
    return Colors.primary;
  };

  // --- HELPER: GET TREND ---
  const getTrend = (current: number, previous: number | undefined): 'up' | 'down' | 'stable' => {
    if (!previous) return 'stable';
    if (current > previous + 0.1) return 'up';
    if (current < previous - 0.1) return 'down';
    return 'stable';
  };

  // --- HELPER: FORMAT TIME ---
  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  const insets = useSafeAreaInsets();

  // --- RENDER COMPONENT ---
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="water" size={32} color={Colors.primary} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Tanzeem ul Tyari</Text>
            <Text style={styles.headerSubtitle}>Smart Water Monitoring</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: connectionStatus === 'Connected' ? Colors.success : Colors.error }]} />
            <Text style={styles.statusText}>MQTT: {connectionStatus}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: firebaseStatus.includes('Synced') ? Colors.success : Colors.warning }]} />
            <Text style={styles.statusText}>Firebase: {firebaseStatus}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* MAIN STATUS CARD */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor() }]}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.text} style={{ marginBottom: 8 }} />
          <Text style={styles.statusLabel}>SYSTEM STATUS</Text>
          <Text style={styles.statusValue}>{sensorData.status}</Text>
        </View>

        {/* SYNC INFO CARD */}
        <View style={styles.syncCard}>
          <View style={styles.syncInfo}>
            <Ionicons name="analytics" size={20} color={Colors.primary} />
            <Text style={styles.syncLabel}>Readings Saved</Text>
            <Text style={styles.syncValue}>{readingCount}</Text>
          </View>
          <View style={styles.syncDivider} />
          <View style={styles.syncInfo}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <Text style={styles.syncLabel}>Last Sync</Text>
            <Text style={styles.syncValue}>{formatTime(lastSyncTime)}</Text>
          </View>
        </View>

        {/* SENSOR GRID */}
        <View style={styles.gridContainer}>

          {/* Temperature */}
          <SensorCard
            label="Temperature"
            value={sensorData.temp}
            unit="°C"
            color={Colors.temp}
            icon={<MaterialCommunityIcons name="thermometer" size={24} color={Colors.temp} />}
            trend={getTrend(sensorData.temp, previousData?.temp)}
          />

          {/* Humidity */}
          <SensorCard
            label="Humidity"
            value={sensorData.humidity}
            unit="%"
            color={Colors.humidity}
            icon={<MaterialCommunityIcons name="water-percent" size={24} color={Colors.humidity} />}
            trend={getTrend(sensorData.humidity, previousData?.humidity)}
          />

          {/* pH Level */}
          <SensorCard
            label="pH Level"
            value={sensorData.ph}
            unit="pH"
            color={Colors.ph}
            icon={<MaterialCommunityIcons name="flask" size={24} color={Colors.ph} />}
            isAlert={sensorData.ph < 6 || sensorData.ph > 8.5}
            trend={getTrend(sensorData.ph, previousData?.ph)}
          />

          {/* Nitrate */}
          <SensorCard
            label="Nitrate"
            value={sensorData.nitrate}
            unit="ppm"
            color={Colors.nitrate}
            icon={<MaterialCommunityIcons name="molecule" size={24} color={Colors.nitrate} />}
            isAlert={sensorData.nitrate > 50}
            trend={getTrend(sensorData.nitrate, previousData?.nitrate)}
          />

          {/* Turbidity */}
          <SensorCard
            label="Turbidity"
            value={sensorData.turbidity}
            unit="%"
            color={Colors.turbidity}
            icon={<MaterialCommunityIcons name="blur" size={24} color={Colors.turbidity} />}
            trend={getTrend(sensorData.turbidity, previousData?.turbidity)}
          />

          {/* Water Level */}
          <SensorCard
            label="Water Level"
            value={sensorData.level}
            unit="%"
            color={Colors.level}
            icon={<Ionicons name="water" size={24} color={Colors.level} />}
            isAlert={sensorData.level < 20}
            trend={getTrend(sensorData.level, previousData?.level)}
          />

        </View>
      </ScrollView>
    </View>
  );
}

// --- REUSABLE SENSOR CARD COMPONENT ---
const SensorCard = ({ label, value, unit, color, icon, isAlert, trend }: SensorCardProps) => (
  <View style={[styles.card, isAlert ? styles.cardAlert : null, { borderLeftColor: color }]}>
    <View style={styles.cardHeader}>
      {icon}
      <Text style={[styles.cardLabel, { color }]}>{label}</Text>
    </View>
    <View style={styles.valueRow}>
      <Text style={styles.cardValue}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        <Text style={styles.cardUnit}>{unit}</Text>
      </Text>
      {trend && trend !== 'stable' && (
        <Ionicons 
          name={trend === 'up' ? 'arrow-up' : 'arrow-down'} 
          size={18} 
          color={trend === 'up' ? Colors.success : Colors.error} 
        />
      )}
    </View>
    {isAlert && (
      <View style={styles.alertBadge}>
        <Ionicons name="warning" size={12} color={Colors.error} />
        <Text style={styles.alertText}>WARNING</Text>
      </View>
    )}
  </View>
);

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 15,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  statusCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 1,
  },
  statusValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  syncCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  syncInfo: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  syncDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  syncLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  syncValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: Colors.surface,
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardAlert: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.text,
  },
  cardUnit: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  alertText: {
    color: Colors.error,
    fontSize: 10,
    fontWeight: 'bold',
  }
});
