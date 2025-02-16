import fsp from "node:fs/promises";
import path from "node:path";

import {
	DEFAULTVIDEOCOMPRESSFPS,
	FHDPIXELS,
	HDPIXELS,
} from "../../constants.js";
import type { VideoType } from "../../types.js";
import {
	getAllVideosWithinPath,
	getFileNameFromPath,
	isErrnoException,
	isPathDirectory,
	now,
	runFfmpegCommand,
	runFfprobeCommand,
} from "../../utils.js";

type Metadata = {
	width: number;
	height: number;
	avg_frame_rate: number;
};

type FfmpegVideoOptions = {
	input: string;
	output: string;
	crf: number;
	width?: number;
	height?: number;
	fps?: number;
};

export async function processCompressVideoTask(
	input: string,
	output: string,
	type: VideoType,
) {
	try {
		const inputIsDir = await isPathDirectory(input);

		if (!inputIsDir) {
			const outputIsDir = await isPathDirectory(output);
			const outputPath = outputIsDir
				? getOutputVideoPath(path.dirname(input), output, input)
				: output;
			await fsp.mkdir(path.dirname(outputPath), { recursive: true });
			await compressVideo(input, outputPath, type);
		}
		await compressMultipleVideos(input, output, type);
	} catch (error) {
		if (isErrnoException(error)) {
			if (error.code === "ENOENT") {
				console.log(`no such ${error.path} path`);
			}
		} else {
			console.log(error);
		}
	}
}
/**
 * single video compression
 * @param input source video full path
 * @param output destination full path
 * @param type video type
 * @returns compression size and duration or undefined
 */
export async function compressVideo(
	input: string,
	output: string,
	type: VideoType,
) {
	const metadataStrArr = await getVideoMetaData(input, [
		"width",
		"height",
		"avg_frame_rate",
	]);

	const shellCommandArgs = buildCompressVideoCommandArgs({
		...evaluateCompressOptions(convertStringMetadataType(metadataStrArr), type),
		input,
		output,
	});

	const result = await runFfmpegCommand(shellCommandArgs);

	if (result) {
		return parseCompressCompleteLog(result);
	}
}

export async function compressMultipleVideos(
	sourceDir: string,
	destDir: string,
	type: VideoType,
) {
	const videos = await getAllVideosWithinPath(sourceDir);

	if (!videos.length) {
		throw new Error("no video to process");
	}

	for (let i = 0; i < videos.length; i++) {
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const videoPath = videos[i]!;
		const numberOfVideos = videos.length;
		const readableIndex = i + 1;

		const outputVideoPath = getOutputVideoPath(sourceDir, destDir, videoPath);
		// ffmpeg won't create folder when run ffmpeg command
		await fsp.mkdir(path.dirname(outputVideoPath), { recursive: true });
		const result = await compressVideo(videoPath, outputVideoPath, type);

		if (result) {
			const readableDuration = durationReadableConvert(result.duration);
			const readableSize = sizeReadableConvert(result.size);
			console.log(
				`finished ${readableIndex}/${numberOfVideos} in ${readableDuration} with ${readableSize}`,
			);
			console.log(`${outputVideoPath}\n`);
		}
	}
}

export function parseCompressCompleteLog(log: string) {
	const outputStat = log.split("\r").pop();
	if (outputStat === "" || outputStat === undefined) {
		throw new Error("failed to get available ffmpeg result message");
	}
	const size = captureLsize(outputStat);
	const duration = captureTime(outputStat);

	if (!size || !duration) {
		throw new Error("failed to capture ffmpeg result message");
	}

	return {
		size,
		duration,
	};
}

export function getOutputVideoPath(
	sourceDir: string,
	destDir: string,
	videoPath: string,
) {
	return path.join(
		destDir,
		path.dirname(path.relative(sourceDir, videoPath)),
		`${getFileNameFromPath(videoPath)}-${now()}.mp4`,
	);
}

