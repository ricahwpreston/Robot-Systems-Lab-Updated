
'use strict';

/* =========================================
   ROBOT SYSTEMS LAB
   Interactive Robotics Learning Platform
   ========================================= */

const STORAGE_KEY = 'robotSystemsLabProgressV2';

const lessons = {
    obstacle: [
        {
            title: 'Introduction to Obstacle Avoidance Robotics',
            description: 'Model the robot as a feedback system that senses, decides, and moves.',
            objectives: [
                'Distinguish autonomous obstacle avoidance from direct remote control.',
                'Describe the sensor–controller–actuator sequence in this project.',
                'Identify what the supplied firmware can and cannot infer about the environment.'
            ],
            introduction: 'An obstacle-avoidance robot repeatedly samples its surroundings and uses program logic to choose a movement. It does not understand an obstacle as a person would: it receives electrical sensor states and distance readings, then follows explicit rules in its firmware.',
            content: `
                <section class="lesson-topic">
                    <h3>From observation to action</h3>
                    <p>The project's automatic behavior begins with three digital IR inputs and an ultrasonic distance reading. The Arduino Uno evaluates those values. It then commands the motor-driver board, which switches the robot's four DC geared motors. The servo can turn the ultrasonic sensor while the robot compares left and right readings.</p>
                    <figure class="diagram" role="img" aria-label="Functional flow from sensors through Arduino decisions and motor driver to robot movement">
                        <div class="diagram-node">Inputs: IR states and ultrasonic echo</div>
                        <div class="diagram-arrow" aria-hidden="true">↓</div>
                        <div class="diagram-node">Arduino Uno: read, evaluate, choose</div>
                        <div class="diagram-arrow" aria-hidden="true">↓</div>
                        <div class="diagram-node">Motor driver: direction and PWM commands</div>
                        <div class="diagram-arrow" aria-hidden="true">↓</div>
                        <div class="diagram-node">Outputs: stop, forward, or turn</div>
                    </figure>
                    <p>This is a functional block diagram, not a wiring diagram. It explains the information flow without asserting a connection that is not shown in the project's code or manuals.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Autonomy and its limits</h3>
                    <p>In AUTO mode, the loop uses sensor conditions to select forward travel or an avoidance routine. In the Bluetooth extension's MANUAL mode, a person supplies joystick commands, but firmware checks still block some hazardous forward or sideward commands. Manual control therefore remains supervised; it is not a substitute for the automatic mode or for a complete safety system.</p>
                    <p>The supplied sources identify no rear-facing obstacle sensor. A reverse command can therefore move into an unseen space. Sensor readings are also limited observations: an invalid ultrasonic echo is not evidence that the route is clear.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Trace one control cycle</h3>
                    <ol>
                        <li>Read the IR inputs and the ultrasonic echo.</li>
                        <li>Represent missing echo information separately from a valid measurement.</li>
                        <li>Apply the programmed obstacle rules.</li>
                        <li>Choose a motor action and command the driver.</li>
                        <li>Repeat the cycle and observe how new readings change the next decision.</li>
                    </ol>
                    <p>For a first laboratory observation, raise the wheels clear of the surface, confirm the robot is stable, and watch the change from sensor input to motor command. Do not begin with a floor test.</p>
                </section>
            `,
            terminology: [
                ['Autonomous mobile robot', 'A robot that uses its program and sensor inputs to select movement without a continuous human joystick command.'],
                ['Feedback', 'Information returned from sensors and used to influence later control decisions.'],
                ['Controller', 'The Arduino Uno and its program, which evaluate inputs and issue output commands.'],
                ['Actuator', 'A device that converts a control command into physical action, such as a motor.']
            ],
            summary: [
                'The project follows an input → processing → output sequence.',
                'Automatic obstacle avoidance depends on explicit sensor rules, not on general object understanding.',
                'A missing echo and the absence of a rear sensor are important limits to communicate during testing.'
            ],
            references: ['Lab1_Bluetooth_Obstacle_Robot.ino', 'Lab2_SD_Card_Data_Logger.ino', 'Laboratory_Manual_1_Bluetooth_Integration.docx'],
            questions: [
                {
                    prompt: 'Which sequence best describes the robot’s automatic control flow?',
                    choices: ['Sensors → Arduino decision logic → motor driver → movement', 'Battery → CSV file → smartphone → sensor', 'Motor driver → ultrasonic echo → Arduino power input', 'Servo → Bluetooth service → battery holder'],
                    answer: 0,
                    explanation: 'The sensors provide inputs, the Arduino evaluates them, and the motor driver receives commands that produce movement.'
                },
                {
                    prompt: 'Why is it inaccurate to say the robot has complete obstacle protection?',
                    choices: ['The robot has no Arduino program', 'The supplied system has no rear-facing sensor and sensor coverage is limited', 'The motor driver stores no files', 'The servo cannot be commanded'],
                    answer: 1,
                    explanation: 'The Bluetooth manual explicitly notes the absence of a rear sensor and warns that obstacle sensing does not provide complete collision protection.'
                }
            ]
        },
        {
            title: 'Hardware Components and Their Functions',
            description: 'Relate the supplied robot hardware to sensing, processing, power, and motion.',
            objectives: [
                'Classify the documented components as inputs, controller, power, structure, or outputs.',
                'Locate the sensor and motor signals named in the supplied firmware.',
                'Separate confirmed component roles from details that are not documented.'
            ],
            introduction: 'A robot is a system of cooperating parts. The manuals and sketches identify the Arduino Uno, three IR inputs, an ultrasonic sensor, a scanning servo, motor-driver channels, four DC motors, a chassis, and a suitable battery pack. Bluetooth and microSD add communication and logging functions in later configurations.',
            content: `
                <section class="lesson-topic">
                    <h3>Component roles in the documented robot</h3>
                    <table>
                        <thead><tr><th>Subsystem</th><th>Documented part</th><th>Role in the project</th></tr></thead>
                        <tbody>
                            <tr><td>Processing</td><td>Arduino Uno</td><td>Reads inputs, applies firmware logic, and issues commands.</td></tr>
                            <tr><td>Input</td><td>Three IR sensors</td><td>Provide digital blocked/not-blocked states used by the code.</td></tr>
                            <tr><td>Input</td><td>Ultrasonic sensor</td><td>Returns an echo time used by the sketch for a distance estimate.</td></tr>
                            <tr><td>Positioning</td><td>Servo motor</td><td>Turns the sensor to commanded scan angles in the avoidance routine.</td></tr>
                            <tr><td>Drive</td><td>Motor-driver board and four DC motors</td><td>Translate direction/PWM commands into wheel motion.</td></tr>
                            <tr><td>Structure and power</td><td>Chassis and battery holder</td><td>Support hardware and provide a place for the robot's power source.</td></tr>
                            <tr><td>Extensions</td><td>JDY-16 and microSD module</td><td>Add wireless serial control and local data logging in their respective activities.</td></tr>
                        </tbody>
                    </table>
                    <p>The supplied expansion-board photograph does not establish a specific role or wiring in the firmware. Its purpose and any pin mapping must be confirmed from the exact board documentation rather than inferred from its appearance.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Signals named in the obstacle-avoidance sketch</h3>
                    <p>The code defines left IR at A1, front IR at D9, and right IR at A2. The ultrasonic trigger and echo are D12 and D13; the servo signal is D10. The motor direction signals are D2 and D4, while motor PWM outputs are D5 and D6. These are source-code assignments, not a claim that every photographed expansion board uses the same labels.</p>
                    <div class="notice warning"><strong>Known gaps:</strong> The manuals require checking the exact battery and breakout-board requirements. They do not specify the battery-holder cell count or a universal voltage. The motor-driver board identity and the expansion board's role are not established by the available source files.</div>
                </section>
                <section class="lesson-topic">
                    <h3>Build a subsystem inventory</h3>
                    <ol>
                        <li>With power off, identify each part by its label and supplied photograph.</li>
                        <li>Mark whether it senses, processes, moves, stores data, communicates, supplies power, or supports other parts.</li>
                        <li>Compare the sensor and motor signal names against the selected sketch.</li>
                        <li>Ask for the board datasheet when the image or silkscreen does not settle a voltage, pin order, or function.</li>
                    </ol>
                </section>
            `,
            terminology: [
                ['Input', 'A sensor state or measurement supplied to the controller.'],
                ['Motor driver', 'The interface that switches motor direction and drive output in response to controller signals.'],
                ['PWM command', 'A pulse-width-modulated output value requested by firmware; it is not a measured motor speed.'],
                ['Subsystem', 'A group of components performing one part of the robot’s overall function.']
            ],
            summary: [
                'The Arduino processes information; sensors provide inputs; a motor driver and motors produce movement.',
                'The source code assigns specific pins to sensors, servo, and drive signals.',
                'Photographs alone do not prove a board’s electrical role, supply requirements, or pin mapping.'
            ],
            references: ['components/arduino-uno.webp', 'components/expansion-board.webp', 'components/chassis.png', 'components/dc-motor.jpg', 'components/battery-holder.jpg', 'Laboratory_Manual_1_Bluetooth_Integration.docx', 'Lab1_Bluetooth_Obstacle_Robot.ino'],
            questions: [
                {
                    prompt: 'Which component evaluates the sensor inputs and issues movement commands?',
                    choices: ['Arduino Uno', 'Battery holder', 'Wheel', 'MicroSD card'],
                    answer: 0,
                    explanation: 'The Arduino Uno runs the sketch that reads sensor inputs and issues commands to the motor driver.'
                },
                {
                    prompt: 'What should a student do if the exact expansion-board function is not documented?',
                    choices: ['Assume it is a motor driver from its color', 'Copy a pinout from an unrelated board', 'Consult the exact board documentation and avoid inferring its wiring', 'Connect it to the battery holder to identify it'],
                    answer: 2,
                    explanation: 'The available photograph does not establish the expansion board’s purpose or pin mapping; those details need its own documentation.'
                }
            ]
        },
        {
            title: 'Obstacle Detection and Decision-Making Process',
            description: 'Follow ultrasonic and IR readings through the firmware’s avoidance rules.',
            objectives: [
                'Explain how the ultrasonic sketch converts echo duration to a distance estimate.',
                'Interpret active-low IR states and an invalid ultrasonic echo.',
                'Trace the documented conditions that start a scan or side turn.'
            ],
            introduction: 'Detection is a measurement-and-rule process. The robot’s firmware does not receive a perfect map: it reads digital IR states and an ultrasonic echo duration, marks whether an echo was valid, and compares available values with programmed conditions.',
            content: `
                <section class="lesson-topic">
                    <h3>Ultrasonic echo timing</h3>
                    <p>The sketch drives TRIG low briefly, sends a 10-microsecond trigger pulse, and measures the high pulse on ECHO using <code>pulseIn</code>. A valid duration is converted using the source expression <code>duration / 58</code> to estimate centimeters. Conceptually, a sound pulse travels to a surface and back, so the one-way distance calculation accounts for the round trip.</p>
                    <div class="formula">Sketch estimate: distance in cm = echo duration in microseconds ÷ 58</div>
                    <p>If <code>pulseIn</code> returns zero, the code sets <code>ultrasonicEchoValid</code> false and returns 300 as a placeholder. That placeholder is not a measured 300 cm reading. In manual mode, an invalid echo blocks forward motion.</p>
                </section>
                <section class="lesson-topic">
                    <h3>IR states and the avoidance branch</h3>
                    <p>The firmware reads the three IR inputs with <code>digitalRead</code> and treats LOW as blocked. In AUTO mode, a front IR block, a front distance at or below the coded 20 cm threshold, or both side IR sensors blocked enters the scan-and-avoid routine. A single blocked side selects a short turn away from that side.</p>
                    <ol>
                        <li>Read left, front, and right IR states and the front ultrasonic value.</li>
                        <li>If a trigger condition is met, stop and command the servo left, then right, then center.</li>
                        <li>Read the ultrasonic distance at the scan positions and account for blocked side IR states.</li>
                        <li>Compare left and right values; choose the branch in the sketch, then stop after the timed turn.</li>
                    </ol>
                    <figure class="diagram" role="img" aria-label="Sensor readings enter threshold and IR rules before the program selects forward, scan, or side turn">
                        <div class="diagram-node">IR states + valid distance status</div>
                        <div class="diagram-arrow" aria-hidden="true">↓</div>
                        <div class="diagram-node">Evaluate front threshold and side states</div>
                        <div class="diagram-arrow" aria-hidden="true">↓</div>
                        <div class="diagram-node">Forward, scan-and-compare, or side turn</div>
                    </figure>
                </section>
                <section class="lesson-topic">
                    <h3>Analyze a reading rather than guessing</h3>
                    <p>During a controlled test, record the three IR states, distance, echo-valid flag, servo command, and motor action. Compare the values at the same time point. This is more reliable than interpreting the returned number alone, especially when the echo-valid flag is false.</p>
                </section>
            `,
            terminology: [
                ['Echo duration', 'The measured time associated with the ultrasonic return pulse.'],
                ['Threshold', 'A programmed comparison value that selects a control branch; the supplied sketch uses 20 cm.'],
                ['Active-low input', 'An input the supplied code interprets as active when its digital reading is LOW.'],
                ['Invalid echo', 'A pulse timeout represented separately from a valid distance measurement.']
            ],
            summary: [
                'The firmware estimates centimeters from echo duration using its documented conversion.',
                'The no-echo value 300 is a placeholder paired with an invalid status, not a valid range reading.',
                'IR states and distance thresholds jointly influence the scan and avoidance branches.'
            ],
            references: ['Lab1_Bluetooth_Obstacle_Robot.ino', 'Lab2_SD_Card_Data_Logger.ino', 'lafvin_robot_with_ble_csv_download.ino'],
            questions: [
                {
                    prompt: 'In the supplied ultrasonic code, what does a returned value of 300 mean when the echo-valid flag is false?',
                    choices: ['The sensor measured exactly 300 cm', 'No echo was received and 300 is used as a placeholder', 'The robot has moved 300 cm', 'The servo has reached 300 degrees'],
                    answer: 1,
                    explanation: 'The sketch returns 300 when the pulse duration is zero and separately marks the ultrasonic echo invalid.'
                },
                {
                    prompt: 'Why does the distance estimate account for the sound pulse’s round trip?',
                    choices: ['The pulse travels from the sensor to a surface and back', 'The IR sensors send a second echo', 'The servo doubles the angle', 'The Arduino samples two separate cards'],
                    answer: 0,
                    explanation: 'The measured echo duration includes travel toward the surface and back to the receiver.'
                }
            ]
        },
        {
            title: 'Movement Control and Robot Operation',
            description: 'Connect direction and PWM commands to safe, observable robot movement.',
            objectives: [
                'Explain the separate roles of direction and PWM signals.',
                'Read the motor-channel assignments and polarity used by the firmware.',
                'Plan a staged movement test that protects people and hardware.'
            ],
            introduction: 'The Arduino does not drive the DC motors directly. The sketch sets motor-driver direction pins and PWM outputs. The driver switches the motor channels, while the actual physical response also depends on the installed wiring and motor configuration.',
            content: `
                <section class="lesson-topic">
                    <h3>Direction plus drive command</h3>
                    <p>The supplied code assigns direction pins D2 and D4 and speed/PWM pins D5 and D6. In the source’s forward function, the left direction level is HIGH and the right direction level is LOW; turning functions use different direction states. PWM values such as 110 for forward and 120 for a turn are program commands, not measured wheel speed or a universal calibration.</p>
                    <table>
                        <thead><tr><th>Code signal</th><th>Source assignment</th><th>Interpretation</th></tr></thead>
                        <tbody>
                            <tr><td>LEFT_DIR_PIN</td><td>D2</td><td>Left-channel direction state.</td></tr>
                            <tr><td>RIGHT_DIR_PIN</td><td>D4</td><td>Right-channel direction state.</td></tr>
                            <tr><td>LEFT_SPEED_PIN</td><td>D5</td><td>Left-channel PWM command.</td></tr>
                            <tr><td>RIGHT_SPEED_PIN</td><td>D6</td><td>Right-channel PWM command.</td></tr>
                        </tbody>
                    </table>
                    <p>A four-wheel chassis may mechanically pair motors on each side, but the firmware exposes left and right motor channels. The exact motor-driver board and physical response must be checked on the actual robot.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Safe bring-up sequence</h3>
                    <ol>
                        <li>Inspect the robot with power off and check for loose wires or obstructions near wheels.</li>
                        <li>Place it on a stable stand so the wheels are clear of the surface.</li>
                        <li>Use the project’s documented stop/start procedure and observe one brief command at a time.</li>
                        <li>Compare the expected direction-pin state and PWM command with observed rotation.</li>
                        <li>Power down before correcting wiring; do not assume a direction mismatch is a code defect.</li>
                        <li>Only proceed to a clear, supervised floor test after the wheel-raised checks.</li>
                    </ol>
                    <div class="notice warning">Do not power DC motors from the Arduino 5 V pin. The supplied manual requires a suitable robot motor supply and an approved power arrangement.</div>
                </section>
                <section class="lesson-topic">
                    <h3>Why timed turns need observation</h3>
                    <p>The automatic program uses timed turn commands: the source defines 450 ms for a main turn and 250 ms for a side turn. A timed command is an open-loop duration; it does not report the robot’s actual heading. Surface friction, battery condition, and motor variation can affect the result, so students should record observations rather than treat the duration as a guaranteed angle.</p>
                </section>
            `,
            terminology: [
                ['Direction pin', 'A digital output used by the motor-driver channel to select a direction state.'],
                ['PWM', 'A pulse-width-modulated command used by the sketch for a motor-driver speed input.'],
                ['Open-loop timed action', 'An action run for a programmed time without measuring the resulting position or heading.'],
                ['Motor driver', 'Power interface controlled by the Arduino; motors are not powered directly from the Uno output pins.']
            ],
            summary: [
                'Direction and PWM are separate motor-driver commands in the supplied sketch.',
                'Values in code describe requested outputs, not measured speed or guaranteed turning angle.',
                'Wheel-raised checks and power-off wiring inspection precede any floor test.'
            ],
            references: ['Lab1_Bluetooth_Obstacle_Robot.ino', 'Lab2_SD_Card_Data_Logger.ino', 'Laboratory_Manual_1_Bluetooth_Integration.docx'],
            questions: [
                {
                    prompt: 'Which pair of pins does the supplied sketch define for the motor PWM channels?',
                    choices: ['D5 and D6', 'D0 and D1', 'D12 and D13', 'A0 and A1'],
                    answer: 0,
                    explanation: 'The source defines LEFT_SPEED_PIN as D5 and RIGHT_SPEED_PIN as D6.'
                },
                {
                    prompt: 'What can be concluded from the sketch’s 450 ms turn duration?',
                    choices: ['The robot always turns through one exact angle', 'It is a timed command, not a measurement of the actual heading', 'It measures the battery voltage', 'It identifies the Bluetooth module version'],
                    answer: 1,
                    explanation: 'The firmware commands the turn for a duration; it does not measure the final heading.'
                }
            ]
        }
    ],

    bluetooth: [
        {
            title: 'Introduction to Bluetooth Communication',
            description: 'Understand how the phone, BLE link, serial module, and robot exchange commands.',
            objectives: [
                'Describe BLE’s role in the supplied robot-control system.',
                'Distinguish the wireless link from the Arduino’s serial data path.',
                'Identify the controller’s documented browser and connection requirements.'
            ],
            introduction: 'Bluetooth Low Energy provides the short-range wireless link between a phone and the JDY-16. In this project the module bridges that wireless link to the Arduino’s serial interface. The phone sends commands; it does not directly power motors or replace the robot’s firmware.',
            content: `
                <section class="lesson-topic">
                    <h3>Trace the communication path</h3>
                    <figure class="diagram" role="img" aria-label="Smartphone communicates over BLE to JDY-16, then serial data reaches the Arduino, whose firmware controls the motor driver">
                        <div class="diagram-node">Smartphone controller</div>
                        <div class="diagram-arrow" aria-hidden="true">↓ BLE link</div>
                        <div class="diagram-node">JDY-16 serial module</div>
                        <div class="diagram-arrow" aria-hidden="true">↓ UART serial</div>
                        <div class="diagram-node">Arduino Uno firmware</div>
                        <div class="diagram-arrow" aria-hidden="true">↓ motor commands</div>
                        <div class="diagram-node">Motor driver and robot</div>
                    </figure>
                    <p>The BLE connection and serial connection are different segments with different responsibilities. A successful phone connection alone does not prove that the Arduino received a valid command or that the motor wiring is correct.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Project-specific browser interface</h3>
                    <p>The supplied HTML controller uses Web Bluetooth and requests the documented JDY-16 service UUID <code>FFE0</code> and characteristic UUID <code>FFE1</code>. It is designed for a compatible Android Chrome environment and an HTTPS-hosted page; opening a local file does not provide the required secure context in typical browser configurations.</p>
                    <p>These UUIDs describe the included controller’s expected profile. The manual notes that module settings may differ if changed by AT commands. They are not a universal Bluetooth specification for every JDY-16 board.</p>
                </section>
                <section class="lesson-topic">
                    <h3>What the wireless feature adds</h3>
                    <p>Manual joystick commands provide a human-controlled mode, while the AUTO command returns control to the robot’s obstacle-avoidance logic. This makes the phone a command source and observation interface. The existing firmware remains responsible for interpreting commands, applying safety rules, and issuing motor outputs.</p>
                </section>
            `,
            terminology: [
                ['BLE', 'Bluetooth Low Energy, the short-range wireless transport used by the supplied control activity.'],
                ['Bridge', 'A device that passes information between two communication interfaces; here the JDY-16 links BLE and serial.'],
                ['GATT service', 'A named BLE grouping of characteristics; the included controller requests service FFE0.'],
                ['Characteristic', 'A BLE data endpoint; the included controller requests FFE1 for its serial-like data.']
            ],
            summary: [
                'The phone communicates with the JDY-16 over BLE; the module passes commands over serial to the Arduino.',
                'The Arduino firmware still makes control decisions and drives the motor-driver interface.',
                'The included browser page expects its documented UUIDs and a compatible secure Web Bluetooth environment.'
            ],
            references: ['Laboratory_Manual_1_Bluetooth_Integration.docx', 'lafvin_ble_controller.html', 'Lab1_Bluetooth_Obstacle_Robot.ino'],
            questions: [
                {
                    prompt: 'What role does the JDY-16 play in the project?',
                    choices: ['It bridges phone BLE communication to the Arduino serial interface', 'It supplies motor current directly', 'It stores the robot.csv file', 'It measures ultrasonic echo time'],
                    answer: 0,
                    explanation: 'The JDY-16 provides the wireless serial communication link; the Arduino continues to interpret commands.'
                },
                {
                    prompt: 'Why does the supplied phone controller need a compatible secure web context?',
                    choices: ['Its HTML file writes PWM directly to a motor', 'The browser’s Web Bluetooth API requires a supported secure context', 'The Arduino requires a spreadsheet', 'The SD card needs HTTPS to format'],
                    answer: 1,
                    explanation: 'The laboratory manual and controller note that Web Bluetooth is not generally available to a local file and calls for HTTPS hosting.'
                }
            ]
        },
        {
            title: 'Understanding the JDY-16 Bluetooth Module',
            description: 'Read the module labels and connect serial signals without guessing electrical limits.',
            objectives: [
                'Explain VCC, GND, TXD, and RXD roles.',
                'Apply the documented TX-to-RX crossing for the Arduino hardware UART.',
                'Identify voltage, logic-level, and USB-upload checks required before use.'
            ],
            introduction: 'The JDY-16 is presented in the laboratory materials as a BLE serial module. Before connecting any board, identify the labels printed on that exact module. Breakout boards can differ, so a photograph or a remembered pin order is not sufficient evidence for power or logic compatibility.',
            content: `
                <section class="lesson-topic">
                    <h3>Signal direction and the crossed serial pair</h3>
                    <table>
                        <thead><tr><th>JDY-16 label</th><th>Documented project connection</th><th>Reason</th></tr></thead>
                        <tbody>
                            <tr><td>GND</td><td>Arduino GND</td><td>Common reference for the serial signals.</td></tr>
                            <tr><td>TXD</td><td>Arduino D0 / RX</td><td>Module transmit output is received by the Arduino.</td></tr>
                            <tr><td>RXD</td><td>Arduino D1 / TX, with level protection if required</td><td>Module receive input receives Arduino transmission.</td></tr>
                            <tr><td>VCC</td><td>Only the board-approved supply</td><td>Exact breakout-board supply requirement must be verified.</td></tr>
                        </tbody>
                    </table>
                    <p>TX and RX labels describe data direction from each device’s perspective. The module’s TX connects to the controller’s RX; the module’s RX connects to the controller’s TX.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Voltage and upload constraints</h3>
                    <p>The manual warns that some breakouts accept 5 V at VCC while their RX input is 3.3 V logic. The exact board used in class is not specified here. Check its datasheet and use suitable level protection if required; do not infer tolerance from the JDY-16 name alone.</p>
                    <p>The Uno’s hardware UART is on D0/RX and D1/TX, which are shared with USB serial programming. If uploading fails, switch off and temporarily disconnect the module’s TX/RX pair as directed by the manual, then reconnect only after upload.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Power-off inspection process</h3>
                    <ol>
                        <li>Switch off the robot before changing wiring.</li>
                        <li>Read the labels on the actual JDY-16 breakout and confirm its voltage and RX logic specifications.</li>
                        <li>Connect common ground and cross TXD/RXD as shown in the table.</li>
                        <li>Obtain instructor approval for VCC and any required level protection.</li>
                        <li>Inspect for shorts before powering the robot.</li>
                    </ol>
                </section>
            `,
            terminology: [
                ['VCC', 'A board’s supply input; the correct voltage must be confirmed for the exact breakout.'],
                ['GND', 'Ground reference shared by connected modules.'],
                ['TXD / RXD', 'Transmit and receive data pins, named from the module’s perspective.'],
                ['Logic-level protection', 'Circuitry used when one device’s output voltage may exceed another input’s tolerance.']
            ],
            summary: [
                'Module TXD goes to Uno D0/RX; module RXD goes to Uno D1/TX, with protection if required.',
                'The module’s power and logic tolerances are board-specific and must be checked.',
                'D0/D1 are shared with USB serial upload on the Uno.'
            ],
            references: ['Laboratory_Manual_1_Bluetooth_Integration.docx', 'Lab1_Bluetooth_Obstacle_Robot.ino', 'components/jdy-16.webp'],
            questions: [
                {
                    prompt: 'How does the module’s TXD connect to the Uno in the documented project?',
                    choices: ['TXD to D0/RX', 'TXD to D1/TX', 'TXD to D12/TRIG', 'TXD to the motor PWM output'],
                    answer: 0,
                    explanation: 'The manual documents the crossed serial connection: JDY-16 TXD to Arduino D0/RX.'
                },
                {
                    prompt: 'What is the correct response when the JDY-16 breakout’s RX tolerance is unknown?',
                    choices: ['Assume all JDY-16 boards accept 5 V logic', 'Connect it while the robot is powered and observe', 'Check the exact board specification and use protection if required', 'Replace the UART with the SD card clock'],
                    answer: 2,
                    explanation: 'The manual explicitly warns that breakout power and RX logic requirements vary and must be verified.'
                }
            ]
        },
        {
            title: 'Serial Communication and Smartphone Interaction',
            description: 'Interpret the command frames sent by the included phone controller.',
            objectives: [
                'Explain the 9600-baud UART configuration in the supplied sketches.',
                'Interpret the newline-terminated M, A, S, H, and J,x,y command formats.',
                'Relate the controller heartbeat and joystick updates to firmware timeouts.'
            ],
            introduction: 'Serial communication transfers data one bit after another over a communication link. In this project, the Arduino sketch starts its hardware UART with <code>Serial.begin(9600)</code>. The controller sends short text lines, and the firmware waits for a newline before interpreting each command.',
            content: `
                <section class="lesson-topic">
                    <h3>Command vocabulary</h3>
                    <table>
                        <thead><tr><th>Line</th><th>Documented behavior</th></tr></thead>
                        <tbody>
                            <tr><td><code>M</code></td><td>Enter MANUAL mode and stop while waiting for joystick input.</td></tr>
                            <tr><td><code>A</code></td><td>Enter AUTO mode and run the obstacle-avoidance routine.</td></tr>
                            <tr><td><code>S</code></td><td>Stop and return to MANUAL mode.</td></tr>
                            <tr><td><code>H</code></td><td>Heartbeat packet used to refresh the connection timer.</td></tr>
                            <tr><td><code>J,x,y</code></td><td>Joystick axes, each in the documented range −100 to +100.</td></tr>
                        </tbody>
                    </table>
                    <pre class="code-sample">M\\n
J,0,80\\n
H\\n</pre>
                    <p>The line ending marks a complete command. The code ignores carriage returns and parses a line after receiving its newline. The joystick axes are values in a control message, not motor pin numbers.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Baud rate, update period, and timeout</h3>
                    <p>The supplied integrated firmware configures 9600 baud. The controller sends manual joystick updates periodically and sends heartbeat messages in AUTO mode. In the supplied HTML, the send interval is 120 ms; the firmware uses a 400 ms joystick timeout and a 650 ms connection timeout. These are source-specific values, not BLE guarantees.</p>
                    <p>If a joystick packet stops arriving, the firmware stops manual motor output. If connection traffic stops, the integrated sketch returns to its safe stopped MANUAL state. The phone and robot therefore need compatible serial framing and timely packets.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Read a packet before testing</h3>
                    <ol>
                        <li>Identify the command letter and any comma-separated values.</li>
                        <li>Confirm that a joystick line contains two numeric values in range.</li>
                        <li>Confirm the line ends with a newline.</li>
                        <li>With the wheels raised, send a stop or centered joystick command first, then test one short direction input.</li>
                    </ol>
                </section>
            `,
            terminology: [
                ['UART', 'The asynchronous serial interface used by the Uno hardware serial pins in the supplied sketch.'],
                ['Baud rate', 'The configured serial symbol rate; the project sketches use 9600.'],
                ['Command frame', 'A complete text command line terminated by a newline in this project.'],
                ['Heartbeat', 'A periodic packet that indicates the controller is still communicating.']
            ],
            summary: [
                'The supplied UART uses 9600 baud and newline-terminated ASCII commands.',
                'M, A, S, H, and J,x,y have distinct mode, stop, connection, and joystick roles.',
                'The controller’s 120 ms send interval and firmware timeouts support stopped behavior when packets cease.'
            ],
            references: ['Laboratory_Manual_1_Bluetooth_Integration.docx', 'Lab1_Bluetooth_Obstacle_Robot.ino', 'lafvin_robot_with_ble_csv_download.ino', 'lafvin_ble_controller.html'],
            questions: [
                {
                    prompt: 'What marks the end of a command line in the supplied firmware?',
                    choices: ['A newline character', 'A comma after every letter', 'A Bluetooth disconnect', 'A 20 cm sensor reading'],
                    answer: 0,
                    explanation: 'The receiver accumulates characters until it sees a newline, then parses the complete command.'
                },
                {
                    prompt: 'What is the documented purpose of command H?',
                    choices: ['Request an obstacle scan', 'Refresh the phone-to-robot connection timer', 'Write a CSV header', 'Set the servo angle'],
                    answer: 1,
                    explanation: 'H is the heartbeat packet used by the firmware to update its connection time.'
                }
            ]
        },
        {
            title: 'Integrating Bluetooth with the Robot',
            description: 'Trace manual and automatic operating modes and test their safety behavior.',
            objectives: [
                'Explain how the Bluetooth command selects MANUAL or AUTO behavior.',
                'Describe the documented sensor protections and timeout stops in MANUAL mode.',
                'Plan a staged integration test using the supplied firmware and controller.'
            ],
            introduction: 'The Bluetooth-only sketch adds a phone command path while retaining the original automatic obstacle-avoidance functions. The combined sketch also adds SD logging, but this lesson focuses on the control behavior common to the supplied Bluetooth firmware.',
            content: `
                <section class="lesson-topic">
                    <h3>Mode selection and control ownership</h3>
                    <p>At startup, the integrated firmware initializes in MANUAL mode and holds the motors stopped until communication is received. M selects MANUAL and waits for joystick input; A selects AUTO; S stops and returns to MANUAL. In AUTO, the existing IR/ultrasonic/servo routine selects movement. In MANUAL, joystick values are mixed into left and right motor commands.</p>
                    <figure class="diagram" role="img" aria-label="Phone command selects manual joystick mixing or automatic obstacle avoidance, both feed motor commands through sensor checks">
                        <div class="diagram-node">M → joystick mixing</div>
                        <div class="diagram-node">A → obstacle-avoidance logic</div>
                        <div class="diagram-arrow" aria-hidden="true">↓ either control path</div>
                        <div class="diagram-node">Safety checks → motor driver</div>
                    </figure>
                </section>
                <section class="lesson-topic">
                    <h3>Protection and known blind spots</h3>
                    <p>In MANUAL mode, the firmware stops if there is no recent joystick input. It also blocks forward travel for a front IR obstacle, a close ultrasonic reading, an invalid ultrasonic echo, or either side IR sensor. Steering toward a side reported blocked is stopped. The code has no rear sensor, so reverse movement requires direct supervision. These checks reduce risk but do not make the robot collision-proof.</p>
                    <p>The connection timeout is 650 ms and the joystick timeout is 400 ms in the supplied integrated sketch. Missing traffic therefore leads to a stopped state. AUTO also depends on the robot's defined sensors and rules; it is not an independent emergency-stop system.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Staged integration test</h3>
                    <ol>
                        <li>With power off, verify the JDY-16 pins, voltage requirements, and D0/D1 UART routing.</li>
                        <li>Upload the appropriate sketch; disconnect UART wires during upload if required.</li>
                        <li>Use the wheels-raised test stand and connect the controller through a supported HTTPS page.</li>
                        <li>Verify the robot remains stopped at startup, then check MANUAL, centered joystick, short steering, and STOP.</li>
                        <li>Test AUTO only in a clear supervised area, then test loss-of-communication behavior with wheels raised.</li>
                        <li>Power down and document observed behavior and any difference from the expected response.</li>
                    </ol>
                </section>
            `,
            terminology: [
                ['MANUAL mode', 'The mode in which joystick packets are translated into left/right motor commands.'],
                ['AUTO mode', 'The mode in which the existing obstacle-avoidance routine chooses the motor action.'],
                ['Dead zone', 'A small joystick range treated as neutral to avoid unintended movement from small values.'],
                ['Watchdog timeout', 'A time limit after which missing control traffic leads the firmware to stop the motors.']
            ],
            summary: [
                'The phone selects a mode and supplies commands; the Arduino remains responsible for motor decisions.',
                'Manual mode retains front/side checks and communication timeouts, but has no rear sensing.',
                'Use a wheel-raised, staged test before any supervised obstacle-course run.'
            ],
            references: ['Laboratory_Manual_1_Bluetooth_Integration.docx', 'Lab1_Bluetooth_Obstacle_Robot.ino', 'lafvin_robot_with_ble_csv_download.ino'],
            questions: [
                {
                    prompt: 'What does command A select in the supplied robot firmware?',
                    choices: ['Automatic obstacle-avoidance behavior', 'SD-card formatting', 'Bluetooth pairing mode only', 'A motor-driver pin assignment'],
                    answer: 0,
                    explanation: 'A sets AUTO mode, which runs the obstacle-avoidance routine.'
                },
                {
                    prompt: 'What does the integrated firmware do when the phone connection timeout expires?',
                    choices: ['Increase the motor PWM', 'Stop the motors and return to MANUAL', 'Delete robot.csv', 'Move the servo to an undocumented angle'],
                    answer: 1,
                    explanation: 'The supplied code clears joystick control, selects MANUAL, and stops when connection traffic is stale.'
                }
            ]
        }
    ],

    sdcard: [
        {
            title: 'Introduction to Data Logging',
            description: 'Use recorded observations to investigate how the robot behaved during a run.',
            objectives: [
                'Define data logging and distinguish a record from a live control action.',
                'Explain the purpose and limitations of the robot’s elapsed-time field.',
                'Describe how a CSV log supports repeatable laboratory analysis.'
            ],
            introduction: 'Data logging captures selected program values over time so a student can analyze a run after it ends. In the supplied SD-only sketch, sensor states and commanded movement details are written to a file named <code>robot.csv</code> for later inspection.',
            content: `
                <section class="lesson-topic">
                    <h3>From a control cycle to a record</h3>
                    <p>The logger records values such as IR blocked states, front distance, echo validity, servo angle commanded, left/right PWM commanded, direction-pin states, and a motor-action label. A row is an observation of program state at a point in the run; it is not a direct measurement of wheel speed or physical servo position.</p>
                    <figure class="diagram" role="img" aria-label="Robot firmware samples sensor and commanded state, formats a CSV row, and writes it to a microSD card for later analysis">
                        <div class="diagram-node">Sensor states + program commands</div>
                        <div class="diagram-arrow" aria-hidden="true">↓ select fields</div>
                        <div class="diagram-node">Timestamped CSV record</div>
                        <div class="diagram-arrow" aria-hidden="true">↓ write and flush</div>
                        <div class="diagram-node">microSD file → spreadsheet analysis</div>
                    </figure>
                </section>
                <section class="lesson-topic">
                    <h3>Time and sampling in this project</h3>
                    <p>The <code>time_ms</code> value comes from <code>millis()</code>: elapsed milliseconds since the Arduino started. It is not a calendar date or clock time. The SD-only sketch checks for a 200 ms logging interval. Since obstacle scans and timed turns use blocking delays, actual records may be less evenly spaced than a simple 5-records-per-second assumption suggests.</p>
                    <p>Use the timestamp to order observations within one run. For comparisons between runs, document each reset and test condition because the clock restarts with the controller.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Questions a log can answer</h3>
                    <ul>
                        <li>Did the front sensor state or distance change near an obstacle event?</li>
                        <li>Which motor action was commanded after the sensor values changed?</li>
                        <li>Did the row indicate a valid ultrasonic echo?</li>
                        <li>How did a later run compare with an earlier run using the same test positions?</li>
                    </ul>
                    <p>A log can support evidence-based analysis, but it does not prove that a command physically moved the robot as intended. Pair it with observation or other measurement when evaluating real movement.</p>
                </section>
            `,
            terminology: [
                ['Data logging', 'Recording selected values over time for later review.'],
                ['Record', 'One row of related fields captured by the program.'],
                ['Timestamp', 'A value used to order records; in this sketch it is elapsed milliseconds since startup.'],
                ['CSV', 'A text table format in which fields are separated by commas and records by lines.']
            ],
            summary: [
                'The logger saves selected sensor states and commanded outputs for later analysis.',
                'The project timestamp is elapsed time, not date/time of day.',
                'A data log describes program values; it does not independently measure physical motor speed.'
            ],
            references: ['Laboratory_Manual_2_SD_Card_Data_Logging.docx', 'Lab2_SD_Card_Data_Logger.ino'],
            questions: [
                {
                    prompt: 'What is the main purpose of the SD logger in this activity?',
                    choices: ['Record selected robot data so a run can be analyzed later', 'Send the joystick command over BLE', 'Measure motor speed directly', 'Replace the Arduino control loop'],
                    answer: 0,
                    explanation: 'The logger records sensor and commanded movement fields in robot.csv for later analysis.'
                },
                {
                    prompt: 'What does time_ms represent in the supplied SD sketches?',
                    choices: ['Calendar time in UTC', 'Elapsed milliseconds since Arduino startup', 'Distance in millimeters', 'Time until the SD card is full'],
                    answer: 1,
                    explanation: 'The manual identifies time_ms as elapsed time from startup, not a real-world date or clock.'
                }
            ]
        },
        {
            title: 'Understanding the MicroSD Card Module',
            description: 'Identify the documented software-SPI signals and verify module compatibility.',
            objectives: [
                'Explain the roles of CS, MOSI, MISO, and SCK.',
                'Read the exact pin mapping used by the SD-only sketch.',
                'Recognize card-format, voltage, and shared-pin safety constraints.'
            ],
            introduction: 'The SD-only activity uses software SPI through the SdFat library. Software SPI lets the logger use the assignments documented in the manual without reusing D12 and D13, which the robot’s ultrasonic sensor uses.',
            content: `
                <section class="lesson-topic">
                    <h3>SPI data and selection signals</h3>
                    <table>
                        <thead><tr><th>SD signal</th><th>Arduino pin in supplied sketch</th><th>Purpose</th></tr></thead>
                        <tbody>
                            <tr><td>CS / SS</td><td>D8</td><td>Selects the card for a transfer.</td></tr>
                            <tr><td>MOSI / DI</td><td>D11</td><td>Data from the Arduino to the card.</td></tr>
                            <tr><td>MISO / DO</td><td>A0</td><td>Data from the card to the Arduino; A0 is used as a digital software-SPI input here.</td></tr>
                            <tr><td>SCK / CLK</td><td>D7</td><td>Clock for synchronous data transfers.</td></tr>
                        </tbody>
                    </table>
                    <pre class="code-sample">const uint8_t SD_CS_PIN = 8;
const uint8_t SD_MISO_PIN = A0;
const uint8_t SD_MOSI_PIN = 11;
const uint8_t SD_SCK_PIN = 7;</pre>
                    <p>The source declares a <code>SoftSpiDriver</code> and uses SdFat v2.x. Do not substitute the usual hardware-SPI pin set without changing and retesting the sketch.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Card and module handling</h3>
                    <p>The manual calls for a compatible microSD module and a FAT16/FAT32-formatted card; the sketch uses <code>SdFat32</code>. The exact module voltage and whether it includes regulation and level shifting depend on the particular board. A bare microSD socket is a 3.3 V device and must not be connected directly to 5 V logic without suitable conversion.</p>
                    <div class="notice warning">Switch off robot power before changing wires or removing the card. Do not remove the card while data may be written. Confirm the exact board’s supply and logic requirements with its documentation.</div>
                </section>
                <section class="lesson-topic">
                    <h3>Power-off wiring checklist</h3>
                    <ol>
                        <li>Read the SD board’s CS, MOSI/DI, MISO/DO, SCK/CLK, VCC, and GND labels.</li>
                        <li>Verify module voltage conditioning and obtain approval for VCC.</li>
                        <li>Connect CS D8, MOSI D11, MISO A0, and SCK D7 as documented.</li>
                        <li>Keep the ultrasonic D12/D13 and other existing robot wiring unchanged.</li>
                        <li>Install a suitable formatted card while power is off, then check for mechanical interference.</li>
                    </ol>
                </section>
            `,
            terminology: [
                ['SPI', 'A synchronous serial interface with clock, controller-to-device data, device-to-controller data, and selection signals.'],
                ['MOSI', 'Master/Controller Out, Slave/Peripheral In: data directed to the SD card.'],
                ['MISO', 'Master/Controller In, Slave/Peripheral Out: data returned from the SD card.'],
                ['CS', 'Chip select; the signal used to select the card for communication.']
            ],
            summary: [
                'The supplied software-SPI mapping is CS D8, MOSI D11, MISO A0, and SCK D7.',
                'A0 is used as a digital input for this software-SPI assignment.',
                'Module voltage conditioning and card handling must be verified for the actual hardware.'
            ],
            references: ['Laboratory_Manual_2_SD_Card_Data_Logging.docx', 'Lab2_SD_Card_Data_Logger.ino', 'components/microsd-module.webp'],
            questions: [
                {
                    prompt: 'Which pin is used for MISO in the supplied software-SPI sketch?',
                    choices: ['A0', 'D8', 'D11', 'D13'],
                    answer: 0,
                    explanation: 'The manual and sketch assign MISO/DO to A0 for this software-SPI configuration.'
                },
                {
                    prompt: 'Why does the SD-only activity use software SPI?',
                    choices: ['To avoid reusing D12 and D13, which are assigned to the ultrasonic sensor', 'To make the card transmit Bluetooth', 'To remove the Arduino from the circuit', 'To measure motor speed'],
                    answer: 0,
                    explanation: 'The manual says this software-SPI assignment was selected to keep the existing ultrasonic D12/D13 wiring unchanged.'
                }
            ]
        },
        {
            title: 'Data Recording, Storage, and Retrieval',
            description: 'Interpret the CSV structure and distinguish commands from measured outcomes.',
            objectives: [
                'Explain how the sketch creates or appends to robot.csv.',
                'Interpret representative columns and their limitations.',
                'Retrieve and analyze the file without interrupting an active write.'
            ],
            introduction: 'The SD logger writes a header followed by comma-separated rows. A spreadsheet can display the columns, but interpretation requires understanding exactly what the program recorded and what it did not measure.',
            content: `
                <section class="lesson-topic">
                    <h3>File lifecycle and record fields</h3>
                    <p><code>startSDLogging()</code> initializes the card and opens <code>robot.csv</code> in append mode. The sketch writes a header when the file is new or empty. It does not intentionally erase previous records on a later run with the same card.</p>
                    <p>The SD-only header includes <code>time_ms</code>, <code>mode</code>, the three IR blocked states, <code>front_distance_cm</code>, <code>ultrasonic_echo_valid</code>, <code>servo_angle_commanded</code>, left/right commanded PWM, direction-pin states, and <code>motor_action</code>.</p>
                    <table>
                        <thead><tr><th>Field</th><th>Interpretation</th><th>Important limit</th></tr></thead>
                        <tbody>
                            <tr><td>front_distance_cm</td><td>Distance estimate, or the 300 placeholder when there is no echo.</td><td>Check ultrasonic_echo_valid.</td></tr>
                            <tr><td>servo_angle_commanded</td><td>Last angle requested by the program.</td><td>Not a measured shaft position.</td></tr>
                            <tr><td>left_pwm_commanded / right_pwm_commanded</td><td>Programmed output values for the motor channels.</td><td>Not measured motor speed.</td></tr>
                            <tr><td>motor_action</td><td>Program label such as STOP, FORWARD, or TURN_LEFT.</td><td>Not an independent confirmation of physical motion.</td></tr>
                        </tbody>
                    </table>
                </section>
                <section class="lesson-topic">
                    <h3>Write, flush, and retrieve safely</h3>
                    <p>The sketch checks its logging interval, writes fields in header order, ends the row, and calls <code>flush()</code>. Flushing requests that buffered data be written to the card; it does not make unsafe card removal acceptable.</p>
                    <ol>
                        <li>Run the robot under supervision long enough to create records.</li>
                        <li>Stop and switch off the robot before removing the card.</li>
                        <li>Open robot.csv in a spreadsheet; choose comma as the delimiter if import requires it.</li>
                        <li>Compare sensor fields and motor_action at a common timestamp.</li>
                        <li>Plot front_distance_cm against time_ms only after accounting for invalid echo rows.</li>
                    </ol>
                </section>
                <section class="lesson-topic">
                    <h3>Questions that lead to useful analysis</h3>
                    <ul>
                        <li>Does a blocked sensor state coincide with a stop or turn command?</li>
                        <li>How do the commanded servo angles change during a scan?</li>
                        <li>Do later runs append rows while preserving the original header and data?</li>
                    </ul>
                    <p>When the recorded action and observed motion disagree, investigate wiring, power, and the motor-driver configuration rather than treating the CSV label as proof.</p>
                </section>
            `,
            terminology: [
                ['Append mode', 'Opening a file so new records are added after existing content.'],
                ['Header row', 'The first CSV row naming the columns in subsequent records.'],
                ['Flush', 'A request to write buffered file data to the storage medium.'],
                ['Commanded value', 'A value requested by software, not necessarily a physical measurement.']
            ],
            summary: [
                'robot.csv is opened in append mode and receives a header when it is new or empty.',
                'Sensor validity flags and commanded-versus-measured distinctions matter when interpreting rows.',
                'Power off before card removal; use the CSV to support, not replace, observation.'
            ],
            references: ['Laboratory_Manual_2_SD_Card_Data_Logging.docx', 'Lab2_SD_Card_Data_Logger.ino'],
            questions: [
                {
                    prompt: 'What does servo_angle_commanded represent in the CSV?',
                    choices: ['The angle last requested by the program', 'A sensor measurement of the physical shaft', 'The robot’s heading in degrees', 'The SD card clock frequency'],
                    answer: 0,
                    explanation: 'The manual explicitly says this column records the angle commanded in software, not a measured servo position.'
                },
                {
                    prompt: 'How does the supplied logger handle a later run using the same card?',
                    choices: ['It appends new rows to robot.csv', 'It always formats the card', 'It deletes the original header', 'It renames the file to a Bluetooth service UUID'],
                    answer: 0,
                    explanation: 'The file is opened with append behavior, so new records are added while earlier rows remain.'
                }
            ]
        },
        {
            title: 'Integrating SD Card Logging with the Robot',
            description: 'Relate the autonomous loop to periodic logging and verify a run from its CSV evidence.',
            objectives: [
                'Trace when the SD-only sketch initializes the card and writes records.',
                'Explain how logging coexists with the existing obstacle-avoidance behavior.',
                'Use a controlled test and CSV inspection to check integration.'
            ],
            introduction: 'The SD-only sketch keeps the robot’s automatic sensor and motor logic and adds a file logger. It uses software SPI so the SD signals do not replace the documented ultrasonic D12/D13 assignments.',
            content: `
                <section class="lesson-topic">
                    <h3>Where logging fits in the program</h3>
                    <p>During setup, the sketch configures the existing sensors, servo, and motor outputs, then calls <code>startSDLogging()</code>. In the loop, it reads sensors and executes the original avoidance behavior before calling the logger. The logger writes when the configured 200 ms interval is due. Scans and timed turns include blocking delays, so the real record spacing can vary.</p>
                    <p>The source deliberately allows obstacle avoidance to continue if SD initialization fails. This preserves basic movement but means the absence of a file is not proof that the robot loop failed.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Integration verification matrix</h3>
                    <table>
                        <thead><tr><th>Check</th><th>Evidence to look for</th></tr></thead>
                        <tbody>
                            <tr><td>Card initialization</td><td>Robot still runs; later inspect whether robot.csv was created.</td></tr>
                            <tr><td>Clear path</td><td>Rows show sensor states and the FORWARD action label.</td></tr>
                            <tr><td>Obstacle event</td><td>IR or distance fields change near stop/turn labels.</td></tr>
                            <tr><td>Servo scan</td><td>Commanded angle field records the program’s scan positions.</td></tr>
                            <tr><td>Repeated run</td><td>New rows follow earlier data rather than replacing it.</td></tr>
                        </tbody>
                    </table>
                </section>
                <section class="lesson-topic">
                    <h3>Classroom procedure</h3>
                    <ol>
                        <li>Power down, check the exact SD module and card compatibility, and verify the documented software-SPI wiring.</li>
                        <li>Install SdFat v2.x and upload the SD-only sketch to the Uno.</li>
                        <li>Raise the wheels for an initial check, then place the robot in a clear, supervised area.</li>
                        <li>Run a short obstacle scenario and switch power off before removing the card.</li>
                        <li>Check headings, row consistency, event timing, and any invalid ultrasonic readings.</li>
                        <li>Report mismatches between the CSV and observed motion as an investigation, not as confirmed sensor truth.</li>
                    </ol>
                    <div class="notice warning">This SD-only sketch does not include Bluetooth. Do not describe the separate SD-only firmware as supporting phone CSV download.</div>
                </section>
            `,
            terminology: [
                ['Initialization', 'The setup process that prepares the SD file system and opens the log.'],
                ['Software SPI', 'SPI signals implemented by the library using the explicitly assigned software pins.'],
                ['Integration test', 'A test of whether interacting subsystems work together in the intended system.'],
                ['Evidence', 'Observed behavior or recorded data used to support a conclusion.']
            ],
            summary: [
                'The SD-only program adds logging while retaining autonomous obstacle-avoidance logic.',
                'The logger can fail to initialize while the robot still runs, so check both motion and file output.',
                'The CSV is verified after a safe power-off and card retrieval.'
            ],
            references: ['Laboratory_Manual_2_SD_Card_Data_Logging.docx', 'Lab2_SD_Card_Data_Logger.ino'],
            questions: [
                {
                    prompt: 'What should be checked when obstacle avoidance works but robot.csv is missing?',
                    choices: ['SD initialization, card, wiring, library, and file-open behavior', 'Only the servo color', 'The phone’s BLE joystick UUID', 'The public landing-page font'],
                    answer: 0,
                    explanation: 'The SD-only source allows the robot to continue operating if card initialization fails, so storage needs its own checks.'
                },
                {
                    prompt: 'Does the supplied SD-only sketch support Bluetooth CSV download?',
                    choices: ['Yes, through command D', 'No; the separate SD-only sketch contains no Bluetooth code', 'Yes, but only when the robot is off', 'Only if the file is renamed to robot.ble'],
                    answer: 1,
                    explanation: 'The SD manual and sketch explicitly describe this version as SD-only; Bluetooth download belongs to the integrated firmware.'
                }
            ]
        }
    ],

    integrated: [
        {
            title: 'Understanding the Complete Robot Architecture',
            description: 'Map sensing, control, motion, wireless command input, and data logging as one system.',
            objectives: [
                'Draw the functional input → processing → output path of the robot.',
                'Explain how Bluetooth and SD logging complement rather than replace motion control.',
                'Distinguish an architecture diagram from a verified wiring diagram.'
            ],
            introduction: 'The integrated firmware combines three functions: automatic obstacle avoidance, smartphone command handling, and SD-card logging. Thinking in subsystems helps students reason about a failure without confusing data flow, electrical wiring, and physical motion.',
            content: `
                <section class="lesson-topic">
                    <h3>Three functional paths</h3>
                    <figure class="diagram" role="img" aria-label="Robot architecture: sensors feed Arduino control, motor driver and motors provide output; Bluetooth supplies commands and SD card records data">
                        <div class="diagram-node">IR + ultrasonic sensors</div>
                        <div class="diagram-arrow" aria-hidden="true">↓ input</div>
                        <div class="diagram-node">Arduino Uno: sensor rules + mode + motor commands</div>
                        <div class="diagram-arrow" aria-hidden="true">↓ output</div>
                        <div class="diagram-node">Motor driver → four DC motors</div>
                        <div class="diagram-node">Phone ↔ JDY-16 ↔ Arduino: command/heartbeat path</div>
                        <div class="diagram-node">Arduino → microSD: robot.csv data path</div>
                    </figure>
                    <p>The phone path adds mode and joystick commands. The SD path records selected sensor and commanded state fields. Neither extension replaces the central Arduino control logic or the motor-driver output path.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Keep diagrams honest</h3>
                    <p>This diagram describes function, not wiring. The supplied code establishes the assignments used in its sketches, but the exact expansion-board identity, battery configuration, and breakout-board voltage conditioning are not fully specified. Do not use a functional block arrow as evidence of a physical pin-to-pin connection.</p>
                    <p>The integrated source project notes that the combined hardware path has not been physically verified. Treat firmware behavior as source evidence and perform an instructor-supervised hardware check before classroom deployment.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Use subsystem boundaries to troubleshoot</h3>
                    <ol>
                        <li>Check sensor evidence: IR states, distance, and echo-valid status.</li>
                        <li>Check controller behavior: mode, parsed command, and selected action.</li>
                        <li>Check output evidence: commanded direction/PWM and observed motor response.</li>
                        <li>Check communication separately from storage: BLE connection/commands versus SD initialization/file records.</li>
                    </ol>
                </section>
            `,
            terminology: [
                ['System architecture', 'A model of the system’s parts and functional relationships.'],
                ['Input → processing → output', 'A high-level sequence from sensed information through controller logic to physical action.'],
                ['Data path', 'The route information follows through components, such as phone-to-Arduino commands or Arduino-to-card records.'],
                ['Functional diagram', 'A description of roles and flow; it does not by itself specify electrical wiring.']
            ],
            summary: [
                'Sensors, control logic, and motor outputs form the core behavior path.',
                'Bluetooth supplies commands; SD stores records; both complement the core controller.',
                'The available sources do not certify every physical connection or the combined hardware build.'
            ],
            references: ['lafvin_robot_with_ble_csv_download.ino', 'Laboratory_Manual_1_Bluetooth_Integration.docx', 'Laboratory_Manual_2_SD_Card_Data_Logging.docx', 'README.md'],
            questions: [
                {
                    prompt: 'Which statement best describes the relationship between Bluetooth and the motor-control path?',
                    choices: ['Bluetooth carries phone commands to the Arduino, which still makes control decisions', 'Bluetooth directly powers the four motors', 'The SD card replaces the motor driver', 'The phone measures the robot’s wheel speed through the motor pins'],
                    answer: 0,
                    explanation: 'The JDY-16 transports commands; the Arduino firmware interprets them and issues motor-driver outputs.'
                },
                {
                    prompt: 'What does a functional architecture diagram establish?',
                    choices: ['The role and information flow of subsystems, not necessarily their physical pin wiring', 'The exact voltage of every breakout board', 'That the integrated robot passed a physical test', 'The battery holder’s cell count'],
                    answer: 0,
                    explanation: 'The diagram is a functional model. Physical wiring and hardware specifications require their own source evidence.'
                }
            ]
        },
        {
            title: 'Integrating Obstacle Avoidance and Bluetooth',
            description: 'Trace how manual commands coexist with automatic sensing and protective stops.',
            objectives: [
                'Compare AUTO and MANUAL behavior in the combined sketch.',
                'Explain how the sensor checks constrain forward and sideward joystick commands.',
                'Identify communication loss behavior and the unsensed reverse direction.'
            ],
            introduction: 'The integrated firmware preserves the original automatic obstacle-avoidance routine and adds a Bluetooth-selected manual mode. The mode command changes which decision source is active, but the Arduino continues to read sensors and enforce the documented manual checks.',
            content: `
                <section class="lesson-topic">
                    <h3>Two control modes, one motor output path</h3>
                    <table>
                        <thead><tr><th>Mode</th><th>Decision source</th><th>Motor command path</th></tr></thead>
                        <tbody>
                            <tr><td>AUTO</td><td>IR/ultrasonic conditions and the obstacle scan routine.</td><td>Existing forward, stop, and timed-turn functions.</td></tr>
                            <tr><td>MANUAL</td><td>Phone joystick values, with dead-zone and sensor checks.</td><td>Mixed left/right values are scaled and sent to the same drive channels.</td></tr>
                            <tr><td>Stop / timeout</td><td>S command, absent joystick update, or stale connection traffic.</td><td>Motor PWM is set to zero by stopRobot().</td></tr>
                        </tbody>
                    </table>
                    <p>The integrated firmware starts stopped in MANUAL. The command A selects automatic behavior; M selects manual and waits for a joystick. A stale connection beyond the source’s 650 ms timeout stops the motors. The joystick timeout is 400 ms.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Sensor protections are directional</h3>
                    <p>Manual forward travel is stopped for a front IR block, a distance at or below the coded 20 cm threshold, an invalid ultrasonic echo, or either side IR state. The code also stops a left or right steering request when that side’s IR input is blocked. It does not have a rear-facing sensor. Reverse remains a visually supervised action.</p>
                    <p>These are program checks on available signals, not a promise that every obstacle will be detected. Wheel-raised testing is required before a moving test.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Integration test by mode</h3>
                    <ol>
                        <li>Confirm the Bluetooth serial link and safe stopped startup.</li>
                        <li>In MANUAL, test neutral, a short direction input, release-to-stop, and the explicit STOP control with wheels raised.</li>
                        <li>Use a soft front obstruction to verify that a forward joystick command is blocked.</li>
                        <li>Select AUTO in a clear, supervised test area and observe the original sensor routine.</li>
                        <li>Interrupt phone traffic with wheels raised and verify the stop behavior.</li>
                        <li>Record which behavior is observed; do not infer an untested rear-safety function.</li>
                    </ol>
                </section>
            `,
            terminology: [
                ['Mode', 'A selected operating behavior that determines which control logic supplies commands.'],
                ['Joystick mixing', 'Combining two joystick axes into left and right motor-channel values in the firmware.'],
                ['Dead zone', 'The source-defined neutral range that suppresses small joystick values.'],
                ['Timeout', 'A maximum wait for control traffic before the firmware stops motion.']
            ],
            summary: [
                'AUTO uses the obstacle routine; MANUAL uses joystick values with sensor and timeout checks.',
                'The source checks front/side conditions but has no rear-facing obstacle sensor.',
                'Test mode changes and failsafe behavior with the wheels raised before floor operation.'
            ],
            references: ['lafvin_robot_with_ble_csv_download.ino', 'Laboratory_Manual_1_Bluetooth_Integration.docx', 'lafvin_ble_controller.html'],
            questions: [
                {
                    prompt: 'What happens when integrated firmware receives command A?',
                    choices: ['It selects AUTO obstacle-avoidance behavior', 'It opens robot.csv in a spreadsheet', 'It permanently disables the IR sensors', 'It changes the JDY-16 supply voltage'],
                    answer: 0,
                    explanation: 'Command A changes the mode to AUTO so the original obstacle-avoidance routine runs.'
                },
                {
                    prompt: 'Which movement lacks a rear sensor check in the documented robot?',
                    choices: ['Reverse movement', 'Forward movement', 'The ultrasonic scan', 'CSV append'],
                    answer: 0,
                    explanation: 'The manual explicitly warns that the robot has no rear-facing sensor and that reverse must be supervised.'
                }
            ]
        },
        {
            title: 'Integrating SD Card Data Logging',
            description: 'Examine how the combined sketch records sensor, mode, motor, and joystick state.',
            objectives: [
                'Compare the SD-only record with the integrated sketch’s expanded CSV fields.',
                'Trace the log initialization and periodic write behavior.',
                'Explain the integrated Bluetooth CSV download sequence and its requirements.'
            ],
            introduction: 'The integrated sketch combines the SD logger with Bluetooth control. It retains software SPI so the SD module does not reuse the ultrasonic D12/D13 assignments, and extends the CSV with mode, Bluetooth connection status, and joystick axes.',
            content: `
                <section class="lesson-topic">
                    <h3>Integrated record schema</h3>
                    <p>The combined sketch writes a header containing elapsed time, mode, three IR states, front distance and echo validity, commanded servo angle, left/right PWM commands, direction levels, motor action, Bluetooth connection status, and joystick X/Y. These are the fields written by the firmware; they do not include a calendar timestamp or direct motor-speed measurement.</p>
                    <pre class="code-sample">time_ms,mode,left_ir_blocked,front_ir_blocked,right_ir_blocked,front_distance_cm,ultrasonic_echo_valid,servo_angle_commanded,left_pwm_commanded,right_pwm_commanded,left_dir_pin,right_dir_pin,motor_action,bluetooth_connected,joystick_x,joystick_y</pre>
                    <p>The first line is a schema for later rows. In MANUAL mode, the added mode and joystick fields help relate received control values to the program’s commanded output; in AUTO, they help identify autonomous runs.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Logging and file lifecycle</h3>
                    <p>Setup attempts SD initialization and opens <code>robot.csv</code> for append. The sketch logs when its 200 ms interval is due and flushes rows. Obstacle scans and other blocking actions can lengthen the gap between records. If the SD card is unavailable, the source intends robot control to remain available, so confirm the file separately.</p>
                    <p>On a D command, the integrated firmware stops the robot, closes the log, sends a byte-count marker followed by the CSV bytes and an end marker over serial, then reopens the file for append. The supplied webpage’s CSV download additionally needs the BLE characteristic to support notifications or indications. This transfer path is distinct from the SD-only activity.</p>
                </section>
                <section class="lesson-topic">
                    <h3>Analyze command evidence carefully</h3>
                    <ol>
                        <li>Switch off before removing the card for direct retrieval.</li>
                        <li>Confirm the CSV header and count fields in each row.</li>
                        <li>Compare mode and joystick values with motor_action and commanded PWM.</li>
                        <li>Compare sensor states and ultrasonic validity with the selected mode and action.</li>
                        <li>Label conclusions as commanded behavior unless independent physical observations support them.</li>
                    </ol>
                    <div class="notice warning">The README and source materials note that the combined hardware path has not been physically verified. Treat the integrated firmware as a project reference and validate the actual assembly with an instructor.</div>
                </section>
            `,
            terminology: [
                ['Schema', 'The column names and expected fields that describe a structured data file.'],
                ['Append', 'Add new records after existing records instead of replacing them.'],
                ['Transfer marker', 'A framing line such as #CSV_BEGIN or #CSV_END used by the firmware during CSV download.'],
                ['Notification', 'A BLE characteristic update from the device to the browser, required by the supplied CSV receive feature.']
            ],
            summary: [
                'The integrated CSV adds operating mode, Bluetooth status, and joystick axes to robot state fields.',
                'The D command stops motion while the firmware transfers the current log and then reopens it.',
                'Commanded values are not physical measurements, and the integrated hardware still requires validation.'
            ],
            references: ['lafvin_robot_with_ble_csv_download.ino', 'Laboratory_Manual_2_SD_Card_Data_Logging.docx', 'lafvin_ble_controller.html', 'README.md'],
            questions: [
                {
                    prompt: 'Which fields are added by the integrated CSV compared with the SD-only logger?',
                    choices: ['Bluetooth connection status and joystick X/Y', 'Calendar date and GPS coordinates', 'Measured wheel RPM and heading', 'Phone battery temperature'],
                    answer: 0,
                    explanation: 'The integrated header adds bluetooth_connected, joystick_x, and joystick_y along with mode information.'
                },
                {
                    prompt: 'What does the integrated firmware do during a D CSV-download request?',
                    choices: ['Stops the robot, transfers the file, then reopens it for append', 'Formats the card and deletes the log', 'Moves backward until an echo arrives', 'Changes the controller baud rate'],
                    answer: 0,
                    explanation: 'The source stops movement, closes the log, transfers the file with framing markers, and reopens it in append mode.'
                }
            ]
        },
        {
            title: 'Complete System Operation and Testing',
            description: 'Plan a safe end-to-end test and evaluate evidence across all robot subsystems.',
            objectives: [
                'Sequence setup and tests so wiring, motion, communication, and storage are checked separately.',
                'Use observable evidence to assess each subsystem and the combined behavior.',
                'Document limitations and distinguish software inspection from physical verification.'
            ],
            introduction: 'A complete test does not begin by running every feature at once. A staged procedure isolates wiring and configuration risks, then combines sensing, control, communication, and logging after each part has been checked.',
            content: `
                <section class="lesson-topic">
                    <h3>Staged system test plan</h3>
                    <ol>
                        <li><strong>Inspect:</strong> power off, read the exact board labels, verify approved supplies and module logic requirements, and check mechanical clearance.</li>
                        <li><strong>Upload:</strong> install the required libraries, select the Uno and correct port, and disconnect the JDY-16 UART pair during upload if necessary.</li>
                        <li><strong>Check inputs:</strong> with the robot secured, observe IR states and ultrasonic validity without assuming a no-echo placeholder is a real measurement.</li>
                        <li><strong>Check motion:</strong> wheels raised, verify stop, short movement, and direction behavior before any floor test.</li>
                        <li><strong>Check Bluetooth:</strong> connect the hosted controller, test MANUAL and AUTO, STOP, release-to-stop, and connection timeout.</li>
                        <li><strong>Check logging:</strong> confirm SD initialization, create rows, inspect the CSV header and records, and power off before card removal.</li>
                        <li><strong>Combine:</strong> run a short, clear, supervised scenario and compare observations with sensor and CSV evidence.</li>
                    </ol>
                </section>
                <section class="lesson-topic">
                    <h3>Evidence and pass criteria</h3>
                    <table>
                        <thead><tr><th>Subsystem</th><th>Evidence to retain</th><th>Do not claim</th></tr></thead>
                        <tbody>
                            <tr><td>Input</td><td>IR states, distance and echo-valid flag.</td><td>That all obstacles are detected.</td></tr>
                            <tr><td>Control</td><td>Selected mode, command, and motor_action label.</td><td>That a software label proves physical motion.</td></tr>
                            <tr><td>Communication</td><td>Connection status, command response, and timeout test.</td><td>That all JDY-16 board revisions have identical electrical limits.</td></tr>
                            <tr><td>Storage</td><td>CSV header, rows, append behavior, and retrieval.</td><td>That the SD-only sketch supports BLE download.</td></tr>
                            <tr><td>Integration</td><td>Observed behavior compared with the combined firmware and log.</td><td>That the combined build is physically certified by source code alone.</td></tr>
                        </tbody>
                    </table>
                </section>
                <section class="lesson-topic">
                    <h3>Report missing information explicitly</h3>
                    <p>The available project does not identify the exact expansion-board role, battery-holder cell count or battery voltage, or universal JDY-16 and SD-breakout power/logic tolerances. The integrated firmware is supplied, but the project notes that the combined hardware path has not been physically verified. Record these as limitations and request board documentation or instructor confirmation before assembly.</p>
                </section>
            `,
            terminology: [
                ['Verification', 'Collecting evidence that a specific requirement or behavior was met.'],
                ['Validation', 'Checking that the system performs the intended task in its actual use context.'],
                ['Test evidence', 'Observed or recorded information that supports a conclusion about a test.'],
                ['Limitation', 'A known boundary of the available source, hardware, measurement, or testing.']
            ],
            summary: [
                'Test subsystems one at a time before combining their behavior.',
                'Use both observed movement and recorded program values, keeping their meanings distinct.',
                'Document unresolved board requirements and the unverified status of the combined hardware.'
            ],
            references: ['Laboratory_Manual_1_Bluetooth_Integration.docx', 'Laboratory_Manual_2_SD_Card_Data_Logging.docx', 'Lab1_Bluetooth_Obstacle_Robot.ino', 'Lab2_SD_Card_Data_Logger.ino', 'lafvin_robot_with_ble_csv_download.ino', 'README.md'],
            questions: [
                {
                    prompt: 'Which is the safest order for a first integrated robot test?',
                    choices: ['Inspect with power off, check inputs, test motion with wheels raised, then test combined behavior', 'Run the robot at full speed before checking wiring', 'Remove the SD card while the logger is writing', 'Begin with reverse movement because there is no rear sensor'],
                    answer: 0,
                    explanation: 'The manuals prescribe power-off wiring checks and wheels-raised motor tests before supervised floor testing.'
                },
                {
                    prompt: 'What is a valid conclusion about the integrated firmware from the available sources?',
                    choices: ['It documents combined code behavior, but the combined physical hardware is not verified', 'It proves every breakout-board voltage is compatible', 'It proves all obstacles will be detected', 'It measures actual wheel RPM in the CSV'],
                    answer: 0,
                    explanation: 'The source project provides integrated firmware but notes that the combined hardware path has not been physically verified.'
                }
            ]
        }
    ]
};

