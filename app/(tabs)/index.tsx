import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import Paho from 'paho-mqtt';
import { saveSensorReading, getLatestReadings, SensorReading } from '@/services/firestore';

// --- CONFIGURATION ---
// MUST match your Python code exactly
const MQTT_BROKER = 'broker.hivemq.com';
const MQTT_PORT = 8000; // WebSockets Port (Not 1883)
const MQTT_TOPIC = 'semester_project/water_quality';
const CLIENT_ID = 'ReactNative_App_' + Math.random().toString(16).substr(2, 8);

// Save to Firebase every N seconds (to avoid too many writes)
const FIREBASE_SAVE_INTERVAL = 30000; // 30 seconds

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
  isAlert?: boolean;
  trend?: 'up' | 'down' | 'stable';
}

export default function HomeScreen() {
  // --- STATE MANAGEMENT ---
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [firebaseStatus, setFirebaseStatus] = useState('Not synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [readingCount, setReadingCount] = useState(0);
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
  const lastSaveTime = useRef<number>(0);
  const sensorDataRef = useRef<SensorData>(sensorData);

  // Keep ref updated with latest sensor data
  useEffect(() => {
    sensorDataRef.current = sensorData;
  }, [sensorData]);

  // --- FIREBASE: Save data periodically ---
  const saveToFirebase = async (data: SensorData) => {
    const now = Date.now();
    if (now - lastSaveTime.current < FIREBASE_SAVE_INTERVAL) {
      return; // Skip if too soon
    }
    
    try {
      setFirebaseStatus('Syncing...');
      await saveSensorReading(data);
      lastSaveTime.current = now;
      setLastSyncTime(new Date());
      setFirebaseStatus('Synced ✓');
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
    const client = new Paho.Client(MQTT_BROKER, MQTT_PORT, CLIENT_ID);

    const onConnect = () => {
      setConnectionStatus('Connected');
      console.log('Connected to MQTT!');
      client.subscribe(MQTT_TOPIC);
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
        
        // Save to Firebase (with throttling)
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
      useSSL: false,
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
  }, []);

  // --- HELPER: GET STATUS COLOR ---
  const getStatusColor = () => {
    const s = sensorData.status || "";
    if (s.includes("WARN") || s.includes("ALERT")) return "#ff4444"; // Red
    if (s.includes("Normal")) return "#00C851"; // Green
    return "#33b5e5"; // Blue (Default)
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

  // --- RENDER COMPONENT ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1c2331" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💧 Smart Water Monitor</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: connectionStatus === 'Connected' ? '#00C851' : '#ff4444' }]} />
            <Text style={styles.statusText}>MQTT: {connectionStatus}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: firebaseStatus.includes('Synced') ? '#00C851' : '#ffbb33' }]} />
            <Text style={styles.statusText}>Firebase: {firebaseStatus}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* MAIN STATUS CARD */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusLabel}>SYSTEM STATUS</Text>
          <Text style={styles.statusValue}>{sensorData.status}</Text>
        </View>

        {/* SYNC INFO CARD */}
        <View style={styles.syncCard}>
          <View style={styles.syncInfo}>
            <Text style={styles.syncLabel}>📊 Readings Saved</Text>
            <Text style={styles.syncValue}>{readingCount}</Text>
          </View>
          <View style={styles.syncInfo}>
            <Text style={styles.syncLabel}>🕐 Last Sync</Text>
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
            color="#FF8800"
            trend={getTrend(sensorData.temp, previousData?.temp)}
          />

          {/* Humidity */}
          <SensorCard
            label="Humidity"
            value={sensorData.humidity}
            unit="%"
            color="#0099CC"
            trend={getTrend(sensorData.humidity, previousData?.humidity)}
          />

          {/* pH Level */}
          <SensorCard
            label="pH Level"
            value={sensorData.ph}
            unit="pH"
            color="#9933CC"
            isAlert={sensorData.ph < 6 || sensorData.ph > 8.5}
            trend={getTrend(sensorData.ph, previousData?.ph)}
          />

          {/* Nitrate */}
          <SensorCard
            label="Nitrate"
            value={sensorData.nitrate}
            unit="ppm"
            color="#CC0000"
            isAlert={sensorData.nitrate > 50}
            trend={getTrend(sensorData.nitrate, previousData?.nitrate)}
          />

          {/* Turbidity */}
          <SensorCard
            label="Turbidity"
            value={sensorData.turbidity}
            unit="%"
            color="#795548"
            trend={getTrend(sensorData.turbidity, previousData?.turbidity)}
          />

          {/* Water Level */}
          <SensorCard
            label="Water Level"
            value={sensorData.level}
            unit="%"
            color="#0d47a1"
            isAlert={sensorData.level < 20}
            trend={getTrend(sensorData.level, previousData?.level)}
          />

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- REUSABLE SENSOR CARD COMPONENT ---
const SensorCard = ({ label, value, unit, color, isAlert, trend }: SensorCardProps) => (
  <View style={[styles.card, isAlert ? styles.cardAlert : null]}>
    <Text style={[styles.cardLabel, { color: color }]}>{label}</Text>
    <View style={styles.valueRow}>
      <Text style={styles.cardValue}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        <Text style={styles.cardUnit}>{unit}</Text>
      </Text>
      {trend && trend !== 'stable' && (
        <Text style={[styles.trendIcon, { color: trend === 'up' ? '#00C851' : '#ff4444' }]}>
          {trend === 'up' ? '↑' : '↓'}
        </Text>
      )}
    </View>
    {isAlert && <Text style={styles.alertText}>⚠️ WARNING</Text>}
  </View>
);

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f9',
  },
  header: {
    padding: 20,
    paddingBottom: 15,
    backgroundColor: '#1c2331',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#aab',
    fontSize: 11,
  },
  subHeader: {
    color: '#aab',
    marginTop: 5,
    fontSize: 12,
  },
  scrollContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  statusCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
  },
  statusLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  syncCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-around',
    elevation: 2,
  },
  syncInfo: {
    alignItems: 'center',
  },
  syncLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  syncValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c2331',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 5,
    borderLeftColor: '#ddd',
  },
  cardAlert: {
    borderWidth: 2,
    borderColor: 'red',
    backgroundColor: '#fff0f0',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  cardUnit: {
    fontSize: 14,
    color: '#888',
    marginLeft: 2,
  },
  trendIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  alertText: {
    color: 'red',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 5,
  }
});
