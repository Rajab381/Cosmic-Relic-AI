/* =========================================================
   EDITH AI
   CLEAN COSMIC INTERFACE
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

const CONFIG = {

    /* Galaxy */
    galaxyScale: 1,
    galaxyRotationSpeed: 0.000025,
    galaxyArmSpeed: 0.000035,
    galaxyDustSpeed: 0.00002,

    /* Six-core orbit */
    orbitX: 310,
    orbitY: 185,
    orbitZ: 225,

    rotationSpeed: 0.00018,

    /* Mouse */
    mouseInfluenceX: 18,
    mouseInfluenceY: 13,

    mouseOffsetX: 4,
    mouseOffsetY: 3,

    smoothing: 0.045,
    galaxyTiltX: 7,
    galaxyTiltY: 9,

    /* Layer 1 */
    starCount: 220,

    /* Layer 2 */
    galacticStarCount: 620,
    galacticStarRadius: 390,
    galacticPlaneThickness: 90,

    /* Dust */
    dustCount: 110,

    /* Shooting stars */
    shootingStarCount: 6
};


/* =========================================================
   SIX INTELLIGENCE CORES
   ========================================================= */

const cores = [

    {
        id: "space",
        name: "SPACE",
        description: "Spatial awareness, navigation, environments, and robotic perception.",
        color: "#42bfff",
        symbol: "✦"
    },

    {
        id: "reality",
        name: "REALITY",
        description: "Vision, sensing, observation, and interpretation of the physical world.",
        color: "#ff4f91",
        symbol: "◆"
    },

    {
        id: "power",
        name: "POWER",
        description: "Execution, automation, tools, and system-level actions.",
        color: "#9d5cff",
        symbol: "ϟ"
    },

    {
        id: "mind",
        name: "MIND",
        description: "Reasoning, learning, analysis, and intelligent decision-making.",
        color: "#ffd34e",
        symbol: "✧"
    },

    {
        id: "time",
        name: "TIME",
        description: "Memory, context, history, and temporal continuity.",
        color: "#ff9b42",
        symbol: "◉"
    },

    {
        id: "soul",
        name: "SOUL",
        description: "Interaction, personality, creativity, and human-centered assistance.",
        color: "#56e0a0",
        symbol: "◇"
    }

];


/* =========================================================
   STATE
   ========================================================= */

let cosmicInterface = null;

let cosmicStage = null;

let galaxySystem = null;

let orbitalSystem = null;

let galaxyParticleField = null;

let shootingStarField = null;

let currentAngle = 0;

let galaxyAngle = 0;

let armAngle = 0;

let dustAngle = 0;

let mouseTargetX = 0;

let mouseTargetY = 0;

let mouseCurrentX = 0;

let mouseCurrentY = 0;

let animationFrame = null;

let coreElements = [];


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initCosmicInterface() {

    const hero = document.getElementById("hero");

    if (!hero) {

        console.warn(
            "EDITH Cosmic Interface: #hero not found."
        );

        return;
    }


    /* Prevent duplicate interface */

    const existing =
        hero.querySelector(".cosmic-interface");

    if (existing) {

        existing.remove();
    }


    /* Create main interface */

    cosmicInterface =
        document.createElement("div");

    cosmicInterface.className =
        "cosmic-interface";


    /* Build system */

    createInterface();

    createGalaxy();

    createCores();

    createCosmicNetwork();

    createStars();

    createGalacticStars();

    createNebulaDust();

    createShootingStars();

    setupMouseTracking();

    setupCoreEvents();

    startAnimation();

    console.log(
        "EDITH Cosmic Interface initialized."
    );
}


/* =========================================================
   CREATE INTERFACE
   ========================================================= */

