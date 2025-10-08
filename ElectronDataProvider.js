/*
 * ElectronDataProvider.js
 * 
 * Electron IPC-based data provider for VirtualScreenViewer
 * Implements VirtualDisplayDataProvider interface
 * 
 * SINGLETON: Designed to persist across component mounts/unmounts
 */

class ElectronDataProvider {
    static instance = null;
    
    constructor(options = {}) {
        this.enabled = options.enabled ?? true;
        this.connectionStatus = 'disconnected';

        // Callback storage - never cleared except on full reset
        this.configCallbacks = [];
        this.sensorCallbacks = [];
        this.statusCallbacks = [];

        // IPC event handlers - persist for singleton lifetime
        this.handleRiveConfig = null;
        this.handleSensorData = null;
    }

    static getInstance(options) {
        if (!ElectronDataProvider.instance) {
            ElectronDataProvider.instance = new ElectronDataProvider(options);
        }
        return ElectronDataProvider.instance;
    }

    static resetInstance() {
        if (ElectronDataProvider.instance) {
            const instance = ElectronDataProvider.instance;
            instance.teardownIPCListeners();
            instance.configCallbacks = [];
            instance.sensorCallbacks = [];
            instance.statusCallbacks = [];
            instance.setConnectionStatus('disconnected');
            ElectronDataProvider.instance = null;
            console.log('[ElectronDataProvider] Instance reset');
        }
    }

    // Interface implementation
    onConfigurationReceived(callback) {
        this.configCallbacks.push(callback);
        console.log(`[ElectronDataProvider] Config callback added (total: ${this.configCallbacks.length})`);
        
        return () => {
            const index = this.configCallbacks.indexOf(callback);
            if (index > -1) {
                this.configCallbacks.splice(index, 1);
                console.log(`[ElectronDataProvider] Config callback removed (remaining: ${this.configCallbacks.length})`);
            }
        };
    }

    onSensorDataReceived(callback) {
        this.sensorCallbacks.push(callback);
        console.log(`[ElectronDataProvider] Sensor callback added (total: ${this.sensorCallbacks.length})`);
        
        return () => {
            const index = this.sensorCallbacks.indexOf(callback);
            if (index > -1) {
                this.sensorCallbacks.splice(index, 1);
                console.log(`[ElectronDataProvider] Sensor callback removed (remaining: ${this.sensorCallbacks.length})`);
            }
        };
    }

    onConnectionStatusChanged(callback) {
        this.statusCallbacks.push(callback);
        console.log(`[ElectronDataProvider] Status callback added (total: ${this.statusCallbacks.length})`);
        
        // Immediately call with current status
        setTimeout(() => {
            try {
                callback(this.connectionStatus);
            } catch (error) {
                console.error('[ElectronDataProvider] Error in immediate status callback:', error);
            }
        }, 0);
        
        return () => {
            const index = this.statusCallbacks.indexOf(callback);
            if (index > -1) {
                this.statusCallbacks.splice(index, 1);
                console.log(`[ElectronDataProvider] Status callback removed (remaining: ${this.statusCallbacks.length})`);
            }
        };
    }

    connect() {
        const { ipcRenderer } = require('electron');
        
        if (!this.enabled || !ipcRenderer) {
            console.error('[ElectronDataProvider] Cannot connect - IPC not available');
            this.setConnectionStatus('error');
            return;
        }

        if (this.connectionStatus === 'connected') {
            console.log('[ElectronDataProvider] Already connected');
            return;
        }

        console.log('[ElectronDataProvider] Connecting...');
        this.setConnectionStatus('connecting');
        this.setupIPCListeners();
        this.setConnectionStatus('connected');
    }

    disconnect() {
        // IMPORTANT: Do nothing for singleton
        // VirtualScreenViewer calls this on unmount, but we want to stay connected
        console.log('[ElectronDataProvider] Disconnect called (ignored - singleton stays alive)');
    }

    isConnected() {
        return this.connectionStatus === 'connected';
    }

    cleanup() {
        // IMPORTANT: Do nothing for singleton
        // VirtualScreenViewer calls this on unmount, but we want to stay connected
        // Callbacks are removed via their individual unsubscribe functions
        console.log('[ElectronDataProvider] Cleanup called (ignored - singleton stays alive)');
    }

