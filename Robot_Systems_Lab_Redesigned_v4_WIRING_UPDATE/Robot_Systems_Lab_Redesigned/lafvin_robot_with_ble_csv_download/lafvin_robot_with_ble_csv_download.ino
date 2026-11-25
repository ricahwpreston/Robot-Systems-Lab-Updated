#include <Arduino.h>
#include <Servo.h>
#include <stdlib.h>
#include <string.h>
#include <SPI.h>
#include <SdFat.h>

/*
  LAFVIN Arduino Uno obstacle-avoidance robot + JDY-16 Bluetooth manual control

  ORIGINAL AUTOMATIC MODE:
  The original obstacle-avoidance functions, sensor pins, servo angles,
  movement speeds, distance threshold, and delay values are retained.

  Bluetooth commands (newline-terminated ASCII at 9600 baud):
    M\n       Manual mode; stop and wait for joystick
    A\n       Automatic mode; use the ORIGINAL obstacle-avoidance logic
    S\n       Stop; switch to manual mode
    H\n       Heartbeat; phone should send periodically (e.g. every 200 ms)
    J,X,Y\n   Joystick values -100..100
             +X = right, -X = left; +Y = forward, -Y = reverse

  SAFETY:
  - Startup is stopped until a valid Bluetooth packet arrives.
  - Bluetooth/heartbeat timeout stops the motors.
  - Manual mode blocks forward movement when front distance is <= 20 cm,
    no ultrasonic echo is received, or either side IR detects an obstacle.
  - Manual mode blocks steering toward a side whose IR sensor is blocked.
  - There is no rear sensor; reverse must be visually supervised.
  - JDY-16 uses hardware UART D0 (RX) and D1 (TX). USB Serial Monitor shares it.
*/

// ---------- ORIGINAL PIN ASSIGNMENTS ----------
const byte LEFT_IR_PIN  = A1;
const byte FRONT_IR_PIN = 9;
const byte RIGHT_IR_PIN = A2;

const byte TRIG_PIN  = 12;
const byte ECHO_PIN  = 13;
const byte SERVO_PIN = 10;
Servo scanServo;

// ---------- ADD-ON SD CARD LOGGER (SOFTWARE SPI; ORIGINAL KIT PINS UNCHANGED) ----------
// Wire SD module: CS=D8, MOSI/DI=D11, SCK/CLK=D7, MISO/DO=A0.
// SdFat library (v2.x) is required. Format card as FAT16/FAT32.
const uint8_t SD_CS_PIN = 8;
const uint8_t SD_MISO_PIN = A0;
const uint8_t SD_MOSI_PIN = 11;
const uint8_t SD_SCK_PIN = 7;
SoftSpiDriver<SD_MISO_PIN, SD_MOSI_PIN, SD_SCK_PIN> softSpi;
SdFat32 sd;
File32 logFile;
#define SD_CONFIG SdSpiConfig(SD_CS_PIN, SHARED_SPI, SD_SCK_MHZ(0), &softSpi)
bool sdReady = false;
bool csvDownloadRequested = false;
const unsigned long LOG_INTERVAL_MS = 200;
unsigned long lastLogMs = 0;
int commandedLeftPwm = 0;
int commandedRightPwm = 0;
int leftDirLevel = HIGH;
int rightDirLevel = LOW;
const char *motorAction = "STOP";
byte servoCommandedAngle = 90;

const byte LEFT_DIR_PIN    = 2;
const byte RIGHT_DIR_PIN   = 4;
const byte LEFT_SPEED_PIN  = 5;
const byte RIGHT_SPEED_PIN = 6;

// ---------- ORIGINAL VALUES: DO NOT CHANGE ----------
const int OBSTACLE_CM    = 20;
const int FORWARD_SPEED  = 110;
const int TURN_SPEED     = 120;
const int TURN_TIME_MS   = 450;
const int SIDE_TURN_MS   = 250;

const byte CENTER_ANGLE = 90;
const byte LEFT_ANGLE   = 150;
const byte RIGHT_ANGLE  = 30;

