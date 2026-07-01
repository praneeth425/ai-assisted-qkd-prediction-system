/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * High-fidelity, self-contained Random Forest Regressor and Dataset Seeder in TypeScript.
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

interface TreeNode {
  feature?: number;    // index of feature to split on
  threshold?: number;  // value of feature to split on
  left?: TreeNode;
  right?: TreeNode;
  value?: number;      // leaf prediction value (mean QBER)
}

export interface TrainingMetrics {
  algorithm: string;
  trainingAccuracy: number; // R² Score (0-100%)
  testingAccuracy: number;  // R² Score (0-100%)
  precision: number;        // 0-100% (Safety threshold 11% QBER)
  recall: number;           // 0-100%
  f1Score: number;          // 0-100%
  rocCurve: { fpr: number; tpr: number }[];
  featureImportance: { feature: string; importance: number }[];
  confusionMatrix: {
    tp: number; // True Positive (Unsafe predicted Unsafe)
    fp: number; // False Positive (Safe predicted Unsafe)
    fn: number; // False Negative (Unsafe predicted Safe)
    tn: number; // True Negative (Safe predicted Safe)
  };
  trainingLoss: { tree: number; error: number }[];
}

export class DecisionTreeRegressor {
  private root: TreeNode | null = null;
  private maxDepth: number;
  private minSamplesSplit: number;

  constructor(maxDepth: number = 6, minSamplesSplit: number = 2) {
    maxDepth = maxDepth;
    minSamplesSplit = minSamplesSplit;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  public fit(X: number[][], y: number[]) {
    this.root = this.buildTree(X, y, 0);
  }

  private buildTree(X: number[][], y: number[], depth: number): TreeNode {
    const numSamples = X.length;
    const numFeatures = X[0]?.length || 0;

    // Base cases
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || this.allSame(y)) {
      return { value: this.mean(y) };
    }

    let bestFeature = -1;
    let bestThreshold = -1;
    let bestSse = Infinity;
    let bestLeftIdx: number[] = [];
    let bestRightIdx: number[] = [];

    // Find the best split
    for (let f = 0; f < numFeatures; f++) {
      const values = X.map(row => row[f]);
      const thresholds = Array.from(new Set(values)).sort((a, b) => a - b);

      for (let i = 0; i < thresholds.length - 1; i++) {
        const threshold = (thresholds[i] + thresholds[i + 1]) / 2;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let j = 0; j < numSamples; j++) {
          if (X[j][f] <= threshold) {
            leftIdx.push(j);
          } else {
            rightIdx.push(j);
          }
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftY = leftIdx.map(idx => y[idx]);
        const rightY = rightIdx.map(idx => y[idx]);

        const sse = this.calculateSSE(leftY) + this.calculateSSE(rightY);
        if (sse < bestSse) {
          bestSse = sse;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeftIdx = leftIdx;
          bestRightIdx = rightIdx;
        }
      }
    }

    // If no good split found, return leaf
    if (bestFeature === -1) {
      return { value: this.mean(y) };
    }

    // Build subtrees
    const leftX = bestLeftIdx.map(idx => X[idx]);
    const leftY = bestLeftIdx.map(idx => y[idx]);
    const rightX = bestRightIdx.map(idx => X[idx]);
    const rightY = bestRightIdx.map(idx => y[idx]);

    return {
      feature: bestFeature,
      threshold: bestThreshold,
      left: this.buildTree(leftX, leftY, depth + 1),
      right: this.buildTree(rightX, rightY, depth + 1)
    };
  }

  public predictRow(row: number[]): number {
    let node = this.root;
    while (node && node.value === undefined) {
      if (row[node.feature!] <= node.threshold!) {
        node = node.left!;
      } else {
        node = node.right!;
      }
    }
    return node ? node.value! : 0;
  }

  public computeFeatureVarianceReduction(numFeatures: number): number[] {
    const importances = new Array(numFeatures).fill(0);
    const traverse = (node: TreeNode | null) => {
      if (!node || node.value !== undefined) return;
      importances[node.feature!] += 1; // Simplify to split occurrences for robust fast metric
      traverse(node.left);
      traverse(node.right);
    };
    traverse(this.root);
    return importances;
  }

