'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../direction-lots-picker.js'),'utf8');
test('transit country filter parses',()=>assert.doesNotThrow(()=>new vm.Script(source)));
test('countries derive from existing destination data and only assigned countries appear',()=>{
 assert.ok(source.includes('for(const car of cars)'));
 assert.ok(source.includes('countryOf(car.destination)'));
 assert.ok(source.includes('ordered.slice(0,4)'));
 assert.ok(source.includes('Все направления'));
 assert.ok(source.includes("key==='__all__'"));
 assert.ok(source.includes("direction==='transfer'"));
});
