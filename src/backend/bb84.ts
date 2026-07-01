/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * High-fidelity BB84 Quantum Key Distribution protocol simulator.
 */

export interface PhotonState {
  index: number;
  aliceBit: number;
  aliceBasis: '+' | 'x';
  aliceAngle: number; // 0, 90 (for +) or 45, 135 (for x)
  isLost: boolean;
  isNoisy: boolean;
  isDarkCount: boolean;
  bobBasis: '+' | 'x';
  bobMeasuredBit: number | null; // null if lost and no dark count
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
  isSecure: boolean; // QBER <= 11%
  systemHealth: number; // 0 - 100%
  photons: PhotonState[]; // Sample photons for animation (first ~100)
  aliceBitsString: string;
  aliceBasesString: string;
  bobBasesString: string;
  bobMeasurementsString: string;
  matchingBasesString: string;
  siftedKeyString: string;
  finalKeyString: string;
}

// Binary entropy function for secure key rate calculation
function binaryEntropy(q: number): number {
  if (q <= 0 || q >= 1) return 0;
  return -q * Math.log2(q) - (1 - q) * Math.log2(1 - q);
}

export function runBB84Simulation(
  numBits: number = 500,
  noiseProbability: number = 0.05,
  channelLossDb: number = 3,
  detectorEfficiency: number = 0.85,
  darkCountRate: number = 0.001,
  basisMisalignmentDeg: number = 0
): BB84SimulationResult {
  const photons: PhotonState[] = [];
  
  let photonsLostCount = 0;
  let darkCountsCount = 0;
  let successfulDetectionsCount = 0;
  let siftedCount = 0;
  let errorsCount = 0;

  // We generate all requested bits, but only store the first 100 in the detail array for visualizers to save bandwidth
  const maxVisualizedPhotons = Math.min(numBits, 120);

  // We will build string representations for the dashboard display based on the first 30 keys
  const displayLength = Math.min(numBits, 40);
  const aliceBitsDisplay: number[] = [];
  const aliceBasesDisplay: string[] = [];
  const bobBasesDisplay: string[] = [];
  const bobMeasurementsDisplay: string[] = [];
  const matchingBasesDisplay: string[] = [];
  const siftedKeyDisplay: string[] = [];
  const finalKeyDisplay: string[] = [];

  // Transmission factor: 10^(-Loss / 10)
  const tChannel = Math.pow(10, -channelLossDb / 10);
  const misalignmentRad = (basisMisalignmentDeg * Math.PI) / 180;

  for (let i = 0; i < numBits; i++) {
    const aliceBit = Math.random() < 0.5 ? 0 : 1;
    const aliceBasis: '+' | 'x' = Math.random() < 0.5 ? '+' : 'x';
    
    // Determine polarization angle
    let aliceAngle = 0;
    if (aliceBasis === '+') {
      aliceAngle = aliceBit === 0 ? 0 : 90;
    } else {
      aliceAngle = aliceBit === 0 ? 45 : 135;
    }

    // Channel effects
    // 1. Loss check (photon makes it to Bob)
    const isLost = Math.random() > tChannel;
    
    // 2. Noise check (polarization gets jittered or flipped)
    const isNoisy = Math.random() < noiseProbability;

    // 3. Bob's basis selection
    const bobBasis: '+' | 'x' = Math.random() < 0.5 ? '+' : 'x';

    // 4. Bob's detection
    let isDetected = false;
    let isDarkCount = false;

    if (!isLost) {
      // If photon arrived, does the detector trigger?
      if (Math.random() < detectorEfficiency) {
        isDetected = true;
      }
    }

    // Dark count check: if not detected, detector might still fire falsely
    if (!isDetected) {
      if (Math.random() < darkCountRate) {
        isDetected = true;
        isDarkCount = true;
      }
    }

    let bobMeasuredBit: number | null = null;
    let basisMatched = false;
    let isSifted = false;
    let hasError = false;

    if (isDetected) {
      successfulDetectionsCount++;
      if (isDarkCount) {
        darkCountsCount++;
        // Dark count results in totally random bit detection
        bobMeasuredBit = Math.random() < 0.5 ? 0 : 1;
        basisMatched = aliceBasis === bobBasis;
        isSifted = basisMatched;
        if (isSifted) {
          hasError = bobMeasuredBit !== aliceBit;
          if (hasError) errorsCount++;
          siftedCount++;
        }
      } else {
        // True photon measurement
        basisMatched = aliceBasis === bobBasis;
        isSifted = basisMatched;

        if (basisMatched) {
          siftedCount++;
          // Quantum Measurement with basis misalignment and channel noise
          // Standard misalignment causes error with probability sin^2(theta)
          // Channel noise has probability of flipping the polarization
          let errorProbability = Math.pow(Math.sin(misalignmentRad), 2);
          if (isNoisy) {
            // Depolarizing noise adds random perturbation (50% error rate on noisy slots)
            errorProbability = 0.5;
          }

          const hasFlip = Math.random() < errorProbability;
          bobMeasuredBit = hasFlip ? (aliceBit === 0 ? 1 : 0) : aliceBit;
          
          hasError = bobMeasuredBit !== aliceBit;
          if (hasError) errorsCount++;
        } else {
          // Unmatched basis: 50% chance of registering 0 or 1, but we discard this during reconciliation
          bobMeasuredBit = Math.random() < 0.5 ? 0 : 1;
        }
      }
    } else {
      photonsLostCount++;
    }

    // Record details for visualization
    if (i < maxVisualizedPhotons) {
      photons.push({
        index: i,
        aliceBit,
        aliceBasis,
        aliceAngle,
        isLost,
        isNoisy,
        isDarkCount,
        bobBasis,
        bobMeasuredBit,
        basisMatched,
        isSifted,
        hasError
      });
    }

    // Add elements to visual dashboard text blocks
    if (i < displayLength) {
      aliceBitsDisplay.push(aliceBit);
      aliceBasesDisplay.push(aliceBasis);
      bobBasesDisplay.push(bobBasis);
      bobMeasurementsDisplay.push(bobMeasuredBit === null ? '∅' : bobMeasuredBit.toString());
      
      if (isDetected && aliceBasis === bobBasis) {
        matchingBasesDisplay.push(aliceBasis);
        siftedKeyDisplay.push(bobMeasuredBit!.toString());
        // For visual, final key is after some mock error correction (errors removed)
        if (bobMeasuredBit === aliceBit) {
          finalKeyDisplay.push(aliceBit.toString());
        } else {
          finalKeyDisplay.push('_'); // blank or dropped
        }
      } else {
        matchingBasesDisplay.push(' ');
        siftedKeyDisplay.push(' ');
        finalKeyDisplay.push(' ');
      }
    }
  }

  // Calculate statistics
  const qber = siftedCount > 0 ? errorsCount / siftedCount : 0;
  const isSecure = qber <= 0.11; // 11% standard Shor-Preskill security bound

  // Secure key generation length with error correction leak (f) and privacy amplification
  // Key distillation fraction: r = 1 - 2 * H_2(QBER)
  let keyEfficiency = 0;
  if (isSecure && siftedCount > 0) {
    const h2 = binaryEntropy(qber);
    // Realistic efficiency including 1.2x error correction overhead (leakage)
    keyEfficiency = Math.max(0, 1 - 1.2 * h2 - h2);
  }
  const finalKeyLength = isSecure ? Math.floor(siftedCount * keyEfficiency) : 0;

  const transmissionSuccessRate = successfulDetectionsCount / numBits;

  // System Health index formula
  // Declines with channel loss, noise, misalignment and dark counts
  let health = 100 - (channelLossDb * 1.5) - (noiseProbability * 120) - (qber * 250);
  if (basisMisalignmentDeg > 0) health -= (basisMisalignmentDeg * 0.8);
  if (!isSecure) health = Math.max(5, health - 40);
  const systemHealth = Math.round(Math.max(0, Math.min(100, health)));

  return {
    totalBitsSent: numBits,
    photonsLost: photonsLostCount,
    darkCounts: darkCountsCount,
    successfulDetections: successfulDetectionsCount,
    siftedKeyLength: siftedCount,
    finalKeyLength,
    qber: parseFloat(qber.toFixed(4)),
    transmissionSuccessRate: parseFloat(transmissionSuccessRate.toFixed(4)),
    isSecure,
    systemHealth,
    photons,
    aliceBitsString: aliceBitsDisplay.join(' '),
    aliceBasesString: aliceBasesDisplay.join(' '),
    bobBasesString: bobBasesDisplay.join(' '),
    bobMeasurementsString: bobMeasurementsDisplay.join(' '),
    matchingBasesString: matchingBasesDisplay.join(' '),
    siftedKeyString: siftedKeyDisplay.join(' '),
    finalKeyString: finalKeyDisplay.join(' ')
  };
}
