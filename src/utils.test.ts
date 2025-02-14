import { describe, expect, test } from "bun:test";
import { realTestInputPath } from "./path";
import { getAllImagesWithinPath, getAllVideosWithinPath } from "./utils";
describe("utils", () => {
	describe("getAllVideosWithinPath", () => {
		test("should return exact number of all the videos in target path", async () => {
			const videos = await getAllVideosWithinPath(realTestInputPath);
			expect(videos.length).toBeGreaterThan(0);
			expect(videos.length).toBe(7);
		});
	});

	describe("getAllImagesWithinPath", () => {
		test("should return exact number of all the images in target path", async () => {
			const images = await getAllImagesWithinPath(realTestInputPath);
			expect(images.length).toBeGreaterThan(0);
			expect(images.length).toBe(3);
		});
	});
});
