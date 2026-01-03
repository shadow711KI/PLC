// server/types.ts
// Type definitions for PLC Smart Home backend

export type MotorNr = number & { __brand: 'MotorNr' };
export type SPSName = 'SPS1' | 'SPS2' | 'SPS3';

export interface SPSConfig {
  readonly host: string;
  readonly port: number;
  readonly motors: Record<string, MotorInfo>;
}

export interface MotorInfo {
  nr: MotorNr;
  displayName: string;
  technicalName: string;
  name?: string; // legacy compatibility
  sps?: string;  // legacy compatibility
}

export interface TimePoint {
  readonly weekdayMask: number;
  readonly hour: number;
  readonly minute: number;
  readonly action: 'hoch' | 'runter';
}

export interface StatusResponse {
  readonly status: 'hoch' | 'runter' | 'stop' | 'unbekannt';
  readonly automatik?: boolean;
}

export interface AppConfig {
  port: number;
  corsOrigins: string[];
  spsMapping: Record<SPSName, SPSConfig>;
}
