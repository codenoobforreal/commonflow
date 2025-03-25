import type { ProcessVideoEncodeTaskProps } from "../../types";
import { noTestLog } from "../../utils";
import { encodeVideo } from "./encode";
import { getAllSupportVideosFromPath, getOutputVideoPath } from "./utils";

export async function encodeAllVideosInFolder({
  input,
  output,
  preset,
}: ProcessVideoEncodeTaskProps) {
  const videos = await getAllSupportVideosFromPath(input);

  if (!videos.length) {
    throw new Error("no video to process");
  }

  for (let i = 0; i < videos.length; i++) {
    const videoPath = videos[i];
    if (!videoPath) {
      throw new Error("no videoPath");
    }
    const numberOfVideos = videos.length;
    const readableIndex = i + 1;
    const outputVideoPath = getOutputVideoPath(input, output, videoPath);

    noTestLog(`task ${readableIndex}/${numberOfVideos}:\n${outputVideoPath}`);
    await encodeVideo({
      input: videoPath,
      output: outputVideoPath,
      preset,
    });
    noTestLog("finished");
  }
}
