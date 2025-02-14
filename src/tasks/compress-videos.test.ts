import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import fsp from "node:fs/promises";

import { realTestInputPath, realTestOutputPath } from "../path";
import {
	buildCompressVideoCommandArgs,
	captureLsize,
	captureTime,
	compressVideos,
	durationReadableConvert,
	evaluateCompressOptions,
	filterDataFromFFprobeResult,
	sizeReadableConvert,
} from "./compress-videos";

beforeAll(async () => {
	await fsp.mkdir(realTestOutputPath, { recursive: true });
});

afterAll(async () => {
	await fsp.rm(realTestOutputPath, { recursive: true, force: true });
});

describe("transcode-videos", () => {
	describe("evaluateCompressOptions", () => {
		describe("pixels > FHDPIXELS", () => {
			test("width >= height should set to 1080p", () => {
				expect(
					evaluateCompressOptions({
						width: 2100,
						height: 2000,
						avg_frame_rate: 25,
					}),
				).toStrictEqual({
					width: 1920,
					height: 1080,
					crf: 24,
					fps: 25,
				});
			});
			test("width < height should set to 1080p", () => {
				expect(
					evaluateCompressOptions({
						width: 2000,
						height: 2100,
						avg_frame_rate: 25,
					}),
				).toStrictEqual({
					width: 1080,
					height: 1920,
					crf: 24,
					fps: 25,
				});
			});
		});
		describe("HDPIXELS < pixels <= FHDPIXELS", () => {
			test("no change on scale", () => {
				expect(
					evaluateCompressOptions({
						width: 1400,
						height: 1000,
						avg_frame_rate: 25,
					}),
				).toStrictEqual({
					crf: 24,
					fps: 25,
				});

				expect(
					evaluateCompressOptions({
						width: 1000,
						height: 1400,
						avg_frame_rate: 25,
					}),
				).toStrictEqual({
					crf: 24,
					fps: 25,
				});
			});
		});
		describe("pixels <= HDPIXELS", () => {
			test("should change crf to 23 and no scale change", () => {
				expect(
					evaluateCompressOptions({
						width: 600,
						height: 900,
						avg_frame_rate: 25,
					}),
				).toStrictEqual({
					crf: 23,
					fps: 25,
				});
			});
		});
		describe("fps related", () => {
			test("no change on fps when process animate video which fps is higher than default fps", async () => {
				expect(
					evaluateCompressOptions(
						{
							width: 1920,
							height: 1080,
							avg_frame_rate: 60,
						},
						"animate",
					),
				).toStrictEqual({
					crf: 24,
				});
			});

			test("change on fps when process common video", async () => {
				expect(
					evaluateCompressOptions({
						width: 1920,
						height: 1080,
						avg_frame_rate: 60,
					}),
				).toStrictEqual({
					crf: 24,
					fps: 25,
				});
			});

			test("use lower fps when process video which fps is lower than default fps", async () => {
				const lowerFps = 20;

				expect(
					evaluateCompressOptions({
						width: 1920,
						height: 1080,
						avg_frame_rate: lowerFps,
					}),
				).toStrictEqual({
					crf: 24,
					fps: lowerFps,
				});

				expect(
					evaluateCompressOptions(
						{
							width: 1920,
							height: 1080,
							avg_frame_rate: lowerFps,
						},
						"animate",
					),
				).toStrictEqual({
					crf: 24,
					fps: lowerFps,
				});
			});
		});
	});

	describe("buildCompressVideoCommand", () => {
		test("no scale filter when width and height option equals 0", () => {
			expect(
				buildCompressVideoCommandArgs({
					input: "",
					output: "",
					fps: 25,
					crf: 24,
					width: 0,
					height: 0,
				}),
			).not.toContain("scale=");
		});

		test("no fps filter when fps option equals 0", () => {
			expect(
				buildCompressVideoCommandArgs({
					input: "",
					output: "",
					fps: 0,
					crf: 24,
					width: 0,
					height: 0,
				}),
			).not.toContain("fps=");
		});
	});

	describe("captureLsize", () => {
		test("should capture Lsize value", () => {
			expect(
				captureLsize(
					"[out#0/mp4 @ 0x600002b04240] video:4171KiB audio:92KiB subtitle:0KiB other streams:0KiB global headers:2KiB muxing overhead: 0.204286% frame=  147 fps= 30 q=28.6 Lsize= 34272KiB time=00:00:05.80 bitrate=6033.6kbits/s speed= 1.2x",
				),
			).toBe("34272KiB");
			expect(
				captureLsize(
					"[out#0/mp4 @ 0x600002b04240] video:4171KiB audio:92KiB subtitle:0KiB other streams:0KiB global headers:2KiB muxing overhead: 0.204286% frame=  147 fps= 30 q=28.6 Lsize=34272KiB time=00:00:05.80 bitrate=6033.6kbits/s speed= 1.2x",
				),
			).toBe("34272KiB");
		});
	});

	describe("captureTime", () => {
		test("should capture Lsize value", () => {
			expect(
				captureTime(
					"[out#0/mp4 @ 0x600002b04240] video:4171KiB audio:92KiB subtitle:0KiB other streams:0KiB global headers:2KiB muxing overhead: 0.204286% frame=  147 fps= 30 q=28.6 Lsize= 34272KiB time=00:00:05.80 bitrate=6033.6kbits/s speed= 1.2x",
				),
			).toBe("00:00:05.80");
		});
	});

	describe("sizeReadableConvert", () => {
		test("show correct unit", () => {
			expect(sizeReadableConvert("100KiB")).toBe("100KB");
			expect(sizeReadableConvert("976.5625KiB")).toBe("1.00MiB");
			expect(sizeReadableConvert("976562.5KiB")).toBe("1.00GiB");
		});
	});

	describe("durationReadableConvert", () => {
		test("should match format hh:mm:ss", () => {
			expect(durationReadableConvert("01:23:55.03")).toBe("01:23:55");
		});
	});

	describe("filterDataFromFFprobeResult", () => {
		test("should return width,height and fps as string", () => {
			const ffprobeOutputStr =
				"avg_frame_rate=25/1\n" + "width=7680\n" + "height=4086";
			expect(
				filterDataFromFFprobeResult(ffprobeOutputStr, [
					"width",
					"height",
					"avg_frame_rate",
				]),
			).toStrictEqual({
				width: "7680",
				height: "4086",
				avg_frame_rate: "25/1",
			});
		});
	});

	describe("integration test", () => {
		test(
			"compress videos without reject",
			async () => {
				await expect(
					compressVideos({
						inputDir: realTestInputPath,
						outputDir: realTestOutputPath,
						type: "common",
					}),
				).resolves.toBeUndefined();
			},
			// 60s for long run test
			60 * 1000,
		);
	});
});
