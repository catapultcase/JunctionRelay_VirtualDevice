/*
 * This file is part of JunctionRelay.
 *
 * Copyright (C) 2024–present Jonathan Mills, CatapultCase
 *
 * JunctionRelay is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * JunctionRelay is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with JunctionRelay. If not, see <https://www.gnu.org/licenses/>.
 */

import {
    VirtualDisplayDataProvider,
    RiveConfig,
    SensorPayload,
    ConnectionStatus
} from '../interfaces/VirtualDisplayDataProvider';

// Poll rate presets for easy selection
export const POLL_RATE_PRESETS = {
    VERY_FAST: 100,   // 100ms - 10 FPS  
    FAST: 250,        // 250ms - 4 FPS (default)
    NORMAL: 500,      // 500ms - 2 FPS
    SLOW: 1000,       // 1000ms - 1 FPS
    VERY_SLOW: 2000   // 2000ms - 0.5 FPS
} as const;

export const POLL_RATE_LABELS = {
    [POLL_RATE_PRESETS.VERY_FAST]: 'Very Fast (100ms)',
    [POLL_RATE_PRESETS.FAST]: 'Fast (250ms)',
    [POLL_RATE_PRESETS.NORMAL]: 'Normal (500ms)',
    [POLL_RATE_PRESETS.SLOW]: 'Slow (1000ms)',
    [POLL_RATE_PRESETS.VERY_SLOW]: 'Very Slow (2000ms)'
} as const;

interface DeviceStreamResponse {
    deviceId: string;
    deviceName: string;
    screenId: number;
    configPayload: any;
    sensorPayload: any;
    lastUpdate: string;
    timestamp: string;
}

interface WebSocketDataProviderOptions {
    deviceId?: string;
    enabled?: boolean;
    defaultPollRate?: number; // in milliseconds
}

export class WebSocketDataProvider implements VirtualDisplayDataProvider {
    private deviceId?: string;
    private enabled: boolean = true;
    private pollRate: number;
    private pollIntervalRef?: number;
    private isMountedRef: boolean = true;
    private connectionStatus: ConnectionStatus = 'disconnected';

    // Callback storage
    private configCallbacks: Array<(config: RiveConfig) => void> = [];
    private sensorCallbacks: Array<(data: SensorPayload) => void> = [];
    private statusCallbacks: Array<(status: ConnectionStatus) => void> = [];

    // Data caching for change detection
    private lastConfigJson: string | null = null;
    private lastSensorJson: string | null = null;

    // Store current config for displayValue generation
    private currentConfig: RiveConfig | null = null;

    constructor(options: WebSocketDataProviderOptions = {}) {
        this.deviceId = options.deviceId;
        this.enabled = options.enabled ?? true;
        this.pollRate = options.defaultPollRate ?? POLL_RATE_PRESETS.FAST;

        console.log(`[WebSocketDataProvider] Initialized for device: ${this.deviceId || 'any'}, poll rate: ${this.pollRate}ms`);
    }

    // Interface implementation
    onConfigurationReceived(callback: (config: RiveConfig) => void): () => void {
        this.configCallbacks.push(callback);
        return () => {
            const index = this.configCallbacks.indexOf(callback);
            if (index > -1) {
                this.configCallbacks.splice(index, 1);
            }
        };
    }

    onSensorDataReceived(callback: (data: SensorPayload) => void): () => void {
        this.sensorCallbacks.push(callback);
        return () => {
            const index = this.sensorCallbacks.indexOf(callback);
            if (index > -1) {
                this.sensorCallbacks.splice(index, 1);
            }
        };
    }

    onConnectionStatusChanged(callback: (status: ConnectionStatus) => void): () => void {
        this.statusCallbacks.push(callback);
        return () => {
            const index = this.statusCallbacks.indexOf(callback);
            if (index > -1) {
                this.statusCallbacks.splice(index, 1);
            }
        };
    }

    connect(): void {
        if (!this.enabled || !this.isMountedRef) {
            console.log('[WebSocketDataProvider] Connection disabled or unmounted');
            return;
        }

        // Don't reconnect if already connected or connecting
        if (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting') {
            // console.log(`[WebSocketDataProvider] Already ${this.connectionStatus}, skipping connect`);
            return;
        }

        console.log('[WebSocketDataProvider] Connecting...');
        this.setConnectionStatus('connecting');
        this.startPolling();
    }

