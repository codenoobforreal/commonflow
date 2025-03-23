import type { VideoEncodePreset, VideoEncodePresetId } from "../../types";

export const idToPresetMap: Record<VideoEncodePresetId, VideoEncodePreset> = {
  "H265-mp4-1920x1080": {
    codec: "H.265",
    format: "mp4",
    width: 1920,
    height: 1080,
    avg_frame_rate: 25,
  },
  "H265-mp4-1920x1080-animate": {
    codec: "H.265",
    format: "mp4",
    width: 1920,
    height: 1080,
  },
};

export const idToPresetDescriptionMap: Record<VideoEncodePresetId, string> = {
  "H265-mp4-1920x1080":
    "resolution will convert to 1080p,the lower will preserve;25 fps",
  "H265-mp4-1920x1080-animate":
    "resolution will convert to 1080p,the lower will preserve;fps will preserve",
};
