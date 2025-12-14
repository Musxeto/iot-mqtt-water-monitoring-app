import AsyncStorage from '@react-native-async-storage/async-storage';

// Default MQTT Configuration
export const DEFAULT_MQTT_CONFIG = {
  broker: 'broker.hivemq.com',
  port: 8000,
  topic: 'semester_project/water_quality',
  useSSL: false,
};

export interface MQTTConfig {
  broker: string;
  port: number;
  topic: string;
  useSSL: boolean;
}

const STORAGE_KEY = '@mqtt_config';

// Save MQTT configuration
export const saveMQTTConfig = async (config: MQTTConfig): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving MQTT config:', error);
    throw error;
  }
};

// Load MQTT configuration
export const loadMQTTConfig = async (): Promise<MQTTConfig> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_MQTT_CONFIG;
  } catch (error) {
    console.error('Error loading MQTT config:', error);
    return DEFAULT_MQTT_CONFIG;
  }
};

// Reset to default configuration
export const resetMQTTConfig = async (): Promise<MQTTConfig> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MQTT_CONFIG));
    return DEFAULT_MQTT_CONFIG;
  } catch (error) {
    console.error('Error resetting MQTT config:', error);
    throw error;
  }
};
