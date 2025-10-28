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

/* eslint-disable react/jsx-pascal-case */
// Note: Component names use underscore naming convention for namespace organization (FrameEngine2_*)
// This is a deliberate architectural choice and does not violate PascalCase - the components ARE PascalCase

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { PlacedElement } from '../frameengine/FrameEngine_Types';
import FrameEngine2_Element_Sensor from './elements/FrameEngine2_Element_Sensor';
import FrameEngine2_Element_Text from './elements/FrameEngine2_Element_Text';
import FrameEngine2_Element_Gauge from './elements/FrameEngine2_Element_Gauge';
import FrameEngine2_Element_TimeDate from './elements/FrameEngine2_Element_TimeDate';
import FrameEngine2_Element_MediaImage from './elements/FrameEngine2_Element_MediaImage';
import FrameEngine2_Element_MediaVideo from './elements/FrameEngine2_Element_MediaVideo';
import FrameEngine2_Element_MediaRive from './elements/FrameEngine2_Element_MediaRive';

interface FrameEngine2_Renderer_ElementsProps {
    /** Element to render */
    element: PlacedElement;

    /** Whether this element is currently selected */
    isSelected?: boolean;

    /** Callback when element is clicked */
    onClick?: (elementId: string) => void;

    /** Callback when element is updated (e.g., dragged) */
    onUpdateElement?: (elementId: string, updates: Partial<PlacedElement>) => void;

    /** Resolved sensor values (Live > Test hierarchy already applied) */
    resolvedValues: Record<string, any>;

    /** Whether to show placeholders when no data */
    showPlaceholders?: boolean;

    /** Element padding in pixels */
    elementPadding?: number;
}

/**
 * Element Renderer - Dispatches to the correct element component
 * and handles positioning and selection
 */