  private calculateSSE(y: number[]): number {
    const m = this.mean(y);
    return y.reduce((sum, val) => sum + Math.pow(val - m, 2), 0);
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private allSame(arr: number[]): boolean {
    if (arr.length <= 1) return true;
    const first = arr[0];
    return arr.every(val => val === first);
  }
}

export class RandomForestRegressor {
  private trees: DecisionTreeRegressor[] = [];
  private numTrees: number;
  private maxDepth: number;
  private featureImportances: number[] = [];

  constructor(numTrees: number = 12, maxDepth: number = 5) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
  }

  public fit(X: number[][], y: number[], onTreeTrained?: (treeIdx: number, mse: number) => void) {
    this.trees = [];
    const numSamples = X.length;
    const numFeatures = X[0]?.length || 0;
    this.featureImportances = new Array(numFeatures).fill(0);

    for (let t = 0; t < this.numTrees; t++) {
      const tree = new DecisionTreeRegressor(this.maxDepth);
      
      // Bootstrap sampling (sampling with replacement)
      const bootX: number[][] = [];
      const bootY: number[] = [];
      for (let i = 0; i < numSamples; i++) {
        const randIdx = Math.floor(Math.random() * numSamples);
        bootX.push(X[randIdx]);
        bootY.push(y[randIdx]);
      }

      tree.fit(bootX, bootY);
      this.trees.push(tree);

      // Evaluate tree on training data to report MSE
      const pred = bootX.map(row => tree.predictRow(row));
      const treeMse = bootY.reduce((sum, val, idx) => sum + Math.pow(val - pred[idx], 2), 0) / numSamples;
      if (onTreeTrained) {
        onTreeTrained(t, treeMse);
      }

      // Aggregate feature split occurrences
      const importances = tree.computeFeatureVarianceReduction(numFeatures);
      for (let f = 0; f < numFeatures; f++) {
        this.featureImportances[f] += importances[f];
      }
    }

    // Normalize feature importances
    const totalImportance = this.featureImportances.reduce((a, b) => a + b, 0);
    if (totalImportance > 0) {
      this.featureImportances = this.featureImportances.map(val => val / totalImportance);
    } else {
      this.featureImportances = new Array(numFeatures).fill(1 / numFeatures);
    }
  }

  public predict(X: number[][]): number[] {
    return X.map(row => {
      const treePreds = this.trees.map(tree => tree.predictRow(row));
      return treePreds.reduce((sum, val) => sum + val, 0) / this.trees.length;
    });
  }

  public getFeatureImportances(): number[] {
    return this.featureImportances;
  }
}

/**
 * Seeding an advanced QKD database generator with physically sound QBER mathematical models.
 * Features:
 * 1. channelLoss (dB) -> increases photon loss, Bob receives less signal, dark count rate contribution increases
 * 2. noise (channel noise) -> directly adds polarization flips
 * 3. detectorEfficiency -> lower efficiency decreases signal detection, amplifying dark count ratio
 * 4. darkCounts (rate) -> adds random counts that destroy polarization information (results in random 50% QBER on dark count events)
 * 5. misalignment (degrees) -> direct geometrical polarization basis mismatch error = sin²(theta)
 */
