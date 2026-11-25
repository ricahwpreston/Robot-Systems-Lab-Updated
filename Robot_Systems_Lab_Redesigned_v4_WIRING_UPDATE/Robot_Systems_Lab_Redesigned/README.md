# Robot Systems Lab — Redesigned Edition

A Cisco-inspired, browser-based learning platform for an Arduino Uno obstacle-avoidance robot and its Bluetooth / SD-card enhancements.

## Run locally

1. Keep all files in this folder together.
2. Open `index.html` in Chrome or Microsoft Edge.
3. Choose any of the four learning paths and complete its four lessons.
4. Lesson completion and saved assessment scores are stored in the current browser using localStorage.

No Node.js, framework, or build step is required. The interactive robot model loads pinned Three.js r128, OrbitControls, and GLTFLoader scripts from jsDelivr; an internet connection is needed for the viewer. Keep `assets/robot/rover-multiview.glb` at its listed path. The learning content remains available if the model cannot load.

## What's included

- `index.html` — course entry point.
- `styles.css` — responsive website styling and the redesigned home / course catalogue.
- `app.js` — lesson content, diagrams, quizzes, assessments, checklists, and progress handling.
- `robot-3d.js` — interactive GLB viewer for the public home page and Robot Components explorer.
- `arena.js` — home-page obstacle arena that runs the AUTO-mode decision from `Lab1_Bluetooth_Obstacle_Robot.ino`.
- `demo.js` — the Project Demonstration page (six tabs).
- `demo-firmware.js` — exact code excerpts, with line numbers, copied from the sketches for the Project Demonstration page.
- `lafvin_robot_with_ble_csv_download.ino` — the latest supplied integrated sketch, including BLE control, GAME mode, SD logging, CSV transfer, selected-record deletion and whole-file deletion.
- `lafvin_ble_controller.html` — the matching current phone controller, including joystick controls, CSV preview/download and file-management actions.
- `tests/firmware-simulation/` — desktop C++ simulation for the current sketch's CSV file-management logic; it is not a hardware validation.
- `assets/robot/rover-multiview.glb` — robot model used by the landing-page viewer.
- `assets/learning paths/` — supplied course images used by the four learning-path cards.
- `components/` — supplied component photographs used by the Robot Components catalog.
- `Laboratory_Manual_1_Bluetooth_Integration.docx` — Bluetooth laboratory manual.
- `Laboratory_Manual_2_SD_Card_Data_Logging.docx` — SD-card laboratory manual.
- `Lab1_Bluetooth_Obstacle_Robot.ino` — Bluetooth-only Arduino sketch.
- `Lab2_SD_Card_Data_Logger.ino` — SD-only Arduino sketch.
- `lafvin_robot_with_ble_csv_download.ino` — current integrated BLE + SD + CSV file-management sketch.
- `lafvin_ble_controller.html` — current smartphone BLE joystick and CSV manager.
- `lafvin_ble_controller_with_csv_progress-1.html` and `lafvin_ble_controller_v2.html` — earlier controller versions retained as legacy references; the website's current resource links use `lafvin_ble_controller.html`.

## Phase 1 redesign

The home page and learning-path catalogue have been refreshed with a modern technical-learning visual identity. The catalogue presents four active learning paths.

The Robot Components explorer presents the supplied hardware images and an interactive view of the assembled GLB. Board identities and locations are not inferred where the model does not name them.

## Phase 2 curriculum

The four learning paths contain 16 lessons. Each lesson includes learning objectives, detailed instruction grounded in the supplied materials, important terminology, a summary, source references, and a two-question multiple-choice assessment with four choices per question, immediate explanations, retry, and saved score history. Completion and assessment records use the existing browser-local progress store.

## Important technical notes

- The browser course is an educational reference. Browser progress does not prove that physical laboratory work was completed or assessed.
- Verify the exact JDY-16 and SD breakout-board power and logic-level requirements before wiring.
- Arduino Uno D0/RX and D1/TX are shared with USB serial programming; follow the supplied manual when uploading.
- The supplied SD-card activity uses software SPI and the pin assignments documented in Laboratory Manual 2.
- The combined firmware path is included as supplied; the source project notes that the combined hardware path has not been physically verified.
- The phone controller uses Web Bluetooth and therefore needs a compatible browser and secure context, typically HTTPS. Opening the file directly may not provide this.
- The integrated controller / firmware behavior should be tested with the actual hardware before classroom deployment.

## Phase 3 visual redesign

The look is now taken from the robot itself instead of a generic course template:

- Colours come from the GLB materials and the logo: golden-yellow wheels/motors, logo navy, red wire insulation for blocked or incorrect states, and hazard stripes for safety warnings.
- Type: Chakra Petch (headings and controls), Atkinson Hyperlegible (reading), JetBrains Mono (code, pins and sensor values only).
- The home page opens with an interactive arena (`arena.js`). Visitors drag two 20 cm boxes; the page applies the sketch's AUTO-mode rules (`OBSTACLE_CM = 20`, IR checks, servo scan at 150° and 30°, `TURN_TIME_MS`, `SIDE_TURN_MS`) and highlights the matching lines of `loop()` and `avoidObstacle()`. IR range and arena scale are illustrative.
- The dashboard has a "continue" button for the next incomplete lesson, path cards list their lessons with completion marks, and the lab resources list now includes both manuals and the phone controller.
- Learning-path cards use the four images in `assets/learning paths/`. `path-01-obstacle-avoidance-card.webp` is a 130 KB copy of the 2 MB PNG for faster loading.
- Lesson content, quizzes, progress storage and the 3D viewer are unchanged.

