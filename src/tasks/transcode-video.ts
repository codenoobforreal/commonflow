import path from "node:path";

import which from "which";
import ora, { type Ora } from "ora";

import {
  dirIsAvailable,
  formatDuration,
  formatFileSize,
  getAllVideosFromPath,
  getFileNameFromPath,
  now,
  runCommand,
} from "../utils.js";
import { FHDPIXELS, HDPIXELS } from "../constants.js";

type Metadata = {
  width: number;
  height: number;
  size: number;
  filename: string;
};

type Settings = {
  crf: number;
  videoFilterString: string;
};

export type TranscodeVideoConfig = {
  spinner: Ora;
  inputDir: string;
  outputDir: string;
  allVideos: string[];
  currentInputMetadata: Metadata;
  currentOutputMetadata: Metadata;
  duration: number;
  settings: Settings;
};

export type TranscodeVideoArgs = {
  inputDir: string;
  outputDir?: string;
};

export async function runTranscodeVideosSubProgram(args: TranscodeVideoArgs) {
  if (args.outputDir && !(await dirIsAvailable(args.outputDir))) {
    throw new Error("outputDir is not available");
  }
  const config = initialTranscodeConfig(args);
  await requireCheck();
  config.allVideos = await getAllVideosFromPath(config.inputDir);
  if (config.allVideos.length === 0) {
    throw new Error(`no videos file in ${config.inputDir} path`);
  }
  await processAllVideos(config);
}

export function initialTranscodeConfig(args: TranscodeVideoArgs) {
  const { inputDir, outputDir } = args;
  return {
    spinner: ora(),
    inputDir,
    outputDir: outputDir ? outputDir : process.cwd(),
    currentInputMetadata: {
      width: 0,
      height: 0,
      size: 0,
      filename: "",
    },
    currentOutputMetadata: { size: 0, width: 0, height: 0, filename: "" },
    allVideos: [] as string[],
    duration: 0,
    settings: {
      crf: 24,
      videoFilterString: "fps=25,format=yuv420p",
    },
  } satisfies TranscodeVideoConfig;
}

async function requireCheck() {
  const ffmpeg = await which("ffmpeg", { nothrow: true });
  const ffprobe = await which("ffprobe", { nothrow: true });
  const missingRequiredBinaries = !(ffmpeg && ffprobe);
  if (missingRequiredBinaries) {
    throw new Error("ffmpeg not found");
  }
}

async function processAllVideos(config: TranscodeVideoConfig) {
  const { allVideos, currentInputMetadata, currentOutputMetadata, spinner } =
    config;
  for (let i = 0; i < allVideos.length; i++) {
    currentInputMetadata.filename = allVideos[i] as string;
    currentOutputMetadata.filename = `${getFileNameFromPath(
      currentInputMetadata.filename,
    )}-${now()}.mp4`;
    spinner.start(`start ${i + 1}/${allVideos.length} transcode task`);
    const report = await processCurrentVideo(config);
    spinner.succeed(report);
  }
}

function buildMetadataCommand(path: string) {
  return `ffprobe -v error -select_streams v:0 -show_entries stream:format -of default=noprint_wrappers=1:nokey=0 ${path}`;
}

async function getVideoMetaData(path: string) {
  return (await runCommand(buildMetadataCommand(path))).stdout
    .split("\n")
    .filter(Boolean)
    .reduce(
      (obj, kvpair) => {
        // FIXME: how to remove "as string"
        const key = kvpair.split("=")[0] as string;
        if (["width", "height", "size"].includes(key)) {
          obj[key] = kvpair.split("=")[1] as string;
        }
        return obj;
      },
      {} as Record<string, string>,
    );
}

async function getInputMetaData(config: TranscodeVideoConfig) {
  const {
    inputDir,
    currentInputMetadata: { filename },
  } = config;
  return await getVideoMetaData(path.join(inputDir, filename));
}

async function getOutputMetaData(config: TranscodeVideoConfig) {
  const {
    outputDir,
    currentOutputMetadata: { filename },
  } = config;
  return await getVideoMetaData(path.join(outputDir, filename));
}

export function evaluateTranscodeSettings(config: TranscodeVideoConfig) {
  const {
    currentInputMetadata: { width, height },
    settings,
  } = config;
  const pixels = width * height;
  if (pixels > FHDPIXELS) {
    if (width >= height) {
      settings.videoFilterString += `,scale=1920:1080`;
    } else {
      settings.videoFilterString += `,scale=1080:1920`;
    }
  }
  if (pixels <= HDPIXELS) {
    settings.crf = 23;
  }
}

function buildTranscodeVideoCommand(config: TranscodeVideoConfig) {
  evaluateTranscodeSettings(config);
  const {
    inputDir,
    outputDir,
    currentInputMetadata: { filename: inputFilename },
    currentOutputMetadata: { filename: outputFilename },
    settings: { videoFilterString, crf },
  } = config;
  return (
    `ffmpeg -v error -i ${path.join(inputDir, inputFilename)} ` +
    `-vf ${videoFilterString} -c:v libx265 -x265-params ` +
    `log-level=warning -crf ${crf} -f mp4 -preset veryfast -c:a copy ` +
    `${path.join(outputDir, outputFilename)}`
  );
}

async function processCurrentVideo(config: TranscodeVideoConfig) {
  const { currentInputMetadata, currentOutputMetadata } = config;
  const { width, height, size } = await getInputMetaData(config);
  currentInputMetadata.width = Number(width);
  currentInputMetadata.height = Number(height);
  currentInputMetadata.size = Number(size);
  const startTime = now();
  await runCommand(buildTranscodeVideoCommand(config));
  config.duration = (now() - startTime) / 1000;
  currentOutputMetadata.size = Number((await getOutputMetaData(config)).size);
  return generateProcessReport(config);
}

function generateProcessReport(config: TranscodeVideoConfig) {
  const { currentInputMetadata, currentOutputMetadata, duration, outputDir } =
    config;
  const inputSize = formatFileSize(currentInputMetadata.size);
  const outputSize = formatFileSize(currentOutputMetadata.size);
  // eg:finished 10m10s 500MB->200MB ${filename}
  return (
    `finished ${formatDuration(duration)} ${inputSize}->${outputSize}` +
    ` ${path.join(outputDir, currentOutputMetadata.filename)}`
  );
}
