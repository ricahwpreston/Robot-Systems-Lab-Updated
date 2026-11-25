Desktop simulation of the current lafvin_robot_with_ble_csv_download.ino
==========================================================

This checks the current integrated firmware's file-management logic on a computer, not on the
Arduino. The SdFat, Serial and Servo libraries are replaced by small mocks
(mocks/) that store files in a normal folder. The "phone" side of each test is
generated with the exact helper functions from lafvin_ble_controller.html.

It does NOT prove the sketch compiles for or fits on an Arduino Uno, and it
does not replace testing on the robot.

Run from this folder (needs g++, Node.js and Python 3):

  cp ../../lafvin_robot_with_ble_csv_download.ino firmware.cpp
  g++ -std=c++17 -Wall -Wextra -Imocks harness.cpp -o harness
  node gen.js ../../lafvin_ble_controller.html
  python3 run.py

Expected result: all checks pass. The motor_action label check documents the current source labels; it does not physically verify wheel direction.
