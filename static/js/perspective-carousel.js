/**
 * =========================================================================
 * COSMIC RELIC — SIX INTELLIGENCE CORES 3D PERSPECTIVE CAROUSEL
 *
 * Visual Foundation: 3D Perspective Carousel
 * - 3D Camera Perspective (1200px) with cylindrical rotateY depth curvature
 * - Scale, z-depth translation, and horizontal displacement
 * - Active center card prominent (scale 1.0, rotateY 0deg, z 0px)
 * - Neighboring cards visible in perspective, angled symmetrically toward center
 *
 * Interaction: Continuous Scroll-Driven
 * - Continuous mapping: scroll progress -> continuousIndex (0.0 -> 5.0)
 * - Cards visibly move with every micro-pixel of user scroll down or up
 * - Smooth reversal on upward scroll
 * - Gentle snap only when user stops scrolling near a card
 * - Secondary controls (Next/Prev buttons, dots, keyboard, swipe, inspectCore)
 * - Zero permanent rAF loop: passive scroll ticking
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
    let snapTimeout = null;
    let isProgrammaticScrolling = false;

    function getDimensions() {
        const width = window.innerWidth;
        if (width < 640) {
            return {
                cardWidth: 240,
                spacing: 210,
                secondarySpacing: 150,
                maxRotateY: 34,
                zStep: 95,
                inactiveScale: 0.72
            };
        } else if (width < 960) {
            return {
                cardWidth: 270,
                spacing: 270,
                secondarySpacing: 190,
                maxRotateY: 38,
                zStep: 120,
                inactiveScale: 0.68
            };
        } else {
            return {
                cardWidth: 290,
                spacing: 325,
                secondarySpacing: 230,
                maxRotateY: 42,
                zStep: 140,
                inactiveScale: 0.65
            };
        }
    }

    /**
     * Evaluates continuous 3D perspective transforms for all 6 cards
     * continuousIndex is a floating point number [0.0 ... 5.0]
     */
    function renderContinuousPerspective(continuousIndex) {
        const stage = document.getElementById("perspectiveStage") || document.getElementById("diagonalTrack");
        if (!stage) return;

        const config = getDimensions();
        const spacing = config.spacing;
        const secondarySpacing = config.secondarySpacing;
        const maxRotateY = config.maxRotateY;
        const zStep = config.zStep;
        const inactiveScale = config.inactiveScale;

        const slides = stage.querySelectorAll(".perspective-slide, .diagonal-slide");
        const activeIndex = Math.min(CORES.length - 1, Math.max(0, Math.round(continuousIndex)));

        slides.forEach((slide, index) => {
            const offset = index - continuousIndex;
            const absOffset = Math.abs(offset);
            const sign = Math.sign(offset);

            // 1. Horizontal 3D displacement
            const x = sign * (Math.min(absOffset, 1.0) * spacing + Math.max(0, absOffset - 1.0) * secondarySpacing);

            // 2. Z-depth receding away from the camera
            const z = -Math.min(360, absOffset * zStep);

            // 3. rotateY turning inward toward the camera center
            // Cards on the right (offset > 0) rotate negatively; cards on left (offset < 0) rotate positively
            const rotateY = -sign * Math.min(maxRotateY, Math.pow(Math.min(absOffset, 2.6), 0.82) * (maxRotateY * 0.88));

            // 4. Scale attenuation
            const scale = 1.0 - Math.min(1.0, absOffset) * (1.0 - inactiveScale);

            // 5. Opacity fade for distant cards
            const opacity = 1.0 - Math.min(0.72, absOffset * 0.28);

            // 6. Layer depth ordering
            const zIndex = 30 - Math.round(absOffset * 4);

            slide.style.width = `${config.cardWidth}px`;
            slide.style.zIndex = zIndex;
            slide.style.opacity = opacity.toFixed(3);
            slide.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), -50%, ${z.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(4)})`;

            const isCurrent = index === activeIndex;
            slide.classList.toggle("is-active", isCurrent);

            const card = slide.querySelector(".core-card");
            if (card) {
                card.classList.toggle("active-card", isCurrent);
                card.setAttribute("aria-current", isCurrent ? "true" : "false");
            }

            const label = slide.querySelector(".perspective-slide-label, .diagonal-slide-label");
            if (label) {
                const labelOpacity = Math.max(0, 1.0 - absOffset * 1.8);
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
     * Computes scroll progress through the pinned runway and updates the 3D perspective
     */
    function updateScrollProgress() {
        const section = document.getElementById("coresMatrixSection");
        const landing = document.getElementById("landingScreen");
        if (!section || !landing) return;

        const landingRect = landing.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        const viewportHeight = landing.clientHeight || window.innerHeight;

        // Skip computation if section is far outside the viewport
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

        renderContinuousPerspective(continuousIndex);
    }

    /**
     * Gentle snap only after user has finished scrolling and settled near a core
     */
    function handleGentleSnap() {
        if (isProgrammaticScrolling) return;

        const section = document.getElementById("coresMatrixSection");
        const landing = document.getElementById("landingScreen");
        if (!section || !landing) return;

        const landingRect = landing.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        const viewportHeight = landing.clientHeight || window.innerHeight;

        const scrolledIntoSection = landingRect.top - sectionRect.top;
        const maxScroll = section.offsetHeight - viewportHeight;

        // Only snap if section is genuinely pinned in active view
        if (scrolledIntoSection <= 50 || scrolledIntoSection >= maxScroll - 50) return;

        const rawProgress = scrolledIntoSection / maxScroll;
        const continuousIndex = rawProgress * (CORES.length - 1);
        const nearestIndex = Math.round(continuousIndex);
        const distanceToNearest = Math.abs(continuousIndex - nearestIndex);

        // Only gently snap if user stopped close to an integer (between 0.04 and 0.22)
        if (distanceToNearest > 0.04 && distanceToNearest < 0.22) {
            scrollToCore(nearestIndex);
        }
    }

    /**
     * Synchronizes indicators when active core shifts
     */
    function onActiveCoreChanged(newIndex) {
        const currentCore = CORES[newIndex];
        if (!currentCore) return;

        // Update Dots
        const dots = document.querySelectorAll(".perspective-dot, .diagonal-dot");
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
        const prevBtn = document.getElementById("perspectivePrevBtn") || document.getElementById("diagonalPrevBtn");
        const nextBtn = document.getElementById("perspectiveNextBtn") || document.getElementById("diagonalNextBtn");
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

        // Update Telemetry Step Pill in Section Header
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
     * Programmatically scrolls to place target core dead center in the 3D perspective stage
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

        isProgrammaticScrolling = true;
        clearTimeout(snapTimeout);

        landing.scrollTo({
            top: targetScrollTop,
            behavior: "smooth"
        });

        // Directly preview progress
        renderContinuousPerspective(clampedIndex);

        setTimeout(() => {
            isProgrammaticScrolling = false;
        }, 650);

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

    function initPerspectiveCarousel() {
        const container = document.getElementById("coresPerspectiveCarousel") || document.getElementById("coresDiagonalCarousel");
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

            // Gentle snap debounce
            clearTimeout(snapTimeout);
            snapTimeout = setTimeout(() => {
                handleGentleSnap();
            }, 450);
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

        // Auto-focus container when hovered for seamless arrow keys
        container.addEventListener("mouseenter", () => {
            if (document.activeElement === document.body || document.activeElement === null) {
                container.focus({ preventScroll: true });
            }
        });

        // Global arrow keys when in view and focused or hovered
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
    const controller = {
        scrollToCore,
        nextSlide,
        prevSlide,
        goToCore,
        getCurrentIndex: () => currentActiveIndex,
        cores: CORES
    };

    window.perspectiveCarousel = controller;
    window.diagonalCarousel = controller; // Backwards compatibility alias

    window.selectPerspectiveSlide = (index) => scrollToCore(index, true);
    window.selectDiagonalSlide = (index) => scrollToCore(index, true);
    window.nextPerspectiveSlide = nextSlide;
    window.nextDiagonalSlide = nextSlide;
    window.prevPerspectiveSlide = prevSlide;
    window.prevDiagonalSlide = prevSlide;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPerspectiveCarousel);
    } else {
        initPerspectiveCarousel();
    }
})();
