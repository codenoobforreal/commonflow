import { test, expect, describe } from "vitest";
import {
  formatFileSize,
  formatDuration,
  formatFfmpegTimeString,
} from "./utils";

describe("utils function", () => {
  describe("formatFileSize", () => {
    let fileSize: number;
    test("size < 1000", () => {
      fileSize = 500;
      expect(formatFileSize(fileSize)).toBe(`${fileSize}B`);
    });
    test("size < 1000_000", () => {
      fileSize = 500_000;
      expect(formatFileSize(fileSize)).toBe(`${fileSize / 1000}KB`);
    });
    test("size < 1000_000_000", () => {
      fileSize = 500_000_000;
      expect(formatFileSize(fileSize)).toBe(`${fileSize / 1000_000}.00MB`);
    });
    test("size < 1000_000_000_000", () => {
      fileSize = 500_000_000_000;
      expect(formatFileSize(fileSize)).toBe(`${fileSize / 1000_000_000}.00GB`);
    });
  });
  describe("formatDuration", () => {
    test("duration < 60", () => {
      expect(formatDuration(50)).toBe(`50s`);
    });
    test("duration < 3600", () => {
      expect(formatDuration(150)).toBe(`2m30s`);
    });
    test("duration >= 3600", () => {
      expect(formatDuration(3700)).toBe(`1h1m40s`);
    });
  });
  describe("formatFfmpegTimeString", () => {
    test("discard all meaningless zero", () => {
      expect(formatFfmpegTimeString("00:00:05.80")).toBe("05.80");
      expect(formatFfmpegTimeString("00:00:50.80")).toBe("50.80");
      expect(formatFfmpegTimeString("00:10:05.80")).toBe("10:05.80");
      expect(formatFfmpegTimeString("00:01:05.80")).toBe("01:05.80");
      expect(formatFfmpegTimeString("10:10:05.80")).toBe("10:10:05.80");
      expect(formatFfmpegTimeString("01:10:05.80")).toBe("01:10:05.80");
    });
  });
});