// ---------- BLUETOOTH MANUAL-CONTROL SETTINGS ----------
const int MAX_MANUAL_PWM = 160;
const int MIN_MANUAL_PWM = 65;
const byte JOYSTICK_DEADZONE = 12;
const unsigned long JOYSTICK_TIMEOUT_MS = 400;
const unsigned long CONNECTION_TIMEOUT_MS = 650;

enum Mode { MANUAL, AUTO };
Mode mode = MANUAL;  // Safe startup: motors remain stopped until Bluetooth packet.

char rxLine[24];
byte rxLen = 0;
int joystickX = 0;
int joystickY = 0;
bool haveJoystick = false;
bool haveConnectionPacket = false;
unsigned long lastJoystickMs = 0;
unsigned long lastConnectionMs = 0;

// Latest sensor readings, refreshed in the active loop.
bool leftBlocked = false;
bool frontBlocked = false;
bool rightBlocked = false;
int frontDistance = 300;
bool ultrasonicEchoValid = false;

// ---------- MOTOR FUNCTIONS ----------
// Original stopRobot(), moveForward(), turnLeft(), and turnRight() are retained.
void stopRobot() {
  analogWrite(LEFT_SPEED_PIN, 0);
  analogWrite(RIGHT_SPEED_PIN, 0);
  commandedLeftPwm = 0;
  commandedRightPwm = 0;
  motorAction = "STOP";
}

void moveForward() {
  digitalWrite(LEFT_DIR_PIN, HIGH);
  digitalWrite(RIGHT_DIR_PIN, LOW);
  analogWrite(LEFT_SPEED_PIN, FORWARD_SPEED);
  analogWrite(RIGHT_SPEED_PIN, FORWARD_SPEED);
  commandedLeftPwm = FORWARD_SPEED;
  commandedRightPwm = FORWARD_SPEED;
  leftDirLevel = HIGH;
  rightDirLevel = LOW;
  motorAction = "FORWARD";
}

void turnLeft() {
  stopRobot();
  digitalWrite(LEFT_DIR_PIN, LOW);
  digitalWrite(RIGHT_DIR_PIN, LOW);
  analogWrite(LEFT_SPEED_PIN, TURN_SPEED);
  analogWrite(RIGHT_SPEED_PIN, TURN_SPEED);
  commandedLeftPwm = TURN_SPEED;
  commandedRightPwm = TURN_SPEED;
  leftDirLevel = LOW;
  rightDirLevel = LOW;
  motorAction = "TURN_LEFT";
}

void turnRight() {
  stopRobot();
  digitalWrite(LEFT_DIR_PIN, HIGH);
  digitalWrite(RIGHT_DIR_PIN, HIGH);
  analogWrite(LEFT_SPEED_PIN, TURN_SPEED);
  analogWrite(RIGHT_SPEED_PIN, TURN_SPEED);
  commandedLeftPwm = TURN_SPEED;
  commandedRightPwm = TURN_SPEED;
  leftDirLevel = HIGH;
  rightDirLevel = HIGH;
  motorAction = "TURN_RIGHT";
}

// Signed PWM for manual differential steering.
// Positive left = left forward (D2 HIGH).
// Positive right = right forward (D4 LOW).
void setSignedMotors(int left, int right) {
  left = constrain(left, -255, 255);
  right = constrain(right, -255, 255);

  stopRobot(); // Set PWM to zero before reversing direction.

  digitalWrite(LEFT_DIR_PIN, left >= 0 ? HIGH : LOW);
  digitalWrite(RIGHT_DIR_PIN, right >= 0 ? LOW : HIGH);

  analogWrite(LEFT_SPEED_PIN, abs(left));
  analogWrite(RIGHT_SPEED_PIN, abs(right));
  commandedLeftPwm = abs(left);
  commandedRightPwm = abs(right);
  leftDirLevel = (left >= 0 ? HIGH : LOW);
  rightDirLevel = (right >= 0 ? LOW : HIGH);
  if (left == 0 && right == 0) motorAction = "STOP";
  else if (left > 0 && right > 0) motorAction = "MANUAL_FORWARD";
  else if (left < 0 && right < 0) motorAction = "MANUAL_REVERSE";
  else if (left > right) motorAction = "MANUAL_TURN_LEFT";
  else if (right > left) motorAction = "MANUAL_TURN_RIGHT";
  else motorAction = "MANUAL_MIXED";
}

