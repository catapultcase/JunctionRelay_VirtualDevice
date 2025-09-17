import React, { useCallback, useMemo } from 'react';

// Google Fonts tracking - outside component to persist across renders
const loadedFonts = new Set<string>();

// Shared interfaces
export interface ElementPosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface BaseElement {
    id: string;
    type: 'sensor' | 'text' | 'chart' | 'image' | 'container';
    position: ElementPosition;
    properties: Record<string, any>;
}

export interface SensorElement extends BaseElement {
    type: 'sensor';
    sensorTag?: string;
    currentValue?: string;
    currentUnit?: string;
}

export interface TextElement extends BaseElement {
    type: 'text';
    text?: string;
}

export interface RendererConfig {
    elementPadding: number;
    isInteractive: boolean; // Controls whether elements respond to mouse events
    showPlaceholders: boolean; // Controls whether to show placeholder content
}

interface ElementRendererProps {
    elements: BaseElement[];
    config: RendererConfig;
    sensorData?: Record<string, any>;
    selectedElementIds?: string[];
    onElementMouseDown?: (event: React.MouseEvent, elementId: string) => void;
    onElementMouseEnter?: (event: React.MouseEvent, elementId: string) => void;
    onElementMouseLeave?: (event: React.MouseEvent, elementId: string) => void;
    children?: React.ReactNode; // For any additional overlays (like resize handles)
}

// Google Font loader utility
const loadGoogleFont = (fontFamily: string) => {
    if (!fontFamily || fontFamily.includes('system') || fontFamily.includes('sans-serif') ||
        loadedFonts.has(fontFamily) ||
        document.querySelector(`link[href*="${fontFamily.replace(/\s+/g, '+')}"]`)) {
        return;
    }

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    loadedFonts.add(fontFamily);
};

