import { Colors } from '@/constants/colors';
import { getAllReadings, SensorReading } from '@/services/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;

// Time filter options
type TimeFilter = '1h' | '6h' | '24h' | '7d' | 'all';

export default function AnalyticsScreen() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
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
      const readingsData = await getAllReadings();
      setReadings(readingsData);
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
  const getFilteredReadings = useCallback(() => {
    if (timeFilter === 'all') return readings;
    
    const now = Date.now();
    let filterMs: number;
    
    switch (timeFilter) {
      case '1h': filterMs = 1 * 60 * 60 * 1000; break;
      case '6h': filterMs = 6 * 60 * 60 * 1000; break;
      case '24h': filterMs = 24 * 60 * 60 * 1000; break;
      case '7d': filterMs = 7 * 24 * 60 * 60 * 1000; break;
      default: return readings;
    }
    
    const cutoff = now - filterMs;
    
    return readings.filter(reading => {
      const timestamp = reading.timestamp instanceof Timestamp 
        ? reading.timestamp.toMillis() 
        : new Date(reading.timestamp).getTime();
      return timestamp >= cutoff;
    });
  }, [readings, timeFilter]);

  const filteredReadings = getFilteredReadings();

  // Prepare chart data for selected sensor
  const getChartData = useCallback(() => {
    if (filteredReadings.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [0] }]
      };
    }

    // Reverse to show chronological order and limit points for performance
    const sorted = [...filteredReadings].reverse();
    const maxPoints = 30;
    const step = Math.max(1, Math.floor(sorted.length / maxPoints));
    const sampled = sorted.filter((_, i) => i % step === 0);

    const labels = sampled.map((r, index) => {
      if (index % Math.ceil(sampled.length / 5) === 0) {
        const date = r.timestamp instanceof Timestamp 
          ? r.timestamp.toDate() 
          : new Date(r.timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      return '';
    });

    const data = sampled.map(r => {
      const value = r[selectedSensor as keyof SensorReading] as number;
      return typeof value === 'number' ? value : 0;
    });

    return {
      labels,
      datasets: [{ data: data.length > 0 ? data : [0] }]
    };
  }, [filteredReadings, selectedSensor]);

  const chartData = getChartData();
  const config = sensorConfig[selectedSensor as keyof typeof sensorConfig];

  // Calculate stats for filtered readings
  const getFilteredStats = useCallback(() => {
    if (filteredReadings.length === 0) return null;
    
    const values = filteredReadings.map(r => r[selectedSensor as keyof SensorReading] as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    return { min, max, avg };
  }, [filteredReadings, selectedSensor]);

  const filteredStats = getFilteredStats();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="analytics" size={28} color={Colors.primary} />
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <Text style={styles.subHeader}>
          {readings.length} total readings • {filteredReadings.length} in view
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
          {Object.entries(sensorConfig).map(([key, cfg]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.sensorChip,
                selectedSensor === key && { backgroundColor: cfg.color, borderColor: cfg.color }
              ]}
              onPress={() => setSelectedSensor(key)}
            >
              <MaterialCommunityIcons 
                name={cfg.icon as keyof typeof MaterialCommunityIcons.glyphMap} 
                size={16} 
                color={selectedSensor === key ? Colors.text : cfg.color} 
              />
              <Text style={[
                styles.sensorChipText,
                selectedSensor === key && styles.sensorChipTextActive
              ]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* TIME FILTER */}
        <View style={styles.filterRow}>
          <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.filterLabel}>Period:</Text>
          {(['1h', '6h', '24h', '7d', 'all'] as TimeFilter[]).map((filter) => (
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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : filteredReadings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={60} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No data available</Text>
            <Text style={styles.emptySubtext}>
              Start your IoT simulation to collect data
            </Text>
          </View>
        ) : (
          <>
            {/* STATS CARDS */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderTopColor: Colors.info }]}>
                <Ionicons name="arrow-down" size={20} color={Colors.info} />
                <Text style={styles.statLabel}>Min</Text>
                <Text style={styles.statValue}>
                  {filteredStats?.min.toFixed(1)}{config.unit}
                </Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: config.color }]}>
                <Ionicons name="analytics" size={20} color={config.color} />
                <Text style={styles.statLabel}>Average</Text>
                <Text style={[styles.statValue, { color: config.color }]}>
                  {filteredStats?.avg.toFixed(1)}{config.unit}
                </Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: Colors.warning }]}>
                <Ionicons name="arrow-up" size={20} color={Colors.warning} />
                <Text style={styles.statLabel}>Max</Text>
                <Text style={styles.statValue}>
                  {filteredStats?.max.toFixed(1)}{config.unit}
                </Text>
              </View>
            </View>

            {/* MAIN CHART */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <MaterialCommunityIcons 
                  name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap} 
                  size={20} 
                  color={config.color} 
                />
                <Text style={[styles.chartTitle, { color: config.color }]}>
                  {config.label} Trend
                </Text>
              </View>
              
              {chartData.datasets[0].data.length > 1 ? (
                <LineChart
                  data={chartData}
                  width={screenWidth - 48}
                  height={220}
                  chartConfig={{
                    backgroundColor: Colors.surface,
                    backgroundGradientFrom: Colors.surface,
                    backgroundGradientTo: Colors.surface,
                    decimalPlaces: 1,
                    color: (opacity = 1) => config.color + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                    labelColor: () => Colors.textMuted,
                    style: { borderRadius: 16 },
                    propsForDots: {
                      r: '3',
                      strokeWidth: '1',
                      stroke: config.color
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: Colors.border,
                      strokeWidth: 0.5
                    }
                  }}
                  bezier
                  style={styles.chart}
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  fromZero={false}
                />
              ) : (
                <View style={styles.noChartData}>
                  <Text style={styles.noChartText}>Not enough data points for chart</Text>
                </View>
              )}
            </View>

            {/* ALL SENSORS OVERVIEW */}
            <View style={styles.overviewSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="grid" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>All Sensors Overview</Text>
              </View>
              
              <View style={styles.overviewGrid}>
                {Object.entries(sensorConfig).map(([key, cfg]) => {
                  const lastReading = filteredReadings[0];
                  const value = lastReading?.[key as keyof SensorReading] as number;
                  
                  return (
                    <View key={key} style={[styles.overviewCard, { borderLeftColor: cfg.color }]}>
                      <View style={styles.overviewHeader}>
                        <MaterialCommunityIcons 
                          name={cfg.icon as keyof typeof MaterialCommunityIcons.glyphMap} 
                          size={18} 
                          color={cfg.color} 
                        />
                        <Text style={styles.overviewLabel}>{cfg.label}</Text>
                      </View>
                      <Text style={[styles.overviewValue, { color: cfg.color }]}>
                        {value?.toFixed(1) ?? '--'}{cfg.unit}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* RECENT READINGS */}
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>
                  Recent Readings ({Math.min(filteredReadings.length, 10)})
                </Text>
              </View>
              
              {filteredReadings.slice(0, 10).map((reading, index) => {
                const value = reading[selectedSensor as keyof SensorReading] as number;
                const timestamp = reading.timestamp instanceof Timestamp 
                  ? reading.timestamp.toDate() 
                  : new Date(reading.timestamp);
                
                return (
                  <View key={reading.id || index} style={styles.readingRow}>
                    <View style={styles.readingTime}>
                      <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.readingTimeText}>
                        {timestamp.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <Text style={[styles.readingValue, { color: config.color }]}>
                      {value?.toFixed(1)}{config.unit}
                    </Text>
                    <View style={[styles.statusDot, { 
                      backgroundColor: reading.status?.includes('Normal') ? Colors.success : Colors.error 
                    }]} />
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: Colors.textMuted,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 3,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8,
  },
  noChartData: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChartText: {
    color: Colors.textMuted,
  },
  overviewSection: {
    marginBottom: 16,
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
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  overviewCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  overviewLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  recentSection: {
    marginTop: 8,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readingTime: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readingTimeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  readingValue: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
