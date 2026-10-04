/**
 * REALITY CORE — AIR MOUSE
 * Virtual Cursor & Viewport Interaction Renderer
 * Smooth lerp cursor, click dispatching, and scroll execution
 */

import { DefaultAirMouseConfig, GestureType } from './types.js';

export class AirCursor {
    constructor(config = {}) {
        this.config = { ...DefaultAirMouseConfig, ...config };

        // Position state
        this.currentX = window.innerWidth / 2;
        this.currentY = window.innerHeight / 2;
        this.targetX = this.currentX;
        this.targetY = this.currentY;

        this.isVisible = false;
        this.cursorEl = null;
        this.modeIconEl = null;

        this.initDOM();
    }

    /**
     * Create the subtle minimalist virtual cursor overlay
     */
    initDOM() {
        if (typeof document === 'undefined') return;

        let el = document.getElementById('airMouseCursor');
        if (!el) {
            el = document.createElement('div');
            el.id = 'airMouseCursor';
            el.className = 'air-mouse-cursor';
            el.setAttribute('aria-hidden', 'true');
            el.innerHTML = `
                <div class="air-mouse-ring"></div>
                <div class="air-mouse-dot"></div>
                <div class="air-mouse-icon" id="airMouseModeIcon"></div>
            `;
            document.body.appendChild(el);
        }

        this.cursorEl = el;
        this.modeIconEl = el.querySelector('#airMouseModeIcon');
        this.hide();
    }

    show() {
        if (!this.cursorEl) return;
        this.isVisible = true;
        this.cursorEl.style.display = 'block';
        this.cursorEl.classList.remove('air-mouse-hidden');
    }

    hide() {
        if (!this.cursorEl) return;
        this.isVisible = false;
        this.cursorEl.classList.add('air-mouse-hidden');
        setTimeout(() => {
            if (!this.isVisible && this.cursorEl) {
                this.cursorEl.style.display = 'none';
            }
        }, 160);
    }

    /**
     * Update target position and render smoothed position
     * @param {number} rawNormX - Normalized X [0, 1]
     * @param {number} rawNormY - Normalized Y [0, 1]
     * @param {string} gesture - Current active gesture
     * @param {string} action - Triggered action (click, scroll_down, move, none)
     * @param {number} scrollDeltaY - Vertical scroll delta
     */
    update(rawNormX, rawNormY, gesture, action, scrollDeltaY = 0) {
        if (!this.cursorEl) return;

        if (!this.isVisible) {
            this.show();
        }

        // Map normalized coordinates to viewport
        const targetScreenX = rawNormX * window.innerWidth;
        const targetScreenY = rawNormY * window.innerHeight;

        // Apply exponential moving average (lerp) smoothing
        const factor = this.config.smoothingFactor;
        this.currentX += (targetScreenX - this.currentX) * factor;
        this.currentY += (targetScreenY - this.currentY) * factor;

        // Clamp inside browser window
        const clampedX = Math.max(4, Math.min(window.innerWidth - 4, this.currentX));
        const clampedY = Math.max(4, Math.min(window.innerHeight - 4, this.currentY));

        // Use translate3d for GPU acceleration without layout recalculations
        this.cursorEl.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;

        // Update visual gesture states
        this.cursorEl.classList.toggle('air-mouse-clicking', gesture === GestureType.ONE_FINGER);
        this.cursorEl.classList.toggle('air-mouse-fist', gesture === GestureType.FIST);
        this.cursorEl.classList.toggle('air-mouse-palm', gesture === GestureType.OPEN_PALM);

        if (this.modeIconEl) {
            if (gesture === GestureType.ONE_FINGER) {
                this.modeIconEl.textContent = '☝';
                this.modeIconEl.style.display = 'block';
            } else if (gesture === GestureType.FIST) {
                this.modeIconEl.textContent = '↓';
                this.modeIconEl.style.display = 'block';
            } else if (gesture === GestureType.OPEN_PALM) {
                this.modeIconEl.textContent = '🖐';
                this.modeIconEl.style.display = 'block';
            } else {
                this.modeIconEl.textContent = '';
                this.modeIconEl.style.display = 'none';
            }
        }

        // Dispatch synthetic browser events when actions trigger
        if (action === 'click') {
            this.triggerClick(clampedX, clampedY);
        } else if (action === 'scroll_down') {
            this.scrollContinuous(scrollDeltaY || this.config.continuousScrollSpeedPx || 9);
        }
    }

    /**
     * Dispatch single click at current screen point
     */
    triggerClick(x, y) {
        // Visual click feedback
        if (this.cursorEl) {
            this.cursorEl.classList.add('air-mouse-click-pulse');
            setTimeout(() => {
                if (this.cursorEl) this.cursorEl.classList.remove('air-mouse-click-pulse');
            }, 180);
        }

        const el = document.elementFromPoint(x, y);
        if (!el) return;

        // Prevent accidental interactions with the Air Mouse HUD itself (unless clicking its disable button)
        const hudEl = document.getElementById('airMouseHUD');
        if (hudEl && hudEl.contains(el)) {
            const isDisableBtn = el.id === 'airMouseDisableBtn' || el.closest('#airMouseDisableBtn');
            if (!isDisableBtn) {
                return;
            }
        }

        const eventOpts = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y
        };

        el.dispatchEvent(new MouseEvent('mousedown', eventOpts));
        el.dispatchEvent(new MouseEvent('mouseup', eventOpts));
        el.dispatchEvent(new MouseEvent('click', eventOpts));

        // Handle form inputs & buttons explicitly if needed
        if (typeof el.focus === 'function' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
            el.focus();
        } else if (typeof el.click === 'function' && el !== document.body && el !== document.documentElement) {
            el.click();
        }
    }

    /**
     * Perform continuous vertical page scrolling down in small controlled increments (behavior: "auto")
     * @param {number} amountPx - Vertical distance in pixels
     */
    scrollContinuous(amountPx) {
        if (!amountPx) return;

        // Use behavior: 'auto' to prevent stacking browser smooth animations
        const scrollOpts = { top: amountPx, behavior: 'auto' };

        // Check if there is an active scrollable container under cursor
        const target = document.elementFromPoint(this.currentX, this.currentY);
        let scrollable = this.findScrollableContainer(target);

        if (scrollable && scrollable !== document.body && scrollable !== document.documentElement) {
            scrollable.scrollBy(scrollOpts);
        } else {
            // Check landing screen or chat workspace
            const landingScreen = document.getElementById('landingScreen');
            const chatResponse = document.getElementById('response');

            if (landingScreen && landingScreen.style.display !== 'none') {
                landingScreen.scrollBy(scrollOpts);
            } else if (chatResponse && chatResponse.scrollHeight > chatResponse.clientHeight) {
                chatResponse.scrollBy(scrollOpts);
            } else {
                window.scrollBy(scrollOpts);
            }
        }
    }

    /**
     * Find nearest scrollable parent element
     */
    findScrollableContainer(el) {
        let current = el;
        while (current && current !== document.body && current !== document.documentElement) {
            const overflowY = window.getComputedStyle(current).overflowY;
            if (
                (overflowY === 'auto' || overflowY === 'scroll') &&
                current.scrollHeight > current.clientHeight
            ) {
                return current;
            }
            current = current.parentElement;
        }
        return window;
    }

    destroy() {
        if (this.cursorEl && this.cursorEl.parentNode) {
            this.cursorEl.parentNode.removeChild(this.cursorEl);
            this.cursorEl = null;
        }
    }
}
