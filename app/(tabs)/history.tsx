import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getDailyStats, getLatestReadings, SensorReading } from '@/services/firestore';
import { Colors } from '@/constants/colors';
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
    temp: { label: 'Temperature', unit: '°C', color: Colors.temp, icon: 'thermometer' },
    humidity: { label: 'Humidity', unit: '%', color: Colors.humidity, icon: 'water-percent' },
    ph: { label: 'pH Level', unit: 'pH', color: Colors.ph, icon: 'flask' },
    nitrate: { label: 'Nitrate', unit: 'ppm', color: Colors.nitrate, icon: 'molecule' },
    turbidity: { label: 'Turbidity', unit: '%', color: Colors.turbidity, icon: 'blur' },
    level: { label: 'Water Level', unit: '%', color: Colors.level, icon: 'water' },
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
        <View style={styles.statsHeader}>
          <MaterialCommunityIcons name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={20} color={config.color} />
          <Text style={[styles.statsTitle, { color: config.color }]}>
            {config.label} Statistics (24h)
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="arrow-down" size={16} color={Colors.info} />
            <Text style={styles.statLabel}>Min</Text>
            <Text style={styles.statValue}>{sensorStats?.min?.toFixed(1) ?? '--'}{config.unit}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="analytics" size={16} color={Colors.primary} />
            <Text style={styles.statLabel}>Avg</Text>
            <Text style={[styles.statValue, styles.statValueHighlight]}>{sensorStats?.avg?.toFixed(1) ?? '--'}{config.unit}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="arrow-up" size={16} color={Colors.warning} />
            <Text style={styles.statLabel}>Max</Text>
            <Text style={styles.statValue}>{sensorStats?.max?.toFixed(1) ?? '--'}{config.unit}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="bar-chart" size={28} color={Colors.primary} />
          <Text style={styles.headerTitle}>Data History</Text>
        </View>
        <Text style={styles.subHeader}>
          {readings.length} readings stored in Firebase
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* SENSOR SELECTOR */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sensorSelector}>
          {Object.entries(sensorConfig).map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.sensorChip,
                selectedSensor === key && { backgroundColor: config.color, borderColor: config.color }
              ]}
              onPress={() => setSelectedSensor(key)}
            >
              <MaterialCommunityIcons 
                name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap} 
                size={16} 
                color={selectedSensor === key ? Colors.text : config.color} 
              />
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
          <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.filterLabel}>Filter:</Text>
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
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>
              Recent Readings ({filteredReadings.length})
            </Text>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : filteredReadings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={60} color={Colors.textMuted} />
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
                    <View style={styles.readingTimeContainer}>
                      <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.readingTime}>
                        {formatTimestamp(reading.timestamp)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: reading.status?.includes('Normal') 
                        ? 'rgba(34, 197, 94, 0.15)' 
                        : 'rgba(239, 68, 68, 0.15)' 
                    }]}>
                      <Ionicons 
                        name={reading.status?.includes('Normal') ? 'checkmark-circle' : 'warning'} 
                        size={12} 
                        color={reading.status?.includes('Normal') ? Colors.success : Colors.error} 
                      />
                      <Text style={[styles.statusBadgeText, {
                        color: reading.status?.includes('Normal') ? Colors.success : Colors.error
                      }]}>
                        {reading.status?.includes('Normal') ? 'OK' : 'Alert'}
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
    backgroundColor: Colors.background,
    paddingTop: 35,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subHeader: {
    color: Colors.textMuted,
    marginTop: 6,
    fontSize: 13,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  sensorSelector: {
    marginBottom: 16,
  },
  sensorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sensorChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sensorChipTextActive: {
    color: Colors.text,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statValueHighlight: {
    fontSize: 22,
    color: Colors.primary,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.text,
  },
  readingsContainer: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  loader: {
    marginTop: 50,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  readingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  readingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readingTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
    color: Colors.textMuted,
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
    color: Colors.textSecondary,
    marginBottom: 2,
  },
});
