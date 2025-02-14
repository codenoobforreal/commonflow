import "dotenv/config";
import path from "node:path";
import process from "node:process";

export const defaultInputDir = process.env["DEFAULTINPUTDIR"] as string;
export const defaultOutputDir = process.env["DEFAULTOUTPUTDIR"] as string;

export const realTestInputPath = path.join(
	import.meta.dir,
	"../real-test-input",
);
export const realTestOutputPath = path.join(
	import.meta.dir,
	"../real-test-output",
);
