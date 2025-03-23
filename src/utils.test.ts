import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  formatSeconds,
  getCurrentDateTime,
  getFileExt,
  getFileNameFromPath,
  isErrnoException,
} from "./utils";

describe("utils test", () => {
  describe("getFileNameFromPath", () => {
    test("should extract the correct filename from a standard path", () => {
      const filePath = "/user/documents/example.txt";
      const expectedFileName = "example";
      expect(getFileNameFromPath(filePath)).toBe(expectedFileName);
    });
    test("should handle a filename without an extension", () => {
      const filePath = "/user/data/file";
      const expectedFileName = "file";
      expect(getFileNameFromPath(filePath)).toBe(expectedFileName);
    });
    test("should handle a path with multiple dots in the filename", () => {
      const filePath = "/user/configs/settings.v1.0.0.json";
      const expectedFileName = "settings.v1.0.0";
      expect(getFileNameFromPath(filePath)).toBe(expectedFileName);
    });
    test.todo(
      "should handle a path with back slashes (Windows-style paths)",
      () => {
        const filePath = "C:\\user\\documents\\example.txt";
        // TODO: actual receive: C:\user\documents\example
        const expectedFileName = "example";
        expect(getFileNameFromPath(filePath)).toBe(expectedFileName);
      },
    );
    test("should handle a path that is just the root directory", () => {
      const filePath = "/";
      const expectedFileName = "";
      expect(getFileNameFromPath(filePath)).toBe(expectedFileName);
    });
    test("should handle an empty string path", () => {
      const filePath = "";
      const expectedFileName = "";
      expect(getFileNameFromPath(filePath)).toBe(expectedFileName);
    });
    test("should handle a path with no filename", () => {
      const filePath = "/user/documents/";
      const expectedFileName = "";
      expect(getFileNameFromPath(filePath)).toBe(expectedFileName);
    });
    test("should handle a relative path", () => {
      const filePath = "./config/settings.json";
      const expectedFileName = "settings";
      expect(getFileNameFromPath(filePath)).toBe(expectedFileName);
    });
  });

  describe("getFileExt", () => {
    test("should return the correct file extension for a simple filename", () => {
      const filepath = "file.txt";
      expect(getFileExt(filepath)).toBe("txt");
    });
    test("should return the correct extension for a full path", () => {
      const filepath = "myfolder/document.pdf";
      expect(getFileExt(filepath)).toBe("pdf");
    });
    test("should return an empty string for a filename without an extension", () => {
      const filepath = "readme";
      expect(getFileExt(filepath)).toBe("");
    });
    test("should handle multiple dots in filename correctly", () => {
      const filepath = "image.backup.tar.gz";
      expect(getFileExt(filepath)).toBe("gz");
    });
    test("should return an empty string for an empty filepath", () => {
      const filepath = "";
      expect(getFileExt(filepath)).toBe("");
    });
  });

  describe("getCurrentDateTime", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    test("should return the correct formatted datetime string", () => {
      vi.setSystemTime(new Date("2000-01-01T00:00:00"));
      const expected = "20000101000000";
      const result = getCurrentDateTime();
      expect(result).toBe(expected);
    });
    test("should handle zero padding for single-digit month and day", () => {
      vi.setSystemTime(new Date(2023, 0, 5, 9, 3, 7)); // 2023-01-05 09:03:07
      const expected = "20230105090307";
      const result = getCurrentDateTime();
      expect(result).toBe(expected);
    });
    test("should handle edge cases where month is December (12) and day is 31", () => {
      vi.setSystemTime(new Date(2023, 11, 31, 23, 59, 59)); // 2023-12-31 23:59:59
      const expected = "20231231235959";
      const result = getCurrentDateTime();
      expect(result).toBe(expected);
    });
  });

  describe("formatSeconds", () => {
    test('should format 0 seconds to "00:00:00"', () => {
      expect(formatSeconds(0)).toBe("00:00:00");
    });
    test('should format 59 seconds to "00:00:59"', () => {
      expect(formatSeconds(59)).toBe("00:00:59");
    });
    test('should format 60 seconds to "00:01:00"', () => {
      expect(formatSeconds(60)).toBe("00:01:00");
    });
    test('should format 3599 seconds to "00:59:59"', () => {
      expect(formatSeconds(3599)).toBe("00:59:59");
    });
    test('should format 3600 seconds to "01:00:00"', () => {
      expect(formatSeconds(3600)).toBe("01:00:00");
    });
    test('should format 3661 seconds to "01:01:01"', () => {
      expect(formatSeconds(3661)).toBe("01:01:01");
    });
    test('should format 86399 seconds to "23:59:59"', () => {
      expect(formatSeconds(86399)).toBe("23:59:59");
    });
    test("should format a very large number of seconds", () => {
      expect(formatSeconds(25 * 3600 + 123)).toBe("25:02:03");
    });
    test("should correctly handle values beyond 24 hours", () => {
      expect(formatSeconds(86400)).toBe("24:00:00");
    });
  });

  describe("isErrnoException", () => {
    test("should match real instance of isErrnoException", () => {
      const mockErrnoException = {
        errno: 1,
        code: "EACCES",
        path: "/some/path",
        syscall: "open",
        message: "Permission denied",
        stack: "Error: Permission denied",
      };
      Object.setPrototypeOf(mockErrnoException, Error.prototype);
      expect(isErrnoException(mockErrnoException)).toBe(true);
    });

    test("should return true when invoke with standard Error", () => {
      const nonErrnoError = new Error("Some other error");
      expect(isErrnoException(nonErrnoError)).toBe(true);
    });

    test("should return false when invoke with normal object", () => {
      const mockObject = {
        errno: 1,
        code: "EACCES",
        path: "/some/path",
        syscall: "open",
      };
      Object.setPrototypeOf(mockObject, Object.prototype);
      expect(isErrnoException(mockObject)).toBe(false);
    });

    test("check for partial properties", async () => {
      const partialMockErrnoException = {
        errno: 2,
        code: "ENOENT",
      };
      Object.setPrototypeOf(partialMockErrnoException, Error.prototype);
      expect(isErrnoException(partialMockErrnoException)).toBe(true);

      const minimalMockErrnoException = {
        errno: 2,
      };
      Object.setPrototypeOf(minimalMockErrnoException, Error.prototype);
      expect(isErrnoException(minimalMockErrnoException)).toBe(true);

      const invalidTypeMockErrnoException = {
        errno: "invalid",
        code: 123,
      };
      Object.setPrototypeOf(invalidTypeMockErrnoException, Error.prototype);
      expect(isErrnoException(invalidTypeMockErrnoException)).toBe(false);
    });
  });
});
