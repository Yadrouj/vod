import assert from "node:assert/strict";
import test from "node:test";
import { titleSynopsis } from "../../lib/title-synopsis";
test("prefer a real Persian synopsis, fallback from SEO boilerplate without inventing a plot", () => {
 assert.equal(titleSynopsis({persianOverview:"داستان یک معلم",overview:"A teacher's story"},"fa"),"داستان یک معلم");
 assert.equal(titleSynopsis({persianOverview:"دانلود فیلم دانلود رایگان دانلود سریال",overview:"A teacher's story"},"fa"),"A teacher's story");
 assert.equal(titleSynopsis({persianOverview:"دانلود دانلود دانلود"},"fa"),null);
 assert.equal(titleSynopsis({persianOverview:"داستان",overview:"English plot"},"en"),"English plot");
 assert.equal(titleSynopsis({},"fa"),null);
});
