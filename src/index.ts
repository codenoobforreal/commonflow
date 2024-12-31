#!/usr/bin/env node

import { Command, CommanderError } from "commander";
import { ExecaError } from "execa";
import process from "node:process";

import { runTranscodeVideosSubProgram } from "./tasks/transcode-video.js";

const program = new Command();
program
  .name("commonflow")
  .description(`CLI to simplify your daily workflow`)
  .version("0.2.2");
program
  .command("transcode-videos")
  .description(`Transcode all video files in the input path to the output path`)
  .argument("<input dir>", "input dir")
  .argument(
    "[output dir]",
    "output dir,if not specified,default to current path",
    ".",
  )
  .action(async (inputDir: string, outputDir: string) => {
    await runTranscodeVideosSubProgram({ inputDir, outputDir });
  });

(async () => {
  try {
    await program.parseAsync(process.argv);
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
