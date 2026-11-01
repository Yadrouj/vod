import test from "node:test";
import assert from "node:assert/strict";
import { collectMihanFiles } from "../mihan-source.mjs";

const row = (href,name=href) => `<tr><td><a href="${href}">${name}</a></td><td class="size">1 GB</td></tr>`;
test("Iranian movie discovery follows month/day directories but rejects parents, foreign hosts and non-video files",async()=>{
  const root="https://dl.mihandownload.com/Movies/2026/";
  const pages = new Map([[root,row("../")+row("07/")+row("https://unrelated.example/movie.mkv")],[root+"07/",row("../")+row("07/")],[root+"07/07/",row("../")+row("Example.1080p.mkv")+row("cover.jpg")]]);
  const visited=[];
  const result=await collectMihanFiles(root,async url=>{visited.push(url);assert.ok(pages.has(url));return pages.get(url)},{gapMs:0});
  assert.equal(result.complete,true);assert.equal(result.directoriesChecked,3);
  assert.deepEqual(result.files.map(file=>file.url),[root+"07/07/Example.1080p.mkv"]);
  assert.equal(visited.length,3);
});
test("a bounded discovery reports incomplete work rather than claiming the archive is finished",async()=>{
  const result=await collectMihanFiles("https://dl.mihandownload.com/Movies/2026/",async()=>row("07/"),{maxDirectories:1,gapMs:0});
  assert.equal(result.complete,false);assert.equal(result.remainingDirectories,1);
});
