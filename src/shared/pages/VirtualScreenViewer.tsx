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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    IconButton,
} from '@mui/material';
import {
    Launch,
    Refresh,
} from '@mui/icons-material';
import {
    VirtualDisplayDataProvider,
    RiveConfig,
    SensorPayload,
} from '../interfaces/VirtualDisplayDataProvider';
import { WebSocketDataProvider } from '../providers/WebSocketDataProvider';
import {
    FrameEngine_ElementRenderer,
    BaseElement,
    RendererConfig
} from '../components/FrameEngine_ElementRenderer';
import {
    FrameEngine_BackgroundRenderer,
    BackgroundConfig,
    DiscoveredStateMachine
} from '../components/FrameEngine_BackgroundRenderer';

interface CanvasConfig {
    width: number;
    height: number;
    backgroundColor: string;
    elementPadding: number;
}

interface VirtualScreenViewerProps {
    deviceId?: string;
    containerHeight?: number;
    deviceData?: any;
    isStandalone?: boolean;
    showControls?: boolean;
    onFullscreenClick?: () => void;
}

interface VirtualScreenViewerComponentProps extends VirtualScreenViewerProps {
    dataProvider: VirtualDisplayDataProvider;
}

export const VirtualScreenViewerComponent: React.FC<VirtualScreenViewerComponentProps> = ({
    deviceId: propDeviceId,
    containerHeight,
    deviceData: providedDeviceData,
    isStandalone = false,
    showControls = true,
    onFullscreenClick,
    dataProvider
}) => {
    const { deviceId: urlDeviceId } = useParams<{ deviceId: string }>();
    const location = useLocation();

    const deviceId = propDeviceId || urlDeviceId;
    const isScreenshotMode = location.pathname.includes('/fullscreen');
    const shouldShowControls = showControls && !isScreenshotMode;
    const isEmbedded = !isStandalone && containerHeight !== undefined;

    // Detect if we're running in Puppeteer (simplified detection)
    const isPuppeteerMode = typeof window !== 'undefined' && (
        window.navigator.userAgent.includes('HeadlessChrome') ||
        window.navigator.webdriver ||
        (window as any).puppeteerMode ||
        isScreenshotMode
    );

    // Core state
    const [device, setDevice] = useState<any>(null);
    const [canvasConfig, setCanvasConfig] = useState<CanvasConfig | null>(null);
    const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Sensor processing state
    const [riveConfig, setRiveConfig] = useState<RiveConfig | null>(null);
    const [currentSensorData, setSensorData] = useState<Record<string, any>>({});
    const [displayElements, setDisplayElements] = useState<BaseElement[]>([]);
    const [discoveredMachines, setDiscoveredMachines] = useState<DiscoveredStateMachine[]>([]);

    // Refs for sensor processing
    const backgroundInputs = useRef<Record<string, any>>({});
    const isMountedRef = useRef(true);

    // Load device details
    useEffect(() => {
        if (!deviceId) {
            setError('No device ID provided');
            setLoading(false);
            return;
        }

        if (providedDeviceData) {
            setDevice(providedDeviceData);
            setLoading(false);
            return;
        }

        const loadDevice = async () => {
            try {
                const response = await fetch(`/api/devices/${deviceId}`);
                if (!response.ok) {
                    throw new Error(`Failed to load device: ${response.status}`);
                }
                const deviceData = await response.json();
                setDevice(deviceData);
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load device');
                setLoading(false);
            }
        };

        loadDevice();
    }, [deviceId, providedDeviceData]);

    // Extract display elements from config and convert to BaseElement format
    const extractDisplayElements = useCallback((config: RiveConfig) => {
        const elements = config.frameElements || [];
        const baseElements: BaseElement[] = elements.map(element => ({
            id: element.id,
            type: element.type as BaseElement['type'],
            position: {
                x: element.position.x,
                y: element.position.y,
                width: element.position.width,
                height: element.position.height,
            },
            properties: element.properties,
        }));

        setDisplayElements(baseElements);
        return baseElements;
    }, []);

    // Helper function to check if a sensor tag has onscreen elements
    const hasOnscreenElement = useCallback((sensorTag: string) => {
        return displayElements.some(element => {
            if (element.type === 'sensor' && element.properties.sensorTag) {
                return element.properties.sensorTag === sensorTag;
            }
            return false;
        });
    }, [displayElements]);

    // Helper function to check if sensor data exists for onscreen elements (including comma-separated keys)
    const hasMatchingSensorData = useCallback((sensorTag: string, sensorPayload: SensorPayload) => {
        // Direct match
        if (sensorPayload.sensors[sensorTag]) {
            return true;
        }

        // Check if this sensor tag appears in any comma-separated keys
        return Object.keys(sensorPayload.sensors).some(key =>
            key.includes(',') && key.split(',').map(tag => tag.trim()).includes(sensorTag)
        );
    }, []);

    // Update background inputs based on sensor data
    const updateBackgroundInputs = useCallback((sensorPayload: SensorPayload) => {
        if (!discoveredMachines.length) return;

        const newInputs: Record<string, any> = { ...backgroundInputs.current };
        let hasChanges = false;

        // Process each sensor in the payload
        Object.entries(sensorPayload.sensors).forEach(([sensorKey, sensorData]) => {
            // Handle comma-separated sensor tags
            const sensorTags = sensorKey.includes(',')
                ? sensorKey.split(',').map(tag => tag.trim())
                : [sensorKey];

            sensorTags.forEach(sensorTag => {
                // Check if any discovered machine has an input matching this sensor tag
                const inputExists = discoveredMachines.some(machine =>
                    machine.inputs.some(input => input.name === sensorTag)
                );

                if (inputExists) {
                    const oldValue = newInputs[sensorTag];
                    const newValue = sensorData.value;

                    if (oldValue !== newValue) {
                        newInputs[sensorTag] = newValue;
                        hasChanges = true;
                        console.log(`Background input "${sensorTag}" updated: ${oldValue} -> ${newValue}`);
                    }
                }
            });
        });

        if (hasChanges) {
            backgroundInputs.current = newInputs;
        }
    }, [discoveredMachines]);

    // Process sensor data
    const processSensorData = useCallback((sensorPayload: SensorPayload) => {
        if (!isMountedRef.current || !riveConfig || sensorPayload.screenId !== riveConfig.screenId) {
            return;
        }

        setSensorData(sensorPayload.sensors);

        // Update background inputs if we have discovered machines
        updateBackgroundInputs(sensorPayload);

        // Track which sensors were successfully processed
        const processedSensors = new Set<string>();

        // Mark sensors as processed if they have onscreen elements or background inputs
        Object.keys(sensorPayload.sensors).forEach(sensorKey => {
            if (sensorKey.includes(',')) {
                const tags = sensorKey.split(',').map(tag => tag.trim());
                tags.forEach(tag => {
                    if (hasOnscreenElement(tag) || backgroundInputs.current.hasOwnProperty(tag)) {
                        processedSensors.add(tag);
                    }
                });
            } else {
                if (hasOnscreenElement(sensorKey) || backgroundInputs.current.hasOwnProperty(sensorKey)) {
                    processedSensors.add(sensorKey);
                }
            }
        });

        // Log sensor data when it changes
        console.log('New sensor data:');
        Object.entries(sensorPayload.sensors).forEach(([tag, data]: [string, any], index) => {
            console.log(`  ${index + 1}. "${tag}": ${data.displayValue || `${data.value} ${data.unit || ''}`}`);
        });

        // Check for sensors that weren't successfully processed anywhere
        const allSensorTags = new Set<string>();

        // Collect all individual sensor tags from the payload
        Object.keys(sensorPayload.sensors).forEach(key => {
            if (key.includes(',')) {
                key.split(',').map(tag => tag.trim()).forEach(tag => allSensorTags.add(tag));
            } else {
                allSensorTags.add(key);
            }
        });

        // Log failures only for sensors that weren't processed anywhere
        allSensorTags.forEach(sensorTag => {
            if (!processedSensors.has(sensorTag)) {
                const hasOnscreen = hasOnscreenElement(sensorTag);
                const hasData = hasMatchingSensorData(sensorTag, sensorPayload);
                const hasBackground = backgroundInputs.current.hasOwnProperty(sensorTag);
                console.log(`   Failed to process sensor "${sensorTag}" - no valid target found (hasOnscreen: ${hasOnscreen}, hasData: ${hasData}, hasBackground: ${hasBackground})`);
            }
        });

    }, [riveConfig, hasOnscreenElement, hasMatchingSensorData, updateBackgroundInputs]);

    // Handle background discovery
    const handleBackgroundDiscovery = useCallback((machines: DiscoveredStateMachine[]) => {
        console.log('Background discovered state machines:', machines);
        setDiscoveredMachines(machines);

        // Initialize background inputs based on discovered machines
        const initialInputs: Record<string, any> = {};
        machines.forEach(machine => {
            machine.inputs.forEach(input => {
                if (input.currentValue !== null) {
                    initialInputs[input.name] = input.currentValue;
                }
            });
        });
        backgroundInputs.current = initialInputs;
    }, []);

    // Process configuration data from WebSocket
    useEffect(() => {
        if (loading || error) return;

        const processConfigData = (config: RiveConfig) => {
            console.log('Processing config data:', config);

            const canvas = config.frameConfig?.frameConfig?.canvas || config.frameConfig?.canvas;
            const background = config.frameConfig?.frameConfig?.background || config.frameConfig?.background;

            console.log('Canvas config:', canvas);
            console.log('Background config:', background);

            // Extract element padding from canvas settings if available
            let elementPadding = 4; // Default to 4px

            // Try multiple possible paths for the settings
            if ((canvas as any)?.settings?.elementPadding !== undefined) {
                elementPadding = (canvas as any).settings.elementPadding;
                console.log('Found elementPadding in canvas.settings:', elementPadding);
            } else if ((canvas as any)?.elementPadding !== undefined) {
                elementPadding = (canvas as any).elementPadding;
                console.log('Found elementPadding directly on canvas:', elementPadding);
            } else {
                console.log('No elementPadding found, using default:', elementPadding);
            }

            const canvasInfo: CanvasConfig = {
                width: canvas?.width || 400,
                height: canvas?.height || 1280,
                backgroundColor: background?.color || '#000000',
                elementPadding: elementPadding,
            };

            // Create background configuration - FIXED: Get Rive data from top-level config
            const bgConfig: BackgroundConfig = {
                type: (background?.type as 'color' | 'image' | 'rive') || 'color',
                color: background?.color,
                imageUrl: (background as any)?.imageUrl,
                // FIXED: Get Rive file and state machine from top-level config, not background
                riveFile: (config as any).riveFile || (background as any)?.riveFile,
                riveStateMachine: (config as any).riveStateMachine || (background as any)?.riveStateMachine,
                riveInputs: backgroundInputs.current, // Use current inputs
            };

            console.log('Final canvas info:', canvasInfo);
            console.log('Final background config:', bgConfig);

            setCanvasConfig(canvasInfo);
            setBackgroundConfig(bgConfig);
            setRiveConfig(config);
            extractDisplayElements(config);
            setIsReady(true);
        };

        const unsubscribeConfig = dataProvider.onConfigurationReceived(processConfigData);
        const unsubscribeSensor = dataProvider.onSensorDataReceived(processSensorData);

        dataProvider.connect();

        return () => {
            unsubscribeConfig();
            unsubscribeSensor();
        };
    }, [loading, error, dataProvider, processSensorData, extractDisplayElements]);

    // Update background config when background inputs change
    useEffect(() => {
        if (backgroundConfig && Object.keys(backgroundInputs.current).length > 0) {
            setBackgroundConfig(prev => prev ? {
                ...prev,
                riveInputs: backgroundInputs.current
            } : null);
        }
    }, [backgroundConfig, discoveredMachines]); // FIXED: Depend on discoveredMachines instead of currentSensorData

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Create renderer configuration for viewer mode
    const rendererConfig: RendererConfig = useMemo(() => ({
        elementPadding: canvasConfig?.elementPadding || 4,
        isInteractive: false, // Viewer is never interactive
        showPlaceholders: false, // Viewer shows "NO DATA" instead of placeholders
    }), [canvasConfig?.elementPadding]);

    // Handle fullscreen click
    const handleFullscreenClick = () => {
        if (isEmbedded) {
            if (onFullscreenClick) {
                onFullscreenClick();
            } else {
                window.open(`/device/${deviceId}/virtual-screen`, "_blank");
            }
        }
    };

    const reconnect = () => {
        dataProvider.connect();
    };

    // RENDER LOGIC

    if (loading) {
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: isEmbedded ? containerHeight : '100vh',
                gap: 2,
            }}>
                <CircularProgress size={40} />
                <Typography variant="body2">Loading virtual screen...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!isReady || !canvasConfig || !backgroundConfig) {
        return (
            <Box sx={{
                height: isEmbedded ? containerHeight : '100vh',
                backgroundColor: '#000',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isEmbedded ? '14px' : '18px',
            }}>
                <Typography variant={isEmbedded ? "subtitle2" : "h5"} gutterBottom>
                    {device?.name || 'Virtual Screen'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Waiting for configuration...
                </Typography>
            </Box>
        );
    }

    // Puppeteer/Screenshot mode - simplified fullscreen render
    if (isPuppeteerMode || isScreenshotMode) {
        return (
            <div
                data-testid="virtual-screen-container"
                style={{
                    width: canvasConfig.width,
                    height: canvasConfig.height,
                    backgroundColor: canvasConfig.backgroundColor,
                    margin: 0,
                    padding: 0,
                    border: 'none',
                    outline: 'none',
                    overflow: 'hidden',
                    position: 'relative',
                    boxSizing: 'border-box'
                }}
            >
                {/* Background layer */}
                <FrameEngine_BackgroundRenderer
                    config={backgroundConfig}
                    width={canvasConfig.width}
                    height={canvasConfig.height}
                    fit="none"
                    onRiveDiscovery={handleBackgroundDiscovery}
                />

                {/* Element overlays using shared renderer */}
                <FrameEngine_ElementRenderer
                    elements={displayElements}
                    config={rendererConfig}
                    sensorData={currentSensorData}
                />
            </div>
        );
    }

    // Embedded mode
    if (isEmbedded) {
        return (
            <Box sx={{
                position: 'relative',
                width: '100%',
                height: containerHeight,
                backgroundColor: canvasConfig.backgroundColor,
                borderRadius: 1,
                overflow: 'hidden'
            }}>
                {/* Background layer */}
                <FrameEngine_BackgroundRenderer
                    config={backgroundConfig}
                    width={containerHeight ? Math.round((containerHeight / canvasConfig.height) * canvasConfig.width) : canvasConfig.width}
                    height={containerHeight || canvasConfig.height}
                    fit="contain"
                    onRiveDiscovery={handleBackgroundDiscovery}
                />

                {/* Element overlays using shared renderer */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1,
                }}>
                    <FrameEngine_ElementRenderer
                        elements={displayElements}
                        config={rendererConfig}
                        sensorData={currentSensorData}
                    />
                </div>

                {/* Control buttons */}
                {shouldShowControls && (
                    <Box sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 1,
                        zIndex: 1000,
                    }}>
                        <IconButton
                            size="small"
                            onClick={handleFullscreenClick}
                            sx={{
                                color: 'white',
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' }
                            }}
                            title="Open in fullscreen"
                        >
                            <Launch fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={reconnect}
                            sx={{
                                color: 'lightgreen',
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' }
                            }}
                            title="Reconnect"
                        >
                            <Refresh fontSize="small" />
                        </IconButton>
                    </Box>
                )}

                {/* Status indicator */}
                {shouldShowControls && (
                    <Box sx={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        color: '#00ff00',
                        padding: '6px 10px',
                        borderRadius: 1,
                        fontSize: '12px',
                        fontWeight: 'bold',
                        zIndex: 1000,
                        border: '1px solid #00ff00',
                    }}>
                        <Typography variant="caption" sx={{ fontSize: '12px', fontWeight: 'bold', color: '#00ff00' }}>
                            {canvasConfig.width}×{canvasConfig.height}
                        </Typography>
                    </Box>
                )}

                {/* Sensor data debug indicator */}
                {shouldShowControls && (
                    <Box sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        color: '#00ff00',
                        padding: '6px 10px',
                        borderRadius: 1,
                        fontSize: '12px',
                        fontWeight: 'bold',
                        zIndex: 1000,
                        border: '1px solid #00ff00',
                    }}>
                        <Typography variant="caption" sx={{ fontSize: '12px', fontWeight: 'bold', color: '#00ff00' }}>
                            Sensors: {Object.keys(currentSensorData).length} | Elements: {displayElements.length}
                        </Typography>
                    </Box>
                )}
            </Box>
        );
    }

    // Standalone/fullscreen mode
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            margin: 0,
            padding: 0,
            backgroundColor: canvasConfig.backgroundColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div
                data-testid="virtual-screen-container"
                style={{
                    width: canvasConfig.width,
                    height: canvasConfig.height,
                    position: 'relative'
                }}
            >
                {/* Background layer */}
                <FrameEngine_BackgroundRenderer
                    config={backgroundConfig}
                    width={canvasConfig.width}
                    height={canvasConfig.height}
                    fit="none"
                    onRiveDiscovery={handleBackgroundDiscovery}
                />

                {/* Element overlays using shared renderer */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1,
                }}>
                    <FrameEngine_ElementRenderer
                        elements={displayElements}
                        config={rendererConfig}
                        sensorData={currentSensorData}
                    />
                </div>
            </div>
        </div>
    );
};

const VirtualScreenViewer: React.FC<VirtualScreenViewerProps> = (props) => {
    const { deviceId: urlDeviceId } = useParams<{ deviceId: string }>();

    const deviceId = props.deviceId || urlDeviceId;

    const dataProvider = useMemo(() => {
        return new WebSocketDataProvider({
            deviceId,
            enabled: true,
            defaultPollRate: 250
        });
    }, [deviceId]);

    useEffect(() => {
        return () => {
            dataProvider.cleanup();
        };
    }, [dataProvider]);

    return (
        <VirtualScreenViewerComponent
            {...props}
            deviceId={deviceId}
            dataProvider={dataProvider}
        />
    );
};

export default VirtualScreenViewer;