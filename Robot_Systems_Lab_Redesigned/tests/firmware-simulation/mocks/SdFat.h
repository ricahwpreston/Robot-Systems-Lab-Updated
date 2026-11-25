#pragma once
#include <string>
#include <cstdio>
#include <unistd.h>
#include "Arduino.h"
#define O_RDONLY 0x01
#define O_RDWR 0x02
#define O_CREAT 0x04
#define O_AT_END 0x08
#define O_TRUNC 0x10
#define SHARED_SPI 0
#define SD_SCK_MHZ(x) (x)
template <int A, int B, int C> class SoftSpiDriver {};
struct SdSpiConfigT {};
#define SdSpiConfig(...) SdSpiConfigT()
extern std::string g_root;
extern int g_renameCalls;
extern int g_failRenameMask;   // bit n set: the n-th rename call (0-based) fails
inline std::string fullPath(const char *p) { return g_root + "/" + p; }
class File32 : public Print {
  FILE *fp = nullptr;
 public:
  File32() {}
  explicit File32(FILE *f) : fp(f) {}
  File32(const File32 &) = delete;
  File32 &operator=(const File32 &) = delete;
  File32(File32 &&o) noexcept : fp(o.fp) { o.fp = nullptr; }
  File32 &operator=(File32 &&o) noexcept { if (fp) fclose(fp); fp = o.fp; o.fp = nullptr; return *this; }
  ~File32() { if (fp) fclose(fp); }
  explicit operator bool() const { return fp != nullptr; }
  bool close() { if (fp) fclose(fp); fp = nullptr; return true; }
  void flush() { if (fp) fflush(fp); }
  bool sync() { return fp && fflush(fp) == 0; }
  uint32_t fileSize() { long p = ftell(fp); fseek(fp, 0, SEEK_END); long e = ftell(fp); fseek(fp, p, SEEK_SET); return (uint32_t)e; }
  int available() { long p = ftell(fp); fseek(fp, 0, SEEK_END); long e = ftell(fp); fseek(fp, p, SEEK_SET); return (int)(e - p); }
  int read() { int c = fgetc(fp); return c == EOF ? -1 : c; }
  int read(void *buf, size_t n) { return (int)fread(buf, 1, n, fp); }
  using Print::write;
  size_t write(uint8_t c) override { return fputc(c, fp) == EOF ? 0 : 1; }
  size_t write(const uint8_t *buf, size_t n) override { return fwrite(buf, 1, n, fp); }
};
class SdFat32 {
 public:
  bool begin(SdSpiConfigT) { return true; }
  bool exists(const char *p) { return access(fullPath(p).c_str(), F_OK) == 0; }
  File32 open(const char *p, int flags) {
    const char *mode = "rb";
    if (flags & O_TRUNC) mode = "wb+";
    else if (flags & O_AT_END) mode = "ab+";
    else if (flags & O_RDWR) mode = exists(p) ? "rb+" : "wb+";
    return File32(fopen(fullPath(p).c_str(), mode));
  }
  bool remove(const char *p) { return ::remove(fullPath(p).c_str()) == 0; }
  bool rename(const char *a, const char *b) {
    int n = g_renameCalls++;
    if (g_failRenameMask & (1 << n)) return false;
    if (exists(b)) return false;  // FAT rename refuses an existing destination
    return ::rename(fullPath(a).c_str(), fullPath(b).c_str()) == 0;
  }
};
