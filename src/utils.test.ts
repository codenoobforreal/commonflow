import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
	getAllImagesWithinPath,
	getAllVideosWithinPath,
	getFileNameFromPath,
	now,
	runFfmpegCommand,
	runFfprobeCommand,
} from "./utils";
describe("utils test", () => {
	test("getFileNameFromPath return result won't include extension", () => {
		const filename = getFileNameFromPath("/path/name.mp4");

		expect(filename).toEqual("name");
		expect(filename).not.toContain(".mp4");
	});

	test.todo("run command with wrong arguments should throw error", async () => {
		expect(async () => {
			await runFfprobeCommand(["-unknown"]);
		}).toThrowErrorMatchingInlineSnapshot();

		expect(async () => {
			await runFfmpegCommand(["-unknown"]);
		}).toThrowErrorMatchingInlineSnapshot();
	});
});

describe("getAllImagesWithinPath & getAllVideosWithinPath", () => {
	const currentTimeString = now();
	const tempDir = path.join(
		os.tmpdir(),
		`getAllImagesWithinPath-${currentTimeString}`,
	);
	const emptytempDir = path.join(
		os.tmpdir(),
		`getAllImagesWithinPath-empty-${currentTimeString}`,
	);
	const imageFixturesDir = path.join(import.meta.dirname, "../fixtures/images");
	const videoFixturesDir = path.join(import.meta.dirname, "../fixtures/videos");
	beforeAll(async () => {
		await fsp.mkdir(tempDir, { recursive: true });
		await fsp.mkdir(emptytempDir, { recursive: true });
		await fsp.cp(imageFixturesDir, tempDir, { recursive: true });
		await fsp.cp(videoFixturesDir, tempDir, { recursive: true });
	});
	afterAll(async () => {
		await fsp.rm(tempDir, { recursive: true, force: true });
		await fsp.rm(emptytempDir, { recursive: true, force: true });
	});

	test("return nothing when dealing empty folder", async () => {
		expect(await getAllImagesWithinPath(emptytempDir)).toHaveLength(0);
		expect(await getAllVideosWithinPath(emptytempDir)).toHaveLength(0);
	});

	test("return all supported image files", async () => {
		const result = await getAllImagesWithinPath(tempDir);
		const expectedBasePathes = [
			"image.png",
			"image.jpg",
			"./subdirectory/image.jpeg",
		];
		const expectedResultPathes = expectedBasePathes.map((base) =>
			path.join(tempDir, base),
		);
		expect(result).toHaveLength(3);
		expect(result.sort()).toEqual(expectedResultPathes.sort());
	});

	test("return all supported video files", async () => {
		const result = await getAllVideosWithinPath(tempDir);
		const expectedBasePathes = [
			"video.mp4",
			"video.rmvb",
			"video.wmv",
			"./subdirectory/video.avi",
			"./subdirectory/video.flv",
			"./subdirectory/video.mkv",
			"./subdirectory/video.mov",
		];
		const expectedResultPathes = expectedBasePathes.map((base) =>
			path.join(tempDir, base),
		);
		expect(result).toHaveLength(7);
		expect(result.sort()).toEqual(expectedResultPathes.sort());
	});
});