    disconnect(): void {
        console.log('[WebSocketDataProvider] Disconnecting...');
        this.stopPolling();
        this.setConnectionStatus('disconnected');
    }

    isConnected(): boolean {
        return this.connectionStatus === 'connected';
    }

    cleanup(): void {
        console.log('[WebSocketDataProvider] Cleaning up...');
        this.isMountedRef = false;
        this.stopPolling();

        // Clear all callbacks
        this.configCallbacks = [];
        this.sensorCallbacks = [];
        this.statusCallbacks = [];

        // Clear cached data
        this.lastConfigJson = null;
        this.lastSensorJson = null;
        this.currentConfig = null;
    }

    // Public methods for poll rate control
    setPollRate(rate: number): void {
        if (!this.isMountedRef) return;

        console.log(`[WebSocketDataProvider] Updating poll rate to ${rate}ms`);
        this.pollRate = rate;

        // Save to localStorage for persistence
        localStorage.setItem('virtual_screen_poll_rate', rate.toString());

        // Restart polling with new rate if currently polling
        if (this.pollIntervalRef) {
            this.stopPolling();
            this.startPolling();
        }
    }

    getCurrentPollRate(): number {
        return this.pollRate;
    }

    // Private methods
    private setConnectionStatus(status: ConnectionStatus): void {
        if (this.connectionStatus !== status && this.isMountedRef) {
            console.log(`[WebSocketDataProvider] Connection status: ${this.connectionStatus} -> ${status}`);
            this.connectionStatus = status;
            this.statusCallbacks.forEach((callback) => {
                try {
                    callback(status);
                } catch (error) {
                    console.error('[WebSocketDataProvider] Error in status callback:', error);
                }
            });
        }
    }

    private startPolling(): void {
        if (!this.enabled || !this.isMountedRef) {
            return;
        }

        // Don't start polling if already polling
        if (this.pollIntervalRef) {
            console.log('[WebSocketDataProvider] Already polling, skipping startPolling');
            return;
        }

        console.log(`[WebSocketDataProvider] Starting polling at ${this.pollRate}ms intervals`);

        const poll = async () => {
            if (!this.enabled || !this.isMountedRef) {
                return;
            }

            try {
                await this.fetchDeviceData();
            } catch (error) {
                console.error('[WebSocketDataProvider] Poll error:', error);
                this.setConnectionStatus('error');
            }
        };

        // Initial poll
        poll();

        // Set up interval
        this.pollIntervalRef = window.setInterval(poll, this.pollRate);
    }

    private stopPolling(): void {
        if (this.pollIntervalRef) {
            console.log('[WebSocketDataProvider] Stopping polling');
            clearInterval(this.pollIntervalRef);
            this.pollIntervalRef = undefined;
        }
    }

