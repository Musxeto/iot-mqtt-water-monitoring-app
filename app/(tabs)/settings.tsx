import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { DEFAULT_MQTT_CONFIG, loadMQTTConfig, MQTTConfig, resetMQTTConfig, saveMQTTConfig } from '@/config/mqtt';

export default function SettingsScreen() {
  const [config, setConfig] = useState<MQTTConfig>(DEFAULT_MQTT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await loadMQTTConfig();
        setConfig(savedConfig);
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Update config field
  const updateConfig = useCallback((field: keyof MQTTConfig, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Save configuration
  const handleSave = async () => {
    try {
      setSaving(true);
      await saveMQTTConfig(config);
      setHasChanges(false);
      Alert.alert(
        'Settings Saved',
        'MQTT configuration has been updated. Restart the app to apply changes.',
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset to default settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const defaultConfig = await resetMQTTConfig();
              setConfig(defaultConfig);
              setHasChanges(false);
              Alert.alert('Reset Complete', 'Settings have been reset to defaults.');
            } catch {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="settings-outline" size={28} color={Colors.primary} />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* MQTT Configuration Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="wifi" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>MQTT Broker Connection</Text>
            </View>

            {/* Broker Host */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Broker Host</Text>
              <TextInput
                style={styles.input}
                value={config.broker}
                onChangeText={(text) => updateConfig('broker', text)}
                placeholder="broker.hivemq.com"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Port */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WebSocket Port</Text>
              <TextInput
                style={styles.input}
                value={config.port.toString()}
                onChangeText={(text) => {
                  const port = parseInt(text) || 8000;
                  updateConfig('port', port);
                }}
                placeholder="8000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* Topic */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MQTT Topic</Text>
              <TextInput
                style={styles.input}
                value={config.topic}
                onChangeText={(text) => updateConfig('topic', text)}
                placeholder="semester_project/water_quality"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* SSL Toggle */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Use SSL/TLS</Text>
                <Text style={styles.switchDescription}>Enable secure connection (wss://)</Text>
              </View>
              <Switch
                value={config.useSSL}
                onValueChange={(value) => updateConfig('useSSL', value)}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                thumbColor={config.useSSL ? Colors.text : Colors.textMuted}
              />
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Connection Info</Text>
            </View>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Protocol</Text>
                <Text style={styles.infoValue}>{config.useSSL ? 'wss://' : 'ws://'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Full URL</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {config.useSSL ? 'wss' : 'ws'}://{config.broker}:{config.port}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Subscribing to</Text>
                <Text style={styles.infoValue}>{config.topic}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, !hasChanges && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.text} />
                  <Text style={styles.buttonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleReset}
            >
              <Ionicons name="refresh" size={20} color={Colors.warning} />
              <Text style={[styles.buttonText, { color: Colors.warning }]}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appName}>Tanzeem ul Tyari</Text>
            <Text style={styles.appVersion}>Smart Water Monitoring System</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 35,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    maxWidth: '60%',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  appVersion: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
