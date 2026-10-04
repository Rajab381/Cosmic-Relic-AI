/**
 * REALITY CORE — AIR MOUSE
 * Types, Constants, and Configuration
 * Client-Side Modular Computer Vision Engine
 */

export const GestureType = Object.freeze({
    NONE: 'none',
    OPEN_PALM: 'open_palm',   // 🖐️ Open Palm: Move virtual cursor
    ONE_FINGER: 'one_finger', // ☝️ One Finger: Single Click
    FIST: 'fist'              // ✊ Fist: Continuous Scroll Down
});

export const AirMouseState = Object.freeze({
    OFF: 'off',
    REQUESTING: 'requesting',
    ACTIVE: 'active',
    PAUSED: 'paused',
    ERROR: 'error'
});

export const ActionState = Object.freeze({
    OFF: 'OFF',
    ACTIVE_IDLE: 'ACTIVE_IDLE',
    MOVING: 'MOVING',         // OPEN PALM
    CLICK_READY: 'CLICK_READY', // ONE FINGER
    SCROLLING: 'SCROLLING'    // FIST
});

export const LandmarkIndex = Object.freeze({
    WRIST: 0,
    THUMB_CMC: 1,
    THUMB_MCP: 2,
    THUMB_IP: 3,
    THUMB_TIP: 4,
    INDEX_MCP: 5,
    INDEX_PIP: 6,
    INDEX_DIP: 7,
    INDEX_TIP: 8,
    MIDDLE_MCP: 9,
    MIDDLE_PIP: 10,
    MIDDLE_DIP: 11,
    MIDDLE_TIP: 12,
    RING_MCP: 13,
    RING_PIP: 14,
    RING_DIP: 15,
    RING_TIP: 16,
    PINKY_MCP: 17,
    PINKY_PIP: 18,
    PINKY_DIP: 19,
    PINKY_TIP: 20
});

export const DefaultAirMouseConfig = Object.freeze({
    // Performance & Sampling
    targetFPS: 24,
    frameIntervalMs: 41, // ~24 FPS cap to prevent high CPU utilization
    videoWidth: 640,
    videoHeight: 480,

    // Cursor Movement & Smoothing
    smoothingFactor: 0.42, // Exponential lerp factor

    // Continuous Scroll Down speed (pixels per tracking frame at ~24 FPS)
    continuousScrollSpeedPx: 9, // Controlled continuous velocity (6–12 px)

    // Gesture Debounce & Transitions
    gestureDebounceFrames: 2, // Stability frames before committing transition
    clickCooldownMs: 250,

    // Mathematical thresholds for hand geometry
    extendedRatioThreshold: 1.15,
    fistCurlRatioThresholdEnter: 1.05,
    fistCurlRatioThresholdRemain: 1.18
});
