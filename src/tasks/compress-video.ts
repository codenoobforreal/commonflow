import path from "node:path";
import fsp from "node:fs/promises";

import { execa, ExecaError } from "execa";

import { getAllVideosFromPath, getFileNameFromPath, now } from "../utils.js";
import { DEFAULTVIDEOCOMPRESSFPS, FHDPIXELS, HDPIXELS } from "../constants.js";

type Metadata = {
  width: number;
  height: number;
  avg_frame_rate: number;
};

type FfmpegVideoOptions = {
  input: string;
  output: string;
  crf: number;
  width?: number;
  height?: number;
  fps?: number;
};

interface CompressVideosArgs {
  type: string;
  inputDir: string;
  outputDir: string;
}

export async function compressVideos(args: CompressVideosArgs) {
  const { inputDir, outputDir, type } = args;

  const videos = await getAllVideosFromPath(inputDir);

  for (let i = 0; i < videos.length; i++) {
    const input = videos[i] as string;
    const metadataStr = await getVideoMetaData(input, [
      "width",
      "height",
      "avg_frame_rate",
    ]);

    if (!metadataStr["width"]) {
      throw new Error("get video metadata failed...");
    }

    const metadata = {
      width: parseInt(metadataStr["width"]),
      height: parseInt(metadataStr["height"]!),
      avg_frame_rate: parseInt(metadataStr["avg_frame_rate"]!),
    };

    const output = path.join(
      outputDir,
      path.dirname(path.relative(inputDir, input)),
      `${getFileNameFromPath(input)}-${now()}.mp4`,
    );
    // ffmpeg won't create folder when run ffmpeg command
    await fsp.mkdir(path.dirname(output), { recursive: true });
    const shellCommandArgs = buildCompressVideoCommandArgs({
      ...evaluateCompressOptions(metadata, type),
      input,
      output,
    });

    // FIXME: this function is heavily coupled with ffmpeg info format and outer variables
    function* ffmpegInfoTransformer(line: unknown) {
      if ((line as string).includes("Lsize")) {
        const size = lsizeStringCapture(line as string);
        const duration = timeStringCapture(line as string);
        yield `finished ${i + 1}/${videos.length} in ${durationReadableOutput(duration as string)} with ${sizeReadableOutput(size as string)}\n${output}\n`;
      }
    }

    await compressVideo(shellCommandArgs, ffmpegInfoTransformer);
  }
}

export function sizeReadableOutput(size: string) {
  const sizeInNumber = Number(size.slice(0, -3));
  const KiBToKB = 1024 / 1000;
  const KiBToMB = KiBToKB / 1000;
  const KiBToGB = KiBToMB / 1000;
  if (sizeInNumber >= (1000 * 1000 * 1000) / 1024) {
    return `${(sizeInNumber * KiBToGB).toFixed(2)}GiB`;
  } else if (sizeInNumber >= (1000 * 1000) / 1024) {
    return `${(sizeInNumber * KiBToMB).toFixed(2)}MiB`;
  }
  return size.replace("i", "");
}

export function durationReadableOutput(d: string) {
  return d.slice(0, -3);
}

export function lsizeStringCapture(str: string) {
  return /Lsize=([\s|\d]+\w+)/.exec(str)?.at(1)?.trim();
}

export function timeStringCapture(str: string) {
  return /time=(\d{2}:\d{2}:\d{2}\.\d{2})/.exec(str)?.at(1);
}

async function compressVideo(
  commandArgs: string[],
  transform?: (line: unknown) => Generator<string, void, unknown>,
) {
  try {
    // IMPORTANT: ffmpeg info only available in stderr
    await execa({
      stderr: transform ? [transform, "inherit"] : "ignore",
    })("ffmpeg", commandArgs);
  } catch (error) {
    if (error instanceof ExecaError) {
      console.log(error);
    }
  }
}

function buildMetadataCommandArgs(path: string) {
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

/**
 * TODO: key must be unique in type level
 * keys are ffprobe return keys
 */
type VideoMetaDataKeys = Array<"width" | "height" | "avg_frame_rate">;

export async function getVideoMetaData(
  videoPath: string,
  requiredKeys: VideoMetaDataKeys,
) {
  const result = (await execa("ffprobe", buildMetadataCommandArgs(videoPath)))
    .stdout;
  return filterDataFromFFprobeResult(result, requiredKeys);
}

export function filterDataFromFFprobeResult(
  result: string,
  filterkeys: string[],
) {
  return result
    .split("\n")
    .filter(Boolean)
    .reduce(
      (obj, kvpair) => {
        const key = kvpair.split("=")[0] as string;
        const value = kvpair.split("=")[1] as string;
        if (filterkeys.includes(key)) {
          obj[key] = value;
        }
        return obj;
      },
      {} as Record<string, string>,
    );
}
/**
 * crf settings base on https://handbrake.fr/docs/en/1.9.0/workflow/adjust-quality.html
 */
export function evaluateCompressOptions(
  metadata: Metadata,
  type: string = "common",
) {
  const { width, height, avg_frame_rate } = metadata;

  const options = {
    crf: 24,
  } as {
    crf: number;
    width?: number;
    height?: number;
    fps?: number;
  };

  if (type !== "animate") {
    options.fps = DEFAULTVIDEOCOMPRESSFPS;
  }

  if (avg_frame_rate < DEFAULTVIDEOCOMPRESSFPS) {
    options.fps = avg_frame_rate;
  }

  const pixels = width * height;
  if (pixels > FHDPIXELS) {
    if (width >= height) {
      options.width = 1920;
      options.height = 1080;
    } else {
      options.width = 1080;
      options.height = 1920;
    }
  }
  if (pixels <= HDPIXELS) {
    options.crf = 23;
  }
  return options;
}

export function buildCompressVideoCommandArgs(options: FfmpegVideoOptions) {
  const { input, output, width, height, fps, crf } = options;
  let videoFilterString = `format=yuv420p`;
  if (fps) {
    videoFilterString += `,fps=${fps}`;
  }
  if (width || height) {
    videoFilterString += `,scale=${width}:${height}`;
  }

  return [
    "-hide_banner",
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
}
