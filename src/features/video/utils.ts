import { glob } from "glob";
import { SUPPORT_VIDEO_EXT } from "../../constants";
import { isVideoFile } from "../../utils";

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
