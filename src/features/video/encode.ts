import type { ProcessVideoEncodeTaskProps } from "../../types.js";
import {
  buildFfmpegEncodeVideoCommandArgs,
  evaluateEncodePreset,
  runFfmpegCommandWithProgressAnalyze,
} from "../ffmpeg/commands.js";
import { getVideoMetaData } from "./metadata.js";
import { createOutputFolder } from "./utils.js";

export async function encodeVideo({
  input,
  output,
  preset,
}: ProcessVideoEncodeTaskProps) {
  const metadata = await getVideoMetaData(input);
  const encodeVideoCommandArgs = buildFfmpegEncodeVideoCommandArgs({
    ...evaluateEncodePreset(metadata, preset),
    input,
    output,
  });
  await createOutputFolder(output);
  await runFfmpegCommandWithProgressAnalyze(
    encodeVideoCommandArgs,
    // progressAnalyze.bind(null, metadata.duration, metadata.nb_frames),
  );
}
