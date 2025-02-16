import { describe, expect, test } from "bun:test";

import {
	buildCompressVideoCommandArgs,
	buildMetadataCommandArgs,
	captureLsize,
	captureTime,
	convertStringMetadataType,
	durationReadableConvert,
	evaluateCompressOptions,
	filterDataFromFFprobeResult,
	getOutputVideoPath,
	sizeReadableConvert,
} from "./compress";

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

describe("buildCompressVideoCommand", () => {
	test("no scale filter when width and height omit", () => {
		expect(
			buildCompressVideoCommandArgs({
				input: "input",
				output: "output",
				fps: 25,
				crf: 24,
			}).join(" "),
		).toMatchInlineSnapshot(
			`"-hide_banner -i input -vf format=yuv420p,fps=25 -c:v libx265 -x265-params log-level=error -crf 24 -f mp4 -preset veryfast -c:a copy output"`,
		);
	});

	test("no fps filter when fps omit", () => {
		expect(
			buildCompressVideoCommandArgs({
				input: "input",
				output: "output",
				crf: 24,
			}).join(" "),
		).toMatchInlineSnapshot(
			`"-hide_banner -i input -vf format=yuv420p -c:v libx265 -x265-params log-level=error -crf 24 -f mp4 -preset veryfast -c:a copy output"`,
		);
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
		).toEqual({
			width: "7680",
			height: "4086",
			avg_frame_rate: "25/1",
		});
	});

	test("should throw error when input result is wired", () => {
		expect(() => {
			filterDataFromFFprobeResult("=value", [
				"width",
				"height",
				"avg_frame_rate",
			]);
		}).toThrowErrorMatchingInlineSnapshot(`"failed to parse ffprobe result"`);

		expect(() => {
			filterDataFromFFprobeResult("key=", [
				"width",
				"height",
				"avg_frame_rate",
			]);
		}).toThrowErrorMatchingInlineSnapshot(`"failed to parse ffprobe result"`);
	});
});

describe("buildMetadataCommandArgs", () => {
	test("should return consisten string", () => {
		expect(buildMetadataCommandArgs("input").join(" ")).toMatchInlineSnapshot(
			`"-v error -select_streams v:0 -show_entries stream:format -of default=noprint_wrappers=1:nokey=0 input"`,
		);
	});
});

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
