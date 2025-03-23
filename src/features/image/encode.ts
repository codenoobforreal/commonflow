import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getFileNameFromPath } from "../../utils";
import { getAllSupportImagesFromPath } from "./utils";

export async function compressImages(input: string, output: string) {
  const images = await getAllSupportImagesFromPath(input);
  for (const image of images) {
    const outputImageDir = path.join(
      output,
      path.dirname(path.relative(input, image)),
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
