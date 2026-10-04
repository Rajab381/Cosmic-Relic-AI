/**
 * REALITY CORE — AIR MOUSE
 * Gesture Recognition & Discrete/Continuous State Engine
 * 
 * FINAL 3-GESTURE MODEL:
 * 🖐️ OPEN PALM   -> Continuous Virtual Cursor Movement
 * ☝️ ONE FINGER  -> Discrete Single Click
 * ✊ FIST        -> Continuous Scroll Down
 * 
 * All other gestures removed.
 */

import { GestureType, LandmarkIndex, DefaultAirMouseConfig } from './types.js';

export class GestureEngine {
    constructor(config = {}) {
        this.config = { ...DefaultAirMouseConfig, ...config };

        // State Machine Registers
        this.currentGesture = GestureType.NONE;
        this.previousGesture = GestureType.NONE;

        // Debounce buffer for gesture stability
        this.candidateGesture = GestureType.NONE;
        this.candidateCount = 0;

        // Click transition registers
        this.hasClickedThisGesture = false;
        this.lastClickTime = 0;

        // Fist hysteresis register
        this.isFistActive = false;

        // Cursor position registers
        this.rawCursorX = 0.5;
        this.rawCursorY = 0.5;
    }

    /**
     * Compute 3D Euclidean distance between two landmarks
     */
    static distance(a, b) {
        if (!a || !b) return 0;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z || 0) - (b.z || 0);
        return Math.hypot(dx, dy, dz);
    }

    /**
     * Process landmarks for a single detected hand
     * @param {Array<{x: number, y: number, z?: number}>} landmarks - 21 normalized landmarks
     * @param {number} timestamp - Current performance.now() timestamp
     * @returns {Object} Resolution with gesture, action, cursor position, and scroll delta
     */
    process(landmarks, timestamp = performance.now()) {
        if (!landmarks || landmarks.length < 21) {
            return this.reset();
        }

        const L = LandmarkIndex;
        const wrist = landmarks[L.WRIST];
        const middleMcp = landmarks[L.MIDDLE_MCP];

        // Hand scale reference (distance between wrist and middle MCP)
        const handScale = Math.max(0.05, GestureEngine.distance(wrist, middleMcp));

        // Hysteresis curl ratio threshold: slightly more tolerant when already in fist
        const curlRatio = this.isFistActive
            ? (this.config.fistCurlRatioThresholdRemain || 1.18)
            : (this.config.fistCurlRatioThresholdEnter || 1.05);

        const extendedRatio = this.config.extendedRatioThreshold || 1.15;

        // Geometric finger extension: tip is significantly farther from wrist than PIP
        const isExtended = (tipIdx, pipIdx) => {
            const tipDist = GestureEngine.distance(wrist, landmarks[tipIdx]);
            const pipDist = GestureEngine.distance(wrist, landmarks[pipIdx]);
            return tipDist > pipDist * extendedRatio;
        };

        // Geometric finger curl: tip is closer to wrist than PIP (relative to curl threshold)
        const isCurled = (tipIdx, pipIdx) => {
            const tipDist = GestureEngine.distance(wrist, landmarks[tipIdx]);
            const pipDist = GestureEngine.distance(wrist, landmarks[pipIdx]);
            return tipDist < pipDist * curlRatio;
        };

        // Non-thumb finger states
        const indexExtended = isExtended(L.INDEX_TIP, L.INDEX_PIP);
        const middleExtended = isExtended(L.MIDDLE_TIP, L.MIDDLE_PIP);
        const ringExtended = isExtended(L.RING_TIP, L.RING_PIP);
        const pinkyExtended = isExtended(L.PINKY_TIP, L.PINKY_PIP);

        const indexCurled = isCurled(L.INDEX_TIP, L.INDEX_PIP);
        const middleCurled = isCurled(L.MIDDLE_TIP, L.MIDDLE_PIP);
        const ringCurled = isCurled(L.RING_TIP, L.RING_PIP);
        const pinkyCurled = isCurled(L.PINKY_TIP, L.PINKY_PIP);

        const curledCount = (indexCurled ? 1 : 0) + (middleCurled ? 1 : 0) + (ringCurled ? 1 : 0) + (pinkyCurled ? 1 : 0);
        const extendedCount = (indexExtended ? 1 : 0) + (middleExtended ? 1 : 0) + (ringExtended ? 1 : 0) + (pinkyExtended ? 1 : 0);

        // Update cursor coordinates from index fingertip
        if (landmarks[L.INDEX_TIP]) {
            this.rawCursorX = Math.max(0, Math.min(1, 1 - landmarks[L.INDEX_TIP].x));
            this.rawCursorY = Math.max(0, Math.min(1, landmarks[L.INDEX_TIP].y));
        }

        // ========================================================
        // MUTUALLY EXCLUSIVE GESTURE CLASSIFICATION (STRICT PRIORITY)
        // 1. FIST -> 2. ONE FINGER -> 3. OPEN PALM -> 4. NONE/IDLE
        // ========================================================
        let detected = GestureType.NONE;

        // Fist geometry: non-thumb fingers are curled toward palm, none are extended
        const isFistGeometry = (curledCount >= 3 && extendedCount === 0);

        // One-finger geometry: index is extended, remaining fingers are curled
        const isOneFingerGeometry = (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && curledCount >= 2);

        // Open palm geometry: most/all fingers clearly extended, relaxed hand rotation allowed
        const isOpenPalmGeometry = (extendedCount >= 3 && curledCount === 0);

        if (isFistGeometry) {
            detected = GestureType.FIST;
        } else if (isOneFingerGeometry) {
            detected = GestureType.ONE_FINGER;
        } else if (isOpenPalmGeometry) {
            detected = GestureType.OPEN_PALM;
        } else {
            detected = GestureType.NONE;
        }

        // ========================================================
        // DEBOUNCE BUFFER (Prevents 1-frame jitter/flicker)
        // ========================================================
        if (detected === this.candidateGesture) {
            this.candidateCount++;
        } else {
            this.candidateGesture = detected;
            this.candidateCount = 1;
        }

        if (this.candidateCount >= this.config.gestureDebounceFrames) {
            if (this.currentGesture !== this.candidateGesture) {
                this.previousGesture = this.currentGesture;
                this.currentGesture = this.candidateGesture;
            }
        }

        // Maintain fist hysteresis flag
        this.isFistActive = (this.currentGesture === GestureType.FIST);

        // ========================================================
        // ACTION RESOLUTION:
        // OPEN PALM:  Continuous Cursor Movement (action: 'move')
        // ONE FINGER: Single Click on transition, held = 'click_held'
        // FIST:       Continuous Downward Scroll (action: 'scroll_down', scrollDeltaY: > 0)
        // NONE:       action: 'none', scrollDeltaY: 0
        // ========================================================
        let action = 'idle';
        let scrollDeltaY = 0;

        if (this.currentGesture === GestureType.FIST) {
            action = 'scroll_down';
            scrollDeltaY = this.config.continuousScrollSpeedPx || 9;
            // Fist never emits click
        } else if (this.currentGesture === GestureType.ONE_FINGER) {
            if (!this.hasClickedThisGesture) {
                if (timestamp - this.lastClickTime >= this.config.clickCooldownMs) {
                    action = 'click';
                    this.lastClickTime = timestamp;
                    this.hasClickedThisGesture = true;
                } else {
                    action = 'click_held';
                }
            } else {
                action = 'click_held';
            }
            scrollDeltaY = 0;
        } else {
            // Reset click latch as soon as one-finger gesture is released
            this.hasClickedThisGesture = false;
        }

        if (this.currentGesture === GestureType.OPEN_PALM) {
            action = 'move';
            scrollDeltaY = 0;
        } else if (this.currentGesture === GestureType.NONE) {
            action = 'none';
            scrollDeltaY = 0;
        }

        return {
            gesture: this.currentGesture,
            action,
            rawCursorX: this.rawCursorX,
            rawCursorY: this.rawCursorY,
            scrollDeltaY,
            isOpenPalm: this.currentGesture === GestureType.OPEN_PALM,
            isOneFinger: this.currentGesture === GestureType.ONE_FINGER,
            isFist: this.currentGesture === GestureType.FIST
        };
    }

    /**
     * Reset internal registers when hand tracking is lost or engine is stopped
     */
    reset() {
        this.currentGesture = GestureType.NONE;
        this.previousGesture = GestureType.NONE;
        this.candidateGesture = GestureType.NONE;
        this.candidateCount = 0;

        this.hasClickedThisGesture = false;
        this.isFistActive = false;

        return {
            gesture: GestureType.NONE,
            action: 'none',
            rawCursorX: this.rawCursorX,
            rawCursorY: this.rawCursorY,
            scrollDeltaY: 0,
            isOpenPalm: false,
            isOneFinger: false,
            isFist: false
        };
    }
}