/* =========================================
   APPLICATION STATE
   ========================================= */

const pathDetails = {
    obstacle: {
        title: 'Obstacle Avoidance Robot',
        description: 'Understand sensors, motor control, and autonomous movement.'
    },
    bluetooth: {
        title: 'Bluetooth Integration',
        description: 'Learn wireless communication and smartphone control.'
    },
    sdcard: {
        title: 'SD Card Data Logging',
        description: 'Learn how the robot records and stores useful information.'
    },
    integrated: {
        title: 'Integrated Robot System',
        description: 'Study how sensing, wireless control, movement, and data logging work as one system.'
    }
};

const pathVisuals = {
    obstacle: { image: 'assets/learning paths/path-01-obstacle-avoidance-card.webp' },
    bluetooth: { image: 'assets/learning paths/path-02-bluetooth-integration.webp' },
    sdcard: { image: 'assets/learning paths/path-03-sd-card-logging.webp' },
    integrated: { image: 'assets/learning paths/path-04-integrated-system.jpg' }
};

const labResources = [
    {
        kind: 'Manual',
        title: 'Lab manual 1: Bluetooth integration',
        description: 'Circuit connections, assembly, phone controller setup, testing, troubleshooting and the assessment rubric.',
        file: 'Laboratory_Manual_1_Bluetooth_Integration.docx',
        action: 'Download .docx',
        download: true
    },
    {
        kind: 'Firmware',
        title: 'Bluetooth laboratory',
        description: 'Bluetooth obstacle-avoidance firmware used in Lab 1.',
        file: 'Lab1_Bluetooth_Obstacle_Robot.ino',
        action: 'Download sketch',
        download: true
    },
    {
        kind: 'Manual',
        title: 'Lab manual 2: SD card data logging',
        description: 'SD module wiring, software preparation, the CSV column guide, a data analysis activity and the rubric.',
        file: 'Laboratory_Manual_2_SD_Card_Data_Logging.docx',
        action: 'Download .docx',
        download: true
    },
    {
        kind: 'Firmware',
        title: 'SD Card laboratory',
        description: 'SD card data logger firmware used in Lab 2.',
        file: 'Lab2_SD_Card_Data_Logger.ino',
        action: 'Download sketch',
        download: true
    },
    {
        kind: 'Firmware · Current',
        title: 'Integrated robot firmware — BLE, CSV and file management',
        description: 'Latest supplied Arduino sketch: manual, auto and game modes, SD logging, BLE CSV download, selected-record deletion and whole-file deletion. Use with the current phone controller.',
        file: 'lafvin_robot_with_ble_csv_download.ino',
        action: 'Download current sketch',
        download: true
    },
    {
        kind: 'Phone app · Current',
        title: 'BLE joystick and CSV manager',
        description: 'Launch the updated controller with manual/auto/game modes, CSV preview, download, selected-record deletion and whole-file deletion. Requires HTTPS, a supported Web Bluetooth browser and matching firmware.',
        file: 'lafvin_ble_controller.html',
        action: 'Open joystick',
        download: false
    },
    {
        kind: 'Phone app · Download',
        title: 'Download the BLE joystick HTML',
        description: 'Save a local copy of the current phone controller. For Bluetooth operation, host it on an HTTPS website before connecting.',
        file: 'lafvin_ble_controller.html',
        action: 'Download HTML',
        download: true
    }
];


