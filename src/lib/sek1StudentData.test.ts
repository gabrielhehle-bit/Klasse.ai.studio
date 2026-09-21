import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAppState, switchClassState} from './appState';
import {sek1GradeEntries, sek1GradebookComments} from './sek1StudentData';

test('directly entered secondary grades and gradebook notes appear without being mislabeled as calculated', () => {
  const app = normalizeAppState({
    activeClassId:'ms',schulart:'mittelschule',stufe:5,klassenbezeichnung:'1a',
    faecher:['Deutsch','Englisch'],
    schueler:[{id:'a',vorname:'A',nachname:'A',name:'A A'}],
    classes:[
      {id:'ms',name:'1a',stufe:5,schulart:'mittelschule',klassenvorstand:false,faecher:['Deutsch','Englisch'],
        schueler:[{id:'a',vorname:'A',nachname:'A',name:'A A'}],
        noten:{a:{Deutsch:{'1':{sa:[],lzk:[],wp:[],aufgaben:[],hue:0,hueAnm:[],endnote:'2',freitext:'Mündliche Mitarbeit gut'},'2':{sa:[],lzk:[],wp:[],aufgaben:[],hue:0,hueAnm:[],freitext:'Unterrichtsgespräch'}}}},
      },
      {id:'vs',name:'4b',stufe:4,schulart:'volksschule',klassenvorstand:true,schueler:[{id:'b',vorname:'B',nachname:'B',name:'B B'}],noten:{}},
    ],
  });
  assert.deepEqual(sek1GradeEntries(app,'a','1'),[{fach:'Deutsch',wert:'2',quelle:'direkt_eingetragen'}]);
  assert.deepEqual(sek1GradebookComments(app,'a'),[
    {fach:'Deutsch',semester:'1',text:'Mündliche Mitarbeit gut'},
    {fach:'Deutsch',semester:'2',text:'Unterrichtsgespräch'},
  ]);
  const vs=switchClassState(app,'vs');
  assert.deepEqual(sek1GradebookComments(vs,'a'),[]);
});
