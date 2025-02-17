import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";

import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import isInCi from "is-in-ci";

import {
	buildCompressVideoCommandArgs,
	buildMetadataCommandArgs,
	captureLsize,
	captureTime,
	compressAllVideosInFolder,
	compressVideo,
	convertStringMetadataType,
	durationReadableConvert,
	evaluateCompressOptions,
	filterDataFromFFprobeResult,
	getOutputVideoPath,
	getVideoMetaData,
	parseFfmpegResolveMessage,
	printCompleteLog,
	sizeReadableConvert,
} from "./compress";

function setupVideosTempFiles() {
	const salt = Math.random().toString().replace(".", "");
	const tmp = os.tmpdir();
	const tempDir = path.join(tmp, `compress-video-${salt}`);
	const emptyTempDir = path.join(tmp, `compress-video-empty-${salt}`);
	const videoFixturesDir = path.join(
		import.meta.dir,
		"../../../fixtures/videos",
	);
	beforeAll(async () => {
		await fsp.mkdir(tempDir, { recursive: true });
		await fsp.mkdir(emptyTempDir, { recursive: true });
		await fsp.cp(videoFixturesDir, tempDir, { recursive: true });
	});
	afterAll(async () => {
		await fsp.rm(tempDir, { recursive: true, force: true });
		await fsp.rm(emptyTempDir, { recursive: true, force: true });
	});
	return {
		tempDir,
		emptyTempDir,
	};
}

