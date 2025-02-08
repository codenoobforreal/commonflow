import path from "node:path";
import fsp from "node:fs/promises";
import type { Dirent } from "node:fs";

import { COMMONVIDEOEXT, SUPPORTIMAGEEXT } from "./constants";

export function now() {
  return new Date().getTime();
}

/**
 * name doesn't include ext
 */
export function getFileNameFromPath(filepath: string) {
  return path.parse(filepath).name;
}

export async function getAllVideosFromPath(path: string) {
  return filterVideoFromDirents(
    await fsp.readdir(path, { withFileTypes: true, recursive: true }),
  );
}

export async function getAllImagesWithinDir(path: string) {
  return filterImageFromDirents(
    await fsp.readdir(path, { withFileTypes: true }),
  );
}

export function filterVideoFromDirents(entries: Dirent[]) {
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name !== ".DS_Store" &&
        COMMONVIDEOEXT.includes(path.extname(entry.name).slice(1)),
    )
    .map((entry) => path.join(entry.parentPath, entry.name));
}

export function filterImageFromDirents(entries: Dirent[]) {
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name !== ".DS_Store" &&
        SUPPORTIMAGEEXT.includes(path.extname(entry.name).slice(1)),
    )
    .map((entry) => path.join(entry.parentPath, entry.name));
}
