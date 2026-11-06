import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildAuthorBills} from '../lib/author-bills.js';
test('monthly bills sum each author across websites without recalculating historical rates',()=>{
 const bills=buildAuthorBills([{author:'Ali',domain:'a.com',count:3,pricedCount:3,totalPrice:4500},{author:'Ali',domain:'b.com',count:2,pricedCount:1,totalPrice:1000},{author:'Admin',domain:'a.com',count:4,pricedCount:0,totalPrice:0}]);
 assert.equal(bills.length,2);assert.deepEqual(bills[0],{author:'Ali',count:5,pricedCount:4,total:5500,sites:[{domain:'a.com',count:3,pricedCount:3,amount:4500},{domain:'b.com',count:2,pricedCount:1,amount:1000}]});assert.equal(bills[1].total,0);assert.deepEqual(buildAuthorBills([]),[]);
});