// ---------- ORIGINAL ULTRASONIC READING ----------
int readDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 25000UL);
  if (duration == 0) {
    ultrasonicEchoValid = false;
    return 300;
  }
  ultrasonicEchoValid = true;
  return (int)(duration / 58UL);
}

// ---------- ORIGINAL OBSTACLE-AVOIDANCE LOGIC ----------
void avoidObstacle(bool leftBlocked, bool rightBlocked) {
  stopRobot();
  delay(150);

  scanServo.write(LEFT_ANGLE);
  servoCommandedAngle = LEFT_ANGLE;
  delay(350);
  int leftDistance = readDistanceCM();

  scanServo.write(RIGHT_ANGLE);
  servoCommandedAngle = RIGHT_ANGLE;
  delay(550);
  int rightDistance = readDistanceCM();

  scanServo.write(CENTER_ANGLE);
  servoCommandedAngle = CENTER_ANGLE;
  delay(250);

  if (leftBlocked) leftDistance = 0;
  if (rightBlocked) rightDistance = 0;

  if (leftDistance <= OBSTACLE_CM && rightDistance <= OBSTACLE_CM) {
    turnLeft();
    delay(TURN_TIME_MS * 2);
  } else if (leftDistance >= rightDistance) {
    turnLeft();
    delay(TURN_TIME_MS);
  } else {
    turnRight();
    delay(TURN_TIME_MS);
  }

  stopRobot();
}

// ---------- BLUETOOTH COMMAND PARSING ----------
void updateConnectionTime() {
  haveConnectionPacket = true;
  lastConnectionMs = millis();
}

void parseLine(char *line) {
  if (strcmp(line, "H") == 0) {
    updateConnectionTime();
  } else if (strcmp(line, "S") == 0) {
    updateConnectionTime();
    mode = MANUAL;
    haveJoystick = false;
    joystickX = joystickY = 0;
    stopRobot();
  } else if (strcmp(line, "M") == 0) {
    updateConnectionTime();
    mode = MANUAL;
    haveJoystick = false;
    joystickX = joystickY = 0;
    stopRobot();
  } else if (strcmp(line, "A") == 0) {
    updateConnectionTime();
    mode = AUTO;
    haveJoystick = false;
    stopRobot();
  } else if (strcmp(line, "D") == 0) {
    // Download request: stop the robot and transfer the current CSV log.
    updateConnectionTime();
    mode = MANUAL;
    haveJoystick = false;
    joystickX = joystickY = 0;
    stopRobot();
    csvDownloadRequested = true;
  } else if (line[0] == 'J' && line[1] == ',') {
    char *comma = strchr(line + 2, ',');
    if (comma == NULL) return;

    *comma = '\0';
    char *endX;
    char *endY;
    long x = strtol(line + 2, &endX, 10);
    long y = strtol(comma + 1, &endY, 10);

    if (*endX || *endY || endX == line + 2 || endY == comma + 1 ||
        x < -100 || x > 100 || y < -100 || y > 100) {
      return;
    }

    updateConnectionTime();
    if (mode == MANUAL) {
      joystickX = (int)x;
      joystickY = (int)y;
      lastJoystickMs = millis();
      haveJoystick = true;
    }
  }
}

void readBluetooth() {
  byte received = 0;
  while (Serial.available() && received < 48) {
    char c = (char)Serial.read();
    ++received;

    if (c == '\n') {
      rxLine[rxLen] = '\0';
      if (rxLen > 0) parseLine(rxLine);
      rxLen = 0;
    } else if (c != '\r') {
      if (rxLen < sizeof(rxLine) - 1) {
        rxLine[rxLen++] = c;
      } else {
        rxLen = 0; // Discard an overlong packet.
      }
    }
  }
}

