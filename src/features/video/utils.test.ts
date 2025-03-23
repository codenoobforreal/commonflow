import { glob, type Path } from "glob";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SUPPORT_VIDEO_EXT } from "../../constants";
import { isVideoFile } from "../../utils";
import { getAllSupportVideosFromPath } from "./utils";

vi.mock("glob");
vi.mock("../../utils");

describe("getAllSupportVideosFromPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test("should correctly return a list of video files", async () => {
    const mockFiles = [
      {
        fullpath: () => "test1.mp4",
      },
      {
        fullpath: () => "test2.jpg",
      },
      {
        fullpath: () => "test3.mkv",
      },
    ];
    vi.mocked(glob).mockResolvedValue(mockFiles as Path[]);
    vi.mocked(isVideoFile).mockImplementation(async (filepath) => {
      return filepath.endsWith(".mp4") || filepath.endsWith(".mkv");
    });
    const dir = "./testDir";
    const files = await getAllSupportVideosFromPath(dir);
    expect(files).toEqual(["test1.mp4", "test3.mkv"]);
    expect(glob).toHaveBeenCalledWith(`**/*.{${SUPPORT_VIDEO_EXT.join(",")}}`, {
      nodir: true,
      cwd: dir,
      withFileTypes: true,
    });
  });
  test("should return an empty array if no video files are found", async () => {
    const mockFiles = [
      {
        fullpath: () => "test1.txt",
      },
    ];
    vi.mocked(glob).mockResolvedValue(mockFiles as Path[]);
    vi.mocked(isVideoFile).mockResolvedValue(false);
    const dir = "./testDir";
    const result = await getAllSupportVideosFromPath(dir);
    expect(result).toEqual([]);
  });
  test("should handle an empty directory", async () => {
    const mockFiles: Path[] = [];
    vi.mocked(glob).mockResolvedValue(mockFiles);
    const dir = "./emptyDir";
    const result = await getAllSupportVideosFromPath(dir);
    expect(result).toEqual([]);
  });
});
