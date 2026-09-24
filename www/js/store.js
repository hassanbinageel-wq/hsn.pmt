/* المتجر: الحالة والحفظ المحلي + العملات + نظام الرصيد (Credits) + الحسابات */
window.App = window.App || {};
(function(A){
  var STATE=null;

  function defaultVault(){
    return {
      meta:{schema:3, createdAt:new Date().toISOString()},
      settings:{
        baseCurrency:'SAR',
        theme:'auto',
        rates:{usdToSar:3.75, usdToAed:3.6725, usdToQar:3.64, usdToOmr:0.385, usdToYer:250, updatedAt:null},
        home:{cover:'', title:'hsn.pmt'},
        business:{name:'hsn.pmt', logo:'', stamp:'', phone:'', address:'', email:'', extra:''},
        invoice:{headerText:'', footerText:'شكراً لتعاملكم معنا', paymentTerms:'', transferInfo:'', color:'#0b110e',
                 numbering:'continuous', prefix:'INV-', pad:4, nextNumber:1, yearCounters:{},
                 columns:{desc:'الوصف', type:'النوع', qty:'الكمية', price:'السعر', total:'الإجمالي'},
                 socials:{instagram:{handle:'',on:true}, tiktok:{handle:'',on:true}, facebook:{handle:'',on:true}, whatsapp:{handle:'',on:true}}}
      },
      clients:[], groups:[], works:[], subscriptions:[], invoices:[]
    };
  }

  var _persist = A.debounce(function(){
    if(!STATE) return;
    A.DB.set('vault', STATE).catch(function(e){ A.toast('تعذر الحفظ المحلي','err'); console.error(e); });
  },250);

  A.Store={
    state:function(){return STATE;},
    settings:function(){return STATE.settings;},
    theme:function(){return (STATE&&STATE.settings.theme)||'auto';},
    setTheme:function(t){STATE.settings.theme=t;this.persist();},

    initNew:function(){ STATE=defaultVault(); return this.persistNow(); },
    load:function(){ return A.DB.get('vault').then(function(p){ STATE = p? migrate(p) : defaultVault(); }); },
    persist:function(){ _persist(); },
    persistNow:function(){ return A.DB.set('vault', STATE); },

    // ---------- currency ----------
    rates:function(){return STATE.settings.rates;},
    base:function(){return STATE.settings.baseCurrency;},
    convert:function(amount, from, to){
      if(amount==null) amount=0;
      if(from===to) return amount;
      var r=STATE.settings.rates;
      var RATE={USD:1, SAR:r.usdToSar, AED:r.usdToAed, QAR:r.usdToQar, OMR:r.usdToOmr, YER:r.usdToYer}; // units per 1 USD
      var fr=RATE[from], tr=RATE[to];
      if(fr==null||tr==null||fr===0||tr===0) return null;
      return amount/fr*tr;
    },
    toBase:function(amount,from){return this.convert(amount,from,STATE.settings.baseCurrency);},

    // ---------- clients ----------
    clients:function(){return STATE.clients;},
    getClient:function(id){return STATE.clients.find(function(c){return c.id===id;});},
    saveClient:function(c){
      if(c.id){var i=STATE.clients.findIndex(function(x){return x.id===c.id;});if(i>=0)STATE.clients[i]=c;}
      else{c.id=A.uid();c.createdAt=new Date().toISOString();STATE.clients.push(c);}
      this.persist();return c;
    },
    deleteClient:function(id){STATE.clients=STATE.clients.filter(function(c){return c.id!==id;});this.persist();},
    clientWorks:function(id){return STATE.works.filter(function(w){return w.clientId===id;});},
    clientInvoices:function(id){return STATE.invoices.filter(function(v){return v.clientId===id;});},

    // ---------- works ----------
    works:function(){return STATE.works;},
    getWork:function(id){return STATE.works.find(function(w){return w.id===id;});},
    saveWork:function(w){
      if(w.id){var i=STATE.works.findIndex(function(x){return x.id===w.id;});if(i>=0)STATE.works[i]=w;}
      else{w.id=A.uid();w.createdAt=new Date().toISOString();STATE.works.push(w);}
      this.persist();return w;
    },
    deleteWork:function(id){ STATE.works=STATE.works.filter(function(w){return w.id!==id;}); this.persist(); },
    // ---------- groups (جهات) — optional container for works ----------
    groups:function(){return STATE.groups||(STATE.groups=[]);},
    getGroup:function(id){return this.groups().find(function(g){return g.id===id;});},
    saveGroup:function(g){
      var list=this.groups();
      if(g.id){var i=list.findIndex(function(x){return x.id===g.id;});if(i>=0)list[i]=g;}
      else{g.id=A.uid();g.createdAt=new Date().toISOString();list.push(g);}
      this.persist();return g;
    },
    deleteGroup:function(id){ // works stay, become ungrouped
      STATE.groups=this.groups().filter(function(g){return g.id!==id;});
      STATE.works.forEach(function(w){if(w.groupId===id)w.groupId='';});
      this.persist();
    },
    groupWorks:function(id){return STATE.works.filter(function(w){return w.groupId===id;});},
    groupSummary:function(id){
      var base=STATE.settings.baseCurrency, ws=this.groupWorks(id), s={count:ws.length,agreed:0,profit:0,cost:0,remaining:0,received:0,lastDate:'',missing:false};
      ws.forEach(function(w){
        var d=w.startDate||(w.createdAt||'').slice(0,10); if(d>s.lastDate)s.lastDate=d;
        if(w.status==='cancel')return;
        var f=A.Store.workFinance(w); if(f.missing)s.missing=true;
        s.agreed+=f.agreedBase; s.profit+=f.profit; s.cost+=f.itemsCost; s.received+=f.receivedBase;
        var r=A.Store.convert(f.remainingOrig,w.agreedCurrency||base,base); if(r==null)s.missing=true; else s.remaining+=r;
      });
      return s;
    },
    duplicateWork:function(id){
      var w=this.getWork(id);if(!w)return null;
      var copy=JSON.parse(JSON.stringify(w));
      copy.id=A.uid();copy.createdAt=new Date().toISOString();
      copy.name=(w.name||'')+' (نسخة)';copy.status='new';
      copy.payments=[];copy.startDate=A.todayISO();copy.deliveryDate='';copy.finalLink='';
      STATE.works.push(copy);this.persist();return copy;
    },

    workCredits:function(w){ return A.parseNum(w.videoCredits)+A.parseNum(w.imageCredits); }, // informational
    // production cost entered directly (video cost + image cost) in prodCurrency
    workItemsCost:function(w){
      var base=STATE.settings.baseCurrency;
      var cur=w.prodCurrency||'USD';
      var orig=A.parseNum(w.videoCost)+A.parseNum(w.imageCost);
      var b=A.Store.convert(orig, cur, base); var missing=false; if(b==null){missing=true;b=0;}
      return {orig:orig, base:b, missing:missing, currency:cur, credits:this.workCredits(w),
              videoCredits:A.parseNum(w.videoCredits), videoCost:A.parseNum(w.videoCost), videoCount:A.parseNum(w.videoCount),
              imageCredits:A.parseNum(w.imageCredits), imageCost:A.parseNum(w.imageCost), imageCount:A.parseNum(w.imageCount)};
    },
    workReceivedInAgreed:function(w){
      var cur=w.agreedCurrency||STATE.settings.baseCurrency, sum=0, missing=false;
      (w.payments||[]).forEach(function(p){var c=A.Store.convert(A.parseNum(p.amount),p.currency||cur,cur);if(c==null)missing=true;else sum+=c;});
      return {amount:sum, missing:missing};
    },
    workFinance:function(w){
      var base=STATE.settings.baseCurrency;
      var items=this.workItemsCost(w);
      var totalCost=items.base;
      var agreedBase=this.convert(A.parseNum(w.agreedAmount), w.agreedCurrency||base, base);
      var missing=items.missing||(agreedBase==null);
      if(agreedBase==null) agreedBase=0;
      var profit=agreedBase-totalCost;
      var margin=agreedBase>0?(profit/agreedBase*100):0;
      var recv=this.workReceivedInAgreed(w);
      var receivedBase=this.convert(recv.amount, w.agreedCurrency||base, base); if(receivedBase==null){receivedBase=0;missing=true;}
      var remainingOrig=A.parseNum(w.agreedAmount)-recv.amount;
      var payStatus = recv.amount<=0?'unpaid':(recv.amount+0.001>=A.parseNum(w.agreedAmount)?'paid':'partial');
      return {itemsCost:items.base, itemsOrig:items.orig, prodCurrency:items.currency, credits:items.credits,
              videoCredits:items.videoCredits, videoCost:items.videoCost, videoCount:items.videoCount,
              imageCredits:items.imageCredits, imageCost:items.imageCost, imageCount:items.imageCount,
              totalCost:totalCost, agreedBase:agreedBase, profit:profit, margin:margin,
              receivedBase:receivedBase, receivedOrig:recv.amount, remainingOrig:remainingOrig,
              payStatus:payStatus, missing:missing, isLoss:profit<0 && w.status!=='cancel'};
    },
    productionTotalBase:function(){
      var t=0; STATE.works.forEach(function(w){ if(w.status!=='cancel'){ t+=A.Store.workItemsCost(w).base; } }); return t;
    },

    // ---------- subscriptions (tools) with credit balance ----------
    subscriptions:function(){return STATE.subscriptions;},
    getSub:function(id){return STATE.subscriptions.find(function(s){return s.id===id;});},
    saveSub:function(s){
      s.entries=s.entries||[];
      if(s.id){var i=STATE.subscriptions.findIndex(function(x){return x.id===s.id;});if(i>=0)STATE.subscriptions[i]=s;}
      else{s.id=A.uid();s.createdAt=new Date().toISOString();STATE.subscriptions.push(s);}
      this.persist();return s;
    },
    deleteSub:function(id){STATE.subscriptions=STATE.subscriptions.filter(function(s){return s.id!==id;});this.persist();},
    addSubEntry:function(id, entry){ var s=this.getSub(id); if(!s)return; s.entries=s.entries||[]; s.entries.push(entry); this.persist(); return s; },
    subPaidOrig:function(s){ return (s.entries||[]).reduce(function(a,e){return a+A.parseNum(e.amount);},0); },
    subPaidBase:function(s){ return A.Store.convert(this.subPaidOrig(s), s.currency, STATE.settings.baseCurrency); },
    subCreditsTotal:function(s){ return (s.entries||[]).reduce(function(a,e){return a+A.parseNum(e.credits);},0); },
    subCreditPrice:function(s){ var cr=this.subCreditsTotal(s); return cr>0? this.subPaidOrig(s)/cr : null; }, // tool currency per credit
    subsSummary:function(){
      var paid=0, credits=0, missing=false;
      STATE.subscriptions.forEach(function(s){ var c=A.Store.subPaidBase(s); if(c==null)missing=true; else paid+=c; credits+=A.Store.subCreditsTotal(s); });
      return {paid:paid, credits:credits, missing:missing};
    },

    // ---------- dashboard ----------
    dashboard:function(filter){
      filter=filter||{};
      var base=STATE.settings.baseCurrency, missing=false;
      var works=STATE.works.filter(function(w){return matchWorkFilter(w,filter);});
      var totalWorks=works.length, done=0, running=0;
      var agreedSum=0, receivedSum=0, remainingSum=0, itemsCostSum=0, profitSum=0;
      var perClient={}, ranked=[];
      works.forEach(function(w){
        if(w.status==='done')done++;
        if(w.status==='progress'||w.status==='waiting'||w.status==='new')running++;
        var f=A.Store.workFinance(w); if(f.missing)missing=true;
        if(w.status!=='cancel'){
          agreedSum+=f.agreedBase; receivedSum+=f.receivedBase; itemsCostSum+=f.itemsCost; profitSum+=f.profit;
          var remB=A.Store.convert(f.remainingOrig, w.agreedCurrency||base, base); if(remB==null)missing=true; else remainingSum+=remB;
          perClient[w.clientId]=(perClient[w.clientId]||0)+1;
        }
        ranked.push({w:w, profit:f.profit, margin:f.margin});
      });
      var subs=this.subsSummary(); if(subs.missing)missing=true;
      var net=profitSum;
      ranked.sort(function(a,b){return b.profit-a.profit;});
      var topClients=Object.keys(perClient).map(function(id){return {client:A.Store.getClient(id),count:perClient[id]};})
                     .filter(function(x){return x.client;}).sort(function(a,b){return b.count-a.count;}).slice(0,5);
      return {base:base, totalWorks:totalWorks, done:done, running:running,
        agreed:agreedSum, received:receivedSum, remaining:remainingSum, itemsCost:itemsCostSum,
        subsPaid:subs.paid, subsCredits:subs.credits,
        worksProfit:profitSum, net:net, missing:missing,
        topProfit:ranked.filter(function(r){return r.w.status!=='cancel';}).slice(0,5),
        losses:ranked.filter(function(r){return r.profit<0 && r.w.status!=='cancel';}).slice(0,5),
        topClients:topClients, works:works};
    },
    monthlySeries:function(filter){
      var map={};
      STATE.works.filter(function(w){return matchWorkFilter(w,filter||{}) && w.status!=='cancel';}).forEach(function(w){
        var d=w.deliveryDate||w.startDate||w.createdAt; if(!d)return; var m=String(d).slice(0,7);
        var f=A.Store.workFinance(w); map[m]=(map[m]||0)+f.profit;
      });
      var keys=Object.keys(map).sort().slice(-6);
      return keys.map(function(k){return {label:k.slice(5)+'/'+k.slice(2,4), value:map[k]};});
    },

    // ---------- invoices ----------
    invoices:function(){return STATE.invoices;},
    getInvoice:function(id){return STATE.invoices.find(function(v){return v.id===id;});},
    isInvNumberTaken:function(num, exceptId){return STATE.invoices.some(function(v){return v.number===num && v.id!==exceptId;});},
    suggestInvNumber:function(){
      var inv=STATE.settings.invoice, num, guard=0;
      do{
        if(inv.numbering==='yearly'){ var y=new Date().getFullYear(); var c=(inv.yearCounters[y]||0)+1+guard; num=inv.prefix+y+'-'+pad(c,inv.pad); }
        else{ num=inv.prefix+pad(inv.nextNumber+guard,inv.pad); }
        guard++;
      }while(this.isInvNumberTaken(num) && guard<9999);
      return num;
    },
    consumeInvNumber:function(){
      var inv=STATE.settings.invoice;
      if(inv.numbering==='yearly'){var y=new Date().getFullYear();inv.yearCounters[y]=(inv.yearCounters[y]||0)+1;}
      else{inv.nextNumber=(inv.nextNumber||1)+1;}
    },
    saveInvoice:function(v){
      if(v.id){var i=STATE.invoices.findIndex(function(x){return x.id===v.id;});if(i>=0)STATE.invoices[i]=v;}
      else{v.id=A.uid();v.createdAt=new Date().toISOString();STATE.invoices.push(v);}
      this.persist();return v;
    },
    deleteInvoice:function(id){STATE.invoices=STATE.invoices.filter(function(v){return v.id!==id;});this.persist();},
    invoiceFinance:function(v){
      var cur=v.currency, sub=0, missing=false;
      (v.items||[]).forEach(function(it){ (it.subs||[]).forEach(function(s){
        var line=A.parseNum(s.qty)*A.parseNum(s.unitPrice);
        var c=A.Store.convert(line, s.currency||cur, cur);
        if(c==null){ missing=true; } else sub+=c;
      }); });
      var disc=A.parseNum(v.discount), tax=A.parseNum(v.taxPct);
      var afterDisc=sub-disc; var taxAmt=afterDisc*(tax/100); var total=afterDisc+taxAmt;
      var paid=0;(v.payments||[]).forEach(function(p){paid+=A.parseNum(p.amount);});
      var remaining=total-paid;
      var status=v.status;
      if(status!=='draft'){
        if(paid<=0) status=(v.dueDate && v.dueDate<A.todayISO())?'overdue':'issued';
        else if(paid+0.001>=total) status='paid'; else status='partial';
      }
      return {sub:sub, discount:disc, taxAmt:taxAmt, total:total, paid:paid, remaining:remaining, status:status, missing:missing};
    }
  };

  function pad(n,len){n=String(Math.round(n));while(n.length<(len||1))n='0'+n;return n;}
  function matchWorkFilter(w,f){
    if(f.clientId && w.clientId!==f.clientId) return false;
    if(f.type && w.type!==f.type) return false;
    if(f.status && w.status!==f.status) return false;
    if(f.from || f.to){ var d=w.deliveryDate||w.startDate||(w.createdAt||'').slice(0,10);
      if(f.from && d<f.from) return false; if(f.to && d>f.to) return false; }
    return true;
  }
  function migrate(v){ var d=defaultVault();
    v.meta=v.meta||d.meta;
    v.settings=Object.assign({},d.settings,v.settings||{});
    v.settings.rates=Object.assign({},d.settings.rates,v.settings.rates||{});
    v.settings.home=Object.assign({},d.settings.home,v.settings.home||{});
    v.settings.business=Object.assign({},d.settings.business,v.settings.business||{});
    v.settings.invoice=Object.assign({},d.settings.invoice,v.settings.invoice||{});
    var ds=d.settings.invoice.socials, cs=v.settings.invoice.socials||{};
    v.settings.invoice.socials={};
    ['instagram','tiktok','facebook','whatsapp'].forEach(function(k){v.settings.invoice.socials[k]=Object.assign({},ds[k],cs[k]||{});});
    v.settings.invoice.columns=Object.assign({},d.settings.invoice.columns,v.settings.invoice.columns||{});
    if(!v.settings.theme)v.settings.theme='auto';
    v.clients=v.clients||[];v.groups=v.groups||[];v.works=v.works||[];v.subscriptions=v.subscriptions||[];v.invoices=v.invoices||[];
    v.works.forEach(function(w){
      // old per-shot arrays -> aggregate video/image credits+counts
      if(w.shots||w.images){
        w.videoCredits=(w.videoCredits!=null)?w.videoCredits:(w.shots||[]).reduce(function(a,r){return a+A.parseNum(r.credits);},0);
        w.videoCount=(w.videoCount!=null)?w.videoCount:(w.shots||[]).length;
        w.imageCredits=(w.imageCredits!=null)?w.imageCredits:(w.images||[]).reduce(function(a,r){return a+A.parseNum(r.credits);},0);
        w.imageCount=(w.imageCount!=null)?w.imageCount:(w.images||[]).length;
        delete w.shots; delete w.images;
      }
      if(w.videoCredits==null)w.videoCredits=0; if(w.videoCount==null)w.videoCount=0;
      if(w.imageCredits==null)w.imageCredits=0; if(w.imageCount==null)w.imageCount=0;
      // direct cost fields (compute from old tool credit price if present)
      if(w.videoCost==null || w.imageCost==null){
        var tool=w.toolId? (v.subscriptions||[]).find(function(s){return s.id===w.toolId;}) : null;
        var price=null, pc='USD';
        if(tool){ var cr=(tool.entries||[]).reduce(function(a,e){return a+A.parseNum(e.credits);},0);
          var pd=(tool.entries||[]).reduce(function(a,e){return a+A.parseNum(e.amount);},0);
          price=cr>0?pd/cr:null; pc=tool.currency||'USD'; }
        if(w.videoCost==null)w.videoCost=(price!=null)?A.parseNum(w.videoCredits)*price:0;
        if(w.imageCost==null)w.imageCost=(price!=null)?A.parseNum(w.imageCredits)*price:0;
        if(!w.prodCurrency)w.prodCurrency=pc;
      }
      if(!w.prodCurrency)w.prodCurrency='USD';
      delete w.toolId;
    });
    // invoices: old flat items -> {desc, subs:[{type,qty,unitPrice}]}
    v.invoices.forEach(function(iv){
      (iv.items||[]).forEach(function(it){
        if(!it.subs){ it.subs=[{type:it.type||it.unitLabel||'', qty:A.parseNum(it.qty), unitPrice:A.parseNum(it.unitPrice)}];
          it.desc=it.desc||''; delete it.qty; delete it.unitPrice; delete it.unitLabel; delete it.type; }
      });
    });
    v.subscriptions.forEach(function(s){
      if(!s.entries){ s.entries = (s.amount!=null && s.amount!=='')? [{amount:A.parseNum(s.amount), credits:0, date:s.date||(s.createdAt||'').slice(0,10)||A.todayISO(), note:''}] : []; }
      s.entries.forEach(function(e){if(e.credits==null)e.credits=0;});
      s.logo=s.logo||''; if(!s.currency)s.currency='USD';
      delete s.allocations; delete s.amount; delete s.date;
    });
    return v;
  }
})(App);
