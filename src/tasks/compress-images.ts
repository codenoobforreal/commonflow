import path from "node:path";
import type { Dirent } from "node:fs";
import fsp from "node:fs/promises";
import fs from "node:fs";

import sharp from "sharp";

import { getAllImagesWithinDir, getFileNameFromPath } from "../utils";

interface CompressImagesArgs {
  inputDir: string;
  outputDir: string;
}

async function dfsWalkDirFromPath(filepath: string) {
  const dirPathes: string[] = [];

  await walk(filepath);

  async function walk(filepath: string) {
    const files = await fsp.readdir(filepath, { withFileTypes: true });

    for (let j = 0; j < files.length; j++) {
      const file = files[j] as Dirent;
      if (file.isDirectory()) {
        await walk(path.join(file.parentPath, file.name));
      }
      if (j === files.length - 1) {
        dirPathes.push(file.parentPath);
      }
    }
  }

  return dirPathes;
}

export async function compressImages(args: CompressImagesArgs) {
  const { inputDir, outputDir } = args;

  const dirs = await dfsWalkDirFromPath(inputDir);

  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i] as string;

    const images = await getAllImagesWithinDir(dir);

    for (let j = 0; j < images.length; j++) {
      const input = images[j] as string;

      await compressImage(
        input,
        path.join(outputDir, path.dirname(path.relative(inputDir, input))),
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
