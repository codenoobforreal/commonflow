import {
  SUPPORT_VIDEO_EXT,
  TASK_TYPE,
  VIDEO_CODEC,
  VIDEO_ENCODE_PRESET_ID,
} from "./constants";

// interface BaseFile {
//   name: string;
//   path: string;
//   ext: string;
// }

// interface VideoFile extends BaseFile, VideoMetaData {}

export interface ProcessVideoEncodeTaskProps {
  input: string;
  output: string;
  preset: VideoEncodePreset;
}

export interface FfprobeResultConvertResult {
  width: number;
  height: number;
  avg_frame_rate: number;
  nb_frames: number;
  duration: number;
}

// interface FfmpegAnalyzeResult {
//   out_time_ms: number | undefined;
//   frame: number;
//   fps: number;
//   progress: string;
// }

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VideoMetaData extends FfprobeResultConvertResult {}
export type VideoCodec = (typeof VIDEO_CODEC)[number];
export type VideoFormat = (typeof SUPPORT_VIDEO_EXT)[number];

type VideoEncodeConfig = {
  codec: VideoCodec;
  format: VideoFormat;
  crf: number;
  width: number;
  height: number;
  avg_frame_rate: number;
};

export type VideoEncodePreset = Partial<VideoEncodeConfig> &
  Pick<VideoEncodeConfig, "codec" | "format" | "width" | "height">;

export interface EncodeVideoEvaluateConfig
  extends Partial<Omit<VideoEncodeConfig, "crf" | "avg_frame_rate">> {
  crf: number;
  avg_frame_rate: number;
}

export interface EncodeVideoCommandConfig extends EncodeVideoEvaluateConfig {
  input: string;
  output: string;
}

// video which hasn't apply config need to type with partial<config>
// export interface VideoToBeEncoded
//   extends Pick<
//     VideoFile,
//     "avg_frame_rate" | "duration" | "name" | "ext" | "path"
//   > {
//   id: string;
//   resolution: string; // ${width}x${height}
//   configId: string;
// }

// export interface VideoEncodeTask
//   extends Pick<VideoToBeEncoded, "resolution" | "avg_frame_rate" | "path"> {
//   output: string;
//   config: VideoEncodeConfig;
// }

// export interface VideoEncodeProgress {
//   progressedInPercent: number;
//   eta?: number;
// }

export type TaskType = (typeof TASK_TYPE)[number];
export type VideoEncodePresetId = (typeof VIDEO_ENCODE_PRESET_ID)[number];
