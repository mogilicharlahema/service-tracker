import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath}from'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const file=path.join(dir,'data.json');
const seed=JSON.parse(fs.readFileSync(path.join(dir,'seed.json')));
let state=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):seed;
let revision=0;
const app=express();app.use(express.json({limit:'15mb'}));
app.get('/api/health',(_,res)=>res.json({ok:true,mode:'DEMO ONLY'}));
app.get('/api/state',(_,res)=>res.json({state,revision}));
app.put('/api/state',(req,res)=>{if(req.body.revision!==revision)
return res.status(409).json({error:'Data changed in another session. Reload before saving.'});
const s=req.body.state;if(!s||!Array.isArray(s.services)||!s.lists||!Array.isArray(s.history)||!Array.isArray(s.notifications))
return res.status(400).json({error:'Invalid state'});if(new Set(s.services.map(x=>x.serviceId)).size!==s.services.length)return res.status(400).json({error:'Duplicate service IDs'});try{fs.writeFileSync(file+'.tmp',JSON.stringify(s,null,2));fs.renameSync(file+'.tmp',file);state=s;revision++;res.json({revision});}catch{res.status(500).json({error:'Unable to persist demo data'});}});
app.listen(3001,'127.0.0.1',()=>
console.log('Demo API: http://127.0.0.1:3001 (no production authentication)'));
