import path from "node:path";
import { Glob } from "bun";

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

export async function getAllVideosWithinPath(filepath: string) {
	const exts = SUPPORTVIDEOEXT.join(",");
	const videoGlob = new Glob(`**/*.\{${exts}\}`);
	const result = [];
	for await (const video of videoGlob.scan(filepath)) {
		result.push(path.join(filepath, video));
	}
	return result;
}

export async function getAllImagesWithinPath(filepath: string) {
	const exts = SUPPORTIMAGEEXT.join(",");
	const imageGlob = new Glob(`**/*.\{${exts}\}`);
	const result = [];
	for await (const image of imageGlob.scan(filepath)) {
		result.push(path.join(filepath, image));
	}
	return result;
}
