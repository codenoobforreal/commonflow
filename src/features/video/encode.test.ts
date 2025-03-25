import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ProcessVideoEncodeTaskProps } from "../../types";
import {
  buildFfmpegEncodeVideoCommandArgs,
  evaluateEncodePreset,
  runFfmpegCommandWithProgressAnalyze,
} from "../ffmpeg/commands";
import { encodeVideo } from "./encode";
import { getVideoMetaData } from "./metadata";
import { createOutputFolder } from "./utils";

vi.mock("./metadata", async () => {
  const originalModule =
    await vi.importActual<typeof import("./metadata")>("./metadata");
  return {
    ...originalModule,
    getVideoMetaData: vi.fn(),
  };
});
vi.mock("../ffmpeg/commands", async () => {
  const originalModule =
    await vi.importActual<typeof import("../ffmpeg/commands")>(
      "../ffmpeg/commands",
    );
  return {
    ...originalModule,
    buildFfmpegEncodeVideoCommandArgs: vi.fn(),
    evaluateEncodePreset: vi.fn(),
    runFfmpegCommandWithProgressAnalyze: vi.fn(),
  };
});
vi.mock("./utils", async () => {
  const originalModule =
    await vi.importActual<typeof import("./utils")>("./utils");
  return {
    ...originalModule,
    createOutputFolder: vi.fn(),
  };
});

describe("encodeVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should encode video with correct configuration", async () => {
    const props: ProcessVideoEncodeTaskProps = {
      input: "./input.mp4",
      output: "./output",
      preset: {
        codec: "H.265",
        format: "mp4",
        width: 1920,
        height: 1080,
        crf: 24,
        avg_frame_rate: 24,
      },
    };

    await encodeVideo(props);
    expect(getVideoMetaData).toHaveBeenCalledWith(props.input);
    expect(evaluateEncodePreset).toHaveBeenCalled();
    expect(buildFfmpegEncodeVideoCommandArgs).toHaveBeenCalled();
    expect(createOutputFolder).toHaveBeenCalledWith(props.output);
    expect(runFfmpegCommandWithProgressAnalyze).toHaveBeenCalled();
  });
});
