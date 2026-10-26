import test from 'node:test';import assert from 'node:assert/strict';
import {formatDateTime,freshnessStatus} from '../web/format.mjs';
test('dates use Korean local time while absent data stays unknown',()=>{assert.match(formatDateTime('2026-10-26T00:17:00Z'),/09:17/);assert.equal(formatDateTime(null),'아직 없음');assert.equal(formatDateTime('invalid'),'확인 불가')});
test('stale thresholds distinguish48 hours and9 day weekly reports',()=>{const now='2026-10-26T00:00:00Z';assert.equal(freshnessStatus({lastSuccess:'2026-10-24T00:00:00Z',now}),'stale');assert.equal(freshnessStatus({lastSuccess:'2026-10-25T00:00:00Z',now}),'fresh');assert.equal(freshnessStatus({lastSuccess:'2026-10-17T00:00:00Z',now,weekly:true}),'stale');assert.equal(freshnessStatus({lastSuccess:null,now}),'missing')});
