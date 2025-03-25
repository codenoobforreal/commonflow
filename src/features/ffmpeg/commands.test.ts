import { describe, expect, test } from "vitest";
import type {
  EncodeVideoCommandConfig,
  VideoCodec,
  VideoEncodePreset,
  VideoFormat,
  VideoMetaData,
} from "../../types";
import {
  buildFfmpegEncodeVideoCommandArgs,
  buildGetVideoMetadataCommandArgs,
  evaluateEncodePreset,
} from "./commands";

describe("buildGetVideoMetadataCommandArgs", () => {
  function concatCommandArgsString(input: string) {
    return `"-v error -select_streams v:0 -show_entries stream:format -of default=noprint_wrappers=1:nokey=0 ${input}"`;
  }
  test("should return the same command arguments", () => {
    let input = "input";
    expect(
      buildGetVideoMetadataCommandArgs(input).join(" "),
    ).toMatchInlineSnapshot(concatCommandArgsString(input));
    input = "another";
    expect(
      buildGetVideoMetadataCommandArgs(input).join(" "),
    ).toMatchInlineSnapshot(concatCommandArgsString(input));
  });
});

describe("buildFfmpegEncodeVideoCommandArgs", () => {
  test("should build command with basic configuration", () => {
    const config: EncodeVideoCommandConfig = {
      input: "input.mp4",
      output: "output.mp4",
      crf: 24,
      avg_frame_rate: 25,
    };
    const result = buildFfmpegEncodeVideoCommandArgs(config);
    expect(result.join(" ")).toMatchInlineSnapshot(
      `"-hide_banner -loglevel error -progress pipe:2 -i input.mp4 -vf format=yuv420p,fps=25 -c:v libx265 -x265-params log-level=error -crf 24 -f mp4 -preset veryfast -c:a copy output.mp4"`,
    );
  });
  test("should include width and height in video filter chain", () => {
    const config: EncodeVideoCommandConfig = {
      input: "input.mp4",
      output: "output.mp4",
      width: 1920,
      height: 1080,
      crf: 24,
      avg_frame_rate: 25,
    };
    const result = buildFfmpegEncodeVideoCommandArgs(config);
    expect(result.join(" ")).toMatchInlineSnapshot(
      `"-hide_banner -loglevel error -progress pipe:2 -i input.mp4 -vf format=yuv420p,fps=25,scale=1920:1080 -c:v libx265 -x265-params log-level=error -crf 24 -f mp4 -preset veryfast -c:a copy output.mp4"`,
    );
  });
});

describe("evaluateEncodePreset", () => {
  function createMockMetadata({
    width = 1920,
    height = 1080,
    avg_frame_rate = 25,
    nb_frames = 100,
    duration = 10,
  }: {
    width?: number;
    height?: number;
    avg_frame_rate?: number;
    nb_frames?: number;
    duration?: number;
  } = {}): VideoMetaData {
    return {
      width,
      height,
      avg_frame_rate,
      nb_frames,
      duration,
    };
  }
  function createMockPreset({
    width = 1920,
    height = 1080,
    avg_frame_rate = 25,
    codec = "H.265",
    format = "mp4",
  }: {
    width?: number;
    height?: number;
    avg_frame_rate?: number;
    codec?: VideoCodec;
    format?: VideoFormat;
  } = {}): VideoEncodePreset {
    return {
      width,
      height,
      avg_frame_rate,
      codec,
      format,
    };
  }

  test("should return correct configuration for FHD video", () => {
    const metadata = createMockMetadata();
    const preset = createMockPreset();
    const result = evaluateEncodePreset(metadata, preset);
    expect(result).toEqual({
      codec: "H.265",
      format: "mp4",
      crf: 24,
      avg_frame_rate: 25,
    });
  });
  test("should return correct configuration for HD video", () => {
    const metadata = createMockMetadata({ width: 1280, height: 720 });
    const preset = createMockPreset({ avg_frame_rate: 24 });
    const result = evaluateEncodePreset(metadata, preset);
    expect(result).toEqual({
      codec: "H.265",
      format: "mp4",
      crf: 23,
      avg_frame_rate: 24,
    });
  });
  test("should handle videos above FHD", () => {
    const metadata = createMockMetadata({
      width: 3840,
      height: 2160,
    });
    const preset = createMockPreset();
    const result = evaluateEncodePreset(metadata, preset);

    expect(result).toEqual({
      codec: "H.265",
      format: "mp4",
      width: 1920,
      height: 1080,
      crf: 24,
      avg_frame_rate: 25,
    });
  });
});
