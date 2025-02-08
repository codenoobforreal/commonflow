import { describe, expect, test } from "vitest";

import { filterVideoFromDirents, filterImageFromDirents } from "./utils";

function mockDirent(name: string, parentPath: string, isFile: boolean = true) {
  return {
    name,
    path: parentPath + name,
    parentPath,
    isFile: () => isFile,
    isDirectory: () => !isFile,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  };
}

function createMacosDSStoreDirent(parentPath: string) {
  return mockDirent(".DS_Store", parentPath);
}

function createFolderDirent(name: string) {
  let parentPathArr = name.split("/").slice(1, -1);
  if (parentPathArr.length === 0) {
    parentPathArr = [""];
  }
  return mockDirent(name, "/" + parentPathArr.join("/"), false);
}

describe("utils function", () => {
  describe("filterVideoFromDirents", () => {
    test("should filter video files in one level structure", () => {
      const entries = [
        mockDirent("test.avi", "/"),
        mockDirent("test.txt", "/"),
        mockDirent("test.mp4", "/"),
        mockDirent("test.mov", "/"),
        createMacosDSStoreDirent("/"),
      ];
      const result = filterVideoFromDirents(entries);
      expect(result).toHaveLength(3);
      expect(result).not.toContain("/test.txt");
      expect(result).not.toContain(".DS_Store");
    });

    test("should filter video files in multiple level structure", () => {
      const entries = [
        mockDirent("test.avi", "/"),
        mockDirent("test.txt", "/"),
        createMacosDSStoreDirent("/"),
        createFolderDirent("/folder"),
        mockDirent("test.mp4", "/folder/"),
        mockDirent("test.mov", "/folder/"),
        createMacosDSStoreDirent("/folder/"),
      ];
      const result = filterVideoFromDirents(entries);
      expect(result).toHaveLength(3);
      expect(result).not.toContain("/test.txt");
      expect(result).not.toContain(".DS_Store");
    });
  });
  describe("filterImageFromDirents", () => {
    test("should filter image files", () => {
      const entries = [
        mockDirent("test.avi", "/"),
        mockDirent("test.jpg", "/"),
        mockDirent("test.png", "/"),
        mockDirent("test.mov", "/"),
        createMacosDSStoreDirent("/"),
      ];
      const result = filterImageFromDirents(entries);
      expect(result).toHaveLength(2);
      expect(result).not.toContain("/test.avi");
      expect(result).not.toContain("/test.mov");
      expect(result).not.toContain(".DS_Store");
    });
  });
});
