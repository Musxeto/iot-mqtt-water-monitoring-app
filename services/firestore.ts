// Firestore service for Water Quality sensor data
import { db } from '@/config/firebase';
import {
  addDoc,
  collection,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where
} from 'firebase/firestore';

// Sensor data type
export interface SensorData {
  temp: number;
  humidity: number;
  ph: number;
  nitrate: number;
  turbidity: number;
  level: number;
  status: string;
}

// Sensor reading with timestamp (for Firestore)
export interface SensorReading extends SensorData {
  id?: string;
  timestamp: Timestamp | Date;
}

// Collection reference
const COLLECTION_NAME = 'sensor_readings';

/**
 * Save a sensor reading to Firestore
 */
export const saveSensorReading = async (data: SensorData): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      timestamp: Timestamp.now()
    });
    console.log('Sensor reading saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving sensor reading:', error);
    throw error;
  }
};

/**
 * Get the latest sensor readings
 */
export const getLatestReadings = async (count: number = 500): Promise<SensorReading[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('timestamp', 'desc'),
      limit(count)
    );
    
    const querySnapshot = await getDocs(q);
    const readings: SensorReading[] = [];
    
    querySnapshot.forEach((doc) => {
      readings.push({
        id: doc.id,
        ...doc.data()
      } as SensorReading);
    });
    
    return readings;
  } catch (error) {
    console.error('Error getting readings:', error);
    throw error;
  }
};

/**
 * Get the total count of all sensor readings
 */
export const getTotalReadingsCount = async (): Promise<number> => {
  try {
    const coll = collection(db, COLLECTION_NAME);
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting total count:', error);
    throw error;
  }
};

/**
 * Get all sensor readings (no limit - use with caution)
 */
export const getAllReadings = async (): Promise<SensorReading[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const readings: SensorReading[] = [];
    
    querySnapshot.forEach((doc) => {
      readings.push({
        id: doc.id,
        ...doc.data()
      } as SensorReading);
    });
    
    return readings;
  } catch (error) {
    console.error('Error getting all readings:', error);
    throw error;
  }
};

/**
 * Get readings from the last N hours
 */
export const getReadingsFromLastHours = async (hours: number): Promise<SensorReading[]> => {
  try {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('timestamp', '>=', Timestamp.fromDate(hoursAgo)),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const readings: SensorReading[] = [];
    
    querySnapshot.forEach((doc) => {
      readings.push({
        id: doc.id,
        ...doc.data()
      } as SensorReading);
    });
    
    return readings;
  } catch (error) {
    console.error('Error getting readings from last hours:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for sensor readings
 */
export const subscribeToReadings = (
  callback: (readings: SensorReading[]) => void,
  count: number = 20
) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('timestamp', 'desc'),
    limit(count)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const readings: SensorReading[] = [];
    querySnapshot.forEach((doc) => {
      readings.push({
        id: doc.id,
        ...doc.data()
      } as SensorReading);
    });
    callback(readings);
  });
};

/**
 * Get daily statistics (min, max, avg) for each sensor
 */
export const getDailyStats = async () => {
  const readings = await getReadingsFromLastHours(24);
  
  if (readings.length === 0) {
    return null;
  }
  
  const stats = {
    temp: { min: Infinity, max: -Infinity, avg: 0, total: 0 },
    humidity: { min: Infinity, max: -Infinity, avg: 0, total: 0 },
    ph: { min: Infinity, max: -Infinity, avg: 0, total: 0 },
    nitrate: { min: Infinity, max: -Infinity, avg: 0, total: 0 },
    turbidity: { min: Infinity, max: -Infinity, avg: 0, total: 0 },
    level: { min: Infinity, max: -Infinity, avg: 0, total: 0 },
  };
  
  readings.forEach((reading) => {
    (Object.keys(stats) as (keyof typeof stats)[]).forEach((key) => {
      const value = reading[key] as number;
      if (value < stats[key].min) stats[key].min = value;
      if (value > stats[key].max) stats[key].max = value;
      stats[key].total += value;
    });
  });
  
  // Calculate averages
  (Object.keys(stats) as (keyof typeof stats)[]).forEach((key) => {
    stats[key].avg = Math.round((stats[key].total / readings.length) * 100) / 100;
  });
  
  return {
    stats,
    readingCount: readings.length,
    period: '24h'
  };
};
