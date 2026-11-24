// Ponte de leitura das APIs oficiais; não é um proxy genérico.
const ORIGIN = 'https://rafaeleaeblz.github.io';
const routes = {
  'dadosabertos.camara.leg.br': /^\/api\/v2\/(?:votacoes(?:\/[0-9]+(?:-[0-9]+)*(?:\/votos)?)?|orgaos\/180\/eventos|eventos\/[0-9]+\/votacoes|deputados)$/,
  'legis.senado.leg.br': /^\/dadosabertos\/(?:plenario\/lista\/votacao\/[0-9]{8}\/[0-9]{8}(?:\.json)?|senador\/lista\/atual\.json)$/
};
function permitted(u){return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&Object.hasOwn(routes,u.hostname)&&routes[u.hostname].test(u.pathname)&&u.href.length<=2000;}
export default {async fetch(request){
  const incoming=new URL(request.url),origin=request.headers.get('Origin');
  const headers={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Accept','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
  const reply=(status,obj)=>new Response(JSON.stringify(obj),{status,headers});
  // Teste de instalação, sem consultar nenhuma API.
  if(request.method==='GET'&&!incoming.searchParams.has('url'))return reply(200,{ok:true,servico:'Como votou — Poder360',versao:3});
  if(origin!==ORIGIN)return reply(403,{error:'Origem não autorizada'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='GET')return reply(405,{error:'Método não permitido'});
  let u;try{u=new URL(incoming.searchParams.get('url'));}catch{return reply(400,{error:'URL inválida'});}
  if(!permitted(u))return reply(403,{error:'Rota não permitida'});
  try{
    const r=await fetch(u.href,{headers:{Accept:'application/json'},redirect:'manual',cache:'no-store'});
    if(r.status>=300&&r.status<400)return reply(502,{error:'Redirecionamento inesperado na API oficial',status:r.status});
    const body=await r.text();
    if(!r.ok)return reply(r.status,{error:'Erro na API oficial',status:r.status,detail:body.slice(0,500)});
    try{JSON.parse(body);}catch{return reply(502,{error:'A API oficial não retornou JSON'});}
    return new Response(body,{status:200,headers});
  }catch(e){return reply(502,{error:'Falha ao consultar a API oficial',detail:String(e.message||e).slice(0,200)});}
}};
