'use strict';
const crypto=require('node:crypto');
const STATES=Object.freeze(['draft','consented','queued','generating','review','approved','delivered','failed','deleted']);
const NEXT={draft:['consented','deleted'],consented:['queued','deleted'],queued:['generating','failed','deleted'],generating:['review','failed'],review:['approved','queued','deleted'],approved:['delivered','deleted'],delivered:['deleted'],failed:['queued','deleted'],deleted:[]};
function newOrderId(){return 'cl_'+crypto.randomBytes(16).toString('hex')}
function transition(order,to,now=new Date().toISOString()){
 if(!order||typeof order!=='object'||!STATES.includes(order.status)||!NEXT[order.status].includes(to))throw Error('Invalid order transition');
 return {...order,status:to,updatedAt:now};
}
function createOrder({consent=false}={}){
 return {id:newOrderId(),status:consent?'consented':'draft',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}
function safeOrderView(order){
 if(!order||!STATES.includes(order.status))throw Error('Invalid order');
 return {id:order.id,status:order.status,createdAt:order.createdAt,updatedAt:order.updatedAt};
}
module.exports={STATES,NEXT,newOrderId,transition,createOrder,safeOrderView};