const FrameEngine2_Renderer_Elements: React.FC<FrameEngine2_Renderer_ElementsProps> = ({
    element,
    isSelected = false,
    onClick,
    onUpdateElement,
    resolvedValues,
    showPlaceholders = true,
    elementPadding = 4
}) => {
    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [dragPosition, setDragPosition] = useState({ x: element.x, y: element.y });

    // Hover state for border highlighting
    const [isHovered, setIsHovered] = useState(false);

    // Ref to track if we should update position on mouse up
    const hasDragged = useRef(false);

    /**
     * Handle mouse down - start dragging
     * FIX: Calculate offset in canvas space (accounting for zoom scale)
     */
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Get canvas container to read scale
        const canvas = document.querySelector('[data-canvas-container="true"]') as HTMLElement;
        if (!canvas) return;

        // Get the current scale from the transform
        const computedStyle = window.getComputedStyle(canvas);
        const transform = computedStyle.transform;

        // Parse scale from transform matrix
        let scale = 1;
        if (transform && transform !== 'none') {
            const matrixMatch = transform.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
            if (matrixMatch) {
                scale = parseFloat(matrixMatch[1]);
            }
        }

        // Calculate offset from element top-left to mouse position
        // Element rect is in screen space (scaled), so divide by scale for canvas space
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = (e.clientX - rect.left) / scale;
        const offsetY = (e.clientY - rect.top) / scale;

        setDragOffset({ x: offsetX, y: offsetY });
        setIsDragging(true);
        hasDragged.current = false;
    };

    /**
     * Handle mouse move - update position during drag
     * Optimized: Removed dragPosition from dependencies to avoid event listener thrashing
     * FIX: Account for zoom scale when calculating canvas coordinates
     */
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            hasDragged.current = true;

            // Get canvas container to calculate relative position
            const canvas = document.querySelector('[data-canvas-container="true"]') as HTMLElement;
            if (!canvas) return;

            // Get the current scale from the transform
            const computedStyle = window.getComputedStyle(canvas);
            const transform = computedStyle.transform;

            // Parse scale from transform matrix
            // transform will be like "matrix(sx, 0, 0, sy, tx, ty)" where sx/sy are scale
            let scale = 1;
            if (transform && transform !== 'none') {
                const matrixMatch = transform.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
                if (matrixMatch) {
                    scale = parseFloat(matrixMatch[1]); // sx is the x scale factor
                }
            }

            const canvasRect = canvas.getBoundingClientRect();

            // Calculate new position relative to canvas, accounting for scale
            // Screen coordinates need to be divided by scale to get canvas coordinates
            const screenX = e.clientX - canvasRect.left;
            const screenY = e.clientY - canvasRect.top;

            const newX = screenX / scale - dragOffset.x;
            const newY = screenY / scale - dragOffset.y;

            setDragPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);

            // Only update if element was actually dragged
            // Use functional state access to get latest position
            if (hasDragged.current && onUpdateElement) {
                setDragPosition(finalPos => {
                    onUpdateElement(element.id, {
                        x: finalPos.x,
                        y: finalPos.y
                    });
                    return finalPos;
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset.x, dragOffset.y, element.id, onUpdateElement]);

    /**
     * Reset drag position when element position changes externally
     */
    useEffect(() => {
        if (!isDragging) {
            setDragPosition({ x: element.x, y: element.y });
        }
    }, [element.x, element.y, isDragging]);

    /**
     * Render the appropriate element component based on type
     * Memoized to prevent expensive element recreation (especially for Gauge)
     */
    const renderedElement = useMemo(() => {
        switch (element.type) {
            case 'sensor':
                return (
                    <FrameEngine2_Element_Sensor
                        properties={element.properties}
                        resolvedValues={resolvedValues}
                        showPlaceholders={showPlaceholders}
                        elementPadding={elementPadding}
                        width={element.width}
                        height={element.height}
                    />
                );

            case 'text':
                return (
                    <FrameEngine2_Element_Text
                        properties={element.properties}
                        elementPadding={elementPadding}
                        width={element.width}
                        height={element.height}
                    />
                );

            case 'gauge':
                return (
                    <FrameEngine2_Element_Gauge
                        properties={element.properties}
                        resolvedValues={resolvedValues}
                        showPlaceholders={showPlaceholders}
                        elementPadding={elementPadding}
                        width={element.width}
                        height={element.height}
                    />
                );

            case 'timedate':
                return (
                    <FrameEngine2_Element_TimeDate
                        properties={element.properties}
                        elementPadding={elementPadding}
                        width={element.width}
                        height={element.height}
                    />
                );

            case 'media-image':
                return (
                    <FrameEngine2_Element_MediaImage
                        properties={element.properties}
                        width={element.width}
                        height={element.height}
                    />
                );

            case 'media-video':
                return (
                    <FrameEngine2_Element_MediaVideo
                        properties={element.properties}
                        width={element.width}
                        height={element.height}
                    />
                );

            case 'media-rive':
                return (
                    <FrameEngine2_Element_MediaRive
                        properties={element.properties}
                        width={element.width}
                        height={element.height}
                    />
                );

            default:
                return (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: '#999'
                        }}
                    >
                        Unknown: {element.type}
                    </div>
                );
        }
    }, [element.type, element.properties, element.width, element.height, resolvedValues, showPlaceholders, elementPadding]);

    const currentX = isDragging ? dragPosition.x : element.x;
    const currentY = isDragging ? dragPosition.y : element.y;

    /**
     * Handle click - only trigger if not dragging
     * OPTIMIZATION: Wrapped in useCallback
     */
    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hasDragged.current) {
            onClick?.(element.id);
        }
    }, [onClick, element.id]);

    /**
     * Handle mouse enter for hover state
     * OPTIMIZATION: State-based styling instead of direct DOM manipulation
     */
    const handleMouseEnter = useCallback(() => {
        if (!isSelected && !isDragging) {
            setIsHovered(true);
        }
    }, [isSelected, isDragging]);

    /**
     * Handle mouse leave for hover state
     * OPTIMIZATION: State-based styling instead of direct DOM manipulation
     * FIX: Always clear hover state on mouse leave to prevent stale hover styling
     */
    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    /**
     * Clear hover state when element becomes selected
     * Prevents hover border from showing when element is deselected
     */
    useEffect(() => {
        if (isSelected) {
            setIsHovered(false);
        }
    }, [isSelected]);

    /**
     * Memoized element wrapper style
     * OPTIMIZATION: Prevents object recreation on every render
     */
    const elementWrapperStyle = useMemo(() => {
        // Determine border based on state
        let border;
        if (isSelected) {
            border = '2px solid #2196f3';
        } else if (isHovered) {
            border = '1px solid rgba(33, 150, 243, 0.5)';
        } else {
            border = '1px solid transparent';
        }

        return {
            position: 'absolute' as const,
            left: `${currentX}px`,
            top: `${currentY}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            cursor: isDragging ? 'move' : 'pointer',
            border,
            boxSizing: 'border-box' as const,
            transition: isDragging ? 'none' : 'border-color 0.15s ease',
            pointerEvents: 'auto' as const,
            boxShadow: isDragging ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'none',
            opacity: isDragging ? 0.9 : 1,
            zIndex: isDragging ? 1000 : element.zIndex,
            userSelect: 'none' as const
        };
    }, [currentX, currentY, element.width, element.height, element.zIndex, isDragging, isSelected, isHovered]);

    return (
        <div
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={elementWrapperStyle}
        >
            {renderedElement}
        </div>
    );
};

export default React.memo(FrameEngine2_Renderer_Elements);

