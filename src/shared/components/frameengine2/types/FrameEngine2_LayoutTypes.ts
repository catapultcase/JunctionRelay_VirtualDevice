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

import type {
    SensorProperties,
    TextProperties,
    GaugeProperties,
    TimeDateProperties,
    MediaImageProperties,
    MediaVideoProperties,
    MediaRiveProperties
} from './FrameEngine2_ElementTypes';

/**
 * Base interface for common element properties
 */
interface PlacedElementBase {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    locked: boolean;
    zIndex?: number;
}

/**
 * Discriminated union type for PlacedElement
 * Each element type has properly typed properties based on its type field
 */
export type PlacedElement =
    | (PlacedElementBase & { type: 'sensor'; properties: SensorProperties })
    | (PlacedElementBase & { type: 'text'; properties: TextProperties })
    | (PlacedElementBase & { type: 'gauge'; properties: GaugeProperties })
    | (PlacedElementBase & { type: 'timedate'; properties: TimeDateProperties })
    | (PlacedElementBase & { type: 'media-image'; properties: MediaImageProperties })
    | (PlacedElementBase & { type: 'media-video'; properties: MediaVideoProperties })
    | (PlacedElementBase & { type: 'media-rive'; properties: MediaRiveProperties });

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
    testBindingsEnabled?: boolean;
    testBindingsInterval?: number;
    includedSensorTags?: string[];
}

/**
 * Frame layout configuration
 */
export interface FrameLayoutConfig {
    id?: number;
    displayName: string;
    description?: string;
    layoutType: string;
    width: number;
    height: number;
    orientation?: string;
    backgroundColor?: string;
    backgroundType?: string;
    backgroundImageUrl?: string | null;
    backgroundImageFit?: 'cover' | 'contain' | 'fill' | 'tile' | 'stretch' | 'none';
    backgroundVideoUrl?: string | null;
    backgroundVideoFit?: 'cover' | 'contain' | 'fill' | 'stretch' | 'none';
    videoLoop?: boolean;
    videoMuted?: boolean;
    videoAutoplay?: boolean;
    backgroundOpacity?: number;
    riveFile?: string | null;
    riveStateMachine?: string | null;
    riveInputs?: Record<string, any> | null;
    riveBindings?: Record<string, any> | null;
    isTemplate: boolean;
    isDraft?: boolean;
    isPublished?: boolean;
    canvasSettings?: CanvasSettings;
    sensorTestValues?: Record<string, any>;
    created?: string;
    lastModified?: string;
    createdBy?: string;
    version?: string;
    thumbnailOverride?: boolean;
    jsonFrameConfig?: string;
    jsonFrameElements?: string;
}
