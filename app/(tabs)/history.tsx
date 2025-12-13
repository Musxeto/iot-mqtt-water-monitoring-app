import { getDailyStats, getLatestReadings, SensorReading } from '@/services/firestore';
import { Timestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Time filter options
type TimeFilter = '1h' | '6h' | '24h' | 'all';

export default function HistoryScreen() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [stats, setStats] = useState<{
    stats: Record<string, { min: number; max: number; avg: number }>;
    readingCount: number;
    period: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [selectedSensor, setSelectedSensor] = useState<string>('temp');

  const sensorConfig = {
    temp: { label: 'Temperature', unit: '°C', color: '#FF8800' },
    humidity: { label: 'Humidity', unit: '%', color: '#0099CC' },
    ph: { label: 'pH Level', unit: 'pH', color: '#9933CC' },
    nitrate: { label: 'Nitrate', unit: 'ppm', color: '#CC0000' },
    turbidity: { label: 'Turbidity', unit: '%', color: '#795548' },
    level: { label: 'Water Level', unit: '%', color: '#0d47a1' },
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [readingsData, statsData] = await Promise.all([
        getLatestReadings(50),
        getDailyStats()
      ]);
      setReadings(readingsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter readings by time
  const getFilteredReadings = () => {
    if (timeFilter === 'all') return readings;
    
    const now = Date.now();
    const filterHours = timeFilter === '1h' ? 1 : timeFilter === '6h' ? 6 : 24;
    const cutoff = now - (filterHours * 60 * 60 * 1000);
    
    return readings.filter(reading => {
      const timestamp = reading.timestamp instanceof Timestamp 
        ? reading.timestamp.toMillis() 
        : new Date(reading.timestamp).getTime();
      return timestamp >= cutoff;
    });
  };

  const filteredReadings = getFilteredReadings();

  // Format timestamp
  const formatTimestamp = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render stats card
  const renderStatsCard = () => {
    if (!stats) return null;
    
    const sensorStats = stats.stats[selectedSensor];
    const config = sensorConfig[selectedSensor as keyof typeof sensorConfig];
    
    return (
      <View style={[styles.statsCard, { borderLeftColor: config.color }]}>
        <Text style={[styles.statsTitle, { color: config.color }]}>
          {config.label} Statistics (24h)
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Min</Text>
            <Text style={styles.statValue}>{sensorStats?.min?.toFixed(1) ?? '--'}{config.unit}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg</Text>
            <Text style={[styles.statValue, styles.statValueHighlight]}>{sensorStats?.avg?.toFixed(1) ?? '--'}{config.unit}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Max</Text>
            <Text style={styles.statValue}>{sensorStats?.max?.toFixed(1) ?? '--'}{config.unit}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1c2331" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Data History</Text>
        <Text style={styles.subHeader}>
          {readings.length} readings stored in Firebase
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* SENSOR SELECTOR */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sensorSelector}>
          {Object.entries(sensorConfig).map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.sensorChip,
                selectedSensor === key && { backgroundColor: config.color }
              ]}
              onPress={() => setSelectedSensor(key)}
            >
              <Text style={[
                styles.sensorChipText,
                selectedSensor === key && styles.sensorChipTextActive
              ]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* STATS CARD */}
        {renderStatsCard()}

        {/* TIME FILTER */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Show:</Text>
          {(['1h', '6h', '24h', 'all'] as TimeFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                timeFilter === filter && styles.filterChipActive
              ]}
              onPress={() => setTimeFilter(filter)}
            >
              <Text style={[
                styles.filterChipText,
                timeFilter === filter && styles.filterChipTextActive
              ]}>
                {filter === 'all' ? 'All' : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* READINGS LIST */}
        <View style={styles.readingsContainer}>
          <Text style={styles.sectionTitle}>
            Recent Readings ({filteredReadings.length})
          </Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#1c2331" style={styles.loader} />
          ) : filteredReadings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No readings found</Text>
              <Text style={styles.emptySubtext}>
                Start your Wokwi simulation to collect data
              </Text>
            </View>
          ) : (
            filteredReadings.map((reading, index) => {
              const config = sensorConfig[selectedSensor as keyof typeof sensorConfig];
              const value = reading[selectedSensor as keyof SensorReading] as number;
              
              return (
                <View key={reading.id || index} style={styles.readingCard}>
                  <View style={styles.readingHeader}>
                    <Text style={styles.readingTime}>
                      {formatTimestamp(reading.timestamp)}
                    </Text>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: reading.status?.includes('Normal') ? '#e8f5e9' : '#ffebee' 
                    }]}>
                      <Text style={[styles.statusBadgeText, {
                        color: reading.status?.includes('Normal') ? '#2e7d32' : '#c62828'
                      }]}>
                        {reading.status?.includes('Normal') ? '✓ OK' : '⚠ Alert'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.readingValues}>
                    <View style={[styles.mainValue, { borderLeftColor: config.color }]}>
                      <Text style={styles.mainValueLabel}>{config.label}</Text>
                      <Text style={[styles.mainValueText, { color: config.color }]}>
                        {value?.toFixed(1)}{config.unit}
                      </Text>
                    </View>
                    <View style={styles.otherValues}>
                      {Object.entries(sensorConfig)
                        .filter(([key]) => key !== selectedSensor)
                        .slice(0, 3)
                        .map(([key, cfg]) => (
                          <Text key={key} style={styles.otherValueText}>
                            {cfg.label}: {(reading[key as keyof SensorReading] as number)?.toFixed(1)}{cfg.unit}
                          </Text>
                        ))}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
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
  sensorSelector: {
    marginBottom: 15,
  },
  sensorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
    elevation: 2,
  },
  sensorChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  sensorChipTextActive: {
    color: '#fff',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    borderLeftWidth: 5,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statValueHighlight: {
    fontSize: 24,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#1c2331',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  readingsContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  loader: {
    marginTop: 50,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
  },
  readingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 1,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  readingTime: {
    fontSize: 12,
    color: '#888',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  readingValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainValue: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginRight: 20,
  },
  mainValueLabel: {
    fontSize: 11,
    color: '#888',
  },
  mainValueText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  otherValues: {
    flex: 1,
  },
  otherValueText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
});
