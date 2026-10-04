/**
 * REALITY CORE — AIR MOUSE
 * Main Entry Point
 */

import { AirMouseController } from './controller.js';
import { GestureEngine } from './gesture-engine.js';
import { AirCursor } from './cursor.js';
import { HandTracker } from './tracker.js';
import { GestureType, AirMouseState, ActionState, DefaultAirMouseConfig } from './types.js';

let airMouseInstance = null;

export function initAirMouse() {
    if (typeof window === 'undefined') return null;

    if (!airMouseInstance) {
        airMouseInstance = new AirMouseController();
        window.cosmicAirMouse = airMouseInstance;
    }

    return airMouseInstance;
}

// Auto-register on window safely when DOM is ready without starting any camera or tracking
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initAirMouse());
    } else {
        initAirMouse();
    }
}

export {
    AirMouseController,
    GestureEngine,
    AirCursor,
    HandTracker,
    GestureType,
    AirMouseState,
    ActionState,
    DefaultAirMouseConfig
};
