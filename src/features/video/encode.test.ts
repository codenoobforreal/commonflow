import { describe, expect, test } from "vitest";

import {
  buildFfmpegEncodeVideoCommandArgs,
  buildGetVideoMetadataCommandArgs,
  convertFfprobeResult,
  evaluateEncodePreset,
  getOutputVideoPath,
} from "./encode";

import type {
  EncodeVideoCommandConfig,
  FfprobeResultConvertResult,
  VideoCodec,
  VideoEncodePreset,
  VideoFormat,
  VideoMetaData,
} from "../../types";

describe("video-encode", () => {
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

  describe("getOutputVideoPath", () => {
    test("should return the correct output path when given valid source, dest, and video paths", async () => {
      const source = "/home/user/videos";
      const dest = "/output";
      const video = "/home/user/videos/reels/video1.mp4";
      const result = getOutputVideoPath(source, dest, video);
      expect(result.startsWith("/output/reels/video1")).toBeTruthy();
      expect(result.endsWith(".mp4")).toBeTruthy();
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
      expect(result).toMatchInlineSnapshot(`
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-progress",
          "pipe:2",
          "-i",
          "input.mp4",
          "-vf",
          "format=yuv420p,fps=25",
          "-c:v",
          "libx265",
          "-x265-params",
          "log-level=error",
          "-crf",
          "24",
          "-f",
          "mp4",
          "-preset",
          "veryfast",
          "-c:a",
          "copy",
          "output.mp4",
        ]
      `);
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
      expect(result).toMatchInlineSnapshot(`
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-progress",
          "pipe:2",
          "-i",
          "input.mp4",
          "-vf",
          "format=yuv420p,fps=25,scale=1920:1080",
          "-c:v",
          "libx265",
          "-x265-params",
          "log-level=error",
          "-crf",
          "24",
          "-f",
          "mp4",
          "-preset",
          "veryfast",
          "-c:a",
          "copy",
          "output.mp4",
        ]
      `);
    });
  });
});

describe.todo("compressAllVideosInFolder", () => {});
