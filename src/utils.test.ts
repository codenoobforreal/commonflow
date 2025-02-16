import { describe, expect, test } from "bun:test";

import {
	getFileNameFromPath,
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
