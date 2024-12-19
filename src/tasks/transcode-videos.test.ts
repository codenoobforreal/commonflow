import path from "node:path";
import fs from "node:fs/promises";

// import isInCi from "is-in-ci";

import { afterAll, describe, expect, test } from "vitest";

import {
  evaluateTranscodeSettings,
  initialTranscodeConfig,
  runTranscodeVideosSubProgram,
  type TranscodeVideoConfig,
} from "./transcode-video";

const realOutputDir = path.join(
  import.meta.dirname,
  "../..",
  "test-real-files/outputDir",
);

describe("transcode-videos", () => {
  describe("evaluateTranscodeSettings", () => {
    const testArgs = { inputDir: ".", outputDir: "." };
    function setConfigAndEvaluate(
      config: TranscodeVideoConfig,
      w: number,
      h: number,
    ) {
      config.currentInputMetadata.width = w;
      config.currentInputMetadata.height = h;
      evaluateTranscodeSettings(config);
    }

    describe("pixels > FHDPIXELS", () => {
      test("width >= height should add scale 1920*1080 to config", () => {
        const config = initialTranscodeConfig(testArgs);
        setConfigAndEvaluate(config, 2000, 2000);
        expect(config.settings).toStrictEqual({
          videoFilterString: "fps=25,format=yuv420p,scale=1920:1080",
          crf: 24,
        });
      });
      test("width < height should add scale 1080*1920 to config", () => {
        const config = initialTranscodeConfig(testArgs);
        setConfigAndEvaluate(config, 2000, 3000);
        expect(config.settings).toStrictEqual({
          videoFilterString: "fps=25,format=yuv420p,scale=1080:1920",
          crf: 24,
        });
      });
    });
    describe("HDPIXELS < pixels <= FHDPIXELS", () => {
      test("no scale add to config", () => {
        const config = initialTranscodeConfig(testArgs);
        const originalSettings = { ...config.settings };
        setConfigAndEvaluate(config, 1920, 1080);
        expect(config.settings).toStrictEqual(originalSettings);
        setConfigAndEvaluate(config, 1080, 1080);
        expect(config.settings).toStrictEqual(originalSettings);
        setConfigAndEvaluate(config, 1280, 721);
        expect(config.settings).toStrictEqual(originalSettings);
      });
    });
    describe("pixels <= HDPIXELS", () => {
      test("should change crf to 23", () => {
        const config = initialTranscodeConfig(testArgs);
        setConfigAndEvaluate(config, 1280, 720);
        expect(config.settings).toStrictEqual({
          videoFilterString: "fps=25,format=yuv420p",
          crf: 23,
        });
        setConfigAndEvaluate(config, 900, 600);
        expect(config.settings).toStrictEqual({
          videoFilterString: "fps=25,format=yuv420p",
          crf: 23,
        });
      });
    });
  });

  describe("integration with whole subprogram", () => {
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