export const FrameEngine_ElementRenderer: React.FC<ElementRendererProps> = ({
    elements,
    config,
    sensorData = {},
    selectedElementIds = [],
    onElementMouseDown,
    onElementMouseEnter,
    onElementMouseLeave,
    children
}) => {
    // Get element styles based on properties
    const getElementStyles = useCallback((element: BaseElement, isSelected: boolean): React.CSSProperties => {
        const props = element.properties;

        return {
            position: 'absolute',
            left: element.position.x,
            top: element.position.y,
            width: element.position.width,
            height: element.position.height,
            outline: config.isInteractive ? (isSelected ? '2px solid #1976d2' : '1px solid #ccc') : 'none',
            cursor: config.isInteractive ? 'move' : 'default',
            boxShadow: (config.isInteractive && isSelected) ? '0 0 0 2px rgba(25, 118, 210, 0.3)' : 'none',
            zIndex: 2,
            overflow: 'hidden',
            boxSizing: 'border-box',
            backgroundColor: props.backgroundColor || 'transparent',
        };
    }, [config.isInteractive]);

    // Get text styles for content
    const getTextStyles = useCallback((element: BaseElement): React.CSSProperties => {
        const props = element.properties;
        const fontFamily = props.fontFamily || 'Inter, system-ui, -apple-system, sans-serif';

        // Load font if needed
        if (fontFamily && fontFamily !== 'Inter' && !fontFamily.includes('system')) {
            loadGoogleFont(fontFamily);
        }

        // Handle vertical alignment
        const verticalAlign = props.verticalAlign || 'center';
        let justifyContent: string;
        switch (verticalAlign) {
            case 'top':
                justifyContent = 'flex-start';
                break;
            case 'bottom':
                justifyContent = 'flex-end';
                break;
            default:
                justifyContent = 'center';
                break;
        }

        return {
            fontSize: props.fontSize || 12,
            fontFamily: `"${fontFamily}", system-ui, -apple-system, sans-serif`,
            fontWeight: props.fontWeight || 'normal',
            color: props.color || props.textColor || '#000000',
            backgroundColor: props.backgroundColor || 'transparent',
            textAlign: (props.textAlign || 'center') as any,
            lineHeight: props.lineHeight || '1.4',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: justifyContent,
            alignItems: props.textAlign === 'left' ? 'flex-start' :
                props.textAlign === 'right' ? 'flex-end' : 'center',
            padding: `${config.elementPadding}px`,
            boxSizing: 'border-box',
            wordWrap: 'break-word',
            overflow: 'hidden',
            zIndex: 10,
            textShadow: props.textShadow ? '1px 1px 2px rgba(0,0,0,0.3)' : 'none',
            border: props.textBorder ? '1px solid currentColor' : 'none',
        };
    }, [config.elementPadding]);

    // Get sensor data for an element
    const getSensorData = useCallback((element: SensorElement) => {
        if (!element.properties.sensorTag) return null;

        // Try direct match first
        let data = sensorData[element.properties.sensorTag];

        // If no direct match, look for comma-separated keys that contain this tag
        if (!data) {
            const matchingKey = Object.keys(sensorData).find(key =>
                key.split(',').map(tag => tag.trim()).includes(element.properties.sensorTag!)
            );
            if (matchingKey) {
                data = sensorData[matchingKey];
            }
        }

        return data;
    }, [sensorData]);

    // Render element content based on type
    const renderElementContent = useCallback((element: BaseElement) => {
        const textStyles = getTextStyles(element);

        switch (element.type) {
            case 'sensor': {
                const sensorElement = element as SensorElement;
                const data = getSensorData(sensorElement);

                const showLabel: boolean = element.properties.showLabel === true;
                const showUnit: boolean = element.properties.showUnit !== false;

                if (!data && !config.showPlaceholders) {
                    return (
                        <div style={{ ...textStyles, color: '#888888' }}>
                            NO DATA
                        </div>
                    );
                }

                let content: string;
                if (data?.displayValue && data.displayValue.trim() !== '') {
                    // Use pre-formatted displayValue from server
                    content = data.displayValue;
                } else if (data) {
                    // Fallback to manual construction
                    const labelText: string = showLabel ? (element.properties.placeholderSensorLabel || '') : '';
                    const valueText: string = data.value?.toString() || '--';
                    const unitText: string = showUnit ? (data.unit || '') : '';

                    content = '';
                    if (labelText) content += labelText + ' ';
                    content += valueText;
                    if (unitText) content += ' ' + unitText;
                } else {
                    // Use placeholders for editor mode
                    const labelText: string = showLabel ? (element.properties.placeholderSensorLabel || '') : '';
                    const valueText: string = (element.properties.placeholderValue ?? '').toString().trim() || '--';
                    const unitText: string = showUnit ?
                        (element.properties.placeholderUnit ?? '').toString().trim() : '';

                    content = '';
                    if (labelText) content += labelText + ' ';
                    content += valueText;
                    if (unitText) content += ' ' + unitText;
                }

                return (
                    <div style={textStyles}>
                        {content}
                    </div>
                );
            }

            case 'text': {
                const textElement = element as TextElement;
                const content = textElement.text || element.properties.text || 'Text Element';
                return (
                    <div style={textStyles}>
                        {content}
                    </div>
                );
            }

            case 'chart':
                return (
                    <div style={textStyles}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                            📊 {element.properties.title || 'Chart'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                            {element.properties.chartType || 'line'} chart
                        </div>
                    </div>
                );

            case 'image': {
                const imageUrl = element.properties.imageUrl;
                const altText = element.properties.alt || 'Image';

                if (imageUrl) {
                    return (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <img
                                src={imageUrl}
                                alt={altText}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block'
                                }}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                        parent.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 10px;">🖼️ ${altText}</div>`;
                                    }
                                }}
                            />
                        </div>
                    );
                } else {
                    return (
                        <div style={{ ...textStyles, color: '#999', fontSize: '10px' }}>
                            🖼️ {altText}
                        </div>
                    );
                }
            }

            case 'container':
                return (
                    <div style={{
                        ...textStyles,
                        border: '2px dashed #ccc',
                        color: '#999',
                        fontSize: '10px'
                    }}>
                        📦 Container
                    </div>
                );

            default:
                return (
                    <div style={textStyles}>
                        {element.type}
                    </div>
                );
        }
    }, [getTextStyles, getSensorData, config.showPlaceholders]);

    // Render all elements
    const renderedElements = useMemo(() => {
        return elements.map((element) => {
            const isSelected = selectedElementIds.includes(element.id);
            const elementStyles = getElementStyles(element, isSelected);

            return (
                <div
                    key={element.id}
                    style={elementStyles}
                    onMouseDown={config.isInteractive && onElementMouseDown ?
                        (e) => onElementMouseDown(e, element.id) : undefined}
                    onMouseEnter={config.isInteractive && onElementMouseEnter ?
                        (e) => onElementMouseEnter(e, element.id) : undefined}
                    onMouseLeave={config.isInteractive && onElementMouseLeave ?
                        (e) => onElementMouseLeave(e, element.id) : undefined}
                >
                    {renderElementContent(element)}
                </div>
            );
        });
    }, [
        elements,
        selectedElementIds,
        getElementStyles,
        renderElementContent,
        config.isInteractive,
        onElementMouseDown,
        onElementMouseEnter,
        onElementMouseLeave,
        sensorData // ADD SENSOR DATA DEPENDENCY
    ]);

    return (
        <>
            {renderedElements}
            {children}
        </>
    );
};

export default FrameEngine_ElementRenderer;