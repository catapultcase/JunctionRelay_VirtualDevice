import React, { useState, useEffect } from 'react';
import {
    useRive,
    Layout,
    Fit,
    Alignment,
} from '@rive-app/react-canvas';

// Types for Rive discovery
export interface DiscoveredInput {
    name: string;
    type: 'number' | 'boolean' | 'trigger' | 'unknown';
    currentValue?: any;
    ref?: any;
}

export interface DiscoveredStateMachine {
    name: string;
    inputNames: string[];
    inputs: DiscoveredInput[];
}

// Background configuration types
export interface BackgroundConfig {
    type: 'color' | 'image' | 'rive';
    color?: string;
    imageUrl?: string;
    riveFile?: string;
    riveStateMachine?: string;
    riveInputs?: Record<string, any>;
}

// Component props
interface FrameEngine_BackgroundRendererProps {
    config: BackgroundConfig;
    width: number;
    height: number;
    fit?: 'none' | 'contain' | 'cover';
    onRiveDiscovery?: (machines: DiscoveredStateMachine[]) => void;
    onRiveLoad?: () => void;
    onRiveError?: (error: any) => void;
}

export const FrameEngine_BackgroundRenderer: React.FC<FrameEngine_BackgroundRendererProps> = ({
    config,
    width,
    height,
    fit = 'none',
    onRiveDiscovery,
    onRiveLoad,
    onRiveError
}) => {
    const [discoveredInputs, setDiscoveredInputs] = useState<Record<string, any>>({});

    // Determine Rive options
    const riveOptions = React.useMemo(() => {
        if (config.type !== 'rive' || !config.riveFile) {
            return null;
        }

        const riveFileUrl = config.riveFile.startsWith('http')
            ? config.riveFile
            : `/api/frameengine/rive-files/${config.riveFile}/content`;

        let layoutFit: Fit;
        switch (fit) {
            case 'contain':
                layoutFit = Fit.Contain;
                break;
            case 'cover':
                layoutFit = Fit.Cover;
                break;
            default:
                layoutFit = Fit.None;
                break;
        }

        return {
            src: riveFileUrl,
            autoplay: true,
            layout: new Layout({
                fit: layoutFit,
                alignment: Alignment.Center
            }),
            onLoad: () => {
                console.log('✅ Rive background loaded:', config.riveFile);
                if (onRiveLoad) onRiveLoad();
            },
            onLoadError: (error: any) => {
                console.error('❌ Rive background load error:', error, { riveFile: config.riveFile });
                if (onRiveError) onRiveError(error);
            },
        };
    }, [config.type, config.riveFile, fit, onRiveLoad, onRiveError]);

    // Initialize Rive
    const { rive, RiveComponent } = useRive(riveOptions || { src: '', autoplay: false });

    // Discovery logic - extracts state machines and inputs
    useEffect(() => {
        if (!rive || config.type !== 'rive') return;

        let attempts = 0;
        let stopped = false;
        const maxAttempts = 20;

        const discoverMachinesAndInputs = () => {
            if (stopped || !rive) return;
            attempts++;

            try {
                // Get state machine names
                const smNames: string[] = Array.isArray(rive.stateMachineNames) ? rive.stateMachineNames : [];

                // Ensure machines are running so inputs wire up
                smNames.forEach((sm) => {
                    try { rive.play(sm); } catch { }
                });

                const machines: DiscoveredStateMachine[] = smNames.map((smName) => {
                    const inputs: DiscoveredInput[] = [];

                    try {
                        const rawInputs = rive.stateMachineInputs ? (rive.stateMachineInputs(smName) as any[]) : [];

                        rawInputs.forEach((rawInput) => {
                            if (rawInput?.name) {
                                const inputName = String(rawInput.name);
                                let inputType: DiscoveredInput['type'] = 'unknown';
                                let currentValue: any = null;
                                let hasValue = false;

                                // Probe input type
                                try {
                                    currentValue = rawInput.value;
                                    hasValue = true;

                                    if (typeof currentValue === 'number') {
                                        inputType = 'number';
                                    } else if (typeof currentValue === 'boolean') {
                                        inputType = 'boolean';
                                    }
                                } catch {
                                    // If no readable value, check for trigger
                                    try {
                                        if (typeof rawInput.fire === 'function') {
                                            inputType = 'trigger';
                                        }
                                    } catch { }
                                }

                                inputs.push({
                                    name: inputName,
                                    type: inputType,
                                    currentValue: hasValue ? currentValue : null,
                                    ref: rawInput
                                });
                            }
                        });
                    } catch (error) {
                        console.warn(`Failed to get inputs for state machine "${smName}":`, error);
                    }

                    return {
                        name: smName,
                        inputNames: inputs.map(i => i.name),
                        inputs
                    };
                });

                console.log('🔍 BackgroundRenderer discovered state machines:', machines);

                // Call the discovery callback
                if (onRiveDiscovery && machines.length > 0) {
                    onRiveDiscovery(machines);
                }

                // Continue polling if we haven't found everything
                const totalInputs = machines.reduce((sum, m) => sum + m.inputs.length, 0);
                if (totalInputs === 0 && attempts < maxAttempts) {
                    setTimeout(discoverMachinesAndInputs, 120 * attempts);
                }

            } catch (error) {
                console.error('Error during state machine discovery:', error);
                if (attempts < maxAttempts) {
                    setTimeout(discoverMachinesAndInputs, 120 * attempts);
                }
            }
        };

        discoverMachinesAndInputs();

        return () => {
            stopped = true;
        };
    }, [rive, config.type, onRiveDiscovery]);

    // Input binding logic - applies input values to Rive
    useEffect(() => {
        if (!rive || config.type !== 'rive' || !config.riveInputs) return;

        let attempts = 0;
        let stopped = false;
        const maxAttempts = 20;
        const inputRefs: Record<string, any> = {};

        const discoverAndBindInputs = () => {
            if (stopped || !rive) return;
            attempts++;

            try {
                // Get available state machines
                const smNames: string[] = Array.isArray(rive.stateMachineNames) ? rive.stateMachineNames : [];

                // Ensure machines are running so inputs wire up
                smNames.forEach((sm) => {
                    try { rive.play(sm); } catch { }
                });

                const newDiscoveredInputs: Record<string, any> = {};

                // Process each input we want to bind
                // Fix: Guard against undefined config.riveInputs
                Object.entries(config.riveInputs || {}).forEach(([inputKey, inputValue]) => {
                    // Parse the input key to extract state machine and input name
                    let targetMachine: string;
                    let inputName: string;

                    if (inputKey.includes('.')) {
                        // New format: "StateMachineName.InputName"
                        const parts = inputKey.split('.');
                        targetMachine = parts[0];
                        inputName = parts.slice(1).join('.'); // Handle input names with dots
                    } else {
                        // Legacy format: just "InputName" - use specified state machine or first available
                        targetMachine = config.riveStateMachine || smNames[0];
                        inputName = inputKey;
                    }

                    if (!targetMachine) {
                        console.warn(`⚠️ No target state machine found for input "${inputKey}"`);
                        return;
                    }

                    // Check if this state machine exists
                    if (!smNames.includes(targetMachine)) {
                        console.warn(`⚠️ State machine "${targetMachine}" not found. Available: ${smNames.join(', ')}`);
                        return;
                    }

                    console.log(`🔍 Looking for input "${inputName}" in state machine "${targetMachine}"`);

                    const machineInputs = rive.stateMachineInputs
                        ? (rive.stateMachineInputs(targetMachine) as any[])
                        : [];

                    const foundInput = machineInputs.find((i) => i?.name === inputName);

                    if (foundInput) {
                        inputRefs[inputKey] = foundInput; // Use original key for tracking

                        // Determine input type by probing
                        let inputType = 'unknown';
                        let hasValue = false;
                        let currentValue: any;

                        try {
                            currentValue = foundInput.value;
                            hasValue = true;

                            if (typeof currentValue === 'number') {
                                inputType = 'number';
                            } else if (typeof currentValue === 'boolean') {
                                inputType = 'boolean';
                            }
                        } catch {
                            // If no readable value, check for trigger
                            try {
                                if (typeof foundInput.fire === 'function') {
                                    inputType = 'trigger';
                                }
                            } catch { }
                        }

                        newDiscoveredInputs[inputKey] = {
                            ref: foundInput,
                            type: inputType,
                            currentValue: hasValue ? currentValue : null,
                            stateMachine: targetMachine,
                            inputName: inputName
                        };

                        // Apply the input value
                        try {
                            if (inputType === 'trigger') {
                                // For triggers, fire if the value is truthy
                                if (inputValue && typeof foundInput.fire === 'function') {
                                    foundInput.fire();
                                    console.log(`🔥 Fired trigger "${inputName}" in "${targetMachine}"`);
                                }
                            } else if (hasValue) {
                                // For number/boolean inputs
                                const newValue = inputType === 'boolean' ? Boolean(inputValue) : Number(inputValue) || 0;
                                foundInput.value = newValue;
                                console.log(`✅ Set "${inputName}" in "${targetMachine}" (${inputType}) to:`, newValue);
                            }
                        } catch (error) {
                            console.error(`❌ Error applying input "${inputName}" in "${targetMachine}":`, error);
                        }
                    } else {
                        console.warn(`⚠️ Input "${inputName}" not found in state machine "${targetMachine}"`);
                        console.log(`Available inputs in "${targetMachine}":`, machineInputs.map(i => i?.name).filter(Boolean));
                    }
                });

                setDiscoveredInputs(newDiscoveredInputs);

                // If we didn't find all inputs and haven't exhausted attempts, keep trying
                const foundCount = Object.keys(newDiscoveredInputs).length;
                // Fix: Guard against undefined config.riveInputs
                const expectedCount = Object.keys(config.riveInputs || {}).length;

                if (foundCount < expectedCount && attempts < maxAttempts) {
                    setTimeout(discoverAndBindInputs, 120 * attempts);
                }

            } catch (error) {
                console.error('Error during input discovery:', error);
                if (attempts < maxAttempts) {
                    setTimeout(discoverAndBindInputs, 120 * attempts);
                }
            }
        };

        discoverAndBindInputs();

        return () => {
            stopped = true;
            setDiscoveredInputs({});
        };
    }, [rive, config.type, config.riveStateMachine, config.riveInputs]);

    // Apply input changes when inputs prop changes
    useEffect(() => {
        if (config.type !== 'rive' || !config.riveInputs || Object.keys(discoveredInputs).length === 0) return;

        // Fix: Guard against undefined config.riveInputs
        Object.entries(config.riveInputs || {}).forEach(([inputKey, inputValue]) => {
            const discovered = discoveredInputs[inputKey];
            if (!discovered || !discovered.ref) return;

            try {
                if (discovered.type === 'trigger') {
                    // For triggers, fire if the value is truthy and different from last time
                    if (inputValue && typeof discovered.ref.fire === 'function') {
                        discovered.ref.fire();
                        console.log(`🔥 Fired trigger "${discovered.inputName}" in "${discovered.stateMachine}" via update`);
                    }
                } else {
                    // For number/boolean inputs
                    const newValue = discovered.type === 'boolean' ? Boolean(inputValue) : Number(inputValue) || 0;
                    if (discovered.ref.value !== newValue) {
                        discovered.ref.value = newValue;
                        console.log(`🔄 Updated "${discovered.inputName}" in "${discovered.stateMachine}" to:`, newValue);
                    }
                }
            } catch (error) {
                console.error(`❌ Error updating input "${discovered.inputName}" in "${discovered.stateMachine}":`, error);
            }
        });
    }, [config.type, config.riveInputs, discoveredInputs]);

    // Get container styles based on background type
    const getContainerStyles = React.useMemo((): React.CSSProperties => {
        const baseStyles: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: width,
            height: height,
            pointerEvents: 'none',
            zIndex: 0,
        };

        switch (config.type) {
            case 'color':
                return {
                    ...baseStyles,
                    backgroundColor: config.color || '#FFFFFF',
                };

            case 'image':
                return {
                    ...baseStyles,
                    backgroundImage: config.imageUrl ? `url(${config.imageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                };

            case 'rive':
                return {
                    ...baseStyles,
                    backgroundColor: 'transparent',
                };

            default:
                return {
                    ...baseStyles,
                    backgroundColor: '#FFFFFF',
                };
        }
    }, [config.type, config.color, config.imageUrl, width, height]);

    // Render based on background type
    const renderContent = () => {
        switch (config.type) {
            case 'rive':
                if (!config.riveFile || !RiveComponent) {
                    return null;
                }

                return (
                    <RiveComponent
                        style={{
                            width: width,
                            height: height,
                            display: 'block',
                            margin: 0,
                            padding: 0,
                            border: 'none',
                            outline: 'none',
                            imageRendering: 'crisp-edges',
                        }}
                    />
                );

            case 'image':
                // Background image is handled via CSS, no additional content needed
                return null;

            case 'color':
                // Background color is handled via CSS, no additional content needed
                return null;

            default:
                return null;
        }
    };

    return (
        <div style={getContainerStyles}>
            {renderContent()}
        </div>
    );
};

export default FrameEngine_BackgroundRenderer;