describe("compressVideo", () => {
	describe("getVideoMetaData", () => {
		describe("buildMetadataCommandArgs", () => {
			function concatCommandArgsString(input: string) {
				return `"-v error -select_streams v:0 -show_entries stream:format -of default=noprint_wrappers=1:nokey=0 ${input}"`;
			}
			test("should return the same command arguments", () => {
				let input = "input";
				expect(buildMetadataCommandArgs(input).join(" ")).toMatchInlineSnapshot(
					concatCommandArgsString(input),
				);
				input = "another";
				expect(buildMetadataCommandArgs(input).join(" ")).toMatchInlineSnapshot(
					concatCommandArgsString(input),
				);
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
				).toEqual({
					width: "7680",
					height: "4086",
					avg_frame_rate: "25/1",
				});
			});

			test("shouldn't throw error when result is missing value", () => {
				const ffprobeOutputStr = "avg_frame_rate=\n" + "width=\n" + "height=";
				expect(() => {
					filterDataFromFFprobeResult(ffprobeOutputStr, [
						"width",
						"height",
						"avg_frame_rate",
					]);
				}).not.toThrowError();
				expect(
					filterDataFromFFprobeResult(ffprobeOutputStr, [
						"width",
						"height",
						"avg_frame_rate",
					]),
				).toEqual({
					width: "",
					height: "",
					avg_frame_rate: "",
				});
			});
		});
		describe.skipIf(isInCi)("integration", () => {
			const { tempDir } = setupVideosTempFiles();
			const mp4VideoPath = path.join(tempDir, "video.mp4");
			test("get video metadata successfully", async () => {
				const metadataStrArr = await getVideoMetaData(mp4VideoPath, [
					"width",
					"height",
					"avg_frame_rate",
				]);
				expect(metadataStrArr).toEqual({
					avg_frame_rate: "25/1",
					height: "1080",
					width: "1920",
				});
			});
		});
	});
	describe("buildCompressVideoCommand", () => {
		describe("convertStringMetadataType", () => {
			test("should throw error when input data is empty", () => {
				expect(() => {
					convertStringMetadataType({});
				}).toThrowErrorMatchingInlineSnapshot(`"return empty ffprobe result"`);
			});

			test("should throw error when input data is missing requried field", () => {
				expect(() => {
					convertStringMetadataType({
						width: "1000",
					});
				}).toThrowErrorMatchingInlineSnapshot(`"return empty ffprobe result"`);

				expect(() => {
					convertStringMetadataType({
						width: "1000",
						height: "1000",
					});
				}).toThrowErrorMatchingInlineSnapshot(`"return empty ffprobe result"`);
			});

			test("should return data that convert to number or string", () => {
				expect(
					convertStringMetadataType({
						width: "1000",
						height: "1000",
						avg_frame_rate: "30",
					}),
				).toEqual({
					width: 1000,
					height: 1000,
					avg_frame_rate: 30,
				});
			});
		});
		describe("evaluateCompressOptions", () => {
			describe("pixels > FHDPIXELS", () => {
				test("width >= height should set to 1080p", () => {
					expect(
						evaluateCompressOptions({
							width: 2100,
							height: 2000,
							avg_frame_rate: 25,
						}),
					).toEqual({
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
					).toEqual({
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
					).toEqual({
						crf: 24,
						fps: 25,
					});

					expect(
						evaluateCompressOptions({
							width: 1000,
							height: 1400,
							avg_frame_rate: 25,
						}),
					).toEqual({
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
					).toEqual({
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
					).toEqual({
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
					).toEqual({
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
					).toEqual({
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
					).toEqual({
						crf: 24,
						fps: lowerFps,
					});
				});
			});
		});
		test("no scale filter when width and height omit", () => {
			const commandString = buildCompressVideoCommandArgs({
				input: "input",
				output: "output",
				fps: 25,
				crf: 24,
			}).join(" ");
			expect(commandString).not.toContain("scale=");
			expect(commandString).toMatchInlineSnapshot(
				`"-hide_banner -i input -vf format=yuv420p,fps=25 -c:v libx265 -x265-params log-level=error -crf 24 -f mp4 -preset veryfast -c:a copy output"`,
			);
		});

		test("no fps filter when fps omit", () => {
			const commandString = buildCompressVideoCommandArgs({
				input: "input",
				output: "output",
				crf: 24,
			}).join(" ");
			expect(commandString).not.toContain("fps=");
			expect(commandString).toMatchInlineSnapshot(
				`"-hide_banner -i input -vf format=yuv420p -c:v libx265 -x265-params log-level=error -crf 24 -f mp4 -preset veryfast -c:a copy output"`,
			);
		});
	});
	describe("parseFfmpegResolveMessage", () => {
		const Lsize = "34272KiB";
		const time = "00:00:05.80";
		const text = `[out#0/mp4 @ 0x600002b04240] video:4171KiB audio:92KiB subtitle:0KiB other streams:0KiB global headers:2KiB muxing overhead: 0.204286% frame=  147 fps= 30 q=28.6 Lsize= ${Lsize} time=${time} bitrate=6033.6kbits/s speed= 1.2x`;
		test("should capture Lsize value", () => {
			expect(captureLsize(text)).toBe(Lsize);
		});
		test("should capture time value", () => {
			expect(captureTime(text)).toBe(time);
		});
		test("should return undefined when capturing empty text", () => {
			expect(captureLsize("")).toBeUndefined();
			expect(captureTime("")).toBeUndefined();
		});
		test("throw error when message is empty or undefined after pop", () => {
			expect(() =>
				parseFfmpegResolveMessage(""),
			).toThrowErrorMatchingInlineSnapshot(
				`"failed to get available ffmpeg result message"`,
			);
		});
		test("throw error when capturing nothing", () => {
			expect(() =>
				parseFfmpegResolveMessage("this text will not be capture"),
			).toThrowErrorMatchingInlineSnapshot(
				`"failed to capture ffmpeg result message"`,
			);
		});
		test("return size and duration", () => {
			expect(parseFfmpegResolveMessage(text)).toEqual({
				size: Lsize,
				duration: time,
			});
		});
	});

	describe("getOutputVideoPath", () => {
		test("return string start with the same name of target file end with .mp4", () => {
			const result = getOutputVideoPath("/", "/dest", "/video.mp4");
			expect(result).toStartWith("/dest/video-");
			expect(result).toEndWith(".mp4");
		});

		test("work as well when source and destination directory is the same", () => {
			const result = getOutputVideoPath("/", "/", "/video.mp4");
			expect(result).toStartWith("/video-");
			expect(result).toEndWith(".mp4");
		});
	});

	describe.skipIf(isInCi)("integration", () => {
		const { tempDir } = setupVideosTempFiles();
		const mp4VideoPath = path.join(tempDir, "video.mp4");
		test(
			"return parse result after running compression",
			async () => {
				const outputFullPath = getOutputVideoPath(
					mp4VideoPath,
					tempDir,
					mp4VideoPath,
				);
				const compressResult = await compressVideo(
					mp4VideoPath,
					outputFullPath,
					"common",
				);
				expect(compressResult).toHaveProperty("size");
				expect(compressResult).toHaveProperty("duration");
			},
			30 * 1000,
		);
	});
});

describe.todo("compressAllVideosInFolder", () => {});

describe("printCompleteLog", () => {
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
	test("return void when completeState is undefined", () => {
		const outputVideoPath = "/output";
		expect(printCompleteLog(undefined, outputVideoPath)).toBeUndefined();
		expect(printCompleteLog(undefined, outputVideoPath, 1, 1)).toBeUndefined();
	});
	test("log out message when completeState is set", () => {
		const outputVideoPath = "/output";
		const completeStat = {
			size: "100KiB",
			duration: "01:23:55.03",
		};

		const logSpy = spyOn(console, "log");
		let mockLog = `finished in 01:23:55 with 100KB\n${outputVideoPath}`;
		logSpy.mockImplementationOnce(() => mockLog);
		printCompleteLog(completeStat, outputVideoPath);
		expect(logSpy).toHaveBeenCalledTimes(1);
		expect(logSpy).toHaveBeenCalledWith(mockLog);

		logSpy.mockReset();
		mockLog = `finished 1/1 in 01:23:55 with 100KB\n${outputVideoPath}`;
		logSpy.mockImplementationOnce(() => mockLog);
		printCompleteLog(completeStat, outputVideoPath, 1, 1);
		expect(logSpy).toHaveBeenCalledTimes(1);
		expect(logSpy).toHaveBeenCalledWith(mockLog);
	});
});
