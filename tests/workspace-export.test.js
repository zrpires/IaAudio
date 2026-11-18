import test from 'node:test';
import assert from 'node:assert/strict';
import {newRecord} from '../public/workspace-model.js';
import {csvCell,actionsCSV,recordMarkdown,safeFilename} from '../public/workspace-export.js';
function record(){return {...newRecord(),title:'Revisão do portal',project:'Projeto Alfa',participants:'Ana, Bruno',notes:'Contexto confirmado pelos participantes.',decisions:['Executar o piloto.'],actions:[{id:'task',title:'Validar acessos',assignee:'Ana',due:'2026-12-05',priority:'high',status:'doing'}]};}
test('CSV neutralizes spreadsheet formulas and escapes quotes and multiline values',()=>{
 for(const value of ['=1+1','+cmd','-1','@SUM(1)','   =1+1','\t=1+1','\n@cmd'])assert.ok(csvCell(value).startsWith('"\''));
 assert.equal(csvCell('Ana "A"; Bruno'),'"Ana ""A""; Bruno"');assert.equal(csvCell('linha 1\nlinha 2'),'"linha 1\nlinha 2"');
 const r=record();r.actions[0].assignee='=HYPERLINK("x")';const csv=actionsCSV([r]);assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/'=HYPERLINK/);assert.match(csv,/Em andamento/);
});
test('minutes include reviewed facts, responsible parties, deadlines and demo disclosure',()=>{
 const r={...record(),demo:true};const md=recordMarkdown(r);for(const value of [r.title,r.notes,r.decisions[0],r.actions[0].assignee,r.actions[0].due,'Em andamento','dados fictícios'])assert.ok(md.includes(value));assert.ok(!md.includes('Sem anotações.'));assert.equal(safeFilename('Reunião / Portal: versão 2'),'reuniao-portal-versao-2');
});
