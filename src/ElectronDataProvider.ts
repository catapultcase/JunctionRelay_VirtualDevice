/*
 * ElectronDataProvider.ts
 * 
 * Implements VirtualDisplayDataProvider interface for Electron IPC communication.
 * Translates Electron IPC events to the expected callback pattern for VirtualScreenViewer.
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
    private enabled: boolean = true;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private deviceId?: string;
    private isMounted: boolean = true;

    // Callback storage
    private configCallbacks: Array<(config: RiveConfig) => void> = [];
    private sensorCallbacks: Array<(data: SensorPayload) => void> = [];
    private statusCallbacks: Array<(status: ConnectionStatus) => void> = [];

    // IPC event handlers
    private handleRiveConfig?: (event: any, data: any) => void;
    private handleSensorData?: (event: any, data: any) => void;
    private handleDisplayJson?: (event: any, data: any) => void;

    constructor(options: ElectronDataProviderOptions = {}) {
        this.deviceId = options.deviceId;
        this.enabled = options.enabled ?? true;

        console.log(`[ElectronDataProvider] Initialized for device: ${this.deviceId || 'any'}`);
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

        console.log('[ElectronDataProvider] Connecting to IPC...');
        this.setConnectionStatus('connecting');
        this.setupIPCListeners();
        this.setConnectionStatus('connected');
    }

    disconnect(): void {
        console.log('[ElectronDataProvider] Disconnecting from IPC...');
        this.teardownIPCListeners();
        this.setConnectionStatus('disconnected');
    }

    isConnected(): boolean {
        return this.connectionStatus === 'connected';
    }

    cleanup(): void {
        console.log('[ElectronDataProvider] Cleaning up...');
        this.isMounted = false;
        this.teardownIPCListeners();

        // Clear all callbacks
        this.configCallbacks = [];
        this.sensorCallbacks = [];
        this.statusCallbacks = [];
    }

    // Private methods
    private setConnectionStatus(status: ConnectionStatus): void {
        if (this.connectionStatus !== status && this.isMounted) {
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

        console.log('[ElectronDataProvider] Setting up IPC listeners...');

        // Set up event handlers
        this.handleRiveConfig = (_event: any, data: any) => {
            if (!this.isMounted) return;
            console.log('[ElectronDataProvider] Received rive-config event');
            this.processConfigData(data);
        };

        this.handleSensorData = (_event: any, data: any) => {
            if (!this.isMounted) return;
            console.log('[ElectronDataProvider] Received rive-sensor-data event');
            this.processSensorData(data);
        };

        this.handleDisplayJson = (_event: any, data: any) => {
            if (!this.isMounted) return;
            console.log('[ElectronDataProvider] Received display:json event, type:', data?.type);
            if (data.type === 'rive_config') {
                this.processConfigData(data);
            } else if (data.type === 'rive_sensor') {
                this.processSensorData(data);
            }
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
    }

    private processConfigData(rawConfig: any): void {
        if (!this.isMounted) return;
        
        try {
            console.log('[ElectronDataProvider] RAW CONFIG RECEIVED:');
            console.log(JSON.stringify(rawConfig, null, 2));
            
            // Transform the Electron format to VirtualDisplayDataProvider format
            const transformedConfig = this.transformConfigFormat(rawConfig);
            
            console.log('[ElectronDataProvider] TRANSFORMED CONFIG:');
            console.log(JSON.stringify(transformedConfig, null, 2));
            
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
        if (!this.isMounted) return;
        
        try {
            console.log('[ElectronDataProvider] RAW SENSOR DATA RECEIVED:');
            console.log(JSON.stringify(rawSensorData, null, 2));
            
            // Transform the Electron format to VirtualDisplayDataProvider format
            const transformedData = this.transformSensorFormat(rawSensorData);
            
            console.log('[ElectronDataProvider] TRANSFORMED SENSOR DATA:');
            console.log(JSON.stringify(transformedData, null, 2));
            
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

    private transformConfigFormat(electronConfig: any): RiveConfig {
        console.log('[ElectronDataProvider] TRANSFORM CONFIG - Input analysis:', {
            type: electronConfig.type,
            screenId: electronConfig.screenId,
            hasFrameConfig: !!electronConfig.frameConfig,
            frameConfigKeys: electronConfig.frameConfig ? Object.keys(electronConfig.frameConfig) : [],
            hasFrameElements: !!electronConfig.frameElements,
            elementCount: electronConfig.frameElements?.length || 0,
            
            // Deep inspection of frameConfig structure
            frameConfigStructure: this.analyzeFrameConfigStructure(electronConfig.frameConfig)
        });

        // FIXED: Handle the nested frameConfig structure properly
        let actualFrameConfig = electronConfig.frameConfig || {};
        
        // If frameConfig has a nested frameConfig, use the nested one (it has the real data)
        if (actualFrameConfig.frameConfig && typeof actualFrameConfig.frameConfig === 'object') {
            console.log('[ElectronDataProvider] FOUND NESTED frameConfig - using nested data');
            actualFrameConfig = actualFrameConfig.frameConfig;
        }
        
        console.log('[ElectronDataProvider] TRANSFORM CONFIG - Using frameConfig:');
        console.log(JSON.stringify(actualFrameConfig, null, 2));
        
        // Build the result with the exact nesting VirtualScreenViewer expects
        const result: RiveConfig = {
            type: "rive_config",
            screenId: electronConfig.screenId || "default",
            frameConfig: {
                // VirtualScreenViewer checks both paths - provide both
                frameConfig: actualFrameConfig,
                ...actualFrameConfig  // Spread the actual config at top level too
            },
            frameElements: electronConfig.frameElements || []
        };

        // Extract Rive file for BackgroundRenderer
        const riveConfig = actualFrameConfig?.rive;
        
        console.log('[ElectronDataProvider] TRANSFORM CONFIG - Rive config search:', {
            foundRiveConfig: !!riveConfig,
            riveConfigKeys: riveConfig ? Object.keys(riveConfig) : [],
            file: riveConfig?.file,
            fileUrl: riveConfig?.fileUrl
        });
        
        if (riveConfig?.file || riveConfig?.fileUrl) {
            let riveFileUrl = riveConfig.fileUrl || riveConfig.file;
            
            // Ensure it's a full URL for BackgroundRenderer
            if (riveFileUrl && !riveFileUrl.startsWith('http')) {
                riveFileUrl = `http://localhost:7180/api/frameengine/rive-files/${riveFileUrl}/content`;
            }
            
            // Add to top level for BackgroundRenderer to find
            (result as any).riveFile = riveFileUrl;
            
            console.log('[ElectronDataProvider] TRANSFORM CONFIG - Set riveFile at top level:', riveFileUrl);
        }

        console.log('[ElectronDataProvider] TRANSFORM CONFIG - Final result analysis:', {
            type: result.type,
            screenId: result.screenId,
            hasNestedFrameConfig: !!result.frameConfig?.frameConfig,
            hasTopLevelCanvas: !!result.frameConfig?.canvas,
            hasNestedCanvas: !!result.frameConfig?.frameConfig?.canvas,
            canvasFromTopLevel: result.frameConfig?.canvas ? 
                `${result.frameConfig.canvas.width}x${result.frameConfig.canvas.height}` : 'none',
            canvasFromNested: result.frameConfig?.frameConfig?.canvas ? 
                `${result.frameConfig.frameConfig.canvas.width}x${result.frameConfig.frameConfig.canvas.height}` : 'none',
            elementCount: result.frameElements?.length || 0,
            topLevelRiveFile: (result as any).riveFile,
            
            // Background analysis
            backgroundFromTopLevel: result.frameConfig?.background,
            backgroundFromNested: result.frameConfig?.frameConfig?.background
        });

        return result;
    }

    private analyzeFrameConfigStructure(frameConfig: any): any {
        if (!frameConfig) return null;
        
        return {
            keys: Object.keys(frameConfig),
            hasCanvas: !!frameConfig.canvas,
            hasBackground: !!frameConfig.background,
            hasRive: !!frameConfig.rive,
            hasNestedFrameConfig: !!frameConfig.frameConfig,
            
            // Canvas details
            canvas: frameConfig.canvas ? {
                width: frameConfig.canvas.width,
                height: frameConfig.canvas.height,
                orientation: frameConfig.canvas.orientation
            } : null,
            
            // Background details
            background: frameConfig.background ? {
                type: frameConfig.background.type,
                color: frameConfig.background.color
            } : null,
            
            // Rive details
            rive: frameConfig.rive ? {
                enabled: frameConfig.rive.enabled,
                file: frameConfig.rive.file,
                fileUrl: frameConfig.rive.fileUrl,
                hasDiscovery: !!frameConfig.rive.discovery
            } : null,
            
            // Nested structure if exists
            nested: frameConfig.frameConfig ? this.analyzeFrameConfigStructure(frameConfig.frameConfig) : null
        };
    }

    private transformSensorFormat(electronSensorData: any): SensorPayload {
        console.log('[ElectronDataProvider] TRANSFORM SENSOR - Input:', {
            type: electronSensorData.type,
            screenId: electronSensorData.screenId,
            sensorsCount: electronSensorData.sensors ? Object.keys(electronSensorData.sensors).length : 0,
            sensorsKeys: electronSensorData.sensors ? Object.keys(electronSensorData.sensors) : []
        });
        
        // Minimal transformation - preserve the original structure
        const result: SensorPayload = {
            type: "rive_sensor",
            screenId: electronSensorData.screenId || "default",
            sensors: electronSensorData.sensors || {}
        };

        console.log('[ElectronDataProvider] TRANSFORM SENSOR - Result:', {
            type: result.type,
            screenId: result.screenId,
            sensorsCount: Object.keys(result.sensors).length,
            firstThreeSensors: Object.entries(result.sensors).slice(0, 3).map(([key, value]: [string, any]) => ({
                key,
                value: value?.value,
                unit: value?.unit,
                displayValue: value?.displayValue
            }))
        });

        return result;
    }
} 