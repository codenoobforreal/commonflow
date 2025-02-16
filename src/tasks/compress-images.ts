import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { getAllImagesWithinPath, getFileNameFromPath } from "../utils";

interface CompressImagesArgs {
	inputDir: string;
	outputDir: string;
}

export async function compressImages(args: CompressImagesArgs) {
	const { inputDir, outputDir } = args;
	const images = await getAllImagesWithinPath(inputDir);
	for (const image of images) {
		const outputImageDir = path.join(
			outputDir,
			path.dirname(path.relative(inputDir, image)),
		);
		await compressImage(image, outputImageDir);
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
