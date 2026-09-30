/**
 * =========================================================================
 * MAGIC UI / VENGEANCE UI — GLYPH MATRIX
 *
 * Empty-state background for Cosmic Relic AI chat area:
 * - Rendered on HTML5 canvas with devicePixelRatio crisp scaling
 * - Parameters matching specification:
 *   glyphs: "01·•+*\/\\<>="
 *   cellSize: 14
 *   mutationRate: 0.04
 *   interval: 90ms
 *   fadeBottom: 0.6
 *   color: soft monochrome white/grey (no neon/excessive glow)
 * - Auto-hidden with smooth fade out when chat starts; animation loop
 *   is halted to conserve GPU/CPU resources during conversation.
 * - Restored cleanly when chat is empty or session is reset.
 * =========================================================================
 */

let glyphMatrixInstance = null;

class GlyphMatrixEngine {
    constructor(canvas, container, options = {}) {
        this.canvas = canvas;
        this.container = container;
        this.ctx = canvas.getContext("2d", { alpha: true });

        // Configuration
        this.glyphs = options.glyphs || "01·•+*/\\<>=";
        this.cellSize = options.cellSize || 14;
        this.mutationRate = options.mutationRate !== undefined ? options.mutationRate : 0.04;
        this.interval = options.interval || 90;
        this.fadeBottom = options.fadeBottom !== undefined ? options.fadeBottom : 0.6;
        this.color = options.color || "rgba(180, 185, 195, 0.22)";

        this.cols = 0;
        this.rows = 0;
        this.grid = [];
        this.timer = null;
        this.isRunning = false;
        this.width = 0;
        this.height = 0;

        this.handleResize = this.handleResize.bind(this);
        this.tick = this.tick.bind(this);

        glyphMatrixInstance = this;
        window.glyphMatrixInstance = this;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener("resize", this.handleResize, { passive: true });
        this.start();
    }

    handleResize() {
        if (!this.isRunning) return;
        this.resize();
    }

    resize() {
        const parent = this.container || this.canvas.parentElement;
        if (!parent) return;

        const rect = parent.getBoundingClientRect();
        this.width = Math.max(300, Math.floor(rect.width));
        this.height = Math.max(200, Math.floor(rect.height));

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.floor(this.width * dpr);
        this.canvas.height = Math.floor(this.height * dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        this.cols = Math.ceil(this.width / this.cellSize);
        this.rows = Math.ceil(this.height / this.cellSize);

        const total = this.cols * this.rows;
        this.grid = new Array(total);
        for (let i = 0; i < total; i++) {
            this.grid[i] = this.glyphs[Math.floor(Math.random() * this.glyphs.length)];
        }

        this.draw();
    }

    tick() {
        const total = this.grid.length;
        const glyphsLen = this.glyphs.length;
        for (let i = 0; i < total; i++) {
            if (Math.random() < this.mutationRate) {
                this.grid[i] = this.glyphs[Math.floor(Math.random() * glyphsLen)];
            }
        }
        this.draw();
    }

    draw() {
        if (!this.ctx || this.width === 0 || this.height === 0) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.font = '10px "JetBrains Mono", Consolas, Menlo, Monaco, monospace';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const fadeStart = this.height * (1 - this.fadeBottom);
        const fadeRange = this.height - fadeStart;

        for (let r = 0; r < this.rows; r++) {
            const y = r * this.cellSize + this.cellSize / 2;
            let alpha = 0.20; // quiet subtle baseline

            if (y > fadeStart && fadeRange > 0) {
                const progress = (y - fadeStart) / fadeRange;
                alpha *= Math.max(0, 1 - progress);
            }

            if (alpha <= 0.005) continue;

            const isLight = document.documentElement.classList.contains("light-theme") || document.body.classList.contains("light-theme");
            if (isLight) {
                ctx.fillStyle = `rgba(88, 64, 46, ${(alpha * 1.35).toFixed(3)})`;
            } else {
                ctx.fillStyle = `rgba(180, 185, 195, ${alpha.toFixed(3)})`;
            }

            for (let c = 0; c < this.cols; c++) {
                const x = c * this.cellSize + this.cellSize / 2;
                const char = this.grid[r * this.cols + c];
                if (char) {
                    ctx.fillText(char, x, y);
                }
            }
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.draw();
        this.timer = setInterval(this.tick, this.interval);
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
    }

    destroy() {
        this.stop();
        window.removeEventListener("resize", this.handleResize);
    }
}

function initGlyphMatrix() {
    const canvas = document.getElementById("glyphMatrixCanvas");
    const container = document.getElementById("glyphMatrixContainer");
    if (!canvas || !container) return;

    if (!glyphMatrixInstance) {
        glyphMatrixInstance = new GlyphMatrixEngine(canvas, container, {
            glyphs: "01·•+*/\\<>=",
            cellSize: 14,
            mutationRate: 0.04,
            interval: 90,
            fadeBottom: 0.6
        });
    } else {
        glyphMatrixInstance.start();
    }
}

function hideGlyphMatrix() {
    const container = document.getElementById("glyphMatrixContainer");
    if (container) {
        container.classList.add("is-hidden");
        // Stop animation loop after opacity transition completes
        setTimeout(() => {
            if (glyphMatrixInstance && container.classList.contains("is-hidden")) {
                glyphMatrixInstance.stop();
            }
        }, 400);
    }
}

function showGlyphMatrix() {
    const container = document.getElementById("glyphMatrixContainer");
    if (container) {
        container.classList.remove("is-hidden");
        if (glyphMatrixInstance) {
            requestAnimationFrame(() => {
                glyphMatrixInstance.resize();
                glyphMatrixInstance.start();
            });
        } else {
            initGlyphMatrix();
        }
    }
}

// Global expose
window.initGlyphMatrix = initGlyphMatrix;
window.hideGlyphMatrix = hideGlyphMatrix;
window.showGlyphMatrix = showGlyphMatrix;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlyphMatrix);
} else {
    initGlyphMatrix();
}
