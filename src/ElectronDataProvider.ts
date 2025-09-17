/*
 * ElectronDataProvider.ts
 * 
 * Simplified singleton - just forwards IPC events, no caching
 */

import {
    VirtualDisplayDataProvider,
    RiveConfig,
    SensorPayload,
    ConnectionStatus
} from './shared/interfaces/VirtualDisplayDataProvider';

interface ElectronDataProviderOptions {
    enabled?: boolean;
}

export class ElectronDataProvider implements VirtualDisplayDataProvider {
    private static instance: ElectronDataProvider | null = null;
    
    private enabled: boolean = true;
    private connectionStatus: ConnectionStatus = 'disconnected';

    // Callback storage
    private configCallbacks: Array<(config: RiveConfig) => void> = [];
    private sensorCallbacks: Array<(data: SensorPayload) => void> = [];
    private statusCallbacks: Array<(status: ConnectionStatus) => void> = [];

    // IPC event handlers
    private handleRiveConfig?: (event: any, data: any) => void;
    private handleSensorData?: (event: any, data: any) => void;

    private constructor(options: ElectronDataProviderOptions = {}) {
        this.enabled = options.enabled ?? true;
    }

    public static getInstance(options?: ElectronDataProviderOptions): ElectronDataProvider {
        if (!ElectronDataProvider.instance) {
            ElectronDataProvider.instance = new ElectronDataProvider(options);
        }
        return ElectronDataProvider.instance;
    }

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
            if (index > -1) this.configCallbacks.splice(index, 1);
        };
    }

    onSensorDataReceived(callback: (data: SensorPayload) => void): () => void {
        this.sensorCallbacks.push(callback);
        return () => {
            const index = this.sensorCallbacks.indexOf(callback);
            if (index > -1) this.sensorCallbacks.splice(index, 1);
        };
    }

    onConnectionStatusChanged(callback: (status: ConnectionStatus) => void): () => void {
        this.statusCallbacks.push(callback);
        return () => {
            const index = this.statusCallbacks.indexOf(callback);
            if (index > -1) this.statusCallbacks.splice(index, 1);
        };
    }

    connect(): void {
        if (!this.enabled || !window.ipcRenderer) {
            this.setConnectionStatus('error');
            return;
        }

        if (this.connectionStatus === 'connected') return;

        this.setConnectionStatus('connecting');
        this.setupIPCListeners();
        this.setConnectionStatus('connected');
    }

    disconnect(): void {
        // Keep singleton alive but can disconnect if needed
    }

    isConnected(): boolean {
        return this.connectionStatus === 'connected';
    }

    cleanup(): void {
        this.teardownIPCListeners();
        this.setConnectionStatus('disconnected');
        this.configCallbacks = [];
        this.sensorCallbacks = [];
        this.statusCallbacks = [];
    }

    // Simplified - no caching, just direct forwarding
    private setupIPCListeners(): void {
        if (!window.ipcRenderer || this.handleRiveConfig) return;

        this.handleRiveConfig = (_event: any, data: any) => {
            const transformedConfig: RiveConfig = {
                type: "rive_config",
                screenId: data.screenId || "default",
                frameConfig: {
                    frameConfig: data.frameConfig?.frameConfig || data.frameConfig,
                    ...(data.frameConfig?.frameConfig || data.frameConfig)
                },
                frameElements: data.frameElements || []
            };

            // Add Rive file URL if present
            const riveConfig = data.frameConfig?.frameConfig?.rive || data.frameConfig?.rive;
            if (riveConfig?.fileUrl) {
                (transformedConfig as any).riveFile = riveConfig.fileUrl;
            }

            this.configCallbacks.forEach(callback => {
                try {
                    callback(transformedConfig);
                } catch (error) {
                    console.error('[ElectronDataProvider] Error in config callback:', error);
                }
            });
        };

        this.handleSensorData = (_event: any, data: any) => {
            const transformedData: SensorPayload = {
                type: "rive_sensor",
                screenId: data.screenId || "default",
                sensors: data.sensors || {}
            };

            this.sensorCallbacks.forEach(callback => {
                try {
                    callback(transformedData);
                } catch (error) {
                    console.error('[ElectronDataProvider] Error in sensor callback:', error);
                }
            });
        };

        window.ipcRenderer.on("rive-config", this.handleRiveConfig);
        window.ipcRenderer.on("rive-sensor-data", this.handleSensorData);
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
    }

    private setConnectionStatus(status: ConnectionStatus): void {
        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.statusCallbacks.forEach(callback => {
                try {
                    callback(status);
                } catch (error) {
                    console.error('[ElectronDataProvider] Error in status callback:', error);
                }
            });
        }
    }


}