function createEmptyProgress() {
    const progress = { quizScores: {} };
    Object.keys(lessons).forEach(pathId => {
        progress[pathId] = [];
    });
    return progress;
}

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeQuizScores(savedScores) {
    if (savedScores === undefined) return {};
    if (!isRecord(savedScores)) {
        console.error('Robot Systems Lab ignored invalid saved quiz-score data.');
        return {};
    }

    const scores = {};
    Object.entries(lessons).forEach(([pathId, path]) => {
        const pathScores = savedScores[pathId];
        if (pathScores === undefined) return;
        if (!isRecord(pathScores)) {
            console.error(`Robot Systems Lab ignored invalid quiz scores for "${pathId}".`);
            return;
        }

        const validPathScores = {};
        Object.entries(pathScores).forEach(([lessonId, record]) => {
            const lessonIndex = Number(lessonId);
            if (!Number.isInteger(lessonIndex) || lessonIndex < 0 || lessonIndex >= path.length || !isRecord(record)) {
                console.error(`Robot Systems Lab ignored an invalid quiz-score record for "${pathId}".`);
                return;
            }

            const total = path[lessonIndex].questions.length;
            const attempts = Number(record.attempts);
            const bestScore = Number(record.bestScore);
            const lastScore = Number(record.lastScore);
            if (record.total !== total
                || !Number.isInteger(attempts) || attempts < 1
                || !Number.isInteger(bestScore) || bestScore < 0 || bestScore > total
                || !Number.isInteger(lastScore) || lastScore < 0 || lastScore > total) {
                console.error(`Robot Systems Lab ignored malformed quiz-score values for "${pathId}" lesson ${lessonIndex + 1}.`);
                return;
            }

            validPathScores[lessonIndex] = { attempts, bestScore, lastScore, total };
        });

        if (Object.keys(validPathScores).length) scores[pathId] = validPathScores;
    });

    return scores;
}

