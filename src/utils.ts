import fsp from "node:fs/promises";
import path from "node:path";
import { Glob, readableStreamToText, spawn } from "bun";

import { SUPPORTIMAGEEXT, SUPPORTVIDEOEXT } from "./constants";

export function getCurrentDateTime() {
	const date = new Date();
	const year = date.getFullYear();
	const month = zeroPad(date.getMonth() + 1);
	const day = zeroPad(date.getDate());
	const hours = zeroPad(date.getHours());
	const minutes = zeroPad(date.getMinutes());
	const seconds = zeroPad(date.getSeconds());
	return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function zeroPad(num: number) {
	return num.toString().padStart(2, "0");
}

/**
 * name doesn't include ext,filename.mp4 => filename
 */
export function getFileNameFromPath(filepath: string) {
	return path.parse(filepath).name;
}

export async function isPathDirectory(filepath: string) {
	return (await fsp.stat(filepath)).isDirectory();
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

// type util start
interface ErrnoException extends Error {
	errno?: number | undefined;
	code?: string | undefined;
	path?: string | undefined;
	syscall?: string | undefined;
}

// https://stackoverflow.com/a/70887388
export function isErrnoException(error: unknown): error is ErrnoException {
	return (
		isArbitraryObject(error) &&
		error instanceof Error &&
		(typeof error["errno"] === "number" ||
			typeof error["errno"] === "undefined") &&
		(typeof error["code"] === "string" ||
			typeof error["code"] === "undefined") &&
		(typeof error["path"] === "string" ||
			typeof error["path"] === "undefined") &&
		(typeof error["syscall"] === "string" ||
			typeof error["syscall"] === "undefined")
	);
}

type ArbitraryObject = { [key: string]: unknown };

export function isArbitraryObject(
	potentialObject: unknown,
): potentialObject is ArbitraryObject {
	return typeof potentialObject === "object" && potentialObject !== null;
}

// type util end
