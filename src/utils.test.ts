import { test, expect, describe } from "vitest";
import { formatFileSize, formatDuration } from "./utils";

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
});
