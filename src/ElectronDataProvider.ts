/*
 * ElectronDataProvider.ts
 * 
 * Singleton implementation - only one instance exists globally
 */

import {
    VirtualDisplayDataProvider,
    RiveConfig,
    SensorPayload,
    ConnectionStatus
} from './shared/interfaces/VirtualDisplayDataProvider';

interface ElectronDataProviderOptions {
    deviceId?: string;
    enabled?: boolean;
}

export class ElectronDataProvider implements VirtualDisplayDataProvider {
    private static instance: ElectronDataProvider | null = null;
    
    private enabled: boolean = true;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private deviceId?: string;

    // Callback storage
    private configCallbacks: Array<(config: RiveConfig) => void> = [];
    private sensorCallbacks: Array<(data: SensorPayload) => void> = [];
    private statusCallbacks: Array<(status: ConnectionStatus) => void> = [];

    // IPC event handlers
    private handleRiveConfig?: (event: any, data: any) => void;
    private handleSensorData?: (event: any, data: any) => void;
    private handleDisplayJson?: (event: any, data: any) => void;

    // Stream record to simulate backend DeviceStreamResponse
    private streamRecord: {
        deviceId: string;
        deviceName: string;
        screenId: string;
        configPayload: any;
        sensorPayload: any;
        lastUpdate: string;
        timestamp: string;
    } | null = null;

    // Private constructor for singleton pattern
    private constructor(options: ElectronDataProviderOptions = {}) {
        this.deviceId = options.deviceId;
        this.enabled = options.enabled ?? true;

        console.log(`[ElectronDataProvider] Singleton instance initialized for device: ${this.deviceId || 'any'}`);
    }

    // Singleton accessor
    public static getInstance(options?: ElectronDataProviderOptions): ElectronDataProvider {
        if (!ElectronDataProvider.instance) {
            ElectronDataProvider.instance = new ElectronDataProvider(options);
        }
        return ElectronDataProvider.instance;
    }

    // Reset singleton (useful for testing or app restart)
    public static resetInstance(): void {
        if (ElectronDataProvider.instance) {
            ElectronDataProvider.instance.cleanup();
            ElectronDataProvider.instance = null;
        }
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
        if (!this.enabled) {
            console.log('[ElectronDataProvider] Connection disabled');
            return;
        }

        if (!window.ipcRenderer) {
            console.error('[ElectronDataProvider] No ipcRenderer available');
            this.setConnectionStatus('error');
            return;
        }

        // Only connect if not already connected
        if (this.connectionStatus === 'connected') {
            console.log('[ElectronDataProvider] Already connected');
            return;
        }

        console.log('[ElectronDataProvider] Connecting to IPC...');
        this.setConnectionStatus('connecting');
        this.setupIPCListeners();
        this.setConnectionStatus('connected');
    }

    disconnect(): void {
        console.log('[ElectronDataProvider] Disconnect requested - keeping singleton alive');
        // Don't actually disconnect in singleton mode unless explicitly cleaned up
        // This prevents the timing issue with React remounts
    }

    isConnected(): boolean {
        return this.connectionStatus === 'connected';
    }

    cleanup(): void {
        console.log('[ElectronDataProvider] Cleaning up singleton...');
        this.teardownIPCListeners();
        this.setConnectionStatus('disconnected');

        // Clear all callbacks
        this.configCallbacks = [];
        this.sensorCallbacks = [];
        this.statusCallbacks = [];
    }

    // Private methods
    private setConnectionStatus(status: ConnectionStatus): void {
        if (this.connectionStatus !== status) {
            console.log(`[ElectronDataProvider] Connection status: ${this.connectionStatus} -> ${status}`);
            this.connectionStatus = status;
            this.statusCallbacks.forEach((callback) => {
                try {
                    callback(status);
                } catch (error) {
                    console.error('[ElectronDataProvider] Error in status callback:', error);
                }
            });
        }
    }

    private setupIPCListeners(): void {
        if (!window.ipcRenderer) return;

        // Prevent duplicate listeners
        if (this.handleRiveConfig) {
            console.log('[ElectronDataProvider] IPC listeners already setup');
            return;
        }

        console.log('[ElectronDataProvider] Setting up IPC listeners...');

        // Set up event handlers
        this.handleRiveConfig = (_event: any, data: any) => {
            console.log('\n' + '='.repeat(80));
            console.log('[ElectronDataProvider] 📋 RECEIVED CONFIG EVENT (rive-config)');
            console.log('='.repeat(80));
            console.log(JSON.stringify(data, null, 2));
            console.log('='.repeat(80) + '\n');
            
            // Update stream record
            this.updateStreamConfig(data);
            
            // Transform and forward to callbacks
            this.processConfigData(data);
        };

        this.handleSensorData = (_event: any, data: any) => {
            console.log('\n' + '='.repeat(80));
            console.log('[ElectronDataProvider] 📊 RECEIVED SENSOR EVENT (rive-sensor-data)');
            console.log('='.repeat(80));
            console.log(JSON.stringify(data, null, 2));
            console.log('='.repeat(80) + '\n');
            
            // Update stream record
            this.updateStreamSensor(data);
            
            // Transform and forward to callbacks
            this.processSensorData(data);
        };

        this.handleDisplayJson = (_event: any, data: any) => {
            console.log('\n' + '='.repeat(80));
            console.log('[ElectronDataProvider] 📡 INCOMING DISPLAY EVENT (display:json)');
            console.log(`Type: ${data?.type || 'unknown'}`);
            console.log('='.repeat(80));
            console.log(JSON.stringify(data, null, 2));
            console.log('='.repeat(80) + '\n');
            
            // TODO: Route based on type and transform
        };

        // Register listeners
        window.ipcRenderer.on("rive-config", this.handleRiveConfig);
        window.ipcRenderer.on("rive-sensor-data", this.handleSensorData);
        window.ipcRenderer.on("display:json", this.handleDisplayJson);

        console.log('[ElectronDataProvider] IPC listeners registered');
    }

