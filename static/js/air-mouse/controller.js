/**
 * REALITY CORE — AIR MOUSE
 * Master Orchestrator & State Controller
 * Manages Dock UI, HUD indicator, permission flow, and lifecycle
 */

import { AirMouseState, GestureType } from './types.js';
import { GestureEngine } from './gesture-engine.js';
import { AirCursor } from './cursor.js';
import { HandTracker } from './tracker.js';

export class AirMouseController {
    constructor() {
        this.state = AirMouseState.OFF;

        this.gestureEngine = new GestureEngine();
        this.cursor = new AirCursor();
        this.tracker = null;

        this.dockBtn = null;
        this.dockItem = null;
        this.dockTooltip = null;
        this.hudEl = null;
        this.hudGestureTag = null;
        this.hudStatusText = null;

        this.hasShownPermissionHint = false;

        this.bindEvents();
    }

    /**
     * Bind system DOM elements and browser visibility change listeners
     */
    bindEvents() {
        if (typeof document === 'undefined') return;

        // Auto-pause tracking when tab is hidden to save CPU and battery
        document.addEventListener('visibilitychange', () => {
            if (this.state === AirMouseState.ACTIVE) {
                if (document.hidden) {
                    if (this.tracker) this.tracker.pause();
                    this.updateHUD('PAUSED (TAB HIDDEN)', 'PAUSED');
                } else {
                    if (this.tracker) this.tracker.resume();
                    this.updateHUD('AIR MOUSE ACTIVE', 'TRACKING');
                }
            }
        });

        // Initialize HUD DOM element if not present
        this.initHUD();
        this.cacheDockElements();
    }

    cacheDockElements() {
        this.dockBtn = document.getElementById('dockAirMouseBtn');
        this.dockItem = document.getElementById('dockAirMouseItem');
        this.dockTooltip = document.getElementById('dockAirMouseTooltip');
    }