// ---------- PROTECTED MANUAL CONTROL ----------
int scaleManual(int input) {
  int magnitude = abs(input);
  if (magnitude <= JOYSTICK_DEADZONE) return 0;

  int pwm = map(magnitude, JOYSTICK_DEADZONE + 1, 100,
                MIN_MANUAL_PWM, MAX_MANUAL_PWM);
  return (input > 0) ? pwm : -pwm;
}

void runManual() {
  if (!haveJoystick ||
      millis() - lastJoystickMs > JOYSTICK_TIMEOUT_MS) {
    stopRobot();
    return;
  }

  int x = (abs(joystickX) <= JOYSTICK_DEADZONE) ? 0 : joystickX;
  int y = (abs(joystickY) <= JOYSTICK_DEADZONE) ? 0 : joystickY;

  if (x == 0 && y == 0) {
    stopRobot();
    return;
  }

  // Stop if the front IR detects an obstacle.
  if (frontBlocked) {
    stopRobot();
    return;
  }

  // Protected forward movement: stop for close/unknown front distance
  // or a side IR obstacle. Reverse is not protected by a rear sensor.
  if (y > 0 &&
      (!ultrasonicEchoValid || frontDistance <= OBSTACLE_CM ||
       leftBlocked || rightBlocked)) {
    stopRobot();
    return;
  }

  // Do not steer toward a side that its IR sensor reports as blocked.
  if ((x < 0 && leftBlocked) || (x > 0 && rightBlocked)) {
    stopRobot();
    return;
  }

  int leftMix = constrain(y + x, -100, 100);
  int rightMix = constrain(y - x, -100, 100);
  int leftMotor = scaleManual(leftMix);
  int rightMotor = scaleManual(rightMix);

  setSignedMotors(leftMotor, rightMotor);
}

// ---------- SD LOGGING ----------
void startSDLogging() {
  // Software SPI allows SD wiring without using D12/D13, which are fixed
  // for the kit's ultrasonic sensor. This requires the SdFat v2.x library.
  if (!sd.begin(SD_CONFIG)) {
    sdReady = false;
    return; // Keep the robot usable even if the card is absent/unreadable.
  }

  // Append to an existing file; write a header only when the file is new/empty.
  bool needsHeader = !sd.exists("robot.csv");
  logFile = sd.open("robot.csv", O_RDWR | O_CREAT | O_AT_END);
  if (!logFile) {
    sdReady = false;
    return;
  }
  if (logFile.fileSize() == 0 || needsHeader) {
    logFile.println(F("time_ms,mode,left_ir_blocked,front_ir_blocked,right_ir_blocked,front_distance_cm,ultrasonic_echo_valid,servo_angle_commanded,left_pwm_commanded,right_pwm_commanded,left_dir_pin,right_dir_pin,motor_action,bluetooth_connected,joystick_x,joystick_y"));
    logFile.flush();
  }
  sdReady = true;
}

void logDataIfDue() {
  unsigned long now = millis();
  if (!sdReady || (now - lastLogMs < LOG_INTERVAL_MS)) return;
  lastLogMs = now;

  logFile.print(now);
  logFile.print(','); logFile.print(mode == AUTO ? F("AUTO") : F("MANUAL"));
  logFile.print(','); logFile.print(leftBlocked ? 1 : 0);
  logFile.print(','); logFile.print(frontBlocked ? 1 : 0);
  logFile.print(','); logFile.print(rightBlocked ? 1 : 0);
  logFile.print(','); logFile.print(frontDistance);
  logFile.print(','); logFile.print(ultrasonicEchoValid ? 1 : 0);
  logFile.print(','); logFile.print(servoCommandedAngle);
  logFile.print(','); logFile.print(commandedLeftPwm);
  logFile.print(','); logFile.print(commandedRightPwm);
  logFile.print(','); logFile.print(leftDirLevel);
  logFile.print(','); logFile.print(rightDirLevel);
  logFile.print(','); logFile.print(motorAction);
  logFile.print(','); logFile.print(haveConnectionPacket && (now - lastConnectionMs <= CONNECTION_TIMEOUT_MS) ? 1 : 0);
  logFile.print(','); logFile.print(joystickX);
  logFile.print(','); logFile.println(joystickY);
  // Flush each row so recent data is less likely to be lost if power is cut.
  logFile.flush();
}

