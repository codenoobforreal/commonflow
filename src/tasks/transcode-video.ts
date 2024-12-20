import path from "node:path";

import which from "which";

import {
  dirIsAvailable,
  getAllVideosFromPath as getVideosFromPath,
  getFileNameFromPath,
  now,
  runCommand,
} from "../utils.js";
import { FHDPIXELS, HDPIXELS } from "../constants.js";
import { execa, parseCommandString } from "execa";

type Metadata = {
  width: number;
  height: number;
  size: number;
  filename: string;
};

export type TranscodeVideoArgs = {
  inputDir: string;
  outputDir?: string;
};

type FfmpegVideoOptions = {
  input: string;
  output: string;
  width: number;
  height: number;
  fps: number;
  crf: number;
};

export async function runTranscodeVideosSubProgram(args: TranscodeVideoArgs) {
  const { inputDir, outputDir } = args;
  if (outputDir && !(await dirIsAvailable(outputDir))) {
    throw new Error("outputDir is not available");
  }
  await requireCheck();
  const videos = await getVideosFromPath(inputDir);
  if (videos.length === 0) {
    throw new Error(`no videos file in ${inputDir} path`);
  }

  // TODO: reimplement ora lib
  for (let i = 0; i < videos.length; i++) {
    const filename = videos[i] as string;
    const input = path.join(inputDir, filename);
    const { width, height } = (await getVideoMetaData(input)) as {
      width: number;
      height: number;
    };
    const output = path.join(
      outputDir as string,
      `${getFileNameFromPath(filename)}-${now()}.mp4`,
    );
    const shellCommand = buildTranscodeVideoCommand({
      ...evaluateTranscodeOptions({ width, height }),
      input,
      output,
      fps: 25, // 25fps is default setting
    });

    // FIXME: transform heavily rely on ffmpeg info format
    const ffmpegInfoTransform = function* (line: unknown) {
      if ((line as string).includes("Lsize")) {
        const size = lsizeStringCapture(line as string);
        const duration = timeStringCapture(line as string);
        yield `transcode stat: ${duration} ${size} ${output}`;
      }
    };
    await transcodeVideo(shellCommand, ffmpegInfoTransform);
  }
}

export function lsizeStringCapture(str: string) {
  return /Lsize=([\s|\d]+\w+)/.exec(str)?.at(1)?.trim();
}

export function timeStringCapture(str: string) {
  return /time=(\d{2}:\d{2}:\d{2}\.\d{2})/.exec(str)?.at(1);
}

async function requireCheck() {
  const ffmpeg = await which("ffmpeg", { nothrow: true });
  const ffprobe = await which("ffprobe", { nothrow: true });
  const missingRequiredBinaries = !(ffmpeg && ffprobe);
  if (missingRequiredBinaries) {
    throw new Error("ffmpeg not found");
  }
}

async function transcodeVideo(
  command: string,
  transform?: (line: unknown) => Generator<string, void, unknown>,
) {
  // IMPORTANT: ffmpeg info only available in stderr
  return await execa({
    stderr: transform ? [transform, "inherit"] : "ignore",
  })`${parseCommandString(command)}`;
}

function buildMetadataCommand(path: string) {
  return `ffprobe -v error -select_streams v:0 -show_entries stream:format -of default=noprint_wrappers=1:nokey=0 ${path}`;
}

// TODO: return all info
export async function getVideoMetaData(path: string) {
  return (await runCommand(buildMetadataCommand(path))).stdout
    .split("\n")
    .filter(Boolean)
    .reduce(
      (obj, kvpair) => {
        const key = kvpair.split("=")[0] as string;
        const value = kvpair.split("=")[1] as string;
        if (["width", "height"].includes(key)) {
          obj[key] = Number(value) ? Number(value) : value;
        }
        return obj;
      },
      {} as Record<string, string | number>,
    );
}

export function evaluateTranscodeOptions(
  metadata: Pick<Metadata, "width" | "height">,
) {
  const { width, height } = metadata;
  const options = {
    crf: 24,
    width: 0,
    height: 0,
  };
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

export function buildTranscodeVideoCommand(options: FfmpegVideoOptions) {
  const { input, output, width, height, fps, crf } = options;
  let videoFilterString = `format=yuv420p,fps=${fps}`;
  // 0 means no change on scale filter
  if (width !== 0 || height !== 0) {
    videoFilterString += `,scale=${width}:${height}`;
  }
  return (
    `ffmpeg -hide_banner -i ${input} ` +
    `-vf ${videoFilterString} -c:v libx265 -x265-params ` +
    `log-level=error -crf ${crf} -f mp4 -preset veryfast -c:a copy ` +
    `${output}`
  );
}
