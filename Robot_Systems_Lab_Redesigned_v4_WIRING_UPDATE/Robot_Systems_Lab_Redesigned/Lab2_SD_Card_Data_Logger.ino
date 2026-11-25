#include <Arduino.h>
#include <Servo.h>
#include <SPI.h>
#include <SdFat.h>

// ============================================================
// LAFVIN OBSTACLE-AVOIDANCE ROBOT + SD CARD CSV LOGGER
// SD-only learning version: NO BLUETOOTH
// Uses software SPI so the original sensor pins stay unchanged.
// Requires SdFat library v2.x.
// ============================================================

// Original sensor and servo pins
const byte LEFT_IR_PIN  = A1;
const byte FRONT_IR_PIN = 9;
const byte RIGHT_IR_PIN = A2;
const byte TRIG_PIN     = 12;
const byte ECHO_PIN     = 13;
const byte SERVO_PIN    = 10;
Servo scanServo;

// SD card software-SPI wiring
const uint8_t SD_CS_PIN   = 8;
const uint8_t SD_MISO_PIN = A0;
const uint8_t SD_MOSI_PIN = 11;
const uint8_t SD_SCK_PIN  = 7;

SoftSpiDriver<SD_MISO_PIN, SD_MOSI_PIN, SD_SCK_PIN> softSpi;
SdFat32 sd;
File32 logFile;
#define SD_CONFIG SdSpiConfig(SD_CS_PIN, SHARED_SPI, SD_SCK_MHZ(0), &softSpi)

bool sdReady = false;
const unsigned long LOG_INTERVAL_MS = 200;
unsigned long lastLogMs = 0;

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

// Values recorded in the CSV file
int commandedLeftPwm = 0;
int commandedRightPwm = 0;
int leftDirLevel = HIGH;
int rightDirLevel = LOW;
const char *motorAction = "STOP";
byte servoCommandedAngle = CENTER_ANGLE;

bool leftBlocked = false;
bool frontBlocked = false;
bool rightBlocked = false;
int frontDistance = 300;
bool ultrasonicEchoValid = false;

// ---------------- Motor functions ----------------
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

void avoidObstacle(bool leftIsBlocked, bool rightIsBlocked) {
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

// ---------------- SD card setup and logging ----------------
void startSDLogging() {
  if (!sd.begin(SD_CONFIG)) {
    sdReady = false;
    return;
  }

  bool needsHeader = !sd.exists("robot.csv");
  logFile = sd.open("robot.csv", O_RDWR | O_CREAT | O_AT_END);
  if (!logFile) {
    sdReady = false;
    return;
  }

  if (logFile.fileSize() == 0 || needsHeader) {
    logFile.println(F(
      "time_ms,mode,left_ir_blocked,front_ir_blocked,right_ir_blocked,"
      "front_distance_cm,ultrasonic_echo_valid,servo_angle_commanded,"
      "left_pwm_commanded,right_pwm_commanded,left_dir_pin,right_dir_pin,"
      "motor_action"
    ));
    logFile.flush();
  }
  sdReady = true;
}

void logDataIfDue() {
  unsigned long now = millis();
  if (!sdReady || (now - lastLogMs < LOG_INTERVAL_MS)) return;
  lastLogMs = now;

  logFile.print(now);
  logFile.print(F(",AUTO,"));
  logFile.print(leftBlocked ? 1 : 0);
  logFile.print(',');
  logFile.print(frontBlocked ? 1 : 0);
  logFile.print(',');
  logFile.print(rightBlocked ? 1 : 0);
  logFile.print(',');
  logFile.print(frontDistance);
  logFile.print(',');
  logFile.print(ultrasonicEchoValid ? 1 : 0);
  logFile.print(',');
  logFile.print(servoCommandedAngle);
  logFile.print(',');
  logFile.print(commandedLeftPwm);
  logFile.print(',');
  logFile.print(commandedRightPwm);
  logFile.print(',');
  logFile.print(leftDirLevel);
  logFile.print(',');
  logFile.print(rightDirLevel);
  logFile.print(',');
  logFile.println(motorAction);

  // Flush writes this row to the card's file system.
  logFile.flush();
}

void setup() {
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

  startSDLogging(); // Robot can still move if SD initialization fails.
}

void loop() {
  leftBlocked  = digitalRead(LEFT_IR_PIN)  == LOW;
  frontBlocked = digitalRead(FRONT_IR_PIN) == LOW;
  rightBlocked = digitalRead(RIGHT_IR_PIN) == LOW;
  frontDistance = readDistanceCM();

  // Original autonomous obstacle-avoidance behavior.
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
