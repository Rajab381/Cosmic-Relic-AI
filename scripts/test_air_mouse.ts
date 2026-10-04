import assert from 'node:assert';
import { GestureEngine } from '../static/js/air-mouse/gesture-engine.js';
import { GestureType, DefaultAirMouseConfig, LandmarkIndex } from '../static/js/air-mouse/types.js';

console.log('🌌 [COSMIC RELIC — REALITY CORE AIR MOUSE TEST SUITE]');

function createNeutralHand(wristY = 0.8) {
    const lm = [];
    for (let i = 0; i < 21; i++) {
        lm.push({ x: 0.5, y: wristY, z: 0 });
    }
    // Wrist at (0.5, wristY)
    lm[LandmarkIndex.WRIST] = { x: 0.5, y: wristY, z: 0 };
    // Middle MCP at (0.5, wristY - 0.3) -> handScale = 0.3
    lm[LandmarkIndex.MIDDLE_MCP] = { x: 0.5, y: wristY - 0.3, z: 0 };
    return lm;
}

function setFingerCurled(lm: any[], tipIdx: number, pipIdx: number, baseY: number) {
    lm[pipIdx] = { x: lm[pipIdx].x, y: baseY - 0.12, z: 0 };
    lm[tipIdx] = { x: lm[tipIdx].x, y: baseY - 0.08, z: 0 }; // tip is closer to wrist than pip
}

function setFingerExtended(lm: any[], tipIdx: number, pipIdx: number, baseY: number) {
    lm[pipIdx] = { x: lm[pipIdx].x, y: baseY - 0.18, z: 0 };
    lm[tipIdx] = { x: lm[tipIdx].x, y: baseY - 0.35, z: 0 }; // tip is further from wrist than pip
}

function makeOpenPalmHand(wristY = 0.8) {
    const lm = createNeutralHand(wristY);
    const L = LandmarkIndex;
    setFingerExtended(lm, L.INDEX_TIP, L.INDEX_PIP, wristY);
    setFingerExtended(lm, L.MIDDLE_TIP, L.MIDDLE_PIP, wristY);
    setFingerExtended(lm, L.RING_TIP, L.RING_PIP, wristY);
    setFingerExtended(lm, L.PINKY_TIP, L.PINKY_PIP, wristY);
    // Thumb extended outward
    lm[L.THUMB_MCP] = { x: 0.35, y: wristY - 0.10, z: 0 };
    lm[L.THUMB_TIP] = { x: 0.25, y: wristY - 0.25, z: 0 };
    return lm;
}

function makeOneFingerHand(wristY = 0.8) {
    const lm = createNeutralHand(wristY);
    const L = LandmarkIndex;
    setFingerExtended(lm, L.INDEX_TIP, L.INDEX_PIP, wristY);
    setFingerCurled(lm, L.MIDDLE_TIP, L.MIDDLE_PIP, wristY);
    setFingerCurled(lm, L.RING_TIP, L.RING_PIP, wristY);
    setFingerCurled(lm, L.PINKY_TIP, L.PINKY_PIP, wristY);
    lm[L.THUMB_MCP] = { x: 0.42, y: wristY - 0.08, z: 0 };
    lm[L.THUMB_TIP] = { x: 0.44, y: wristY - 0.10, z: 0 };
    return lm;
}

function makeFistHand(wristY = 0.8) {
    const lm = createNeutralHand(wristY);
    const L = LandmarkIndex;
    setFingerCurled(lm, L.INDEX_TIP, L.INDEX_PIP, wristY);
    setFingerCurled(lm, L.MIDDLE_TIP, L.MIDDLE_PIP, wristY);
    setFingerCurled(lm, L.RING_TIP, L.RING_PIP, wristY);
    setFingerCurled(lm, L.PINKY_TIP, L.PINKY_PIP, wristY);
    // Thumb curled/relaxed
    lm[L.THUMB_MCP] = { x: 0.46, y: wristY - 0.10, z: 0 };
    lm[L.THUMB_TIP] = { x: 0.48, y: wristY - 0.08, z: 0 };
    return lm;
}

