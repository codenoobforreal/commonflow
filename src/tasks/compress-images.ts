import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { getAllImagesWithinPath, getFileNameFromPath } from "../utils";

interface CompressImagesArgs {
	inputDir: string;
	outputDir: string;
}

export async function walkDir(remainingDirs: string[], accDirs: string[] = []) {
	if (remainingDirs.length === 0) {
		return accDirs;
	}
	const currentPath = remainingDirs.pop();
	if (!currentPath) {
		throw new Error("pop element from an empty array");
	}
	const files = await fsp.readdir(currentPath, { withFileTypes: true });
	const dirs = files
		.filter((file) => file.isDirectory())
		.map((dir) => path.join(dir.parentPath, dir.name));
	accDirs.push(currentPath);
	Array.prototype.push.apply(remainingDirs, dirs);
	return walkDir(remainingDirs, accDirs);
}

export async function compressImages(args: CompressImagesArgs) {
	const { inputDir, outputDir } = args;
	const dirs = await walkDir([inputDir]);
	for (const dir of dirs) {
		const images = await getAllImagesWithinPath(dir);
		for (const image of images) {
			await compressImage(
				image,
				path.join(outputDir, path.dirname(path.relative(inputDir, image))),
			);
		}
	}
}

async function compressImage(input: string, outputDir: string) {
	const ext = path.extname(input);
	const originalFilename = getFileNameFromPath(input);

	await fsp.mkdir(outputDir, { recursive: true });
	const outputPath = path.join(outputDir, `${originalFilename}${ext}`);

	const rs = fs.createReadStream(input);
	const ws = fs.createWriteStream(outputPath);
	if (ext === ".jpg") {
		rs.pipe(
			sharp().jpeg({
				mozjpeg: true,
			}),
		).pipe(ws);
	} else if (ext === ".png") {
		rs.pipe(sharp().png({ quality: 80 })).pipe(ws);
	} else {
		console.log(`${ext.slice(1)} hasn't provide compress function`);
	}
}