export function calculatePhysicalQber(
  lossDb: number,
  noise: number,
  efficiency: number,
  darkCountRate: number,
  misalignmentDeg: number
): number {
  // 1. Direct misalignment error
  const thetaRad = (misalignmentDeg * Math.PI) / 180;
  const eAlignment = Math.pow(Math.sin(thetaRad), 2);

  // 2. Compute channel transmission
  const tChannel = Math.pow(10, -lossDb / 10);
  
  // 3. Average detection probability per pulse
  // Bob receives signal photons with probability:
  const pSignal = tChannel * efficiency;

  // Bob's overall click probability is signal + dark counts (simplified)
  const pClick = pSignal + darkCountRate;

  // If we have close to zero clicks, dark count dominates
  let eDarkCount = 0;
  if (pClick > 0) {
    // Dark counts are completely random (50% error)
    eDarkCount = (0.5 * darkCountRate) / pClick;
  }

  // 4. Polarization channel noise
  // noise probability acts as an additional depolarizing coefficient
  const eNoise = noise * 0.5;

  // 5. Aggregate overall QBER, bound between 0 and 0.5
  // Realistic combination of errors
  let qber = eAlignment + eNoise + eDarkCount;

  // Ensure physically bounding
  if (qber > 0.5) qber = 0.5;
  if (qber < 0) qber = 0;

  // Add small measurement uncertainty (gaussian-like simulation noise)
  const randomFluctuation = (Math.random() - 0.5) * 0.005;
  qber = Math.max(0, Math.min(0.5, qber + randomFluctuation));

  return qber;
}

