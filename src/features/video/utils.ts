import { glob } from "glob";
import fsp from "node:fs/promises";
import path from "node:path";
import { SUPPORT_VIDEO_EXT } from "../../constants";
import {
  getCurrentDateTime,
  getFileNameFromPath,
  isVideoFile,
} from "../../utils";

export async function getAllSupportVideosFromPath(dir: string) {
  const exts = SUPPORT_VIDEO_EXT.join(",");
  const files = await glob(`**/*.\{${exts}\}`, {
    nodir: true,
    cwd: dir,
    withFileTypes: true,
  });
  const vFiles: string[] = [];
  for (const file of files) {
    const filepath = file.fullpath();
    const isVideo = await isVideoFile(filepath);
    if (isVideo) {
      vFiles.push(filepath);
    }
  }
  return vFiles;
}

/**
 * get output video path,keep the same structure of source files
 * @param source source directory
 * @param dest destination directory
 * @param video source video path
 * @returns destination video path
 */
export function getOutputVideoPath(
  source: string,
  dest: string,
  video: string,
) {
  return path.join(
    dest,
    path.dirname(path.relative(source, video)),
    `${getFileNameFromPath(video)}-${getCurrentDateTime()}.mp4`,
  );
} // we will create folder to prevent ffmpeg ask for folder creation

export async function createOutputFolder(output: string) {
  await fsp.mkdir(path.dirname(output), { recursive: true });
}
