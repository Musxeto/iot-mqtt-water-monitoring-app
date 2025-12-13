import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';

export default function InfoScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1c2331" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ℹ️ System Information</Text>
        <Text style={styles.subHeader}>Water Quality Monitoring System</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.infoCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>About This App</ThemedText>
          <ThemedText style={styles.cardText}>
            This IoT Dashboard connects to a HiveMQ MQTT broker to receive real-time water quality
            data from your Wokwi simulation. The app monitors 6 key parameters for water safety.
          </ThemedText>
        </ThemedView>

        <Collapsible title="🌡️ Temperature">
          <ThemedText style={styles.collapsibleText}>
            Monitors water temperature in Celsius. Optimal range for most applications is 15-25°C.
            Extreme temperatures can affect water quality and aquatic life.
          </ThemedText>
        </Collapsible>

        <Collapsible title="💧 Humidity">
          <ThemedText style={styles.collapsibleText}>
            Measures ambient humidity percentage around the water source. High humidity can indicate
            evaporation issues or environmental concerns.
          </ThemedText>
        </Collapsible>

        <Collapsible title="⚗️ pH Level">
          <ThemedText style={styles.collapsibleText}>
            Measures water acidity/alkalinity on a scale of 0-14. Safe drinking water pH is 6.5-8.5.
            Values outside this range trigger a WARNING alert.
          </ThemedText>
        </Collapsible>

        <Collapsible title="🧪 Nitrate">
          <ThemedText style={styles.collapsibleText}>
            Measures nitrate concentration in parts per million (ppm). Safe limit is below 50 ppm.
            High nitrates indicate contamination from fertilizers or sewage.
          </ThemedText>
        </Collapsible>

        <Collapsible title="🌫️ Turbidity">
          <ThemedText style={styles.collapsibleText}>
            Measures water clarity as a percentage. Lower turbidity means clearer water.
            High turbidity can indicate sediment, algae, or other particles.
          </ThemedText>
        </Collapsible>

        <Collapsible title="📊 Water Level">
          <ThemedText style={styles.collapsibleText}>
            Monitors the water tank level as a percentage. Levels below 20% trigger a WARNING
            to indicate low water supply.
          </ThemedText>
        </Collapsible>

        <ThemedView style={styles.connectionCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>🔗 MQTT Connection</ThemedText>
          <ThemedText style={styles.connectionText}>Broker: broker.hivemq.com</ThemedText>
          <ThemedText style={styles.connectionText}>Port: 8000 (WebSockets)</ThemedText>
          <ThemedText style={styles.connectionText}>Topic: semester_project/water_quality</ThemedText>
        </ThemedView>

        <ThemedView style={styles.firebaseCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>🔥 Firebase Integration</ThemedText>
          <ThemedText style={styles.connectionText}>Project: weather-monitor-iot</ThemedText>
          <ThemedText style={styles.connectionText}>Database: Cloud Firestore</ThemedText>
          <ThemedText style={styles.connectionText}>Sync Interval: Every 30 seconds</ThemedText>
          <ThemedText style={styles.cardText}>
            {'\n'}All sensor data is automatically saved to Firebase Firestore for historical
            analysis. View the History tab to see past readings and statistics.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.troubleshootCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>🔧 Troubleshooting</ThemedText>
          <ThemedText style={styles.cardText}>
            • &quot;Connected&quot; but no data? Ensure your Wokwi simulation is running.{'\n'}
            • &quot;Failed to Connect&quot;? Try using mobile data if on restricted WiFi.{'\n'}
            • Values not changing? Rotate the potentiometers in Wokwi.{'\n'}
            • Firebase not syncing? Check your internet connection.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f9',
  },
  header: {
    padding: 20,
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
  subHeader: {
    color: '#aab',
    marginTop: 5,
    fontSize: 12,
  },
  scrollContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
  },
  connectionCard: {
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 15,
    marginTop: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#1976d2',
  },
  firebaseCard: {
    backgroundColor: '#fff8e1',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#ff9800',
  },
  troubleshootCard: {
    backgroundColor: '#fff3e0',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#ff9800',
  },
  cardTitle: {
    marginBottom: 10,
    color: '#1c2331',
  },
  cardText: {
    color: '#555',
    lineHeight: 22,
  },
  connectionText: {
    color: '#1976d2',
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  collapsibleText: {
    color: '#555',
    lineHeight: 22,
  },
});