function createInterface() {

    cosmicInterface.innerHTML = `

        <div class="cosmic-space"></div>

        <div class="cosmic-star-field"></div>

        <div class="galactic-star-field"></div>

        <div class="cosmic-nebula nebula-one"></div>

        <div class="cosmic-nebula nebula-two"></div>

        <div class="cosmic-stage">

            <div class="galaxy-system">

                <div class="galaxy-halo"></div>

                <div class="galaxy-disc galaxy-disc-back"></div>

                <div class="galaxy-disc galaxy-disc-main"></div>

                <div class="galaxy-disc galaxy-disc-front"></div>

                <div class="galaxy-arm galaxy-arm-1"></div>

                <div class="galaxy-arm galaxy-arm-2"></div>

                <div class="galaxy-arm galaxy-arm-3"></div>

                <div class="galaxy-arm galaxy-arm-4"></div>

                <div class="galaxy-dust-band galaxy-dust-1"></div>

                <div class="galaxy-dust-band galaxy-dust-2"></div>

                <div class="galaxy-dust-band galaxy-dust-3"></div>

                <div class="galaxy-core-glow"></div>

                <div class="galaxy-core"></div>

                <div class="galaxy-core-inner"></div>

                <div class="galaxy-lens"></div>

                <div class="galaxy-particle-field"></div>

            </div>

            <!-- =====================================================
     LAYER 7 — COSMIC NEURAL NETWORK
====================================================== -->

<div class="cosmic-network-layer">

    <svg
        class="cosmic-network-svg"
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
    >

        <defs>

            <filter
                id="cosmic-network-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
            >

                <feGaussianBlur
                    stdDeviation="3"
                    result="blur"
                />

                <feMerge>

                    <feMergeNode in="blur"></feMergeNode>

                    <feMergeNode in="SourceGraphic"></feMergeNode>

                </feMerge>

            </filter>

        </defs>

        <g
            class="cosmic-network-branches"
            filter="url(#cosmic-network-glow)"
        ></g>

        <g
            class="cosmic-network-nodes"
        ></g>

        <g
            class="cosmic-network-energy"
        ></g>

    </svg>

</div>


<div class="cosmic-identity">

    <div class="cosmic-identity-title">
        COSMIC RELIC
    </div>

    <div class="cosmic-identity-subtitle">
        AI
    </div>

    <div class="cosmic-identity-credit">
        MADE BY RAJAB
    </div>

    <div class="cosmic-identity-status">
        SIX INTELLIGENCE CORES
    </div>

    <div class="cosmic-core-hud" id="cosmicCoreHud" role="status" aria-live="polite">
        <div class="cosmic-hud-header">
            <span class="cosmic-hud-tag" id="hudTag">NEURAL TELEMETRY</span>
            <span class="cosmic-hud-title" id="hudTitle">SYSTEM READY</span>
        </div>
        <div class="cosmic-hud-body">
            <span class="cosmic-hud-desc" id="hudDesc">Hover or select a core to inspect neural telemetry and specialized domain intelligence.</span><span class="cosmic-hud-cursor" id="hudCursor">_</span>
        </div>
    </div>

</div>


<!-- Existing core container (emptied) -->

<div class="orbital-system"></div>

        </div>

        <div class="shooting-star-field"></div>

    `;


    cosmicInterface
        .style
        .setProperty(
            "--galaxy-scale",
            CONFIG.galaxyScale
        );


    document
        .getElementById("hero")
        .appendChild(cosmicInterface);


    cosmicStage =
        cosmicInterface.querySelector(
            ".cosmic-stage"
        );

    galaxySystem =
        cosmicInterface.querySelector(
            ".galaxy-system"
        );

    orbitalSystem =
        cosmicInterface.querySelector(
            ".orbital-system"
        );

    galaxyParticleField =
        cosmicInterface.querySelector(
            ".galaxy-particle-field"
        );

    shootingStarField =
        cosmicInterface.querySelector(
            ".shooting-star-field"
        );
}


/* =========================================================
   CREATE GALAXY
   ========================================================= */

function createGalaxy() {

    if (!galaxySystem) {
        return;
    }


    galaxySystem.style.setProperty(
        "--galaxy-angle",
        "0deg"
    );

    galaxySystem.style.setProperty(
        "--arm-angle",
        "0deg"
    );

    galaxySystem.style.setProperty(
        "--dust-angle",
        "0deg"
    );


    createGalaxyParticles();
    createStellarClusters();
}


/* =========================================================
   GALACTIC PARTICLES
   ========================================================= */

function createGalaxyParticles() {

    if (!galaxyParticleField) {
        return;
    }


    galaxyParticleField.innerHTML = "";


    const total =
        CONFIG.galacticStarCount;


    for (
        let i = 0;
        i < total;
        i++
    ) {

        const star =
            document.createElement("span");


        star.className =
            "galaxy-central-star";


        const angle =
            Math.random() *
            Math.PI *
            2;


        /*
         * Radial distribution.
         *
         * More stars close to the
         * galactic center.
         */

        const radius =
            Math.pow(
                Math.random(),
                1.8
            ) *
            CONFIG.galacticStarRadius;


        const x =
            Math.cos(angle) *
            radius;


        const y =
            Math.sin(angle) *
            radius *
            0.38;


        const z =
            (
                Math.random() - 0.5
            ) *
            CONFIG.galacticPlaneThickness;


        const size =
            Math.random() <
            0.035

                ? 2.5 + Math.random() * 2.2

                : 0.45 + Math.random() * 1.35;


        const opacity =
            0.22 +
            Math.random() * 0.68;


        star.style.width =
            `${size}px`;

        star.style.height =
            `${size}px`;

        star.style.left =
            `calc(50% + ${x}px)`;

        star.style.top =
            `calc(50% + ${y}px)`;

        star.style.opacity =
            opacity;

        star.style.transform =
            `translate3d(0,0,${z}px)`;


        if (
            Math.random() <
            0.12
        ) {

            star.style.background =
                "#fff5dc";

        } else {

            star.style.background =
                "#e8f5ff";
        }


        if (
            size > 2.4
        ) {

            star.style.boxShadow =
                `
                0 0 4px #ffffff,
                0 0 10px rgba(170,215,255,.55)
                `;

        }


        star.style.animationDelay =
            `${Math.random() * 6}s`;


        galaxyParticleField
            .appendChild(star);
    }
}

