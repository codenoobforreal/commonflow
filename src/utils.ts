import { fileTypeFromFile } from "file-type";
import fsp from "node:fs/promises";
import path from "node:path";

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

export function formatSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function zeroPad(num: number) {
  return num.toString().padStart(2, "0");
}

/**
 * name doesn't include ext\
 * eg: filename.mp4 => filename
 */
export function getFileNameFromPath(filepath: string) {
  if (filepath.endsWith("\\") || filepath.endsWith("/")) {
    return "";
  }
  return path.parse(filepath).name;
}

export function getFileExt(filepath: string): string {
  return path.extname(filepath).slice(1);
}

export async function isPathDirectory(filepath: string) {
  return (await fsp.stat(filepath)).isDirectory();
}

// function isSupportedVideo(ext: string): ext is VideoFormat {
//   return SUPPORT_VIDEO_EXT.includes(ext as VideoFormat);
// }

export async function isVideoFile(filepath: string) {
  return (await fileTypeFromFile(filepath))?.mime.startsWith("video");
}

export async function isImageFile(filepath: string) {
  return (await fileTypeFromFile(filepath))?.mime.startsWith("image");
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

function isArbitraryObject(
  potentialObject: unknown,
): potentialObject is ArbitraryObject {
  return typeof potentialObject === "object" && potentialObject !== null;
}

// type util end