function loadProgress() {
    let savedValue;
    try {
        savedValue = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        console.error('Robot Systems Lab could not read saved progress.', error);
        return createEmptyProgress();
    }

    if (savedValue === null) return createEmptyProgress();

    let saved;
    try {
        saved = JSON.parse(savedValue);
    } catch (error) {
        console.error('Robot Systems Lab could not parse saved progress.', error);
        return createEmptyProgress();
    }

    if (!isRecord(saved)) {
        console.error('Robot Systems Lab ignored saved progress with an invalid structure.');
        return createEmptyProgress();
    }

    const progress = { ...saved };
    Object.entries(lessons).forEach(([pathId, path]) => {
        const completed = saved[pathId];
        if (completed === undefined) {
            progress[pathId] = [];
            return;
        }
        if (!Array.isArray(completed)) {
            console.error(`Robot Systems Lab ignored invalid completion data for "${pathId}".`);
            progress[pathId] = [];
            return;
        }

        const validLessons = completed.filter(index =>
            Number.isInteger(index) && index >= 0 && index < path.length
        );
        progress[pathId] = [...new Set(validLessons)];
        if (progress[pathId].length !== completed.length) {
            console.error(`Robot Systems Lab removed duplicate or invalid completion entries for "${pathId}".`);
        }
    });
    progress.quizScores = normalizeQuizScores(saved.quizScores);
    return progress;
}

