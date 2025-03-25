import path from "node:path";
import { encodeVideo } from "./features/video/encode";
import { encodeAllVideosInFolder } from "./features/video/multipleEncode";
import { getOutputVideoPath } from "./features/video/utils";
import type { ProcessVideoEncodeTaskProps } from "./types";
import { isErrnoException, isPathDirectory } from "./utils";

export async function processVideoEncodeTask({
  input,
  output,
  preset,
}: ProcessVideoEncodeTaskProps) {
  try {
    const isInputDir = await isPathDirectory(input);

    if (!isInputDir) {
      const isOutputDir = await isPathDirectory(output);
      const outputPath = isOutputDir
        ? getOutputVideoPath(path.dirname(input), output, input)
        : output;
      return await encodeVideo({
        input,
        output: outputPath,
        preset,
      });
      // printCompleteLog(completeStat, outputPath);
    } else {
      return await encodeAllVideosInFolder({ input, output, preset });
    }
  } catch (error) {
    if (isErrnoException(error)) {
      if (error.code === "ENOENT") {
        console.log(`no such path:\n${error.path}`);
      }
    } else {
      console.log(error);
    }
  }
}
