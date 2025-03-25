import { VIDEO_RESOLUTION } from "../../constants";
import type {
  EncodeVideoCommandConfig,
  EncodeVideoEvaluateConfig,
  VideoEncodePreset,
  VideoMetaData,
} from "../../types";
import { spawnFfmpegProcess, spawnFfprobeProcess } from "./process";

export function buildGetVideoMetadataCommandArgs(path: string) {
  return [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream:format",
    "-of",
    "default=noprint_wrappers=1:nokey=0",
    path,
  ];
}

export function buildFfmpegEncodeVideoCommandArgs(
  config: EncodeVideoCommandConfig,
): string[] {
  const { input, output, width, height, avg_frame_rate, crf } = config;
  let videoFilterString = "format=yuv420p";
  if (avg_frame_rate) {
    videoFilterString += `,fps=${avg_frame_rate}`;
  }
  if (width && height) {
    videoFilterString += `,scale=${width}:${height}`;
  }

  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-progress",
    "pipe:2",
    "-i",
    input,
    "-vf",
    videoFilterString,
    "-c:v",
    "libx265",
    "-x265-params",
    "log-level=error",
    "-crf",
    `${crf}`,
    "-f",
    "mp4",
    "-preset",
    "veryfast",
    "-c:a",
    "copy",
    output,
  ];
} // https://handbrake.fr/docs/en/1.9.0/workflow/adjust-quality.html
// TODO: CRF also depends on encoder
// size first,switch to qualty first we can swap the commented value
function calcCRFBaseOnResolution(pixels: number): number {
  if (pixels >= VIDEO_RESOLUTION.QHD.pixels) {
    return 28; // 22
  } else if (pixels >= VIDEO_RESOLUTION.FHD.pixels) {
    return 24; // 20
  } else if (pixels >= VIDEO_RESOLUTION.HD.pixels) {
    return 23; // 19
  } else {
    return 22; // 18
  }
}
/**
 * crf settings base on https://handbrake.fr/docs/en/1.9.0/workflow/adjust-quality.html
 */

export function evaluateEncodePreset(
  metadata: VideoMetaData,
  preset: VideoEncodePreset,
): EncodeVideoEvaluateConfig {
  const { codec, format, avg_frame_rate, width, height } = preset;
  const finalConfig = { codec, format } as EncodeVideoEvaluateConfig;

  // TODO: FHD is hard code,make it configurable
  if (metadata.width * metadata.height > VIDEO_RESOLUTION.FHD.pixels) {
    if (metadata.width >= metadata.height) {
      finalConfig.width = width;
      finalConfig.height = height;
    } else {
      finalConfig.width = height;
      finalConfig.height = width;
    }
    finalConfig.crf = calcCRFBaseOnResolution(
      finalConfig.width * finalConfig.height,
    );
  } else {
    finalConfig.crf = calcCRFBaseOnResolution(metadata.width * metadata.height);
  }

  if (avg_frame_rate) {
    finalConfig.avg_frame_rate = avg_frame_rate;
  }

  return finalConfig;
}
export async function runFfprobeCommand(args: string[]) {
  const ac = new AbortController();
  try {
    return await spawnFfprobeProcess(args, ac.signal);
  } catch (error) {
    console.error(error);
  } finally {
    ac.abort();
  }
}

export async function runFfmpegCommandWithProgressAnalyze(args: string[]) {
  const ac = new AbortController();
  try {
    return await spawnFfmpegProcess(args, ac.signal);
  } catch (error) {
    console.error(error);
  } finally {
    ac.abort();
  }
}
