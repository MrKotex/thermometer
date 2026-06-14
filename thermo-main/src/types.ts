export interface TempReading {
  timestamp: string; // ISO string or simple time format
  temperature: number;
}

export type ThermometerStatus = 'online' | 'warning' | 'danger' | 'offline';

export interface Thermometer {
  id: string;
  name: string;
  location: string;
  model: string;
  status: ThermometerStatus;
  currentTemp: number;
  minTemp: number;
  maxTemp: number;
  averageTemp: number;
  highThreshold: number;
  lowThreshold: number;
  batteryAlert: boolean;
  signalStrength: number; // 1-4 bars
  unit: 'C' | 'F';
  lastUpdated: string;
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  thermometerId: string;
  thermometerName: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  message: string;
}
