// Parser + validação do Excel Ferreira Camargo (porta da Fase 0.1 para Node).
// processarBuffer(buf) -> { ok, dados, validacao, erros }  — nunca lança; erros viram ok:false.
const XLSX = require("xlsx");

const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : null; };
const CASA = /creche|aluguel|celular/i;
const rows = (wb, nome) => {
  const ws = wb.Sheets[nome];
  return ws ? XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) : null;
};

// ---- financeiro: 4 blocos (Hudson/Anne x Out/Nov) ----
function parseFinanceiro(wb, erros) {
  const r = rows(wb, "Planilha3");
  if (!r) { erros.push("aba 'Planilha3' ausente"); return null; }
  const blocos = [[0,1,"Outubro","Hudson"],[4,5,"Outubro","Anne"],[8,9,"Novembro","Hudson"],[12,13,"Novembro","Anne"]];
  const brutos = {};
  for (const [c1,c2,mes,pessoa] of blocos) {
    let modo=null; const ent=[], sai=[];
    for (let i=1;i<r.length;i++){
      const lab=r[i]?.[c1], val=r[i]?.[c2];
      if (lab==null) continue;
      const l=String(lab).trim().toLowerCase();
      if (l.startsWith("saldos positivos")){modo="in";continue;}
      if (l.startsWith("saldos negativos")){modo="out";continue;}
      if (l==="motivo"||l==="total"||l.startsWith("valor sobrando")) continue;
      const v=num(val); if (v==null) continue;
      (modo==="in"?ent:sai).push({motivo:String(lab).trim(), valor:v});
    }
    brutos[`${mes}|${pessoa}`]={ent,sai};
  }
  // monta visões por mês
  const meses=[];
  for (const mes of ["Outubro","Novembro"]) {
    const bh=brutos[`${mes}|Hudson`], ba=brutos[`${mes}|Anne`];
    const pessoa=(b)=>{
      const entradas=b.ent.map(e=>({...e}));
      const saidas=b.sai.map(s=>CASA.test(s.motivo)
        ? {motivo:cap(s.motivo),valor:round2(s.valor/2),tipo:"casa"}
        : {motivo:s.motivo.trim(),valor:s.valor,tipo:"cartao"});
      return totais(entradas,saidas);
    };
    const familia=()=>{
      const ent=[...bh.ent.map(e=>donoEnt(e,"Hudson")),...ba.ent.map(e=>donoEnt(e,"Anne"))];
      const casa=bh.sai.filter(s=>CASA.test(s.motivo)).map(s=>({motivo:cap(s.motivo),valor:s.valor,tipo:"casa"}));
      const cart=[...bh.sai.filter(s=>!CASA.test(s.motivo)).map(s=>({motivo:s.motivo.trim()+" · H",valor:s.valor,tipo:"cartao"})),
                  ...ba.sai.filter(s=>!CASA.test(s.motivo)).map(s=>({motivo:s.motivo.trim()+" · A",valor:s.valor,tipo:"cartao"}))];
      return totais(ent,[...casa,...cart]);
    };
    meses.push({rotulo:mes, visoes:{hudson:pessoa(bh), anne:pessoa(ba), familia:familia()}, _bruto:{bh,ba}});
  }
  return meses;
}
const round2=n=>Math.round(n*100)/100;
const cap=s=>{s=s.trim();return s.charAt(0).toUpperCase()+s.slice(1);};
const donoEnt=(e,dono)=>({motivo:/sal/i.test(e.motivo)?`${e.motivo} · ${dono}`:e.motivo, valor:e.valor});
function totais(entradas,saidas){
  const te=round2(entradas.reduce((a,b)=>a+b.valor,0)), ts=round2(saidas.reduce((a,b)=>a+b.valor,0));
  return {entradas,saidas,total_entradas:te,total_saidas:ts,sobra:round2(te-ts)};
}

