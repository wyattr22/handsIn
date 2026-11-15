const test=require('node:test');
const assert=require('node:assert/strict');
const {reviewedOccurrences,encodeRecord,recordContext}=require('../.integration-test-build/src/features/workspace/records');
const {decrypt,newKey}=require('../.integration-test-build/src/features/people/vault');
const {parseReportText}=require('../.integration-test-build/lib/health/parse-report');
const {emptyHealthDraft}=require('../.integration-test-build/lib/health/types');

test('reviewed schedules create distinct bounded occurrences without guessing times',()=>{
 const dates=reviewedOccurrences('2026-11-15',['08:00','20:00']);
 assert.equal(dates.length,14);assert.equal(new Set(dates).size,14);
 for(const time of ['8:00','24:00','12:60','noon'])assert.throws(()=>reviewedOccurrences('2026-11-15',[time]));
 assert.throws(()=>reviewedOccurrences('2026-02-31',['08:00']));
 assert.throws(()=>reviewedOccurrences('2026-11-15',['08:00','08:00']));
 assert.throws(()=>reviewedOccurrences('2026-11-15',['08:00'],8));
});
test('record ciphertext is bound to recipient, category and record identity',async()=>{
 const key=newKey(),recipient=crypto.randomUUID();
 const content={title:'Fictional medication',detail:'Reviewed source directions',reviewed:true};
 const command=await encodeRecord(recipient,'medications','medication',content,key);
 const row={id:command.id,recipient_id:recipient,category:'medications'};
 assert.deepEqual(await decrypt(key,command.contentCipher,recordContext(row)),content);
 await assert.rejects(decrypt(key,command.contentCipher,recordContext({...row,recipient_id:crypto.randomUUID()})));
 await assert.rejects(decrypt(key,command.contentCipher,recordContext({...row,category:'health'})));
 assert.ok(!JSON.stringify(command).includes(content.detail));
});
test('report extraction preserves printed values and requires explicit review',()=>{
 const draft=parseReportText('Laboratory: Fictional Lab\nGlucose 112 mg/dL (70-99) H\nSodium 139 mmol/L (135-145)',emptyHealthDraft);
 assert.equal(draft.results.length,2);
 assert.equal(draft.results[0].rawValue,'112');assert.equal(draft.results[0].unit,'mg/dL');
 assert.equal(draft.results[0].flag,'high');assert.equal(draft.results[1].flag,'not-provided');
 assert.ok(draft.results.every(r=>r.review==='needs-review'));
});
