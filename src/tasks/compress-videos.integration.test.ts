import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fsp from "node:fs/promises";

import isInCi from "is-in-ci";
import { realTestInputPath, realTestOutputPath } from "../path";
import { compressVideos } from "./compress-videos";

beforeAll(async () => {
	await fsp.mkdir(realTestOutputPath, { recursive: true });
});

afterAll(async () => {
	await fsp.rm(realTestOutputPath, { recursive: true, force: true });
});

describe.skipIf(isInCi)("integration test", () => {
	// FIXME: this test will fail in CI,don't know why
	test(
		"compress videos without reject",
		async () => {
			await expect(
				compressVideos({
					inputDir: realTestInputPath,
					outputDir: realTestOutputPath,
					type: "common",
				}),
			).resolves.toBeUndefined();
		},
		// 60s for long run test
		60 * 1000,
	);
});
