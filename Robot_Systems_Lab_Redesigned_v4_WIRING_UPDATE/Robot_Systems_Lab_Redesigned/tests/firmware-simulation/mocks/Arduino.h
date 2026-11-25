#pragma once
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <cstdio>
#include <string>
#include <deque>
#include <functional>
typedef uint8_t byte;
#define HIGH 1
#define LOW 0
#define INPUT 0
#define OUTPUT 1
#define A0 14
#define A1 15
#define A2 16
class __FlashStringHelper;
#define F(s) (reinterpret_cast<const __FlashStringHelper *>(s))
unsigned long millis();
void delay(unsigned long ms);
void delayMicroseconds(unsigned int);
void pinMode(int, int);
void digitalWrite(int, int);
int digitalRead(int);
void analogWrite(int, int);
unsigned long pulseIn(int, int, unsigned long);
template <class T, class U, class V> T constrain(T x, U a, V b) { return x < (T)a ? (T)a : (x > (T)b ? (T)b : x); }
long map(long x, long in_min, long in_max, long out_min, long out_max);
using std::abs;
class Print {
 public:
  virtual ~Print() {}
  virtual size_t write(uint8_t c) = 0;
  virtual size_t write(const uint8_t *buf, size_t n) { size_t k = 0; for (size_t i = 0; i < n; i++) k += write(buf[i]); return k; }
  size_t print(const char *s) { return write((const uint8_t *)s, strlen(s)); }
  size_t print(const __FlashStringHelper *s) { return print((const char *)s); }
  size_t print(char c) { return write((uint8_t)c); }
  size_t print(unsigned char v) { return num(v); }
  size_t print(int v) { return num(v); }
  size_t print(unsigned int v) { return num(v); }
  size_t print(long v) { return num(v); }
  size_t print(unsigned long v) { return num(v); }
  template <class T> size_t println(T v) { size_t n = print(v); return n + print("\r\n"); }
  size_t println() { return print("\r\n"); }
  size_t num(long long v) { std::string s = std::to_string(v); return print(s.c_str()); }
};
class SerialMock : public Print {
 public:
  std::deque<char> in;
  std::string out, cur;
  std::function<void(const std::string &)> onLine;
  void begin(long) {}
  int available() { return (int)in.size(); }
  int read() { if (in.empty()) return -1; char c = in.front(); in.pop_front(); return (uint8_t)c; }
  using Print::write;
  size_t write(uint8_t c) override {
    out.push_back((char)c);
    if (c == '\n') { std::string l = cur; if (!l.empty() && l.back() == '\r') l.pop_back(); cur.clear(); if (onLine) onLine(l); }
    else cur.push_back((char)c);
    return 1;
  }
  void feed(const std::string &s) { for (char c : s) in.push_back(c); }
};
extern SerialMock Serial;
