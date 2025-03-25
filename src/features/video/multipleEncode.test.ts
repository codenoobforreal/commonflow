import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ProcessVideoEncodeTaskProps } from "../../types";
import { encodeVideo } from "./encode";
import { encodeAllVideosInFolder } from "./multipleEncode";
import { getAllSupportVideosFromPath, getOutputVideoPath } from "./utils";

vi.mock("./utils", async () => {
  const originalModule =
    await vi.importActual<typeof import("./utils")>("./utils");
  return {
    ...originalModule,
    getAllSupportVideosFromPath: vi.fn(),
    getOutputVideoPath: vi.fn(),
  };
});

vi.mock("./encode", async () => {
  const originalModule =
    await vi.importActual<typeof import("./encode")>("./encode");
  return {
    ...originalModule,
    encodeVideo: vi.fn(() => Promise.resolve()),
  };
});

describe("encodeAllVideosInFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should process all videos in the folder", async () => {
    const props: ProcessVideoEncodeTaskProps = {
      input: "./inputFolder",
      output: "./outputFolder",
      preset: {
        codec: "H.265",
        format: "mp4",
        width: 1920,
        height: 1080,
      },
    };

    const videos = ["./video1.mp4", "./video2.mp4"];
    vi.mocked(getAllSupportVideosFromPath).mockResolvedValue(videos);
    await encodeAllVideosInFolder(props);
    expect(getAllSupportVideosFromPath).toHaveBeenCalledWith(props.input);
    expect(getOutputVideoPath).toHaveBeenCalledTimes(videos.length);
    expect(encodeVideo).toHaveBeenCalledTimes(videos.length);
  });

  test("should throw error if no videos found", async () => {
    vi.mocked(getAllSupportVideosFromPath).mockResolvedValue([]);
    const props: ProcessVideoEncodeTaskProps = {
      input: "./emptyFolder",
      output: "./outputFolder",
      preset: {
        codec: "H.265",
        format: "mp4",
        width: 1920,
        height: 1080,
      },
    };
    await expect(encodeAllVideosInFolder(props)).rejects.toThrow(
      "no video to process",
    );
  });

  test("should throw error if videoPath is empty", async () => {
    vi.mocked(getAllSupportVideosFromPath).mockResolvedValue([
      "./video1.mp4",
      "",
    ]);
    const props: ProcessVideoEncodeTaskProps = {
      input: "./inputFolder",
      output: "./outputFolder",
      preset: {
        codec: "H.265",
        format: "mp4",
        width: 1920,
        height: 1080,
      },
    };
    await expect(encodeAllVideosInFolder(props)).rejects.toThrow(
      "no videoPath",
    );
  });
});
