import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBundle} from '../../.test-build/load.js';
import {bundle} from './fixture.mjs';
test('network and HTTP failures are distinguishable from invalid schemas',async()=>{await assert.rejects(loadBundle(async()=>new Response('down',{status:503})),/Fetch error.*503/);await assert.rejects(loadBundle(async()=>{throw new TypeError('offline');}),/Fetch error.*offline/);await assert.rejects(loadBundle(async()=>new Response('not-json')),/Invalid schema.*JSON/);await assert.rejects(loadBundle(async()=>Response.json({schema_version:9})),/Invalid schema/);});
test('a valid fetched snapshot is validated before use',async()=>{const actual=await loadBundle(async()=>Response.json(bundle));assert.equal(actual.schema_version,1);assert.equal(actual.data_mode,'sample');});
