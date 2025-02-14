import { afterAll, beforeAll, describe, test } from "bun:test";
import fsp from "node:fs/promises";
import isInCi from "is-in-ci";
import { realTestOutputPath } from "../path";

beforeAll(async () => {
	await fsp.mkdir(realTestOutputPath, { recursive: true });
});

afterAll(async () => {
	await fsp.rm(realTestOutputPath, { recursive: true, force: true });
});

describe.skipIf(isInCi)("integration test", () => {
	test.todo("compress images without reject", async () => {}, 60 * 1000);
});