    private teardownIPCListeners(): void {
        if (!window.ipcRenderer) return;

        if (this.handleRiveConfig) {
            window.ipcRenderer.off("rive-config", this.handleRiveConfig);
            this.handleRiveConfig = undefined;
        }

        if (this.handleSensorData) {
            window.ipcRenderer.off("rive-sensor-data", this.handleSensorData);
            this.handleSensorData = undefined;
        }

        if (this.handleDisplayJson) {
            window.ipcRenderer.off("display:json", this.handleDisplayJson);
            this.handleDisplayJson = undefined;
        }

        console.log('[ElectronDataProvider] IPC listeners removed');
    }

    // Stream record management - simulates backend DeviceStreamResponse
    private updateStreamConfig(configData: any): void {
        const now = new Date().toISOString();
        
        if (!this.streamRecord) {
            this.streamRecord = {
                deviceId: this.deviceId || 'electron-virtual-device',
                deviceName: 'JunctionRelay Virtual Device (Electron)',
                screenId: configData.screenId || 'default',
                configPayload: null,
                sensorPayload: null,
                lastUpdate: now,
                timestamp: now
            };
        }

        this.streamRecord.configPayload = configData;
        this.streamRecord.screenId = configData.screenId || this.streamRecord.screenId;
        this.streamRecord.lastUpdate = now;
        this.streamRecord.timestamp = now;

        console.log('[ElectronDataProvider] Updated stream record with config');
    }

    private updateStreamSensor(sensorData: any): void {
        const now = new Date().toISOString();
        
        if (!this.streamRecord) {
            this.streamRecord = {
                deviceId: this.deviceId || 'electron-virtual-device',
                deviceName: 'JunctionRelay Virtual Device (Electron)',
                screenId: sensorData.screenId || 'default',
                configPayload: null,
                sensorPayload: null,
                lastUpdate: now,
                timestamp: now
            };
        }

        this.streamRecord.sensorPayload = sensorData;
        this.streamRecord.screenId = sensorData.screenId || this.streamRecord.screenId;
        this.streamRecord.lastUpdate = now;
        this.streamRecord.timestamp = now;

        console.log('[ElectronDataProvider] Updated stream record with sensor data');
    }

    // Get current stream record (simulates GET /api/connections/device/{deviceId})
    getDeviceStreamResponse() {
        return this.streamRecord;
    }

    // Public method to reprocess cached config when visualization window opens
    reprocessCachedConfig(): void {
        if (this.streamRecord?.configPayload) {
            console.log('[ElectronDataProvider] Reprocessing cached config data');
            this.processConfigData(this.streamRecord.configPayload);
        } else {
            console.log('[ElectronDataProvider] No cached config data to reprocess');
        }
    }

    // Public method to reprocess cached sensor data
    reprocessCachedSensorData(): void {
        if (this.streamRecord?.sensorPayload) {
            console.log('[ElectronDataProvider] Reprocessing cached sensor data');
            this.processSensorData(this.streamRecord.sensorPayload);
        } else {
            console.log('[ElectronDataProvider] No cached sensor data to reprocess');
        }
    }

    // Data transformation methods
    private processConfigData(rawConfig: any): void {
        try {
            console.log('[ElectronDataProvider] Transforming config...');
            
            // Transform to the format VirtualScreenViewer expects
            const transformedConfig: RiveConfig = {
                type: "rive_config",
                screenId: rawConfig.screenId || "default",
                frameConfig: {
                    // VirtualScreenViewer checks both paths - provide both
                    frameConfig: rawConfig.frameConfig?.frameConfig || rawConfig.frameConfig,
                    ...(rawConfig.frameConfig?.frameConfig || rawConfig.frameConfig)  // Spread at top level too
                },
                frameElements: rawConfig.frameElements || []
            };

            // Extract Rive file URL for BackgroundRenderer
            const riveConfig = rawConfig.frameConfig?.frameConfig?.rive || rawConfig.frameConfig?.rive;
            if (riveConfig?.fileUrl) {
                (transformedConfig as any).riveFile = riveConfig.fileUrl;
            }

            console.log('[ElectronDataProvider] Transformed config, calling callbacks');
            
            this.configCallbacks.forEach((callback) => {
                try {
                    callback(transformedConfig);
                } catch (error) {
                    console.error('[ElectronDataProvider] Error in config callback:', error);
                }
            });
        } catch (error) {
            console.error('[ElectronDataProvider] Error processing config data:', error);
        }
    }

    private processSensorData(rawSensorData: any): void {
        try {
            console.log('[ElectronDataProvider] Transforming sensor data...');
            
            // Minimal transformation - the structure already matches what we need
            const transformedData: SensorPayload = {
                type: "rive_sensor",
                screenId: rawSensorData.screenId || "default",
                sensors: rawSensorData.sensors || {}
            };

            console.log('[ElectronDataProvider] Transformed sensor data, calling callbacks');
            
            this.sensorCallbacks.forEach((callback) => {
                try {
                    callback(transformedData);
                } catch (error) {
                    console.error('[ElectronDataProvider] Error in sensor callback:', error);
                }
            });
        } catch (error) {
            console.error('[ElectronDataProvider] Error processing sensor data:', error);
        }
    }
}