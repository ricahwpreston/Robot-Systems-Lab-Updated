#include <Arduino.h>
#include <Servo.h>
#include <stdlib.h>
#include <string.h>
 
// ============================================================
// LAFVIN OBSTACLE-AVOIDANCE ROBOT + JDY-16 BLE CONTROL
// Bluetooth-only learning version: NO SD CARD / CSV LOGGING
// ============================================================
 
// Original sensor and servo pins
const byte LEFT_IR_PIN  = A1;
const byte FRONT_IR_PIN = 9;
const byte RIGHT_IR_PIN = A2;
const byte TRIG_PIN     = 12;
const byte ECHO_PIN     = 13;
const byte SERVO_PIN    = 10;
Servo scanServo;
 
// Original motor-driver pins
const byte LEFT_DIR_PIN    = 2;
const byte RIGHT_DIR_PIN   = 4;
const byte LEFT_SPEED_PIN  = 5;
const byte RIGHT_SPEED_PIN = 6;
 
// Original automatic-mode values
const int OBSTACLE_CM    = 20;
const int FORWARD_SPEED  = 110;
const int TURN_SPEED     = 120;
const int TURN_TIME_MS   = 450;
const int SIDE_TURN_MS   = 250;
const byte CENTER_ANGLE  = 90;
const byte LEFT_ANGLE    = 150;
const byte RIGHT_ANGLE   = 30;
 
// Bluetooth/manual-control settings
const int MAX_MANUAL_PWM = 160;
const int MIN_MANUAL_PWM = 65;
const byte JOYSTICK_DEADZONE = 12;
const unsigned long JOYSTICK_TIMEOUT_MS = 400;
const unsigned long CONNECTION_TIMEOUT_MS = 650;
 
enum Mode { MANUAL, AUTO };
Mode mode = MANUAL;                 // Safe start: wait for phone command
 
char rxLine[24];
byte rxLen = 0;
int joystickX = 0;
int joystickY = 0;
bool haveJoystick = false;
bool haveConnectionPacket = false;
unsigned long lastJoystickMs = 0;
unsigned long lastConnectionMs = 0;
 
bool leftBlocked = false;
bool frontBlocked = false;
bool rightBlocked = false;
int frontDistance = 300;
bool ultrasonicEchoValid = false;
 
// ---------------- Motor functions ----------------
void stopRobot() {
  analogWrite(LEFT_SPEED_PIN, 0);
  analogWrite(RIGHT_SPEED_PIN, 0);
}
 
void moveForward() {
  digitalWrite(LEFT_DIR_PIN, HIGH);
  digitalWrite(RIGHT_DIR_PIN, LOW);
  analogWrite(LEFT_SPEED_PIN, FORWARD_SPEED);
  analogWrite(RIGHT_SPEED_PIN, FORWARD_SPEED);
}
 
void turnLeft() {
  stopRobot();
  digitalWrite(LEFT_DIR_PIN, LOW);
  digitalWrite(RIGHT_DIR_PIN, LOW);
  analogWrite(LEFT_SPEED_PIN, TURN_SPEED);
  analogWrite(RIGHT_SPEED_PIN, TURN_SPEED);
}
 
void turnRight() {
  stopRobot();
  digitalWrite(LEFT_DIR_PIN, HIGH);
  digitalWrite(RIGHT_DIR_PIN, HIGH);
  analogWrite(LEFT_SPEED_PIN, TURN_SPEED);
  analogWrite(RIGHT_SPEED_PIN, TURN_SPEED);
}
 
// Positive left motor = forward (D2 HIGH).
// Positive right motor = forward (D4 LOW).
void setSignedMotors(int left, int right) {
  left = constrain(left, -255, 255);
  right = constrain(right, -255, 255);
 
  stopRobot(); // PWM is set to zero before changing direction pins.
  digitalWrite(LEFT_DIR_PIN, left >= 0 ? HIGH : LOW);
  digitalWrite(RIGHT_DIR_PIN, right >= 0 ? LOW : HIGH);
  analogWrite(LEFT_SPEED_PIN, abs(left));
  analogWrite(RIGHT_SPEED_PIN, abs(right));
}
 
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
 
// Original autonomous obstacle-avoidance decision.
void avoidObstacle(bool leftIsBlocked, bool rightIsBlocked) {
  stopRobot();
  delay(150);
 
  scanServo.write(LEFT_ANGLE);
  delay(350);
  int leftDistance = readDistanceCM();
 
  scanServo.write(RIGHT_ANGLE);
  delay(550);
  int rightDistance = readDistanceCM();
 
  scanServo.write(CENTER_ANGLE);
  delay(250);
 
  if (leftIsBlocked) leftDistance = 0;
  if (rightIsBlocked) rightDistance = 0;
 
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
 
// ---------------- Bluetooth command handling ----------------
// Commands are newline-terminated:
// M = manual, A = automatic, S = stop, H = heartbeat,
// J,x,y = joystick axes from -100 to +100.
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
      if (rxLen < sizeof(rxLine) - 1) rxLine[rxLen++] = c;
      else rxLen = 0; // Discard an overlong command.
    }
  }
}
 
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
 
  // Keep the original sensors active during manual operation.
  if (frontBlocked) {
    stopRobot();
    return;
  }
 
  // Forward is blocked if the front distance is close/unknown,
  // or either side IR sensor is triggered. There is no rear sensor.
  if (y > 0 &&
      (!ultrasonicEchoValid || frontDistance <= OBSTACLE_CM ||
       leftBlocked || rightBlocked)) {
    stopRobot();
    return;
  }
 
  // Prevent steering toward a side that its IR sensor reports blocked.
  if ((x < 0 && leftBlocked) || (x > 0 && rightBlocked)) {
    stopRobot();
    return;
  }
 
  int leftMix = constrain(y + x, -100, 100);
  int rightMix = constrain(y - x, -100, 100);
  setSignedMotors(scaleManual(leftMix), scaleManual(rightMix));
}
 
void setup() {
  // JDY-16 UART connection: module TX -> Arduino D0/RX;
  // module RX <- Arduino D1/TX. USB serial shares this UART.
  Serial.begin(9600);
 
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
  delay(500);
}
 
void loop() {
  readBluetooth();
 
  leftBlocked  = digitalRead(LEFT_IR_PIN)  == LOW;
  frontBlocked = digitalRead(FRONT_IR_PIN) == LOW;
  rightBlocked = digitalRead(RIGHT_IR_PIN) == LOW;
  frontDistance = readDistanceCM();
 
  // Stop if no phone command/heartbeat has arrived recently.
  if (!haveConnectionPacket ||
      millis() - lastConnectionMs > CONNECTION_TIMEOUT_MS) {
    mode = MANUAL;
    haveJoystick = false;
    stopRobot();
    return;
  }
 
  if (mode == MANUAL) {
    runManual();
    delay(10);
    return;
  }
 
  // AUTO mode: original obstacle avoidance behavior.
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
 
  delay(40);
}
