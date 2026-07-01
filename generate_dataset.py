#!/usr/bin/env python3
"""
BB84 Quantum Key Distribution (QKD) Dataset Generator
======================================================
This script generates a high-fidelity, physically consistent, and realistic
experimental QKD dataset suitable for machine learning research and publications.

It simulates a BB84 protocol over both Fiber and Free-Space channels, accounting
for channel propagation physics, atmospheric visibility (Kruse model), detector
thermodynamics, background radiance, timing jitter, dead-time saturation, and sifting.

Physical Formulas and Correlations Modeled:
1. Transmission Distance -> Channel Loss (dB):
   - Fiber: Attenuation of ~0.2 dB/km + coupling loss.
   - Free Space: Geometric loss (divergence) + atmospheric attenuation calculated
     using visibility (Kruse scattering model).
2. Detector Temperature -> Dark Count Rate:
   - Modeled via an exponential Arrhenius-like scaling relationship (e.g., doubling
     every 7 degrees Celsius).
3. Background Light + Dark Counts -> Physical QBER Increase:
   - Noise counts trigger false clicks in Bob's active temporal gates, diluting
     polarization signal-to-noise ratios and driving QBER towards 50%.
4. Polarization Drift -> QBER:
   - Polarization angle rotations directly translate to geometric projection errors
     in measurement bases: e(alignment) = sin^2(drift).
5. Timing Jitter -> Synchronization Error:
   - Jitter in detector timing resolution directly increases synchronization skew.
6. Saturation & Dead Time:
   - High arrival rates combined with finite detector dead times saturate detectors,
     reducing effective quantum detection efficiency: eta_eff = eta / (1 + Rate * t_dead).

Author: QKD ML Research Group
License: Apache-2.0
"""

import os
import uuid
import datetime
import numpy as np
import pandas as pd

