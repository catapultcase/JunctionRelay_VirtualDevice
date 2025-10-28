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

import React, { useEffect } from 'react';

/**
 * Load a Google Font dynamically
 */
const loadGoogleFont = (fontFamily: string) => {
    // Check if font is already loaded
    const linkId = `google-font-${fontFamily.replace(/\s+/g, '-')}`;
    if (document.getElementById(linkId)) {
        return;
    }

    // Create link element to load the font
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
};

/**
 * Props for the Sensor element component
 */
interface SensorElementProps {
    /** Element properties */
    properties: {
        sensorTag?: string;
        showLabel?: boolean;
        showUnit?: boolean;
        placeholderSensorLabel?: string;
        placeholderValue?: string | number;
        placeholderUnit?: string;
        fontSize?: number;
        fontFamily?: string;
        fontWeight?: string;
        textColor?: string;
        backgroundColor?: string;
        textAlign?: 'left' | 'center' | 'right';
        verticalAlign?: 'top' | 'center' | 'bottom';
        [key: string]: any;
    };

    /** Resolved sensor values (Live > Test hierarchy already applied) */
    resolvedValues: Record<string, any>;

    /** Whether to show placeholders when no data */
    showPlaceholders?: boolean;

    /** Element padding in pixels */
    elementPadding?: number;

    /** Element dimensions */
    width: number;
    height: number;
}

/**
 * Sensor Element - Displays live sensor values
 *
 * Data hierarchy:
 * 1. Live sensor data (highest priority)
 * 2. Test values (for testing in editor)
 * 3. Placeholder values (when no data available)
 */
const FrameEngine2_Element_Sensor: React.FC<SensorElementProps> = ({
    properties,
    resolvedValues,
    showPlaceholders = true,
    elementPadding = 4,
    width,
    height
}) => {
    const {
        sensorTag,
        showLabel = true,
        showUnit = true,
        placeholderSensorLabel = 'Sensor',
        placeholderValue = '--',
        placeholderUnit = '',
        fontSize = 12,
        fontFamily = 'Inter',
        fontWeight = 'normal',
        textColor = '#000000',
        backgroundColor = 'transparent',
        textAlign = 'left',
        verticalAlign = 'center'
    } = properties;

    // Load Google Font when needed
    useEffect(() => {
        if (fontFamily && fontFamily !== 'Inter') {
            loadGoogleFont(fontFamily);
        }
    }, [fontFamily]);

    // Format font family for CSS (add quotes if it contains spaces)
    const cssFontFamily = fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily;

    // Get resolved value (hierarchy already applied by SensorTagManager)
    let valueToDisplay: string | number | undefined;
    let unitToDisplay: string = '';

    if (sensorTag && resolvedValues[sensorTag] !== undefined && resolvedValues[sensorTag] !== null) {
        valueToDisplay = resolvedValues[sensorTag];
        unitToDisplay = placeholderUnit; // Unit not available in resolved values
    }

    // If no resolved value, use placeholder
    if (valueToDisplay === undefined) {
        if (!showPlaceholders) {
            return (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        padding: `${elementPadding}px`,
                        fontSize: `${fontSize}px`,
                        fontFamily: cssFontFamily,
                        fontWeight,
                        color: '#888888',
                        backgroundColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center'
                    }}
                >
                    NO DATA
                </div>
            );
        }
        valueToDisplay = placeholderValue;
        unitToDisplay = placeholderUnit;
    }

    // Build display string
    const labelText = showLabel ? placeholderSensorLabel : '';
    const valueText = valueToDisplay.toString();
    const unitText = showUnit ? unitToDisplay : '';

    let content = '';
    if (labelText) content += labelText + ' ';
    content += valueText;
    if (unitText) content += ' ' + unitText;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                padding: `${elementPadding}px`,
                fontSize: `${fontSize}px`,
                fontFamily: cssFontFamily,
                fontWeight,
                color: textColor,
                backgroundColor,
                display: 'flex',
                alignItems: verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center',
                justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
                textAlign,
                wordWrap: 'break-word',
                overflow: 'hidden'
            }}
        >
            {content}
        </div>
    );
};

export default FrameEngine2_Element_Sensor;
