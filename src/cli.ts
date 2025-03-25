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
import { VIDEO_ENCODE_PRESET_ID } from "./constants";
import {
  idToPresetDescriptionMap,
  idToPresetMap,
} from "./features/video/presets";
import type {
  ProcessVideoEncodeTaskProps,
  TaskType,
  VideoEncodePreset,
} from "./types";

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
      // {
      //   value: "image-encode",
      //   label: "Image Encode",
      // },
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

export async function getTaskDetail() {
  try {
    intro("Welcome to scripts!");
    const task = await askForTask();
    if (task === "video-encode") {
      const videoEncodeProps = await askForVideoEncodeAnswer();
      const shouldContinue = await askForContinue();
      outro("All done!");
      return { shouldContinue, videoEncodeProps };
    } else if (task === "image-encode") {
      return { shouldContinue: false };
    } else {
      return { shouldContinue: false };
    }
  } catch (error) {
    console.log(error);
    return { shouldContinue: false };
  }
}
