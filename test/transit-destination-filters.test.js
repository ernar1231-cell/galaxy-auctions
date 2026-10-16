'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const queue=fs.readFileSync(require.resolve('../api/direction-queue'),'utf8');
const picker=fs.readFileSync(require.resolve('../direction-lots-picker.js'),'utf8');
const create=fs.readFileSync(require.resolve('../api/admin-create-lot'),'utf8');
const edit=fs.readFileSync(require.resolve('../api/admin-update-lot'),'utf8');
test('transit port filtering uses existing destination metadata',()=>{
 assert.match(queue,/destinationOf\\(l\\)/);
 assert.match(queue,/direction==='transfer'/);
 assert.match(picker,/car\\.destination/);
 assert.match(picker,/data-direction-index/);
});
test('new lots store destination and edits preserve metadata',()=>{
 assert.match(create,/to:String\\(transit\\.to/);
 assert.match(edit,/\\.\\.\\.previous/);
});
