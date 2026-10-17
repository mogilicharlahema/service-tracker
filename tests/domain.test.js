import test from 'node:test';import assert from 'node:assert/strict';import{pending,overdue,validate,nextId,group,fields}from'../src/domain.js';
test('all workbook fields mapped',()=>assert.equal(fields.length,22));
test('pending includes waiting, excludes terminal',()=>{assert.equal(pending({status:'Waiting for Vendor'}),true);for(const status of ['Completed','Closed','Cancelled'])assert.equal(pending({status}),false)});
test('overdue excludes missing targets and completed',()=>{const now=new Date('2026-10-17T12:00:00Z');assert.equal(overdue({status:'Open',targetDate:'2026-10-16'},now),true);assert.equal(overdue({status:'Open',targetDate:'2026-10-17'},now),false);assert.equal(overdue({status:'Open'},now),false);assert.equal(overdue({status:'Completed',targetDate:'2026-10-01'},now),false)});
test('completion requires resolution',()=>assert.ok(validate({clientName:'Demo',location:'Site',description:'Issue',priority:'High',status:'Completed'}).some(e=>e.includes('Resolution'))));
test('assignment requires assignee',()=>assert.ok(validate({clientName:'Demo',location:'Site',description:'Issue',priority:'High',status:'Assigned'}).some(e=>e.includes('assignee'))));
test('dates are ordered',()=>assert.ok(validate({raisedAt:'2026-10-02',assignedAt:'2026-10-01'}).some(e=>e.includes('precede'))));
test('IDs advance from largest suffix',()=>{const y=new Date().getFullYear();assert.equal(nextId([{serviceId:`SRV-${y}-004`}]),`SRV-${y}-005`)});
test('missing category is visible',()=>assert.deepEqual(group([{category:''}],'category'),[{name:'Unspecified',value:1}]));