const state = {
    progress: loadProgress(),
    activePath: 'obstacle',
    activeLesson: 0,
    page: 'home',
    quizSession: {
        pathId: null,
        lessonIndex: -1,
        answers: {},
        submitted: false,
        score: null,
        saved: false
    }
};

function saveProgress() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
        return true;
    } catch (error) {
        console.error('Robot Systems Lab could not save progress.', error);
        return false;
    }
}

function getProgress(pathId) {
    const completed = state.progress[pathId] || [];
    return completed.length;
}

function getPercentage(pathId) {
    const path = lessons[pathId];
    return path ? Math.round(getProgress(pathId) / path.length * 100) : 0;
}

function getPathLessonCount(pathId) {
    return lessons[pathId]?.length || 0;
}

function getQuizRecord(pathId, lessonIndex) {
    return state.progress.quizScores?.[pathId]?.[lessonIndex] || null;
}

function getQuizSession(pathId, lessonIndex) {
    if (state.quizSession.pathId !== pathId || state.quizSession.lessonIndex !== lessonIndex) {
        state.quizSession = {
            pathId,
            lessonIndex,
            answers: {},
            submitted: false,
            score: null,
            saved: false
        };
    }
    return state.quizSession;
}

const pathOrder = Object.keys(pathDetails);

function getPathNumber(pathId) {
    return pathOrder.indexOf(pathId) + 1;
}

function getTotals() {
    const completed = pathOrder.reduce((sum, id) => sum + getProgress(id), 0);
    const total = pathOrder.reduce((sum, id) => sum + getPathLessonCount(id), 0);
    return { completed, total };
}

function getNextLessonIndex(pathId) {
    const done = state.progress[pathId] || [];
    return lessons[pathId].findIndex((lesson, index) => !done.includes(index));
}

function getContinueTarget() {
    for (const pathId of pathOrder) {
        const lessonIndex = getNextLessonIndex(pathId);
        if (lessonIndex >= 0) return { pathId, lessonIndex };
    }
    return null;
}

function renderPathVisual(pathId) {
    const visual = pathVisuals[pathId];
    return `
        <figure class="path-visual">
            <img src="${visual.image}" alt="" loading="lazy" decoding="async">
        </figure>
    `;
}

function renderLessonDots(pathId) {
    const done = state.progress[pathId] || [];
    const total = getPathLessonCount(pathId);
    return `
        <span class="lesson-dots" role="img" aria-label="${done.length} of ${total} lessons complete">
            ${lessons[pathId].map((lesson, index) => `<span class="${done.includes(index) ? 'is-done' : ''}"></span>`).join('')}
        </span>
    `;
}

function renderLessonList(pathId) {
    const done = state.progress[pathId] || [];
    return `
        <ol class="path-lessons">
            ${lessons[pathId].map((lesson, index) => `
                <li class="${done.includes(index) ? 'is-done' : ''}">
                    ${lesson.title}${done.includes(index) ? '<span class="visually-hidden"> (complete)</span>' : ''}
                </li>
            `).join('')}
        </ol>
    `;
}

function renderResourceRow(resource) {
    const target = resource.download ? 'download' : 'target="_blank" rel="noopener"';
    return `
        <a class="resource-row" href="${resource.file}" ${target}>
            <span class="resource-kind">${resource.kind}</span>
            <span class="resource-main">
                <strong>${resource.title}</strong>
                <span>${resource.description}</span>
            </span>
            <span class="resource-action">${resource.action}</span>
        </a>
    `;
}


/* =========================================
   RENDER FUNCTIONS
   ========================================= */

const app = document.getElementById('app');
let revealObserver = null;

function setPublicNavActive(link) {
    const navigation = document.querySelector('.public-navigation');
    if (!navigation || !link) return;

    navigation.querySelectorAll('a[href^="#"]').forEach(item => {
        item.removeAttribute('aria-current');
    });
    link.setAttribute('aria-current', link.hash === '#home' ? 'page' : 'location');
    navigation.style.setProperty('--tab-indicator-x', `${link.offsetLeft}px`);
    navigation.style.setProperty('--tab-indicator-width', `${link.offsetWidth}px`);
}

function updateSidebarIndicator() {
    document.querySelectorAll('#primary-sidebar nav').forEach(navigation => {
        const activeItem = navigation.querySelector('.nav-item.active');
        navigation.style.setProperty('--active-nav-top', `${activeItem ? activeItem.offsetTop : 0}px`);
        navigation.style.setProperty('--active-nav-height', `${activeItem ? activeItem.offsetHeight : 0}px`);
    });
}

function observeRevealTargets() {
    /* Scroll-triggered fade-ins were removed in the visual redesign.
       The function stays so existing calls keep working. */
    revealObserver?.disconnect();
    revealObserver = null;
}



const componentExplorerItems = [
    {
        id: 'arduino',
        name: 'Arduino Uno',
        category: 'Controller',
        image: 'components/arduino-uno.webp',
        purpose: 'Provides the programmable controller for the robot.',
        function: 'Runs the loaded program and evaluates inputs to determine the robot’s behavior.',
        projectRole: 'The supplied sketches use an Arduino-compatible controller to read sensor states and run obstacle-avoidance, Bluetooth, and SD-logging behavior.',
        interactions: 'The firmware evaluates sensor readings and commands movement and scan-servo behavior. The GLB shows an Arduino Uno footprint but does not assign generic board parts to it.',
        integrationStatus: 'Controller behavior documented in supplied firmware.'
    },
    {
        id: 'expansion-board',
        name: 'Expansion board',
        category: 'Interface board',
        image: 'components/expansion-board.webp',
        purpose: 'Provides an expansion interface for compatible robot electronics.',
        function: 'Organizes access to board connectors; consult the project documentation for exact interfaces and pin use.',
        projectRole: 'The supplied model includes a controller-shield mesh, but the project files do not confirm that it is this pictured board or identify its exact role.',
        interactions: 'The firmware controls motor direction and speed, but no specific expansion-board connections are assigned here.',
        integrationStatus: 'General board function; exact project integration is not confirmed.'
    },
    {
        id: 'bluetooth',
        name: 'JDY-16 Bluetooth module',
        category: 'Communication',
        image: 'components/jdy-16.webp',
        purpose: 'Provides Bluetooth communication as part of the robot’s wireless-control feature.',
        function: 'Sends and receives Bluetooth data when used with compatible firmware and a host device.',
        projectRole: 'The Bluetooth sketches use a serial link for phone commands; the integrated sketch also transfers the CSV log over Bluetooth.',
        interactions: 'It works with the controller firmware and phone interface. The GLB does not identify a JDY-16 mesh or its location.',
        integrationStatus: 'Bluetooth behavior documented in firmware; module is not identified in the GLB.'
    },
    {
        id: 'microsd',
        name: 'MicroSD module',
        category: 'Data storage',
        image: 'components/microsd-module.webp',
        purpose: 'Provides removable-card storage for the robot’s data-logging feature.',
        function: 'Reads or writes data on a MicroSD card when used by compatible firmware.',
        projectRole: 'The supplied logger sketches create or append robot.csv with sensor readings and commanded motor state; the integrated sketch keeps logging alongside Bluetooth control.',
        interactions: 'The firmware uses the SD library to write data and, in the integrated sketch, send the log through Bluetooth. The GLB names a card socket but does not identify the complete module.',
        integrationStatus: 'Data-logging behavior documented in supplied firmware.'
    },
    {
        id: 'ultrasonic',
        name: 'HC-SR04 ultrasonic sensor',
        category: 'Sensing',
        image: 'components/ultrasonic-sensor.webp',
        purpose: 'Measures the distance to nearby objects for obstacle detection.',
        function: 'Uses an ultrasonic pulse and its returning echo to estimate distance.',
        projectRole: 'The obstacle-avoidance sketches read ultrasonic distance and use it in movement decisions. The firmware does not identify the sensor as an HC-SR04 model.',
        interactions: 'Distance readings are evaluated with the IR sensor states; the scan servo is commanded while the robot checks left and right.',
        integrationStatus: 'Ultrasonic sensing documented in firmware; exact sensor model is not named there.'
    },
    {
        id: 'servo',
        name: 'SG90 servo',
        category: 'Actuation',
        image: 'components/sg90-servo.webp',
        purpose: 'Positions the mechanism mounted to its output shaft.',
        function: 'Moves its output toward a commanded position within its mechanical range.',
        projectRole: 'The obstacle-avoidance sketches command a scan servo to left, center, and right positions. The firmware does not identify the SG90 model number.',
        interactions: 'The servo scan is used with the ultrasonic distance-reading routine when choosing an avoidance direction.',
        integrationStatus: 'Scanning-servo behavior documented in firmware; exact servo model is not named there.'
    },
    {
        id: 'ir-sensors',
        name: 'IR obstacle sensors',
        category: 'Sensing',
        image: 'components/ir-sensor.jpg',
        purpose: 'Detect nearby surfaces or obstacles using infrared light.',
        function: 'Respond to infrared light reflected from nearby objects.',
        projectRole: 'The firmware reads left, front, and right IR states and uses them when deciding whether to move, stop, or turn.',
        interactions: 'IR states are evaluated alongside ultrasonic distance in automatic operation and constrain some manual movement.',
        integrationStatus: 'IR sensing behavior documented in supplied firmware.'
    },
    {
        id: 'battery-holder',
        name: 'Battery holder',
        category: 'Power',
        image: 'components/battery-holder.jpg',
        purpose: 'Holds the robot’s battery cells.',
        function: 'Provides a place for the cells and exposes leads for the system power path; verify cell requirements in the lab documentation.',
        projectRole: 'The supplied model shows a battery holder and cells in the assembly; the source files do not establish the complete power distribution or electrical rating.',
        interactions: 'It is part of the physical robot assembly. No supply voltage, wiring route, or board connection is inferred here.',
        integrationStatus: 'General power-holder function; electrical integration details are not established.'
    },
    {
        id: 'chassis',
        name: 'Yellow chassis',
        category: 'Structure',
        image: 'components/chassis.png',
        purpose: 'Supports the robot assembly and its mounted components.',
        function: 'Provides the structural base for the robot’s hardware.',
        projectRole: 'The chassis is the structural base of the assembled rover and supports its visible hardware.',
        interactions: 'It mechanically supports the robot assembly. No electrical role is implied.',
        integrationStatus: 'Structural role visible in the supplied component image and assembled model.'
    },
    {
        id: 'dc-motors',
        name: 'DC geared motors',
        category: 'Actuation',
        image: 'components/dc-motor.jpg',
        purpose: 'Provide rotational drive for the robot.',
        function: 'Convert electrical input into shaft rotation; the gearbox reduces output speed and increases available torque.',
        projectRole: 'The firmware issues left- and right-side direction and speed commands for forward movement, turns, and stopping.',
        interactions: 'Motor commands are part of the response chosen from sensor readings or Bluetooth control. The model shows four gearmotor assemblies; this overview does not assign wiring.',
        integrationStatus: 'Movement-control behavior documented in supplied firmware.'
    },
    {
        id: 'wheels',
        name: 'Wheels',
        category: 'Mobility',
        image: 'components/wheels.jpg',
        purpose: 'Provide contact with the driving surface.',
        function: 'Turn motor rotation into movement across the ground.',
        projectRole: 'The wheels provide ground contact for the assembled mobile robot.',
        interactions: 'They work mechanically with the geared motors to produce movement; individual positions and connections are not specified here.',
        integrationStatus: 'Mechanical role visible in the supplied component image and assembled model.'
    }
];

