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
 * Props for the Text element component
 */
interface TextElementProps {
    /** Element properties */
    properties: {
        text?: string;
        fontSize?: number;
        fontFamily?: string;
        fontWeight?: string;
        color?: string;
        backgroundColor?: string;
        textAlign?: 'left' | 'center' | 'right';
        verticalAlign?: 'top' | 'center' | 'bottom';
        [key: string]: any;
    };

    /** Element padding in pixels */
    elementPadding?: number;

    /** Element dimensions */
    width: number;
    height: number;
}

/**
 * Text Element - Displays static text labels
 */
const FrameEngine2_Element_Text: React.FC<TextElementProps> = ({
    properties,
    elementPadding = 4,
    width,
    height
}) => {
    const {
        text = 'Text Element',
        fontSize = 14,
        fontFamily = 'Inter',
        fontWeight = 'normal',
        color = '#000000',
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

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                padding: `${elementPadding}px`,
                fontSize: `${fontSize}px`,
                fontFamily: cssFontFamily,
                fontWeight,
                color,
                backgroundColor,
                display: 'flex',
                alignItems: verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center',
                justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
                textAlign,
                wordWrap: 'break-word',
                overflow: 'hidden'
            }}
        >
            {text}
        </div>
    );
};

export default FrameEngine2_Element_Text;
