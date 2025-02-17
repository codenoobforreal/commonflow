import {
	afterAll,
	beforeAll,
	describe,
	expect,
	setSystemTime,
	test,
} from "bun:test";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import isInCi from "is-in-ci";
import {
	getAllImagesWithinPath,
	getAllVideosWithinPath,
	getCurrentDateTime,
	getFileNameFromPath,
	isErrnoException,
	runFfmpegCommand,
	runFfprobeCommand,
} from "./utils";
describe("utils test", () => {
	test("getFileNameFromPath return result won't include extension", () => {
		const filename = getFileNameFromPath("/path/name.mp4");

		expect(filename).toEqual("name");
		expect(filename).not.toContain(".mp4");
	});

	describe("getAllImagesWithinPath & getAllVideosWithinPath", () => {
		const salt = Math.random().toString().replace(".", "");
		const tmp = os.tmpdir();
		const tempDir = path.join(tmp, `getAllImagesWithinPath-${salt}`);
		const emptytempDir = path.join(tmp, `getAllImagesWithinPath-empty-${salt}`);
		const imageFixturesDir = path.join(
			import.meta.dirname,
			"../fixtures/images",
		);
		const videoFixturesDir = path.join(
			import.meta.dirname,
			"../fixtures/videos",
		);
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

	test("return current time string", () => {
		setSystemTime(new Date("2000-01-01T00:00:00.000Z"));
		expect(getCurrentDateTime()).toBe("20000101000000");
		setSystemTime();
	});

	describe("isErrnoException", () => {
		test("should match real instance of isErrnoException", () => {
			const mockErrnoException = {
				errno: 1,
				code: "EACCES",
				path: "/some/path",
				syscall: "open",
				message: "Permission denied",
				stack: "Error: Permission denied",
			};
			Object.setPrototypeOf(mockErrnoException, Error.prototype);
			expect(isErrnoException(mockErrnoException)).toBe(true);
		});

		test("should return true when invoke with standard Error", () => {
			const nonErrnoError = new Error("Some other error");
			expect(isErrnoException(nonErrnoError)).toBe(true);
		});

		test("should return false when invoke with normal object", () => {
			const mockObject = {
				errno: 1,
				code: "EACCES",
				path: "/some/path",
				syscall: "open",
			};
			Object.setPrototypeOf(mockObject, Object.prototype);
			expect(isErrnoException(mockObject)).toBe(false);
		});

		test("check for partial properties", async () => {
			const partialMockErrnoException = {
				errno: 2,
				code: "ENOENT",
			};
			Object.setPrototypeOf(partialMockErrnoException, Error.prototype);
			expect(isErrnoException(partialMockErrnoException)).toBe(true);

			const minimalMockErrnoException = {
				errno: 2,
			};
			Object.setPrototypeOf(minimalMockErrnoException, Error.prototype);
			expect(isErrnoException(minimalMockErrnoException)).toBe(true);

			const invalidTypeMockErrnoException = {
				errno: "invalid",
				code: 123,
			};
			Object.setPrototypeOf(invalidTypeMockErrnoException, Error.prototype);
			expect(isErrnoException(invalidTypeMockErrnoException)).toBe(false);
		});
	});

	test.if(isInCi)(
		"should throw error when running in no ffmpeg or ffprobe environment",
		async () => {
			expect(async () => {
				await runFfprobeCommand([]);
			}).toThrowErrorMatchingInlineSnapshot();

			expect(async () => {
				await runFfmpegCommand([]);
			}).toThrowErrorMatchingInlineSnapshot();
		},
	);

	// you should have ffmpeg and ffprobe installed
	test.skipIf(isInCi)(
		"should return message without error when install both already",
		async () => {
			expect(async () => {
				await runFfprobeCommand([]);
			}).not.toThrowError();
			expect(await runFfprobeCommand(["-version"])).toContain(
				"ffprobe version",
			);
			expect(async () => {
				await runFfmpegCommand([]);
			}).not.toThrowError();
			expect(await runFfmpegCommand(["-version"])).toMatchInlineSnapshot(`""`);
		},
	);
});
