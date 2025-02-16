#!/usr/bin/env node

import { select } from "@inquirer/prompts";

import { defaultInputDir, defaultOutputDir } from "./path";
import { compressImages } from "./tasks/compress-images";
import { compressVideos } from "./tasks/compress-videos";
import type { TaskType, VideoType } from "./types";

async function askToplevelTask(): Promise<TaskType> {
	return await select({
		message: "Select a task",
		choices: [
			{
				value: "compress videos",
			},
			// {
			// 	value: "transcode videos",
			// },
			{
				value: "compress images",
			},
		],
	});
}

async function askVideoType(): Promise<VideoType> {
	return await select({
		message: "Select video type",
		choices: [
			{
				value: "common",
			},
			{
				value: "animate",
			},
		],
	});
}

async function runTask(taskType: TaskType) {
	if (taskType === "compress videos") {
		const videoType = await askVideoType();
		await compressVideos({
			inputDir: defaultInputDir,
			outputDir: defaultOutputDir,
			type: videoType,
		});
	} else if (taskType === "compress images") {
		await compressImages({
			inputDir: defaultInputDir,
			outputDir: defaultOutputDir,
		});
	} else {
		console.log(`${taskType} isn't implement yet`);
	}
}

async function main() {
	try {
		const task = await askToplevelTask();
		await runTask(task);
	} catch (error) {
		if (error instanceof Error && error.name === "ExitPromptError") {
			// silence the ctrl+c exit
		} else {
			console.log(error);
		}
	}
}

main();
