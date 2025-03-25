import { spawn } from "child_process";

export function spawnFfprobeProcess(
  args: string[],
  signal?: AbortSignal,
): Promise<{ out: string; err: string }> {
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    const child = spawn("ffprobe", args, {
      windowsHide: true,
      signal,
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

export function spawnFfmpegProcess(
  args: string[],
  signal?: AbortSignal,
): Promise<{ out: string; err: string }> {
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    const child = spawn("ffmpeg", args, {
      windowsHide: true,
      signal,
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
