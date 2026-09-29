/**
 * =========================================================================
 * COSMIC RELIC — SIX INTELLIGENCE CORES SCROLL-DRIVEN DIAGONAL CAROUSEL
 *
 * Primary Interaction: Pinned Scroll-Driven Continuous Progression
 * - Pinned sticky section traversing all 6 cores smoothly on scroll
 * - Continuous interpolation of rotation, vertical offset, scale, depth, and opacity
 * - Natural reversal on upward scroll
 * - Optional secondary controls: Left/Right buttons, dots, keyboard arrows, touch/pointer
 * - Zero permanent rAF loop; demand-driven updates via scroll ticking & intersection
 * =========================================================================
 */

(function () {
    "use strict";

    const CORES = [
        { id: "space", index: 0, name: "SPACE CORE", color: "#42bfff", desc: "Spatial awareness, 3D navigation, environment mapping, and perception telemetry." },
        { id: "reality", index: 1, name: "REALITY CORE", color: "#ff4f91", desc: "Computer vision, observation synthesis, and multimodal physical world interpretation." },
        { id: "power", index: 2, name: "POWER CORE", color: "#9d5cff", desc: "High-precision execution, mathematical computation, tool routing, and automation." },
        { id: "mind", index: 3, name: "MIND CORE", color: "#ffd34e", desc: "Deep algorithmic reasoning, semantic intent classification, and cognitive problem-solving." },
        { id: "time", index: 4, name: "TIME CORE", color: "#ff9b42", desc: "Longitudinal conversational memory, session context retention, and temporal continuity." },
        { id: "soul", index: 5, name: "SOUL CORE", color: "#56e0a0", desc: "Empathetic interaction, ethical alignment, creative synthesis, and user-centric persona." }
    ];

    let currentActiveIndex = 0;
    let isScrollTicking = false;

    function getDimensions() {
        const width = window.innerWidth;
        if (width < 640) {
            return {
                slideSize: 220,
                rotationStep: 12,
                verticalStep: 38,
                inactiveScale: 0.72
            };
        } else if (width < 960) {
            return {
                slideSize: 250,
                rotationStep: 16,
                verticalStep: 50,
                inactiveScale: 0.68
            };
        } else {
            return {
                slideSize: 280,
                rotationStep: 20,
                verticalStep: 64,
                inactiveScale: 0.65
            };
        }
    }

    /**
     * Renders continuous floating progress (continuousIndex: 0.0 -> 5.0)
     */
    function renderContinuousProgress(continuousIndex) {
        const track = document.getElementById("diagonalTrack");
        if (!track) return;

        const config = getDimensions();
        const safeSlideSize = config.slideSize;
        const rotationStep = config.rotationStep;
        const verticalStep = config.verticalStep;
        const safeInactiveScale = config.inactiveScale;

        // Animate track horizontally to place active slide center exactly at 50%
        const trackX = -(continuousIndex * safeSlideSize + safeSlideSize / 2);
        track.style.transform = `translate3d(${trackX.toFixed(2)}px, 0, 0)`;

        const activeIndex = Math.min(CORES.length - 1, Math.max(0, Math.round(continuousIndex)));

        const slides = track.querySelectorAll(".diagonal-slide");
        slides.forEach((slide, index) => {
            const floatDistance = index - continuousIndex;
            const distAbs = Math.abs(floatDistance);

            const rotate = floatDistance * rotationStep;
            const y = floatDistance * verticalStep;
            const scale = 1.0 - Math.min(1.0, distAbs) * (1.0 - safeInactiveScale);
            const opacity = 1.0 - Math.min(0.68, distAbs * 0.26);
            const zIndex = 30 - Math.round(distAbs * 2);

            slide.style.width = `${safeSlideSize}px`;
            slide.style.zIndex = zIndex;
            slide.style.opacity = opacity.toFixed(3);
            slide.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) rotate(${rotate.toFixed(2)}deg) scale(${scale.toFixed(4)})`;

            const isCurrent = index === activeIndex;
            slide.classList.toggle("is-active", isCurrent);

            const card = slide.querySelector(".core-card");
            if (card) {
                card.classList.toggle("active-card", isCurrent);
                card.setAttribute("aria-current", isCurrent ? "true" : "false");
            }

            const label = slide.querySelector(".diagonal-slide-label");
            if (label) {
                const labelOpacity = Math.max(0, 1.0 - distAbs * 2.0);
                label.style.opacity = labelOpacity.toFixed(3);
                label.style.transform = `scale(${(0.85 + 0.15 * labelOpacity).toFixed(3)})`;
            }
        });

        if (activeIndex !== currentActiveIndex) {
            currentActiveIndex = activeIndex;
            onActiveCoreChanged(currentActiveIndex);
        }
    }

    /**
     * Calculates scroll progress through the pinned cores-scroll-section
     */
    function updateScrollProgress() {
        const section = document.getElementById("coresMatrixSection");
        const landing = document.getElementById("landingScreen");
        if (!section || !landing) return;

        const landingRect = landing.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        const viewportHeight = landing.clientHeight || window.innerHeight;

        // Skip computation if outside visibility window
        if (sectionRect.bottom < -100 || sectionRect.top > viewportHeight + 100) {
            return;
        }

        // Distance scrolled into the pinned section
        const scrolledIntoSection = landingRect.top - sectionRect.top;
        const maxScroll = section.offsetHeight - viewportHeight;

        if (maxScroll <= 0) return;

        const rawProgress = scrolledIntoSection / maxScroll;
        const scrollProgress = Math.min(1.0, Math.max(0.0, rawProgress));
        const continuousIndex = scrollProgress * (CORES.length - 1);

        renderContinuousProgress(continuousIndex);
    }

    /**
     * Updates UI indicators (dots, telemetry badge, sidebar pills) when active core switches
     */
    function onActiveCoreChanged(newIndex) {
        const currentCore = CORES[newIndex];
        if (!currentCore) return;

        // Update Dots
        const dots = document.querySelectorAll(".diagonal-dot");
        dots.forEach((dot, index) => {
            const isActive = index === newIndex;
            dot.classList.toggle("is-active", isActive);
            dot.setAttribute("aria-current", isActive ? "true" : "false");
            if (isActive) {
                dot.style.background = CORES[index].color;
                dot.style.borderColor = CORES[index].color;
                dot.style.boxShadow = `0 0 12px ${CORES[index].color}`;
            } else {
                dot.style.background = "rgba(255, 255, 255, 0.25)";
                dot.style.borderColor = "transparent";
                dot.style.boxShadow = "none";
            }
        });

        // Update Nav Buttons
        const prevBtn = document.getElementById("diagonalPrevBtn");
        const nextBtn = document.getElementById("diagonalNextBtn");
        if (prevBtn) {
            prevBtn.disabled = newIndex === 0;
            prevBtn.style.opacity = prevBtn.disabled ? "0.3" : "1";
            prevBtn.style.cursor = prevBtn.disabled ? "not-allowed" : "pointer";
        }
        if (nextBtn) {
            nextBtn.disabled = newIndex === CORES.length - 1;
            nextBtn.style.opacity = nextBtn.disabled ? "0.3" : "1";
            nextBtn.style.cursor = nextBtn.disabled ? "not-allowed" : "pointer";
        }

        // Update Telemetry Badge in Section Header
        const badge = document.getElementById("carouselStepText");
        if (badge) {
            badge.textContent = `CORE 0${newIndex + 1} / 06 • ${currentCore.name}`;
            badge.style.color = currentCore.color;
            badge.style.borderColor = `rgba(255, 255, 255, 0.16)`;
        }

        // Synchronize with sidebar pills
        document.querySelectorAll(".sidebar-core-pill").forEach(el => {
            el.classList.toggle("active-pill", el.dataset.core === currentCore.id);
        });
    }

    /**
     * Programmatically scrolls the page so the target core is centered in the pinned carousel
     */
    function scrollToCore(targetIndex, triggerNotification = false) {
        const section = document.getElementById("coresMatrixSection");
        const landing = document.getElementById("landingScreen");
        if (!section || !landing) return;

        const maxIndex = CORES.length - 1;
        const clampedIndex = Math.min(maxIndex, Math.max(0, targetIndex));

        const landingRect = landing.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        const currentSectionTop = landing.scrollTop + (sectionRect.top - landingRect.top);
        const maxScroll = section.offsetHeight - (landing.clientHeight || window.innerHeight);

        const targetScrollTop = currentSectionTop + (clampedIndex / maxIndex) * maxScroll;

        landing.scrollTo({
            top: targetScrollTop,
            behavior: "smooth"
        });

        // Also directly preview progress in case smooth scroll has small latency
        renderContinuousProgress(clampedIndex);

        if (triggerNotification && typeof window.showCosmicNotification === "function") {
            const currentCore = CORES[clampedIndex];
            window.showCosmicNotification(`[${currentCore.name}]: ${currentCore.desc}`);
        }
    }

    function nextSlide() {
        scrollToCore(currentActiveIndex + 1);
    }

    function prevSlide() {
        scrollToCore(currentActiveIndex - 1);
    }

    function goToCore(coreId) {
        if (!coreId) return;
        const idx = CORES.findIndex(c => c.id.toLowerCase() === coreId.toLowerCase());
        if (idx !== -1) {
            scrollToCore(idx, false);
        }
    }

    function initDiagonalCarousel() {
        const container = document.getElementById("coresDiagonalCarousel");
        const landing = document.getElementById("landingScreen");
        if (!container || !landing) return;

        // Demand-driven scroll listening (No permanent rAF loop)
        landing.addEventListener("scroll", () => {
            if (!isScrollTicking) {
                isScrollTicking = true;
                requestAnimationFrame(() => {
                    updateScrollProgress();
                    isScrollTicking = false;
                });
            }
        }, { passive: true });

        // Keyboard Arrow Navigation
        container.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                prevSlide();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                nextSlide();
            }
        });

        // Auto-focus container when hovered for seamless arrow key usage
        container.addEventListener("mouseenter", () => {
            if (document.activeElement === document.body || document.activeElement === null) {
                container.focus({ preventScroll: true });
            }
        });

        // Global arrow keys when carousel is focused or hovered and not typing in text inputs
        window.addEventListener("keydown", (e) => {
            const active = document.activeElement;
            const isEditing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
            if (isEditing) return;

            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                const rect = container.getBoundingClientRect();
                const inView = rect.top < window.innerHeight && rect.bottom > 0;
                if (inView && (active === container || container.contains(active) || container.matches(":hover"))) {
                    e.preventDefault();
                    if (e.key === "ArrowLeft") prevSlide();
                    else nextSlide();
                }
            }
        });

        // Desktop Pointer Drag Navigation
        let isDragging = false;
        let startPointerX = 0;
        let dragDistance = 0;

        container.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            if (e.target.closest("button") || e.target.closest(".core-card-action")) return;
            isDragging = true;
            startPointerX = e.clientX;
            dragDistance = 0;
        });

        window.addEventListener("pointermove", (e) => {
            if (!isDragging) return;
            dragDistance = e.clientX - startPointerX;
        });

        window.addEventListener("pointerup", (e) => {
            if (!isDragging) return;
            isDragging = false;
            if (Math.abs(dragDistance) > 45) {
                if (dragDistance > 0) {
                    prevSlide();
                } else {
                    nextSlide();
                }
            }
        });

        // Touch Swipe Navigation for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        container.addEventListener("touchstart", (e) => {
            if (!e.touches || !e.touches[0]) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        container.addEventListener("touchend", (e) => {
            if (!e.changedTouches || !e.changedTouches[0]) return;
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            const deltaY = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
                if (deltaX > 0) {
                    prevSlide();
                } else {
                    nextSlide();
                }
            }
        }, { passive: true });

        // Window resize update
        window.addEventListener("resize", () => {
            updateScrollProgress();
        }, { passive: true });

        // Initial setup
        updateScrollProgress();
    }

    // Expose global controller
    window.diagonalCarousel = {
        scrollToCore,
        nextSlide,
        prevSlide,
        goToCore,
        getCurrentIndex: () => currentActiveIndex,
        cores: CORES
    };

    window.selectDiagonalSlide = (index) => scrollToCore(index, true);
    window.nextDiagonalSlide = nextSlide;
    window.prevDiagonalSlide = prevSlide;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDiagonalCarousel);
    } else {
        initDiagonalCarousel();
    }
})();