let selectedWiringId = 'ultrasonic';

function renderPathRoute() {
    return pathOrder.map(id => {
        const path = pathDetails[id];
        const number = getPathNumber(id);
        const done = getProgress(id);
        const total = getPathLessonCount(id);
        return `
            <li class="path-stop" data-path="${id}">
                ${renderPathVisual(id)}
                <div class="path-stop-body">
                    <p class="path-number">Path ${number}</p>
                    <h3>${path.title}</h3>
                    <p>${path.description}</p>
                    ${renderLessonList(id)}
                    <div class="path-stop-foot">
                        ${renderLessonDots(id)}
                        <span class="path-stop-count">${done} of ${total} done</span>
                        <button class="button small" type="button" data-enter-path="${id}"
                            data-lesson-start="${Math.max(0, getNextLessonIndex(id))}">
                            ${done === 0 ? 'Start' : done === total ? 'Review' : 'Continue'} path ${number}
                        </button>
                    </div>
                </div>
            </li>
        `;
    }).join('');
}

function renderPublicHome() {
    const { total } = getTotals();
    return `
        <div class="public-site" id="public-home">
            <header class="public-header">
                <div class="public-header-inner">
                    <a class="public-brand" href="#home" aria-label="Robot Systems Lab home">
                        <img src="rover-logo.png" alt="">
                        <span>Robot Systems Lab</span>
                    </a>
                    <nav class="public-navigation" aria-label="Main navigation">
                        <a href="#home" aria-current="page">Home</a>
                        <a href="#robot-overview">The robot</a>
                        <a href="#architecture">How it works</a>
                        <a href="#learning-paths">Learning paths</a>
                        <a href="#components" data-page="components">Components</a>
                        <a href="#demo" data-page="demo">Project Demonstration</a>
                    </nav>
                    <button class="button public-header-cta" type="button" data-enter-dashboard>Start learning</button>
                </div>
            </header>

            <main class="public-main">
                <section class="home-hero" id="home" aria-labelledby="home-title">
                    <div class="hero-head">
                        <h1 id="home-title">Learn the robot by running its code.</h1>
                        <div class="hero-intro">
                            <p>
                                Robot Systems Lab teaches the Arduino obstacle-avoidance rover from the firmware up:
                                how it senses, decides and moves, then how Bluetooth control and SD-card logging plug in.
                                Move the boxes below to see which branch of <code>loop()</code> runs.
                            </p>
                            <div class="hero-actions">
                                <button class="button" type="button" data-enter-dashboard>Start learning</button>
                                <a class="button ghost" href="#robot-overview">Meet the rover</a>
                            </div>
                        </div>
                    </div>
                    <div class="arena" data-arena></div>
                </section>

                <section class="public-section robot-section" id="robot-overview" aria-labelledby="robot-title">
                    <div class="section-inner robot-grid">
                        <div class="robot-model" data-robot-viewer-panel="home" aria-label="Interactive 3D model of the robot">
                            <div class="robot-viewer">
                                <div class="robot-viewer-canvas" data-robot-viewer-canvas role="img"
                                    aria-label="Interactive 3D rover model. Drag to rotate and use the mouse wheel or touch gesture to zoom.">
                                </div>
                                <p class="robot-viewer-status" data-robot-viewer-status role="status" aria-live="polite">
                                    Loading the robot model…
                                </p>
                            </div>
                            <div class="robot-model-bar">
                                <span class="robot-viewer-hint">Drag to rotate. Scroll or pinch to zoom.</span>
                                <button class="robot-view-reset" type="button" data-robot-reset disabled>Reset view</button>
                            </div>
                        </div>
                        <div class="robot-copy">
                            <h2 id="robot-title">One Arduino Uno, four sensors, four motors</h2>
                            <p>
                                The rover is a four-wheel kit robot. Three IR sensors watch the left, front and right edges.
                                An ultrasonic sensor on a servo measures the distance ahead and turns to check each side.
                                The Uno reads all of them and drives the wheels through a motor-driver board.
                            </p>
                            <dl class="build-sheet">
                                <div><dt>Controller</dt><dd>Arduino Uno</dd></div>
                                <div><dt>IR sensors</dt><dd>Left <code>A1</code>, front <code>D9</code>, right <code>A2</code></dd></div>
                                <div><dt>Ultrasonic</dt><dd>Trigger <code>D12</code>, echo <code>D13</code></dd></div>
                                <div><dt>Scan servo</dt><dd><code>D10</code>, turned to 150°, 90° and 30°</dd></div>
                                <div><dt>Drive</dt><dd>Direction <code>D2</code> <code>D4</code>, speed <code>D5</code> <code>D6</code></dd></div>
                                <div><dt>Add-ons</dt><dd>JDY-16 Bluetooth, microSD logger</dd></div>
                            </dl>
                            <p class="fine-print">Pin assignments are taken from Lab1_Bluetooth_Obstacle_Robot.ino.</p>
                            <button class="button outline" type="button" data-page="components">See all 11 components</button>
                        </div>
                    </div>
                </section>

                <section class="architecture-section" id="architecture" aria-labelledby="architecture-title">
                    <div class="section-inner">
                        <div class="section-head">
                            <h2 id="architecture-title">Every decision goes through one loop</h2>
                            <p>
                                Each pass of <code>loop()</code> reads the sensors, picks one action and sends it to the motors.
                                Bluetooth and the SD card sit beside that loop: one brings commands in, the other writes a record out.
                            </p>
                        </div>
                        <div class="loop-diagram" role="img"
                            aria-label="Sensors and phone commands feed the Arduino loop, which drives the motor driver, motors and scan servo. A microSD card records each cycle.">
                            <div class="loop-stage loop-sense">
                                <h3>Sense</h3>
                                <ul>
                                    <li>Three IR sensors<small>Blocked or clear</small></li>
                                    <li>Ultrasonic on a servo<small>Distance in cm</small></li>
                                    <li>Phone through JDY-16<small>Mode and joystick</small></li>
                                </ul>
                            </div>
                            <div class="loop-stage loop-decide">
                                <h3>Decide</h3>
                                <p class="loop-chip"><code>loop()</code> on the Arduino Uno</p>
                                <ul>
                                    <li>AUTO: obstacle rules, <code>OBSTACLE_CM = 20</code></li>
                                    <li>MANUAL: joystick, with safety checks</li>
                                    <li>No phone heartbeat: stop</li>
                                </ul>
                            </div>
                            <div class="loop-stage loop-act">
                                <h3>Act</h3>
                                <ul>
                                    <li>Motor driver<small>Direction and PWM</small></li>
                                    <li>Four DC geared motors<small>Forward, turn or stop</small></li>
                                    <li>Scan servo<small>150°, 90°, 30°</small></li>
                                </ul>
                            </div>
                            <div class="loop-stage loop-record">
                                <h3>Record</h3>
                                <p>
                                    The logger sketches append a row to <code>robot.csv</code> on the microSD card.
                                    The integrated sketch can also send that file back to the phone over Bluetooth.
                                </p>
                            </div>
                        </div>
                        <div class="architecture-foot">
                            <p class="fine-print">A functional overview of the lessons, not a wiring diagram or pin map.</p>
                            <button class="button on-dark" type="button" data-page="demo">See the real program structure</button>
                        </div>
                    </div>
                </section>

                <section class="public-section paths-section" id="learning-paths" aria-labelledby="paths-title">
                    <div class="section-inner">
                        <div class="section-head section-head-row">
                            <div>
                                <h2 id="paths-title">Four paths, from one sensor to the whole system</h2>
                                <p>${total} lessons, each ending with a two-question knowledge check. Your progress is saved in this browser.</p>
                            </div>
                            <button class="button outline" type="button" data-enter-dashboard>Open the dashboard</button>
                        </div>
                        <ol class="path-route" data-path-route>
                            ${renderPathRoute()}
                        </ol>
                    </div>
                </section>
            </main>

            <footer class="public-footer">
                <div class="public-footer-inner">
                    <div class="footer-brand">
                        <a class="public-brand" href="#home" aria-label="Robot Systems Lab home">
                            <img src="rover-logo.png" alt="">
                            <span>Robot Systems Lab</span>
                        </a>
                        <p>Lessons, firmware and lab manuals for an Arduino obstacle-avoidance rover with Bluetooth control and SD logging.</p>
                    </div>
                    <div class="footer-col">
                        <h2>Lab files</h2>
                        <ul>
                            ${labResources.map(resource => `
                                <li><a href="${resource.file}" ${resource.download ? 'download' : 'target="_blank" rel="noopener"'}>${resource.title}</a></li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="footer-col">
                        <h2>On this site</h2>
                        <ul>
                            <li><a href="#robot-overview">The robot</a></li>
                            <li><a href="#architecture">How it works</a></li>
                            <li><a href="#learning-paths">Learning paths</a></li>
                            <li><button class="link-button" type="button" data-page="components">Robot components</button></li>
                            <li><button class="link-button" type="button" data-page="demo">Project Demonstration</button></li>
                            <li><button class="link-button" type="button" data-enter-dashboard>Learning dashboard</button></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-base">
                    <span>Progress is stored only in this browser.</span>
                    <a href="#home">Back to top</a>
                </div>
            </footer>
        </div>
    `;
}

function renderShell() {
    app.innerHTML = `
        ${renderPublicHome()}
        <div class="app-shell" id="learning-app" hidden>
            <aside class="sidebar" id="primary-sidebar" aria-label="Primary navigation" aria-hidden="true">
                <button class="sidebar-close" type="button" data-menu-close aria-label="Close navigation">
                    <span aria-hidden="true">×</span>
                </button>
                <div class="brand">
                    <img src="rover-logo.png" alt="">
                    <span>Robot Systems Lab</span>
                </div>

                <nav aria-label="Learning navigation">
                    <button class="nav-item active" data-page="dashboard">Dashboard</button>
                    <button class="nav-item" data-page="courses">Learning paths</button>
                    <button class="nav-item" data-page="components">Robot components</button>
                    <button class="nav-item" data-page="demo">Project Demonstration</button>
                    <button class="nav-item" data-page="resources">Lab resources</button>
                    <button class="nav-item" data-page="about">About the project</button>
                </nav>

                <div class="sidebar-foot">
                    <div class="sidebar-progress" data-sidebar-progress></div>
                    <button class="nav-item nav-home" data-page="home">Back to the public site</button>
                </div>
            </aside>

            <button class="sidebar-backdrop" type="button" data-menu-close aria-label="Close navigation" aria-hidden="true" tabindex="-1"></button>

            <main class="main-area">
                <header class="topbar">
                    <div class="topbar-title-wrap">
                        <button class="mobile-menu-toggle" type="button" data-menu-toggle
                            aria-label="Open navigation" aria-controls="primary-sidebar" aria-expanded="false">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
                            <span class="menu-toggle-label">Menu</span>
                        </button>
                        <div class="topbar-title" data-topbar-title>Dashboard</div>
                    </div>
                </header>

                <section class="content" id="page-content"></section>

                <footer class="footer">
                    <span>Robot Systems Lab</span>
                    <span>Progress and quiz scores are saved in this browser only.</span>
                </footer>
            </main>
        </div>
    `;


    const publicNavigation = app.querySelector('.public-navigation');
    const publicNavLinks = Array.from(
        publicNavigation.querySelectorAll('a[href^="#"]:not([data-page])')
    );
    const publicNavLinkById = new Map(
        publicNavLinks.map(link => [link.hash.slice(1), link])
    );
    const publicNavHome = publicNavLinkById.get('home');
    setPublicNavActive(publicNavHome);

    publicNavigation.addEventListener('click', event => {
        if (!(event.target instanceof Element)) return;
        const link = event.target.closest('a[href^="#"]');
        if (!link || link.hasAttribute('data-page')) return;
        setPublicNavActive(link);
    });

    if ('IntersectionObserver' in window) {
        const navigationObserver = new IntersectionObserver(entries => {
            const visibleSections = entries.filter(entry =>
                entry.isIntersecting && publicNavLinkById.has(entry.target.id)
            );
            if (!visibleSections.length) return;

            visibleSections.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            const sectionLink = publicNavLinkById.get(visibleSections[visibleSections.length - 1].target.id);
            setPublicNavActive(sectionLink);
        }, {
            rootMargin: '-88px 0px -68% 0px',
            threshold: 0
        });

        publicNavLinkById.forEach((link, id) => {
            const section = document.getElementById(id);
            if (section) navigationObserver.observe(section);
        });
    }

    window.addEventListener('resize', () => {
        const activePublicLink = publicNavigation.querySelector('a[aria-current]:not([data-page])');
        if (activePublicLink) setPublicNavActive(activePublicLink);
        updateSidebarIndicator();
    }, { passive: true });

    const sidebar = app.querySelector('#primary-sidebar');
    const menuToggle = app.querySelector('[data-menu-toggle]');
    const closeButtons = app.querySelectorAll('[data-menu-close]');
    const mobileNavigation = window.matchMedia('(max-width: 900px)');
    let drawerOpen = false;

    function setDrawerOpen(open, restoreFocus = false) {
        drawerOpen = Boolean(open && mobileNavigation.matches);
        sidebar.classList.toggle('is-open', drawerOpen);
        sidebar.setAttribute('aria-hidden', String(mobileNavigation.matches && !drawerOpen));
        menuToggle.setAttribute('aria-expanded', String(drawerOpen));
        menuToggle.setAttribute('aria-label', drawerOpen ? 'Close navigation' : 'Open navigation');
        app.querySelector('.sidebar-backdrop').classList.toggle('is-visible', drawerOpen);
        app.querySelector('.sidebar-backdrop').setAttribute('aria-hidden', String(!drawerOpen));
        document.body.classList.toggle('navigation-open', drawerOpen);

        if (!drawerOpen && restoreFocus && mobileNavigation.matches) {
            menuToggle.focus();
        }
    }

    function handleDrawerKeydown(event) {
        if (!drawerOpen) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            setDrawerOpen(false, true);
            return;
        }

        if (event.key !== 'Tab') return;

        const focusable = Array.from(sidebar.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    }

    function syncDrawerToViewport() {
        setDrawerOpen(false);
    }

    function navigateTo(page) {
        state.page = page;
        setDrawerOpen(false);
        render();
        window.scrollTo(0, 0);
        focusPageHeading();
    }

    setDrawerOpen(false);
    menuToggle.addEventListener('click', () => setDrawerOpen(!drawerOpen, true));
    closeButtons.forEach(button => button.addEventListener('click', () => setDrawerOpen(false, true)));
    document.addEventListener('keydown', handleDrawerKeydown);

    app.addEventListener('click', event => {
        if (!(event.target instanceof Element)) return;
        const pageButton = event.target.closest('[data-page]');
        if (pageButton && app.contains(pageButton)) {
            event.preventDefault();
            navigateTo(pageButton.dataset.page);
            return;
        }

        const pathButton = event.target.closest('[data-enter-path]');
        if (pathButton && app.contains(pathButton)) {
            const pathId = pathButton.dataset.enterPath;
            if (!lessons[pathId]) {
                throw new Error(`Unknown learning path: "${pathId}".`);
            }

            const start = Number(pathButton.dataset.lessonStart || 0);
            state.activePath = pathId;
            state.activeLesson = Number.isInteger(start) && start >= 0 && start < lessons[pathId].length ? start : 0;
            navigateTo('lesson');
            return;
        }

        if (event.target.closest('[data-enter-dashboard]')) {
            navigateTo('dashboard');
        }
    });

    if (typeof mobileNavigation.addEventListener === 'function') {
        mobileNavigation.addEventListener('change', syncDrawerToViewport);
    } else {
        mobileNavigation.addListener(syncDrawerToViewport);
    }
}

function focusPageHeading() {
    const heading = state.page === 'home'
        ? document.querySelector('#public-home h1')
        : document.querySelector('#page-content h1');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
}

function renderDashboard() {
    const { completed, total } = getTotals();
    const next = getContinueTarget();
    const nextLesson = next ? lessons[next.pathId][next.lessonIndex] : null;

    let heading = 'Pick up where you left off';
    let subtitle = next
        ? `${completed} of ${total} lessons done. Next up: lesson ${next.lessonIndex + 1} of ${pathDetails[next.pathId].title}.`
        : '';
    if (completed === 0) {
        heading = 'Start with path 1';
        subtitle = 'Path 1 covers the sensors, decisions and motors that every later path builds on.';
    } else if (!next) {
        heading = `All ${total} lessons complete`;
        subtitle = 'Every lesson is marked complete. Retake any knowledge check to improve a score.';
    }

    return `
        <div class="dashboard-page">
            <section class="dash-hero" aria-labelledby="dashboard-title">
                <div class="dash-hero-copy">
                    <h1 id="dashboard-title">${heading}</h1>
                    <p class="subtitle">${subtitle}</p>
                    <div class="dash-actions">
                        ${next ? `
                            <button class="button" type="button" data-enter-path="${next.pathId}" data-lesson-start="${next.lessonIndex}">
                                ${completed === 0 ? 'Start' : 'Continue'}: ${nextLesson.title}
                            </button>
                        ` : `
                            <button class="button" type="button" data-page="courses">Review the learning paths</button>
                        `}
                    </div>
                </div>
                <div class="dash-meter" aria-labelledby="dashboard-progress-title">
                    <h2 id="dashboard-progress-title" class="visually-hidden">Overall progress</h2>
                    <p class="dash-meter-value"><strong>${completed}</strong> of ${total} lessons</p>
                    <div class="progress-track" role="progressbar" aria-label="Overall learning progress"
                        aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${completed}"
                        aria-valuetext="${completed} of ${total} lessons completed">
                        <div class="progress-fill" style="width:${total ? completed / total * 100 : 0}%"></div>
                    </div>
                    <div class="dash-meter-paths">
                        ${pathOrder.map(id => `
                            <div><span>Path ${getPathNumber(id)}</span>${renderLessonDots(id)}</div>
                        `).join('')}
                    </div>
                </div>
            </section>

            <section class="dashboard-section" aria-labelledby="dash-paths-title">
                <div class="section-row">
                    <h2 id="dash-paths-title">Learning paths</h2>
                    <button class="text-link-button" type="button" data-page="courses">Course directory</button>
                </div>
                <div class="path-list">
                    ${renderLearningPathCards()}
                </div>
            </section>

            <section class="dashboard-section" aria-labelledby="dash-files-title">
                <div class="section-row">
                    <h2 id="dash-files-title">Lab files</h2>
                    <button class="text-link-button" type="button" data-page="resources">All resources</button>
                </div>
                <div class="resource-list">
                    ${labResources.map(renderResourceRow).join('')}
                </div>
            </section>
        </div>
    `;
}

function renderLearningPathCards() {
    return pathOrder.map(id => {
        const path = pathDetails[id];
        const number = getPathNumber(id);
        const total = getPathLessonCount(id);
        const completed = getProgress(id);
        const pathQuizScores = state.progress.quizScores?.[id] || {};
        const assessmentsScored = Object.keys(pathQuizScores).length;
        const attempts = Object.values(pathQuizScores).reduce(
            (sum, record) => sum + record.attempts, 0
        );

        return `
            <article class="path-row" data-path="${id}">
                ${renderPathVisual(id)}
                <div class="path-row-body">
                    <p class="path-number">Path ${number}</p>
                    <h3>${path.title}</h3>
                    <p>${path.description}</p>
                    ${renderLessonList(id)}
                </div>
                <div class="path-row-status">
                    ${renderLessonDots(id)}
                    <p class="path-row-count"><strong>${completed} of ${total}</strong> lessons</p>
                    <p class="fine-print">${assessmentsScored} of ${total} checks scored${attempts ? `, ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}` : ''}</p>
                    <button class="button" type="button" data-open="${id}">
                        ${completed === 0 ? 'Start' : completed === total ? 'Review' : 'Continue'} path ${number}
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

function renderCourses() {
    return `
        <div class="course-directory">
            <div class="page-head">
                <h1>Learning paths</h1>
                <p class="subtitle">Four paths and sixteen lessons, in the order they build on each other. Each lesson ends with a two-question knowledge check.</p>
            </div>
            <div class="path-list">
                ${renderLearningPathCards()}
            </div>
        </div>
    `;
}

function getQuizScore(session, questions) {
    return questions.reduce(
        (score, question, index) => score + (session.answers[index] === question.answer ? 1 : 0),
        0
    );
}

function renderQuiz(pathId, lessonIndex, questions) {
    const session = getQuizSession(pathId, lessonIndex);
    const record = getQuizRecord(pathId, lessonIndex);
    const answeredCount = Object.keys(session.answers).length;
    const currentScore = getQuizScore(session, questions);
    const hasCompleteAttempt = answeredCount === questions.length;

    return `
        <section class="lesson-assessment" aria-labelledby="lesson-assessment-title">
            <div class="assessment-head">
                <h2 id="lesson-assessment-title">Check your understanding</h2>
                <p class="quiz-current-score" data-quiz-score role="status" aria-live="polite" tabindex="-1">
                    ${session.submitted
                        ? `${session.saved ? 'Saved score' : 'Score (not saved)'}: ${session.score} / ${questions.length}`
                        : `${answeredCount} of ${questions.length} answered, ${currentScore} correct so far`}
                </p>
            </div>
            <p class="assessment-intro">Pick one answer for each question. You see the explanation straight away, then save your score once both are answered.</p>
            <div class="quiz-question-list">
                ${questions.map((question, questionIndex) => {
                    const selected = session.answers[questionIndex];
                    const answered = selected !== undefined;
                    const correct = answered && selected === question.answer;

                    return `
                        <fieldset class="quiz-question">
                            <legend><span class="quiz-number">Question ${questionIndex + 1}</span>${question.prompt}</legend>
                            <div class="quiz-options" role="group" aria-label="Answer choices for question ${questionIndex + 1}">
                                ${question.choices.map((choice, choiceIndex) => {
                                    const chosen = selected === choiceIndex;
                                    const stateClass = answered && choiceIndex === question.answer
                                        ? ' is-correct'
                                        : chosen && !correct ? ' is-incorrect' : '';
                                    return `
                                        <button class="quiz-option${stateClass}" type="button"
                                            data-quiz-question="${questionIndex}" data-quiz-answer="${choiceIndex}"
                                            aria-pressed="${chosen}" ${answered ? 'disabled' : ''}>
                                            <span class="quiz-option-letter">${String.fromCharCode(65 + choiceIndex)}</span>
                                            <span>${choice}</span>
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                            <p class="quiz-feedback${answered ? (correct ? ' correct' : ' incorrect') : ''}"
                                data-quiz-feedback="${questionIndex}" role="status" aria-live="polite" ${answered ? '' : 'hidden'}>
                                ${answered
                                    ? `<strong>${correct ? 'Correct.' : `Review this answer. Correct answer: ${question.choices[question.answer]}.`}</strong> ${question.explanation}`
                                    : ''}
                            </p>
                        </fieldset>
                    `;
                }).join('')}
            </div>
            <div class="quiz-actions">
                <button class="button" type="button" data-quiz-submit
                    ${!hasCompleteAttempt || session.submitted ? 'disabled' : ''}>
                    ${session.submitted ? (session.saved ? 'Score saved' : 'Score not saved') : 'Save my score'}
                </button>
                <button class="button secondary" type="button" data-quiz-retry
                    ${session.submitted ? '' : 'hidden'}>Try again</button>
                <p class="quiz-history" data-quiz-history role="status" aria-live="polite">
                    ${record
                        ? `Best ${record.bestScore} / ${record.total}, latest ${record.lastScore} / ${record.total}, ${record.attempts} saved ${record.attempts === 1 ? 'attempt' : 'attempts'}`
                        : 'No saved score for this lesson yet.'}
                </p>
            </div>
        </section>
    `;
}

function renderLesson(pathId) {
    const path = lessons[pathId];
    if (!path) {
        throw new Error(`No lessons are registered for "${pathId}".`);
    }

    const lesson = path[state.activeLesson];
    if (!lesson) {
        throw new Error(`Lesson ${state.activeLesson + 1} is not available in "${pathId}".`);
    }

    const completed = state.progress[pathId] || [];
    const number = getPathNumber(pathId);
    const isDone = completed.includes(state.activeLesson);

    return `
        <div class="lesson-page-heading">
            <p class="lesson-crumb">
                <button class="crumb-link" type="button" data-page="courses">Learning paths</button>
                <span aria-hidden="true">/</span>
                <span>Path ${number}: ${pathDetails[pathId].title}</span>
            </p>
            <h1>${lesson.title}</h1>
            <p class="subtitle">${lesson.description}</p>
        </div>

        <div class="lesson-layout">
            <aside class="lesson-menu" aria-label="${pathDetails[pathId].title} lessons">
                <h2>Path ${number}</h2>
                <p class="course-progress-copy">${getProgress(pathId)} of ${path.length} lessons complete</p>
                <div class="progress-track" role="progressbar" aria-label="${pathDetails[pathId].title} progress"
                    aria-valuemin="0" aria-valuemax="${path.length}" aria-valuenow="${getProgress(pathId)}"
                    aria-valuetext="${getProgress(pathId)} of ${path.length} lessons completed">
                    <div class="progress-fill" style="width:${getPercentage(pathId)}%"></div>
                </div>
                <nav class="lesson-menu-list" aria-label="Lessons in ${pathDetails[pathId].title}">
                    ${path.map((item, index) => `
                        <button class="lesson-link ${index === state.activeLesson ? 'active' : ''} ${completed.includes(index) ? 'is-done' : ''}"
                            type="button" data-lesson="${index}"
                            aria-current="${index === state.activeLesson ? 'step' : 'false'}"
                            aria-label="Open lesson ${index + 1}: ${item.title}${completed.includes(index) ? ' (complete)' : ''}">
                            <span class="lesson-link-number">${index + 1}</span>
                            <span class="lesson-link-title">${item.title}</span>
                        </button>
                    `).join('')}
                </nav>
            </aside>

            <article class="lesson-content">
                <div class="lesson-section-heading">
                    <span>Lesson ${state.activeLesson + 1} of ${path.length}</span>
                    <span class="lesson-completion-state${isDone ? ' is-done' : ''}">${isDone ? 'Completed' : 'In progress'}</span>
                </div>
                <section class="lesson-objectives" aria-labelledby="lesson-objectives-heading">
                    <h2 id="lesson-objectives-heading">In this lesson you will</h2>
                    <ul>${lesson.objectives.map(objective => `<li>${objective}</li>`).join('')}</ul>
                </section>
                <section class="lesson-introduction" aria-labelledby="lesson-introduction-heading">
                    <h2 id="lesson-introduction-heading">Introduction</h2>
                    <p>${lesson.introduction}</p>
                </section>
                ${lesson.content}
                <section class="lesson-terminology" aria-labelledby="lesson-terminology-heading">
                    <h2 id="lesson-terminology-heading">Key terms</h2>
                    <dl>
                        ${lesson.terminology.map(([term, definition]) => `
                            <div><dt>${term}</dt><dd>${definition}</dd></div>
                        `).join('')}
                    </dl>
                </section>
                <section class="lesson-summary" aria-labelledby="lesson-summary-heading">
                    <h2 id="lesson-summary-heading">Summary</h2>
                    <ul>${lesson.summary.map(item => `<li>${item}</li>`).join('')}</ul>
                </section>
                <details class="lesson-references">
                    <summary>Source materials used</summary>
                    <ul>${lesson.references.map(reference => `<li><code>${reference}</code></li>`).join('')}</ul>
                </details>

                ${renderQuiz(pathId, state.activeLesson, lesson.questions)}

                <nav class="lesson-actions" aria-label="Lesson controls">
                    <button class="button secondary" type="button" data-previous ${state.activeLesson === 0 ? 'disabled' : ''}>Previous lesson</button>
                    <button class="button${isDone ? ' is-done' : ''}" type="button" data-complete>
                        ${isDone ? 'Lesson completed' : 'Mark lesson complete'}
                    </button>
                    <button class="button secondary" type="button" data-next ${state.activeLesson === path.length - 1 ? 'disabled' : ''}>Next lesson</button>
                </nav>
                <p class="lesson-save-status" data-progress-status role="status" aria-live="polite"></p>
                <button class="text-link-button lesson-back-button" type="button" data-back>Back to dashboard</button>
            </article>
        </div>
    `;
}

function renderResources() {
    return `
        <div class="page-head">
            <h1>Lab resources</h1>
            <p class="subtitle">The firmware, lab manuals and phone controller that come with the project.</p>
        </div>
        <div class="notice warning">
            Check the exact wiring and component requirements in your laboratory manual before uploading firmware.
        </div>
        <div class="resource-list">
            ${labResources.map(renderResourceRow).join('')}
        </div>
    `;
}

function renderAbout() {
    return `
        <div class="page-head">
            <h1>About Robot Systems Lab</h1>
            <p class="subtitle">An educational platform for an Arduino-based obstacle-avoidance robot and its add-ons.</p>
        </div>
        <div class="about-grid">
            <section>
                <h2>Project purpose</h2>
                <p>Robot Systems Lab introduces learners to an Arduino-based obstacle-avoidance robot and its additional features, using the project's own firmware, manuals and component photographs.</p>
            </section>
            <section>
                <h2>Core system</h2>
                <ul>
                    <li>Autonomous obstacle avoidance</li>
                    <li>Bluetooth wireless control</li>
                    <li>SD card data logging</li>
                </ul>
            </section>
            <section>
                <h2>Learning approach</h2>
                <p>Each learning path introduces the concepts, hardware, connections, operation, testing and troubleshooting of the robot.</p>
            </section>
            <section>
                <h2>Good to know</h2>
                <p>Lesson progress and quiz scores live in this browser only, so they do not prove that lab work was done or assessed. The 3D model needs an internet connection to load its viewer.</p>
            </section>
        </div>
    `;
}

const wiringConnections = [
    {
        id: 'ultrasonic',
        name: 'Ultrasonic sensor',
        category: 'Distance sensing',
        summary: 'The Arduino sends a short trigger pulse and measures the returning echo to estimate the distance ahead.',
        modelNames: ['Ultrasonic PCB'],
        modelStatus: 'The ultrasonic sensor assembly is identified in the supplied GLB model.',
        connections: [
            { signal: 'TRIG', pin: 'D12', direction: 'Arduino → sensor', detail: 'Arduino output pulse that starts a distance measurement.' },
            { signal: 'ECHO', pin: 'D13', direction: 'Sensor → Arduino', detail: 'Echo pulse read by the Arduino to calculate distance in centimetres.' }
        ],
        note: 'The firmware confirms the signal pins. Check the sensor board documentation for its power and ground requirements.'
    },
    {
        id: 'servo',
        name: 'Scan servo',
        category: 'Actuation',
        summary: 'The servo turns the ultrasonic sensor toward the left, centre and right so the robot can compare nearby distances.',
        modelNames: ['Servo'],
        modelStatus: 'The servo mesh is identified in the supplied GLB model. The exact servo model number is not stated in the firmware.',
        connections: [
            { signal: 'Servo control', pin: 'D10', direction: 'Arduino → servo', detail: 'Servo control signal. The program commands 150°, 90° and 30° during the scan.' }
        ],
        note: 'The sketch confirms the signal pin and commanded angles, but not the servo supply wiring. Follow the servo and robot kit documentation for power.'
    },
    {
        id: 'ir',
        name: 'IR obstacle sensors',
        category: 'Obstacle sensing',
        summary: 'Three active-low IR inputs report whether the left, front and right sensor positions detect an obstacle.',
        modelNames: ['IR sensor board', 'IR sensor board.001', 'Center IR board'],
        modelStatus: 'Three IR sensor board groups are present in the supplied GLB model. The wiring overlay groups them as one sensor set.',
        connections: [
            { signal: 'Left IR input', pin: 'A1', direction: 'Sensor → Arduino', detail: 'Digital input; LOW is interpreted as blocked.' },
            { signal: 'Front IR input', pin: 'D9', direction: 'Sensor → Arduino', detail: 'Digital input; LOW is interpreted as blocked.' },
            { signal: 'Right IR input', pin: 'A2', direction: 'Sensor → Arduino', detail: 'Digital input; LOW is interpreted as blocked.' }
        ],
        note: 'The pin names and active-low logic are taken from the supplied firmware. The exact physical left/right orientation should be checked against the assembled robot.'
    },
    {
        id: 'motors',
        name: 'Motor-driver control',
        category: 'Movement',
        summary: 'The Arduino sends direction and speed-control signals to the motor-driver interface. The driver then powers the DC geared motors.',
        modelNames: ['Gearmotor', 'Gearmotor.001', 'Gearmotor.002', 'Gearmotor.003'],
        sourceModelName: 'Controller shield',
        modelStatus: 'The GLB includes a controller-shield group and four gearmotor groups. It does not identify the motor-driver terminals or prove the exact board-to-motor wiring.',
        connections: [
            { signal: 'Left direction', pin: 'D2', direction: 'Arduino → driver', detail: 'Sets the left-side motor direction.' },
            { signal: 'Right direction', pin: 'D4', direction: 'Arduino → driver', detail: 'Sets the right-side motor direction.' },
            { signal: 'Left speed (PWM)', pin: 'D5', direction: 'Arduino → driver', detail: 'Controls the commanded left-side motor speed.' },
            { signal: 'Right speed (PWM)', pin: 'D6', direction: 'Arduino → driver', detail: 'Controls the commanded right-side motor speed.' }
        ],
        note: 'These are the control pins defined in the sketch. The firmware does not specify the motor-driver output terminal labels or the wiring of each individual motor.'
    },
    {
        id: 'bluetooth',
        name: 'JDY-16 Bluetooth module',
        category: 'Wireless serial',
        summary: 'The phone sends text commands to the JDY-16. The module passes the serial data to the Arduino hardware UART.',
        modelNames: [],
        external: true,
        modelStatus: 'The JDY-16 module is not identified as a separate mesh in the supplied GLB. Its marker and dashed line are a schematic callout, not a confirmed mounting location.',
        connections: [
            { signal: 'JDY-16 TXD', pin: 'D0 / RX', direction: 'Module → Arduino', detail: 'Module transmit connects to the Arduino hardware UART receive pin.' },
            { signal: 'JDY-16 RXD', pin: 'D1 / TX', direction: 'Arduino → module', detail: 'Module receive connects to the Arduino hardware UART transmit pin.' },
            { signal: 'Serial rate', pin: '9600 baud', direction: 'UART setting', detail: 'The integrated firmware starts Serial at 9600 bits per second.' }
        ],
        note: 'D0 and D1 are shared with USB serial programming. The exact JDY-16 breakout supply and RX logic-level requirements must be checked before connecting power.'
    },
    {
        id: 'microsd',
        name: 'MicroSD data logger',
        category: 'Software SPI storage',
        summary: 'The Arduino uses software SPI to write sensor and motor-state records to robot.csv on the MicroSD card.',
        modelNames: ['Card socket'],
        external: true,
        dashed: true,
        modelStatus: 'The GLB includes a card-socket mesh, but it does not identify the complete MicroSD breakout module. The dashed line is a schematic reference to that model feature.',
        connections: [
            { signal: 'Chip select (CS)', pin: 'D8', direction: 'Arduino → SD module', detail: 'Selects the MicroSD module for a transfer.' },
            { signal: 'MISO', pin: 'A0', direction: 'SD module → Arduino', detail: 'Data from the card to the Arduino; A0 is used as a digital software-SPI pin.' },
            { signal: 'MOSI', pin: 'D11', direction: 'Arduino → SD module', detail: 'Data from the Arduino to the card.' },
            { signal: 'Clock (SCK)', pin: 'D7', direction: 'Arduino → SD module', detail: 'Software-SPI clock signal.' }
        ],
        note: 'The firmware uses SdFat v2.x with software SPI. Confirm the exact module voltage regulation and logic-level shifting before applying power.'
    }
];

function renderWiringDetails(connection) {
    if (!connection) return '';
    return `
        <div class="wiring-detail-copy">
            <p class="component-category">${connection.category}</p>
            <h3>${connection.name}</h3>
            <p class="wiring-summary">${connection.summary}</p>
            <div class="wiring-evidence">${connection.modelStatus}</div>
            <div class="wiring-table-wrap">
                <table class="wiring-table">
                    <thead><tr><th scope="col">Signal</th><th scope="col">Arduino pin</th><th scope="col">Direction / detail</th></tr></thead>
                    <tbody>
                        ${connection.connections.map(item => `
                            <tr>
                                <th scope="row">${item.signal}</th>
                                <td><code>${item.pin}</code></td>
                                <td><strong>${item.direction}</strong><span>${item.detail}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <p class="wiring-note">${connection.note}</p>
        </div>
    `;
}

function renderComponents() {
    const selectedConnection = wiringConnections.find(
        connection => connection.id === selectedWiringId
    ) || wiringConnections[0];

    return `
        <div class="component-explorer" id="components">
            <header class="page-head component-explorer-heading">
                <h1>Robot components</h1>
                <p class="subtitle">
                    Explore the assembled rover, trace the firmware-defined signal connections,
                    and review the component photographs below.
                </p>
            </header>

            <section class="component-overview-section" aria-labelledby="component-overview-heading">
                <h2 id="component-overview-heading">The assembled rover · wiring view</h2>

                <div class="component-overview-layout" data-robot-viewer-panel="components"
                    data-robot-wiring-viewer role="group"
                    aria-label="Interactive 3D rover wiring demonstration">
                    <div class="component-overview-model">
                        <div class="robot-viewer component-robot-viewer">
                            <div class="robot-viewer-canvas" data-robot-viewer-canvas
                                role="img"
                                aria-label="Interactive 3D rover wiring view. Drag to rotate, zoom, and select a numbered wiring marker.">
                            </div>
                            <p class="robot-viewer-status" data-robot-viewer-status role="status" aria-live="polite">
                                Loading the robot model…
                            </p>
                        </div>
                        <div class="robot-model-bar wiring-model-bar">
                            <span class="robot-viewer-hint">Drag to rotate · Scroll or pinch to zoom · Select a wiring marker</span>
                            <button class="robot-view-reset" type="button" data-robot-reset disabled>Reset view</button>
                        </div>
                        <div class="wiring-legend" aria-label="Wiring overlay legend">
                            <span><i class="wiring-legend-line solid"></i>Model-anchored connection</span>
                            <span><i class="wiring-legend-line dashed"></i>Schematic / module not identified in GLB</span>
                        </div>
                    </div>

                    <aside class="component-detail-panel wiring-detail-panel" aria-label="Wiring connection details">
                        <label for="wiring-connection-select">Choose a wiring group</label>
                        <select id="wiring-connection-select" data-wiring-select>
                            ${wiringConnections.map(connection => `
                                <option value="${connection.id}"
                                    ${connection.id === selectedConnection.id ? 'selected' : ''}>
                                    ${connection.name}
                                </option>
                            `).join('')}
                        </select>
                        <div class="wiring-details" data-wiring-details aria-live="polite">
                            ${renderWiringDetails(selectedConnection)}
                        </div>
                        <p class="component-model-note">
                            The coloured route illustrates the signal group defined in the supplied firmware.
                            It is a wiring explanation, not a measured physical wire path. Power connections are
                            not shown where the firmware does not specify the module's voltage requirements.
                        </p>
                    </aside>
                </div>
            </section>

            <section class="component-catalog-section" aria-labelledby="component-catalog-heading">
                <div class="section-row">
                    <h2 id="component-catalog-heading">Hardware reference</h2>
                    <p class="fine-print">${componentExplorerItems.length} parts, using the photographs supplied with the project</p>
                </div>

                <div class="component-card-grid">
                    ${componentExplorerItems.map(component => `
                        <article class="component-card">
                            <figure class="component-card-image">
                                <img src="${component.image}" alt="${component.name}"
                                    loading="lazy" decoding="async">
                            </figure>
                            <div class="component-card-copy">
                                <p class="component-category">${component.category}</p>
                                <h3>${component.name}</h3>
                                <p>${component.purpose}</p>
                                <button class="component-details-button" type="button"
                                    data-component-open="${component.id}"
                                    aria-label="View ${component.name} details">
                                    View details
                                </button>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </section>

            <dialog class="component-dialog" data-component-dialog aria-labelledby="component-dialog-title">
                <div data-component-dialog-content></div>
            </dialog>
        </div>
    `;
}


/* =========================================
   EVENT HANDLING
   ========================================= */

function bindPageEvents() {
    const wiringSelect = document.querySelector('[data-wiring-select]');
    const wiringDetails = document.querySelector('[data-wiring-details]');
    const wiringViewer = document.querySelector('[data-robot-wiring-viewer]');

    function selectWiringConnection(id) {
        const connection = wiringConnections.find(item => item.id === id);
        if (!connection || !wiringDetails) return;

        selectedWiringId = connection.id;
        if (wiringSelect) wiringSelect.value = connection.id;
        wiringDetails.innerHTML = renderWiringDetails(connection);
        wiringViewer?.dispatchEvent(new CustomEvent('robotlab:wiringselect', {
            detail: { id: connection.id }
        }));
    }

    wiringSelect?.addEventListener('change', event => {
        selectWiringConnection(event.currentTarget.value);
    });

    wiringViewer?.addEventListener('robotlab:wiringmarker', event => {
        selectWiringConnection(event.detail?.id);
    });

    wiringViewer?.dispatchEvent(new CustomEvent('robotlab:wiringselect', {
        detail: { id: selectedWiringId }
    }));

    document.querySelectorAll('[data-open]').forEach(button => {
        button.addEventListener('click', () => {
            state.activePath = button.dataset.open;
            state.activeLesson = Math.max(0, getNextLessonIndex(button.dataset.open));
            state.page = 'lesson';
            render();
            focusPageHeading();
        });
    });

    document.querySelectorAll('[data-lesson]').forEach(button => {
        button.addEventListener('click', () => {
            state.activeLesson = Number(button.dataset.lesson);
            render();
            focusPageHeading();
        });
    });

    document.querySelectorAll('[data-quiz-answer]').forEach(button => {
        button.addEventListener('click', () => {
            const lesson = lessons[state.activePath][state.activeLesson];
            const questionIndex = Number(button.dataset.quizQuestion);
            const selected = Number(button.dataset.quizAnswer);
            const question = lesson?.questions[questionIndex];
            const session = getQuizSession(state.activePath, state.activeLesson);
            if (!question || session.submitted || session.answers[questionIndex] !== undefined) return;

            session.answers[questionIndex] = selected;
            const questionContainer = button.closest('.quiz-question');
            questionContainer.querySelectorAll('[data-quiz-answer]').forEach(option => {
                const optionIndex = Number(option.dataset.quizAnswer);
                const isSelected = optionIndex === selected;
                option.disabled = true;
                option.setAttribute('aria-pressed', String(isSelected));
                option.classList.toggle('is-correct', optionIndex === question.answer);
                option.classList.toggle('is-incorrect', isSelected && selected !== question.answer);
            });

            const feedback = questionContainer.querySelector(`[data-quiz-feedback="${questionIndex}"]`);
            const explanation = document.createElement('strong');
            const isCorrect = selected === question.answer;
            explanation.textContent = isCorrect
                ? 'Correct.'
                : `Review this answer. Correct answer: ${question.choices[question.answer]}.`;
            feedback.replaceChildren(explanation, document.createTextNode(` ${question.explanation}`));
            feedback.hidden = false;
            feedback.classList.toggle('correct', isCorrect);
            feedback.classList.toggle('incorrect', !isCorrect);

            const answeredCount = Object.keys(session.answers).length;
            const score = getQuizScore(session, lesson.questions);
            const scoreStatus = document.querySelector('[data-quiz-score]');
            scoreStatus.textContent = `${answeredCount} of ${lesson.questions.length} answered, ${score} correct so far`;
            document.querySelector('[data-quiz-submit]').disabled = answeredCount !== lesson.questions.length;
        });
    });

    document.querySelector('[data-quiz-submit]')?.addEventListener('click', () => {
        const lesson = lessons[state.activePath]?.[state.activeLesson];
        if (!lesson) {
            throw new Error('Cannot save a quiz score without an active lesson.');
        }

        const session = getQuizSession(state.activePath, state.activeLesson);
        if (session.submitted || Object.keys(session.answers).length !== lesson.questions.length) return;

        const score = getQuizScore(session, lesson.questions);
        const previousRecord = getQuizRecord(state.activePath, state.activeLesson);
        const nextRecord = {
            attempts: (previousRecord?.attempts || 0) + 1,
            bestScore: Math.max(previousRecord?.bestScore || 0, score),
            lastScore: score,
            total: lesson.questions.length
        };
        if (!state.progress.quizScores[state.activePath]) {
            state.progress.quizScores[state.activePath] = {};
        }
        state.progress.quizScores[state.activePath][state.activeLesson] = nextRecord;
        session.submitted = true;
        session.score = score;
        session.saved = saveProgress();

        if (!session.saved) {
            if (previousRecord) {
                state.progress.quizScores[state.activePath][state.activeLesson] = previousRecord;
            } else {
                delete state.progress.quizScores[state.activePath][state.activeLesson];
                if (!Object.keys(state.progress.quizScores[state.activePath]).length) {
                    delete state.progress.quizScores[state.activePath];
                }
            }
        }

        render();
        document.querySelector('[data-quiz-score]')?.focus();
    });

    document.querySelector('[data-quiz-retry]')?.addEventListener('click', () => {
        state.quizSession = {
            pathId: state.activePath,
            lessonIndex: state.activeLesson,
            answers: {},
            submitted: false,
            score: null,
            saved: false
        };
        render();
        document.querySelector('[data-quiz-answer]')?.focus();
    });

    document.querySelector('[data-complete]')?.addEventListener('click', () => {
        const id = state.activePath;
        let statusMessage;

        if (!state.progress[id]) state.progress[id] = [];

        if (!state.progress[id].includes(state.activeLesson)) {
            state.progress[id].push(state.activeLesson);
            if (saveProgress()) {
                statusMessage = 'Lesson completion saved in this browser.';
            } else {
                state.progress[id] = state.progress[id].filter(index => index !== state.activeLesson);
                statusMessage = 'Lesson completion could not be saved. Check browser storage and try again.';
            }
        } else {
            statusMessage = 'This lesson is already marked complete.';
        }

        render();
        document.querySelector('[data-progress-status]').textContent = statusMessage;
        focusPageHeading();
    });

    document.querySelector('[data-next]')?.addEventListener('click', () => {
        if (state.activeLesson < lessons[state.activePath].length - 1) {
            state.activeLesson++;
            render();
            focusPageHeading();
        }
    });

    document.querySelector('[data-previous]')?.addEventListener('click', () => {
        if (state.activeLesson > 0) {
            state.activeLesson--;
            render();
            focusPageHeading();
        }
    });

    document.querySelector('[data-back]')?.addEventListener('click', () => {
        state.page = 'dashboard';
        render();
        focusPageHeading();
    });

    const componentDialog = document.querySelector('[data-component-dialog]');
    let componentDialogTrigger = null;

    function closeComponentDialog() {
        if (!componentDialog?.open || componentDialog.classList.contains('is-closing')) return;

        componentDialog.classList.add('is-closing');
        const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150;
        window.setTimeout(() => {
            if (componentDialog.open) componentDialog.close();
        }, delay);
    }

    document.querySelectorAll('[data-component-open]').forEach(button => {
        button.addEventListener('click', () => {
            const component = componentExplorerItems.find(
                item => item.id === button.dataset.componentOpen
            );
            const content = componentDialog?.querySelector('[data-component-dialog-content]');
            if (!component || !componentDialog || !content) return;

            content.innerHTML = `
                <div class="component-dialog-header">
                    <div>
                        <p class="component-category">${component.category}</p>
                        <h2 id="component-dialog-title">${component.name}</h2>
                    </div>
                    <button class="component-dialog-close" type="button"
                        data-component-dialog-close aria-label="Close component details">×</button>
                </div>
                <div class="component-dialog-body">
                    <figure class="component-dialog-image">
                        <img src="${component.image}" alt="${component.name}">
                    </figure>
                    <div class="component-dialog-copy">
                        <h3>Primary function</h3>
                        <p>${component.function}</p>
                        <h3>Role in the robot</h3>
                        <p>${component.projectRole}</p>
                        <h3>Interaction and evidence</h3>
                        <p>${component.interactions}</p>
                    </div>
                </div>
                <p class="component-dialog-evidence">${component.integrationStatus}</p>
                <p class="component-dialog-note">
                    Refer to the laboratory documentation for exact wiring and hardware requirements.
                </p>
            `;
            componentDialogTrigger = button;
            componentDialog.classList.remove('is-closing');
            componentDialog.showModal();
            componentDialog.querySelector('[data-component-dialog-close]').focus();
        });
    });

    componentDialog?.addEventListener('cancel', event => {
        event.preventDefault();
        closeComponentDialog();
    });
    componentDialog?.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        closeComponentDialog();
    });
    componentDialog?.addEventListener('close', () => {
        componentDialog.classList.remove('is-closing');
        if (componentDialogTrigger?.isConnected) componentDialogTrigger.focus();
    });
    componentDialog?.addEventListener('click', event => {
        if (event.target === componentDialog
            || (event.target instanceof Element && event.target.closest('[data-component-dialog-close]'))) {
            closeComponentDialog();
        }
    });
}

/* =========================================
   MAIN RENDERER
   ========================================= */

function updateChrome() {
    const { completed, total } = getTotals();
    const titles = {
        dashboard: 'Dashboard',
        courses: 'Learning paths',
        components: 'Robot components',
        resources: 'Lab resources',
        about: 'About the project',
        demo: 'Project Demonstration',
        lesson: pathDetails[state.activePath]
            ? `Path ${getPathNumber(state.activePath)}: ${pathDetails[state.activePath].title}`
            : 'Lesson'
    };
    const title = document.querySelector('[data-topbar-title]');
    if (title) title.textContent = titles[state.page] || 'Dashboard';

    const sidebarProgress = document.querySelector('[data-sidebar-progress]');
    if (sidebarProgress) {
        sidebarProgress.innerHTML = `
            <span>${completed} of ${total} lessons done</span>
            <span class="mini-meter"><span style="width:${total ? completed / total * 100 : 0}%"></span></span>
        `;
    }

    const route = document.querySelector('[data-path-route]');
    if (route && state.page === 'home') route.innerHTML = renderPathRoute();
}

function render() {
    revealObserver?.disconnect();
    revealObserver = null;

    if (!app.querySelector('.app-shell')) {
        renderShell();
    }

    const isHome = state.page === 'home';
    app.querySelector('#public-home').hidden = !isHome;
    app.querySelector('#learning-app').hidden = isHome;
    document.title = isHome
        ? 'Robot Systems Lab | Engineering Learning Platform'
        : state.page === 'components'
            ? 'Robot Systems Lab | Robot Components'
            : state.page === 'demo'
            ? 'Robot Systems Lab | Project Demonstration'
            : state.page === 'lesson'
                ? `Robot Systems Lab | ${lessons[state.activePath]?.[state.activeLesson]?.title || 'Lesson'}`
                : 'Robot Systems Lab | Learning Dashboard';

    updateChrome();

    document.querySelectorAll('[data-page]').forEach(button => {
        const isCurrent = button.dataset.page === state.page;
        button.classList.toggle('active', isCurrent);
        if (isCurrent) {
            button.setAttribute('aria-current', 'page');
        } else {
            button.removeAttribute('aria-current');
        }
    });
    updateSidebarIndicator();

    if (isHome) {
        setPublicNavActive(document.querySelector('#public-home .public-navigation a[href="#home"]'));
        observeRevealTargets();
        window.dispatchEvent(new CustomEvent('robotlab:pagechange', {
            detail: { page: state.page }
        }));
        return;
    }

    const content = document.getElementById('page-content');

    switch (state.page) {
        case 'dashboard':
            content.innerHTML = renderDashboard();
            break;

        case 'courses':
            content.innerHTML = renderCourses();
            break;

        case 'components':
            content.innerHTML = renderComponents();
            break;

        case 'lesson':
            content.innerHTML = renderLesson(state.activePath);
            break;

        case 'resources':
            content.innerHTML = renderResources();
            break;

        case 'about':
            content.innerHTML = renderAbout();
            break;

        case 'demo':
            content.innerHTML = ProjectDemo.render();
            break;

        default:
            state.page = 'dashboard';
            content.innerHTML = renderDashboard();
            break;
    }

    bindPageEvents();
    if (state.page === 'demo') ProjectDemo.bind(content);
    observeRevealTargets();
    window.dispatchEvent(new CustomEvent('robotlab:pagechange', {
        detail: { page: state.page }
    }));
}

/* =========================================
   START APPLICATION
   ========================================= */

render();