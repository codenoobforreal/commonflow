const SD = { height: 480, width: 720, pixels: 345_600 } as const;
const HD = { height: 720, width: 1280, pixels: 921_600 } as const;
const FHD = { height: 1080, width: 1920, pixels: 2_073_600 } as const;
const QHD = { height: 1440, width: 2560, pixels: 3_686_400 } as const;
const UHD = { height: 2160, width: 3840, pixels: 8_294_400 } as const;
const UHD_8K = { height: 4320, width: 7680, pixels: 33_177_600 } as const;

export const VIDEO_RESOLUTION = {
  SD,
  HD,
  FHD,
  QHD,
  UHD,
  UHD_8K,
} as const;

export const VIDEO_CODEC = ["H.264", "H.265"] as const;

// const FPS = [
//   { value: 5 },
//   { value: 10 },
//   { value: 12 },
//   { value: 15 },
//   { value: 20 },
//   { value: 23.976, standard: "NTSC Film" },
//   { value: 24 },
//   { value: 25, standard: "PAL Filme/Video" },
//   { value: 29.97, standard: "NTSC Video" },
//   { value: 30 },
//   { value: 48 },
//   { value: 50 },
//   { value: 59.94 },
//   { value: 60 },
//   { value: 72 },
//   { value: 75 },
//   { value: 90 },
//   { value: 100 },
//   { value: 120 },
// ] as const;

// export const MINFPS = FPS[0].value;
// TODO: how to use length to do this
// export const MAXFPS = FPS[18].value;

// https://trac.ffmpeg.org/wiki/Encode/H.264#a1.ChooseaCRFvalue
// export const MINCRF = 0;
// export const MAXCRF = 51;

export const SUPPORT_VIDEO_EXT = [
  "avi",
  "flv",
  "mp4",
  "mkv",
  "mov",
  "rmvb",
  "ts",
  "webm",
  "wmv",
] as const;

export const SUPPORT_IMAGE_EXT = ["jpg", "jpeg", "png"] as const;

export const TASK_TYPE = ["video-encode", "image-encode"] as const;

export const VIDEO_ENCODE_PRESET_ID = [
  "H265-mp4-1920x1080",
  "H265-mp4-1920x1080-animate",
] as const;
