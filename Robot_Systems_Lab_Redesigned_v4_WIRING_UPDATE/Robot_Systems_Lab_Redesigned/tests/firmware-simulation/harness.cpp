#include <Arduino.h>
#include <fstream>
#include <map>
#include <sstream>
#include <iostream>
SerialMock Serial;
std::string g_root = ".";
int g_renameCalls = 0, g_failRenameMask = 0;
static unsigned long g_now = 0;
unsigned long millis() { return g_now++; }
void delay(unsigned long ms) { g_now += ms; }
void delayMicroseconds(unsigned int) {}
void pinMode(int, int) {}
void digitalWrite(int, int) {}
int digitalRead(int) { return HIGH; }   // IR sensors: active-low, so HIGH = clear
void analogWrite(int, int) {}
unsigned long pulseIn(int, int, unsigned long) { return 0; }
long map(long x, long a, long b, long c, long d) { return (x - a) * (d - c) / (b - a) + c; }

#include "firmware.cpp"   // the sketch under test, copied verbatim

std::map<long, std::string> masks;
std::string phoneMode = "normal";   // normal | cancel | silent
int nextCount = 0;

int main(int argc, char **argv) {
  std::string scenario = argv[1];
  g_root = argv[2];
  if (argc > 3) g_failRenameMask = atoi(argv[3]);
  std::ifstream mf(g_root + "/masks.txt");
  long idx; std::string hex;
  while (mf >> idx >> hex) masks[idx] = hex;
  Serial.onLine = [](const std::string &l) {
    if (l.rfind("#RW_NEXT,", 0) == 0) {
      nextCount++;
      long i = atol(l.c_str() + 9);
      if (phoneMode == "cancel" && nextCount == 2) { Serial.feed("H\n"); Serial.feed("RWX\n"); return; }
      if (phoneMode == "silent") return;
      Serial.feed("H\n");  // a stray heartbeat must be ignored
      Serial.feed("K," + (masks.count(i) ? masks[i] : std::string("0000000000000000")) + "\n");
    }
  };
  if (scenario == "cancel") phoneMode = "cancel";
  if (scenario == "timeout") phoneMode = "silent";
  setup();
  if (scenario == "boot") { std::cout << "BOOT_DONE\n"; return 0; }
  if (scenario == "label") {
    setSignedMotors(120, -120); std::cout << motorAction << "\n";
    setSignedMotors(-120, 120); std::cout << motorAction << "\n";
    return 0;
  }
  std::ifstream cf(g_root + "/command.txt");
  std::string cmd((std::istreambuf_iterator<char>(cf)), std::istreambuf_iterator<char>());
  Serial.feed(cmd);
  for (int i = 0; i < 3; i++) loop();
  std::cout << Serial.out;
  return 0;
}
