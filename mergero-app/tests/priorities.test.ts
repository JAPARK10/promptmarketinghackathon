import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node's native test runner loads TypeScript directly.
import {prioritiesSchema, allocatePriority, emptyPriorities, profileSchema} from '../lib/assessment.ts';
test('priority budget accepts 20 and rejects excess, fractions and negative points',()=>{
 assert.equal(prioritiesSchema.safeParse({people:10,brand:10,location:0,ownerRole:0,price:0}).success,true);
 for(const patch of [{price:1},{people:11,brand:0},{people:-1},{people:1.5}])assert.equal(prioritiesSchema.safeParse({people:10,brand:10,location:0,ownerRole:0,price:0,...patch}).success,false);
});
test('dragging clamps to remaining points and lowering releases budget',()=>{
 let values=allocatePriority(emptyPriorities(),'people',10);
 values=allocatePriority(values,'brand',8);
 values=allocatePriority(values,'price',10);
 assert.equal(values.price,2);
 values=allocatePriority(values,'brand',3);
 values=allocatePriority(values,'price',10);
 assert.equal(values.price,7);
 assert.equal(Object.values(values).reduce((a,b)=>a+b,0),20);
});
test('profile storage preserves priorities and accepts older profiles',()=>{
 const p={assessment:{revenue:100,profit:20,employees:1,year:2025,industry:'Business services',location:'Finland'},company:'Example',email:'test@example.com',saveConsent:true,buyerVisible:true,contactConsent:false,culture:'',cultureShareConsent:false};
 assert.equal(profileSchema.safeParse(p).success,true);
 const priorities={people:8,brand:3,location:4,ownerRole:0,price:5};
 assert.deepEqual(profileSchema.parse({...p,successorPriorities:priorities}).successorPriorities,priorities);
 assert.equal(profileSchema.safeParse({...p,successorPriorities:{...priorities,price:6}}).success,false);
});
