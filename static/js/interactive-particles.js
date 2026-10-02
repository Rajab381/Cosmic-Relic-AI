/**
 * Cosmic Relic AI - Interactive Particles Component
 * Three.js interactive particle typography ("COSMIC RELIC AI")
 * Features:
 * - Touch texture cursor trail displacement
 * - Simplex 3D noise drifting
 * - GSAP intro animation (dispersed cosmic cloud -> text formation)
 * - 30fps capped performance rendering
 * - IntersectionObserver & Document visibility optimization
 * - Full Dark/Light theme responsiveness (monochrome silver / bronze)
 */

(function () {
    'use strict';

    // Touch Texture for Cursor Trail Interaction
    class TouchTexture {
        constructor() {
            this.size = 128;
            this.maxAge = 64;
            this.radius = 0.14;
            this.trail = [];

            this.canvas = document.createElement('canvas');
            this.canvas.width = this.size;
            this.canvas.height = this.size;
            this.ctx = this.canvas.getContext('2d');

            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.size, this.size);

            this.texture = new THREE.CanvasTexture(this.canvas);
            this.texture.minFilter = THREE.LinearFilter;
            this.texture.magFilter = THREE.LinearFilter;
        }

        addTouch(point) {
            // point is normalized { x: 0..1, y: 0..1 }
            let force = 1.0;
            const last = this.trail[this.trail.length - 1];
            if (last) {
                const dx = last.x - point.x;
                const dy = last.y - point.y;
                const dd = dx * dx + dy * dy;
                force = Math.min(dd * 8000, 1.0);
            }
            this.trail.push({ x: point.x, y: point.y, age: 0, force: Math.max(force, 0.4) });
        }

        update() {
            this.clear();

            for (let i = this.trail.length - 1; i >= 0; i--) {
                const point = this.trail[i];
                point.age++;
                if (point.age > this.maxAge) {
                    this.trail.splice(i, 1);
                    continue;
                }

                const intensity = (1 - point.age / this.maxAge) * point.force;
                const px = point.x * this.size;
                const py = (1 - point.y) * this.size;
                const radius = this.size * this.radius * (1 - (point.age / this.maxAge) * 0.3);

                const grad = this.ctx.createRadialGradient(px, py, 0, px, py, radius);
                grad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(intensity * 0.9, 1.0)})`);
                grad.addColorStop(0.5, `rgba(255, 255, 255, ${Math.min(intensity * 0.4, 0.5)})`);
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

                this.ctx.beginPath();
                this.ctx.fillStyle = grad;
                this.ctx.arc(px, py, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.texture.needsUpdate = true;
        }

        clear() {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
            this.ctx.fillRect(0, 0, this.size, this.size);
        }
    }

    // Shaders for Interactive Particles
    const vertexShader = `
        uniform sampler2D uTouch;
        uniform float uTime;
        uniform float uProgress;
        uniform float uPixelRatio;
        uniform float uIsLight;

        attribute vec3 aTarget;
        attribute float aRandom;
        attribute float aAngle;
        attribute vec2 aTextUv;

        varying float vAlpha;
        varying float vDistance;

        // Simplex 3D Noise Implementation
        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
        
        float snoise(vec3 v){
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + 1.0 * C.xxx;
            vec3 x2 = x0 - i2 + 2.0 * C.xxx;
            vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
            i = mod(i, 289.0);
            vec4 p = permute( permute( permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            float n_ = 0.142857142857;
            vec3  ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }

        void main() {
            // Sample touch trail texture at particle's text UV
            vec4 touch = texture2D(uTouch, aTextUv);
            float touchForce = touch.r;

            // Organic drifting noise
            float noiseVal = snoise(vec3(aTarget.xy * 0.008, uTime * 0.15 + aRandom * 4.0));
            vec3 noiseOffset = vec3(
                cos(aAngle + uTime * 0.25) * noiseVal * 4.5,
                sin(aAngle + uTime * 0.25) * noiseVal * 4.5,
                noiseVal * 6.0
            );

            // Push particles along direction when cursor interacts
            vec2 pushDir = normalize(aTarget.xy + vec2(cos(aAngle), sin(aAngle)) * 20.0);
            vec3 touchDisplacement = vec3(pushDir * touchForce * 36.0, touchForce * 24.0);

            // Interpolate from cosmic dispersion cloud to text formation via uProgress
            vec3 formPos = aTarget + noiseOffset + touchDisplacement;
            vec3 curPos = mix(position, formPos, uProgress);

            vec4 mvPosition = modelViewMatrix * vec4(curPos, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Perspective point size
            float baseSize = mix(2.6, 4.2, aRandom);
            gl_PointSize = baseSize * uPixelRatio * (280.0 / -mvPosition.z) * (1.0 + touchForce * 0.6);

            vAlpha = smoothstep(0.0, 0.35, uProgress) * mix(0.72, 1.0, aRandom);
            vDistance = touchForce;
        }
    `;

    const fragmentShader = `
        uniform float uIsLight;
        varying float vAlpha;
        varying float vDistance;

        void main() {
            // Soft circular particle
            vec2 centerCoord = gl_PointCoord - vec2(0.5);
            float dist = length(centerCoord);
            if (dist > 0.5) discard;
            float softness = smoothstep(0.5, 0.12, dist);

            // Pure monochrome palette
            // Dark Mode: crisp celestial silver / platinum (#E2E6EF -> #FFFFFF)
            vec3 darkColor = mix(vec3(0.88, 0.90, 0.94), vec3(1.0, 1.0, 1.0), vDistance);
            
            // Light Mode: deep roasted espresso brown (#261A13 -> #3D2B1F)
            vec3 lightColor = mix(vec3(0.16, 0.11, 0.08), vec3(0.28, 0.19, 0.14), vDistance);

            vec3 finalColor = mix(darkColor, lightColor, uIsLight);
            gl_FragColor = vec4(finalColor, vAlpha * softness);
        }
    `;

    class InteractiveParticles {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas || !window.THREE) return;

            this.wrap = this.canvas.parentElement;
            this.touch = new TouchTexture();

            this.isRunning = false;
            this.lastFrameTime = 0;
            this.fpsInterval = 1000 / 30; // 30fps capped rendering limit

            this.mouse = new THREE.Vector2(-10, -10);
            this.clock = new THREE.Clock();

            this.init();
        }

        init() {
            const width = this.wrap ? this.wrap.clientWidth : window.innerWidth;
            const height = this.wrap ? this.wrap.clientHeight : 420;

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            this.camera.position.set(0, 0, 240);

            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

            this.createParticleMesh(width, height);
            this.bindEvents();

            // Run intro animation
            this.playIntro();

            this.start();
        }

        sampleTextParticles(width, height) {
            // Generate offscreen sampling canvas for "COSMIC RELIC AI"
            const sampleCanvas = document.createElement('canvas');
            const sampleWidth = 720;
            const sampleHeight = 160;
            sampleCanvas.width = sampleWidth;
            sampleCanvas.height = sampleHeight;
            const sctx = sampleCanvas.getContext('2d');

            sctx.fillStyle = '#000000';
            sctx.fillRect(0, 0, sampleWidth, sampleHeight);

            sctx.fillStyle = '#ffffff';
            sctx.textAlign = 'center';
            sctx.textBaseline = 'middle';
            sctx.font = '900 48px "Orbitron", "Inter", "Helvetica Neue", sans-serif';

            // High-contrast clean typography rendering
            sctx.fillText('COSMIC RELIC AI', sampleWidth / 2, sampleHeight / 2);

            const imgData = sctx.getImageData(0, 0, sampleWidth, sampleHeight).data;

            const isMobile = window.innerWidth <= 768;
            const step = isMobile ? 4 : 3;

            const positions = [];
            const targets = [];
            const textUvs = [];
            const randoms = [];
            const angles = [];

            // Scale text to fit viewport cleanly
            const textAspect = sampleWidth / sampleHeight;
            const displayWidth = Math.min(width * 0.85, 480);
            const displayHeight = displayWidth / textAspect;

            for (let y = 0; y < sampleHeight; y += step) {
                for (let x = 0; x < sampleWidth; x += step) {
                    const idx = (y * sampleWidth + x) * 4;
                    const r = imgData[idx];

                    if (r > 128) {
                        // Normalized UV coordinate in [0, 1]
                        const u = x / sampleWidth;
                        const v = 1 - y / sampleHeight;

                        // Target 3D coordinates centered in scene
                        const tx = (u - 0.5) * displayWidth;
                        const ty = (v - 0.5) * displayHeight;
                        const tz = (Math.random() - 0.5) * 8.0;

                        targets.push(tx, ty, tz);

                        // Initial dispersed cloud position
                        const rad = 140 + Math.random() * 220;
                        const theta = Math.random() * Math.PI * 2;
                        const phi = (Math.random() - 0.5) * Math.PI;

                        const px = Math.cos(theta) * Math.cos(phi) * rad;
                        const py = Math.sin(phi) * rad;
                        const pz = Math.sin(theta) * Math.cos(phi) * rad;

                        positions.push(px, py, pz);

                        textUvs.push(u, v);
                        randoms.push(Math.random());
                        angles.push(Math.random() * Math.PI * 2);
                    }
                }
            }

            return { positions, targets, textUvs, randoms, angles };
        }

        createParticleMesh(width, height) {
            const data = this.sampleTextParticles(width, height);

            this.geometry = new THREE.BufferGeometry();
            this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
            this.geometry.setAttribute('aTarget', new THREE.Float32BufferAttribute(data.targets, 3));
            this.geometry.setAttribute('aTextUv', new THREE.Float32BufferAttribute(data.textUvs, 2));
            this.geometry.setAttribute('aRandom', new THREE.Float32BufferAttribute(data.randoms, 1));
            this.geometry.setAttribute('aAngle', new THREE.Float32BufferAttribute(data.angles, 1));

            const isLight = document.documentElement.classList.contains('light-theme') || document.body.classList.contains('light-theme');

            this.uniforms = {
                uTouch: { value: this.touch.texture },
                uTime: { value: 0 },
                uProgress: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
                uIsLight: { value: isLight ? 1.0 : 0.0 }
            };

            this.material = new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: this.uniforms,
                transparent: true,
                depthTest: false,
                blending: THREE.NormalBlending
            });

            this.points = new THREE.Points(this.geometry, this.material);
            this.scene.add(this.points);
        }

        playIntro() {
            if (window.gsap) {
                window.gsap.to(this.uniforms.uProgress, {
                    value: 1.0,
                    duration: 2.2,
                    ease: 'power3.out'
                });
            } else {
                let p = 0;
                const animateIntro = () => {
                    p += 0.02;
                    this.uniforms.uProgress.value = Math.min(p, 1.0);
                    if (p < 1.0) requestAnimationFrame(animateIntro);
                };
                animateIntro();
            }
        }

        bindEvents() {
            this.handleMouseMove = (e) => {
                if (!this.wrap) return;
                const rect = this.wrap.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;

                if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
                    this.touch.addTouch({ x, y });
                }
            };

            this.handleTouchMove = (e) => {
                if (!this.wrap || !e.touches[0]) return;
                const touch = e.touches[0];
                const rect = this.wrap.getBoundingClientRect();
                const x = (touch.clientX - rect.left) / rect.width;
                const y = (touch.clientY - rect.top) / rect.height;

                if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
                    this.touch.addTouch({ x, y });
                }
            };

            window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
            window.addEventListener('touchmove', this.handleTouchMove, { passive: true });

            this.handleResize = () => {
                if (!this.renderer || !this.camera || !this.wrap) return;
                const w = this.wrap.clientWidth || window.innerWidth;
                const h = this.wrap.clientHeight || 420;

                this.camera.aspect = w / h;
                this.camera.updateProjectionMatrix();

                this.renderer.setSize(w, h);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
                if (this.uniforms) {
                    this.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.5);
                }
            };

            window.addEventListener('resize', this.handleResize, { passive: true });

            // Document visibility optimization
            this.handleVisibility = () => {
                if (document.hidden) {
                    this.stop();
                } else if (this.isIntersecting) {
                    this.start();
                }
            };
            document.addEventListener('visibilitychange', this.handleVisibility);

            // IntersectionObserver optimization
            if ('IntersectionObserver' in window && this.wrap) {
                this.observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        this.isIntersecting = entry.isIntersecting;
                        if (this.isIntersecting) {
                            this.start();
                        } else {
                            this.stop();
                        }
                    });
                }, { threshold: 0.05 });
                this.observer.observe(this.wrap);
            } else {
                this.isIntersecting = true;
            }
        }

        updateTheme(isLight) {
            if (this.uniforms && this.uniforms.uIsLight) {
                this.uniforms.uIsLight.value = isLight ? 1.0 : 0.0;
            }
        }

        start() {
            if (this.isRunning) return;
            this.isRunning = true;
            this.clock.start();
            this.tick(performance.now());
        }

        stop() {
            this.isRunning = false;
        }

        tick(now) {
            if (!this.isRunning) return;

            requestAnimationFrame((time) => this.tick(time));

            // 30fps capped frame rate execution
            const elapsed = now - this.lastFrameTime;
            if (elapsed < this.fpsInterval) return;

            this.lastFrameTime = now - (elapsed % this.fpsInterval);

            const dt = this.clock.getElapsedTime();
            if (this.uniforms) {
                this.uniforms.uTime.value = dt;
            }

            this.touch.update();
            this.renderer.render(this.scene, this.camera);
        }

        destroy() {
            this.stop();
            window.removeEventListener('mousemove', this.handleMouseMove);
            window.removeEventListener('touchmove', this.handleTouchMove);
            window.removeEventListener('resize', this.handleResize);
            document.removeEventListener('visibilitychange', this.handleVisibility);
            if (this.observer) this.observer.disconnect();

            if (this.geometry) this.geometry.dispose();
            if (this.material) this.material.dispose();
            if (this.renderer) this.renderer.dispose();
        }
    }

    window.InteractiveParticles = InteractiveParticles;
})();
