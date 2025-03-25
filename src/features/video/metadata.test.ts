import { beforeEach, describe, expect, test, vi } from "vitest";
import type { FfprobeResultConvertResult } from "../../types";
import {
  buildGetVideoMetadataCommandArgs,
  runFfprobeCommand,
} from "../ffmpeg/commands";
import { convertFfprobeResult, getVideoMetaData } from "./metadata";

vi.mock("../ffmpeg/commands", async () => {
  const originalModule =
    await vi.importActual<typeof import("../ffmpeg/commands")>(
      "../ffmpeg/commands",
    );
  return {
    ...originalModule,
    buildGetVideoMetadataCommandArgs: vi.fn(),
    runFfprobeCommand: vi.fn(),
  };
});

describe("convertFfprobeResult", () => {
  test("should correctly parse all expected fields", () => {
    const input = `width=720\nheight=480\nduration=100.5\nnb_frames=2400\navg_frame_rate=24/1\n`;
    const expected: FfprobeResultConvertResult = {
      width: 720,
      height: 480,
      duration: 100.5,
      nb_frames: 2400,
      avg_frame_rate: 24,
    };
    const result = convertFfprobeResult(input);
    expect(result).toEqual(expected);
  });
  test("should handle missing fields", () => {
    const input = `height=480\nduration=100.5\navg_frame_rate=24/1`.trim();
    const expected: Partial<FfprobeResultConvertResult> = {
      height: 480,
      duration: 100.5,
      avg_frame_rate: 24,
    };
    const result = convertFfprobeResult(input);
    expect(result).toEqual(expected);
  });
  test("should throw error for invalid lines", () => {
    const input = "invalid_line";
    expect(() => convertFfprobeResult(input)).toThrow(
      "failed to extract info from ffprobe result",
    );
  });
  test("should correctly parse avg_frame_rate", () => {
    const input = "avg_frame_rate=33152000/1105061";
    const expected: Partial<FfprobeResultConvertResult> = {
      avg_frame_rate: 30,
    };
    const result = convertFfprobeResult(input);
    expect(result.avg_frame_rate).toBeCloseTo(
      expected.avg_frame_rate as number,
      2,
    );
  });
});

describe("getVideoMetaData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return metadata when ffprobe succeeds", async () => {
    const videoPath = "./test.mp4";
    const commandReturn = {
      out: `width=720\n`,
      err: "",
    };
    vi.mocked(runFfprobeCommand).mockResolvedValueOnce(commandReturn);
    const metadata = await getVideoMetaData(videoPath);
    expect(metadata).toEqual({
      width: 720,
    });
    expect(buildGetVideoMetadataCommandArgs).toHaveBeenCalled();
    expect(runFfprobeCommand).toHaveBeenCalled();
  });
  test("should throw error when ffprobe fails", async () => {
    const videoPath = "./nonexistent.mp4";
    vi.mocked(runFfprobeCommand).mockRejectedValue(new Error("No such file"));
    await expect(getVideoMetaData(videoPath)).rejects.toThrow("No such file");
    expect(buildGetVideoMetadataCommandArgs).toHaveBeenCalled();
  });
  test("should throw error when ffprobe output is empty", async () => {
    vi.mocked(runFfprobeCommand).mockImplementationOnce(async () => ({
      out: "",
      err: "ffprobe error",
    }));
    const videoPath = "./test.mp4";
    await expect(getVideoMetaData(videoPath)).rejects.toThrow("ffprobe error");
    expect(buildGetVideoMetadataCommandArgs).toHaveBeenCalled();
  });
});
