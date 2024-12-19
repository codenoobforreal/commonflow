#!/usr/bin/env node

import { Command, CommanderError } from "commander";
import { ExecaError } from "execa";

import { runTranscodeVideosSubProgram } from "./tasks/transcode-video.js";

(async () => {
  const program = new Command();
  program
    .name("commonflow")
    .description(`CLI to simplify your daily workflow`)
    .version("0.0.1");
  program
    .command("transcode-videos")
    .description(
      `Transcode all video files in the input path to the output path`,
    )
    .argument("<input dir>", "input dir")
    .argument(
      "[output dir]",
      "output dir,if not specified,default to current path",
      ".",
    )
    .action(async (inputDir: string, outputDir: string) => {
      await runTranscodeVideosSubProgram({ inputDir, outputDir });
    });

  try {
    await program.parseAsync();
  } catch (error) {
    if (error instanceof CommanderError) {
      program.error(error.message);
    }
    if (error instanceof ExecaError) {
      program.error(error.message);
    }
    if (error instanceof Error) {
      program.error(error.message);
    }
  }
})();
