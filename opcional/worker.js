// Cloudflare Worker OPCIONAL. Publique apenas se o navegador bloquear a API oficial por CORS.
// Troque a origem se o site passar para um domínio diferente.
const ORIGINS = new Set(['https://rafaeleaeblz.github.io']);
const allowed = {
  'dadosabertos.camara.leg.br': /^\/api\/v2\/(?:votacoes(?:\/[0-9]+(?:-[0-9]+)*(?:\/votos)?)?|orgaos\/180\/eventos|eventos\/[0-9]+\/votacoes|deputados)$/,
  'legis.senado.leg.br': /^\/dadosabertos\/(?:plenario\/lista\/votacao\/[0-9]{8}\/[0-9]{8}(?:\.json)?|senador\/lista\/atual\.json)$/
};
export default {async fetch(request) {
  const origin=request.headers.get('Origin');
  if(!ORIGINS.has(origin))return new Response('Origem não autorizada',{status:403});
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Accept','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
  const error=(status,message)=>new Response(JSON.stringify({error:message}),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='GET')return error(405,'Método não permitido');
  let url;try{url=new URL(new URL(request.url).searchParams.get('url'));}catch{return error(400,'URL inválida');}
  if(url.protocol!=='https:'||url.port||url.username||url.password||!Object.hasOwn(allowed,url.hostname)||!allowed[url.hostname].test(url.pathname)||url.href.length>2000)return error(403,'Rota não permitida');
  try{const r=await fetch(url.toString(),{headers:{Accept:'application/json'},redirect:'manual',cache:'no-store'});if(r.status>=300&&r.status<400)return error(502,'Redirecionamento inesperado na fonte oficial');return new Response(r.body,{status:r.status,headers});}catch{return error(502,'Falha ao acessar a fonte oficial');}
}};
