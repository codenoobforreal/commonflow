import path from "node:path";
import fs from "node:fs/promises";

import isInCi from "is-in-ci";

import { afterAll, describe, expect, test } from "vitest";

import {
  evaluateTranscodeOptions,
  runTranscodeVideosSubProgram,
  buildTranscodeVideoCommand,
  lsizeStringCapture,
  timeStringCapture,
  sizeReadableOutput,
  durationReadableOutput,
} from "./transcode-video";

const realOutputDir = path.join(
  import.meta.dirname,
  "../..",
  "test-real-files/outputDir",
);

describe("transcode-videos", () => {
  describe("evaluateTranscodeOptions", () => {
    describe("pixels > FHDPIXELS", () => {
      test("width >= height should add scale 1920*1080 to config", () => {
        expect(
          evaluateTranscodeOptions({ width: 2100, height: 2000 }),
        ).toStrictEqual({
          width: 1920,
          height: 1080,
          crf: 24,
        });
      });
      test("width < height should add scale 1080*1920 to config", () => {
        expect(
          evaluateTranscodeOptions({ width: 2000, height: 2100 }),
        ).toStrictEqual({
          width: 1080,
          height: 1920,
          crf: 24,
        });
      });
    });
    describe("HDPIXELS < pixels <= FHDPIXELS", () => {
      test("no scale add to config", () => {
        expect(
          evaluateTranscodeOptions({ width: 1400, height: 1000 }),
        ).toStrictEqual({
          width: 0,
          height: 0,
          crf: 24,
        });

        expect(
          evaluateTranscodeOptions({ width: 1000, height: 1400 }),
        ).toStrictEqual({
          width: 0,
          height: 0,
          crf: 24,
        });
      });
    });
    describe("pixels <= HDPIXELS", () => {
      test("should change crf to 23", () => {
        expect(
          evaluateTranscodeOptions({ width: 600, height: 900 }),
        ).toStrictEqual({
          width: 0,
          height: 0,
          crf: 23,
        });
      });
    });
  });

  describe("buildTranscodeVideoCommand", () => {
    test("no scale filter when width and height option equals 0", () => {
      expect(
        buildTranscodeVideoCommand({
          input: "",
          output: "",
          fps: 25,
          crf: 24,
          width: 0,
          height: 0,
        }),
      ).not.toContain("scale=");
    });
  });

  describe("lsizeStringCapture", () => {
    test("should capture Lsize value", () => {
      expect(
        lsizeStringCapture(
          "frame=  147 fps= 30 q=28.6 Lsize= 34272KiB time=00:00:05.80 bitrate=6033.6kbits/s speed= 1.2x",
        ),
      ).toBe("34272KiB");
      expect(
        lsizeStringCapture(
          "frame=  147 fps= 30 q=28.6 Lsize=34272KiB time=00:00:05.80 bitrate=6033.6kbits/s speed= 1.2x",
        ),
      ).toBe("34272KiB");
    });
  });

  describe("timeStringCapture", () => {
    test("should capture Lsize value", () => {
      expect(
        timeStringCapture(
          "frame=  147 fps= 30 q=28.6 Lsize= 34272KiB time=00:00:05.80 bitrate=6033.6kbits/s speed= 1.2x",
        ),
      ).toBe("00:00:05.80");
    });
  });

  describe("sizeReadableOutput", () => {
    test("show correct unit", () => {
      expect(sizeReadableOutput("100KiB")).toBe("100KB");
      expect(sizeReadableOutput("976.5625KiB")).toBe("1.00MiB");
      expect(sizeReadableOutput("976562.5KiB")).toBe("1.00GiB");
    });
  });

  describe("durationReadableOutput", () => {
    test("should match format hh:mm:ss", () => {
      expect(durationReadableOutput("01:23:55.03")).toBe("01:23:55");
    });
  });

  describe.skipIf(isInCi)("whole subprogram integration test", () => {
    const emptyInputDir = path.join(
      import.meta.dirname,
      "../..",
      "test-real-files",
    );
    const realInputDir = path.join(
      import.meta.dirname,
      "../..",
      "test-real-files/inputDir",
    );
    test("throw error when input dir isn't available", async () => {
      await expect(
        runTranscodeVideosSubProgram({
          inputDir: "/",
          outputDir: "/notExistDir",
        }),
      ).rejects.toThrowError("outputDir is not available");
    });

    test("throw error when read empty input dir", async () => {
      await expect(
        runTranscodeVideosSubProgram({
          inputDir: emptyInputDir,
          outputDir: undefined,
        }),
      ).rejects.toThrowError(`no videos file in ${emptyInputDir} path`);
    });

    test.skip("should run without throw error", async () => {
      await runTranscodeVideosSubProgram({
        inputDir: realInputDir,
        outputDir: realOutputDir,
      });
      // this expect make sure all is good
      expect(true).toBeTruthy();
    }, 15000); // timeout is needed for long running ffmpeg task
  });
});

afterAll(async () => {
  await fs.rm(realOutputDir, { recursive: true, force: true });
  await fs.mkdir(realOutputDir);
});