export function generateSeededDataset(count: number = 200): QKDSample[] {
  const dataset: QKDSample[] = [];
  const baseTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  for (let i = 1; i <= count; i++) {
    // 1. Channel Type (60% Fiber, 40% Free Space)
    const isFiber = Math.random() < 0.6;
    const channelType: 'Fiber' | 'Free Space' = isFiber ? 'Fiber' : 'Free Space';
    
    // 2. Weather conditions
    let weatherCondition = 'N/A';
    let atmosphericVisibility = 999.0;
    let humidity = parseFloat((35 + Math.random() * 20).toFixed(2)); // indoor control default
    
    if (!isFiber) {
      const weatherProb = Math.random();
      if (weatherProb < 0.45) {
        weatherCondition = 'Sunny';
        atmosphericVisibility = parseFloat((15 + Math.random() * 15).toFixed(2));
        humidity = parseFloat((15 + Math.random() * 30).toFixed(2));
      } else if (weatherProb < 0.70) {
        weatherCondition = 'Cloudy';
        atmosphericVisibility = parseFloat((8 + Math.random() * 7).toFixed(2));
        humidity = parseFloat((50 + Math.random() * 25).toFixed(2));
      } else if (weatherProb < 0.85) {
        weatherCondition = 'Rainy';
        atmosphericVisibility = parseFloat((2 + Math.random() * 6).toFixed(2));
        humidity = parseFloat((80 + Math.random() * 18).toFixed(2));
      } else if (weatherProb < 0.95) {
        weatherCondition = 'Haze';
        atmosphericVisibility = parseFloat((1 + Math.random() * 3).toFixed(2));
        humidity = parseFloat((60 + Math.random() * 25).toFixed(2));
      } else {
        weatherCondition = 'Foggy';
        atmosphericVisibility = parseFloat((0.1 + Math.random() * 0.9).toFixed(2));
        humidity = parseFloat((90 + Math.random() * 10).toFixed(2));
      }
    }

    // 3. Distance (km)
    const transmissionDistanceKm = isFiber
      ? parseFloat((2 + Math.random() * 118).toFixed(3))
      : parseFloat((0.5 + Math.random() * 17.5).toFixed(3));

    // 4. Channel Loss (dB)
    let lossDb = 0.1;
    if (isFiber) {
      const attenuationCoef = 0.18 + Math.random() * 0.04; // standard ~0.2 dB/km at 1550 nm
      const couplingLoss = 0.5 + Math.random() * 0.6;
      lossDb = attenuationCoef * transmissionDistanceKm + couplingLoss;
    } else {
      const geomLoss = 12.0 + 4.5 * Math.log(transmissionDistanceKm + 0.1);
      const qScatter = atmosphericVisibility > 50 ? 1.6 : (atmosphericVisibility >= 6 && atmosphericVisibility <= 50 ? 1.3 : (atmosphericVisibility >= 1 && atmosphericVisibility < 6 ? 0.585 * Math.pow(atmosphericVisibility, 1/3) : (atmosphericVisibility >= 0.5 && atmosphericVisibility < 1 ? atmosphericVisibility : 0.05)));
      const extinctionCoef = (17.0 / Math.max(atmosphericVisibility, 0.05)) * Math.pow(1550.0 / 550.0, -qScatter);
      const atmosphericLoss = extinctionCoef * transmissionDistanceKm;
      lossDb = geomLoss + atmosphericLoss;
    }
    lossDb = parseFloat(Math.max(0.1, lossDb).toFixed(4));

    // 5. Polarization Drift (degrees)
    let polarizationDrift = 0;
    if (isFiber) {
      polarizationDrift = Math.abs(1.5 + 0.08 * transmissionDistanceKm + (Math.random() - 0.5) * 1.0);
    } else {
      polarizationDrift = Math.abs(3.0 + 0.6 * (30.0 - Math.min(atmosphericVisibility, 30.0)) + (Math.random() - 0.5) * 2.0);
    }
    polarizationDrift = parseFloat(Math.min(45.0, polarizationDrift).toFixed(3));

    // 6. Detector temperature and dark counts
    const detectorTemperatureC = parseFloat((-55.0 + Math.random() * 20.0).toFixed(2));
    const darkCountBase = 1e-6 * Math.pow(2.0, (detectorTemperatureC + 50.0) / 7.0);
    const darkCount = parseFloat((darkCountBase * (0.85 + Math.random() * 0.3)).toFixed(7));

    // 7. Efficiency
    const isSnspd = Math.random() < 0.15;
    const efficiency = parseFloat((isSnspd ? (0.7 + Math.random() * 0.18) : (0.15 + Math.random() * 0.15)).toFixed(4));

    // 8. Background light
    let backgroundLightLevel = 1e-10;
    if (!isFiber) {
      if (weatherCondition === 'Sunny') {
        backgroundLightLevel = Math.pow(10, -4.5 + Math.random() * 2);
      } else {
        backgroundLightLevel = Math.pow(10, -8.0 + Math.random() * 3);
      }
    }
    backgroundLightLevel = parseFloat(Math.min(1e-2, backgroundLightLevel).toFixed(7));

    // 9. Timing jitter, dead time, sync error
    const timingJitterNs = parseFloat((0.10 + Math.random() * 0.05).toFixed(4));
    const detectorDeadTimeNs = parseFloat((20 + Math.random() * 80).toFixed(2));
    const synchronizationError = parseFloat((0.4 * timingJitterNs + Math.random() * 0.05).toFixed(4));

    // 10. Photon intensity (mu) and arrival rate
    const mu = parseFloat((0.3 + Math.random() * 0.3).toFixed(3));
    const tChannel = Math.pow(10, -lossDb / 10.0);
    const photonArrivalRate = parseFloat((mu * tChannel).toFixed(6));

    // 11. Clicks & Saturation
    const pSigRaw = 1.0 - Math.exp(-photonArrivalRate * efficiency);
    const pClickRaw = pSigRaw + darkCount + (backgroundLightLevel * efficiency);
    const deadTimeFraction = pClickRaw * 1e7 * (detectorDeadTimeNs * 1e-9); // f_pulse = 10 MHz
    const saturationFactor = 1.0 / (1.0 + deadTimeFraction);

    const pClickEff = pClickRaw * saturationFactor;
    const pSigEff = pSigRaw * saturationFactor;

    // Sent bits per epoch (0.1 seconds, 10 MHz repetition rate = 1,000,000 pulses)
    const nSent = 1000000;
    const expectedClicks = nSent * pClickEff;
    const totalDetectedBits = Math.max(0, Math.round(expectedClicks + (Math.random() - 0.5) * Math.sqrt(expectedClicks)));
    const siftedKeyLength = Math.max(0, Math.round(totalDetectedBits * 0.5 + (Math.random() - 0.5) * Math.sqrt(totalDetectedBits * 0.25)));

    // 12. QBER
    const noiseProb = parseFloat(Math.max(0, Math.min(0.2, (Math.random() < 0.05 ? 0.05 + Math.random() * 0.15 : Math.random() * 0.03))).toFixed(5));
    const eAlign = Math.sin((polarizationDrift * Math.PI) / 180) ** 2;
    const eChannelNoise = noiseProb * 0.5;
    const eSig = eAlign + eChannelNoise - 2.0 * eAlign * eChannelNoise;

    let QBER_mean = pClickEff > 0
      ? (pSigEff * eSig + 0.5 * (darkCount + (backgroundLightLevel * efficiency)) * saturationFactor) / pClickEff
      : 0.5;
    QBER_mean = parseFloat(Math.max(0.0, Math.min(0.50, QBER_mean)).toFixed(5));

    const QBER_std = parseFloat((siftedKeyLength > 0 ? Math.sqrt(QBER_mean * (1.0 - QBER_mean) / siftedKeyLength) : 0).toFixed(6));

    // Bit errors
    const bitErrorCount = Math.max(0, Math.round(siftedKeyLength * QBER_mean + (Math.random() - 0.5) * Math.sqrt(siftedKeyLength * QBER_mean * (1 - QBER_mean))));
    const actualQber = parseFloat((siftedKeyLength > 0 ? bitErrorCount / siftedKeyLength : 0.5).toFixed(5));

    // Secret key rate
    const h2Qber = -QBER_mean * Math.log2(Math.max(1e-15, QBER_mean)) - (1 - QBER_mean) * Math.log2(Math.max(1e-15, 1 - QBER_mean));
    const secretFraction = 1.0 - 1.2 * h2Qber - h2Qber;
    const secretKeyRate = parseFloat((QBER_mean < 0.11 && secretFraction > 0 ? (siftedKeyLength * secretFraction) / 0.1 : 0.0).toFixed(2)); // epoch = 0.1s
    const secureKeyGenerated: 'Yes' | 'No' = secretKeyRate > 0 ? 'Yes' : 'No';

    // Metadata
    const timestamp = new Date(baseTime.getTime() + i * 1.5 * 60 * 1000).toISOString();
    const experimentId = `EXP-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

    dataset.push({
      sampleId: i,
      channelLoss: lossDb,
      noise: noiseProb,
      detectorEfficiency: efficiency,
      darkCounts: darkCount,
      misalignment: polarizationDrift,
      actualQber,
      
      experimentId,
      timestamp,
      channelType,
      transmissionDistanceKm,
      polarizationDrift,
      detectorDeadTimeNs,
      detectorTemperatureC,
      backgroundLightLevel,
      synchronizationError,
      timingJitterNs,
      photonArrivalRate,
      siftedKeyLength,
      secretKeyRate,
      bitErrorCount,
      totalDetectedBits,
      secureKeyGenerated,
      weatherCondition,
      humidity,
      atmosphericVisibility,
      QBER_mean,
      QBER_std
    });
  }

  return dataset;
}

export function computeMlMetrics(dataset: QKDSample[], forest: RandomForestRegressor): TrainingMetrics {
  // Train-test split (80-20)
  const shuffled = [...dataset].sort(() => Math.random() - 0.5);
  
  // Cap the size of train/test subsets to prevent heavy CPU and memory lockups on large datasets
  const maxTrainSize = 1500;
  const maxTestSize = 500;
  
  const trainSize = Math.min(maxTrainSize, Math.floor(shuffled.length * 0.8));
  const trainData = shuffled.slice(0, trainSize);
  
  const testSize = Math.min(maxTestSize, shuffled.length - trainSize);
  const testData = shuffled.slice(trainSize, trainSize + testSize);

  const getFeatures = (s: QKDSample) => [
    s.channelLoss,
    s.noise,
    s.detectorEfficiency,
    s.darkCounts,
    s.misalignment
  ];

  const trainX = trainData.map(getFeatures);
  const trainY = trainData.map(s => s.actualQber);
  const testX = testData.map(getFeatures);
  const testY = testData.map(s => s.actualQber);

  // Train the model and log training loss curve
  const lossCurve: { tree: number; error: number }[] = [];
  forest.fit(trainX, trainY, (treeIdx, error) => {
    lossCurve.push({ tree: treeIdx + 1, error: parseFloat(error.toFixed(6)) });
  });

  // Predictions
  const trainPred = forest.predict(trainX);
  const testPred = forest.predict(testX);

  // Helper: R² accuracy score
  const calculateR2 = (actual: number[], predicted: number[]) => {
    const meanActual = actual.reduce((a, b) => a + b, 0) / actual.length;
    const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - meanActual, 2), 0);
    const residualSumSquares = actual.reduce((sum, val, idx) => sum + Math.pow(val - predicted[idx], 2), 0);
    if (totalSumSquares === 0) return 1;
    return 1 - residualSumSquares / totalSumSquares;
  };

  const trainR2 = Math.max(0, calculateR2(trainY, trainPred)) * 100;
  const testR2 = Math.max(0, calculateR2(testY, testPred)) * 100;

  // Let's classify: Secure Key (QBER <= 11% / 0.11) is Safe, Unsafe otherwise.
  // Note: Standard ML nomenclature for binary security checks:
  // "Positive" class = UNSAFE (QBER > 11%) - we want to detect threats/failures.
  // "Negative" class = SECURE (QBER <= 11%)
  const threshold = 0.11;
  let tp = 0; // predicted unsafe, actual unsafe
  let fp = 0; // predicted unsafe, actual safe
  let fn = 0; // predicted safe, actual unsafe
  let tn = 0; // predicted safe, actual safe

  for (let i = 0; i < testY.length; i++) {
    const actualUnsafe = testY[i] > threshold;
    const predictedUnsafe = testPred[i] > threshold;

    if (actualUnsafe && predictedUnsafe) tp++;
    else if (!actualUnsafe && predictedUnsafe) fp++;
    else if (actualUnsafe && !predictedUnsafe) fn++;
    else tn++;
  }

  const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 100;
  const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 100;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 100;

  // Generate ROC Curve (FPR vs TPR) by sweeping threshold 0 to 0.5
  const rocCurve: { fpr: number; tpr: number }[] = [];
  rocCurve.push({ fpr: 0, tpr: 0 });
  for (let t = 0; t <= 50; t++) {
    const thresh = t / 100;
    let currentTp = 0;
    let currentFp = 0;
    let currentFn = 0;
    let currentTn = 0;

    for (let i = 0; i < testY.length; i++) {
      const actualUnsafe = testY[i] > threshold;
      const predictedUnsafe = testPred[i] > thresh;

      if (actualUnsafe && predictedUnsafe) currentTp++;
      else if (!actualUnsafe && predictedUnsafe) currentFp++;
      else if (actualUnsafe && !predictedUnsafe) currentFn++;
      else currentTn++;
    }

    const tpr = currentTp + currentFn > 0 ? currentTp / (currentTp + currentFn) : 0;
    const fpr = currentFp + currentTn > 0 ? currentFp / (currentFp + currentTn) : 0;
    rocCurve.push({ fpr: parseFloat(fpr.toFixed(3)), tpr: parseFloat(tpr.toFixed(3)) });
  }
  // Sort ROC points to ensure beautiful curve
  rocCurve.push({ fpr: 1, tpr: 1 });
  rocCurve.sort((a, b) => a.fpr - b.fpr);

  // Format Feature Importance
  const featureNames = ["Channel Loss", "Noise Probability", "Detector Efficiency", "Dark Count Rate", "Basis Misalignment"];
  const rawImportance = forest.getFeatureImportances();
  const featureImportance = featureNames.map((name, idx) => ({
    feature: name,
    importance: parseFloat((rawImportance[idx] * 100).toFixed(2))
  })).sort((a, b) => b.importance - a.importance);

  return {
    algorithm: "Random Forest Regressor (12 Decision Trees)",
    trainingAccuracy: parseFloat(trainR2.toFixed(2)),
    testingAccuracy: parseFloat(testR2.toFixed(2)),
    precision: parseFloat(precision.toFixed(2)),
    recall: parseFloat(recall.toFixed(2)),
    f1Score: parseFloat(f1Score.toFixed(2)),
    rocCurve,
    featureImportance,
    confusionMatrix: { tp, fp, fn, tn },
    trainingLoss: lossCurve
  };
}
