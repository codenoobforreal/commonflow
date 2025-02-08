import "dotenv/config";

import process from "node:process";

export const defaultInputDir = process.env["DEFAULTINPUTDIR"] as string;
export const defaultOutputDir = process.env["DEFAULTOUTPUTDIR"] as string;
