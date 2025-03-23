#!/usr/bin/env node

import {
  cancel,
  confirm,
  group,
  intro,
  isCancel,
  outro,
  select,
  text,
} from "@clack/prompts";
import process from "node:process";
import { VIDEO_ENCODE_PRESET_ID } from "./constants";
import { processVideoEncodeTask } from "./features/video/encode";
import {
  idToPresetDescriptionMap,
  idToPresetMap,
} from "./features/video/presets";
import type {
  ProcessVideoEncodeTaskProps,
  TaskType,
  VideoEncodePreset,
} from "./types";

main();

async function askForVideoEncodeAnswer(): Promise<ProcessVideoEncodeTaskProps> {
  const presetOptions = VIDEO_ENCODE_PRESET_ID.map((id) => ({
    label: id,
    value: idToPresetMap[id],
    hint: idToPresetDescriptionMap[id],
  }));

  return await group(
    {
      preset: () =>
        select<VideoEncodePreset>({
          message: "Pick a video encode preset",
          options: presetOptions,
        }),
      input: () =>
        text({
          message: "Enter input path",
          placeholder: "Video path or a folder of videos",
          defaultValue: ".",
        }),
      output: () =>
        text({
          message: "Enter output path",
          placeholder: "Encoded video output folder",
          defaultValue: ".",
        }),
    },
    {
      onCancel: () => {
        cancel("Operation cancelled.");
        process.exit(0);
      },
    },
  );
}

async function askForTask(): Promise<TaskType> {
  const task = await select({
    message: "Pick a task",
    options: [
      {
        value: "video-encode",
        label: "Video Encode",
      },
      {
        value: "image-encode",
        label: "Image Encode",
      },
    ],
  });
  if (isCancel(task)) {
    cancel("Operation canceled");
    process.exit(0);
  }
  return task;
}

async function askForContinue(): Promise<boolean> {
  const shouldContinue = await confirm({
    message: "Do you want to continue",
  });
  if (isCancel(shouldContinue)) {
    cancel("Operation canceled");
    process.exit(0);
  }
  return shouldContinue;
}

async function main() {
  try {
    intro("Welcome to scripts!");
    const task = await askForTask();
    if (task === "video-encode") {
      const videoEncodeProps = await askForVideoEncodeAnswer();
      const shouldContinue = await askForContinue();
      outro("All done!");
      if (shouldContinue) {
        await processVideoEncodeTask(videoEncodeProps);
      }
    } else if (task === "image-encode") {
      console.log("todo");
    } else {
      console.log("todo");
    }
  } catch (error) {
    console.log(error);
  }
}