    /**
     * Create floating minimal status HUD indicator
     */
    initHUD() {
        if (typeof document === 'undefined') return;

        let hud = document.getElementById('airMouseHUD');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'airMouseHUD';
            hud.className = 'air-mouse-hud';
            hud.style.display = 'none';
            hud.setAttribute('aria-live', 'polite');
            hud.innerHTML = `
                <div class="air-mouse-hud-content">
                    <span class="air-mouse-hud-core-symbol">◆</span>
                    <div class="air-mouse-hud-info">
                        <span class="air-mouse-hud-title">REALITY CORE</span>
                        <span class="air-mouse-hud-sub">
                            <span class="air-mouse-hud-dot"></span>
                            <span id="airMouseStatusText">AIR MOUSE ACTIVE</span>
                        </span>
                    </div>
                    <div class="air-mouse-hud-badge" id="airMouseGestureTag">STANDBY</div>
                    <button type="button" class="air-mouse-hud-close" id="airMouseDisableBtn" aria-label="Disable Air Mouse" title="Disable Air Mouse">
                        ✕
                    </button>
                </div>
            `;
            document.body.appendChild(hud);

            const disableBtn = hud.querySelector('#airMouseDisableBtn');
            if (disableBtn) {
                disableBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.disable();
                });
            }
        }

        this.hudEl = hud;
        this.hudGestureTag = hud.querySelector('#airMouseGestureTag');
        this.hudStatusText = hud.querySelector('#airMouseStatusText');
    }

    /**
     * Toggle Air Mouse on/off
     */
    async toggle() {
        if (this.state === AirMouseState.ACTIVE || this.state === AirMouseState.REQUESTING) {
            this.disable();
        } else {
            await this.enable();
        }
    }

    /**
     * Activate Air Mouse
     */
    async enable() {
        if (this.state === AirMouseState.ACTIVE) return;

        this.cacheDockElements();
        this.state = AirMouseState.REQUESTING;
        this.updateDockUI(true, 'Connecting...');

        // Inform user on first launch that video is completely local
        if (!this.hasShownPermissionHint) {
            this.hasShownPermissionHint = true;
            this.showNotification('Air Mouse uses your camera locally for hand tracking. No camera footage is uploaded.');
        }

        try {
            if (!this.tracker) {
                this.tracker = new HandTracker({}, (landmarks) => this.handleLandmarks(landmarks));
            }

            await this.tracker.start();

            this.state = AirMouseState.ACTIVE;
            this.updateDockUI(true, 'Air Mouse • Active');
            this.showHUD();
            this.updateHUD('AIR MOUSE ACTIVE', 'TRACKING');
            this.cursor.show();

        } catch (err) {
            console.warn('[Reality Core Air Mouse] Activation failed:', err);
            this.state = AirMouseState.ERROR;
            this.cleanup();

            const isDenied =
                err.name === 'NotAllowedError' ||
                err.name === 'PermissionDeniedError' ||
                (err.message && err.message.toLowerCase().includes('denied'));

            if (isDenied) {
                this.showNotification('Camera access denied. Air Mouse requires camera permission to track gestures.', true);
            } else {
                this.showNotification('Could not initialize Air Mouse: ' + (err.message || 'Camera error'), true);
            }

            this.updateDockUI(false, 'Air Mouse');
            this.state = AirMouseState.OFF;
        }
    }

    /**
     * Disable Air Mouse and return website to baseline performance
     */
    disable() {
        if (this.state === AirMouseState.OFF) return;

        this.cleanup();
        this.state = AirMouseState.OFF;
        this.updateDockUI(false, 'Air Mouse');
        this.hideHUD();
        this.cursor.hide();
        this.showNotification('Air Mouse disabled. Camera stopped.');
    }

    /**
     * Teardown tracker and reset engines
     */
    cleanup() {
        if (this.tracker) {
            this.tracker.stop();
            this.tracker = null;
        }
        if (this.gestureEngine) {
            this.gestureEngine.reset();
        }
    }

    /**
     * High-frequency landmarks callback (~24 FPS)
     */
    handleLandmarks(landmarks) {
        if (this.state !== AirMouseState.ACTIVE) return;

        if (!landmarks) {
            this.cursor.hide();
            this.updateGestureBadge('NO HAND');
            return;
        }

        const now = performance.now();
        const resolution = this.gestureEngine.process(landmarks, now);

        // Update virtual cursor position & dispatch actions
        this.cursor.update(
            resolution.rawCursorX,
            resolution.rawCursorY,
            resolution.gesture,
            resolution.action,
            resolution.scrollDeltaY
        );

        // Update badge text based on simplified 3-gesture model (🖐 MOVE, ☝ CLICK, ✊ SCROLL DOWN)
        let badgeLabel = 'STANDBY';
        switch (resolution.gesture) {
            case GestureType.OPEN_PALM:
                badgeLabel = '🖐 MOVE';
                break;
            case GestureType.ONE_FINGER:
                badgeLabel = '☝ CLICK';
                break;
            case GestureType.FIST:
                badgeLabel = '✊ SCROLL DOWN';
                break;
            default:
                badgeLabel = 'STANDBY';
        }

        this.updateGestureBadge(badgeLabel);
    }

    showHUD() {
        if (this.hudEl) {
            this.hudEl.style.display = 'block';
            this.hudEl.classList.remove('air-mouse-hud-hidden');
        }
    }

    hideHUD() {
        if (this.hudEl) {
            this.hudEl.classList.add('air-mouse-hud-hidden');
            setTimeout(() => {
                if (this.state === AirMouseState.OFF && this.hudEl) {
                    this.hudEl.style.display = 'none';
                }
            }, 200);
        }
    }

    updateHUD(statusText, badgeText) {
        if (this.hudStatusText) {
            this.hudStatusText.textContent = statusText;
        }
        if (this.hudGestureTag) {
            this.hudGestureTag.textContent = badgeText;
        }
    }

    updateGestureBadge(badgeText) {
        if (this.hudGestureTag && this.hudGestureTag.textContent !== badgeText) {
            this.hudGestureTag.textContent = badgeText;
        }
    }

    updateDockUI(isActive, tooltipText) {
        this.cacheDockElements();

        if (this.dockBtn) {
            this.dockBtn.classList.toggle('dock-air-mouse-active', isActive);
            this.dockBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
        if (this.dockItem) {
            this.dockItem.setAttribute('data-label', tooltipText);
        }
        if (this.dockTooltip) {
            this.dockTooltip.textContent = tooltipText;
        }
    }

    showNotification(msg, isError = false) {
        if (typeof window !== 'undefined' && typeof window.showCosmicNotification === 'function') {
            window.showCosmicNotification(msg, isError);
        }
    }
}