## Phase 4: Project Demonstration and CSV file management

A **Project Demonstration** page (sidebar and top navigation) has six tabs:

1. **Program structure**: an interactive flowchart of `loop()` in the integrated sketch, scenarios that highlight the path the code takes, every function with its purpose, callers and exact code excerpt, the real start-up order, key variables, and which sketch contains which functions.
2. **CSV generation**: the sensor → processing → formatting → SD pipeline, a column inspector for all 16 columns (each linked to the line that writes it), illustrative sample rows built from the firmware's rules, the header rules, and a checker for your own robot.csv.
3. **SD card storage**: wiring and start-up, a file-workflow simulator, recording vs reading vs downloading vs deleting, how selected-record rewriting protects the original, and a power/card-handling warning.
4. **Wireless data retrieval**: the working Bluetooth download path and protocol, a download-time estimator, and Wi-Fi hotspot retrieval as a proposed upgrade (ESP32 or ESP8266 needed; not supported by the JDY-16 or the Uno).
5. **Project cost**: the supplied price list exactly as given (total ₱2,912), an arithmetic check, a chart and a materials summary.
6. **BLE joystick controller**: the current supplied controller and matching integrated sketch, the command reference, a protocol playground, safety rules and a hardware test checklist.

### Current supplied firmware and controller

The current uploaded `lafvin_robot_with_ble_csv_download.ino` already combines the previous integrated sketch and file-management functions. The current website resource links now point to this sketch and `lafvin_ble_controller.html`. The controller checks for `#FW,RSL_CSV_MANAGE_1` before enabling selected-record deletion. Features in the current pair:

- `V` → `#FW,RSL_CSV_MANAGE_1` (lets the phone know file management exists).
- `DELALL` → deletes robot.csv, recreates it with the header, verifies, replies `#DEL_OK,<size>` or `#DEL_ERROR_<reason>`.
- `RW,<bytes>,<crc16>,<count>` → deletes the selected records. The robot checks that the phone's copy (size and CRC-16/CCITT-FALSE) matches the start of robot.csv, requests the selection 64 lines at a time (`#RW_NEXT,<line>` / `K,<16 hex>`), writes kept lines to robot.tmp, re-reads and checks it, then swaps robot.csv → robot.bak, robot.tmp → robot.csv and removes robot.bak. Records logged after the phone's download are always kept. Rewrite errors are reported. The original is left in place for ordinary failures; if the final swap cannot restore it immediately, `robot.bak` is kept for recovery at the next start-up. `RWX` cancels.
- Start-up recovery finishes or undoes a swap interrupted by a power cut.
- `#BUSY` when a second file command arrives while one is pending.
- The current supplied sketch still appears to use reversed `MANUAL_TURN_LEFT` / `MANUAL_TURN_RIGHT` log labels relative to the joystick turn direction. This affects the `motor_action` text in the CSV, not the motor direction pins. Verify the labels during physical testing before relying on that field.



## Phase 5: current firmware, joystick and wiring-view update

- The `Lab resources` page now launches `lafvin_ble_controller.html` and downloads the matching `lafvin_robot_with_ble_csv_download.ino`. It also offers the controller HTML as a download.
- The Project Demonstration controller tab now uses the same current file pair and explains GAME mode, CSV download, selected-record deletion and whole-file deletion.
- The Project Demonstration code excerpts and CSV source-line references have been regenerated from the newly supplied `.ino`.
- The Robot Components page now uses the right-side panel for firmware-defined wiring details instead of repeating the component overview. The component photo catalogue remains below.
- The 3D viewer draws selectable signal-group routes over the GLB. Solid routes use identified model groups; dashed routes are schematic references for modules that the GLB does not identify. The route lines explain the signal path and are not a measured physical harness layout.

### Validation status

- The updated website links to the latest supplied controller and firmware files.
- The 3D wiring view uses named GLB mesh groups where available. JDY-16 and the complete MicroSD breakout are not identified as separate GLB meshes, so their routes are shown as schematic callouts rather than asserted physical placements.
- JavaScript syntax checks passed for `app.js`, `robot-3d.js`, `demo.js`, `demo-firmware.js`, and both inline scripts in the current controller HTML.
- The desktop firmware simulation passed 26/26 checks using the current supplied `.ino` and the current controller's CSV helper functions.
- **Not verified here:** Arduino compilation, BLE communication with the actual JDY-16, SD-card operations on the physical robot, and all motor/sensor wiring. Test with a backup of `robot.csv`, wheels raised, and instructor supervision before classroom use.
