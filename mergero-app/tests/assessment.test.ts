import { test } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node's native test runner loads TypeScript directly.
import { assessmentSchema, estimate, profileSchema, wordCount } from '../lib/assessment.ts';
const base={revenue:2_000_000,profit:250_000,employees:15,year:2025,industry:'Business services' as const,location:'Finland'};
test('demo range is transparent and deterministic',()=>{assert.deepEqual(estimate(base),{low:750000,high:1250000,margin:12.5,model:'demo-1'});});
test('loss-making and break-even companies get no misleading positive range',()=>{for(const profit of [-50000,0]){assert.equal(estimate({...base,profit}).low,null);assert.equal(estimate({...base,profit}).high,null);}});
test('invalid, missing and non-finite numbers are rejected',()=>{for(const patch of [{revenue:0},{profit:Infinity},{employees:-1},{employees:1.5},{profit:3000000},{industry:'unknown'},{year:3000}])assert.equal(assessmentSchema.safeParse({...base,...patch}).success,false);});
const profile={assessment:base,company:'Example Ltd',email:'owner@example.test',saveConsent:true,buyerVisible:false,contactConsent:false,culture:'People come first.',cultureShareConsent:false};
test('storage requires explicit consent, independently from contact consent',()=>{assert.equal(profileSchema.safeParse(profile).success,true);assert.equal(profileSchema.safeParse({...profile,saveConsent:false}).success,false);assert.equal(profileSchema.safeParse({...profile,saveConsent:undefined}).success,false);assert.equal(profileSchema.safeParse({...profile,contactConsent:true}).success,true);});
test('culture sharing requires content and enforces the 500-word limit',()=>{assert.equal(wordCount('  One\n two  '),2);assert.equal(profileSchema.safeParse({...profile,culture:'',cultureShareConsent:true}).success,false);assert.equal(profileSchema.safeParse({...profile,culture:'word '.repeat(501)}).success,false);assert.equal(profileSchema.safeParse({...profile,culture:'word '.repeat(500)}).success,true);});
