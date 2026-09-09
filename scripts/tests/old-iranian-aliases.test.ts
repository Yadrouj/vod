import test from "node:test";
import assert from "node:assert/strict";
import {matchLegacyVideo,readLegacyList} from "../scrape-oitn-films.mjs";
test("reviewed Persian spellings require the matching source year",()=>{
 const entries=readLegacyList("1355051 میهمان\n1353027 صلوه ظهر");
 assert.equal(matchLegacyVideo({title:"👍 فیلم قدیمی - Mehman مهمان ۱۳۵۵ 👍"},entries)?.id,"old-iranian-1355051");
 assert.equal(matchLegacyVideo({title:"فیلم قدیمی؛ صلات ظهر | ۱۳۵۳ | رنگی اچ دی"},entries)?.id,"old-iranian-1353027");
 assert.equal(matchLegacyVideo({title:"فیلم قدیمی مهمان ۱۳۴۵"},entries),null);
 assert.equal(matchLegacyVideo({title:"فیلم قدیمی مهمان"},entries),null);
});