    setupIPCListeners() {
        const { ipcRenderer } = require('electron');
        
        if (!ipcRenderer) {
            console.error('[ElectronDataProvider] IPC unavailable');
            return;
        }

        if (this.handleRiveConfig) {
            console.log('[ElectronDataProvider] IPC listeners already setup');
            return;
        }

        console.log('[ElectronDataProvider] Setting up IPC listeners');

        this.handleRiveConfig = (_event, data) => {
            console.log('[ElectronDataProvider] Received rive-config:', data);

            try {
                // Transform the data to match RiveConfig interface
                const transformedConfig = {
                    type: "rive_config",
                    screenId: data.screenId || "electron-virtual-device",
                    frameConfig: {
                        frameConfig: data.frameConfig?.frameConfig || data.frameConfig,
                        ...(data.frameConfig?.frameConfig || data.frameConfig)
                    },
                    frameElements: data.frameElements || []
                };

                // Add Rive file URL if present
                const riveConfig = data.frameConfig?.frameConfig?.rive || data.frameConfig?.rive;
                if (riveConfig?.fileUrl) {
                    transformedConfig.riveFile = riveConfig.fileUrl;
                }

                console.log(`[ElectronDataProvider] Notifying ${this.configCallbacks.length} config callbacks`);

                // Notify all callbacks
                this.configCallbacks.forEach((callback, index) => {
                    try {
                        callback(transformedConfig);
                        console.log(`[ElectronDataProvider] Config callback ${index + 1} succeeded`);
                    } catch (error) {
                        console.error(`[ElectronDataProvider] Error in config callback ${index + 1}:`, error);
                    }
                });
            } catch (error) {
                console.error('[ElectronDataProvider] Error processing config:', error);
            }
        };

        this.handleSensorData = (_event, data) => {
            console.log('[ElectronDataProvider] Received sensor data');

            try {
                // Transform to match SensorPayload interface
                const transformedData = {
                    type: "rive_sensor",
                    screenId: data.screenId || "electron-virtual-device",
                    sensors: data.sensors || {}
                };

                console.log(`[ElectronDataProvider] Notifying ${this.sensorCallbacks.length} sensor callbacks`);

                // Notify all callbacks
                this.sensorCallbacks.forEach((callback, index) => {
                    try {
                        callback(transformedData);
                    } catch (error) {
                        console.error(`[ElectronDataProvider] Error in sensor callback ${index + 1}:`, error);
                    }
                });
            } catch (error) {
                console.error('[ElectronDataProvider] Error processing sensor data:', error);
            }
        };

        ipcRenderer.on("rive-config", this.handleRiveConfig);
        ipcRenderer.on("rive-sensor-data", this.handleSensorData);
        console.log('[ElectronDataProvider] IPC listeners registered');
    }

    teardownIPCListeners() {
        const { ipcRenderer } = require('electron');
        if (!ipcRenderer) return;

        console.log('[ElectronDataProvider] Tearing down IPC listeners');

        if (this.handleRiveConfig) {
            ipcRenderer.off("rive-config", this.handleRiveConfig);
            this.handleRiveConfig = null;
        }

        if (this.handleSensorData) {
            ipcRenderer.off("rive-sensor-data", this.handleSensorData);
            this.handleSensorData = null;
        }
    }

    setConnectionStatus(status) {
        if (this.connectionStatus !== status) {
            console.log(`[ElectronDataProvider] Status changed: ${this.connectionStatus} -> ${status}`);
            this.connectionStatus = status;
            
            const callbacks = [...this.statusCallbacks];
            console.log(`[ElectronDataProvider] Notifying ${callbacks.length} status callbacks`);
            
            // Notify callbacks asynchronously
            setTimeout(() => {
                callbacks.forEach((callback, index) => {
                    try {
                        callback(status);
                    } catch (error) {
                        console.error(`[ElectronDataProvider] Error in status callback ${index + 1}:`, error);
                    }
                });
            }, 0);
        }
    }
}

module.exports = { ElectronDataProvider };