// ---- aniversário ----
function parseAniversario(wb){
  const o=rows(wb,"Organização")||[];
  const itens=[];
  for (let i=1;i<=13 && i<o.length;i++){
    const nome=o[i]?.[0]; if(!nome||!String(nome).trim())continue;
    const v=num(o[i][1]); if(v==null)continue;
    const p=num(o[i][2])||0, f=num(o[i][3]);
    itens.push({item:String(nome).trim(),valor:v,pago:round2(p),falta:round2(f==null?v-p:f)});
  }
  let cap_flag=false; const falta=[];
  for(const row of o){ if(row?.[0]&&String(row[0]).trim().toLowerCase().startsWith("o que falta")){cap_flag=true;continue;}
    if(cap_flag&&row?.[0]&&num(row[1])!=null) falta.push({item:String(row[0]).trim(),valor:num(row[1])}); }
  const lembr=o.filter(r=>r?.[7]&&String(r[7]).trim()&&!/lembranc/i.test(String(r[7]))).map(r=>String(r[7]).trim());
  const orcado=round2(itens.reduce((a,b)=>a+b.valor,0)), pago=round2(itens.reduce((a,b)=>a+b.pago,0));
  const comidaR=rows(wb,"comida")||[]; const comida=[];
  for(let i=1;i<comidaR.length;i++){const it=comidaR[i]?.[0],t=num(comidaR[i]?.[3]); if(it&&t!=null)comida.push({item:String(it).trim().slice(0,60),total:t});}
  const listaR=rows(wb,"lista.")||[]; const adultos=listaR.slice(1).filter(r=>r?.[0]&&String(r[0]).trim()&&String(r[0]).trim().toLowerCase()!=="save the date").length;
  const criancasR=rows(wb,"Planilha2")||[]; const criancas=criancasR.slice(1).filter(r=>r?.[0]&&String(r[0]).trim()).length;
  return {itens,orcado,pago,falta:round2(orcado-pago),falta_comprar:falta,
    extra_pendente:round2(falta.reduce((a,b)=>a+b.valor,0)),lembrancinhas:lembr,
    caixa:{tenho_conta:3177,a_entrar:900,total_disponivel:4077},
    comida,total_comida:round2(comida.reduce((a,b)=>a+b.total,0)),
    n_adultos_lista:adultos,n_criancas:criancas,convidados_total:adultos+criancas};
}

// ---- validação / conciliação (reusa Fase 0.1) ----
function validar(meses){
  const checks=[]; let ok=true;
  for(const m of meses){
    const {bh,ba}=m._bruto;
    const entExcel=round2([...bh.ent,...ba.ent].reduce((a,b)=>a+b.valor,0));
    const saiExcel=round2([...bh.sai,...ba.sai].reduce((a,b)=>a+b.valor,0));
    const casaDup=round2(bh.sai.filter(s=>CASA.test(s.motivo)).reduce((a,b)=>a+b.valor,0));
    const f=m.visoes.familia;
    const cEnt=Math.abs(f.total_entradas-entExcel)<0.02;
    const cSai=Math.abs((saiExcel-f.total_saidas)-casaDup)<0.02;
    const cCons=Math.abs((m.visoes.hudson.sobra+m.visoes.anne.sobra)-f.sobra)<0.02;
    ok=ok&&cEnt&&cSai&&cCons;
    checks.push({mes:m.rotulo,entradas_ok:cEnt,saidas_dif_casa_ok:cSai,consolidacao_ok:cCons});
  }
  return {ok,checks};
}

function processarBuffer(buf){
  try{
    const wb=XLSX.read(buf,{type:"buffer"});
    const erros=[];
    const meses=parseFinanceiro(wb,erros);
    if(!meses) return {ok:false,erros,dados:null,validacao:null};
    const validacao=validar(meses);
    const aniversario=parseAniversario(wb);
    meses.forEach(m=>delete m._bruto); // limpa metadados internos
    const dados={financeiro:{meses},aniversario};
    if(!validacao.ok) erros.push("conciliação falhou — planilha incompatível com o modelo esperado");
    return {ok:validacao.ok,erros,dados,validacao};
  }catch(e){
    return {ok:false,erros:["arquivo ilegível ou corrompido: "+e.message],dados:null,validacao:null};
  }
}
module.exports={processarBuffer};