function createStellarClusters() {

    const galaxySystem =
        document.querySelector(".galaxy-system");

    if (!galaxySystem) {
        return;
    }

    /*
     * Prevent duplicate cluster generation.
     */
    if (
        galaxySystem.querySelector(
            ".stellar-cluster-field"
        )
    ) {
        return;
    }

    const field =
        document.createElement("div");

    field.className =
        "stellar-cluster-field";

    /*
     * Cluster definitions.
     *
     * x / y:
     * position relative to the galaxy.
     *
     * count:
     * number of stars.
     *
     * spread:
     * size of the cluster.
     */
    const clusters = [

        {
            x: 18,
            y: 46,
            count: 34,
            spread: 70
        },

        {
            x: 31,
            y: 30,
            count: 28,
            spread: 58
        },

        {
            x: 68,
            y: 34,
            count: 30,
            spread: 64
        },

        {
            x: 79,
            y: 58,
            count: 32,
            spread: 72
        },

        {
            x: 51,
            y: 49,
            count: 42,
            spread: 55
        }

    ];

    clusters.forEach(
        (cluster, clusterIndex) => {

            const clusterElement =
                document.createElement("div");

            clusterElement.className =
                "stellar-cluster";

            clusterElement.style.left =
                `${cluster.x}%`;

            clusterElement.style.top =
                `${cluster.y}%`;

            clusterElement.style.setProperty(
                "--cluster-index",
                clusterIndex
            );

            /*
             * Generate individual stars.
             */
            for (
                let i = 0;
                i < cluster.count;
                i++
            ) {

                const star =
                    document.createElement("span");

                star.className =
                    "stellar-cluster-star";

                /*
                 * Gaussian-like distribution.
                 *
                 * This creates a denser center
                 * and softer edges.
                 */
                const angle =
                    Math.random() *
                    Math.PI *
                    2;

                const distance =
                    Math.pow(
                        Math.random(),
                        1.8
                    ) *
                    cluster.spread;

                const x =
                    Math.cos(angle) *
                    distance;

                const y =
                    Math.sin(angle) *
                    distance *
                    0.62;

                star.style.setProperty(
                    "--star-x",
                    `${x}px`
                );

                star.style.setProperty(
                    "--star-y",
                    `${y}px`
                );

                /*
                 * Depth.
                 *
                 * Negative = farther
                 * Positive = closer
                 */
                const depth =
                    Math.round(
                        (Math.random() - 0.5) *
                        120
                    );

                star.style.setProperty(
                    "--star-z",
                    `${depth}px`
                );

                /*
                 * Size distribution.
                 */
                const size =
                    Math.random() < 0.12
                        ? 2.4 + Math.random() * 1.8
                        : 0.65 + Math.random() * 1.35;

                star.style.width =
                    `${size}px`;

                star.style.height =
                    `${size}px`;

                /*
                 * Twinkle timing.
                 */
                star.style.setProperty(
                    "--twinkle-delay",
                    `${Math.random() * 6}s`
                );

                star.style.setProperty(
                    "--twinkle-duration",
                    `${4 + Math.random() * 5}s`
                );

                /*
                 * A few stars become
                 * stronger cluster highlights.
                 */
                if (
                    Math.random() < 0.13
                ) {

                    star.classList.add(
                        "stellar-cluster-bright"
                    );

                }

                clusterElement.appendChild(
                    star
                );
            }

            field.appendChild(
                clusterElement
            );
        }
    );

    galaxySystem.appendChild(
        field
    );
}

/* =========================================================
   SIX CORES (REFINED ENDPOINT ARCHITECTURE)
   ========================================================= */

function createCores() {

    if (orbitalSystem) {
        orbitalSystem.innerHTML = "";
    }

    coreElements = [];
}


/* =========================================================
   BACKGROUND STAR FIELD
   ========================================================= */

