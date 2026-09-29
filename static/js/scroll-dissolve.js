/**
 * =========================================================================
 * COSMIC RELIC — QUANTUM SCROLL DISSOLVE EFFECT (THREE.JS / WEBGL)
 *
 * Implements Sobel edge detection, fractal noise (FBM), and sparkle-burn
 * transition between Front Perception Core and Inner Quantum Singularity.
 * =========================================================================
 */

(function () {
    "use strict";

    // Shaders provided by user specifications
    const coverVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const coverFragmentShader = `
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform vec2 uImageResolution;
      uniform float uDissolve;
      uniform vec2 uCenter;
      uniform float uTime;
      uniform float uGrayscale;
      uniform float uEdgeIntensity;
      uniform float uEdgeBrightness;
      varying vec2 vUv;

      mat3 sobelX = mat3(
        -1.0, 0.0, 1.0,
        -2.0, 0.0, 2.0,
        -1.0, 0.0, 1.0
      );

      mat3 sobelY = mat3(
        -1.0, -2.0, -1.0,
         0.0,  0.0,  0.0,
         1.0,  2.0,  1.0
      );

      float getLuminance(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      float sobel(sampler2D tex, vec2 uv, vec2 texelSize) {
        float gx = 0.0;
        float gy = 0.0;

        for (int i = -1; i <= 1; i++) {
          for (int j = -1; j <= 1; j++) {
            vec2 offset = vec2(float(i), float(j)) * texelSize;
            float lum = getLuminance(texture2D(tex, uv + offset).rgb);
            gx += lum * sobelX[i + 1][j + 1];
            gy += lum * sobelY[i + 1][j + 1];
          }
        }

        return sqrt(gx * gx + gy * gy);
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        
        return value;
      }

      void main() {
        vec2 ratio = vec2(
          min((uResolution.x / uResolution.y) / (uImageResolution.x / uImageResolution.y), 1.0),
          min((uResolution.y / uResolution.x) / (uImageResolution.y / uImageResolution.x), 1.0)
        );

        vec2 uv = vec2(
          vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
          vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
        );

        vec4 texColor = texture2D(uTexture, uv);
        
        float gray = getLuminance(texColor.rgb);
        vec3 grayscaleColor = vec3(gray);
        texColor.rgb = mix(texColor.rgb, grayscaleColor, uGrayscale);
        
        vec2 centeredUv = vUv - uCenter;
        float aspect = uResolution.x / uResolution.y;
        centeredUv.x *= aspect;
        float dist = length(centeredUv);
        
        float angle = atan(centeredUv.y, centeredUv.x);
        
        float noiseScale = 6.0;
        vec2 pixelatedUv = floor(vUv * uResolution / noiseScale) * noiseScale / uResolution;
        float blockNoise = fbm(pixelatedUv * 100.0) * 0.15;
        
        float angularNoise = fbm(vec2(angle * 5.0, 0.0)) * 0.15;
        
        float totalNoise = blockNoise + angularNoise;
        float noisyDist = dist + totalNoise;
        
        float maxDist = length(vec2(aspect * 0.5, 0.5));
        float normalizedDist = noisyDist / maxDist;
        
        float dissolveThreshold = uDissolve * 1.5; 
        
        vec2 texelSize = 1.0 / uResolution;
        float edge = sobel(uTexture, uv, texelSize);
        
        edge = pow(edge, 0.7) * 2.0;
        edge = clamp(edge, 0.0, 1.0);
        
        float dissolveMask = smoothstep(dissolveThreshold - 0.03, dissolveThreshold, normalizedDist);
        
        vec3 edgeColor = vec3(0.85, 0.88, 0.92);
        
        vec3 baseColor = mix(texColor.rgb, vec3(0.0), uGrayscale);
        vec3 finalColor = baseColor;
        
        float edgeGlowIntensity = uEdgeIntensity * 2.0;
        float edgeGlow = edge * edgeGlowIntensity * (1.0 + uGrayscale * 3.0);
        finalColor += edgeColor * edgeGlow * uEdgeBrightness;
        
        float edgeZoneWidth = 0.15 * (1.0 - uDissolve) + 0.02;
        float edgeZone = smoothstep(dissolveThreshold - edgeZoneWidth, dissolveThreshold - edgeZoneWidth + 0.04, normalizedDist) * 
                         smoothstep(dissolveThreshold + 0.02, dissolveThreshold - 0.02, normalizedDist);
        float sparkle = hash(floor(vUv * uResolution / 4.0)) * edgeZone;
        
        float edgeBrightness = (1.0 - uDissolve) * uEdgeBrightness * (1.0 + uGrayscale * 2.0);
        finalColor += vec3(sparkle * 3.0 * edgeBrightness);
        
        float alpha = dissolveMask * texColor.a;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    const coverFragmentShaderReverse = `
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform vec2 uImageResolution;
      uniform float uDissolve;
      uniform vec2 uCenter;
      uniform float uTime;
      uniform float uBrightness;
      uniform float uEdgeIntensity;
      uniform float uDarkness;
      uniform float uGrayscale;
      varying vec2 vUv;

      mat3 sobelX = mat3(
        -1.0, 0.0, 1.0,
        -2.0, 0.0, 2.0,
        -1.0, 0.0, 1.0
      );

      mat3 sobelY = mat3(
        -1.0, -2.0, -1.0,
         0.0,  0.0,  0.0,
         1.0,  2.0,  1.0
      );

      float getLuminance(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      float sobel(sampler2D tex, vec2 uv, vec2 texelSize) {
        float gx = 0.0;
        float gy = 0.0;

        for (int i = -1; i <= 1; i++) {
          for (int j = -1; j <= 1; j++) {
            vec2 offset = vec2(float(i), float(j)) * texelSize;
            float lum = getLuminance(texture2D(tex, uv + offset).rgb);
            gx += lum * sobelX[i + 1][j + 1];
            gy += lum * sobelY[i + 1][j + 1];
          }
        }

        return sqrt(gx * gx + gy * gy);
      }

      void main() {
        vec2 ratio = vec2(
          min((uResolution.x / uResolution.y) / (uImageResolution.x / uImageResolution.y), 1.0),
          min((uResolution.y / uResolution.x) / (uImageResolution.y / uImageResolution.x), 1.0)
        );

        vec2 uv = vec2(
          vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
          vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
        );

        vec4 texColor = texture2D(uTexture, uv);
        
        float gray = getLuminance(texColor.rgb);
        vec3 grayscaleColor = vec3(gray);
        texColor.rgb = mix(texColor.rgb, grayscaleColor, uGrayscale);
        
        vec2 texelSize = 1.0 / uResolution;
        float edge = sobel(uTexture, uv, texelSize);
        
        edge = pow(edge, 0.7) * 2.0;
        edge = clamp(edge, 0.0, 1.0);
        
        vec3 edgeColor = vec3(0.9, 0.6, 1.0);
        
        vec3 darkBase = vec3(0.0);
        vec3 baseColor = mix(texColor.rgb, darkBase, uDarkness);
        
        float edgeGlow = edge * uEdgeIntensity * 2.0;
        baseColor += edgeColor * edgeGlow;
        
        vec3 finalColor = clamp(baseColor, 0.0, 1.0);

        gl_FragColor = vec4(finalColor, texColor.a);
      }
    `;

    // Offscreen Canvas Texture Generators
    function createFrontPlateTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext("2d");

        // Rich monochrome dark radial background
        const bgGrad = ctx.createRadialGradient(512, 512, 40, 512, 512, 512);
        bgGrad.addColorStop(0, "#131418");
        bgGrad.addColorStop(0.5, "#0b0c0f");
        bgGrad.addColorStop(1, "#020304");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1024, 1024);

        // Concentric geometric rings — subtle graphite
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        for (let r = 120; r <= 460; r += 55) {
            ctx.beginPath();
            ctx.arc(512, 512, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Secondary subtle dotted ring
        ctx.setLineDash([4, 12]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        ctx.arc(512, 512, 380, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Radial coordinate lines — subtle graphite
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6;
            ctx.beginPath();
            ctx.moveTo(512 + Math.cos(angle) * 80, 512 + Math.sin(angle) * 80);
            ctx.lineTo(512 + Math.cos(angle) * 480, 512 + Math.sin(angle) * 480);
            ctx.stroke();
        }

        // Central Hologram Branding — Clean Monochrome & Restrained
        ctx.shadowColor = "rgba(255, 255, 255, 0.12)";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 50px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("COSMIC RELIC AI", 512, 470);

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#9ca3af";
        ctx.font = "600 15px 'Inter', sans-serif";
        ctx.fillText("DESIGNED AND ENGINEERED BY RAJAB", 512, 532);

        // Core markers — THE SIX CONTROLLED COLORED STONES
        const coreLabels = ["SPACE", "REALITY", "POWER", "MIND", "TIME", "SOUL"];
        const coreColors = ["#42bfff", "#ff4f91", "#9d5cff", "#ffd34e", "#ff9b42", "#56e0a0"];
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3 - Math.PI / 2;
            const x = 512 + Math.cos(angle) * 320;
            const y = 512 + Math.sin(angle) * 320;

            // Vibrant stone glow (the only colored elements in the system)
            ctx.shadowColor = coreColors[i];
            ctx.shadowBlur = 22;
            ctx.fillStyle = coreColors[i];
            ctx.beginPath();
            ctx.arc(x, y, 13, 0, Math.PI * 2);
            ctx.fill();

            // Inner core gem highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Core label — clean soft white / light grey
            ctx.fillStyle = "#d1d5db";
            ctx.font = "600 12px 'Inter', sans-serif";
            ctx.fillText(coreLabels[i], x, y + 28);
        }

        return canvas;
    }

    function createBackPlateTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext("2d");

        // Rich deep monochrome charcoal/black
        const bgGrad = ctx.createRadialGradient(512, 512, 40, 512, 512, 512);
        bgGrad.addColorStop(0, "#16171d");
        bgGrad.addColorStop(0.5, "#0c0d11");
        bgGrad.addColorStop(1, "#030305");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1024, 1024);

        // Subtle graphite flux grid
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        for (let x = 64; x < 1024; x += 96) {
            for (let y = 64; y < 1024; y += 96) {
                ctx.beginPath();
                ctx.arc(x, y, 18, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Inner singularity rings — subtle graphite
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        ctx.arc(512, 512, 280, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath();
        ctx.arc(512, 512, 190, 0, Math.PI * 2);
        ctx.stroke();

        // Welcome Typography — Crisp White with Restrained Soft Glow
        ctx.shadowColor = "rgba(255, 255, 255, 0.25)";
        ctx.shadowBlur = 24;
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 68px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("WELCOME", 512, 512);

        // High-tech circuit brackets — restrained graphite
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(120, 200); ctx.lineTo(120, 120); ctx.lineTo(200, 120);
        ctx.moveTo(904, 200); ctx.lineTo(904, 120); ctx.lineTo(824, 120);
        ctx.moveTo(120, 824); ctx.lineTo(120, 904); ctx.lineTo(200, 904);
        ctx.moveTo(904, 824); ctx.lineTo(904, 904); ctx.lineTo(824, 904);
        ctx.stroke();

        return canvas;
    }

    let isInitialized = false;
    let scene, camera, renderer;
    let material1, material2;
    let texture1, texture2;
    let isIntersecting = false;
    let animationId = null;

    function initScrollDissolve() {
        const canvas = document.getElementById("dissolveCanvas");
        const track = document.getElementById("dissolveTrack");
        const landing = document.getElementById("landingScreen");

        if (!canvas || !track || !window.THREE) {
            return;
        }

        if (isInitialized) return;
        isInitialized = true;

        const width = track.clientWidth || window.innerWidth;
        const height = window.innerHeight;

        // Initialize Three.js Orthographic Camera & Scene
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.set(0, 0, 1);

        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: false,
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

        // Create Textures
        const frontCanvas = createFrontPlateTexture();
        const backCanvas = createBackPlateTexture();

        texture1 = new THREE.CanvasTexture(frontCanvas);
        texture2 = new THREE.CanvasTexture(backCanvas);

        const imageRes = new THREE.Vector2(1024, 1024);
        const screenRes = new THREE.Vector2(width, height);

        // Uniforms for Mesh 1 (Front Face Dissolve)
        const uniforms1 = {
            uTexture: { value: texture1 },
            uResolution: { value: screenRes },
            uImageResolution: { value: imageRes },
            uDissolve: { value: 0.0 },
            uCenter: { value: new THREE.Vector2(0.5, 0.5) },
            uTime: { value: 0.0 },
            uGrayscale: { value: 0.0 },
            uEdgeIntensity: { value: 0.0 },
            uEdgeBrightness: { value: 1.0 }
        };

        // Uniforms for Mesh 2 (Back Face Reverse Reveal)
        const uniforms2 = {
            uTexture: { value: texture2 },
            uResolution: { value: screenRes },
            uImageResolution: { value: imageRes },
            uDissolve: { value: 0.0 },
            uCenter: { value: new THREE.Vector2(0.5, 0.5) },
            uTime: { value: 0.0 },
            uBrightness: { value: 0.0 },
            uEdgeIntensity: { value: 0.6 },
            uDarkness: { value: 1.0 },
            uGrayscale: { value: 1.0 }
        };

        material1 = new THREE.ShaderMaterial({
            vertexShader: coverVertexShader,
            fragmentShader: coverFragmentShader,
            uniforms: uniforms1,
            transparent: true,
            depthTest: false
        });

        material2 = new THREE.ShaderMaterial({
            vertexShader: coverVertexShader,
            fragmentShader: coverFragmentShaderReverse,
            uniforms: uniforms2,
            transparent: true,
            depthTest: false
        });

        const geometry = new THREE.PlaneGeometry(2, 2);

        // Back mesh at z = -0.1
        const meshBack = new THREE.Mesh(geometry, material2);
        meshBack.position.set(0, 0, -0.1);
        scene.add(meshBack);

        // Front mesh at z = 0
        const meshFront = new THREE.Mesh(geometry, material1);
        meshFront.position.set(0, 0, 0);
        scene.add(meshFront);

        // Scroll Tracking & Easing
        let targetProgress = 0.0;
        let currentProgress = 0.0;
        let clock = new THREE.Clock();

        const percentEl = document.getElementById("dissolvePercent");
        const barFillEl = document.getElementById("dissolveBarFill");
        const kernelEl = document.getElementById("dissolveKernel");

        function updateScrollProgress() {
            if (!landing) return;
            const trackRect = track.getBoundingClientRect();
            const landingRect = landing.getBoundingClientRect();

            // Calculate progress through track
            const scrollDistance = track.offsetHeight - window.innerHeight;
            if (scrollDistance <= 0) return;

            const scrolledIntoTrack = landing.scrollTop - track.offsetTop;
            const rawProgress = Math.min(1.0, Math.max(0.0, scrolledIntoTrack / scrollDistance));
            targetProgress = rawProgress;
        }

        if (landing) {
            landing.addEventListener("scroll", updateScrollProgress, { passive: true });
        }

        // Render Loop (Demand-driven via IntersectionObserver)
        function render() {
            if (!isIntersecting) {
                animationId = null;
                return;
            }

            const elapsed = clock.getElapsedTime();

            // Butter-smooth progress lerp
            currentProgress += (targetProgress - currentProgress) * 0.12;
            const progress = currentProgress;

            if (material1) {
                material1.uniforms.uTime.value = elapsed;
                material1.uniforms.uDissolve.value = progress;
                const grayscaleProgress = Math.min(1.0, progress / 0.4);
                material1.uniforms.uGrayscale.value = grayscaleProgress;
                material1.uniforms.uEdgeIntensity.value = progress * 0.5;
                material1.uniforms.uEdgeBrightness.value = 1.0 - progress;
            }

            if (material2) {
                material2.uniforms.uTime.value = elapsed;
                const acceleratedProgress = Math.min(1.0, progress * 1.1);
                material2.uniforms.uEdgeIntensity.value = 0.6 * (1.0 - acceleratedProgress);
                material2.uniforms.uDarkness.value = 1.0 - acceleratedProgress;
                material2.uniforms.uGrayscale.value = 1.0 - acceleratedProgress;
            }

            renderer.render(scene, camera);

            // Update telemetry HUD
            if (percentEl) {
                percentEl.textContent = `DISSOLVE: ${Math.round(progress * 100)}%`;
            }
            if (barFillEl) {
                barFillEl.style.width = `${Math.round(progress * 100)}%`;
            }
            if (kernelEl) {
                if (progress < 0.2) {
                    kernelEl.textContent = "COSMIC RELIC AI";
                } else if (progress < 0.85) {
                    kernelEl.textContent = "SCROLL DISSOLVE TRANSITION";
                } else {
                    kernelEl.textContent = "WELCOME TO COSMIC RELIC";
                }
            }

            animationId = requestAnimationFrame(render);
        }

        // IntersectionObserver to sleep WebGL when not in view
        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    isIntersecting = entry.isIntersecting;
                    if (isIntersecting && !animationId) {
                        clock.start();
                        render();
                    }
                });
            }, { threshold: 0.05 });
            observer.observe(track);
        } else {
            isIntersecting = true;
            render();
        }

        // Responsive Resizing
        window.addEventListener("resize", () => {
            const newWidth = track.clientWidth || window.innerWidth;
            const newHeight = window.innerHeight;
            renderer.setSize(newWidth, newHeight);
            if (material1) material1.uniforms.uResolution.value.set(newWidth, newHeight);
            if (material2) material2.uniforms.uResolution.value.set(newWidth, newHeight);
        }, { passive: true });
    }

    const coresData = [
        { id: "space", name: "SPACE", color: "#42bfff", desc: "Spatial awareness, navigation, environments, and robotic perception." },
        { id: "reality", name: "REALITY", color: "#ff4f91", desc: "Vision, sensing, observation, and physical world interpretation." },
        { id: "power", name: "POWER", color: "#9d5cff", desc: "Execution, automation, tools, and high-precision calculations." },
        { id: "mind", name: "MIND", color: "#ffd34e", desc: "Deep reasoning, semantic classification, and cognitive problem-solving." },
        { id: "time", name: "TIME", color: "#ff9b42", desc: "Longitudinal conversational memory, session context, and temporal continuity." },
        { id: "soul", name: "SOUL", color: "#56e0a0", desc: "Empathetic interaction, ethical alignment, creative synthesis, and persona." }
    ];

    function inspectCore(coreId) {
        if (!coreId) return;
        const core = coresData.find(c => c.id.toLowerCase() === coreId.toLowerCase());
        if (!core) return;

        // Highlight sidebar pill
        document.querySelectorAll(".sidebar-core-pill").forEach(el => {
            el.classList.toggle("active-pill", el.dataset.core === core.id);
        });

        // Highlight showcase card
        document.querySelectorAll(".core-card").forEach(el => {
            el.classList.toggle("active-card", el.dataset.core === core.id);
        });

        // Synchronize with Diagonal Carousel if initialized
        if (window.diagonalCarousel && typeof window.diagonalCarousel.goToCore === "function") {
            window.diagonalCarousel.goToCore(core.id);
        } else {
            // Smoothly scroll down to the cores matrix section fallback
            const landing = document.getElementById("landingScreen");
            const matrixSec = document.getElementById("coresMatrixSection");
            if (landing && matrixSec) {
                landing.scrollTo({
                    top: matrixSec.offsetTop - 30,
                    behavior: "smooth"
                });
            }
        }

        // On small screens, auto-close the drawer so the user immediately sees the core in the carousel
        if (window.innerWidth <= 840 && typeof window.toggleSidebar === "function") {
            const container = document.getElementById("appContainer");
            if (container && !container.classList.contains("sidebar-collapsed")) {
                window.toggleSidebar();
            }
        }

        if (typeof showCosmicNotification === "function") {
            showCosmicNotification(`[${core.name} CORE]: ${core.desc}`);
        }
    }

    function initScrollObserver() {
        const revealElements = document.querySelectorAll(".reveal");
        if (!revealElements.length) return;

        if (!("IntersectionObserver" in window)) {
            revealElements.forEach(el => el.classList.add("active"));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("active");
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: "0px 0px -30px 0px"
        });

        revealElements.forEach(el => observer.observe(el));
    }

    window.inspectCore = inspectCore;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initScrollDissolve();
            initScrollObserver();
        });
    } else {
        initScrollDissolve();
        initScrollObserver();
    }
})();