// ---------- CSV DOWNLOAD OVER JDY-16 BLE ----------
// Website sends: D\n
// Arduino responds with: #CSV_BEGIN,<byte-count>\n + raw robot.csv + #CSV_END\n
// Error responses begin with #CSV_ERROR. The robot remains stopped while
// transferring, then logging resumes by reopening robot.csv in append mode.
void sendCsvFileOverBluetooth() {
  stopRobot();
  mode = MANUAL;
  haveJoystick = false;
  joystickX = joystickY = 0;

  if (!sdReady) {
    Serial.println(F("#CSV_ERROR_SD_NOT_READY"));
    updateConnectionTime();
    return;
  }

  if (logFile) {
    logFile.flush();
    logFile.close();
  }

  File32 downloadFile = sd.open("robot.csv", O_RDONLY);
  if (!downloadFile) {
    Serial.println(F("#CSV_ERROR_OPEN_FAILED"));
    logFile = sd.open("robot.csv", O_RDWR | O_CREAT | O_AT_END);
    sdReady = (bool)logFile;
    updateConnectionTime();
    return;
  }

  Serial.print(F("#CSV_BEGIN,"));
  Serial.print(downloadFile.fileSize());
  Serial.write('\n');
  while (downloadFile.available()) {
    int data = downloadFile.read();
    if (data >= 0) Serial.write((uint8_t)data);
  }
  downloadFile.close();
  Serial.print(F("\n#CSV_END\n"));

  // Resume appending to the same file; do not truncate existing log data.
  logFile = sd.open("robot.csv", O_RDWR | O_CREAT | O_AT_END);
  sdReady = (bool)logFile;
  lastLogMs = millis();
  updateConnectionTime();
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(9600); // JDY-16 on D0/RX and D1/TX; USB shares this UART.

  pinMode(LEFT_IR_PIN, INPUT);
  pinMode(FRONT_IR_PIN, INPUT);
  pinMode(RIGHT_IR_PIN, INPUT);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  pinMode(LEFT_DIR_PIN, OUTPUT);
  pinMode(RIGHT_DIR_PIN, OUTPUT);
  pinMode(LEFT_SPEED_PIN, OUTPUT);
  pinMode(RIGHT_SPEED_PIN, OUTPUT);
  stopRobot();

  scanServo.attach(SERVO_PIN);
  scanServo.write(CENTER_ANGLE);
  servoCommandedAngle = CENTER_ANGLE;
  delay(500);

  startSDLogging(); // SD logging is optional; robot control remains available if it fails.
}

// ---------- MAIN LOOP ----------
void loop() {
  readBluetooth();

  if (csvDownloadRequested) {
    csvDownloadRequested = false;
    sendCsvFileOverBluetooth();
    return;
  }

  // Keep the original sensor definitions and active-low IR behavior.
  leftBlocked  = digitalRead(LEFT_IR_PIN)  == LOW;
  frontBlocked = digitalRead(FRONT_IR_PIN) == LOW;
  rightBlocked = digitalRead(RIGHT_IR_PIN) == LOW;
  frontDistance = readDistanceCM();

  // A missing phone heartbeat or Bluetooth traffic stops the robot.
  if (!haveConnectionPacket ||
      millis() - lastConnectionMs > CONNECTION_TIMEOUT_MS) {
    mode = MANUAL;
    haveJoystick = false;
    stopRobot();
    logDataIfDue();
    return;
  }

  if (mode == MANUAL) {
    runManual();
    logDataIfDue();
    delay(10);
    return;
  }

  // AUTO MODE: original loop logic and original values.
  if (frontBlocked || frontDistance <= OBSTACLE_CM ||
      (leftBlocked && rightBlocked)) {
    avoidObstacle(leftBlocked, rightBlocked);
  } else if (leftBlocked) {
    turnRight();
    delay(SIDE_TURN_MS);
    stopRobot();
  } else if (rightBlocked) {
    turnLeft();
    delay(SIDE_TURN_MS);
    stopRobot();
  } else {
    moveForward();
  }

  logDataIfDue();
  delay(40);
}