function createStars() {

    const container =
        cosmicInterface.querySelector(
            ".cosmic-star-field"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const farLayer =
        document.createElement("div");

    farLayer.className =
        "star-depth-layer star-depth-far";


    const midLayer =
        document.createElement("div");

    midLayer.className =
        "star-depth-layer star-depth-mid";


    const nearLayer =
        document.createElement("div");

    nearLayer.className =
        "star-depth-layer star-depth-near";


    container.appendChild(
        farLayer
    );

    container.appendChild(
        midLayer
    );

    container.appendChild(
        nearLayer
    );


    const farCount =
        Math.floor(
            CONFIG.starCount * 0.45
        );

    const midCount =
        Math.floor(
            CONFIG.starCount * 0.35
        );

    const nearCount =
        CONFIG.starCount -
        farCount -
        midCount;


    createStarLayer(
        farLayer,
        farCount,
        "far"
    );

    createStarLayer(
        midLayer,
        midCount,
        "mid"
    );

    createStarLayer(
        nearLayer,
        nearCount,
        "near"
    );
}


/* =========================================================
   STAR LAYER
   ========================================================= */

function createStarLayer(
    layer,
    count,
    depth
) {

    for (
        let i = 0;
        i < count;
        i++
    ) {

        const star =
            document.createElement("span");


        star.className =
            `cosmic-star cosmic-star-${depth}`;


        const size =
            depth === "far"

                ? 0.6 +
                  Math.random() * 1.0

                : depth === "mid"

                    ? 0.8 +
                      Math.random() * 1.5

                    : 1.0 +
                      Math.random() * 2.0;


        star.style.width =
            `${size}px`;

        star.style.height =
            `${size}px`;


        star.style.left =
            `${Math.random() * 100}%`;

        star.style.top =
            `${Math.random() * 100}%`;


        star.style.animationDuration =
            `${3 + Math.random() * 6}s`;


        star.style.animationDelay =
            `${Math.random() * 7}s`;


        if (
            Math.random() <
            (
                depth === "near"
                    ? 0.08
                    : 0.025
            )
        ) {

            star.classList.add(
                "cosmic-star-bright"
            );
        }


        layer.appendChild(star);
    }
}


/* =========================================================
   NEBULA DUST
   ========================================================= */

function createNebulaDust() {

    const space =
        cosmicInterface.querySelector(
            ".cosmic-space"
        );


    if (!space) {
        return;
    }


    for (
        let i = 0;
        i < CONFIG.dustCount;
        i++
    ) {

        const dust =
            document.createElement("span");


        dust.className =
            "cosmic-dust";


        const size =
            0.5 +
            Math.random() * 2;


        dust.style.width =
            `${size}px`;

        dust.style.height =
            `${size}px`;


        dust.style.left =
            `${Math.random() * 100}%`;

        dust.style.top =
            `${Math.random() * 100}%`;


        dust.style.opacity =
            0.05 +
            Math.random() * 0.35;


        space.appendChild(
            dust
        );
    }
}


/* =========================================================
   SHOOTING STARS
   ========================================================= */

function createShootingStars() {

    if (!shootingStarField) {
        return;
    }


    shootingStarField.innerHTML = "";


    for (
        let i = 0;
        i < CONFIG.shootingStarCount;
        i++
    ) {

        const star =
            document.createElement("div");


        star.className =
            "shooting-star";


        star.style.left =
            `${20 + Math.random() * 80}%`;

        star.style.top =
            `${5 + Math.random() * 65}%`;


        star.style.setProperty(
            "--shooting-duration",
            `${4 + Math.random() * 5}s`
        );


        star.style.setProperty(
            "--shooting-delay",
            `${Math.random() * 12}s`
        );


        shootingStarField
            .appendChild(star);
    }
}


/* =========================================================
   MOUSE TRACKING
   ========================================================= */

function setupMouseTracking() {

    window.addEventListener(
        "mousemove",
        (event) => {

            const width =
                window.innerWidth;

            const height =
                window.innerHeight;


            const normalizedX =
                (
                    event.clientX -
                    width / 2
                ) /
                (
                    width / 2
                );


            const normalizedY =
                (
                    event.clientY -
                    height / 2
                ) /
                (
                    height / 2
                );


            mouseTargetX =
                normalizedX *
                CONFIG.mouseInfluenceX;


            mouseTargetY =
                normalizedY *
                CONFIG.mouseInfluenceY;


            const glow =
                document.querySelector(
                    ".cursor-glow"
                );


            if (glow) {

                glow.style.left =
                    `${event.clientX}px`;

                glow.style.top =
                    `${event.clientY}px`;
            }

        },
        {
            passive: true
        }
    );
}


/* =========================================================
   CORE EVENTS
   ========================================================= */

function setupCoreEvents() {

    coreElements.forEach(
        (coreObject) => {

            coreObject.element
                .addEventListener(
                    "click",
                    () => {

                        activateCore(
                            coreObject.index
                        );
                    }
                );
        }
    );
}


/* =========================================================
   ACTIVATE CORE
   ========================================================= */

function activateCore(index) {

    coreElements.forEach(
        (item) => {

            item.element.classList.remove(
                "active"
            );
        }
    );


    const selected =
        coreElements[index];


    if (!selected) {
        return;
    }


    selected.element.classList.add(
        "active"
    );


    const core =
        cores[index];


    /*
     * Keep this event available for
     * future routing logic.
     */

    document.dispatchEvent(
        new CustomEvent(
            "edith-core-activated",
            {
                detail: core
            }
        )
    );


    console.log(
        `EDITH core activated: ${core.name}`
    );
}


/* =========================================================
   LAYER 7 — COSMIC NEURAL NETWORK
   ========================================================= */
/* =========================================================
   LAYER 7 — ORGANIC COSMIC NEURAL NETWORK
   ========================================================= */

function createCosmicNetwork() {

    const interfaceRoot =
        document.querySelector(
            ".cosmic-interface"
        );

    if (!interfaceRoot) {

        console.warn(
            "Cosmic Relic: interface root not found."
        );

        return;
    }


    const branches =
        interfaceRoot.querySelector(
            ".cosmic-network-branches"
        );

    const nodes =
        interfaceRoot.querySelector(
            ".cosmic-network-nodes"
        );

    const energy =
        interfaceRoot.querySelector(
            ".cosmic-network-energy"
        );


    if (
        !branches ||
        !nodes ||
        !energy
    ) {

        console.warn(
            "Cosmic Relic: network SVG groups not found."
        );

        return;
    }


    /*
     * Clear previous network.
     */

    branches.innerHTML = "";
    nodes.innerHTML = "";
    energy.innerHTML = "";


    const SVG_NS =
        "http://www.w3.org/2000/svg";


    /*
     * Central intelligence point.
     */

    const center = {

        x: 500,
        y: 350

    };


    /*
     * Six intelligence territories.
     *
     * These are deliberately irregular.
     * We do NOT want a perfect radial flower.
     */

    const regions = [

        {
            id: "space",
            color: "#42bfff",

            endpoint: {
                x: 500,
                y: 82
            },

            spread: 34,
            branches: 5
        },

        {
            id: "reality",
            color: "#ff4f91",

            endpoint: {
                x: 850,
                y: 190
            },

            spread: 30,
            branches: 5
        },

        {
            id: "power",
            color: "#9d5cff",

            endpoint: {
                x: 850,
                y: 505
            },

            spread: 38,
            branches: 6
        },

        {
            id: "mind",
            color: "#ffd34e",

            endpoint: {
                x: 505,
                y: 635
            },

            spread: 32,
            branches: 5
        },

        {
            id: "time",
            color: "#ff9b42",

            endpoint: {
                x: 145,
                y: 510
            },

            spread: 38,
            branches: 6
        },

        {
            id: "soul",
            color: "#56e0a0",

            endpoint: {
                x: 150,
                y: 185
            },

            spread: 30,
            branches: 5
        }

    ];


    /*
     * -------------------------------------------------------
     * Helper: create SVG path
     * -------------------------------------------------------
     */

    function createPath(
        d,
        className,
        color,
        width,
        opacity
    ) {

        const path =
            document.createElementNS(
                SVG_NS,
                "path"
            );


        path.setAttribute(
            "d",
            d
        );


        path.setAttribute(
            "class",
            className
        );


        path.setAttribute(
            "stroke",
            color
        );


        path.setAttribute(
            "stroke-width",
            width
        );


        path.setAttribute(
            "fill",
            "none"
        );


        path.setAttribute(
            "stroke-linecap",
            "round"
        );


        path.setAttribute(
            "stroke-linejoin",
            "round"
        );


        path.style.opacity =
            opacity;


        path.style.setProperty(
            "--branch-color",
            color
        );


        return path;

    }


    /*
     * -------------------------------------------------------
     * Helper: create node
     * -------------------------------------------------------
     */

    function createNode(
        x,
        y,
        radius,
        color,
        className
    ) {

        const node =
            document.createElementNS(
                SVG_NS,
                "circle"
            );


        node.setAttribute(
            "cx",
            x
        );


        node.setAttribute(
            "cy",
            y
        );


        node.setAttribute(
            "r",
            radius
        );


        node.setAttribute(
            "fill",
            color
        );


        node.setAttribute(
            "class",
            className
        );


        node.style.setProperty(
            "--node-color",
            color
        );


        nodes.appendChild(
            node
        );


        return node;

    }


    /*
     * -------------------------------------------------------
     * Helper: point on cubic Bézier curve
     * -------------------------------------------------------
     */

    function bezierPoint(
        p0,
        p1,
        p2,
        p3,
        t
    ) {

        const inverse =
            1 - t;


        return {

            x:
                inverse * inverse * inverse * p0.x +

                3 *
                inverse *
                inverse *
                t *
                p1.x +

                3 *
                inverse *
                t *
                t *
                p2.x +

                t *
                t *
                t *
                p3.x,


            y:
                inverse * inverse * inverse * p0.y +

                3 *
                inverse *
                inverse *
                t *
                p1.y +

                3 *
                inverse *
                t *
                t *
                p2.y +

                t *
                t *
                t *
                p3.y

        };

    }


    /*
     * -------------------------------------------------------
     * CREATE SIX ORGANIC NETWORK TERRITORIES
     * -------------------------------------------------------
     */

    regions.forEach(
        (region, regionIndex) => {


            const end =
                region.endpoint;


            const dx =
                end.x -
                center.x;


            const dy =
                end.y -
                center.y;


            const length =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            const directionX =
                dx /
                length;


            const directionY =
                dy /
                length;


            /*
             * Perpendicular direction.
             */

            const normalX =
                -directionY;


            const normalY =
                directionX;


            /*
             * Each territory bends differently.
             */

            const bendDirection =
                regionIndex % 2 === 0
                    ? 1
                    : -1;


            const bend =
                (
                    28 +
                    (regionIndex % 3) * 12
                ) *
                bendDirection;


            /*
             * Main trunk control points.
             */

            const control1 = {

                x:
                    center.x +
                    dx * 0.27 +
                    normalX * bend,

                y:
                    center.y +
                    dy * 0.27 +
                    normalY * bend

            };


            const control2 = {

                x:
                    center.x +
                    dx * 0.68 -
                    normalX * bend * 0.72,

                y:
                    center.y +
                    dy * 0.68 -
                    normalY * bend * 0.72

            };


            /*
             * Main organic trunk.
             */

            const trunkPath = `

                M
                ${center.x}
                ${center.y}

                C
                ${control1.x}
                ${control1.y},

                ${control2.x}
                ${control2.y},

                ${end.x}
                ${end.y}

            `;


            const trunk =
                createPath(
                    trunkPath,
                    "cosmic-network-branch",
                    region.color,
                    1.45,
                    0.72
                );


            branches.appendChild(
                trunk
            );


            /*
             * ------------------------------------------------
             * MAIN TRUNK NODES
             * ------------------------------------------------
             */

            const trunkNodeCount =
                5 +
                (
                    regionIndex %
                    2
                );


            for (
                let n = 1;
                n <= trunkNodeCount;
                n++
            ) {


                const t =
                    n /
                    (
                        trunkNodeCount +
                        1
                    );


                const point =
                    bezierPoint(
                        center,
                        control1,
                        control2,
                        end,
                        t
                    );


                createNode(
                    point.x,
                    point.y,
                    n % 2 === 0
                        ? 2.7
                        : 1.9,
                    region.color,
                    "cosmic-network-node"
                );


                /*
                 * ------------------------------------------------
                 * SECONDARY BRANCHES
                 * ------------------------------------------------
                 *
                 * Branches emerge from different positions
                 * along the trunk.
                 */

                if (
                    n === 2 ||
                    n === 3 ||
                    n === 4
                ) {


                    const branchDirection =
                        n % 2 === 0
                            ? 1
                            : -1;


                    const branchLength =
                        42 +
                        (
                            regionIndex *
                            7
                        ) +
                        (
                            n *
                            5
                        );


                    const branchAngle =
                        branchDirection *
                        (
                            0.55 +
                            (
                                regionIndex %
                                3
                            ) *
                            0.11
                        );


                    const branchDX =
                        (
                            normalX *
                            Math.cos(
                                branchAngle
                            )
                        ) +

                        (
                            directionX *
                            Math.sin(
                                branchAngle
                            )
                        );


                    const branchDY =
                        (
                            normalY *
                            Math.cos(
                                branchAngle
                            )
                        ) +

                        (
                            directionY *
                            Math.sin(
                                branchAngle
                            )
                        );


                    const branchEnd = {

                        x:
                            point.x +
                            branchDX *
                            branchLength,

                        y:
                            point.y +
                            branchDY *
                            branchLength

                    };


                    /*
                     * Curved secondary branch.
                     */

                    const branchControl1 = {

                        x:
                            point.x +
                            branchDX *
                            branchLength *
                            0.32 +
                            directionX *
                            13,

                        y:
                            point.y +
                            branchDY *
                            branchLength *
                            0.32 +
                            directionY *
                            13

                    };


                    const branchControl2 = {

                        x:
                            point.x +
                            branchDX *
                            branchLength *
                            0.72 -
                            directionX *
                            10,

                        y:
                            point.y +
                            branchDY *
                            branchLength *
                            0.72 -
                            directionY *
                            10

                    };


                    const secondaryPath = `

                        M
                        ${point.x}
                        ${point.y}

                        C
                        ${branchControl1.x}
                        ${branchControl1.y},

                        ${branchControl2.x}
                        ${branchControl2.y},

                        ${branchEnd.x}
                        ${branchEnd.y}

                    `;


                    branches.appendChild(

                        createPath(
                            secondaryPath,
                            "cosmic-network-secondary",
                            region.color,
                            0.85,
                            0.40
                        )

                    );


                    /*
                     * Secondary branch node.
                     */

                    createNode(
                        branchEnd.x,
                        branchEnd.y,
                        2.4,
                        region.color,
                        "cosmic-network-node"
                    );


                    /*
                     * ------------------------------------------------
                     * TERTIARY BRANCH
                     * ------------------------------------------------
                     */

                    if (
                        n === 3
                    ) {


                        const tertiaryDirection =
                            branchDirection *
                            -1;


                        const tertiaryLength =
                            branchLength *
                            0.62;


                        const tertiaryDX =
                            normalX *
                            tertiaryDirection *
                            0.78 +
                            directionX *
                            0.32;


                        const tertiaryDY =
                            normalY *
                            tertiaryDirection *
                            0.78 +
                            directionY *
                            0.32;


                        const tertiaryEnd = {

                            x:
                                point.x +
                                tertiaryDX *
                                tertiaryLength,

                            y:
                                point.y +
                                tertiaryDY *
                                tertiaryLength

                        };


                        const tertiaryControl1 = {

                            x:
                                point.x +
                                tertiaryDX *
                                tertiaryLength *
                                0.35,

                            y:
                                point.y +
                                tertiaryDY *
                                tertiaryLength *
                                0.35

                        };


                        const tertiaryControl2 = {

                            x:
                                point.x +
                                tertiaryDX *
                                tertiaryLength *
                                0.75,

                            y:
                                point.y +
                                tertiaryDY *
                                tertiaryLength *
                                0.75

                        };


                        const tertiaryPath = `

                            M
                            ${point.x}
                            ${point.y}

                            C
                            ${tertiaryControl1.x}
                            ${tertiaryControl1.y},

                            ${tertiaryControl2.x}
                            ${tertiaryControl2.y},

                            ${tertiaryEnd.x}
                            ${tertiaryEnd.y}

                        `;


                        branches.appendChild(

                            createPath(
                                tertiaryPath,
                                "cosmic-network-tertiary",
                                region.color,
                                0.62,
                                0.28
                            )

                        );


                        createNode(
                            tertiaryEnd.x,
                            tertiaryEnd.y,
                            1.9,
                            region.color,
                            "cosmic-network-node"
                        );

                    }

                }

            }


            /*
             * ------------------------------------------------
             * REFINED COMPACT ENDPOINT CORE STONE (PHASE 2)
             * ------------------------------------------------
             */

            const stoneGroup = document.createElementNS(SVG_NS, "g");
            stoneGroup.setAttribute("class", `cosmic-endpoint-stone core-${region.id}`);
            stoneGroup.setAttribute("data-core", region.id);
            stoneGroup.setAttribute("transform", `translate(${end.x}, ${end.y})`);
            stoneGroup.setAttribute("tabindex", "0");
            stoneGroup.setAttribute("role", "button");
            stoneGroup.setAttribute("aria-label", `${region.id.toUpperCase()} Intelligence Core`);

            // Outer subtle pulse halo ring
            const haloRing = document.createElementNS(SVG_NS, "circle");
            haloRing.setAttribute("cx", "0");
            haloRing.setAttribute("cy", "0");
            haloRing.setAttribute("r", "15");
            haloRing.setAttribute("class", "cosmic-stone-halo");
            haloRing.setAttribute("stroke", region.color);
            haloRing.setAttribute("fill", "none");
            stoneGroup.appendChild(haloRing);

            // Refined Diamond Crystal Facet Path (compact ~16x22px)
            const crystalBody = document.createElementNS(SVG_NS, "polygon");
            crystalBody.setAttribute("points", "0,-11 8,0 0,11 -8,0");
            crystalBody.setAttribute("class", "cosmic-crystal-body");
            crystalBody.setAttribute("fill", `${region.color}33`);
            crystalBody.setAttribute("stroke", region.color);
            crystalBody.setAttribute("stroke-width", "1.5");
            stoneGroup.appendChild(crystalBody);

            // Top-right facet highlight for 3D depth
            const facetHighlight = document.createElementNS(SVG_NS, "polygon");
            facetHighlight.setAttribute("points", "0,-11 8,0 0,0");
            facetHighlight.setAttribute("fill", `${region.color}66`);
            stoneGroup.appendChild(facetHighlight);

            // Internal crystal facet lines
            const facetLines = document.createElementNS(SVG_NS, "path");
            facetLines.setAttribute("d", "M 0 -11 L 0 11 M -8 0 L 8 0");
            facetLines.setAttribute("stroke", "rgba(255, 255, 255, 0.65)");
            facetLines.setAttribute("stroke-width", "0.75");
            stoneGroup.appendChild(facetLines);

            // Brilliant micro core center
            const centerSpark = document.createElementNS(SVG_NS, "circle");
            centerSpark.setAttribute("cx", "0");
            centerSpark.setAttribute("cy", "0");
            centerSpark.setAttribute("r", "2");
            centerSpark.setAttribute("fill", "#ffffff");
            centerSpark.setAttribute("class", "cosmic-stone-spark");
            stoneGroup.appendChild(centerSpark);

            // Core name label offset safely to avoid occlusion
            const labelText = document.createElementNS(SVG_NS, "text");
            labelText.setAttribute("class", "cosmic-endpoint-label");
            labelText.textContent = region.id.toUpperCase();

            if (region.id === "space") {
                labelText.setAttribute("x", "0");
                labelText.setAttribute("y", "-19");
                labelText.setAttribute("text-anchor", "middle");
            } else if (region.id === "mind") {
                labelText.setAttribute("x", "0");
                labelText.setAttribute("y", "24");
                labelText.setAttribute("text-anchor", "middle");
            } else if (region.id === "reality" || region.id === "power") {
                labelText.setAttribute("x", "18");
                labelText.setAttribute("y", "4");
                labelText.setAttribute("text-anchor", "start");
            } else {
                labelText.setAttribute("x", "-18");
                labelText.setAttribute("y", "4");
                labelText.setAttribute("text-anchor", "end");
            }
            stoneGroup.appendChild(labelText);

            // Interactive Event Handlers
            stoneGroup.addEventListener("mouseenter", () => {
                inspectCore(region.id);
            });
            stoneGroup.addEventListener("mouseleave", () => {
                resetHUD();
            });
            stoneGroup.addEventListener("click", () => {
                inspectCore(region.id);
            });
            stoneGroup.addEventListener("focus", () => {
                inspectCore(region.id);
            });
            stoneGroup.addEventListener("blur", () => {
                resetHUD();
            });

            nodes.appendChild(stoneGroup);


            /*
             * ------------------------------------------------
             * ENERGY PATH
             * ------------------------------------------------
             */

            const energyPath =
                createPath(
                    trunkPath,
                    "cosmic-network-energy-path",
                    region.color,
                    1.8,
                    0.9
                );


            energy.appendChild(
                energyPath
            );

        }
    );


    /*
     * -------------------------------------------------------
     * CENTRAL NETWORK CORE
     * -------------------------------------------------------
     */

    createNode(
        center.x,
        center.y,
        13,
        "#ffffff",
        "cosmic-network-central-halo"
    );


    createNode(
        center.x,
        center.y,
        6,
        "#ffffff",
        "cosmic-network-central-node"
    );


    /*
     * Tiny central intelligence pulse.
     */

    const centerRing =
        document.createElementNS(
            SVG_NS,
            "circle"
        );


    centerRing.setAttribute(
        "cx",
        center.x
    );


    centerRing.setAttribute(
        "cy",
        center.y
    );


    centerRing.setAttribute(
        "r",
        "20"
    );


    centerRing.setAttribute(
        "class",
        "cosmic-network-central-ring"
    );


    centerRing.setAttribute(
        "fill",
        "none"
    );


    centerRing.setAttribute(
        "stroke",
        "rgba(255,255,255,.35)"
    );


    nodes.appendChild(
        centerRing
    );


    console.log(
        "Cosmic Relic: organic neural network created."
    );

}
/* =========================================================
   ANIMATION LOOP
   ========================================================= */

function startAnimation() {

    if (animationFrame) {

        cancelAnimationFrame(
            animationFrame
        );
    }


    function animate() {

        updateScene();

        animationFrame =
            requestAnimationFrame(
                animate
            );
    }


    animate();
}


/* =========================================================
   SCENE UPDATE
   ========================================================= */
function updateScene() {

    currentAngle +=
        CONFIG.rotationSpeed;


    galaxyAngle +=
        CONFIG.galaxyRotationSpeed;


    armAngle +=
        CONFIG.galaxyArmSpeed;


    dustAngle +=
        CONFIG.galaxyDustSpeed;


    mouseCurrentX +=
        (
            mouseTargetX -
            mouseCurrentX
        ) *
        CONFIG.smoothing;


    mouseCurrentY +=
        (
            mouseTargetY -
            mouseCurrentY
        ) *
        CONFIG.smoothing;


    /*
     * Subtle mouse parallax.
     *
     * The main cosmic stage remains responsible
     * for the overall scene movement.
     */

    if (cosmicStage) {

        cosmicStage.style.transform =
            `
            translate3d(
                ${mouseCurrentX + CONFIG.mouseOffsetX}px,
                ${mouseCurrentY + CONFIG.mouseOffsetY}px,
                0
            )
            rotateX(
                ${-mouseCurrentY * 0.08}deg
            )
            rotateY(
                ${mouseCurrentX * 0.08}deg
            )
            `;
    }


    /*
     * Layer 5 — Galactic 3D tilt.
     *
     * This is intentionally much weaker than the
     * main cosmic-stage movement.
     *
     * The galaxy gets a subtle perspective response
     * while the central interface remains stable.
     */

    if (galaxySystem) {

        const galaxyTiltX =
            mouseCurrentY *
            CONFIG.galaxyTiltX;

        const galaxyTiltY =
            mouseCurrentX *
            CONFIG.galaxyTiltY;


        galaxySystem.style.setProperty(
            '--galaxy-tilt-x',
            `${galaxyTiltX}deg`
        );


        galaxySystem.style.setProperty(
            '--galaxy-tilt-y',
            `${galaxyTiltY}deg`
        );


        galaxySystem.style.setProperty(
            '--galaxy-angle',
            `${galaxyAngle}rad`
        );


        galaxySystem.style.setProperty(
            '--arm-angle',
            `${armAngle}rad`
        );


        galaxySystem.style.setProperty(
            '--dust-angle',
            `${dustAngle}rad`
        );
    }
    /*
     * Galaxy rotation.
     */

    if (galaxySystem) {

        galaxySystem.style.transform =
            `
            translate(-50%, -50%)
            rotateX(63deg)
            rotateZ(
                ${-14 + galaxyAngle * 57.2958}deg
            )
            scale(${CONFIG.galaxyScale})
            `;
    }


    /*
     * Spiral-arm movement.
     */

    const arms =
        cosmicInterface
            ?.querySelectorAll(
                ".galaxy-arm"
            );


    if (arms) {

        arms.forEach(
            (arm, index) => {

                const base =
                    index * 90 + 18;

                arm.style.transform =
                    `
                    translateY(-50%)
                    rotate(
                        ${base + armAngle * 57.2958}deg
                    )
                    `;
            }
        );
    }


    /*
     * Dust lane motion.
     */

    const dustBands =
        cosmicInterface
            ?.querySelectorAll(
                ".galaxy-dust-band"
            );


    if (dustBands) {

        dustBands.forEach(
            (band, index) => {

                const base =
                    index * 90 + 9;

                band.style.transform =
                    `
                    translate(-50%, -50%)
                    rotate(
                        ${base + dustAngle * 57.2958}deg
                    )
                    `;
            }
        );
    }


    /*
     * Update six intelligence cores.
     */

    coreElements.forEach(
        updateCore
    );
}


/* =========================================================
   SIX INTELLIGENCE CORES TELEMETRY & TYPING SYSTEM (PHASE 2 & 3)
   ========================================================= */

let currentTypingTimer = null;
let hudResetTimer = null;
let activeCoreId = null;

function updateCore(coreObject) {
    // Large 3D orbital facet transforms retired in favor of refined SVG endpoint crystal stones.
}

function typeCoreDescription(name, desc, color) {

    if (currentTypingTimer) {
        clearTimeout(currentTypingTimer);
        currentTypingTimer = null;
    }

    if (hudResetTimer) {
        clearTimeout(hudResetTimer);
        hudResetTimer = null;
    }

    const tagEl = document.getElementById("hudTag");
    const titleEl = document.getElementById("hudTitle");
    const descEl = document.getElementById("hudDesc");
    const cursorEl = document.getElementById("hudCursor");

    if (!descEl || !titleEl) return;

    if (tagEl) {
        tagEl.textContent = `${name} CORE`;
        tagEl.style.color = color || "#56e0a0";
        tagEl.style.borderColor = color ? `${color}77` : "rgba(86, 224, 160, 0.4)";
    }

    titleEl.textContent = name;
    titleEl.style.color = color || "#ffffff";
    titleEl.style.textShadow = color ? `0 0 16px ${color}` : "none";

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
        descEl.textContent = desc;
        if (cursorEl) cursorEl.style.display = "none";
        return;
    }

    if (cursorEl) cursorEl.style.display = "inline";
    descEl.textContent = "";
    let charIndex = 0;

    function step() {
        if (charIndex < desc.length) {
            descEl.textContent += desc.charAt(charIndex);
            charIndex++;
            currentTypingTimer = setTimeout(step, 14);
        } else {
            currentTypingTimer = null;
        }
    }
    step();
}

