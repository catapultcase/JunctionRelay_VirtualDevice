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

/**
 * FrameEngine2 Layout Type Definitions
 *
 * These types define the structure of layouts and elements in FrameEngine2.
 * Pure FrameEngine2 format - NO backwards compatibility.
 */

/**
 * Placed element in FrameEngine2 format
 * Elements have x, y, width, height as direct properties (not nested)
 */
export interface PlacedElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    properties: any;
    visible: boolean;
    zIndex?: number;
}

/**
 * Canvas grid settings
 */
export interface GridSettings {
    snapToGrid: boolean;
    showGrid: boolean;
    gridSize: number;
    gridColor: string;
}

/**
 * Canvas settings
 */
export interface CanvasSettings {
    grid: GridSettings;
    elementPadding: number;
}

/**
 * Frame layout configuration
 */
export interface FrameLayoutConfig {
    displayName: string;
    layoutType: 'frameengine2';
    width: number;
    height: number;
    backgroundColor: string;
    backgroundType: 'color' | 'image' | 'video' | 'rive';
    backgroundImageUrl?: string | null;
    backgroundImageFit?: 'cover' | 'contain' | 'fill' | 'none';
    backgroundVideoUrl?: string | null;
    backgroundVideoFit?: 'cover' | 'contain' | 'fill' | 'none';
    videoLoop?: boolean;
    videoMuted?: boolean;
    videoAutoplay?: boolean;
    riveFile?: string | null;
    riveStateMachine?: string | null;
    riveInputs?: Record<string, any> | null;
    riveBindings?: Record<string, any> | null;
    isTemplate: boolean;
    canvasSettings?: CanvasSettings;
}