    private async fetchDeviceData(): Promise<void> {
        if (!this.deviceId) {
            console.error('[WebSocketDataProvider] No deviceId provided');
            this.setConnectionStatus('error');
            return;
        }

        try {
            const response = await fetch(`/api/connections/device/${this.deviceId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    // Only log 404s on status change
                    if (this.connectionStatus !== 'connected') {
                        console.log(`[WebSocketDataProvider] No stream found for device: ${this.deviceId}`);
                    }
                    this.setConnectionStatus('connected');
                    return;
                }
                throw new Error(`Device stream fetch failed: ${response.status} ${response.statusText}`);
            }

            const data: DeviceStreamResponse = await response.json();

            if (!this.isMountedRef) {
                return;
            }

            if (this.connectionStatus !== 'connected') {
                this.setConnectionStatus('connected');
            }

            this.processDeviceData(data);

        } catch (error) {
            console.error('[WebSocketDataProvider] Fetch error:', error);
            if (this.isMountedRef) {
                this.setConnectionStatus('error');
            }
        }
    }

    private processDeviceData(deviceData: DeviceStreamResponse): void {
        try {
            // Process configuration changes
            const configString = JSON.stringify(deviceData.configPayload);
            const configChanged = configString !== this.lastConfigJson;

            if (configChanged) {
                this.lastConfigJson = configString;
                console.log('[WebSocketDataProvider] Configuration changed');
                this.processConfigData(deviceData.configPayload);
            }

            // Process sensor data changes
            const sensorString = JSON.stringify(deviceData.sensorPayload);
            const sensorChanged = sensorString !== this.lastSensorJson;

            if (sensorChanged) {
                this.lastSensorJson = sensorString;
                // console.log('[WebSocketDataProvider] Sensor data changed');
                this.processSensorData(deviceData.sensorPayload);
            }

        } catch (error) {
            console.error('[WebSocketDataProvider] Error processing device data:', error);
        }
    }

    private processConfigData(configPayload: any): void {
        try {
            // Validate that this looks like a Rive config
            const isRiveConfig = configPayload?.type === 'rive_config' ||
                (configPayload?.frameConfig && configPayload?.frameElements);

            if (isRiveConfig) {
                console.log('[WebSocketDataProvider] Notifying config callbacks');

                // Store the current config for displayValue generation
                this.currentConfig = configPayload as RiveConfig;

                this.configCallbacks.forEach((callback) => {
                    try {
                        callback(configPayload as RiveConfig);
                    } catch (error) {
                        console.error('[WebSocketDataProvider] Error in config callback:', error);
                    }
                });
            }

        } catch (error) {
            console.error('[WebSocketDataProvider] Error processing config data:', error);
        }
    }

    private processSensorData(sensorPayload: any): void {
        try {
            // Validate that this looks like sensor data
            const isValidSensor = sensorPayload?.type === 'rive_sensor' && sensorPayload?.sensors;

            if (isValidSensor) {
                // Generate displayValue for each sensor based on config
                const enhancedSensorPayload = this.enhanceSensorDataWithDisplayValues(sensorPayload);

                // Log sensor data when it changes
                console.log('[WebSocketDataProvider] New sensor data:');
                Object.entries(enhancedSensorPayload.sensors).forEach(([tag, data]: [string, any], index) => {
                    console.log(`  ${index + 1}. "${tag}": ${data.displayValue || `${data.value} ${data.unit || ''}`}`);
                });

                this.sensorCallbacks.forEach((callback) => {
                    try {
                        callback(enhancedSensorPayload as SensorPayload);
                    } catch (error) {
                        console.error('[WebSocketDataProvider] Error in sensor callback:', error);
                    }
                });
            }

        } catch (error) {
            console.error('[WebSocketDataProvider] Error processing sensor data:', error);
        }
    }

    private enhanceSensorDataWithDisplayValues(sensorPayload: any): any {
        // Return original if no config available
        if (!this.currentConfig?.frameElements) {
            return sensorPayload;
        }

        // Create a copy to avoid mutating the original
        const enhanced = JSON.parse(JSON.stringify(sensorPayload));

        // Create a lookup map of sensor configurations
        const sensorConfigs = new Map<string, any>();

        if (Array.isArray(this.currentConfig.frameElements)) {
            this.currentConfig.frameElements.forEach((element: any) => {
                if (element.type === 'sensor' && element.properties?.sensorTag) {
                    sensorConfigs.set(element.properties.sensorTag, element.properties);
                }
            });
        }

        // Enhance each sensor with displayValue
        Object.entries(enhanced.sensors).forEach(([sensorTag, sensorData]: [string, any]) => {
            const config = sensorConfigs.get(sensorTag);

            if (config) {
                const displayValue = this.buildDisplayValue(
                    sensorData.value,
                    sensorData.unit || '',
                    config.showLabel ? config.placeholderSensorLabel : null,
                    config.showUnit || false,
                    config.showLabel || false
                );

                enhanced.sensors[sensorTag] = {
                    ...sensorData,
                    displayValue: displayValue
                };
            } else {
                // Fallback: just add value + unit as displayValue
                enhanced.sensors[sensorTag] = {
                    ...sensorData,
                    displayValue: `${sensorData.value}${sensorData.unit ? ' ' + sensorData.unit : ''}`
                };
            }
        });

        return enhanced;
    }

    private buildDisplayValue(value: any, unit: string, label: string | null, showUnit: boolean, showLabel: boolean): string {
        const parts: string[] = [];

        // Add label if configured
        if (showLabel && label) {
            parts.push(label);
        }

        // Add the value
        parts.push(value.toString());

        // Add unit if configured and available
        if (showUnit && unit) {
            parts.push(unit);
        }

        return parts.join(' ');
    }
}