function resetHUD() {

    if (hudResetTimer) clearTimeout(hudResetTimer);

    hudResetTimer = setTimeout(() => {
        typeCoreDescription(
            "SYSTEM TELEMETRY",
            "Hover or select a core to inspect neural telemetry and specialized domain intelligence.",
            "#56e0a0"
        );
        const tagEl = document.getElementById("hudTag");
        if (tagEl) {
            tagEl.textContent = "NEURAL TELEMETRY";
            tagEl.style.color = "#56e0a0";
            tagEl.style.borderColor = "rgba(86, 224, 160, 0.4)";
        }
        activeCoreId = null;
        document.querySelectorAll(".cosmic-endpoint-stone").forEach(el => el.classList.remove("active-stone"));
        document.querySelectorAll(".sidebar-core-pill").forEach(el => el.classList.remove("active-pill"));
    }, 450);
}

function inspectCore(coreId) {

    if (!coreId) return;
    const core = cores.find(c => c.id.toLowerCase() === coreId.toLowerCase());
    if (!core) return;
    activeCoreId = core.id;

    // Highlight SVG stone
    document.querySelectorAll(".cosmic-endpoint-stone").forEach(el => {
        if (el.dataset.core === core.id) {
            el.classList.add("active-stone");
        } else {
            el.classList.remove("active-stone");
        }
    });

    // Highlight sidebar pill
    document.querySelectorAll(".sidebar-core-pill").forEach(el => {
        if (el.dataset.core === core.id) {
            el.classList.add("active-pill");
        } else {
            el.classList.remove("active-pill");
        }
    });

    typeCoreDescription(core.name, core.description, core.color);
}

window.inspectCore = inspectCore;
window.resetHUD = resetHUD;
window.typeCoreDescription = typeCoreDescription;
window.CosmicInterface = {
    cores,
    inspectCore,
    resetHUD,
    typeCoreDescription
};
/* =========================================================
   VISIBILITY
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
        ) {

            if (animationFrame) {

                cancelAnimationFrame(
                    animationFrame
                );

                animationFrame =
                    null;
            }

        } else {

            startAnimation();
        }
    }
);


/* =========================================================
   WINDOW RESIZE
   ========================================================= */

window.addEventListener(
    "resize",
    () => {

        /*
         * No hard-coded repositioning
         * required.
         *
         * Everything is centered from
         * the hero itself.
         */
    }
);


/* =========================================================
   START AFTER DOM LOAD
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initCosmicInterface
    );

} else {

    initCosmicInterface();
}