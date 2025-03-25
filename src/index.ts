#!/usr/bin/env node

import { getTaskDetail } from "./cli";
import { processVideoEncodeTask } from "./tasks";

main();

async function main() {
  try {
    const { shouldContinue, videoEncodeProps } = await getTaskDetail();
    if (!shouldContinue) {
      return;
    }
    if (videoEncodeProps) {
      await processVideoEncodeTask(videoEncodeProps);
    }
  } catch (error) {
    console.log(error);
  }
}
