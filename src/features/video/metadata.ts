import type { FfprobeResultConvertResult } from "../../types";
import {
  buildGetVideoMetadataCommandArgs,
  runFfprobeCommand,
} from "../ffmpeg/commands";

export async function getVideoMetaData(
  videoPath: string,
): Promise<FfprobeResultConvertResult> {
  const getVideoMetaDataCommandArgs =
    buildGetVideoMetadataCommandArgs(videoPath);
  const { out, err } = await runFfprobeCommand(getVideoMetaDataCommandArgs);
  // out will be empty string and err will be error message when ffprobe got error
  if (out === "") {
    // TODO: custom ffprobe error
    throw new Error(err);
  }
  return convertFfprobeResult(out);
}

// TODO: bit depth: bits_per_raw_sample=N/A
export function convertFfprobeResult(
  result: string,
): FfprobeResultConvertResult {
  return result
    .split("\n")
    .filter(Boolean)
    .reduce(
      (obj, kvpair) => {
        const kvSplit = kvpair.split("=");
        const key = kvSplit[0];
        const value = kvSplit[1];
        if (!key || value === undefined) {
          throw new Error("failed to extract info from ffprobe result");
        }
        // TODO: why include not working
        if (
          key === "width" ||
          key === "height" ||
          key === "duration" ||
          key === "nb_frames"
        ) {
          obj[key] = Number.parseFloat(value);
        }
        if (key === "avg_frame_rate") {
          obj[key] = calcFfprobeFps(value);
        }
        return obj;
      },
      {} as unknown as FfprobeResultConvertResult,
    );
}

// special case: 33152000/1105061
function calcFfprobeFps(fps: string): number {
  const splits = fps.split("/");
  const dividend = splits[0];
  const divisor = splits[1];
  if (divisor === "1") {
    return Number(dividend);
  }
  return Number(dividend) / Number(divisor);
}