export function convertStringMetadataType(data: Record<string, string>) {
	if (!data["width"] || !data["height"] || !data["avg_frame_rate"]) {
		throw new Error("return empty ffprobe result");
	}
	return {
		width: Number.parseInt(data["width"]),
		height: Number.parseInt(data["height"]),
		avg_frame_rate: Number.parseInt(data["avg_frame_rate"]),
	};
}

export function sizeReadableConvert(size: string) {
	const sizeInNumber = Number(size.slice(0, -3));
	const KiBToKB = 1024 / 1000;
	const KiBToMB = KiBToKB / 1000;
	const KiBToGB = KiBToMB / 1000;
	if (sizeInNumber >= (1000 * 1000 * 1000) / 1024) {
		return `${(sizeInNumber * KiBToGB).toFixed(2)}GiB`;
	}
	if (sizeInNumber >= (1000 * 1000) / 1024) {
		return `${(sizeInNumber * KiBToMB).toFixed(2)}MiB`;
	}
	return size.replace("i", "");
}

export function durationReadableConvert(d: string) {
	return d.slice(0, -3);
}

export function captureLsize(str: string) {
	return /Lsize=([\s|\d]+\w+)/.exec(str)?.at(1)?.trim();
}

export function captureTime(str: string) {
	return /time=(\d{2}:\d{2}:\d{2}\.\d{2})/.exec(str)?.at(1);
}

export function buildMetadataCommandArgs(path: string) {
	return [
		"-v",
		"error",
		"-select_streams",
		"v:0",
		"-show_entries",
		"stream:format",
		"-of",
		"default=noprint_wrappers=1:nokey=0",
		path,
	];
}

type VideoMetaDataKeys = Array<"width" | "height" | "avg_frame_rate">;

export async function getVideoMetaData(
	videoPath: string,
	requiredKeys: VideoMetaDataKeys,
) {
	const result = await runFfprobeCommand(buildMetadataCommandArgs(videoPath));
	if (!result) {
		throw new Error("fail when running ffprobe command");
	}
	return filterDataFromFFprobeResult(result, requiredKeys);
}

export function filterDataFromFFprobeResult(
	result: string,
	filterkeys: string[],
) {
	return result
		.split("\n")
		.filter(Boolean)
		.reduce(
			(obj, kvpair) => {
				const kvSplit = kvpair.split("=");
				const key = kvSplit[0];
				const value = kvSplit[1];
				if (!key || !value) {
					throw new Error("failed to parse ffprobe result");
				}
				if (filterkeys.includes(key)) {
					obj[key] = value;
				}
				return obj;
			},
			{} as Record<string, string>,
		);
}
/**
 * crf settings base on https://handbrake.fr/docs/en/1.9.0/workflow/adjust-quality.html
 */
export function evaluateCompressOptions(metadata: Metadata, type = "common") {
	const { width, height, avg_frame_rate } = metadata;

	const options = {
		crf: 24,
	} as {
		crf: number;
		width?: number;
		height?: number;
		fps?: number;
	};

	if (type !== "animate") {
		options.fps = DEFAULTVIDEOCOMPRESSFPS;
	}

	if (avg_frame_rate < DEFAULTVIDEOCOMPRESSFPS) {
		options.fps = avg_frame_rate;
	}

	const pixels = width * height;
	if (pixels > FHDPIXELS) {
		if (width >= height) {
			options.width = 1920;
			options.height = 1080;
		} else {
			options.width = 1080;
			options.height = 1920;
		}
	}
	if (pixels <= HDPIXELS) {
		options.crf = 23;
	}
	return options;
}

export function buildCompressVideoCommandArgs(options: FfmpegVideoOptions) {
	const { input, output, width, height, fps, crf } = options;
	let videoFilterString = "format=yuv420p";
	if (fps) {
		videoFilterString += `,fps=${fps}`;
	}
	if (width || height) {
		videoFilterString += `,scale=${width}:${height}`;
	}

	return [
		"-hide_banner",
		"-i",
		input,
		"-vf",
		videoFilterString,
		"-c:v",
		"libx265",
		"-x265-params",
		"log-level=error",
		"-crf",
		`${crf}`,
		"-f",
		"mp4",
		"-preset",
		"veryfast",
		"-c:a",
		"copy",
		output,
	];
}
