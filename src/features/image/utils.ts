import { glob } from "glob";
import { SUPPORT_IMAGE_EXT } from "../../constants";
import { isImageFile } from "../../utils";

export async function getAllSupportImagesFromPath(dir: string) {
  const exts = SUPPORT_IMAGE_EXT.join(",");
  const files = await glob(`**/*.\{${exts}\}`, {
    nodir: true,
    cwd: dir,
    withFileTypes: true,
  });
  const imageFiles: string[] = [];
  for (const file of files) {
    const filepath = file.fullpath();
    const isImage = await isImageFile(filepath);
    if (isImage) {
      imageFiles.push(filepath);
    }
  }
  return imageFiles;
}