async function runTests() {
    let passed = 0;
    let failed = 0;

    function test(name: string, fn: () => void) {
        try {
            process.stdout.write(`Testing: ${name}... `);
            fn();
            console.log('✅ PASSED');
            passed++;
        } catch (err: any) {
            console.log('❌ FAILED:', err.message);
            failed++;
        }
    }

    // 1. Open palm → cursor movement
    test('1. Open palm → cursor movement', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const lm = makeOpenPalmHand(0.8);
        lm[LandmarkIndex.INDEX_TIP] = { x: 0.3, y: 0.4, z: 0 };

        const res = engine.process(lm, 1000);
        assert.strictEqual(res.gesture, GestureType.OPEN_PALM);
        assert.strictEqual(res.action, 'move');
        assert.strictEqual(res.scrollDeltaY, 0);
        // Mirrored X: 1 - 0.3 = 0.7
        assert.ok(Math.abs(res.rawCursorX - 0.7) < 0.001);
        assert.ok(Math.abs(res.rawCursorY - 0.4) < 0.001);
    });

    // 2. Open palm maintained → continuous cursor updates
    test('2. Open palm maintained → continuous cursor updates', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const lm1 = makeOpenPalmHand(0.8);
        lm1[LandmarkIndex.INDEX_TIP] = { x: 0.3, y: 0.4, z: 0 };
        const res1 = engine.process(lm1, 1000);
        assert.strictEqual(res1.gesture, GestureType.OPEN_PALM);
        assert.strictEqual(res1.action, 'move');
        assert.ok(Math.abs(res1.rawCursorX - 0.7) < 0.001);

        // Frame 2 at new position
        const lm2 = makeOpenPalmHand(0.8);
        lm2[LandmarkIndex.INDEX_TIP] = { x: 0.2, y: 0.6, z: 0 };
        const res2 = engine.process(lm2, 1040);
        assert.strictEqual(res2.gesture, GestureType.OPEN_PALM);
        assert.strictEqual(res2.action, 'move');
        // Mirrored X: 1 - 0.2 = 0.8
        assert.ok(Math.abs(res2.rawCursorX - 0.8) < 0.001);
        assert.ok(Math.abs(res2.rawCursorY - 0.6) < 0.001);
    });

    // 3. One finger → exactly one click
    test('3. One finger → exactly one click', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const lmPalm = makeOpenPalmHand();
        engine.process(lmPalm, 1000);

        const lmOne = makeOneFingerHand();
        const res = engine.process(lmOne, 1050);
        assert.strictEqual(res.gesture, GestureType.ONE_FINGER);
        assert.strictEqual(res.action, 'click', 'Transition to one-finger must fire action: click');
        assert.strictEqual(res.scrollDeltaY, 0);
    });

    // 4. One finger held → no repeated clicks
    test('4. One finger held → no repeated clicks', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const lmOne = makeOneFingerHand();

        const res1 = engine.process(lmOne, 1000);
        assert.strictEqual(res1.action, 'click');

        // Consecutive frames while holding one finger
        const res2 = engine.process(lmOne, 1050);
        assert.strictEqual(res2.gesture, GestureType.ONE_FINGER);
        assert.strictEqual(res2.action, 'click_held', 'Subsequent frame must not trigger another click');

        const res3 = engine.process(lmOne, 1100);
        assert.strictEqual(res3.gesture, GestureType.ONE_FINGER);
        assert.strictEqual(res3.action, 'click_held');
    });

    // 5. One finger release → click state resets
    test('5. One finger release → click state resets', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const lmOne = makeOneFingerHand();
        engine.process(lmOne, 1000);

        const lmPalm = makeOpenPalmHand();
        const res = engine.process(lmPalm, 1050);
        assert.strictEqual(res.gesture, GestureType.OPEN_PALM);
        assert.strictEqual(res.action, 'move');
        assert.strictEqual(engine.hasClickedThisGesture, false, 'hasClickedThisGesture must be reset');
    });

    // 6. One finger again → another click
    test('6. One finger again → another click', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1, clickCooldownMs: 200 });
        const lmOne = makeOneFingerHand();
        const lmPalm = makeOpenPalmHand();

        // Click 1
        const res1 = engine.process(lmOne, 1000);
        assert.strictEqual(res1.action, 'click');

        // Release to open palm
        engine.process(lmPalm, 1100);

        // Click 2 (after cooldown & release)
        const res2 = engine.process(lmOne, 1350);
        assert.strictEqual(res2.gesture, GestureType.ONE_FINGER);
        assert.strictEqual(res2.action, 'click', 'Second one-finger invocation must emit click');
    });

    // 7. Fist detection from realistic curled landmarks
    test('7. Fist detection from realistic curled landmarks', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const lmFist = makeFistHand();
        const res = engine.process(lmFist, 1000);
        assert.strictEqual(res.gesture, GestureType.FIST);
        assert.strictEqual(res.action, 'scroll_down');
    });

    // 8. Fist maintained → continuous scroll DOWN
    test('8. Fist maintained → continuous scroll DOWN', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1, continuousScrollSpeedPx: 9 });
        const lmFist = makeFistHand();

        // Frame 1
        const res1 = engine.process(lmFist, 1000);
        assert.strictEqual(res1.action, 'scroll_down');
        assert.strictEqual(res1.scrollDeltaY, 9);

        // Frame 2
        const res2 = engine.process(lmFist, 1040);
        assert.strictEqual(res2.gesture, GestureType.FIST);
        assert.strictEqual(res2.action, 'scroll_down');
        assert.strictEqual(res2.scrollDeltaY, 9, 'Held fist must continuously output scrollDeltaY');

        // Frame 3
        const res3 = engine.process(lmFist, 1080);
        assert.strictEqual(res3.gesture, GestureType.FIST);
        assert.strictEqual(res3.action, 'scroll_down');
        assert.strictEqual(res3.scrollDeltaY, 9);
    });

    // 9. Fist release → scrolling immediately stops
    test('9. Fist release → scrolling immediately stops', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const lmFist = makeFistHand();
        engine.process(lmFist, 1000);

        const lmPalm = makeOpenPalmHand();
        const res = engine.process(lmPalm, 1050);
        assert.strictEqual(res.gesture, GestureType.OPEN_PALM);
        assert.strictEqual(res.action, 'move');
        assert.strictEqual(res.scrollDeltaY, 0, 'Scrolling must stop immediately on fist release');
    });

    // 10. Fist must NOT require hand movement
    test('10. Fist must NOT require hand movement', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const staticFist = makeFistHand(0.8);

        // Process same static fist across 5 frames
        for (let i = 0; i < 5; i++) {
            const res = engine.process(staticFist, 1000 + i * 40);
            assert.strictEqual(res.gesture, GestureType.FIST);
            assert.strictEqual(res.action, 'scroll_down');
            assert.ok(res.scrollDeltaY > 0, 'Static fist must scroll without any hand movement');
        }
    });

    // 11. Fist must NOT trigger click
    test('11. Fist must NOT trigger click', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const lmFist = makeFistHand();
        for (let i = 0; i < 3; i++) {
            const res = engine.process(lmFist, 1000 + i * 40);
            assert.notStrictEqual(res.action, 'click');
            assert.strictEqual(engine.hasClickedThisGesture, false);
        }
    });

    // 12. Open palm must NOT trigger scroll
    test('12. Open palm must NOT trigger scroll', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const lmPalm = makeOpenPalmHand();
        const res = engine.process(lmPalm, 1000);
        assert.strictEqual(res.gesture, GestureType.OPEN_PALM);
        assert.strictEqual(res.action, 'move');
        assert.strictEqual(res.scrollDeltaY, 0, 'Open palm must never scroll');
    });

    // 13. One finger must NOT trigger scrolling
    test('13. One finger must NOT trigger scrolling', () => {
        const engine = new GestureEngine({ gestureDebounceFrames: 1 });
        const lmOne = makeOneFingerHand();
        const res = engine.process(lmOne, 1000);
        assert.strictEqual(res.gesture, GestureType.ONE_FINGER);
        assert.strictEqual(res.scrollDeltaY, 0, 'One finger must never scroll');
    });

    // 14. No hand → no action
    test('14. No hand → no action', () => {
        const engine = new GestureEngine();
        const res1 = engine.process(null, 1000);
        assert.strictEqual(res1.gesture, GestureType.NONE);
        assert.strictEqual(res1.action, 'none');
        assert.strictEqual(res1.scrollDeltaY, 0);

        const res2 = engine.process([], 1050);
        assert.strictEqual(res2.gesture, GestureType.NONE);
        assert.strictEqual(res2.action, 'none');
        assert.strictEqual(res2.scrollDeltaY, 0);
    });

    // 15. Air Mouse disable → complete cleanup
    test('15. Air Mouse disable → complete cleanup', () => {
        const engine = new GestureEngine();
        engine.currentGesture = GestureType.FIST;
        engine.isFistActive = true;
        engine.hasClickedThisGesture = true;

        const res = engine.reset();
        assert.strictEqual(engine.currentGesture, GestureType.NONE);
        assert.strictEqual(engine.previousGesture, GestureType.NONE);
        assert.strictEqual(engine.hasClickedThisGesture, false);
        assert.strictEqual(engine.isFistActive, false);
        assert.strictEqual(res.gesture, GestureType.NONE);
        assert.strictEqual(res.action, 'none');
        assert.strictEqual(res.scrollDeltaY, 0);
    });

    console.log(`\n==============================================`);
    console.log(`AIR MOUSE 3-GESTURE SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==============================================`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
});
