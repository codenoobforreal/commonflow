import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { VIDEO_RESOLUTION } from "../../constants.js";
import type {
  EncodeVideoCommandConfig,
  EncodeVideoEvaluateConfig,
  FfprobeResultConvertResult,
  ProcessVideoEncodeTaskProps,
  VideoEncodePreset,
  VideoMetaData,
} from "../../types.js";
import {
  getCurrentDateTime,
  getFileNameFromPath,
  isErrnoException,
  isPathDirectory,
} from "../../utils.js";
import { getAllSupportVideosFromPath } from "./utils.js";

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
      await encodeVideo({
        input,
        output: outputPath,
        preset,
      });
      // printCompleteLog(completeStat, outputPath);
    }
    await compressAllVideosInFolder({ input, output, preset });
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

async function encodeVideo({
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
  // we will create folder to prevent ffmpeg ask for folder creation
  await fsp.mkdir(path.dirname(output), { recursive: true });
  await runFfmpegCommandWithProgressAnalyze(
    encodeVideoCommandArgs,
    // progressAnalyze.bind(null, metadata.duration, metadata.nb_frames),
  );
  // if (!err && out) {
  //   return parseFfmpegResolveMessage(out);
  // }
}

// function convertFfmpegProgressLog(progressLog: string): FfmpegAnalyzeResult {
//   return progressLog
//     .split("\n")
//     .filter(Boolean)
//     .reduce(
//       (obj, kvpair) => {
//         const kvSplit = kvpair.split("=");
//         const key = kvSplit[0];
//         const value = kvSplit[1];
//         if (!key || value === undefined) {
//           throw new Error("failed to extract info from ffmpeg progress log");
//         }
//         if (key === "out_time_ms") {
//           obj[key] = value === "N/A" ? undefined : Number.parseFloat(value);
//         }
//         if (key === "frame" || key === "fps") {
//           obj[key] = Number.parseFloat(value);
//         }
//         if (key === "progress") {
//           obj[key] = value;
//         }
//         return obj;
//       },
//       {} as unknown as FfmpegAnalyzeResult,
//     );
// }

// function progressAnalyze(
//   duration: number,
//   totalFrames: number,
//   progressLog: string,
// ): VideoEncodeProgress | { error: string } {
//   if (!progressLog) {
//     return { error: "stderr is empty" };
//   }
//   const isProgressLog = progressLog
//     .split("\n")
//     .filter(Boolean)
//     .some((kvpair) => kvpair.startsWith("progress"));

//   if (!isProgressLog) {
//     return { error: "stderr is something else not progress log" };
//   }
//   const convertResult = convertFfmpegProgressLog(progressLog);
//   const { out_time_ms, frame, fps, progress } = convertResult;
//   let progressedInPercent: number;
//   let eta: number | undefined;
//   if (progress === "end") {
//     return { progressedInPercent: 100, eta: 0 };
//   } else {
//     // out_time_ms can be N/A or negative number,frame and fps can be 0(use <= for possible negative value)
//     if (
//       out_time_ms === undefined ||
//       out_time_ms <= 0 ||
//       frame <= 0 ||
//       fps <= 0
//     ) {
//       progressedInPercent = 0;
//     } else {
//       progressedInPercent = Math.floor(
//         Math.min(((out_time_ms as number) / 1_000_000 / duration) * 100, 100),
//       );
//       eta = Math.floor(Math.max((totalFrames - frame) / fps, 1));
//     }
//   }
//   return { progressedInPercent, eta };
// }

async function getVideoMetaData(
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

async function compressAllVideosInFolder({
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

    console.log(`task ${readableIndex}/${numberOfVideos}:\n${outputVideoPath}`);
    await encodeVideo({
      input: videoPath,
      output: outputVideoPath,
      preset,
    });
    console.log("finished");
  }
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
}

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

function runFfprobeCommand(
  args: string[],
): Promise<{ out: string; err: string }> {
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    const child = spawn("ffprobe", args, {
      windowsHide: true,
    });
    child.on("error", (err) => {
      reject(err);
    });
    child.on("close", () => {
      resolve({ out, err });
    });
    child.stdout.on("data", (data) => {
      out += data;
    });
    child.stderr.on("data", (data) => {
      err += data;
    });
  });
}

function runFfmpegCommandWithProgressAnalyze(
  args: string[],
): Promise<{ out: string; err: string }> {
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    const child = spawn("ffmpeg", args, {
      windowsHide: true,
    });
    // const rl = createInterface({
    //   input: stdin,
    //   output: stderr,
    // });

    child.on("error", (err) => {
      // rl.close();
      reject(err);
    });
    child.on("close", () => {
      // rl.close();
      resolve({ out, err });
    });
    child.stdout.on("data", (data) => {
      out += data;
    });
    child.stderr.on("data", (data: Buffer) => {
      err += data;
    });
  });
}

// function printProgressToTerminal(progress: VideoEncodeProgress, rl: Interface) {
//   const message = `progress: ${progress.progressedInPercent},eta: ${
//     progress.eta === undefined ? "prepare" : formatSeconds(progress.eta)
//   }\n`;

//   moveCursor(stderr, 0, -1, () =>
//     clearLine(stderr, 0, () => rl.write(message)),
//   );
// }

// https://handbrake.fr/docs/en/1.9.0/workflow/adjust-quality.html
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
}
