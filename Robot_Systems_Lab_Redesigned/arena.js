/* =========================================
   ROBOT SYSTEMS LAB: OBSTACLE ARENA
   A top-down simulation of the AUTO-mode decision in
   Lab1_Bluetooth_Obstacle_Robot.ino (loop() and avoidObstacle()).
   Thresholds, servo angles and branch order come from the sketch.
   IR range and arena scale are illustrative.
   ========================================= */
(() => {
    'use strict';

    /* ---------- constants from the sketch ---------- */
    const OBSTACLE_CM = 20;
    const TURN_TIME_MS = 450;
    const SIDE_TURN_MS = 250;
    const NO_ECHO_CM = 300;               // readDistanceCM() returns 300 when pulseIn times out
    const SCAN_DELAYS = [350, 550, 250];  // servo settle delays in avoidObstacle()

    /* ---------- illustrative geometry (1 cm = 4 px) ---------- */
    const PX_PER_CM = 4;
    const W = 640;
    const H = 400;
    const VIEW_Y = 40;                    // top strip of the floor that is never needed
    const NARROW_X = [120, 520];          // horizontal window shown on phones
    const BOX = 80;                       // 20 cm boxes
    const KEEP_OUT = { x1: 266, y1: 236, x2: 374, y2: 372 };
    const US = { x: 320, y: 248 };        // ultrasonic transducer face
    const PIVOT = { x: 320, y: 258 };     // servo horn
    const IR_RANGE = 56;                  // 14 cm, illustrative
    const IR = {
        left: { x: 289, y: 266, a: -40 },
        front: { x: 320, y: 243, a: 0 },
        right: { x: 351, y: 266, a: 40 }
    };
    const SCAN_ANGLE = { left: -60, right: 60 }; // LEFT_ANGLE 150° and RIGHT_ANGLE 30° relative to centre 90°
    const BEAM_HALF = 12;

    const PRESETS = {
        clear: { label: 'Clear path', boxes: [[168, 100], [472, 112]] },
        ahead: { label: 'Ahead, open left', boxes: [[320, 166], [472, 196]] },
        aheadRight: { label: 'Ahead, open right', boxes: [[320, 166], [168, 196]] },
        left: { label: 'Left close', boxes: [[226, 212], [472, 100]] },
        right: { label: 'Right close', boxes: [[414, 212], [168, 100]] },
        boxed: { label: 'Boxed in', boxes: [[226, 212], [414, 212]] }
    };

    /* Source lines from Lab1_Bluetooth_Obstacle_Robot.ino */
    const LOOP_LINES = [
        [319, '// AUTO mode: original obstacle avoidance behavior.'],
        [320, 'if (frontBlocked || frontDistance <= OBSTACLE_CM ||'],
        [321, '    (leftBlocked && rightBlocked)) {'],
        [322, '  avoidObstacle(leftBlocked, rightBlocked);'],
        [323, '} else if (leftBlocked) {'],
        [324, '  turnRight();'],
        [325, '  delay(SIDE_TURN_MS);'],
        [326, '  stopRobot();'],
        [327, '} else if (rightBlocked) {'],
        [328, '  turnLeft();'],
        [329, '  delay(SIDE_TURN_MS);'],
        [330, '  stopRobot();'],
        [331, '} else {'],
        [332, '  moveForward();'],
        [333, '}']
    ];
    const AVOID_LINES = [
        [138, 'if (leftDistance <= OBSTACLE_CM && rightDistance <= OBSTACLE_CM) {'],
        [139, '  turnLeft();'],
        [140, '  delay(TURN_TIME_MS * 2);'],
        [141, '} else if (leftDistance >= rightDistance) {'],
        [142, '  turnLeft();'],
        [143, '  delay(TURN_TIME_MS);'],
        [144, '} else {'],
        [145, '  turnRight();'],
        [146, '  delay(TURN_TIME_MS);'],
        [147, '}']
    ];
    const LOOP_HIGHLIGHT = {
        avoid: [320, 322],
        sideRight: [323, 326],
        sideLeft: [327, 330],
        forward: [331, 332]
    };
    const AVOID_HIGHLIGHT = {
        both: [138, 140],
        left: [141, 143],
        right: [144, 146]
    };

    /* ---------- geometry ---------- */
    const rad = degrees => degrees * Math.PI / 180;
    const direction = degrees => ({ x: Math.sin(rad(degrees)), y: -Math.cos(rad(degrees)) });

    function rayBox(origin, dir, box) {
        const x1 = box.x - BOX / 2;
        const x2 = box.x + BOX / 2;
        const y1 = box.y - BOX / 2;
        const y2 = box.y + BOX / 2;
        let tMin = 0;
        let tMax = Infinity;
        for (const [o, d, lo, hi] of [[origin.x, dir.x, x1, x2], [origin.y, dir.y, y1, y2]]) {
            if (Math.abs(d) < 1e-9) {
                if (o < lo || o > hi) return null;
            } else {
                let t1 = (lo - o) / d;
                let t2 = (hi - o) / d;
                if (t1 > t2) [t1, t2] = [t2, t1];
                tMin = Math.max(tMin, t1);
                tMax = Math.min(tMax, t2);
                if (tMin > tMax) return null;
            }
        }
        return tMin;
    }

    function castCone(origin, centreAngle, halfAngle, boxes, maxT = Infinity) {
        let best = null;
        const steps = 9;
        for (let i = 0; i < steps; i++) {
            const angle = centreAngle - halfAngle + (2 * halfAngle * i) / (steps - 1);
            const dir = direction(angle);
            boxes.forEach(box => {
                const t = rayBox(origin, dir, box);
                if (t !== null && t <= maxT && (best === null || t < best)) best = t;
            });
        }
        return best;
    }

    function readUltrasonic(angle, boxes) {
        const t = castCone(US, angle, BEAM_HALF, boxes);
        return t === null
            ? { cm: NO_ECHO_CM, echo: false, t: null }
            : { cm: Math.max(1, Math.round(t / PX_PER_CM)), echo: true, t };
    }

    function readIr(sensor, boxes) {
        return castCone(sensor, sensor.a, 6, boxes, IR_RANGE) !== null;
    }

    /* ---------- the decision, in the sketch's order ---------- */
    function decide(boxes) {
        const leftBlocked = readIr(IR.left, boxes);
        const frontBlocked = readIr(IR.front, boxes);
        const rightBlocked = readIr(IR.right, boxes);
        const front = readUltrasonic(0, boxes);
        const reading = { leftBlocked, frontBlocked, rightBlocked, front };

        if (frontBlocked || front.cm <= OBSTACLE_CM || (leftBlocked && rightBlocked)) {
            const scanLeft = readUltrasonic(SCAN_ANGLE.left, boxes);
            const scanRight = readUltrasonic(SCAN_ANGLE.right, boxes);
            let leftDistance = scanLeft.cm;
            let rightDistance = scanRight.cm;
            if (leftBlocked) leftDistance = 0;
            if (rightBlocked) rightDistance = 0;

            let outcome;
            if (leftDistance <= OBSTACLE_CM && rightDistance <= OBSTACLE_CM) outcome = 'both';
            else if (leftDistance >= rightDistance) outcome = 'left';
            else outcome = 'right';

            return { ...reading, branch: 'avoid', outcome, scanLeft, scanRight, leftDistance, rightDistance };
        }
        if (leftBlocked) return { ...reading, branch: 'sideRight' };
        if (rightBlocked) return { ...reading, branch: 'sideLeft' };
        return { ...reading, branch: 'forward' };
    }

    /* ---------- copy ---------- */
    function describe(result) {
        const { front } = result;
        const frontText = front.echo ? `${front.cm} cm` : 'no echo';
        if (result.branch === 'forward') {
            return {
                action: 'Drive forward',
                turn: 'forward',
                why: front.echo
                    ? `The nearest echo ahead is ${front.cm} cm, more than OBSTACLE_CM (20), and no IR sensor is blocked, so the last branch of loop() runs.`
                    : 'The ultrasonic sensor hears no echo, so readDistanceCM() returns 300. AUTO mode treats that as clear, and no IR sensor is blocked.'
            };
        }
        if (result.branch === 'sideRight') {
            return {
                action: 'Short turn right',
                turn: 'right',
                why: `Only the left IR sensor is blocked and the front reads ${frontText}. The robot turns right for SIDE_TURN_MS (250 ms), then stops.`
            };
        }
        if (result.branch === 'sideLeft') {
            return {
                action: 'Short turn left',
                turn: 'left',
                why: `Only the right IR sensor is blocked and the front reads ${frontText}. The robot turns left for SIDE_TURN_MS (250 ms), then stops.`
            };
        }

        const triggers = [];
        if (result.frontBlocked) triggers.push('the front IR sensor is blocked');
        if (front.cm <= OBSTACLE_CM) triggers.push(`the ultrasonic reads ${front.cm} cm (20 or less)`);
        if (result.leftBlocked && result.rightBlocked) triggers.push('both side IR sensors are blocked');
        const trigger = triggers.join(' and ');
        const sides = `Left reads ${result.leftDistance} cm, right reads ${result.rightDistance} cm.`;

        if (result.outcome === 'both') {
            return {
                action: 'Scan, then turn left for longer',
                turn: 'left',
                why: `Because ${trigger}, avoidObstacle() stops and scans both sides. ${sides} Both are 20 cm or less, so it turns left for TURN_TIME_MS × 2 (900 ms).`
            };
        }
        if (result.outcome === 'left') {
            return {
                action: 'Scan, then turn left',
                turn: 'left',
                why: `Because ${trigger}, avoidObstacle() stops and scans both sides. ${sides} Left has at least as much room, so it turns left for 450 ms.`
            };
        }
        return {
            action: 'Scan, then turn right',
            turn: 'right',
            why: `Because ${trigger}, avoidObstacle() stops and scans both sides. ${sides} Right has more room, so it turns right for 450 ms.`
        };
    }

    /* ---------- markup ---------- */
    const svgWheel = (x, y) => `
        <g class="ar-wheel">
            <rect x="${x}" y="${y}" width="16" height="36" rx="4"/>
            <rect class="ar-hub" x="${x + 5}" y="${y + 5}" width="6" height="26" rx="2"/>
        </g>`;

    function buildMarkup() {
        const presetButtons = Object.entries(PRESETS).map(([id, preset]) =>
            `<button type="button" class="chip" data-arena-preset="${id}" aria-pressed="false">${preset.label}</button>`
        ).join('');

        return `
            <div class="arena-stage">
                <div class="arena-presets" role="group" aria-label="Obstacle presets">${presetButtons}</div>
                <svg class="arena-svg" viewBox="0 ${VIEW_Y} ${W} ${H - VIEW_Y}" role="group" aria-labelledby="arena-svg-title arena-svg-desc">
                    <title id="arena-svg-title">Top-down test arena</title>
                    <desc id="arena-svg-desc">The rover sits at the bottom centre facing up. Two 20 cm boxes can be dragged, or moved with the arrow keys once focused.</desc>
                    <defs>
                        <pattern id="arena-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M40 0H0V40" fill="none" class="ar-grid-line"/>
                        </pattern>
                        <pattern id="arena-hazard" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <rect width="14" height="14" class="ar-hazard-a"/>
                            <rect width="7" height="14" class="ar-hazard-b"/>
                        </pattern>
                    </defs>
                    <rect class="ar-floor" y="${VIEW_Y}" width="${W}" height="${H - VIEW_Y}"/>
                    <rect y="${VIEW_Y}" width="${W}" height="${H - VIEW_Y}" fill="url(#arena-grid)"/>
                    <text class="ar-scale" x="${NARROW_X[0] + 10}" y="${H - 12}">Grid: 10 cm squares</text>

                    <g class="ar-threshold" aria-hidden="true">
                        <path d="${arcPath(US, OBSTACLE_CM * PX_PER_CM, -34, 34)}"/>
                        <text x="${US.x - 48}" y="${US.y - 58}" text-anchor="end">20 cm</text>
                    </g>

                    <g class="ar-scan" data-scan aria-hidden="true"></g>
                    <g class="ar-beam" data-beam aria-hidden="true"></g>
                    <g class="ar-ir" data-ir aria-hidden="true"></g>

                    <g class="ar-robot" aria-hidden="true">
                        ${svgWheel(270, 270)}${svgWheel(270, 328)}${svgWheel(354, 270)}${svgWheel(354, 328)}
                        <rect class="ar-chassis" x="284" y="258" width="72" height="112" rx="16"/>
                        <rect class="ar-battery" x="298" y="336" width="44" height="24" rx="3"/>
                        <rect class="ar-pcb" x="294" y="290" width="52" height="38" rx="3"/>
                        <rect class="ar-chip" x="318" y="302" width="18" height="10" rx="1"/>
                        <rect class="ar-servo" x="309" y="258" width="22" height="16" rx="2"/>
                        <rect class="ar-irs" x="284" y="261" width="10" height="8" rx="1" transform="rotate(-40 289 265)"/>
                        <rect class="ar-irs" x="346" y="261" width="10" height="8" rx="1" transform="rotate(40 351 265)"/>
                        <g class="ar-head" data-head>
                            <rect class="ar-sonar" x="297" y="246" width="46" height="14" rx="2"/>
                            <circle class="ar-eye" cx="309" cy="248" r="7"/>
                            <circle class="ar-eye" cx="331" cy="248" r="7"/>
                        </g>
                        <rect class="ar-irs" x="316" y="238" width="8" height="8" rx="1"/>
                        <path class="ar-turn-under" data-turn-under d=""/>
                        <path class="ar-turn" data-turn d=""/>
                    </g>

                    <g data-boxes></g>
                </svg>
                <p class="arena-note">Drag a box, or focus it and use the arrow keys. Simulated in AUTO mode with the phone connected. Rules, thresholds and servo angles come from the sketch; IR range and scale are illustrative.</p>
            </div>
            <aside class="arena-readout" aria-label="Robot decision">
                <p class="readout-kicker">The robot will</p>
                <p class="readout-action" data-action aria-live="polite"></p>
                <p class="readout-why" data-why aria-live="polite"></p>
                <dl class="readout-sensors" data-sensors></dl>
            </aside>
            <div class="arena-code" aria-label="Matching firmware lines">
                <div>
                    <p class="readout-file">Lab1_Bluetooth_Obstacle_Robot.ino, inside <code>loop()</code></p>
                    <pre data-code-loop></pre>
                </div>
                <div class="arena-code-avoid" data-code-avoid-wrap>
                    <p class="readout-file">Inside <code>avoidObstacle()</code>, after the servo scan</p>
                    <pre data-code-avoid></pre>
                    <p class="code-idle" data-code-idle>Not running: <code>avoidObstacle()</code> is only called when the front is blocked or both sides are blocked.</p>
                </div>
            </div>
        `;
    }

    function arcPath(origin, radius, fromDeg, toDeg) {
        const a = direction(fromDeg);
        const b = direction(toDeg);
        return `M${(origin.x + a.x * radius).toFixed(1)} ${(origin.y + a.y * radius).toFixed(1)} A${radius} ${radius} 0 0 1 ${(origin.x + b.x * radius).toFixed(1)} ${(origin.y + b.y * radius).toFixed(1)}`;
    }

    function conePath(origin, centre, half, length) {
        const a = direction(centre - half);
        const b = direction(centre + half);
        return `M${origin.x} ${origin.y} L${(origin.x + a.x * length).toFixed(1)} ${(origin.y + a.y * length).toFixed(1)} A${length} ${length} 0 0 1 ${(origin.x + b.x * length).toFixed(1)} ${(origin.y + b.y * length).toFixed(1)}Z`;
    }

    function codeBlock(lines, range) {
        return lines.map(([number, text]) => {
            const active = range && number >= range[0] && number <= range[1];
            const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<span class="code-line${active ? ' is-active' : ''}"><span class="code-num">${number}</span>${safe}</span>`;
        }).join('');
    }

    /* ---------- mount ---------- */
    function mount(root) {
        root.innerHTML = buildMarkup();
        const svg = root.querySelector('.arena-svg');
        const boxLayer = root.querySelector('[data-boxes]');
        const beamLayer = root.querySelector('[data-beam]');
        const scanLayer = root.querySelector('[data-scan]');
        const irLayer = root.querySelector('[data-ir]');
        const head = root.querySelector('[data-head]');
        const turnPath = root.querySelector('[data-turn]');
        const turnUnder = root.querySelector('[data-turn-under]');
        const actionEl = root.querySelector('[data-action]');
        const whyEl = root.querySelector('[data-why]');
        const sensorsEl = root.querySelector('[data-sensors]');
        const loopEl = root.querySelector('[data-code-loop]');
        const avoidWrap = root.querySelector('[data-code-avoid-wrap]');
        const avoidEl = root.querySelector('[data-code-avoid]');
        const idleEl = root.querySelector('[data-code-idle]');
        const presetButtons = Array.from(root.querySelectorAll('[data-arena-preset]'));
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        const boxes = PRESETS.ahead.boxes.map(([x, y], index) => ({ x, y, name: index ? 'B' : 'A' }));
        let lastBranch = null;
        let scanTimers = [];

        boxLayer.innerHTML = boxes.map((box, index) => `
            <g class="ar-box" data-box="${index}" tabindex="0" role="button"
                aria-roledescription="draggable obstacle" aria-label="Box ${box.name}">
                <rect class="ar-box-body" x="${-BOX / 2}" y="${-BOX / 2}" width="${BOX}" height="${BOX}" rx="4"/>
                <rect class="ar-box-band" x="${-BOX / 2}" y="${-BOX / 2}" width="${BOX}" height="12" rx="4" fill="url(#arena-hazard)"/>
                <text class="ar-box-label" x="0" y="10">${box.name}</text>
            </g>
        `).join('');
        const boxEls = Array.from(boxLayer.querySelectorAll('[data-box]'));

        const overlapsRobot = (x, y) =>
            x + BOX / 2 > KEEP_OUT.x1 && x - BOX / 2 < KEEP_OUT.x2 &&
            y + BOX / 2 > KEEP_OUT.y1 && y - BOX / 2 < KEEP_OUT.y2;
        const overlapsOther = (index, x, y) => boxes.some((other, i) =>
            i !== index && Math.abs(other.x - x) < BOX && Math.abs(other.y - y) < BOX);

        const narrow = window.matchMedia('(max-width: 600px)');
        let viewX = [0, W];
        function applyView() {
            viewX = narrow.matches ? NARROW_X : [0, W];
            svg.setAttribute('viewBox', `${viewX[0]} ${VIEW_Y} ${viewX[1] - viewX[0]} ${H - VIEW_Y}`);
        }
        applyView();
        if (typeof narrow.addEventListener === 'function') narrow.addEventListener('change', applyView);

        function placeBox(index, x, y) {
            const nx = Math.min(viewX[1] - BOX / 2 - 4, Math.max(viewX[0] + BOX / 2 + 4, x));
            const ny = Math.min(H - BOX / 2 - 4, Math.max(VIEW_Y + BOX / 2 + 4, y));
            if (overlapsRobot(nx, ny) || overlapsOther(index, nx, ny)) return false;
            boxes[index].x = nx;
            boxes[index].y = ny;
            return true;
        }

        function animateScan() {
            scanTimers.forEach(clearTimeout);
            scanTimers = [];
            if (reduceMotion.matches) return;
            const steps = [SCAN_ANGLE.left, SCAN_ANGLE.right, 0];
            let elapsed = 0;
            steps.forEach((angle, i) => {
                scanTimers.push(setTimeout(() => {
                    head.style.transitionDuration = `${SCAN_DELAYS[i] * 0.8}ms`;
                    head.style.transform = `rotate(${angle}deg)`;
                }, elapsed));
                elapsed += SCAN_DELAYS[i];
            });
        }

        function turnArrow(kind) {
            const cx = 320;
            if (kind === 'forward') return `M${cx} 352 V296 M${cx - 12} 308 L${cx} 294 L${cx + 12} 308`;
            if (kind === 'left') return `M${cx + 14} 350 C${cx + 14} 312 ${cx - 2} 300 ${cx - 26} 300 M${cx - 16} 288 L${cx - 28} 300 L${cx - 16} 312`;
            return `M${cx - 14} 350 C${cx - 14} 312 ${cx + 2} 300 ${cx + 26} 300 M${cx + 16} 288 L${cx + 28} 300 L${cx + 16} 312`;
        }

        function update() {
            const result = decide(boxes);
            const copy = describe(result);

            boxEls.forEach((el, i) => {
                el.setAttribute('transform', `translate(${boxes[i].x} ${boxes[i].y})`);
                const dx = Math.round((boxes[i].x - US.x) / PX_PER_CM);
                const dy = Math.round((US.y - boxes[i].y) / PX_PER_CM);
                el.setAttribute('aria-label',
                    `Box ${boxes[i].name}: ${Math.abs(dy)} cm ${dy >= 0 ? 'ahead of' : 'behind'} and ${Math.abs(dx)} cm ${dx < 0 ? 'left' : 'right'} of the sensor. Arrow keys move it.`);
            });

            const reach = result.front.echo ? result.front.t : 300;
            beamLayer.innerHTML = `
                <path class="ar-cone${result.front.echo ? ' has-echo' : ''}" d="${conePath(US, 0, BEAM_HALF, reach)}"/>
                ${result.front.echo
                    ? `<text class="ar-reading" x="${US.x + 10}" y="${US.y - reach + 16}">${result.front.cm} cm</text>`
                    : `<text class="ar-reading" x="${US.x + 10}" y="${VIEW_Y + 22}">No echo</text>`}
            `;

            irLayer.innerHTML = Object.entries(IR).map(([side, sensor]) => {
                const blocked = result[`${side}Blocked`];
                const d = direction(sensor.a);
                return `<line class="ar-ir-beam${blocked ? ' is-blocked' : ''}" x1="${sensor.x}" y1="${sensor.y}"
                    x2="${(sensor.x + d.x * IR_RANGE).toFixed(1)}" y2="${(sensor.y + d.y * IR_RANGE).toFixed(1)}"/>`;
            }).join('');

            if (result.branch === 'avoid') {
                const scanCone = (key, angle) => {
                    const reading = result[key];
                    const len = reading.echo ? reading.t : 190;
                    const d = direction(angle);
                    const at = reading.echo ? Math.max(62, len * 0.6) : 150;
                    const lx = US.x + d.x * at;
                    const ly = US.y + d.y * at + 4;
                    return `<path class="ar-scan-cone" d="${conePath(US, angle, BEAM_HALF, len)}"/>
                        <text class="ar-reading ar-scan-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${reading.echo ? `${reading.cm} cm` : 'No echo'}</text>`;
                };
                scanLayer.innerHTML = scanCone('scanLeft', SCAN_ANGLE.left) + scanCone('scanRight', SCAN_ANGLE.right);
            } else {
                scanLayer.innerHTML = '';
            }

            turnPath.setAttribute('d', turnArrow(copy.turn));
            turnUnder.setAttribute('d', turnArrow(copy.turn));
            if (result.branch === 'avoid' && lastBranch !== 'avoid') animateScan();
            lastBranch = result.branch;

            actionEl.textContent = copy.action;
            root.dataset.branch = result.branch;
            whyEl.textContent = copy.why;

            const rows = [
                ['Left IR', result.leftBlocked ? 'Blocked' : 'Clear', result.leftBlocked],
                ['Front IR', result.frontBlocked ? 'Blocked' : 'Clear', result.frontBlocked],
                ['Right IR', result.rightBlocked ? 'Blocked' : 'Clear', result.rightBlocked],
                ['Ultrasonic ahead', result.front.echo ? `${result.front.cm} cm` : 'No echo (300)', result.front.cm <= OBSTACLE_CM]
            ];
            if (result.branch === 'avoid') {
                rows.push(['Scan left, 150°', result.leftBlocked ? '0 (left IR blocked)' : (result.scanLeft.echo ? `${result.scanLeft.cm} cm` : 'No echo (300)'), result.leftDistance <= OBSTACLE_CM]);
                rows.push(['Scan right, 30°', result.rightBlocked ? '0 (right IR blocked)' : (result.scanRight.echo ? `${result.scanRight.cm} cm` : 'No echo (300)'), result.rightDistance <= OBSTACLE_CM]);
            }
            sensorsEl.innerHTML = rows.map(([label, value, alert]) =>
                `<div${alert ? ' class="is-alert"' : ''}><dt>${label}</dt><dd>${value}</dd></div>`
            ).join('');

            loopEl.innerHTML = codeBlock(LOOP_LINES, LOOP_HIGHLIGHT[result.branch]);
            avoidWrap.classList.toggle('is-idle', result.branch !== 'avoid');
            idleEl.hidden = result.branch === 'avoid';
            avoidEl.innerHTML = codeBlock(AVOID_LINES, result.branch === 'avoid' ? AVOID_HIGHLIGHT[result.outcome] : null);

            const matching = Object.entries(PRESETS).find(([, preset]) =>
                preset.boxes.every(([x, y], i) => boxes[i].x === x && boxes[i].y === y));
            presetButtons.forEach(button =>
                button.setAttribute('aria-pressed', String(Boolean(matching && matching[0] === button.dataset.arenaPreset))));
        }

        /* presets */
        presetButtons.forEach(button => button.addEventListener('click', () => {
            const preset = PRESETS[button.dataset.arenaPreset];
            preset.boxes.forEach(([x, y], i) => { boxes[i].x = x; boxes[i].y = y; });
            update();
        }));

        /* pointer dragging */
        const toSvgPoint = event => {
            const point = svg.createSVGPoint();
            point.x = event.clientX;
            point.y = event.clientY;
            const matrix = svg.getScreenCTM();
            return matrix ? point.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
        };

        boxEls.forEach((el, index) => {
            let offset = null;
            el.addEventListener('pointerdown', event => {
                event.preventDefault();
                const p = toSvgPoint(event);
                offset = { x: p.x - boxes[index].x, y: p.y - boxes[index].y };
                el.setPointerCapture(event.pointerId);
                el.classList.add('is-dragging');
                el.focus({ preventScroll: true });
            });
            el.addEventListener('pointermove', event => {
                if (!offset) return;
                const p = toSvgPoint(event);
                if (placeBox(index, Math.round(p.x - offset.x), Math.round(p.y - offset.y))) update();
            });
            const end = () => {
                offset = null;
                el.classList.remove('is-dragging');
            };
            el.addEventListener('pointerup', end);
            el.addEventListener('pointercancel', end);
            el.addEventListener('keydown', event => {
                const step = event.shiftKey ? 40 : 8;
                const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
                const move = moves[event.key];
                if (!move) return;
                event.preventDefault();
                if (placeBox(index, boxes[index].x + move[0], boxes[index].y + move[1])) update();
            });
        });

        update();
    }

    const root = document.querySelector('[data-arena]');
    if (root) mount(root);

    /* exposed for testing */
    window.RobotArena = { decide, describe, PRESETS };
})();
