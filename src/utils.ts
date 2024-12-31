import path from "node:path";
import fs, { constants } from "node:fs/promises";
import type { Dirent } from "node:fs";

import { COMMONVIDEOEXT } from "./constants";

export function formatFileSize(byte: number) {
  if (byte < 1000) {
    return `${byte}B`;
  } else if (byte < 1000000) {
    return `${byte / 1000}KB`;
  } else if (byte < 1000000000) {
    return `${(byte / 1000000).toFixed(2)}MB`;
  } else {
    return `${(byte / 1000000000).toFixed(2)}GB`;
  }
}

export function formatDuration(duration: number) {
  duration = Math.floor(duration);
  if (duration < 60) {
    return `${duration}s`;
  } else if (duration < 3600) {
    const sec = duration % 60;
    const min = (duration - sec) / 60;
    return `${min}m${sec}s`;
  } else {
    const hour = Math.floor(duration / 3600);
    const lastPart = duration % 3600;
    const sec = lastPart % 60;
    const min = (lastPart - sec) / 60;
    return `${hour}h${min}m${sec}s`;
  }
}

// eg: 00:00:05.80
export function formatFfmpegTimeString(str: string) {
  const [h, m] = str.split(":");
  if (h === "00") {
    if (m === "00") {
      return str.slice(6);
    }
    return str.slice(3);
  }
  return str;
}

export function now() {
  return new Date().getTime();
}

export function getFileNameFromPath(path: string) {
  return path.split(".").slice(0, -1).join("");
}

export async function getAllVideosFromPath(path: string) {
  return filterVideoFiles(await fs.readdir(path, { withFileTypes: true }));
}

function filterVideoFiles(entries: Dirent[]) {
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name !== ".DS_Store" &&
        !COMMONVIDEOEXT.includes(path.extname(entry.name)),
    )
    .map((entry) => entry.name);
}

export async function dirIsAvailable(path: string) {
  try {
    await fs.access(path, constants.R_OK);
    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false;
  }
}
