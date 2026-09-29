/**
 * =========================================================================
 * COSMIC RELIC AI — ANIMATED FOOTER (CINEMATIC FINAL REVEAL)
 *
 * Cinematic reveal-on-scroll footer adapted from the LukeBaffait Animated Footer:
 * - Two source images sampled into live ASCII art on dual <canvas> elements
 * - Cursor-reactive ASCII cluster ripples with subtle core color luminescences
 * - Soft, restrained pointer parallax
 * - IntersectionObserver scroll reveal:
 *   - "COSMIC RELIC AI" display title unmasks character-by-character
 *   - Left and right ASCII relics glide in from the edges
 *   - Subsystems and link columns slide up behind masks
 * - Strict monochrome black / charcoal / white foundation with 6-core accents
 * - Fully performant: zero permanent rAF loop when idle, willReadFrequently sampler
 * =========================================================================
 */

(function () {
    "use strict";

    const DEFAULT_ASCII_CHARS = "........:::=+xX#0369";
    const HIGHLIGHT_LIFETIME = 340; // ms a hovered cell stays lit
    const CLUSTER_SIZE = 10;        // max cells a hover ripple spreads across
    const PARALLAX_EASE = 0.08;     // smoothing factor for pointer parallax

    // Core Colors for subtle cluster highlights
    const CORE_COLORS = [
        "#42bfff", // Space
        "#ff4f91", // Reality
        "#9d5cff", // Power
        "#ffd34e", // Mind
        "#ff9b42", // Time
        "#56e0a0"  // Soul
    ];

    let activeCoreColor = null;

    class CosmicAsciiHand {
        constructor(canvas, imageSrc, direction, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");
            this.imageSrc = imageSrc;
            this.direction = direction; // -1 for left (slides in from left), 1 for right
            this.options = Object.assign({
                columns: 64,
                cellSize: 16,
                fontSize: 14,
                asciiChars: DEFAULT_ASCII_CHARS,
                charColor: "rgba(200, 210, 225, 0.24)",
                hoverColor: "rgba(255, 255, 255, 0.92)",
                hoverCharColor: "#07070a",
                parallaxStrength: 18,
                hoverRadius: 7
            }, options);

            this.cells = new Map();
            this.cellList = [];
            this.rows = 0;
            this.loaded = false;
            this.animating = false;
            this.lastFrameTime = 0;

            this.init();
        }

        init() {
            this.loadImage();
        }

        loadImage() {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                this.buildGrid(img);
                this.loaded = true;
                this.requestRender();
            };
            img.onerror = () => {
                // Procedural fallback if image is not reachable
                this.buildFallbackGrid();
                this.loaded = true;
                this.requestRender();
            };
            img.src = this.imageSrc;
        }

        buildGrid(img) {
            const cols = this.options.columns;
            const aspect = (img.naturalWidth / img.naturalHeight) || 1.33;
            const rows = Math.max(1, Math.round(cols / aspect));
            this.rows = rows;

            const sampler = document.createElement("canvas");
            sampler.width = cols;
            sampler.height = rows;
            const sampleCtx = sampler.getContext("2d", { willReadFrequently: true });
            if (!sampleCtx) return;

            sampleCtx.drawImage(img, 0, 0, cols, rows);
            const pixels = sampleCtx.getImageData(0, 0, cols, rows).data;
            const chars = this.options.asciiChars;
            const bgCharIndex = chars.lastIndexOf(".");

            this.cells.clear();
            this.cellList = [];

            // Detect if image is dark-background or light-background
            let edgeBrightnessSum = 0;
            let edgeSamples = 0;
            for (let c = 0; c < cols; c += 4) {
                const offTop = c * 4;
                const offBot = ((rows - 1) * cols + c) * 4;
                edgeBrightnessSum += (pixels[offTop] + pixels[offTop + 1] + pixels[offTop + 2]) / 765;
                edgeBrightnessSum += (pixels[offBot] + pixels[offBot + 1] + pixels[offBot + 2]) / 765;
                edgeSamples += 2;
            }
            const isDarkBackground = (edgeBrightnessSum / (edgeSamples || 1)) < 0.45;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const offset = (r * cols + c) * 4;
                    const pr = pixels[offset];
                    const pg = pixels[offset + 1];
                    const pb = pixels[offset + 2];
                    const pa = pixels[offset + 3];

                    if (pa < 25) continue;

                    const rawBrightness = (pr * 0.299 + pg * 0.587 + pb * 0.114) / 255;
                    const value = isDarkBackground ? rawBrightness : (1 - rawBrightness);

                    // Skip dark background noise
                    if (value < 0.14) continue;

                    const charIndex = Math.min(chars.length - 1, Math.floor(value * chars.length));
                    if (charIndex <= bgCharIndex) continue;

                    const cell = {
                        col: c,
                        row: r,
                        char: chars[charIndex],
                        highlightEndTime: 0,
                        tintColor: null
                    };

                    this.cells.set(`${c},${r}`, cell);
                    this.cellList.push(cell);
                }
            }

            this.resizeCanvas();
        }

        buildFallbackGrid() {
            // High-tech procedural cybernetic relic pattern
            const cols = this.options.columns;
            const rows = Math.round(cols * 0.72);
            this.rows = rows;
            const chars = this.options.asciiChars;

            this.cells.clear();
            this.cellList = [];

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const nx = (c / cols) * 2 - 1;
                    const ny = (r / rows) * 2 - 1;
                    const dist = Math.sqrt(nx * nx + ny * ny);

                    // Cybernetic relic rings and nodes
                    const ring1 = Math.abs(dist - 0.65) < 0.08;
                    const ring2 = Math.abs(dist - 0.35) < 0.06;
                    const axis = (Math.abs(nx) < 0.03 || Math.abs(ny) < 0.03) && dist < 0.75;
                    const nodes = (Math.abs(nx) === Math.abs(ny)) && dist < 0.6;

                    if (ring1 || ring2 || axis || nodes) {
                        const intensity = 0.5 + Math.sin(c * 0.3 + r * 0.2) * 0.4;
                        const charIndex = Math.min(chars.length - 1, Math.floor(intensity * chars.length));
                        const cell = {
                            col: c,
                            row: r,
                            char: chars[charIndex],
                            highlightEndTime: 0,
                            tintColor: null
                        };
                        this.cells.set(`${c},${r}`, cell);
                        this.cellList.push(cell);
                    }
                }
            }

            this.resizeCanvas();
        }

        resizeCanvas() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const cols = this.options.columns;
            const rows = this.rows || Math.round(cols * 0.75);
            const cellSize = this.options.cellSize;

            const displayWidth = cols * cellSize;
            const displayHeight = rows * cellSize;

            this.canvas.width = displayWidth * dpr;
            this.canvas.height = displayHeight * dpr;
            this.canvas.style.width = `${displayWidth}px`;
            this.canvas.style.height = `${displayHeight}px`;

            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.requestRender();
        }

        highlightAt(px, py, coreColor = null) {
            const cellSize = this.options.cellSize;
            const centerCol = Math.floor(px / cellSize);
            const centerRow = Math.floor(py / cellSize);
            const radius = this.options.hoverRadius;
            const now = performance.now();

            let foundAny = false;

            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    const distSq = dc * dc + dr * dr;
                    if (distSq > radius * radius) continue;

                    const col = centerCol + dc;
                    const row = centerRow + dr;
                    const cell = this.cells.get(`${col},${row}`);
                    if (!cell) continue;

                    // Probability falls off with distance from cursor
                    const p = 1 - Math.sqrt(distSq) / radius;
                    if (Math.random() < p * 0.75) {
                        cell.highlightEndTime = now + HIGHLIGHT_LIFETIME;
                        cell.tintColor = coreColor;
                        foundAny = true;

                        // Wandering cluster ripple
                        if (Math.random() < 0.25) {
                            this.spreadCluster(cell, now, coreColor);
                        }
                    }
                }
            }

            if (foundAny) {
                this.requestRender();
            }
        }

        spreadCluster(startCell, now, coreColor) {
            let current = startCell;
            const steps = Math.floor(Math.random() * CLUSTER_SIZE) + 1;

            for (let i = 0; i < steps; i++) {
                const nextCol = current.col + (Math.random() < 0.5 ? -1 : 1);
                const nextRow = current.row + (Math.random() < 0.5 ? -1 : 1);
                const neighbor = this.cells.get(`${nextCol},${nextRow}`);
                if (!neighbor) break;

                neighbor.highlightEndTime = now + HIGHLIGHT_LIFETIME;
                neighbor.tintColor = coreColor;
                current = neighbor;
            }
        }

        requestRender() {
            if (!this.animating) {
                this.animating = true;
                requestAnimationFrame(() => this.drawLoop());
            }
        }

        drawLoop() {
            const now = performance.now();
            let hasActiveHighlights = false;

            const ctx = this.ctx;
            const cellSize = this.options.cellSize;
            const fontSize = this.options.fontSize;
            const width = this.options.columns * cellSize;
            const height = this.rows * cellSize;

            ctx.clearRect(0, 0, width, height);
            ctx.font = `600 ${fontSize}px "Orbitron", "SFMono-Regular", Consolas, monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const defaultCharColor = this.options.charColor;
            const defaultHoverColor = this.options.hoverColor;
            const hoverCharColor = this.options.hoverCharColor;

            for (let i = 0; i < this.cellList.length; i++) {
                const cell = this.cellList[i];
                const x = cell.col * cellSize;
                const y = cell.row * cellSize;
                const centerX = x + cellSize * 0.5;
                const centerY = y + cellSize * 0.5;

                if (cell.highlightEndTime > now) {
                    hasActiveHighlights = true;
                    const remaining = cell.highlightEndTime - now;
                    const t = Math.min(1.0, remaining / HIGHLIGHT_LIFETIME);

                    // Glowing highlighted cell background
                    ctx.save();
                    ctx.globalAlpha = t * 0.95;
                    ctx.fillStyle = cell.tintColor || defaultHoverColor;
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

                    // High contrast inner glyph
                    ctx.globalAlpha = 1.0;
                    ctx.fillStyle = hoverCharColor;
                    ctx.fillText(cell.char, centerX, centerY);
                    ctx.restore();
                } else {
                    // Regular subtle monochrome glyph
                    ctx.fillStyle = defaultCharColor;
                    ctx.fillText(cell.char, centerX, centerY);
                }
            }

            if (hasActiveHighlights) {
                requestAnimationFrame(() => this.drawLoop());
            } else {
                this.animating = false;
            }
        }
    }

    /**
     * Animated Footer Coordinator
     */
    class CosmicAnimatedFooter {
        constructor(container) {
            this.container = container;
            this.revealed = false;
            this.leftHand = null;
            this.rightHand = null;

            this.leftCanvas = container.querySelector("#footerAsciiLeft");
            this.rightCanvas = container.querySelector("#footerAsciiRight");
            this.leftWrapper = container.querySelector(".footer-ascii-left");
            this.rightWrapper = container.querySelector(".footer-ascii-right");

            // Parallax state
            this.targetParallaxX = 0;
            this.targetParallaxY = 0;
            this.currentParallaxX = 0;
            this.currentParallaxY = 0;
            this.parallaxRafId = null;

            this.init();
        }

        init() {
            this.splitHeadingCharacters();
            this.setupCanvases();
            this.setupIntersectionObserver();
            this.setupPointerListeners();
            this.setupCorePills();
            this.setupResizeListener();
        }

        splitHeadingCharacters() {
            const headingEls = this.container.querySelectorAll(".footer-display-title");
            headingEls.forEach(el => {
                const text = el.getAttribute("data-text") || el.textContent.trim();
                el.innerHTML = "";
                let charIndex = 0;

                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    const wrap = document.createElement("span");
                    wrap.className = "relic-char-mask";

                    const inner = document.createElement("span");
                    inner.className = "relic-char-inner";
                    inner.textContent = char === " " ? "\u00A0" : char;

                    // Stagger delay for cinematic unmasking
                    if (char !== " ") {
                        inner.style.transitionDelay = `${charIndex * 26}ms`;
                        charIndex++;
                    }

                    wrap.appendChild(inner);
                    el.appendChild(wrap);
                }
            });
        }

        getResponsiveConfig() {
            const width = window.innerWidth;
            if (width < 640) {
                return { columns: 44, cellSize: 11, fontSize: 10, hoverRadius: 6, parallaxStrength: 10 };
            } else if (width < 1024) {
                return { columns: 54, cellSize: 13, fontSize: 12, hoverRadius: 7, parallaxStrength: 14 };
            } else {
                return { columns: 64, cellSize: 15, fontSize: 13, hoverRadius: 8, parallaxStrength: 18 };
            }
        }

        setupCanvases() {
            const config = this.getResponsiveConfig();

            // Left Relic Artwork
            if (this.leftCanvas) {
                const leftSrc = this.leftCanvas.getAttribute("data-src") || "/static/images/left-relic.jpg";
                this.leftHand = new CosmicAsciiHand(this.leftCanvas, leftSrc, -1, {
                    ...config,
                    charColor: "rgba(220, 228, 240, 0.22)",
                    hoverColor: "rgba(255, 255, 255, 0.95)"
                });
            }

            // Right Relic Artwork
            if (this.rightCanvas) {
                const rightSrc = this.rightCanvas.getAttribute("data-src") || "/static/images/right-relic.jpg";
                this.rightHand = new CosmicAsciiHand(this.rightCanvas, rightSrc, 1, {
                    ...config,
                    charColor: "rgba(220, 228, 240, 0.22)",
                    hoverColor: "rgba(255, 255, 255, 0.95)"
                });
            }
        }

        setupIntersectionObserver() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !this.revealed) {
                        this.triggerReveal();
                    }
                });
            }, {
                threshold: 0.12,
                rootMargin: "0px 0px -40px 0px"
            });

            observer.observe(this.container);

            // Also check on parent landing scroll container
            const landingScreen = document.getElementById("landingScreen");
            if (landingScreen) {
                const checkVisibility = () => {
                    if (this.revealed) return;
                    const rect = this.container.getBoundingClientRect();
                    const winHeight = window.innerHeight;
                    if (rect.top < winHeight * 0.88 && rect.bottom > 0) {
                        this.triggerReveal();
                        landingScreen.removeEventListener("scroll", checkVisibility);
                    }
                };
                landingScreen.addEventListener("scroll", checkVisibility, { passive: true });
                // Check once immediately
                setTimeout(checkVisibility, 200);
            }
        }

        triggerReveal() {
            if (this.revealed) return;
            this.revealed = true;
            this.container.classList.add("footer-revealed");

            // Wake up canvas renderings
            if (this.leftHand) this.leftHand.requestRender();
            if (this.rightHand) this.rightHand.requestRender();

            // Initial cluster sparkle greeting
            setTimeout(() => {
                this.burstRandomHighlights();
            }, 350);
        }

        burstRandomHighlights() {
            const hands = [this.leftHand, this.rightHand].filter(Boolean);
            hands.forEach(hand => {
                if (!hand.loaded || hand.cellList.length === 0) return;
                const sampleCount = Math.min(8, Math.floor(hand.cellList.length / 20));
                for (let i = 0; i < sampleCount; i++) {
                    const randomIndex = Math.floor(Math.random() * hand.cellList.length);
                    const cell = hand.cellList[randomIndex];
                    const randomColor = CORE_COLORS[Math.floor(Math.random() * CORE_COLORS.length)];
                    hand.spreadCluster(cell, performance.now(), randomColor);
                }
                hand.requestRender();
            });
        }

        setupPointerListeners() {
            const handlePointer = (e) => {
                const footerRect = this.container.getBoundingClientRect();
                const mouseX = e.clientX - footerRect.left;
                const mouseY = e.clientY - footerRect.top;

                // 1. Subtle parallax targets
                const centerX = footerRect.width * 0.5;
                const centerY = footerRect.height * 0.5;
                const config = this.getResponsiveConfig();
                const pStrength = config.parallaxStrength;

                this.targetParallaxX = ((mouseX - centerX) / (centerX || 1)) * pStrength;
                this.targetParallaxY = ((mouseY - centerY) / (centerY || 1)) * pStrength;
                this.startParallaxLoop();

                // 2. Cursor-reactive ASCII cluster highlighting
                if (this.leftHand && this.leftCanvas) {
                    const lRect = this.leftCanvas.getBoundingClientRect();
                    const lx = e.clientX - lRect.left;
                    const ly = e.clientY - lRect.top;
                    // Test if pointer is in or close to canvas bounds
                    if (lx >= -60 && lx <= lRect.width + 60 && ly >= -60 && ly <= lRect.height + 60) {
                        this.leftHand.highlightAt(lx, ly, activeCoreColor);
                    }
                }

                if (this.rightHand && this.rightCanvas) {
                    const rRect = this.rightCanvas.getBoundingClientRect();
                    const rx = e.clientX - rRect.left;
                    const ry = e.clientY - rRect.top;
                    if (rx >= -60 && rx <= rRect.width + 60 && ry >= -60 && ry <= rRect.height + 60) {
                        this.rightHand.highlightAt(rx, ry, activeCoreColor);
                    }
                }
            };

            this.container.addEventListener("pointermove", handlePointer, { passive: true });

            this.container.addEventListener("pointerleave", () => {
                this.targetParallaxX = 0;
                this.targetParallaxY = 0;
                this.startParallaxLoop();
            });
        }

        startParallaxLoop() {
            if (this.parallaxRafId) return;

            const updateParallax = () => {
                this.currentParallaxX += (this.targetParallaxX - this.currentParallaxX) * PARALLAX_EASE;
                this.currentParallaxY += (this.targetParallaxY - this.currentParallaxY) * PARALLAX_EASE;

                const dx = Math.abs(this.targetParallaxX - this.currentParallaxX);
                const dy = Math.abs(this.targetParallaxY - this.currentParallaxY);

                if (this.leftWrapper) {
                    this.leftWrapper.style.transform = `translate3d(${this.currentParallaxX * 0.9}px, ${this.currentParallaxY * 0.9}px, 0)`;
                }
                if (this.rightWrapper) {
                    this.rightWrapper.style.transform = `translate3d(${-this.currentParallaxX * 0.9}px, ${this.currentParallaxY * 0.9}px, 0)`;
                }

                if (dx > 0.05 || dy > 0.05) {
                    this.parallaxRafId = requestAnimationFrame(updateParallax);
                } else {
                    this.parallaxRafId = null;
                }
            };

            this.parallaxRafId = requestAnimationFrame(updateParallax);
        }

        setupCorePills() {
            const coreButtons = this.container.querySelectorAll(".footer-core-btn");
            coreButtons.forEach((btn, index) => {
                const color = btn.getAttribute("data-color") || CORE_COLORS[index % CORE_COLORS.length];

                btn.addEventListener("mouseenter", () => {
                    activeCoreColor = color;
                    // Trigger a luminous ripple in both hands
                    this.burstRandomHighlights();
                });

                btn.addEventListener("mouseleave", () => {
                    activeCoreColor = null;
                });

                btn.addEventListener("click", () => {
                    const coreId = btn.getAttribute("data-core");
                    if (typeof window.inspectCore === "function" && coreId) {
                        window.inspectCore(coreId);
                    } else if (typeof window.selectPerspectiveSlide === "function") {
                        window.selectPerspectiveSlide(index);
                    }
                });
            });
        }

        setupResizeListener() {
            let resizeTimer = null;
            window.addEventListener("resize", () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    const config = this.getResponsiveConfig();
                    if (this.leftHand) {
                        Object.assign(this.leftHand.options, config);
                        this.leftHand.resizeCanvas();
                    }
                    if (this.rightHand) {
                        Object.assign(this.rightHand.options, config);
                        this.rightHand.resizeCanvas();
                    }
                }, 150);
            }, { passive: true });
        }
    }

    // Smooth scroll to top helper
    window.cosmicReturnToOrbit = function () {
        const landing = document.getElementById("landingScreen");
        if (landing) {
            landing.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    // Auto-initialize when DOM is ready
    function initFooter() {
        const footerEl = document.getElementById("cosmicAnimatedFooter");
        if (footerEl) {
            window.cosmicFooterInstance = new CosmicAnimatedFooter(footerEl);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initFooter);
    } else {
        initFooter();
    }
})();
