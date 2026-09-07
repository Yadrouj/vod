import { appendFile } from "node:fs/promises";
if (process.argv[2] === "slow") setInterval(() => {}, 1000);
else if (process.argv[2] === "fail") process.exitCode = 1;
else if (process.argv[2]) await appendFile(process.argv[2], "run\n");
