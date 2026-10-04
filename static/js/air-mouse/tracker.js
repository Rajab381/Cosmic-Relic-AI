/**
 * REALITY CORE — AIR MOUSE
 * Camera Stream Lifecycle & MediaPipe Hand Tracker
 * Strictly Client-Side, Invisibly Backgrounded, Lazy-Loaded
 */

import { DefaultAirMouseConfig } from './types.js';

export class HandTracker {
    constructor(config = {}, onResultsCallback = null) {
        this.config = { ...DefaultAirMouseConfig, ...config };
        this.onResults = onResultsCallback;

        // Runtime states
        this.stream = null;
        this.videoEl = null;
        this.handsInstance = null;
        this.isRunning = false;
        this.isProcessingFrame = false;

        this.animFrameId = null;
        this.lastFrameTimestamp = 0;
    }

    /**
     * Lazy-load MediaPipe Hands script strictly on first activation
     */
    async loadMediaPipe() {
        if (typeof window === 'undefined') return false;

        // If already present on window, skip script injection
        if (window.Hands) {
            return true;
        }

        return new Promise((resolve, reject) => {
            const scriptId = 'mediapipe-hands-script';
            let script = document.getElementById(scriptId);

            if (script) {
                if (window.Hands) return resolve(true);
                script.addEventListener('load', () => resolve(true));
                script.addEventListener('error', (e) => reject(new Error('Failed to load MediaPipe Hands: ' + e)));
                return;
            }

            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
            script.crossOrigin = 'anonymous';
            script.async = true;

            script.onload = () => {
                if (window.Hands) {
                    resolve(true);
                } else {
                    reject(new Error('MediaPipe Hands loaded but window.Hands is not defined.'));
                }
            };

            script.onerror = (err) => {
                reject(new Error('Failed to load MediaPipe library from CDN. Please check network connectivity.'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Initialize camera with invisible hidden video element
     */
    async initCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera access is not supported by your browser.');
        }

        const constraints = {
            audio: false,
            video: {
                width: { ideal: this.config.videoWidth },
                height: { ideal: this.config.videoHeight },
                facingMode: 'user'
            }
        };

        this.stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Create invisible off-screen video element (NO camera preview is ever shown to user)
        if (!this.videoEl) {
            this.videoEl = document.createElement('video');
            this.videoEl.id = 'airMouseHiddenVideo';
            this.videoEl.setAttribute('autoplay', '');
            this.videoEl.setAttribute('playsinline', '');
            this.videoEl.setAttribute('muted', '');
            this.videoEl.style.display = 'none';
            this.videoEl.style.position = 'fixed';
            this.videoEl.style.pointerEvents = 'none';
            this.videoEl.style.opacity = '0';
            this.videoEl.style.width = '1px';
            this.videoEl.style.height = '1px';
            this.videoEl.style.top = '-9999px';
            this.videoEl.style.left = '-9999px';
            document.body.appendChild(this.videoEl);
        }

        this.videoEl.srcObject = this.stream;

        return new Promise((resolve) => {
            this.videoEl.onloadedmetadata = () => {
                this.videoEl.play()
                    .then(() => resolve(true))
                    .catch(() => resolve(true));
            };
        });
    }

    /**
     * Initialize MediaPipe Hands solution with Lite complexity model
     */
    async initHands() {
        if (!window.Hands) {
            throw new Error('MediaPipe Hands library is not loaded.');
        }

        this.handsInstance = new window.Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
        });

        // Use modelComplexity: 0 (Lite) for maximum performance & lowest CPU usage
        this.handsInstance.setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55
        });

        this.handsInstance.onResults((results) => {
            this.isProcessingFrame = false;

            if (!this.isRunning) return;

            let landmarks = null;
            if (
                results &&
                results.multiHandLandmarks &&
                results.multiHandLandmarks.length > 0
            ) {
                landmarks = results.multiHandLandmarks[0];
            }

            if (typeof this.onResults === 'function') {
                this.onResults(landmarks);
            }
        });
    }

    /**
     * Start the vision processing loop throttled to target frame rate (~24 FPS)
     */
    startLoop() {
        this.isRunning = true;
        this.lastFrameTimestamp = performance.now();

        const processLoop = async () => {
            if (!this.isRunning) return;

            const now = performance.now();
            const elapsed = now - this.lastFrameTimestamp;

            // Throttle to avoid maxing out CPU (respect target FPS interval)
            if (
                elapsed >= this.config.frameIntervalMs &&
                !this.isProcessingFrame &&
                this.videoEl &&
                this.videoEl.readyState >= 2
            ) {
                this.lastFrameTimestamp = now;
                this.isProcessingFrame = true;

                try {
                    await this.handsInstance.send({ image: this.videoEl });
                } catch (sendErr) {
                    this.isProcessingFrame = false;
                    // Ignore non-fatal frame processing drop
                }
            }

            if (this.isRunning) {
                this.animFrameId = requestAnimationFrame(processLoop);
            }
        };

        this.animFrameId = requestAnimationFrame(processLoop);
    }

    /**
     * Start the tracker completely (lazy load -> getUserMedia -> init -> start loop)
     */
    async start() {
        if (this.isRunning) return;

        // 1. Lazy load MediaPipe script
        await this.loadMediaPipe();

        // 2. Request camera stream (invisible)
        await this.initCamera();

        // 3. Initialize Hands instance
        await this.initHands();

        // 4. Start throttled vision loop
        this.startLoop();
    }

    /**
     * Pause tracking loop (e.g., when browser tab is hidden)
     */
    pause() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    /**
     * Resume tracking loop (e.g., when browser tab returns to focus)
     */
    resume() {
        if (this.isRunning || !this.stream || !this.handsInstance) return;
        this.startLoop();
    }

    /**
     * Stop and release ALL camera, worker, and animation resources completely
     */
    stop() {
        this.isRunning = false;
        this.isProcessingFrame = false;

        // 1. Cancel animation frame
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        // 2. Stop camera hardware stream tracks immediately
        if (this.stream) {
            try {
                this.stream.getTracks().forEach((track) => {
                    track.stop();
                });
            } catch (_) {}
            this.stream = null;
        }

        // 3. Clear video element source
        if (this.videoEl) {
            try {
                this.videoEl.pause();
                this.videoEl.srcObject = null;
            } catch (_) {}
            if (this.videoEl.parentNode) {
                this.videoEl.parentNode.removeChild(this.videoEl);
            }
            this.videoEl = null;
        }

        // 4. Close MediaPipe instance
        if (this.handsInstance) {
            try {
                if (typeof this.handsInstance.close === 'function') {
                    this.handsInstance.close();
                }
            } catch (_) {}
            this.handsInstance = null;
        }

        // Notify listener that tracking is stopped
        if (typeof this.onResults === 'function') {
            this.onResults(null);
        }
    }
}
