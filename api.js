// Adaptado do código V8 validado na planilha; chamadas assíncronas no navegador.
window.VoteAPI=(()=>{
const CAM='https://dadosabertos.camara.leg.br/api/v2', SEN='https://legis.senado.leg.br/dadosabertos', TZ='America/Sao_Paulo';

const txt=x=>String(x==null?'':x).trim(), norm=x=>txt(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

// O proxy próprio, quando configurado, é a rota preferencial. Nenhum proxy público.
const pause_=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function proxy_(){const value=typeof VOTE_PROXY==='string'?VOTE_PROXY.trim():'';if(!value)return '';let u;try{u=new URL(value);}catch{throw Error('Endereço da ponte inválido em config.js.');}if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Configure uma URL HTTPS válida da ponte em config.js.');return u.href.replace(/\/$/,'');}
async function fetch_(url,accept){
 const headers={Accept:accept||'application/json'},proxy=proxy_();
 const request=async(target)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(target,{headers,cache:'no-store',signal:controller.signal,credentials:'omit'});const body=await r.text();if(!r.ok){let e=Error('HTTP '+r.status+' em '+url+' | '+body.replace(/\s+/g,' ').slice(0,220));e.status=r.status;throw e;}return body;}finally{clearTimeout(timer);}};
 const transient=e=>e instanceof TypeError||e.name==='AbortError'||[408,425,429,500,502,503,504].includes(e.status);
 const target=proxy?proxy+'/?url='+encodeURIComponent(url):url;
 try{return await request(target);}catch(e){if(!transient(e))throw e;await pause_(350);try{return await request(target);}catch(second){if(!transient(second))throw second;if(proxy){try{return await request(url);}catch(direct){throw Error('Falha na ponte e na consulta direta: '+url+' | '+second.message+' | '+direct.message);}}throw Error('Falha de acesso à API (rede, CORS ou instabilidade): '+url+'. Configure a ponte própria indicada no README.');}}
}
async function json_(url){return JSON.parse(await fetch_(url));}
async function pages_(url){let rows=[],seen=new Set();while(url){if(seen.has(url)||seen.size>=40)throw Error('Paginação incompleta; reduza o período.');if(!url.startsWith(CAM+'/'))throw Error('Link de paginação inesperado.');seen.add(url);let o=(await json_(url));if(!Array.isArray(o.dados))throw Error('Formato inesperado da Câmara.');rows.push(...o.dados);let n=(o.links||[]).find(x=>x.rel==='next');url=n?n.href:null;}return rows;}
// A rota de votos nominais não aceita parâmetros de paginação.
async function camVotes_(url){let o=(await json_(url+'/votos'));if(!Array.isArray(o.dados))throw Error('Formato inesperado dos votos da Câmara.');return o.dados;}
function walk_(obj,key){let out=[];if(!obj||typeof obj!=='object')return out;if(Array.isArray(obj)){for(const v of obj)out.push(...walk_(v,key));return out;}for(const k in obj){let v=obj[k];if(k===key&&v!=null)out.push(...(Array.isArray(v)?v:[v]));else if(typeof v==='object')out.push(...walk_(v,key));}return out;}
function field_(o,...keys){for(const k of keys)if(o&&o[k]!=null&&typeof o[k]!=='object'&&txt(o[k])!=='')return txt(o[k]);return '';}
function party_(p){let x=norm(p).replace(/[.]/g,'');let a={'REPUBLICAN':'Republicanos','REPUBLICANOS':'Republicanos','REPUBLICANO':'Republicanos','REPUBLICANOS BRASIL':'Republicanos','UNIAO':'União Brasil','UNIAO BRASIL':'União Brasil','UNIAO-BRASIL':'União Brasil','PODE':'Podemos','PODEMOS':'Podemos','PSOL':'Psol','PCDOB':'PC do B','PC DO B':'PC do B','CIDADANIA':'Cidadania','SOLIDARIED':'Solidariedade','SOLIDARIEDADE':'Solidariedade','AVANTE':'Avante','NOVO':'Novo','REDE':'Rede','AGIR':'Agir','MISSAO':'Missão','MOBILIZA':'Mobiliza','S/PARTIDO':'Sem partido','S/ PARTIDO':'Sem partido','SEM PARTIDO':'Sem partido','S PARTIDO':'Sem partido','S/P':'Sem partido','S.P.':'Sem partido','SPART':'Sem partido','S/Partido':'Sem partido'};return a[x]||x;}
function vote_(v){let s=norm(v);if(['SIM','S'].includes(s))return 'Sim';if(['NAO','N'].includes(s))return 'Não';if(['ABSTENCAO','ABST','ABSTENCAO.','ABSTENCAO REGISTRADA','ABSTENCAO DO VOTO','AB'].includes(s))return 'Abstenção';if(['AUSENTE','AUS','AUSENCIA','AP','MIS','LIC','LS','L','AUSENCIA JUSTIFICADA','NAO COMPARECEU','EM MISSAO','LICENCA','AUSENCIA PARLAMENTAR'].includes(s))return 'Ausente';if(s.includes('OBSTRU'))return 'Obstrução';if(/(?:^|[\s(])ART(?:IGO)?\.?\s*51\b/.test(s))return 'Art. 51 RISF';if(/^ART(?:IGO)?\.?\s*17\b/.test(s)||s==='PRESIDENTE'||s==='PRESIDINDO')return 'Art. 17';if(['SEM REGISTRO','SEM VOTO','SEM VOTO REGISTRADO','NAO REGISTROU VOTO',''].includes(s))return 'Sem registro';if(/\b(MISSAO|LICENCA|AFASTADO|AFASTAMENTO)\b/.test(s))return 'Outros';if(['PRESENTE','P-NRV','PNRV','NAO VOTOU','PRESENTE NAO VOTOU','PRESENTE, NAO VOTOU','IMPEDIDO','IMP','PRES','P'].includes(s))return 'Outros';return 'Indefinido';}
async function senate_(a,b){let u=SEN+'/plenario/lista/votacao/'+a.replace(/-/g,'')+'/'+b.replace(/-/g,'');let j;try{j=(await json_(u))}catch(e){u+='.json';j=(await json_(u))};let records=walk_(j,'Votacao');return {url:u,records:records.filter(v=>v&&typeof v==='object'&&(!v.SiglaCasa||norm(v.SiglaCasa)==='SF')&&norm(v.Secreta||v.IndicadorVotacaoSecreta)!=='S'&&walk_(v,'VotoParlamentar').length>0)};}
function camId_(v){return field_(v,'id');}

function propLabel_(p){
  if(!p||typeof p!=='object')return '';
  const q=p.proposicao||p;
  const type=field_(q,'siglaTipo','tipo'),num=field_(q,'numero'),year=field_(q,'ano');
  if(type&&num&&year)return type+' '+num+'/'+year;
  return field_(q,'descricaoIdentificacao','identificacao');
}
function propEntries_(a){return (Array.isArray(a)?a:a?[a]:[]).filter(x=>x&&typeof x==='object');}
function mainProp_(x){return /^(PL|PLP|PEC|MPV|PDC|PDL|PRC|PRN|PLN|PLC|PLS|PRS|PDS|PLV|PFC|PLOA|PLDO)\s/i.test(x);}
function camTitle_(root,base){
 const desc=field_(root,'descricao')||field_(base,'descricao')||'Votação sem descrição';
 const opening=field_(root.ultimaAberturaVotacao,'descricao');
 const affected=[...new Set(propEntries_(root.proposicoesAfetadas).map(propLabel_).filter(Boolean))];
 const objects=[...new Set(propEntries_(root.objetosPossiveis).map(propLabel_).filter(Boolean))];
 // A lista de afetadas é contexto, não prova de que o projeto principal foi o objeto efetivamente votado.
 const mains=[...new Set([...affected,...objects].filter(mainProp_))];
 const context=mains.length?mains:affected.length?affected:objects;
 const parts=[];
 if(context.length)parts.push(context.join(' / '));
 const accessories=objects.filter(x=>!context.includes(x));
 if(accessories.length)parts.push('objeto(s) possível(is): '+accessories.join(' / '));
 // A abertura costuma indicar número de destaque, emenda ou requerimento.
 if(opening&&norm(opening)!==norm(desc))parts.push(opening.replace(/\s+/g,' '));
 if(!parts.length)parts.push('Projeto não identificado nos metadados');
 parts.push(desc.replace(/\s+/g,' '));
 return parts.join(' — ');
}
async function enrichCam_(items,warnings){
 let cursor=0,failed=0;
 async function task(){while(cursor<items.length){const x=items[cursor++];try{const r=(await json_(CAM+'/votacoes/'+encodeURIComponent(x.id))).dados;if(!r||typeof r!=='object')throw Error('detalhe inválido');x.title=camTitle_(r,x.base);x.contextAvailable=true;}catch(e){failed++;/* manter os metadados já obtidos na listagem */ }delete x.base;}}
 await Promise.all(Array.from({length:Math.min(4,items.length)},task));
 if(failed)warnings.push('Não foi possível identificar o projeto de '+failed+' votação(ões).');
}
function camOfficial_(root,kind){
 const value=officialNumber_(root[kind==='sim'?'votosSim':'votosNao']);
 const m=field_(root,'descricao').match(kind==='sim'?/\bSim\s*:\s*(\d+)/i:/\bN[aã]o\s*:\s*(\d+)/i);
 if(m&&value!==''&&value!==Number(m[1]))throw Error('Placar estruturado diverge da descrição oficial ('+kind+'). Confira a fonte.');
 return value!==''?value:m?Number(m[1]):'';
}

function senId_(v){return field_(v,'CodigoSessaoVotacao','CodigoVotacao')||[field_(v,'CodigoSessao'),field_(v,'SequencialSessao')].join('-');}
function senMat_(v){return field_(v,'DescricaoIdentificacaoMateria')||[field_(v,'SiglaMateria'),[field_(v,'NumeroMateria'),field_(v,'AnoMateria')].filter(Boolean).join('/')].filter(Boolean).join(' ');}
function senData_(v){let d=field_(v,'DataSessao','DataVotacao');return d.slice(0,10);}
// A consulta da sessão complementa a listagem geral; não é uma fonte independente.
async function camRecent_(day){
 const warnings=[],rows=[];let events=[],succeeded=0;
 try{events=await pages_(CAM+'/orgaos/180/eventos?dataInicio='+day+'&dataFim='+day+'&itens=100');}catch(e){warnings.push('Lista de sessões: '+e.message);return {rows,warnings,succeeded,events:0};}
 for(const ev of events){const id=field_(ev,'id'),d=field_(ev,'dataHoraInicio').slice(0,10);if(!id||(d&&d!==day))continue;
  try{const vs=await pages_(CAM+'/eventos/'+encodeURIComponent(id)+'/votacoes');succeeded++;for(const v of vs){if((v.siglaOrgao||v.idOrgao)&&norm(v.siglaOrgao)!=='PLEN'&&String(v.idOrgao)!=='180')continue;rows.push({...v,_sessionDay:day,_plenary:true});}}catch(e){warnings.push('Sessão '+id+': '+e.message);}
 }
 return {rows,warnings,succeeded,events:events.length};
}

async function roster_(h,day){if(h==='Câmara')return (await pages_(CAM+'/deputados?dataInicio='+day+'&dataFim='+day+'&itens=100&ordem=ASC&ordenarPor=nome')).map(v=>[txt(v.nome),party_(v.siglaPartido),txt(v.siglaUf),txt(v.id)]);let j=(await json_(SEN+'/senador/lista/atual.json'));return walk_(j,'Parlamentar').map(v=>v.IdentificacaoParlamentar||v).map(v=>[field_(v,'NomeParlamentar','NomeCompletoParlamentar'),party_(field_(v,'SiglaPartidoParlamentar','SiglaPartido')),field_(v,'UfParlamentar','SiglaUF','UF'),field_(v,'CodigoParlamentar')]);}
function record_(name,p,uf,v,id,source){return [txt(name),party_(p),txt(uf).toUpperCase(),vote_(v),txt(id),txt(v),source];}
function unique_(rows){let m=new Map(),names=new Map();for(const r of rows){if(!r[0]||!r[1]||!r[2])throw Error('Registro sem nome, partido ou UF: '+r.join(' | '));let nk=norm(r[0])+'|'+r[2],k=r[4]?'id:'+r[4]:'nome:'+nk;let prev=m.get(k)||names.get(nk);if(prev){if(prev[1]!==r[1]||prev[3]!==r[3])throw Error('Duplicidade conflitante: '+r[0]+' ('+prev[3]+' / '+r[3]+'). Revise a fonte.');continue;}m.set(k,r);names.set(nk,r);}return [...m.values()];}
async function mergeRoster_(h,rows,day){let roster=(await validatedRoster_(h,day)),byId=new Map(roster.map(r=>[r[3],r])),byName=new Map(roster.map(r=>[norm(r[0])+'|'+r[2],r])),used=new Set(),out=[];for(const v of rows){let r=v[4]?byId.get(v[4]):byName.get(norm(v[0])+'|'+v[2]);if(!r)throw Error('Votante fora da composição consultada para a data: '+v[0]+'. Confira substituições; use lista completa manual.');if(r[1]!==v[1]||r[2]!==v[2])throw Error('Partido/UF diverge da composição consultada para a data: '+v[0]+'. Confira a filiação na data.');if(used.has(r[3]))throw Error('ID duplicado: '+v[0]);used.add(r[3]);v[4]=r[3];out.push(v);}for(const r of roster)if(!used.has(r[3]))out.push(record_(r[0],r[1],r[2],'Sem registro',r[3],'Bancada da data / sem voto localizado'));return out;}
function officialNumber_(x){return x===''||x==null||!/^\d+$/.test(txt(x))?'':Number(x);}

async function validatedRoster_(h,day){let r=(await roster_(h,day)), n=h==='Câmara'?513:81;if(r.length!==n||r.some(x=>!x[0]||!x[1]||!x[2]||!x[3])||new Set(r.map(x=>x[3])).size!==n)throw Error('Composição consultada retornou '+r.length+' nomes; esperado '+n+'. Confira vagas e suplentes e use a colagem completa se necessário.');return r;}

function summary_(rows,yes,no){let map=new Map();for(const r of rows){if(r[3]==='Indefinido')throw Error('Voto não reconhecido: '+r[5]+' ('+r[0]+').');let a=map.get(r[1])||[r[1],0,0,0];a[1]++;if(r[3]==='Não')a[2]++;if(r[3]==='Sim')a[3]++;map.set(r[1],a);}let result=[...map.values()].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'));let total=result.reduce((a,r)=>[a[0]+r[1],a[1]+r[2],a[2]+r[3]],[0,0,0]);if(yes!==''&&yes!==total[2]||no!==''&&no!==total[1])throw Error('Placar calculado diverge do oficial: não '+total[1]+', sim '+total[2]+'. Confira a fonte.');return {result,total};}

function displayVote_(h,r){
  const code=r[3], raw=norm(r[5]);
  if(code==='Sim')return 'sim';
  if(code==='Não')return 'não';
  if(code==='Art. 51 RISF'||(h==='Senado'&&code==='Art. 17'))return 'art. 51 RISF';
  if(code==='Art. 17')return 'art. 17';
  if(code==='Abstenção')return 'abstenção';
  if(code==='Obstrução')return 'obstrução';
  // Missão oficial, licença, impedimento e presença sem votar não são ausência.
  if(/\b(MISSAO|LICENCA|AFASTADO|AFASTAMENTO)\b/.test(raw)||['MIS','LIC','LS','L','IMP','IMPEDIDO'].includes(raw))return 'sem voto';
  if(code==='Ausente')return 'ausente';
  if(code==='Sem registro'||code==='Outros')return 'sem voto';
  throw Error('Voto não reconhecido: '+r[5]+' ('+r[0]+').');
}
function nominalRows_(h,rows){return rows.map(r=>[r[0],party_(r[1]),r[2],displayVote_(h,r)]).sort((a,b)=>a[0].localeCompare(b[0],'pt-BR')||a[2].localeCompare(b[2]));}

/** Site independente: não abre nem modifica planilhas. */

function check_(h,d){if(!['Câmara','Senado'].includes(h))throw Error('Casa inválida.');if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d+'T00:00:00Z').toISOString().slice(0,10)!==d||d>today())throw Error('Escolha uma data válida, até hoje.');}
async function listVotes(h,day){
 check_(h,day);let items=[],warnings=[];
 if(h==='Câmara'){
  let raw=[],ok=false;
  // Consulta geral com os parâmetros mínimos já usados pela planilha.
  try{raw=await pages_(CAM+'/votacoes?dataInicio='+day+'&dataFim='+day+'&idOrgao=180&itens=100');ok=true;}catch(e){warnings.push('Consulta geral: '+e.message);}
  // A listagem geral pode atrasar. Consulta independente por sessão do Plenário.
  const extra=await camRecent_(day);raw=raw.concat(extra.rows);warnings.push(...extra.warnings);
  for(const v of raw){let id=camId_(v),d=field_(v,'data').slice(0,10)||v._sessionDay||field_(v,'dataHoraRegistro').slice(0,10);if(!id||d!==day||(!v._plenary&&norm(v.siglaOrgao)!=='PLEN'&&String(v.idOrgao)!=='180'))continue;let desc=field_(v,'descricao')||'Votação sem descrição';if(/vota[cç][aã]o\s+simb[oó]lica|processo\s+simb[oó]lico/i.test(desc))continue;items.push({id,aux:'',title:camTitle_(v,v),time:field_(v,'dataHoraRegistro'),day,base:v});}
  if(!items.length&&warnings.length)throw Error('Não foi possível confirmar as votações de '+day+'. '+warnings.join(' | '));
  if(!ok&&!extra.succeeded&&!items.length)throw Error('Nenhuma rota de consulta confirmou a lista de votações.');
 }else{
  let s=(await senate_(day,day));for(const v of s.records){let id=senId_(v),d=senData_(v);if(!id||d!==day)continue;items.push({id,aux:field_(v,'CodigoSessao'),title:[senMat_(v),field_(v,'DescricaoVotacao'),field_(v,'Resultado')].filter(Boolean).join(' — '),time:field_(v,'HoraInicioVotacao','HoraVotacao','HoraSessao'),day});}
 }
 const seen=new Set();items=items.filter(v=>{let k=v.id+'|'+v.aux;if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>b.time.localeCompare(a.time));
 if(h==='Câmara')await enrichCam_(items,warnings);
 return {items,warnings,checkedAt:new Date().toISOString()};
}
async function getVote(h,day,id,aux){
 check_(h,day);if(typeof id!=='string'||!/^[0-9]+(?:-[0-9]+)*$/.test(id)||id.length>70||typeof aux!=='string'||!/^\d*$/.test(aux))throw Error('Identificador inválido.');
 let rows=[],yes='',no='',description='',source='',criterion='Lista nominal completa da data';
 if(h==='Câmara'){
  const url=CAM+'/votacoes/'+encodeURIComponent(id),root=(await json_(url)).dados;
  if(!root||(norm(root.siglaOrgao)!=='PLEN'&&String(root.idOrgao)!=='180')||field_(root,'data','dataHoraRegistro').slice(0,10)!==day)throw Error('Votação não pertence ao Plenário ou à data selecionada.');
  description=field_(root,'descricao')||'Votação nominal';if(/vota[cç][aã]o\s+simb[oó]lica|processo\s+simb[oó]lico/i.test(description))throw Error('Votação simbólica: selecione outra.');
  description=camTitle_(root,root);
  rows=(await camVotes_(url)).map(v=>{let r=v.deputado_||v.deputado||{};return record_(r.nome,r.siglaPartido,r.siglaUf,v.tipoVoto,r.id,url+'/votos');});yes=camOfficial_(root,'sim');no=camOfficial_(root,'não');source=url+'/votos';
 }else{
  let s=(await senate_(day,day)),v=s.records.find(x=>senId_(x)===id&&(!aux||field_(x,'CodigoSessao')===aux));if(!v)throw Error('Votação não localizada. Atualize a lista.');
  rows=walk_(v,'VotoParlamentar').map(x=>{let p=x.IdentificacaoParlamentar||x;return record_(field_(p,'NomeParlamentar'),field_(p,'SiglaPartido','SiglaPartidoParlamentar'),field_(p,'SiglaUF','UfParlamentar'),field_(x,'Voto','SiglaVoto'),field_(p,'CodigoParlamentar'),s.url);});
  yes=officialNumber_(v.TotalVotosSim);no=officialNumber_(v.TotalVotosNao);description=[senMat_(v),field_(v,'DescricaoVotacao'),field_(v,'Resultado')].filter(Boolean).join(' — ');source=s.url;
 }
 rows=unique_(rows);if(!rows.some(r=>['Sim','Não'].includes(r[3])))throw Error('Não há votos nominais disponíveis. Pode ser votação simbólica ou dados ainda não publicados.');
 if(h==='Câmara'&&(yes===''||no==='')&&rows.filter(r=>['Sim','Não','Abstenção','Obstrução'].includes(r[3])).length<257)throw Error('Lista nominal insuficiente; pode ser votação simbólica ou incompleta.');
 summary_(rows,yes,no); // validate the recorded votes before completing the roster
 let expected=h==='Câmara'?513:81;if(rows.length!==expected&&(h==='Câmara'||day===today())){rows=(await mergeRoster_(h,rows,day));criterion=h==='Câmara'?'Deputados em exercício consultados na data oficial da votação, reconciliados por ID; faltantes = sem voto. Em caso de substituição ou filiação divergente, a geração é bloqueada.':'Bancada atual da mesma data, reconciliada por ID; faltantes = sem voto';}else if(rows.length!==expected)throw Error('Lista histórica incompleta: '+rows.length+' de '+expected+'. Não usamos a bancada atual para datas antigas.');
 if(rows.length!==expected)throw Error('Cobertura incompleta.');const z=summary_(rows,yes,no);
 let parties=z.result.map(([p,b,n,s])=>[p,b,n,s,b-n-s,n/b,s/b,(b-n-s)/b]);let [b,n,s]=z.total;parties.push(['total',b,n,s,b-n-s,n/b,s/b,(b-n-s)/b]);
 let nominal=nominalRows_(h,rows);let presidents=nominal.filter(r=>r[3].startsWith('art.')).map(r=>r[0]+' ('+r[1]+'-'+r[2]+') — '+r[3]);
 return {house:h,day,id,description,source,criterion,official:yes!==''&&no!=='',parties,nominal,presidents,checkedAt:new Date().toISOString()};
}

return {listVotes,getVote};
})();