class QKDDatasetGenerator:
    def __init__(self, num_samples=30000, seed=42):
        """
        Initializes the generator with sample size and random seed.
        
        Parameters:
            num_samples (int): Total number of rows/experiments to generate.
            seed (int): Random seed for reproducibility.
        """
        self.num_samples = num_samples
        self.seed = seed
        np.random.seed(seed)
        
        # Fundamental physical constants
        self.c = 299792458  # Speed of light in m/s
        self.wavelength_nm = 1550  # Operational wavelength (C-band standard)
        self.f_pulse = 1e7  # Laser pulse repetition rate (10 MHz)
        self.epoch_duration = 0.1  # Duration of each experimental epoch (100 ms)
        self.n_sent = int(self.f_pulse * self.epoch_duration)  # Total pulses sent per epoch (1,000,000)

    def generate_categorical_features(self):
        """
        Generates core channel types and associated environment/weather features.
        """
        # Distribute channels: 60% Fiber Optic, 40% Free Space (Satellite/Atmospheric links)
        channel_types = np.random.choice(['Fiber', 'Free Space'], size=self.num_samples, p=[0.6, 0.4])
        
        # Weather distributions for Free Space links
        weather_choices = ['Sunny', 'Cloudy', 'Rainy', 'Haze', 'Foggy']
        weather_probs = [0.45, 0.25, 0.15, 0.10, 0.05]
        
        weather = []
        visibility = []
        humidity = []
        
        for ch in channel_types:
            if ch == 'Fiber':
                # Fiber is shielded from outdoor atmospheric dynamics
                weather.append('N/A')
                visibility.append(999.0)  # High placeholder for physical consistency
                humidity.append(np.random.uniform(35.0, 55.0))  # Controlled indoor lab humidity
            else:
                # Free Space is heavily influenced by atmosphere
                w = np.random.choice(weather_choices, p=weather_probs)
                weather.append(w)
                
                # Visibility (km) correlated with weather
                if w == 'Sunny':
                    vis = np.random.uniform(15.0, 30.0)
                    hum = np.random.uniform(15.0, 45.0)
                elif w == 'Cloudy':
                    vis = np.random.uniform(8.0, 15.0)
                    hum = np.random.uniform(50.0, 75.0)
                elif w == 'Rainy':
                    vis = np.random.uniform(2.0, 8.0)
                    hum = np.random.uniform(80.0, 98.0)
                elif w == 'Haze':
                    vis = np.random.uniform(1.0, 4.0)
                    hum = np.random.uniform(60.0, 85.0)
                else:  # Foggy
                    vis = np.random.uniform(0.1, 1.0)
                    hum = np.random.uniform(90.0, 100.0)
                    
                visibility.append(vis)
                humidity.append(hum)
                
        return channel_types, weather, np.array(visibility), np.array(humidity)

    def calculate_binary_entropy(self, q):
        """
        Calculates Shannon's binary entropy function H_2(q).
        """
        q = np.clip(q, 1e-15, 1.0 - 1e-15)
        return -q * np.log2(q) - (1.0 - q) * np.log2(1.0 - q)

    def generate(self):
        """
        Performs vector-based simulation of QKD physics and generates the DataFrame.
        """
        print(f"Starting QKD experimental dataset generation ({self.num_samples} samples)...")
        
        # 1. Base categorical variables
        channel_type, weather_condition, visibility, humidity = self.generate_categorical_features()
        
        # 2. Transmission Distance (km)
        # Fiber lengths range from short lab tests (2 km) to long telecom distances (120 km)
        # Free-space terrestrial/low-altitude links range from 0.5 km to 18 km
        distance = np.where(
            channel_type == 'Fiber',
            np.random.uniform(2.0, 120.0, size=self.num_samples),
            np.random.uniform(0.5, 18.0, size=self.num_samples)
        )
        
        # 3. Channel Loss (dB) Calculation
        # Fiber Loss: Attenuation coef * distance + Coupling loss
        # Free Space Loss: Geometric divergence loss + Atmospheric attenuation via visibility (Kruse model)
        fiber_attenuation_coef = np.random.normal(0.20, 0.01, size=self.num_samples)  # Standard ~0.2 dB/km at 1550 nm
        fiber_coupling_loss = np.random.normal(0.8, 0.15, size=self.num_samples)  # Connector/coupling offsets
        
        # Free space geometric loss models beam expansion
        free_space_geom_loss = 12.0 + 4.5 * np.log(distance + 0.1)  
        
        # Kruse scatter model for atmospheric extinction coefficient alpha (dB/km)
        # wavelength = 1550 nm. q is size distribution of scatterers
        q_scatter = np.where(
            visibility > 50, 1.6,
            np.where((visibility >= 6) & (visibility <= 50), 1.3,
                     np.where((visibility >= 1) & (visibility < 6), 0.585 * (visibility ** (1/3)),
                              np.where((visibility >= 0.5) & (visibility < 1), visibility, 0.0))))
        
        # Scattering attenuation coefficient
        extinction_coef = (17.0 / np.maximum(visibility, 0.05)) * ((self.wavelength_nm / 550.0) ** (-q_scatter))
        extinction_coef = np.clip(extinction_coef, 0.05, 80.0)  # Bound extreme fog scenarios
        
        free_space_attenuation_loss = extinction_coef * distance
        
        loss_db = np.where(
            channel_type == 'Fiber',
            fiber_attenuation_coef * distance + fiber_coupling_loss,
            free_space_geom_loss + free_space_attenuation_loss
        )
        # Physical floor on attenuation
        loss_db = np.maximum(0.1, loss_db)
        
        # 4. Polarization Drift (degrees)
        # Polarization shifts due to fiber mechanical/thermal stress or atmospheric turbulence
        # Drift scales with transmission length and ambient conditions
        polarization_drift = np.where(
            channel_type == 'Fiber',
            np.abs(np.random.normal(0.0, 1.5 + 0.08 * distance, size=self.num_samples)),
            np.abs(np.random.normal(0.0, 3.0 + 0.6 * (30.0 - np.minimum(visibility, 30.0)), size=self.num_samples))
        )
        # Max reasonable rotation is bounded on a circle, model effectively up to 45 deg
        polarization_drift = np.clip(polarization_drift, 0.0, 45.0)
        
        # 5. Detector Temperature (C)
        # Single-photon APDs or SNSPDs require deep cooling (thermoelectric or cryogenic)
        # Cooler detectors dramatically suppress thermal dark counts.
        detector_temp = np.random.normal(-45.0, 6.0, size=self.num_samples)
        
        # 6. Dark Count Probability (per gate)
        # Dark count scales exponentially with detector temperature
        # Baseline probability of 1e-6 at -50 C, doubling every ~7 C of warming
        dark_count_base = 1e-6 * (2.0 ** ((detector_temp + 50.0) / 7.0))
        dark_count = dark_count_base * np.random.uniform(0.85, 1.15, size=self.num_samples)
        dark_count = np.clip(dark_count, 1e-8, 1e-3)
        
        # 7. Detector Efficiency (eta)
        # Quantum detection efficiency of Bob's sensors
        # Standard InGaAs APDs offer 15-30% efficiency; advanced SNSPDs can hit 80%+.
        detector_efficiency = np.where(
            np.random.rand(self.num_samples) < 0.85,
            np.random.normal(0.20, 0.02, size=self.num_samples),  # Standard APD setup
            np.random.normal(0.75, 0.05, size=self.num_samples)   # SNSPD upgrades
        )
        detector_efficiency = np.clip(detector_efficiency, 0.05, 0.95)
        
        # 8. Background Light Level (photons per temporal gate)
        # For fiber, background is negligible (e.g. adjacent channel crosstalk).
        # For free space, solar/stellar background radiation introduces significant false counts during daytime.
        background_light = np.where(
            channel_type == 'Fiber',
            np.random.exponential(1e-10, size=self.num_samples),
            # Daytime sunny skies are highly radiant; nights/foggy conditions are lower
            np.where(weather_condition == 'Sunny',
                     10.0 ** np.random.uniform(-4.5, -2.5, size=self.num_samples),  # Bright background
                     10.0 ** np.random.uniform(-8.0, -5.0, size=self.num_samples))  # Cloudy/Night/Rain
        )
        background_light = np.clip(background_light, 1e-12, 1e-2)
        
        # 9. Timing Jitter (ns)
        # Variation in timing detection resolution of detectors
        timing_jitter = np.random.normal(0.12, 0.02, size=self.num_samples)
        timing_jitter = np.maximum(0.02, timing_jitter)
        
        # 10. Detector Dead Time (ns)
        # Quenching/recovery duration during which the detector cannot register subsequent photons
        dead_time = np.random.uniform(20.0, 100.0, size=self.num_samples)
        
        # 11. Synchronization Error (ns)
        # Synchronization offset between Alice's laser clock and Bob's gating system.
        # Influenced directly by timing jitter and signal attenuation.
        sync_error = 0.4 * timing_jitter + np.random.exponential(0.05, size=self.num_samples)
        sync_error = np.clip(sync_error, 0.01, 1.2)
        
        # 12. Mean Photon Intensity (mu)
        # Mean photon number per coherent pulse sent by Alice.
        # Bounded between 0.3 and 0.6 to balance secret key yield and photon-number-splitting (PNS) vulnerability.
        mu = np.random.normal(0.50, 0.04, size=self.num_samples)
        mu = np.clip(mu, 0.2, 0.8)
        
        # 13. Channel depolarizing/random noise probability
        # Represents environmental physical turbulence (e.g., fiber twisting) flipping polarizations randomly
        noise_prob = np.random.beta(2, 25, size=self.num_samples)  # Heavily skewed towards low noise
        
        # 14. Photon Arrival Rate (photons/pulse) at Bob
        # Transmitted intensity arriving before detector reception
        t_channel = 10.0 ** (-loss_db / 10.0)
        photon_arrival_rate = mu * t_channel
        
        # 15. Effective Signal & Noise Click Probabilities (Including Dead-Time Saturation)
        # Saturation coefficient: reduces effective detection under high-frequency clicks
        p_sig_raw = 1.0 - np.exp(-photon_arrival_rate * detector_efficiency)
        p_click_raw = p_sig_raw + dark_count + (background_light * detector_efficiency)
        
        # Apply saturation constraint: eta_sat = eta_raw / (1 + click_freq * dead_time)
        dead_time_fraction = p_click_raw * self.f_pulse * (dead_time * 1e-9)
        saturation_factor = 1.0 / (1.0 + dead_time_fraction)
        
        p_sig_eff = p_sig_raw * saturation_factor
        p_click_eff = p_click_raw * saturation_factor
        
        # 16. Total Detected Bits (per epoch)
        # Bob counts all clicks before basis reconciliation (sifting)
        total_detected_bits = np.random.binomial(self.n_sent, np.clip(p_click_eff, 0, 1))
        
        # 17. Sifted Key Length
        # Clicks where Alice's and Bob's random bases matched (BB84 sifting ratio = 0.5)
        sifted_key_length = np.random.binomial(total_detected_bits, 0.5)
        sifted_key_length = np.maximum(0, sifted_key_length)
        
        # 18. Quantum Bit Error Rate (QBER) Calculations
        # Signal polarization alignment error: e_align = sin^2(polarization_drift)
        drift_rad = (polarization_drift * np.pi) / 180.0
        e_align = np.sin(drift_rad) ** 2
        
        # Depolarizing channel noise introduces standard 50% error on affected slots
        e_channel_noise = noise_prob * 0.5
        
        # Combine signal-related error vectors (alignment and random environmental flips)
        e_sig = e_align + e_channel_noise - 2.0 * e_align * e_channel_noise
        
        # Dark counts and background clicks are completely random (50% error probability)
        # Total expected QBER is a weighted average of true signal errors and noise clicks
        qber_mean = np.where(
            p_click_eff > 0,
            (p_sig_eff * e_sig + 0.5 * (dark_count + (background_light * detector_efficiency)) * saturation_factor) / p_click_eff,
            0.50
        )
        qber_mean = np.clip(qber_mean, 0.0, 0.50)
        
        # QBER Standard Deviation (binomial standard error over finite sifted key length)
        qber_std = np.where(
            sifted_key_length > 0,
            np.sqrt(qber_mean * (1.0 - qber_mean) / sifted_key_length),
            0.0
        )
        
        # 19. Bit Error Count
        # Actual count of errors in the sifted key drawn from physical distribution
        bit_error_count = np.random.binomial(sifted_key_length, qber_mean)
        
        # Actual measured QBER in this session
        actual_qber = np.where(sifted_key_length > 0, bit_error_count / sifted_key_length, 0.50)
        
        # 20. Secret Key Rate (bps)
        # Secure Key Fraction: r = 1 - f_leak * H_2(QBER) - H_2(QBER)
        # Standard cascade/LDPC error-correction leak efficiency factor (f_leak = 1.2)
        h2_qber = self.calculate_binary_entropy(qber_mean)
        secret_fraction = 1.0 - 1.2 * h2_qber - h2_qber
        
        # Sifted key rate is sifted_key_length / epoch_duration
        # Secure key is distilled only if the QBER lies safely below Shor-Preskill's 11.0% limit
        secret_key_rate = np.where(
            (qber_mean < 0.11) & (secret_fraction > 0),
            (sifted_key_length * secret_fraction) / self.epoch_duration,
            0.0
        )
        
        # 21. Secure Key Generated (Yes/No)
        secure_key_generated = np.where(secret_key_rate > 0.0, "Yes", "No")
        
        # 22. Metadata features (Timestamps and IDs)
        base_time = datetime.datetime.now() - datetime.timedelta(days=30)
        timestamps = [
            (base_time + datetime.timedelta(minutes=int(i * 1.5))).isoformat()
            for i in range(self.num_samples)
        ]
        experiment_ids = [f"EXP-{uuid.uuid4().hex[:10].upper()}" for _ in range(self.num_samples)]
        
        # 23. Construct Dataframe
        data = {
            'experiment_id': experiment_ids,
            'timestamp': timestamps,
            'channel_type': channel_type,
            'transmission_distance_km': np.round(distance, 3),
            'loss_db': np.round(loss_db, 4),
            'noise_prob': np.round(noise_prob, 5),
            'polarization_drift': np.round(polarization_drift, 3),
            'detector_temperature_C': np.round(detector_temp, 2),
            'dark_count': np.round(dark_count, 7),
            'efficiency': np.round(detector_efficiency, 4),
            'background_light_level': np.round(background_light, 7),
            'timing_jitter_ns': np.round(timing_jitter, 4),
            'detector_dead_time_ns': np.round(dead_time, 2),
            'synchronization_error': np.round(sync_error, 4),
            'mu': np.round(mu, 3),
            'photon_arrival_rate': np.round(photon_arrival_rate, 6),
            'total_detected_bits': total_detected_bits,
            'sifted_key_length': sifted_key_length,
            'bit_error_count': bit_error_count,
            'QBER_mean': np.round(qber_mean, 5),
            'QBER_std': np.round(qber_std, 6),
            'actual_qber': np.round(actual_qber, 5),
            'secret_key_rate': np.round(secret_key_rate, 2),
            'secure_key_generated': secure_key_generated,
            'weather_condition': weather_condition,
            'humidity': np.round(humidity, 2),
            'atmospheric_visibility': np.round(visibility, 2)
        }
        
        df = pd.DataFrame(data)
        print("Generation complete! DataFrame constructed successfully.")
        return df

    def save_and_verify(self, filepath="qkd_experimental_dataset.csv"):
        """
        Saves the simulated dataset to a CSV file and prints verification metrics.
        """
        df = self.generate()
        df.to_csv(filepath, index=False)
        print(f"Dataset successfully saved to: {os.path.abspath(filepath)}")
        
        # Print basic summary verification statistics
        print("\n" + "="*50)
        print("DATASET VERIFICATION SUMMARY")
        print("="*50)
        print(f"Total Rows: {len(df):,}")
        print(f"Columns: {list(df.columns)}")
        print("\nChannel Type Split:")
        print(df['channel_type'].value_counts(normalize=True).round(3))
        print("\nSecurity Target Allocation:")
        print(df['secure_key_generated'].value_counts())
        print(f"Overall Secure Yield Rate: {(df['secure_key_generated'] == 'Yes').mean() * 100:.2f}%")
        print("\nParameter Correlation Check (Pearson's r):")
        numeric_cols = df.select_dtypes(include=[np.number])
        corr = numeric_cols.corr()
        print(f"  Distance vs Loss: {corr.loc['transmission_distance_km', 'loss_db']:.4f}")
        print(f"  Detector Temp vs Dark Counts: {corr.loc['detector_temperature_C', 'dark_count']:.4f}")
        print(f"  Loss vs Secret Key Rate: {corr.loc['loss_db', 'secret_key_rate']:.4f}")
        print(f"  QBER vs Secret Key Rate: {corr.loc['QBER_mean', 'secret_key_rate']:.4f}")
        print("="*50 + "\n")
        
        return df

if __name__ == "__main__":
    # Standard script run configurations
    generator = QKDDatasetGenerator(num_samples=30000, seed=42)
    generator.save_and_verify()
