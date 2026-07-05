/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QKDSample {
  sampleId: number;
  channelLoss: number;         // alias of lossDb
  noise: number;               // alias of noiseProb
  detectorEfficiency: number;  // alias of efficiency
  darkCounts: number;          // alias of darkCount
  misalignment: number;        // alias of polarizationDrift
  actualQber: number;
  predictedQber?: number;
  
  // Real-world research dataset expanded parameters
  experimentId?: string;
  timestamp?: string;
  channelType?: 'Fiber' | 'Free Space';
  transmissionDistanceKm?: number;
  polarizationDrift?: number;
  detectorDeadTimeNs?: number;
  detectorTemperatureC?: number;
  backgroundLightLevel?: number;
  synchronizationError?: number;
  timingJitterNs?: number;
  photonArrivalRate?: number;
  siftedKeyLength?: number;
  secretKeyRate?: number;
  bitErrorCount?: number;
  totalDetectedBits?: number;
  secureKeyGenerated?: 'Yes' | 'No';
  weatherCondition?: string;
  humidity?: number;
  atmosphericVisibility?: number;
  QBER_mean?: number;
  QBER_std?: number;
}

export interface PhotonState {
  index: number;
  aliceBit: number;
  aliceBasis: '+' | 'x';
  aliceAngle: number;
  isLost: boolean;
  isNoisy: boolean;
  isDarkCount: boolean;
  bobBasis: '+' | 'x';
  bobMeasuredBit: number | null;
  basisMatched: boolean;
  isSifted: boolean;
  hasError: boolean;
}

export interface BB84SimulationResult {
  totalBitsSent: number;
  photonsLost: number;
  darkCounts: number;
  successfulDetections: number;
  siftedKeyLength: number;
  finalKeyLength: number;
  qber: number;
  transmissionSuccessRate: number;
  isSecure: boolean;
  systemHealth: number;
  photons: PhotonState[];
  aliceBitsString: string;
  aliceBasesString: string;
  bobBasesString: string;
  bobMeasurementsString: string;
  matchingBasesString: string;
  siftedKeyString: string;
  finalKeyString: string;
}

export interface TrainingMetrics {
  algorithm: string;
  trainingAccuracy: number;
  testingAccuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocCurve: { fpr: number; tpr: number }[];
  featureImportance: { feature: string; importance: number }[];
  confusionMatrix: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  trainingLoss: { tree: number; error: number }[];
}

export type ActiveTab = 
  | 'landing'
  | 'simulation'
  | 'visualization'
  | 'prediction'
  | 'dataset'
  | 'analytics'
  | 'model-details'
  | 'results'
  | 'settings'
  | 'multi-sender'
  | 'temporal-analysis';
