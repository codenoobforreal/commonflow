import { describe, expect, test } from "bun:test";

import { realTestInputPath } from "../path";
import { walkDir } from "./compress-images";

describe("walkDir", () => {
	test("should return exact number of dirs of the real-test folder", async () => {
		const dirs = await walkDir([realTestInputPath]);
		expect(dirs.length).toBeGreaterThan(0);
		expect(dirs.length).toBe(7);
	});
});

describe("integration test", () => {
	test.todo("compress images without reject", async () => {}, 60 * 1000);
});
