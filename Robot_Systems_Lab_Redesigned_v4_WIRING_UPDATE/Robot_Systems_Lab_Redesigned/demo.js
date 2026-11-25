/* =========================================
   ROBOT SYSTEMS LAB: PROJECT DEMONSTRATION
   Six tabs that explain the real firmware, robot.csv, the SD card,
   wireless retrieval, the project cost and the BLE controller.
   Code excerpts come from demo-firmware.js, which copies exact lines
   (with line numbers) from the project's .ino files.
   ========================================= */
const ProjectDemo = (() => {
    'use strict';

    const FW = window.RSL_FIRMWARE;
    const INTEGRATED = 'lafvin_robot_with_ble_csv_download.ino';
    const CURRENT_SKETCH = INTEGRATED;

    const TABS = [
        { id: 'program', label: 'Program structure' },
        { id: 'csv', label: 'CSV generation' },
        { id: 'storage', label: 'SD card storage' },
        { id: 'wireless', label: 'Wireless data retrieval' },
        { id: 'cost', label: 'Project cost' },
        { id: 'controller', label: 'BLE joystick controller' }
    ];

    let activeTab = 'program';
    let selectedNode = 'n-loop';
    let activeScenario = null;
    let selectedColumn = 'front_distance_cm';
    let csvView = 'table';

    const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

    /* ---------- code excerpts ---------- */
    function codeBlock(excerpt, { file = INTEGRATED, highlight = [], caption = '' } = {}) {
        if (!excerpt) return '';
        const end = excerpt.start + excerpt.lines.length - 1;
        const rows = excerpt.lines.map((line, i) => {
            const n = excerpt.start + i;
            const on = highlight.some(([a, b]) => n >= a && n <= b);
            return `<span class="ln${on ? ' is-hl' : ''}"><span class="ln-n">${n}</span>${esc(line) || ' '}</span>`;
        }).join('');
        return `
            <figure class="fw-code">
                <figcaption><span>${esc(caption || file)}</span><span>${end === excerpt.start ? `line ${end}` : `lines ${excerpt.start}–${end}`}</span></figcaption>
                <pre tabindex="0">${rows}</pre>
            </figure>
        `;
    }

    /* =========================================================
       TAB 1: PROGRAM STRUCTURE
       ========================================================= */
    const FUNCTIONS = {
        setup: {
            group: 'Start-up',
            summary: 'Runs once when the robot is switched on or reset. It opens the serial port shared by the JDY-16 and USB at 9600 baud, sets the sensor and motor pins, stops the motors, centres the scan servo, waits 500 ms, and finally starts the SD card.',
            calledBy: ['Arduino core, once'],
            calls: ['stopRobot', 'startSDLogging'],
            vars: ['servoCommandedAngle']
        },
        loop: {
            group: 'Main loop',
            summary: 'Runs repeatedly while the robot has power. It reads Bluetooth first, handles any pending download or delete operation, reads the sensors, checks the phone-link timeout, then runs MANUAL, GAME or AUTO behavior. It logs a row when the 200 ms interval is due.',
            calledBy: ['Arduino core, repeatedly'],
            calls: ['readBluetooth', 'sendCsvFileOverBluetooth', 'deleteEntireCsv', 'rewriteCsvWithoutRecords', 'deleteCsvFileOnSd', 'readDistanceCM', 'stopRobot', 'runManual', 'runGame', 'avoidObstacle', 'turnLeft', 'turnRight', 'moveForward', 'logDataIfDue'],
            vars: ['csvDownloadRequested', 'csvDeleteAllRequested', 'csvRewriteRequested', 'csvDeleteRequested', 'leftBlocked', 'frontBlocked', 'rightBlocked', 'frontDistance', 'haveConnectionPacket', 'lastConnectionMs', 'mode']
        },
        readBluetooth: {
            group: 'Bluetooth',
            summary: 'Reads up to 48 waiting bytes from the JDY-16. Characters collect in rxLine until a newline arrives, then the complete line goes to parseLine(). Carriage returns are skipped and a line longer than 23 characters is thrown away.',
            calledBy: ['loop'],
            calls: ['parseLine'],
            vars: ['rxLine', 'rxLen']
        },
        parseLine: {
            group: 'Bluetooth',
            summary: 'Turns one text command into an action. M and S select MANUAL and stop; A selects AUTO; G selects GAME; H refreshes the connection timer; J,x,y updates the joystick; D requests a CSV download; DELALL requests a full-file reset; RW starts selected-record deletion; and X is a compatibility delete command. V reports the firmware capability, while V,angle moves the servo in GAME mode.',
            calledBy: ['readBluetooth'],
            calls: ['updateConnectionTime', 'stopRobot', 'deleteEntireCsv', 'rewriteCsvWithoutRecords', 'deleteCsvFileOnSd'],
            vars: ['mode', 'joystickX', 'joystickY', 'haveJoystick', 'lastJoystickMs', 'csvDownloadRequested', 'csvDeleteAllRequested', 'csvRewriteRequested', 'csvDeleteRequested']
        },
        updateConnectionTime: {
            group: 'Bluetooth',
            summary: 'Records that a valid packet arrived. loop() stops the robot and returns to MANUAL whenever the last packet is more than CONNECTION_TIMEOUT_MS (650 ms) old.',
            calledBy: ['parseLine', 'sendCsvFileOverBluetooth'],
            calls: [],
            vars: ['haveConnectionPacket', 'lastConnectionMs']
        },
        readDistanceCM: {
            group: 'Sensing',
            summary: 'Sends a 10 µs trigger pulse on D12 and times the echo on D13 with pulseIn(), giving up after 25 ms. Distance in cm is the echo time in microseconds divided by 58. With no echo it returns 300 and sets ultrasonicEchoValid to false.',
            calledBy: ['loop', 'avoidObstacle'],
            calls: [],
            vars: ['ultrasonicEchoValid']
        },
        avoidObstacle: {
            group: 'Decision',
            summary: 'Stops, turns the servo to 150° and 30° to measure each side, re-centres it at 90°, then turns toward the side with more room: left for 450 ms if left ≥ right, right for 450 ms otherwise, or left for 900 ms when both sides read 20 cm or less. A side whose IR sensor is blocked counts as 0 cm. The whole maneuver takes about 1.75 s (2.2 s for the long turn), and nothing else runs during it.',
            calledBy: ['loop, AUTO mode'],
            calls: ['stopRobot', 'readDistanceCM', 'turnLeft', 'turnRight'],
            vars: ['servoCommandedAngle']
        },
        runManual: {
            group: 'Manual control',
            summary: 'Turns the stored joystick values into motor speeds. It stops if no joystick packet arrived in the last 400 ms, if both axes are inside the ±12 dead zone, or if the front IR sensor is blocked. Forward movement also stops when there is no echo, the front is 20 cm or closer, or a side IR sensor is blocked, and steering toward a blocked side stops too. Otherwise it mixes left = y + x and right = y − x.',
            calledBy: ['loop, MANUAL mode'],
            calls: ['stopRobot', 'scaleManual', 'setSignedMotors'],
            vars: ['joystickX', 'joystickY', 'haveJoystick', 'lastJoystickMs', 'frontBlocked', 'leftBlocked', 'rightBlocked', 'frontDistance', 'ultrasonicEchoValid']
        },
        scaleManual: {
            group: 'Manual control',
            summary: 'Maps a joystick value outside the dead zone (13 to 100) to a PWM value between MIN_MANUAL_PWM (65) and MAX_MANUAL_PWM (160), keeping its sign.',
            calledBy: ['runManual'],
            calls: [],
            vars: []
        },
        setSignedMotors: {
            group: 'Motors',
            summary: 'Drives each side forward or backward from a signed PWM. It sets both speeds to 0 first, then the direction pins (left forward is D2 HIGH, right forward is D4 LOW), then the speeds, and records the values and a motor_action label. In this supplied source, the two MANUAL_TURN log labels appear reversed relative to the joystick turn direction; this affects the log description, not the motor pin commands.',
            calledBy: ['runManual'],
            calls: ['stopRobot'],
            vars: ['commandedLeftPwm', 'commandedRightPwm', 'leftDirLevel', 'rightDirLevel', 'motorAction']
        },
        stopRobot: {
            group: 'Motors',
            summary: 'Writes 0 to both speed pins (D5 and D6) and records STOP. It does not change the direction pins.',
            calledBy: ['setup', 'loop', 'parseLine', 'avoidObstacle', 'runManual', 'turnLeft', 'turnRight', 'setSignedMotors', 'sendCsvFileOverBluetooth'],
            calls: [],
            vars: ['commandedLeftPwm', 'commandedRightPwm', 'motorAction']
        },
        moveForward: {
            group: 'Motors',
            summary: 'Sets D2 HIGH and D4 LOW so both sides run forward, at FORWARD_SPEED (110) on each speed pin.',
            calledBy: ['loop, AUTO mode'],
            calls: [],
            vars: ['commandedLeftPwm', 'commandedRightPwm', 'leftDirLevel', 'rightDirLevel', 'motorAction']
        },
        turnLeft: {
            group: 'Motors',
            summary: 'Stops, then sets both direction pins LOW (left side backward, right side forward) at TURN_SPEED (120), so the robot spins left on the spot.',
            calledBy: ['loop, AUTO mode', 'avoidObstacle'],
            calls: ['stopRobot'],
            vars: ['commandedLeftPwm', 'commandedRightPwm', 'leftDirLevel', 'rightDirLevel', 'motorAction']
        },
        turnRight: {
            group: 'Motors',
            summary: 'Stops, then sets both direction pins HIGH (left side forward, right side backward) at TURN_SPEED (120), so the robot spins right on the spot.',
            calledBy: ['loop, AUTO mode', 'avoidObstacle'],
            calls: ['stopRobot'],
            vars: ['commandedLeftPwm', 'commandedRightPwm', 'leftDirLevel', 'rightDirLevel', 'motorAction']
        },
        startSDLogging: {
            group: 'SD logging',
            summary: 'Starts the card over software SPI, recovers an interrupted selected-record rewrite if robot.bak or robot.tmp remains, then opens robot.csv for appending. If the card is unavailable, sdReady stays false and robot control can still run.',
            calledBy: ['setup'],
            calls: ['recoverInterruptedRewrite'],
            vars: ['sdReady', 'logFile']
        },
        logDataIfDue: {
            group: 'SD logging',
            summary: 'Writes one CSV row when the card is ready and at least LOG_INTERVAL_MS (200 ms) have passed since the last row, then calls flush() so the row is saved on the card.',
            calledBy: ['loop'],
            calls: [],
            vars: ['sdReady', 'lastLogMs', 'and every logged value']
        },
        sendCsvFileOverBluetooth: {
            group: 'SD logging',
            summary: 'Stops the robot, closes the log file, opens robot.csv read-only and sends #CSV_BEGIN,<bytes>, the raw file, then #CSV_END. Afterwards it reopens robot.csv for appending, so nothing on the card is removed.',
            calledBy: ['loop, when csvDownloadRequested'],
            calls: ['stopRobot', 'updateConnectionTime'],
            vars: ['sdReady', 'logFile', 'lastLogMs']
        },
        runGame: {
            group: 'Manual control',
            summary: 'Uses the same differential joystick mixing as MANUAL, but deliberately skips the obstacle-sensor safety checks. The 400 ms joystick timeout still stops the motors. Use this mode only in a clear, supervised test area.',
            calledBy: ['loop, when mode == GAME'],
            calls: ['stopRobot', 'scaleManual', 'setSignedMotors'],
            vars: ['joystickX', 'joystickY', 'lastJoystickMs']
        },
        deleteEntireCsv: {
            group: 'SD file management',
            summary: 'Stops the robot, flushes and closes the log, removes robot.csv, verifies that it is gone, then creates a new robot.csv containing only the header. It reports #DEL_OK only after the fresh header has been written.',
            calledBy: ['loop, when csvDeleteAllRequested'],
            calls: ['stopRobot', 'writeCsvHeader', 'finishFileOperation'],
            vars: ['sdReady', 'logFile']
        },
        rewriteCsvWithoutRecords: {
            group: 'SD file management',
            summary: 'Removes selected records without deleting the kept rows. The robot checks the phone copy with CRC-16, writes retained lines to robot.tmp, verifies the temporary file, renames the original to robot.bak, and then replaces robot.csv. Later records are retained.',
            calledBy: ['loop, when csvRewriteRequested'],
            calls: ['stopForFileOperation', 'readMaskChunk', 'crc16Update', 'rewriteFailed', 'reopenLogForAppend'],
            vars: ['rwExpectedBytes', 'rwExpectedCrc', 'rwExpectedDeletes']
        },
        readMaskChunk: {
            group: 'SD file management',
            summary: 'Waits for a K,<16 hex digits> packet from the phone. Each packet represents a 64-line selection mask. It can time out or be cancelled with RWX.',
            calledBy: ['rewriteCsvWithoutRecords'],
            calls: [],
            vars: ['rxLine', 'RW_CHUNK_TIMEOUT_MS']
        },
        crc16Update: {
            group: 'File integrity',
            summary: 'Updates a CRC-16/CCITT-FALSE checksum for one byte. The robot uses it to check that the phone is asking to edit the same downloaded file and to verify the temporary rewritten file.',
            calledBy: ['rewriteCsvWithoutRecords'],
            calls: [],
            vars: ['crc', 'data']
        },
        deleteCsvFileOnSd: {
            group: 'SD file management',
            summary: 'Compatibility delete handler for command X. It stops the robot, closes robot.csv, removes the file, and starts SD logging again so a fresh header is created.',
            calledBy: ['loop, when csvDeleteRequested'],
            calls: ['stopRobot', 'startSDLogging'],
            vars: ['sdReady', 'logFile']
        },
        recoverInterruptedRewrite: {
            group: 'SD file management',
            summary: 'Runs during SD startup. If robot.csv is missing but robot.bak exists, it restores the original. If both exist, it removes the backup after the replacement has completed. A leftover robot.tmp is discarded.',
            calledBy: ['startSDLogging'],
            calls: [],
            vars: ['sd']
        }
    };

    // Flowchart: main column plus the branch each decision can take.
    const FLOW = [
        { id: 'n-setup', kind: 'start', text: 'setup() runs once', fn: 'setup', hl: [[905, 928]] },
        { id: 'n-loop', kind: 'process', text: 'loop() begins: readBluetooth() → parseLine()', fn: 'loop', hl: [[931, 932]] },
        { id: 'd-download', kind: 'decision', text: 'CSV download requested?', fn: 'loop', hl: [[934, 938]],
            side: { id: 's-download', label: 'Yes', text: 'sendCsvFileOverBluetooth(), then return to loop()', fn: 'sendCsvFileOverBluetooth' } },
        { id: 'd-delete', kind: 'decision', text: 'Delete entire file requested?', fn: 'loop', hl: [[939, 943]],
            side: { id: 's-delete', label: 'Yes', text: 'deleteEntireCsv(): recreate robot.csv with only the header', fn: 'deleteEntireCsv' } },
        { id: 'd-rewrite', kind: 'decision', text: 'Selected records requested for deletion?', fn: 'loop', hl: [[944, 948]],
            side: { id: 's-rewrite', label: 'Yes', text: 'rewriteCsvWithoutRecords(): verify and replace the CSV safely', fn: 'rewriteCsvWithoutRecords' } },
        { id: 'd-compat', kind: 'decision', text: 'Compatibility delete requested?', fn: 'loop', hl: [[950, 954]],
            side: { id: 's-compat', label: 'Yes', text: 'deleteCsvFileOnSd(): recreate the log file', fn: 'deleteCsvFileOnSd' } },
        { id: 'n-sensors', kind: 'process', text: 'Read the three IR inputs and ultrasonic distance', fn: 'loop', hl: [[956, 960]] },
        { id: 'd-link', kind: 'decision', text: 'Phone packet in the last 650 ms?', fn: 'loop', hl: [[963, 969]],
            side: { id: 's-link', label: 'No', text: 'Return to MANUAL, stop the motors and log a row', fn: 'loop', hl: [[963, 969]] } },
        { id: 'd-manual', kind: 'decision', text: 'mode == MANUAL?', fn: 'loop', hl: [[972, 976]],
            side: { id: 's-manual', label: 'Yes', text: 'runManual(): joystick with obstacle checks', fn: 'runManual' } },
        { id: 'd-game', kind: 'decision', text: 'mode == GAME?', fn: 'loop', hl: [[979, 984]],
            side: { id: 's-game', label: 'Yes', text: 'runGame(): joystick driving without obstacle-sensor checks', fn: 'runGame' } },
        { id: 'd-auto', kind: 'decision', text: 'AUTO obstacle rule triggered?', fn: 'loop', hl: [[987, 989]],
            side: { id: 's-auto', label: 'Yes', text: 'avoidObstacle(): scan both sides, then turn', fn: 'avoidObstacle' } },
        { id: 'd-left', kind: 'decision', text: 'Left IR sensor blocked?', fn: 'loop', hl: [[990, 994]],
            side: { id: 's-left', label: 'Yes', text: 'turnRight() briefly, then stop', fn: 'turnRight' } },
        { id: 'd-right', kind: 'decision', text: 'Right IR sensor blocked?', fn: 'loop', hl: [[994, 998]],
            side: { id: 's-right', label: 'Yes', text: 'turnLeft() briefly, then stop', fn: 'turnLeft' } },
        { id: 'n-forward', kind: 'process', text: 'moveForward()', fn: 'moveForward', hl: [[137, 147]] },
        { id: 'n-log', kind: 'process', text: 'logDataIfDue(), delay, and repeat loop()', fn: 'logDataIfDue', hl: [[528, 551]] }
    ];

    const SCENARIOS = {
        noPhone: {
            focus: 's-link',
            label: 'Phone not connected',
            path: ['n-loop', 'd-download', 'd-delete', 'd-rewrite', 'd-compat', 'n-sensors', 'd-link', 's-link'],
            steps: ['No phone packet has arrived, or the last one is older than 650 ms.', 'The robot switches to MANUAL, stops, and still logs when the 200 ms interval is due.', 'This is also how the robot starts: stopped until the phone connects.']
        },
        manual: {
            focus: 's-manual',
            label: 'Manual driving',
            path: ['n-loop', 'd-download', 'd-delete', 'd-rewrite', 'd-compat', 'n-sensors', 'd-link', 'd-manual', 's-manual'],
            steps: ['J,x,y packets keep the link alive and update the joystick values.', 'runManual() applies obstacle checks, mixes the axes and drives the motors.', 'A row is logged, then loop() waits 10 ms and starts again.']
        },
        game: {
            focus: 's-game',
            label: 'Game mode',
            path: ['n-loop', 'd-download', 'd-delete', 'd-rewrite', 'd-compat', 'n-sensors', 'd-link', 'd-manual', 'd-game', 's-game'],
            steps: ['The phone sends G to select GAME mode.', 'runGame() uses the joystick but bypasses obstacle sensor checks.', 'The joystick timeout still stops the motors; use this mode only in a clear area.']
        },
        autoClear: {
            focus: 'n-forward',
            label: 'AUTO, path clear',
            path: ['n-loop', 'd-download', 'd-delete', 'd-rewrite', 'd-compat', 'n-sensors', 'd-link', 'd-manual', 'd-game', 'd-auto', 'd-left', 'd-right', 'n-forward', 'n-log'],
            steps: ['Heartbeats (H) keep the link alive.', 'No obstacle rule fires, so moveForward() runs at speed 110.', 'A row is logged, then loop() waits 40 ms.']
        },
        autoObstacle: {
            focus: 's-auto',
            label: 'AUTO, obstacle ahead',
            path: ['n-loop', 'n-sensors', 'd-link', 'd-manual', 'd-game', 'd-auto', 's-auto', 'n-log'],
            steps: ['The front IR sensor is blocked or the ultrasonic reading is 20 cm or less.', 'avoidObstacle() blocks while it scans and turns.', 'The row logged afterwards holds the readings taken before the maneuver.']
        },
        autoSide: {
            focus: 's-left',
            label: 'AUTO, left side blocked',
            path: ['n-loop', 'n-sensors', 'd-link', 'd-manual', 'd-game', 'd-auto', 'd-left', 's-left', 'n-log'],
            steps: ['Only the left IR sensor is blocked.', 'turnRight() runs for SIDE_TURN_MS (250 ms), then the robot stops.', 'The logged row shows STOP because the turn ends before logging.']
        },
        download: {
            focus: 's-download',
            label: 'Download requested',
            path: ['n-loop', 'd-download', 's-download'],
            steps: ['parseLine() receives D and sets csvDownloadRequested.', 'The next loop() sends the complete robot.csv file over Bluetooth.', 'The log is reopened for appending after the transfer.']
        },
        deleteAll: {
            focus: 's-delete',
            label: 'Delete entire CSV',
            path: ['n-loop', 'd-download', 'd-delete', 's-delete'],
            steps: ['The phone sends DELALL after the user confirms the action.', 'The robot stops, closes the log, removes robot.csv and creates a fresh header-only file.', 'The controller reports success only after the firmware replies.']
        },
        deleteSelected: {
            focus: 's-rewrite',
            label: 'Delete selected records',
            path: ['n-loop', 'd-download', 'd-delete', 'd-rewrite', 's-rewrite'],
            steps: ['The phone sends the downloaded file size, CRC and selected-record count.', 'The robot asks for 64-line selection masks and writes kept records to robot.tmp.', 'The robot verifies the temporary file before replacing robot.csv.']
        }
    };

    const VARIABLES = [
        ['mode', 'MANUAL, AUTO or GAME', 'parseLine(); loop() forces MANUAL when the link times out', 'Which branch of loop() runs. Starts as MANUAL so the motors stay off until the phone connects. GAME bypasses obstacle-sensor checks.'],
        ['haveConnectionPacket, lastConnectionMs', 'bool, ms', 'updateConnectionTime()', 'The phone-link watchdog. CONNECTION_TIMEOUT_MS = 650.'],
        ['joystickX, joystickY', '−100 to 100', 'parseLine() from J,x,y in MANUAL or GAME', 'Steering and throttle requested by the phone.'],
        ['haveJoystick, lastJoystickMs', 'bool, ms', 'parseLine()', 'runManual() stops if no joystick packet arrived within JOYSTICK_TIMEOUT_MS = 400.'],
        ['leftBlocked, frontBlocked, rightBlocked', 'bool', 'loop(): digitalRead(...) == LOW', 'The IR modules pull their output LOW when something is close.'],
        ['frontDistance, ultrasonicEchoValid', 'cm, bool', 'readDistanceCM()', '300 with ultrasonicEchoValid = false means no echo, not open space.'],
        ['commandedLeftPwm, commandedRightPwm', '0–255', 'motor functions', 'Last PWM written to D5 and D6. A command, not a measured speed.'],
        ['leftDirLevel, rightDirLevel, motorAction', 'HIGH/LOW, text', 'motor functions', 'Last direction levels and a label for the log.'],
        ['servoCommandedAngle', '0–180 degrees', 'setup(), avoidObstacle(), V,angle in GAME', 'Last angle sent to the scan servo. AUTO scanning uses 90, 150 and 30 degrees; GAME mode can set an angle from 0 to 180.'],
        ['sdReady, logFile, lastLogMs', 'bool, file, ms', 'startSDLogging(), logDataIfDue()', 'Whether logging works, the open robot.csv, and when the last row was written.'],
        ['csvDownloadRequested, csvDeleteAllRequested, csvRewriteRequested, csvDeleteRequested', 'bool flags', 'parseLine() on D, DELALL, RW or X', 'Make loop() complete one file operation and return before reading sensors or driving.'],
        ['OBSTACLE_CM, FORWARD_SPEED, TURN_SPEED', '20, 110, 120', 'constants', 'Original kit values the sketch marks “do not change”.'],
        ['TURN_TIME_MS, SIDE_TURN_MS', '450, 250 ms', 'constants', 'How long AUTO turns last.'],
        ['MIN_MANUAL_PWM, MAX_MANUAL_PWM, JOYSTICK_DEADZONE', '65, 160, 12', 'constants', 'Manual speed range and the joystick dead zone.']
    ];

    const INVENTORY = [
        ['setup(), loop()', 1, 1, 1, 1],
        ['stopRobot(), moveForward(), turnLeft(), turnRight()', 1, 1, 1, 1],
        ['readDistanceCM(), avoidObstacle()', 1, 1, 1, 1],
        ['setSignedMotors(), scaleManual(), runManual()', 1, 0, 1, 1],
        ['runGame()', 0, 0, 0, 1],
        ['readBluetooth(), parseLine(), updateConnectionTime()', 1, 0, 1, 1],
        ['startSDLogging(), logDataIfDue()', 0, 1, 1, 1],
        ['sendCsvFileOverBluetooth()', 0, 0, 1, 1],
        ['deleteEntireCsv(), rewriteCsvWithoutRecords(), deleteCsvFileOnSd()', 0, 0, 0, 1],
        ['recoverInterruptedRewrite(), CRC and selection-mask helpers', 0, 0, 0, 1]
    ];;

    function renderFlowNode(node, isSide = false) {
        const classes = ['flow-node', `flow-${isSide ? 'side' : node.kind}`];
        return `
            <button type="button" class="${classes.join(' ')}" data-flow-node="${node.id}" aria-pressed="false">
                ${isSide ? `<span class="flow-branch">${node.label}</span>` : ''}
                <span class="flow-text">${esc(node.text)}</span>
            </button>
        `;
    }

    function renderProgram() {
        return `
            <div class="demo-intro">
                <h2>Understanding the robot's program structure</h2>
                <p>The integrated sketch, <code>${INTEGRATED}</code>, combines driving, sensing, Bluetooth control, SD logging, GAME mode and CSV file management. It is written as a set of small functions: <code>setup()</code> runs once, then <code>loop()</code> runs over and over, and each pass calls the functions it needs. Pick a step in the flowchart, or a scenario, to see the code that runs.</p>
            </div>

            <div class="scenario-row" role="group" aria-label="Scenarios">
                ${Object.entries(SCENARIOS).map(([id, s]) => `<button type="button" class="chip" data-scenario="${id}" aria-pressed="false">${s.label}</button>`).join('')}
                <button type="button" class="text-link-button" data-scenario="">Clear</button>
            </div>

            <div class="flow-layout">
                <ol class="flow" aria-label="loop() flowchart">
                    ${FLOW.map(node => `
                        <li class="flow-row">
                            ${renderFlowNode(node)}
                            ${node.side ? renderFlowNode(node.side, true) : '<span></span>'}
                        </li>
                    `).join('')}
                </ol>
                <aside class="fn-panel" data-fn-panel aria-live="polite"></aside>
            </div>

            <section class="demo-section">
                <h3>The real order of operations</h3>
                <div class="two-col">
                    <div>
                        <h4>Once, in <code>setup()</code></h4>
                        <ol class="step-list">
                            <li><code>Serial.begin(9600)</code> opens the UART on D0/D1 that the JDY-16 and USB share. This is the only Bluetooth set-up the sketch does.</li>
                            <li>The three IR pins become inputs.</li>
                            <li>The ultrasonic trigger (D12) becomes an output held LOW; echo (D13) is an input.</li>
                            <li>The motor pins D2, D4, D5 and D6 become outputs and <code>stopRobot()</code> runs.</li>
                            <li>The scan servo attaches to D10 and centres at 90°, followed by a 500 ms wait.</li>
                            <li><code>startSDLogging()</code> starts the card and opens <code>robot.csv</code>, last.</li>
                        </ol>
                    </div>
                    <div>
                        <h4>Every pass of <code>loop()</code></h4>
                        <ol class="step-list">
                            <li>Bluetooth is read first, before any sensor.</li>
                            <li>Pending download, full-delete, selected-delete or compatibility-delete requests run before the sensors.</li>
                            <li>The IR sensors and the ultrasonic sensor are read.</li>
                            <li>The phone-link watchdog can stop the robot here.</li>
                            <li>MANUAL runs <code>runManual()</code>; GAME runs <code>runGame()</code> without obstacle-sensor safety checks; otherwise AUTO rules run.</li>
                            <li><code>logDataIfDue()</code> records a row after each driving branch when its 200 ms interval is due.</li>
                        </ol>
                    </div>
                </div>
                <p class="demo-note">The project brief suggested an order that puts Bluetooth after the sensors and responds to it last. The sketch does it the other way round: it reads Bluetooth at the start of each pass, so a stop or download command is acted on before the next decision.</p>
            </section>

            <section class="demo-section">
                <h3>Important variables</h3>
                <div class="table-scroll">
                    <table class="data-table">
                        <thead><tr><th scope="col">Variable</th><th scope="col">Values</th><th scope="col">Set by</th><th scope="col">What it means</th></tr></thead>
                        <tbody>${VARIABLES.map(([name, values, by, meaning]) => `<tr><td><code>${esc(name)}</code></td><td>${esc(values)}</td><td>${esc(by)}</td><td>${esc(meaning)}</td></tr>`).join('')}</tbody>
                    </table>
                </div>
            </section>

            <section class="demo-section">
                <h3>Which sketch has which functions</h3>
                <div class="table-scroll">
                    <table class="data-table inventory">
                        <thead><tr><th scope="col">Functions</th><th scope="col">Lab 1, Bluetooth</th><th scope="col">Lab 2, SD logger</th><th scope="col">Earlier integrated</th><th scope="col">Current supplied sketch</th></tr></thead>
                        <tbody>${INVENTORY.map(([name, ...has]) => `<tr><td><code>${esc(name)}</code></td>${has.map(h => `<td class="${h ? 'has' : 'no'}">${h ? 'Yes' : '–'}</td>`).join('')}</tr>`).join('')}</tbody>
                    </table>
                </div>
            </section>
        `;
    }

    function findFlowNode(id) {
        for (const node of FLOW) {
            if (node.id === id) return node;
            if (node.side && node.side.id === id) return node.side;
        }
        return null;
    }

    function renderFnPanel(root) {
        const panel = root.querySelector('[data-fn-panel]');
        if (!panel) return;
        const node = findFlowNode(selectedNode) || findFlowNode('n-loop');
        const name = node.fn;
        const info = FUNCTIONS[name];
        const excerpt = FW.integrated[name];
        const scenario = activeScenario ? SCENARIOS[activeScenario] : null;
        panel.innerHTML = `
            ${scenario ? `
                <div class="scenario-steps">
                    <p class="panel-kicker">Scenario: ${esc(scenario.label)}</p>
                    <ol>${scenario.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
                </div>
            ` : ''}
            <p class="panel-kicker">${esc(info.group)}</p>
            <h3><code>${esc(name)}()</code></h3>
            <p>${esc(info.summary)}</p>
            <dl class="fn-meta">
                <div><dt>Called by</dt><dd>${info.calledBy.map(c => esc(c)).join(', ')}</dd></div>
                <div><dt>Calls</dt><dd>${info.calls.length ? info.calls.map(c => FUNCTIONS[c] ? `<button type="button" class="fn-link" data-fn-open="${c}">${c}()</button>` : esc(c)).join(' ') : 'No other project functions'}</dd></div>
                <div><dt>Uses</dt><dd>${info.vars.length ? info.vars.map(v => `<code>${esc(v)}</code>`).join(' ') : 'Only its arguments'}</dd></div>
            </dl>
            ${codeBlock(excerpt, { highlight: node.hl || [] })}
        `;
    }

    function updateFlow(root) {
        const path = activeScenario ? SCENARIOS[activeScenario].path : null;
        root.querySelectorAll('[data-flow-node]').forEach(el => {
            const id = el.dataset.flowNode;
            el.setAttribute('aria-pressed', String(id === selectedNode));
            el.classList.toggle('is-on', Boolean(path && path.includes(id)));
            el.classList.toggle('is-dim', Boolean(path && !path.includes(id)));
            const order = path ? path.indexOf(id) : -1;
            el.querySelector('.flow-text').dataset.order = order >= 0 ? String(order + 1) : '';
        });
        root.querySelectorAll('[data-scenario]').forEach(el => {
            if (el.classList.contains('chip')) el.setAttribute('aria-pressed', String(el.dataset.scenario === activeScenario));
        });
        renderFnPanel(root);
    }

    function bindProgram(root) {
        root.addEventListener('click', event => {
            const node = event.target.closest('[data-flow-node]');
            if (node) {
                selectedNode = node.dataset.flowNode;
                updateFlow(root);
                return;
            }
            const open = event.target.closest('[data-fn-open]');
            if (open) {
                const fn = open.dataset.fnOpen;
                const match = [...FLOW, ...FLOW.filter(n => n.side).map(n => n.side)].find(n => n.fn === fn && !n.hl);
                if (match) {
                    selectedNode = match.id;
                    updateFlow(root);
                } else {
                    showFunction(root, fn);
                }
                return;
            }
            const scenario = event.target.closest('[data-scenario]');
            if (scenario) {
                activeScenario = scenario.dataset.scenario || null;
                if (activeScenario) selectedNode = SCENARIOS[activeScenario].focus;
                updateFlow(root);
            }
        });
        updateFlow(root);
    }

    function showFunction(root, fn) {
        // For functions without a flowchart node of their own (e.g. scaleManual)
        const panel = root.querySelector('[data-fn-panel]');
        const info = FUNCTIONS[fn];
        if (!panel || !info) return;
        root.querySelectorAll('[data-flow-node]').forEach(el => el.setAttribute('aria-pressed', 'false'));
        panel.innerHTML = `
            <p class="panel-kicker">${esc(info.group)}</p>
            <h3><code>${esc(fn)}()</code></h3>
            <p>${esc(info.summary)}</p>
            <dl class="fn-meta">
                <div><dt>Called by</dt><dd>${info.calledBy.map(c => esc(c)).join(', ')}</dd></div>
                <div><dt>Calls</dt><dd>${info.calls.length ? info.calls.map(c => FUNCTIONS[c] ? `<button type="button" class="fn-link" data-fn-open="${c}">${c}()</button>` : esc(c)).join(' ') : 'No other project functions'}</dd></div>
                <div><dt>Uses</dt><dd>${info.vars.length ? info.vars.map(v => `<code>${esc(v)}</code>`).join(' ') : 'Only its arguments'}</dd></div>
            </dl>
            ${codeBlock(FW.integrated[fn])}
        `;
    }

    /* =========================================================
       TAB 2: CSV GENERATION
       ========================================================= */
    const HEADER = 'time_ms,mode,left_ir_blocked,front_ir_blocked,right_ir_blocked,front_distance_cm,ultrasonic_echo_valid,servo_angle_commanded,left_pwm_commanded,right_pwm_commanded,left_dir_pin,right_dir_pin,motor_action,bluetooth_connected,joystick_x,joystick_y';
    const LAB2_HEADER = 'time_ms,mode,left_ir_blocked,front_ir_blocked,right_ir_blocked,front_distance_cm,ultrasonic_echo_valid,servo_angle_commanded,left_pwm_commanded,right_pwm_commanded,left_dir_pin,right_dir_pin,motor_action';

    const COLUMNS = [
        ['time_ms', 'now  (millis())', 533, 'Milliseconds since the robot was switched on or reset. It restarts at 0 after every power-up, so it is not a clock time, and a drop in value marks a restart.'],
        ['mode', 'mode == AUTO ? "AUTO" : (mode == GAME ? "GAME" : "MANUAL")', 534, 'Operating mode when the row was written: MANUAL, AUTO or GAME. The robot starts in MANUAL and returns to MANUAL whenever the phone link is lost.'],
        ['left_ir_blocked', 'leftBlocked ? 1 : 0', 535, '1 when the left IR sensor (A1) reads LOW, meaning something is close on the left.'],
        ['front_ir_blocked', 'frontBlocked ? 1 : 0', 536, '1 when the front IR sensor (D9) reads LOW.'],
        ['right_ir_blocked', 'rightBlocked ? 1 : 0', 537, '1 when the right IR sensor (A2) reads LOW.'],
        ['front_distance_cm', 'frontDistance', 538, 'Ultrasonic distance ahead in cm (echo time in µs ÷ 58). It reads 300 when no echo came back, so always check ultrasonic_echo_valid.'],
        ['ultrasonic_echo_valid', 'ultrasonicEchoValid ? 1 : 0', 539, '1 if the last ultrasonic reading got an echo; 0 if pulseIn() timed out after 25 ms.'],
        ['servo_angle_commanded', 'servoCommandedAngle', 540, 'Last angle sent to the scan servo. AUTO scanning returns the servo to 90° before logging; GAME mode can record the angle selected with the phone slider.'],
        ['left_pwm_commanded', 'commandedLeftPwm', 541, 'PWM value (0–255) last written to the left speed pin, D5. It is the command, not a measured wheel speed.'],
        ['right_pwm_commanded', 'commandedRightPwm', 542, 'PWM value last written to the right speed pin, D6.'],
        ['left_dir_pin', 'leftDirLevel', 543, 'Last level written to direction pin D2 (1 = HIGH = left side forward). stopRobot() does not change it, so STOP rows keep the previous direction.'],
        ['right_dir_pin', 'rightDirLevel', 544, 'Last level written to D4. The right side runs forward when D4 is LOW, so 0 means forward here.'],
        ['motor_action', 'motorAction', 545, 'Label of the last motor command. AUTO turns always end with stopRobot() before the row is written, so AUTO rows show FORWARD or STOP. Manual rows use MANUAL_FORWARD, MANUAL_REVERSE, MANUAL_TURN_LEFT, MANUAL_TURN_RIGHT or MANUAL_MIXED. In the current supplied sketch, the two MANUAL_TURN labels appear reversed relative to the joystick turn direction. This affects the log label, not the motor pin commands; verify the label during physical testing.'],
        ['bluetooth_connected', 'link packet in the last 650 ms ? 1 : 0', 546, '1 if a valid phone packet arrived in the last 650 ms. Right after an avoidance maneuver it can read 0, because packets that arrived during the maneuver have not been read yet.'],
        ['joystick_x', 'joystickX', 547, 'Last steering value (−100 to 100) received in MANUAL or GAME. Switching to AUTO does not clear it, although the phone app sends 0,0 when the stick is released.'],
        ['joystick_y', 'joystickY', 548, 'Last throttle value (−100 to 100), with the same MANUAL/GAME rules as joystick_x.']
    ];

    // Illustrative rows, built by following the firmware's rules (not a recording).
    const SAMPLE_ROWS = [
        ['612', 'MANUAL', '0', '0', '0', '300', '0', '90', '0', '0', '1', '0', 'STOP', '0', '0', '0'],
        ['5214', 'MANUAL', '0', '0', '0', '142', '1', '90', '0', '0', '1', '0', 'STOP', '1', '0', '0'],
        ['5416', 'MANUAL', '0', '0', '0', '138', '1', '90', '127', '127', '1', '0', 'MANUAL_FORWARD', '1', '0', '70'],
        ['5618', 'MANUAL', '0', '0', '0', '131', '1', '90', '116', '116', '1', '1', 'MANUAL_TURN_LEFT', '1', '60', '0'],
        ['6021', 'AUTO', '0', '0', '0', '88', '1', '90', '110', '110', '1', '0', 'FORWARD', '1', '0', '0'],
        ['6223', 'AUTO', '0', '0', '0', '57', '1', '90', '110', '110', '1', '0', 'FORWARD', '1', '0', '0'],
        ['8180', 'AUTO', '0', '1', '0', '14', '1', '90', '0', '0', '0', '0', 'STOP', '0', '0', '0'],
        ['8382', 'AUTO', '0', '0', '0', '63', '1', '90', '110', '110', '1', '0', 'FORWARD', '1', '0', '0']
    ];
    const SAMPLE_NOTES = [
        'Just after power-up: no phone yet and no echo, so the distance reads 300.',
        'Phone connected (M, then J,0,0): still stopped, link flag now 1.',
        'Stick pushed forward to y = 70: both sides get PWM 127.',
        'Stick pushed right to x = 60: left forward, right backward, so the robot spins right. The supplied sketch currently labels this MANUAL_TURN_LEFT; this is a log-label mismatch, not a change to the motor command.',
        'AUTO selected: path clear, so moveForward() at 110.',
        'Still clear at 57 cm.',
        'Logged after avoidObstacle(): the sensor values are the ones read before the 1.75 s maneuver, the motors are stopped, and the link flag is 0 because heartbeats waiting in the buffer have not been read yet.',
        'Back to driving forward after turning left.'
    ];

    const sampleCsv = () => [HEADER, ...SAMPLE_ROWS.map(r => r.join(','))].map(line => `${line}\r\n`).join('');

    function renderCsv() {
        const column = COLUMNS.find(c => c[0] === selectedColumn) || COLUMNS[0];
        return `
            <div class="demo-intro">
                <h2>How the robot generates CSV files</h2>
                <p>While the integrated sketch runs, it writes one line to <code>robot.csv</code> at most every 200 ms. Each line holds 16 values separated by commas: the operating mode, sensor readings, commanded servo angle, motor PWM and direction values, motor action, connection state and joystick axes.</p>
            </div>

            <ol class="pipeline" aria-label="From sensor reading to SD card">
                <li>
                    <h3>Sensor reading</h3>
                    <p><code>loop()</code> reads the three IR sensors with <code>digitalRead()</code> and the distance with <code>readDistanceCM()</code>.</p>
                    <p class="pipeline-src">Lines 957–960</p>
                </li>
                <li>
                    <h3>Data processing</h3>
                    <p>The AUTO rules, <code>runManual()</code> or <code>runGame()</code> pick a motor command. Each motor function stores its PWM, direction levels and a label.</p>
                    <p class="pipeline-src">Lines 129–199, 408–471, 987–1000</p>
                </li>
                <li>
                    <h3>CSV formatting</h3>
                    <p><code>logDataIfDue()</code> prints the 16 values with a comma between each, and <code>println()</code> ends the row with <code>\\r\\n</code>.</p>
                    <p class="pipeline-src">Lines 533–548</p>
                </li>
                <li>
                    <h3>SD card writing</h3>
                    <p><code>flush()</code> saves the row and updates the file size on the card, so it survives a later power cut.</p>
                    <p class="pipeline-src">Line 550</p>
                </li>
            </ol>

            <section class="demo-section">
                <div class="section-row">
                    <h3>Inspect the columns</h3>
                    <div class="seg" role="group" aria-label="Sample view">
                        <button type="button" class="chip" data-csv-view="table" aria-pressed="${csvView === 'table'}">Table</button>
                        <button type="button" class="chip" data-csv-view="raw" aria-pressed="${csvView === 'raw'}">Raw text</button>
                    </div>
                </div>
                <p class="demo-note">Illustrative rows built by following the firmware's rules, not a recording from the robot. Select a column heading or any value to see where it comes from.</p>
                <div class="csv-layout">
                    <div class="csv-sample" data-csv-sample>${renderSample()}</div>
                    <aside class="col-detail" data-col-detail aria-live="polite">${renderColumnDetail(column)}</aside>
                </div>
            </section>

            <section class="demo-section">
                <h3>Step by step: how one row is recorded</h3>
                <div class="two-col">
                    <ol class="step-list">
                        <li>Every branch of <code>loop()</code> ends by calling <code>logDataIfDue()</code>.</li>
                        <li>It returns straight away if the card is not ready or fewer than 200 ms have passed since the last row.</li>
                        <li>Otherwise it stores the time in <code>lastLogMs</code>.</li>
                        <li>Sixteen <code>print()</code> calls write the values and commas into the SD library's 512-byte buffer.</li>
                        <li><code>println()</code> ends the row with a carriage return and line feed.</li>
                        <li><code>flush()</code> writes the buffer to the card and updates the file's size in its directory entry.</li>
                        <li>New rows always go to the end, because the file was opened with <code>O_AT_END</code>; earlier rows are never rewritten.</li>
                    </ol>
                    ${codeBlock(FW.ranges.logRow, { caption: 'logDataIfDue(), the row itself' })}
                </div>
            </section>

            <section class="demo-section">
                <h3>About the header</h3>
                <p><code>startSDLogging()</code> writes the header line only when <code>robot.csv</code> is new or empty. The integrated sketch writes 16 columns. The Lab 2 SD-only sketch writes 13: it has no <code>bluetooth_connected</code>, <code>joystick_x</code> or <code>joystick_y</code>, and always logs <code>AUTO</code>.</p>
                <div class="notice warning">If a card that already holds a Lab 2 <code>robot.csv</code> is used with the integrated sketch, the old 13-column header stays and 16-value rows are added under it. Rename or delete <code>robot.csv</code> when you switch sketches.</div>
                ${codeBlock(FW.ranges.header, { caption: 'writeCsvHeader(), called when a new or empty log is opened' })}
            </section>

            <section class="demo-section">
                <h3>Check your own robot.csv</h3>
                <p>Open a <code>robot.csv</code> copied from the card or downloaded with the phone controller. It is read in this browser only and is not uploaded anywhere.</p>
                <label class="button secondary file-button">Open robot.csv<input type="file" accept=".csv,text/csv" data-csv-file></label>
                <div class="file-report" data-csv-report aria-live="polite"></div>
            </section>
        `;
    }

    function renderSample() {
        if (csvView === 'raw') {
            return `<pre class="raw-csv" tabindex="0">${esc(sampleCsv().replace(/\r\n/g, '↵\n'))}</pre><p class="demo-note">↵ marks the <code>\\r\\n</code> that ends each row.</p>`;
        }
        const header = HEADER.split(',');
        return `
            <div class="table-scroll" tabindex="0">
                <table class="csv-table">
                    <thead><tr>${header.map(name => `<th scope="col"><button type="button" data-col="${name}" class="${name === selectedColumn ? 'is-active' : ''}">${name}</button></th>`).join('')}</tr></thead>
                    <tbody>${SAMPLE_ROWS.map((row, r) => `<tr title="${esc(SAMPLE_NOTES[r])}">${row.map((value, c) => `<td data-col="${header[c]}" class="${header[c] === selectedColumn ? 'is-active' : ''}">${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
            </div>
            <ol class="row-notes">${SAMPLE_NOTES.map(note => `<li>${esc(note)}</li>`).join('')}</ol>
        `;
    }

    function renderColumnDetail(column) {
        const [name, source, line, meaning] = column;
        const index = COLUMNS.indexOf(column);
        const excerpt = FW.ranges.logRow;
        return `
            <p class="panel-kicker">Column ${index + 1} of 16</p>
            <h4><code>${esc(name)}</code></h4>
            <p>${esc(meaning)}</p>
            <dl class="fn-meta">
                <div><dt>Written from</dt><dd><code>${esc(source)}</code></dd></div>
                <div><dt>Sample values</dt><dd>${[...new Set(SAMPLE_ROWS.map(r => r[index]))].map(v => `<code>${esc(v)}</code>`).join(' ')}</dd></div>
            </dl>
            ${codeBlock({ start: line, lines: [excerpt.lines[line - excerpt.start]] }, { highlight: [[line, line]], caption: INTEGRATED })}
        `;
    }

    function inspectCsv(text, fileName) {
        const lines = text.split(/\r?\n/);
        if (lines[lines.length - 1] === '') lines.pop();
        if (!lines.length) return `<p class="demo-note">${esc(fileName)} is empty.</p>`;
        const header = lines[0].split(',');
        const kind = lines[0] === HEADER ? 'Integrated sketch header (16 columns)'
            : lines[0] === LAB2_HEADER ? 'Lab 2 SD-only header (13 columns)'
                : `Not a header this project writes (${header.length} columns)`;
        const rows = lines.slice(1);
        const width = header.length;
        let mismatched = 0;
        let restarts = 0;
        let previousTime = null;
        const timeIndex = header.indexOf('time_ms');
        const actionIndex = header.indexOf('motor_action');
        const modeIndex = header.indexOf('mode');
        const actions = new Map();
        const modes = new Map();
        rows.forEach(line => {
            const cells = line.split(',');
            if (cells.length !== width) mismatched++;
            if (timeIndex >= 0) {
                const t = Number(cells[timeIndex]);
                if (Number.isFinite(t)) {
                    if (previousTime !== null && t < previousTime) restarts++;
                    previousTime = t;
                }
            }
            if (actionIndex >= 0 && cells[actionIndex] !== undefined) actions.set(cells[actionIndex], (actions.get(cells[actionIndex]) || 0) + 1);
            if (modeIndex >= 0 && cells[modeIndex] !== undefined) modes.set(cells[modeIndex], (modes.get(cells[modeIndex]) || 0) + 1);
        });
        const counts = map => [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `<code>${esc(k)}</code> ${v.toLocaleString()}`).join(', ') || 'none';
        const preview = rows.slice(0, 50);
        return `
            <dl class="report-grid">
                <div><dt>File</dt><dd>${esc(fileName)}, ${text.length.toLocaleString()} bytes</dd></div>
                <div><dt>Header</dt><dd>${esc(kind)}</dd></div>
                <div><dt>Records</dt><dd>${rows.length.toLocaleString()}</dd></div>
                <div><dt>Rows with the wrong number of values</dt><dd>${mismatched.toLocaleString()}</dd></div>
                <div><dt>Restarts (time_ms went back)</dt><dd>${restarts.toLocaleString()}</dd></div>
                <div><dt>mode</dt><dd>${counts(modes)}</dd></div>
                <div class="wide"><dt>motor_action</dt><dd>${counts(actions)}</dd></div>
            </dl>
            <p class="demo-note">Showing the first ${preview.length.toLocaleString()} of ${rows.length.toLocaleString()} records.</p>
            <div class="table-scroll file-preview" tabindex="0">
                <table class="csv-table">
                    <thead><tr><th scope="col">Line</th>${header.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
                    <tbody>${preview.map((line, i) => `<tr><td>${i + 1}</td>${line.split(',').map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
            </div>
        `;
    }

    function bindCsv(root) {
        root.addEventListener('click', event => {
            const col = event.target.closest('[data-col]');
            if (col) {
                selectedColumn = col.dataset.col;
                root.querySelectorAll('[data-col]').forEach(el => el.classList.toggle('is-active', el.dataset.col === selectedColumn));
                const column = COLUMNS.find(c => c[0] === selectedColumn);
                root.querySelector('[data-col-detail]').innerHTML = renderColumnDetail(column);
                return;
            }
            const view = event.target.closest('[data-csv-view]');
            if (view) {
                csvView = view.dataset.csvView;
                root.querySelectorAll('[data-csv-view]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.csvView === csvView)));
                root.querySelector('[data-csv-sample]').innerHTML = renderSample();
            }
        });
        root.querySelector('[data-csv-file]')?.addEventListener('change', async event => {
            const file = event.target.files && event.target.files[0];
            const report = root.querySelector('[data-csv-report]');
            if (!file) return;
            try {
                report.innerHTML = inspectCsv(await file.text(), file.name);
            } catch (error) {
                report.innerHTML = `<p class="demo-note">Could not read ${esc(file.name)}: ${esc(error.message)}</p>`;
            }
            event.target.value = '';
        });
    }

    /* =========================================================
       TAB 3: SD CARD STORAGE (simulator)
       ========================================================= */
    const sim = { powered: false, cardIn: true, files: {}, t: 0, log: [] };

    function simRow() {
        sim.t += 200 + Math.floor(Math.random() * 6);
        const d = 40 + Math.floor(Math.random() * 120);
        return `${sim.t},AUTO,0,0,0,${d},1,90,110,110,1,0,FORWARD,1,0,0`;
    }
    const fileBytes = lines => lines.reduce((sum, line) => sum + line.length + 2, 0);
    function simLog(fn, text, kind = '') {
        sim.log.push({ fn, text, kind });
        if (sim.log.length > 40) sim.log.shift();
    }

    const SIM_ACTIONS = {
        power() {
            if (sim.powered) { simLog('', 'The robot is already on.'); return; }
            sim.powered = true;
            sim.t = 600;
            if (!sim.cardIn) { simLog('startSDLogging()', 'sd.begin() failed: no card. sdReady = false, so the robot drives without logging.', 'warn'); return; }
            simLog('recoverInterruptedRewrite()', 'Checks for robot.bak or robot.tmp left by an interrupted selected-record rewrite.');
            if (!sim.files['robot.csv']) {
                sim.files['robot.csv'] = [HEADER];
                simLog('startSDLogging()', 'robot.csv did not exist, so it was created and the header line was written and flushed.');
            } else {
                simLog('startSDLogging()', `robot.csv opened with O_AT_END. Its ${sim.files['robot.csv'].length - 1} existing records are kept and new rows go after them.`);
            }
        },
        log() {
            if (!sim.powered) { simLog('', 'Switch the robot on first.'); return; }
            if (!sim.cardIn || !sim.files['robot.csv']) { simLog('logDataIfDue()', 'No card: the firmware does not check for write errors, so these rows are simply lost.', 'warn'); return; }
            for (let i = 0; i < 5; i++) sim.files['robot.csv'].push(simRow());
            simLog('logDataIfDue() ×5', 'Five rows appended, each followed by flush(), about 200 ms apart.');
        },
        download() {
            if (!sim.powered || !sim.files['robot.csv'] || !sim.cardIn) { simLog('', 'Needs the robot on with the card in.'); return; }
            const bytes = fileBytes(sim.files['robot.csv']);
            simLog('parseLine("D")', 'Robot stopped, MANUAL selected, download requested.');
            simLog('sendCsvFileOverBluetooth()', `Log closed, robot.csv opened read-only. Sent #CSV_BEGIN,${bytes}, then ${bytes.toLocaleString()} bytes, then #CSV_END.`);
            simLog('', 'robot.csv reopened for appending. Nothing on the card changed; the phone now holds a copy.', 'ok');
        },
        deleteSome() {
            const file = sim.files['robot.csv'];
            if (!sim.powered || !file || !sim.cardIn) { simLog('', 'Needs the robot on with the card in.'); return; }
            if (file.length < 3) { simLog('', 'Log a few rows first.'); return; }
            const kept = [file[0], ...file.slice(3)];
            simLog('RW,<bytes>,<crc>,2', 'The phone asks to delete records 1 and 2 of its downloaded copy.');
            simLog('rewriteCsvWithoutRecords()', 'Robot stopped. Kept lines copied to robot.tmp while the phone sends the selection, 64 lines at a time.');
            simLog('', 'CRC of the phone’s copy matched the start of robot.csv; 2 records skipped as requested.');
            simLog('', 'robot.tmp re-read from the card and checked against what was written.');
            simLog('', 'robot.csv → robot.bak, robot.tmp → robot.csv, robot.bak removed.');
            sim.files['robot.csv'] = kept;
            simLog('', `#RW_OK,2,${fileBytes(kept)}: two records deleted, logging resumed.`, 'ok');
        },
        deleteAll() {
            if (!sim.powered || !sim.files['robot.csv'] || !sim.cardIn) { simLog('', 'Needs the robot on with the card in.'); return; }
            simLog('deleteEntireCsv()', 'Robot stopped, log closed, robot.csv removed and checked as gone.');
            sim.files['robot.csv'] = [HEADER];
            simLog('', `New robot.csv created with only the header. #DEL_OK,${HEADER.length + 2}.`, 'ok');
        },
        off() {
            if (!sim.powered) { simLog('', 'The robot is already off.'); return; }
            sim.powered = false;
            simLog('', 'Power off between rows: every flushed row stays on the card.', 'ok');
        },
        cut() {
            if (!sim.powered) { simLog('', 'Switch the robot on first.'); return; }
            sim.powered = false;
            simLog('', 'Power cut while a row was being written: that row never reached flush(), so it is lost. Rows already flushed are safe. A cut during flush() itself can leave the card needing a check on a computer.', 'warn');
        },
        card() {
            sim.cardIn = !sim.cardIn;
            if (!sim.cardIn) {
                simLog('', sim.powered
                    ? 'Card pulled out while the robot is on. The firmware does not notice; new rows are lost, and pulling it during a write can corrupt the file system.'
                    : 'Card removed with the robot off. This is the safe way to copy robot.csv to a computer.', sim.powered ? 'warn' : 'ok');
            } else {
                simLog('', sim.powered ? 'Card inserted, but the firmware only starts the card in setup(): restart the robot to log again.' : 'Card inserted.', sim.powered ? 'warn' : '');
            }
        },
        reset() {
            sim.powered = false; sim.cardIn = true; sim.files = {}; sim.t = 0; sim.log = [];
        }
    };

    function renderSimState() {
        const file = sim.files['robot.csv'];
        return `
            <div class="sim-status">
                <span class="sim-dot${sim.powered ? ' is-on' : ''}"></span>Robot ${sim.powered ? 'on' : 'off'}
                <span class="sim-dot${sim.cardIn ? ' is-on' : ''}"></span>Card ${sim.cardIn ? 'inserted' : 'removed'}
            </div>
            <div class="sim-card">
                <p class="panel-kicker">microSD card</p>
                ${file ? `
                    <p class="sim-file"><code>robot.csv</code><span>${(file.length - 1).toLocaleString()} records, ${fileBytes(file).toLocaleString()} bytes</span></p>
                    <pre class="sim-tail" tabindex="0">${esc(file.slice(-4).join('\n'))}</pre>
                ` : '<p class="demo-note">No robot.csv yet. Switch the robot on to create it.</p>'}
            </div>
            <ol class="sim-log" aria-label="What the firmware did">
                ${sim.log.length ? sim.log.slice().reverse().map(item => `<li class="${item.kind}">${item.fn ? `<code>${esc(item.fn)}</code> ` : ''}${esc(item.text)}</li>`).join('') : '<li>Choose an action to see what the firmware does.</li>'}
            </ol>
        `;
    }

    function renderStorage() {
        return `
            <div class="demo-intro">
                <h2>Data storage using the microSD card</h2>
                <p>The microSD module gives the robot memory that survives power-off. The integrated sketch keeps one file, <code>robot.csv</code>, open for appending while the robot runs, and every row is flushed to the card as soon as it is written.</p>
            </div>

            <section class="demo-section">
                <h3>How the card is connected and started</h3>
                <div class="two-col">
                    <div>
                        <dl class="build-sheet">
                            <div><dt>Library</dt><dd>SdFat v2.x, <code>SdFat32</code> (FAT16 or FAT32 card)</dd></div>
                            <div><dt>Bus</dt><dd>Software SPI, because D12 and D13 belong to the ultrasonic sensor</dd></div>
                            <div><dt>Pins</dt><dd>CS <code>D8</code>, MOSI <code>D11</code>, SCK <code>D7</code>, MISO <code>A0</code></dd></div>
                            <div><dt>File</dt><dd><code>robot.csv</code> in the card's root folder</dd></div>
                            <div><dt>If it fails</dt><dd><code>sdReady</code> stays false and the robot drives without logging</dd></div>
                        </dl>
                    </div>
                    ${codeBlock(FW.ranges.sdPins, { caption: 'Software SPI set-up' })}
                </div>
            </section>

            <section class="demo-section">
                <h3>File workflow simulator</h3>
                <p class="demo-note">A simulation of what the firmware does with the card for each action. No hardware is involved. Both delete actions are included in the current supplied integrated sketch.</p>
                <div class="sim">
                    <div class="sim-controls" role="group" aria-label="Simulator actions">
                        <button type="button" class="button small" data-sim="power">Switch robot on</button>
                        <button type="button" class="button small secondary" data-sim="log">Log 5 rows</button>
                        <button type="button" class="button small secondary" data-sim="download">Download with phone</button>
                        <button type="button" class="button small secondary" data-sim="deleteSome">Delete 2 records</button>
                        <button type="button" class="button small secondary" data-sim="deleteAll">Delete entire file</button>
                        <button type="button" class="button small secondary" data-sim="off">Switch off safely</button>
                        <button type="button" class="button small secondary" data-sim="cut">Cut power mid-write</button>
                        <button type="button" class="button small secondary" data-sim="card">Remove or insert card</button>
                        <button type="button" class="text-link-button" data-sim="reset">Start over</button>
                    </div>
                    <div class="sim-state" data-sim-state aria-live="polite">${renderSimState()}</div>
                </div>
            </section>

            <section class="demo-section">
                <h3>Recording, reading, downloading and deleting</h3>
                <div class="table-scroll">
                    <table class="data-table">
                        <thead><tr><th scope="col"></th><th scope="col">Function</th><th scope="col">How robot.csv is opened</th><th scope="col">Robot</th><th scope="col">Does the card change?</th></tr></thead>
                        <tbody>
                            <tr><th scope="row">Recording</th><td><code>logDataIfDue()</code></td><td>Read-write, append (<code>O_RDWR | O_CREAT | O_AT_END</code>)</td><td>Driving normally</td><td>Yes, a row is added</td></tr>
                            <tr><th scope="row">Reading</th><td><code>sendCsvFileOverBluetooth()</code></td><td>Read-only (<code>O_RDONLY</code>), byte by byte</td><td>Stopped</td><td>No</td></tr>
                            <tr><th scope="row">Downloading</th><td>Reading, plus the phone saving what it receives</td><td>Read-only</td><td>Stopped</td><td>No, the phone gets a copy</td></tr>
                            <tr><th scope="row">Deleting</th><td><code>deleteEntireCsv()</code>, <code>rewriteCsvWithoutRecords()</code>, <code>deleteCsvFileOnSd()</code></td><td>Removed and recreated, or rewritten through <code>robot.tmp</code></td><td>Stopped</td><td>Yes, permanently</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="demo-section">
                <h3>How selected-record deletion protects the original</h3>
                <ol class="file-states">
                    <li><span class="fs-files"><b>robot.csv</b></span><span>Start: the original file.</span></li>
                    <li><span class="fs-files"><b>robot.csv</b> <i>robot.tmp</i></span><span>Kept lines are copied to robot.tmp, then re-read and checked.</span></li>
                    <li><span class="fs-files"><i>robot.bak</i> <i>robot.tmp</i></span><span>The original is renamed, not deleted.</span></li>
                    <li><span class="fs-files"><i>robot.bak</i> <b>robot.csv</b></span><span>The checked copy becomes robot.csv.</span></li>
                    <li><span class="fs-files"><b>robot.csv</b></span><span>Only now is the old copy removed.</span></li>
                </ol>
                <p class="demo-note">If the power is cut part-way, the next start-up finishes the job: a missing robot.csv is restored from robot.bak, and a leftover robot.tmp is discarded.</p>
                ${codeBlock(FW.ranges.replace, { file: CURRENT_SKETCH, caption: CURRENT_SKETCH })}
            </section>

            <section class="demo-section">
                <h3>What survives a power-off</h3>
                <p>Every row that reached <code>flush()</code> stays in <code>robot.csv</code> after the robot is switched off, and the next start-up keeps adding to the same file. The file only changes when new rows are logged or when the current firmware receives a delete command.</p>
                <div class="notice warning"><strong>Handle the card with the power off.</strong> Do not remove the card or cut power while the robot is running: the row being written is lost, and a cut while the card's directory is being updated can corrupt the file system. Switch the robot off first, and keep a copy of robot.csv before deleting anything.</div>
            </section>
        `;
    }

    function bindStorage(root) {
        root.addEventListener('click', event => {
            const button = event.target.closest('[data-sim]');
            if (!button) return;
            SIM_ACTIONS[button.dataset.sim]();
            root.querySelector('[data-sim-state]').innerHTML = renderSimState();
        });
    }

    /* =========================================================
       TAB 4: WIRELESS DATA RETRIEVAL
       ========================================================= */
    const AVG_ROW_BYTES = Math.round(SAMPLE_ROWS.slice(4).reduce((s, r) => s + r.join(',').length + 2, 0) / 4);

    function renderEstimate(minutes) {
        const rows = minutes * 60 * 5;
        const bytes = HEADER.length + 2 + rows * AVG_ROW_BYTES;
        const fmt = seconds => seconds < 90 ? `${Math.round(seconds)} s` : `${(seconds / 60).toFixed(1)} min`;
        return `
            <div><dt>Rows, at most</dt><dd>${rows.toLocaleString()}</dd></div>
            <div><dt>File size, about</dt><dd>${(bytes / 1024).toFixed(1)} KB</dd></div>
            <div><dt>Download at 960 B/s</dt><dd>${fmt(bytes / 960)}</dd></div>
            <div><dt>Download at 600 B/s</dt><dd>${fmt(bytes / 600)}</dd></div>
        `;
    }

    function renderWireless() {
        return `
            <div class="demo-intro">
                <h2>Retrieving robot data wirelessly</h2>
                <p>The robot can send <code>robot.csv</code> to a phone without anyone touching the SD card. Today that works over Bluetooth Low Energy through the JDY-16. A Wi-Fi hotspot is not possible with the current parts and is shown below as a proposed upgrade.</p>
            </div>

            <div class="verdict">
                <div class="verdict-ok"><p class="panel-kicker">Works now</p><p><strong>Bluetooth download.</strong> The integrated sketch answers <code>D</code> with the whole file; the phone controller saves it as robot.csv.</p></div>
                <div class="verdict-no"><p class="panel-kicker">Not supported by this hardware</p><p><strong>Wi-Fi hotspot.</strong> The JDY-16 is a Bluetooth Low Energy module only, and the Arduino Uno has no Wi-Fi radio.</p></div>
            </div>

            <section class="demo-section">
                <h3>How the Bluetooth download travels</h3>
                <ol class="chain" aria-label="Data path from the SD card to the phone">
                    <li><b>microSD card</b><span>robot.csv</span></li>
                    <li><b>Arduino Uno</b><span>reads it over software SPI</span></li>
                    <li><b>Serial UART</b><span>9600 baud on D0/D1</span></li>
                    <li><b>JDY-16</b><span>BLE service FFE0, characteristic FFE1</span></li>
                    <li><b>Phone</b><span>Chrome, Web Bluetooth, HTTPS page</span></li>
                </ol>
                <div class="two-col">
                    <ol class="protocol">
                        <li><span class="dir to">Phone → robot</span><code>D</code><span>Download request.</span></li>
                        <li><span class="dir">Robot</span><span>Stops, switches to MANUAL, closes the log.</span></li>
                        <li><span class="dir from">Robot → phone</span><code>#CSV_BEGIN,&lt;bytes&gt;</code><span>File size first.</span></li>
                        <li><span class="dir from">Robot → phone</span><code>raw robot.csv</code><span>Every byte of the file.</span></li>
                        <li><span class="dir from">Robot → phone</span><code>#CSV_END</code><span>The phone checks the byte count, then saves.</span></li>
                        <li><span class="dir">Robot</span><span>Reopens robot.csv for appending. Errors are sent as <code>#CSV_ERROR_SD_NOT_READY</code> or <code>#CSV_ERROR_OPEN_FAILED</code>.</span></li>
                    </ol>
                    ${codeBlock(FW.integrated.sendCsvFileOverBluetooth, { caption: 'sendCsvFileOverBluetooth()' })}
                </div>
            </section>

            <section class="demo-section">
                <h3>How long a download takes</h3>
                <p>At 9600 baud the serial link carries at most about 960 bytes per second, and the phone controller plans for 600. Use the slider to estimate a download.</p>
                <div class="estimator">
                    <label for="log-minutes">Minutes of logging: <output data-minutes-out>30</output></label>
                    <input id="log-minutes" type="range" min="1" max="180" value="30" data-minutes>
                    <dl class="report-grid" data-estimate>${renderEstimate(30)}</dl>
                </div>
                <p class="demo-note">An upper-bound estimate: it assumes a row every 200 ms (5 per second) of about ${AVG_ROW_BYTES} bytes. Avoidance maneuvers write fewer rows.</p>
            </section>

            <section class="demo-section">
                <h3>Bluetooth today, Wi-Fi as an upgrade</h3>
                <div class="table-scroll">
                    <table class="data-table">
                        <thead><tr><th scope="col"></th><th scope="col">Bluetooth (current)</th><th scope="col">Wi-Fi hotspot (proposed)</th></tr></thead>
                        <tbody>
                            <tr><th scope="row">Status</th><td>Working in the integrated sketch</td><td>Not built. Needs new hardware</td></tr>
                            <tr><th scope="row">Radio</th><td>JDY-16, Bluetooth Low Energy</td><td>ESP32 or ESP8266</td></tr>
                            <tr><th scope="row">Phone side</th><td>Chrome with Web Bluetooth, page on HTTPS</td><td>Join the robot's Wi-Fi, open a web address</td></tr>
                            <tr><th scope="row">Speed</th><td>Limited by the 9600-baud serial link</td><td>Much faster, limited by the SD card</td></tr>
                            <tr><th scope="row">Driving during transfer</th><td>Robot stops</td><td>Depends on the design</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="demo-section">
                <h3>Proposed Wi-Fi upgrade</h3>
                <p>The Uno cannot host a hotspot. Its 2 KB of RAM is already largely used by the SD library's 512-byte buffer, and its only hardware serial port is taken by the JDY-16. Two ways to add Wi-Fi:</p>
                <div class="two-col">
                    <div class="option">
                        <p class="panel-kicker">Option A, recommended</p>
                        <h4>Replace the Uno with an ESP32 board</h4>
                        <ul>
                            <li>Wi-Fi and Bluetooth built in, with far more memory.</li>
                            <li>The ESP32 runs its own access point and serves robot.csv at a local address.</li>
                            <li>Needs the sketch ported to the ESP32 and pins re-mapped.</li>
                            <li>The ESP32 uses 3.3 V logic: 5 V sensor outputs such as the ultrasonic echo need level shifting.</li>
                        </ul>
                    </div>
                    <div class="option">
                        <p class="panel-kicker">Option B</p>
                        <h4>Keep the Uno, add an ESP32 as the data logger</h4>
                        <ul>
                            <li>The Uno keeps its tested driving code and sends each row to the ESP32 over serial.</li>
                            <li>The ESP32 owns the SD card and hosts the hotspot.</li>
                            <li>Needs a serial link on free Uno pins and changes to both sketches.</li>
                        </ul>
                    </div>
                </div>
                <ol class="chain proposed" aria-label="Proposed Wi-Fi data path">
                    <li><b>microSD card</b><span>robot.csv</span></li>
                    <li><b>ESP32</b><span>hardware SPI, web server</span></li>
                    <li><b>Wi-Fi access point</b><span>robot's own network</span></li>
                    <li><b>Phone or laptop</b><span>any browser</span></li>
                </ol>
                <p class="demo-note">Proposed only. Nothing on this path has been built or tested, and the current firmware has no Wi-Fi code.</p>
            </section>
        `;
    }

    function bindWireless(root) {
        const slider = root.querySelector('[data-minutes]');
        slider?.addEventListener('input', () => {
            const minutes = Number(slider.value);
            root.querySelector('[data-minutes-out]').textContent = String(minutes);
            root.querySelector('[data-estimate]').innerHTML = renderEstimate(minutes);
        });
    }

    /* =========================================================
       TAB 5: PROJECT COST
       ========================================================= */
    const COSTS = [
        { item: 'Robot Kit', qty: 1, price: 2356, subtotal: 2356, group: 'Electronics and power', role: 'The LAFVIN kit hardware: chassis, Arduino Uno, sensors, servo, motors and wheels, as shown on the Robot Components page.' },
        { item: 'Battery', qty: 2, price: 36, subtotal: 72, group: 'Electronics and power', role: 'Cells for the robot\'s battery holder.' },
        { item: 'SD Card Module', qty: 1, price: 54, subtotal: 54, group: 'Electronics and power', role: 'The microSD logger that stores robot.csv.' },
        { item: 'Board', qty: 3, price: 54, subtotal: 162, group: 'Body and finishing', role: 'Sheets for the outer body shown in the integrated-system photo.' },
        { item: 'Stick Glue', qty: 5, price: 6, subtotal: 30, group: 'Body and finishing', role: 'Joins the body panels.' },
        { item: 'Ruler', qty: 2, price: 6, subtotal: 12, group: 'Tools', role: 'Measuring and marking the panels.' },
        { item: 'Cutter Set', qty: 1, price: 38, subtotal: 38, group: 'Tools', role: 'Cutting the board.' },
        { item: 'Velcro Tape', qty: 1, price: 12, subtotal: 12, group: 'Body and finishing', role: 'Removable fastening, for example of the body to the chassis.' },
        { item: 'Door Hinged', qty: 1, price: 41, subtotal: 41, group: 'Body and finishing', role: 'A hinged opening in the body, for example for access inside.' },
        { item: 'Spray Paint', qty: 1, price: 135, subtotal: 135, group: 'Body and finishing', role: 'The finished colours of the body.' }
    ];
    const STATED_TOTAL = 2912;

    function renderCost() {
        const computed = COSTS.reduce((sum, c) => sum + c.qty * c.price, 0);
        const rowsOk = COSTS.every(c => c.qty * c.price === c.subtotal);
        const units = COSTS.reduce((sum, c) => sum + c.qty, 0);
        const sorted = [...COSTS].sort((a, b) => b.subtotal - a.subtotal);
        const max = sorted[0].subtotal;
        const groups = ['Electronics and power', 'Body and finishing', 'Tools'].map(name => {
            const items = COSTS.filter(c => c.group === name);
            return { name, items, total: items.reduce((s, c) => s + c.subtotal, 0) };
        });
        const pct = v => `${(v / STATED_TOTAL * 100).toFixed(1)}%`;
        return `
            <div class="demo-intro">
                <h2>Project cost breakdown</h2>
                <p>What the team spent to build the robot, from the supplied price list. Prices are in Philippine pesos.</p>
            </div>

            <div class="cost-headline">
                <div class="cost-total"><p class="panel-kicker">Total project cost</p><p class="cost-figure">${peso.format(STATED_TOTAL)}</p></div>
                <dl class="report-grid">
                    <div><dt>Line items</dt><dd>${COSTS.length}</dd></div>
                    <div><dt>Units bought</dt><dd>${units}</dd></div>
                    <div><dt>Robot kit share</dt><dd>${pct(2356)}</dd></div>
                    <div><dt>Arithmetic check</dt><dd>${rowsOk && computed === STATED_TOTAL ? 'Every subtotal and the total add up' : `Mismatch: items add up to ${peso.format(computed)}`}</dd></div>
                </dl>
            </div>

            <section class="demo-section">
                <h3>Materials and prices</h3>
                <div class="table-scroll">
                    <table class="data-table cost-table">
                        <thead><tr><th scope="col">Materials</th><th scope="col" class="num">Quantity</th><th scope="col" class="num">Price each</th><th scope="col" class="num">Subtotal</th></tr></thead>
                        <tbody>${COSTS.map(c => `<tr><td>${esc(c.item)}</td><td class="num">${c.qty}</td><td class="num">${peso.format(c.price)}</td><td class="num">${peso.format(c.subtotal)}</td></tr>`).join('')}</tbody>
                        <tfoot><tr><th scope="row">Total</th><td></td><td></td><td class="num">${peso.format(STATED_TOTAL)}</td></tr></tfoot>
                    </table>
                </div>
            </section>

            <section class="demo-section">
                <h3>Where the money went</h3>
                <ol class="bar-chart" aria-label="Subtotal by material, largest first">
                    ${sorted.map(c => `
                        <li>
                            <span class="bar-label">${esc(c.item)}</span>
                            <span class="bar-track"><span class="bar-fill" style="width:${(c.subtotal / max * 100).toFixed(1)}%"></span></span>
                            <span class="bar-value">${peso.format(c.subtotal)} <small>${pct(c.subtotal)}</small></span>
                        </li>
                    `).join('')}
                </ol>
            </section>

            <section class="demo-section">
                <h3>Materials summary</h3>
                <div class="group-cards">
                    ${groups.map(g => `
                        <div class="group-card">
                            <p class="panel-kicker">${esc(g.name)}</p>
                            <p class="group-total">${peso.format(g.total)} <small>${pct(g.total)}</small></p>
                            <ul>${g.items.map(c => `<li><b>${esc(c.item)}</b> ${esc(c.role)}</li>`).join('')}</ul>
                        </div>
                    `).join('')}
                </div>
                <p class="demo-note">The price list gives names, quantities and prices only. The grouping and the role of each material are inferred from the item names and the photo of the finished robot; correct any that differ.</p>
            </section>
        `;
    }

    /* =========================================================
       TAB 6: BLE JOYSTICK CONTROLLER
       ========================================================= */
    // The playground mirrors the protocol used by lafvin_ble_controller.html.
    function crc16(text) {
        let crc = 0xFFFF;
        for (let i = 0; i < text.length; i++) {
            crc ^= text.charCodeAt(i) << 8;
            for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }
    function maskHex(selected, start) {
        let hex = '';
        for (let byte = 0; byte < 8; byte++) {
            let value = 0;
            for (let bit = 0; bit < 8; bit++) {
                const line = start + byte * 8 + bit;
                if (line > 0 && selected.has(line)) value |= 0x80 >> bit;
            }
            hex += value.toString(16).toUpperCase().padStart(2, '0');
        }
        return hex;
    }
    const playground = new Set([3, 4]);

    function renderPlaygroundOutput() {
        const text = sampleCsv();
        const kept = text.split('\n').filter((line, i) => !playground.has(i)).join('\n');
        const hex = maskHex(playground, 0);
        const bits = hex.slice(0, 4).split('').map(h => parseInt(h, 16).toString(2).padStart(4, '0')).join(' ');
        return playground.size ? `
            <ol class="protocol">
                <li><span class="dir to">Phone → robot</span><code>RW,${text.length},${crc16(text)},${playground.size}</code><span>Bytes and CRC-16 of the phone's copy, and how many records to delete.</span></li>
                <li><span class="dir from">Robot → phone</span><code>#RW_NEXT,0</code><span>Asks for the selection for lines 0–63.</span></li>
                <li><span class="dir to">Phone → robot</span><code>K,${hex}</code><span>One bit per line, line 0 first: <code>${bits}</code>…</span></li>
                <li><span class="dir from">Robot → phone</span><code>#RW_VERIFY</code><span>Kept lines written to robot.tmp, now re-read and checked.</span></li>
                <li><span class="dir from">Robot → phone</span><code>#RW_OK,${playground.size},${kept.length}</code><span>Deleted count and the new file size.</span></li>
            </ol>
        ` : '<p class="demo-note">Select at least one record.</p>';
    }

    const COMMANDS = [
        ['Phone → robot', 'M / A / S', 'Manual, Auto, Stop', 'Unchanged'],
        ['Phone → robot', 'H', 'Heartbeat in AUTO; the robot stops after 650 ms without packets', 'Unchanged'],
        ['Phone → robot', 'J,x,y', 'Joystick, −100 to 100 on each axis', 'Unchanged'],
        ['Phone → robot', 'G', 'Select GAME mode; joystick driving runs without obstacle-sensor checks', 'New'],
        ['Phone → robot', 'V,<0-180>', 'Set the scan-servo angle while in GAME mode', 'New'],
        ['Phone → robot', 'D', 'Download robot.csv', 'Unchanged'],
        ['Phone → robot', 'V', 'Ask which firmware is running; reply #FW,RSL_CSV_MANAGE_1', 'New'],
        ['Phone → robot', 'DELALL', 'Delete robot.csv and recreate it with the header; reply #DEL_OK,<size>', 'New'],
        ['Phone → robot', 'X', 'Compatibility command for whole-file delete; reply #CSV_DELETED or an error', 'New'],
        ['Phone → robot', 'RW,<bytes>,<crc>,<n>', 'Delete n selected records from the copy the phone holds', 'New'],
        ['Phone → robot', 'K,<16 hex>', 'Selection for the next 64 lines, sent when the robot asks', 'New'],
        ['Phone → robot', 'RWX', 'Cancel a selective delete', 'New'],
        ['Robot → phone', '#RW_NEXT / #RW_PROGRESS / #RW_VERIFY', 'Progress of a selective delete', 'New'],
        ['Robot → phone', '#RW_OK / #RW_ERROR_<reason>', 'Rewrite result; errors are reported and the original is preserved or retained as robot.bak for recovery', 'New'],
        ['Robot → phone', '#BUSY', 'Another file operation is already waiting', 'New']
    ];

    const CHECKLIST = [
        'Copy robot.csv from the card to a computer as a backup',
        'Compile and upload lafvin_robot_with_ble_csv_download.ino with the required SdFat v2.x library',
        'Open lafvin_ble_controller.html from the HTTPS website in Chrome for Android',
        'Connect: the controller shows “File management available”',
        'Check Manual, Auto, Game and Emergency Stop with the wheels raised; test Game mode only in a clear area',
        'Download robot.csv: the byte count matches and the preview shows the records',
        'Delete two selected records, download again: exactly those two are gone',
        'Delete the entire file: a new robot.csv holds only the header, logging continues',
        'Switch off part-way through a selective delete, switch on: robot.csv is intact',
        'Restore the backup copy if anything looks wrong'
    ];

    function loadChecklist() {
        try { return JSON.parse(localStorage.getItem('rslDemoHardwareChecklist') || '[]'); } catch (error) { return []; }
    }

    function renderController() {
        const done = loadChecklist();
        return `
            <div class="demo-intro">
                <h2>Wireless robot control and data management</h2>
                <p>The supplied phone controller communicates with the JDY-16 over BLE. It keeps manual, automatic and game controls, downloads robot.csv, previews its records, and supports selected-record and whole-file deletion when the matching firmware confirms the operation.</p>
            </div>

            <div class="status-strip" role="list" aria-label="Validation status">
                <div role="listitem" class="ok"><b>Source protocol reviewed</b><span>The uploaded controller commands and firmware reply identifiers have been matched.</span></div>
                <div role="listitem" class="pending"><b>Compiled for Arduino Uno</b><span>Compile with the required SdFat v2.x library before uploading.</span></div>
                <div role="listitem" class="pending"><b>Tested on the robot</b><span>Physical hardware validation is still required.</span></div>
            </div>

            <section class="demo-section">
                <h3>Current files</h3>
                <div class="version-grid">
                    <div class="option">
                        <p class="panel-kicker">Current supplied pair</p>
                        <h4>Controller and firmware that belong together</h4>
                        <p><code>lafvin_ble_controller.html</code> and <code>${INTEGRATED}</code>. The page checks for <code>#FW,RSL_CSV_MANAGE_1</code> before enabling selected-record deletion.</p>
                        <div class="button-row">
                            <a class="button small" href="lafvin_ble_controller.html" target="_blank" rel="noopener">Launch joystick</a>
                            <a class="button small secondary" href="${FW.files.integrated}" download>Download firmware</a>
                            <a class="button small secondary" href="lafvin_ble_controller.html" download>Download controller HTML</a>
                        </div>
                    </div>
                </div>
                <p class="demo-note">For Bluetooth, open the hosted controller from an HTTPS address in Chrome for Android. Opening the downloaded HTML directly as a local file may not provide the secure browser context required by Web Bluetooth.</p>
            </section>

            <section class="demo-section">
                <h3>What the current controller includes</h3>
                <div class="feature-grid">
                    <div><h4>CSV preview</h4><p>After a download, or after opening a saved copy, the records appear in a scrollable table with the column headers, the record count and 100 rows per page.</p></div>
                    <div><h4>Selective deletion</h4><p>Tick records, or use Select all and Deselect all. The selected count is always shown, and a confirmation explains what will happen before anything is sent.</p></div>
                    <div><h4>Whole-file deletion</h4><p>A separate Delete entire file button that requires DELETE typed to confirm. The robot recreates robot.csv with only its header.</p></div>
                    <div><h4>Game mode</h4><p>A full-screen steering wheel, forward/reverse controls and servo slider. The firmware bypasses obstacle-sensor safety checks in this mode, so use it only in a clear supervised area.</p></div>
                    <div><h4>Firmware check</h4><p>On connect the phone sends <code>V</code>. Selected-record deletion is enabled only when the robot answers <code>#FW,RSL_CSV_MANAGE_1</code>.</p></div>
                </div>
            </section>

            <section class="demo-section">
                <h3>Try the selective-delete protocol</h3>
                <p>Tick sample records to see the exact commands the controller would exchange with the robot for them.</p>
                <div class="two-col">
                    <div class="table-scroll" tabindex="0">
                        <table class="csv-table playground-table">
                            <thead><tr><th scope="col">Delete</th><th scope="col">Line</th><th scope="col">time_ms</th><th scope="col">mode</th><th scope="col">front_distance_cm</th><th scope="col">motor_action</th></tr></thead>
                            <tbody>${SAMPLE_ROWS.map((row, i) => `<tr><td><input type="checkbox" data-pg-line="${i + 1}" ${playground.has(i + 1) ? 'checked' : ''} aria-label="Delete line ${i + 1}"></td><td>${i + 1}</td><td>${row[0]}</td><td>${row[1]}</td><td>${row[5]}</td><td>${row[12]}</td></tr>`).join('')}</tbody>
                        </table>
                    </div>
                    <div data-pg-out aria-live="polite">${renderPlaygroundOutput()}</div>
                </div>
            </section>

            <section class="demo-section">
                <h3>Command reference</h3>
                <div class="table-scroll">
                    <table class="data-table">
                        <thead><tr><th scope="col">Direction</th><th scope="col">Command</th><th scope="col">Meaning</th><th scope="col">In supplied firmware</th></tr></thead>
                        <tbody>${COMMANDS.map(([dir, cmd, meaning, status]) => `<tr><td>${esc(dir)}</td><td><code>${esc(cmd)}</code></td><td>${esc(meaning)}</td><td class="${status === 'New' ? 'tag-new' : ''}">${status}</td></tr>`).join('')}</tbody>
                    </table>
                </div>
            </section>

            <section class="demo-section">
                <h3>Safety rules and how they are met</h3>
                <div class="table-scroll">
                    <table class="data-table">
                        <thead><tr><th scope="col">Rule</th><th scope="col">How the supplied firmware handles it</th></tr></thead>
                        <tbody>
                            <tr><td>Never claim a deletion the robot has not confirmed</td><td>Success is shown only after <code>#RW_OK</code> or <code>#DEL_OK</code>. Timeouts and disconnects say the result is unconfirmed.</td></tr>
                            <tr><td>No download and delete at the same time</td><td>One file operation at a time on the phone; the robot answers <code>#BUSY</code> to a second request.</td></tr>
                            <tr><td>Do not interrupt a transfer</td><td>Disconnect, mode and stop buttons are disabled while a file operation runs; the robot is already stopped.</td></tr>
                            <tr><td>Protect the original during a rewrite</td><td>Kept lines go to robot.tmp, which is re-read and checked before robot.csv is swapped, with robot.bak as the fallback.</td></tr>
                            <tr><td>Delete the right records</td><td>The robot compares the CRC-16 and size of the phone's copy with robot.csv and refuses if they differ. Records logged after the download are always kept.</td></tr>
                            <tr><td>Fail without losing data</td><td>Most rewrite errors leave the original in place. If the final swap cannot restore it immediately, the original remains as <code>robot.bak</code> for startup recovery. A power cut during the swap is also handled at the next start-up.</td></tr>
                            <tr><td>Keep the emergency stop and watchdog</td><td>Manual and automatic control remain in the sketch. The firmware uses a 650 ms connection timeout and a 400 ms joystick timeout to stop the motors when packets stop.</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="demo-section">
                <h3>Hardware test checklist</h3>
                <p>Work through this with the robot before relying on the current controller and firmware. Ticks are saved in this browser only.</p>
                <ul class="checklist">
                    ${CHECKLIST.map((item, i) => `<li><label><input type="checkbox" data-check="${i}" ${done.includes(i) ? 'checked' : ''}> <span>${esc(item)}</span></label></li>`).join('')}
                </ul>
            </section>
        `;
    }

    function bindController(root) {
        root.addEventListener('change', event => {
            const line = event.target.closest('[data-pg-line]');
            if (line) {
                const n = Number(line.dataset.pgLine);
                if (line.checked) playground.add(n); else playground.delete(n);
                root.querySelector('[data-pg-out]').innerHTML = renderPlaygroundOutput();
                return;
            }
            const check = event.target.closest('[data-check]');
            if (check) {
                const done = new Set(loadChecklist());
                const i = Number(check.dataset.check);
                if (check.checked) done.add(i); else done.delete(i);
                try { localStorage.setItem('rslDemoHardwareChecklist', JSON.stringify([...done])); } catch (error) { /* storage unavailable */ }
            }
        });
    }

    /* =========================================================
       PAGE
       ========================================================= */
    const RENDER = { program: renderProgram, csv: renderCsv, storage: renderStorage, wireless: renderWireless, cost: renderCost, controller: renderController };
    const BIND = { program: bindProgram, csv: bindCsv, storage: bindStorage, wireless: bindWireless, controller: bindController };

    function render() {
        return `
            <div class="demo-page">
                <div class="page-head">
                    <h1>Project Demonstration</h1>
                    <p class="subtitle">How the robot's firmware is organised, how it records <code>robot.csv</code>, how that file is stored and retrieved, what the build cost, and the phone controller that manages the data. Code and figures come from the project's own sketches and price list.</p>
                </div>
                <div class="demo-tabs" role="tablist" aria-label="Project demonstration topics">
                    ${TABS.map(tab => `
                        <button type="button" role="tab" id="demo-tab-${tab.id}" class="demo-tab"
                            aria-selected="${tab.id === activeTab}" aria-controls="demo-panel" tabindex="${tab.id === activeTab ? '0' : '-1'}"
                            data-demo-tab="${tab.id}">${tab.label}</button>
                    `).join('')}
                </div>
                <div class="demo-panel" id="demo-panel" role="tabpanel" aria-labelledby="demo-tab-${activeTab}" tabindex="0">
                    ${RENDER[activeTab]()}
                </div>
            </div>
        `;
    }

    function mountPanel(page) {
        const old = page.querySelector('#demo-panel');
        const panel = old.cloneNode(false); // fresh element, so earlier listeners do not stack
        panel.setAttribute('aria-labelledby', `demo-tab-${activeTab}`);
        panel.innerHTML = RENDER[activeTab]();
        old.replaceWith(panel);
        BIND[activeTab]?.(panel);
    }

    function selectTab(page, id, focus) {
        if (!RENDER[id]) return;
        activeTab = id;
        page.querySelectorAll('[data-demo-tab]').forEach(tab => {
            const on = tab.dataset.demoTab === id;
            tab.setAttribute('aria-selected', String(on));
            tab.tabIndex = on ? 0 : -1;
            if (on && focus) tab.focus();
        });
        mountPanel(page);
    }

    function bind(content) {
        const page = content.querySelector('.demo-page');
        if (!page) return;
        const tablist = page.querySelector('[role="tablist"]');
        tablist.addEventListener('click', event => {
            const tab = event.target.closest('[data-demo-tab]');
            if (tab) selectTab(page, tab.dataset.demoTab, false);
        });
        tablist.addEventListener('keydown', event => {
            const ids = TABS.map(t => t.id);
            const index = ids.indexOf(activeTab);
            const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: ids.length - 1 }[event.key];
            if (next === undefined) return;
            event.preventDefault();
            selectTab(page, ids[(next + ids.length) % ids.length], true);
        });
        BIND[activeTab]?.(page.querySelector('#demo-panel'));
    }

    return { render, bind, TABS, COSTS, STATED_TOTAL };
})();
