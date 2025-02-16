import path from "node:path";
import { Glob, readableStreamToText, spawn } from "bun";

import { SUPPORTIMAGEEXT, SUPPORTVIDEOEXT } from "./constants";

export function now() {
	return new Date().getTime();
}

/**
 * name doesn't include ext
 */
export function getFileNameFromPath(filepath: string) {
	return path.parse(filepath).name;
}

async function globScanPath(filepath: string, glob: Glob) {
	const result = [];
	for await (const file of glob.scan(filepath)) {
		result.push(file);
	}
	return result;
}

export async function getAllVideosWithinPath(filepath: string) {
	const exts = SUPPORTVIDEOEXT.join(",");
	const videoGlob = new Glob(`**/*.\{${exts}\}`);
	return (await globScanPath(filepath, videoGlob)).map((res) =>
		path.join(filepath, res),
	);
}

export async function getAllImagesWithinPath(filepath: string) {
	const exts = SUPPORTIMAGEEXT.join(",");
	const imageGlob = new Glob(`**/*.\{${exts}\}`);
	return (await globScanPath(filepath, imageGlob)).map((res) =>
		path.join(filepath, res),
	);
}

export async function runFfprobeCommand(commandArgs: string[]) {
	try {
		const { stdout } = spawn(["ffprobe", ...commandArgs]);
		return await readableStreamToText(stdout);
	} catch (error) {
		console.log(error);
	}
}

export async function runFfmpegCommand(commandArgs: string[]) {
	try {
		const { stderr } = spawn(["ffmpeg", ...commandArgs], {
			stderr: "pipe",
		});
		return await readableStreamToText(stderr);
	} catch (error) {
		console.log(error);
	}
}
