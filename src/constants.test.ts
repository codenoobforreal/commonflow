import { describe, expect, test } from "bun:test";
import { SUPPORTIMAGEEXT, SUPPORTVIDEOEXT } from "./constants";

describe("utils test", () => {
	test("video extensions should keep the same", () => {
		expect(SUPPORTVIDEOEXT).toEqual([
			"avi",
			"flv",
			"mp4",
			"mpeg",
			"mpg",
			"mkv",
			"m4v",
			"mov",
			"rmvb",
			"ts",
			"webm",
			"wmv",
			"3gp",
			"3g2",
		]);
	});

	test("image extensions should keep the same", () => {
		expect(SUPPORTIMAGEEXT).toEqual(["jpg", "jpeg", "png"]);
	});
});
