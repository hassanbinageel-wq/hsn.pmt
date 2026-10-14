/* الفواتير */
window.App = window.App || {};
(function(A){
  var draft=null;
  var keepScroll=false;
  A.Views=A.Views||{};

  A.Views.invoices={
    show:function(){
      var invs=A.Store.invoices().slice().sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
      var body='';
      if(!invs.length) body+='<div class="empty">'+A.icon('invoice',56)+'<div class="t">لا فواتير</div><div>أنشئ فاتورة بالزر بالأسفل</div></div>';
      else body+='<div class="list">'+invs.map(row).join('')+'</div>';
      body+='<div class="fab"><button id="fabAdd">'+A.icon('plus',26)+'</button></div>';
      A.chrome({title:'الفواتير', sub:invs.length+' فاتورة', nav:'invoice', body:body});
      A.$('#fabAdd').onclick=function(){A.Views.invoices.form();};
      A.$$('[data-go]').forEach(function(el){el.onclick=function(){A.go('#/invoice/'+el.getAttribute('data-go'));};});
    },

    detail:function(id){
      var v=A.Store.getInvoice(id);if(!v){A.go('#/invoices');return;}
      var f=A.Store.invoiceFinance(v), client=v.clientSnapshot||A.Store.getClient(v.clientId)||{};
      var body='<div class="card pad"><div style="display:flex;justify-content:space-between"><div><div style="font-size:19px;font-weight:700">'+A.esc(v.number)+'</div>'+(v.title?'<div style="font-weight:600;color:var(--em-d)">'+A.esc(v.title)+'</div>':'')+'<div class="muted">'+A.esc(client.name||'—')+'</div></div>'+A.badge(A.INV_STATUS,f.status)+'</div>'+
        '<div class="divider"></div>'+kv('التاريخ',A.fmtDate(v.date))+(v.dueDate?kv('الاستحقاق',A.fmtDate(v.dueDate)):'')+
        kv('المجموع',A.moneyText(f.sub,v.currency))+(f.discount>0?kv('الخصم','- '+A.moneyText(f.discount,v.currency)):'')+(f.taxAmt>0?kv('الضريبة',A.moneyText(f.taxAmt,v.currency)):'')+
        '<div class="kv"><span class="k" style="font-weight:700;color:var(--ink)">الإجمالي</span><span class="v">'+A.money(f.total,v.currency)+'</span></div>'+
        kv('المدفوع',A.moneyText(f.paid,v.currency))+'<div class="kv"><span class="k">المتبقي</span><span class="v '+(f.remaining>0?'neg':'pos')+'">'+A.esc(A.moneyText(f.remaining,v.currency))+'</span></div></div>';

      body+='<div class="section-title">البنود</div><div class="list">'+(v.items||[]).map(function(it){var tot=(it.subs||[]).reduce(function(a,s){return a+A.lineTotal(s);},0);var sub=(it.subs||[]).map(function(s){return A.esc((s.type?s.type+' — ':'')+(s.manual?('يدوي: '+A.groupNum(A.lineTotal(s))):(A.groupNum(A.parseNum(s.qty))+' × '+A.groupNum(A.parseNum(s.unitPrice)))));}).join('<br>');return '<div class="mini-item"><div class="grow"><div style="font-weight:600">'+A.esc(it.desc||'')+'</div><div class="s tiny muted">'+sub+'</div></div><div class="end">'+A.money(tot,v.currency)+'</div></div>';}).join('')+'</div>';

      body+='<div class="section-title">الدفعات</div><div class="list">'+((v.payments||[]).length?v.payments.map(function(p,i){return '<div class="mini-item"><div class="grow"><div style="font-weight:600">'+A.esc(A.moneyText(A.parseNum(p.amount),v.currency))+'</div><div class="s tiny muted">'+A.fmtDate(p.date)+(p.note?' • '+A.esc(p.note):'')+'</div></div><button class="x" data-delp="'+i+'">'+A.icon('trash',15)+'</button></div>';}).join(''):'<div class="card pad center muted tiny">لا دفعات</div>')+'</div>';
      body+='<button class="btn ghost sm" id="addP" style="margin-top:10px">'+A.icon('plus',16)+' تسجيل دفعة</button>';

      body+='<div class="divider"></div><div class="btn-row"><button class="btn" id="pdf">'+A.icon('download',18)+' حفظ/مشاركة PDF</button><button class="btn ghost" id="prev">'+A.icon('file',18)+' معاينة</button></div>';
      body+='<div class="btn-row" style="margin-top:10px"><button class="btn soft" id="edit">'+A.icon('edit',18)+' تعديل</button><button class="btn danger" id="del">'+A.icon('trash',18)+' حذف</button></div>';

      A.chrome({title:v.number||'فاتورة', back:'#/invoices', nav:'invoice', body:body});
      A.$('#pdf').onclick=function(){A.PDF.exportInvoice(v);};
      A.$('#prev').onclick=function(){preview(v);};
      A.$('#addP').onclick=function(){payForm(v);};
      A.$$('[data-delp]').forEach(function(el){el.onclick=function(){v.payments.splice(+el.getAttribute('data-delp'),1);A.Store.saveInvoice(v);A.Views.invoices.detail(id);};});
      A.$('#edit').onclick=function(){A.Views.invoices.form(v);};
      A.$('#del').onclick=function(){A.confirm('حذف الفاتورة؟','',{danger:true,ok:'حذف'}).then(function(ok){if(ok){A.Store.deleteInvoice(id);A.toast('تم الحذف','ok');A.go('#/invoices');}});};
    },

    // form: edit existing (v) OR create from work (fromWork) OR blank
    form:function(v,fromWork){
      if(v){ draft=JSON.parse(JSON.stringify(v)); }
      else{
        draft={number:A.Store.suggestInvNumber(),title:'',date:A.todayISO(),dueDate:'',currency:A.Store.base(),
               items:[],discount:0,taxPct:0,payments:[],status:'draft',notes:'',clientId:'',autoNumber:true};
        draft.columns=globalCols();
        if(fromWork){
          draft.clientId=fromWork.clientId; draft.currency=fromWork.agreedCurrency||A.Store.base(); draft.workId=fromWork.id;
          draft.title=fromWork.name||'';
          draft.items.push({desc:fromWork.name||'قيمة العمل', subs:[{type:'', qty:1, unitPrice:A.parseNum(fromWork.agreedAmount)}]});
        }
      }
      renderForm();
    }
  };

  var DEF_COLS={desc:'الوصف',type:'النوع',qty:'الكمية',price:'السعر',total:'الإجمالي'};
  function globalCols(){return Object.assign({},DEF_COLS,(A.Store.settings().invoice||{}).columns||{});}
  function colsOf(v){return Object.assign(globalCols(),v.columns||{});}
  var COL_KEYS=['num','desc','type','qty','price','total'];
  function hiddenCount(v){var h=v.hiddenCols||{};return COL_KEYS.filter(function(k){return h[k];}).length;}
  var QTY_PRESETS=['الكمية','عدد اللقطات','عدد الثواني','عدد الصور','عدد الساعات'];
  function renderForm(){
    var sy = keepScroll ? (window.scrollY||window.pageYOffset||0) : 0;
    var v=draft, clients=A.Store.clients(), isEdit=!!v.id, f=A.Store.invoiceFinance(v);
    var body='';
    body+='<div class="field"><label>عنوان الفاتورة (اسم العمل)</label><input class="input" id="vTitle" placeholder="مثال: إعلان رمضان" value="'+A.esc(v.title||'')+'"></div>';
    body+='<div class="field"><label>العميل</label><select class="select" id="vClient"><option value="">— بدون —</option>'+clients.map(function(c){return '<option value="'+c.id+'" '+(v.clientId===c.id?'selected':'')+'>'+A.esc(c.name)+'</option>';}).join('')+'</select></div>';
    body+='<div class="field"><label>رقم الفاتورة</label><div style="display:flex;gap:8px"><input class="input" id="vNum" value="'+A.esc(v.number||'')+'"><button class="btn ghost sm wauto" id="autoNum">'+A.icon('refresh',16)+'</button></div><div class="hint">يمنع التكرار تلقائيًا. اضغط الزر لاقتراح رقم.</div></div>';
    body+='<div class="grid2"><div class="field"><label>تاريخ الفاتورة</label><input class="input" type="date" id="vDate" value="'+A.esc(v.date||'')+'"></div><div class="field"><label>الاستحقاق</label><input class="input" type="date" id="vDue" value="'+A.esc(v.dueDate||'')+'"></div></div>';
    body+='<div class="field"><label>عملة الفاتورة</label>'+cur('vCur',v.currency)+'</div>';

    body+='<div class="section-title">البنود</div><div class="list" id="lines">'+linesHTML()+'</div>';
    body+='<button class="btn ghost sm" id="addLine" style="margin-top:10px">'+A.icon('plus',16)+' إضافة بند</button>';
    var cc=colsOf(v);
    body+='<details class="card pad col-box"'+((v.columns&&JSON.stringify(colsOf(v))!==JSON.stringify(globalCols()))||hiddenCount(v)?' open':'')+'><summary>'+A.icon('edit',16)+' أعمدة هذه الفاتورة <span class="tiny muted">(خاصة بهذه الفاتورة فقط)</span></summary>'+'<div class="field" style="margin-top:12px"><label>الأعمدة الظاهرة في الجدول</label><div class="chip-row" id="visRow">'+COL_KEYS.map(function(k){var on=!(v.hiddenCols||{})[k];return '<button type="button" class="pill vis'+(on?' pill-on':'')+'" data-vis="'+k+'">'+(on?'✓ ':'')+A.esc(k==='num'?'# الترقيم':cc[k])+'</button>';}).join('')+'</div><div class="hint">اضغط على العمود لإخفائه أو إظهاره. الإجماليات أسفل الفاتورة تبقى كما هي.</div></div>'+
      '<div class="field" style="margin-top:12px"><label>عمود الكمية</label><input class="input" id="vc_qty" value="'+A.esc(cc.qty)+'">'+
      '<div class="chip-row">'+QTY_PRESETS.map(function(p){return '<button type="button" class="pill'+(p===cc.qty?' pill-on':'')+'" data-qp="'+A.esc(p)+'">'+A.esc(p)+'</button>';}).join('')+'</div></div>'+
      '<div class="grid2"><div class="field"><label>عمود الوصف</label><input class="input" id="vc_desc" value="'+A.esc(cc.desc)+'"></div><div class="field"><label>عمود النوع</label><input class="input" id="vc_type" value="'+A.esc(cc.type)+'"></div></div>'+
      '<div class="grid2"><div class="field"><label>عمود السعر</label><input class="input" id="vc_price" value="'+A.esc(cc.price)+'"></div><div class="field"><label>عمود الإجمالي</label><input class="input" id="vc_total" value="'+A.esc(cc.total)+'"></div></div>'+
      '<button type="button" class="btn ghost sm" id="vcReset">'+A.icon('refresh',15)+' إرجاع الأعمدة والعناوين الافتراضية</button>'+
    '</details>';

    body+='<div class="grid2" style="margin-top:14px"><div class="field"><label>خصم</label><input class="input" id="vDisc" inputmode="decimal" value="'+A.esc(v.discount||'')+'"></div><div class="field"><label>ضريبة %</label><input class="input" id="vTax" inputmode="decimal" value="'+A.esc(v.taxPct||'')+'"></div></div>';

    body+='<div class="card pad" id="invTotals">'+totalsHTML()+'</div>';

    body+='<div class="field" style="margin-top:14px"><label>ملاحظات / شروط دفع للفاتورة</label><textarea class="input" id="vNotes">'+A.esc(v.notes||'')+'</textarea></div>';
    var allBanks=((A.Store.settings().banks||{}).list||[]).filter(function(k){return (k.accounts||[]).some(function(a){return (a.number||'').trim();});});
    if(allBanks.length){
      var selIds=Array.isArray(v.bankIds)?v.bankIds:allBanks.filter(function(k){return k.on!==false;}).map(function(k){return k.id;});
      body+='<div class="switch"><span>إظهار الحسابات البنكية في الفاتورة</span><div class="track '+(v.showBanks!==false?'on':'')+'" id="vShowBanks"></div></div>';
      body+='<div id="vBankPick" class="'+(v.showBanks===false?'hidden':'')+'" style="margin:-4px 0 8px"><div class="bank-pick">'+allBanks.map(function(k){var on=selIds.indexOf(k.id)>=0;return '<button type="button" class="pill'+(on?' pill-on':'')+'" data-bk="'+k.id+'">'+(on?'✓ ':'')+A.esc(k.name)+'</button>';}).join('')+'</div><div class="hint">اختر البنوك اللي تظهر في هذه الفاتورة فقط.</div></div>';
    }
    body+='<div class="switch"><span>إظهار رقم العميل في الفاتورة</span><div class="track '+(v.showClientPhone!==false?'on':'')+'" id="vShowPhone"></div></div>';
    body+='<div class="switch"><span>إصدار الفاتورة (غير مسودة)</span><div class="track '+(v.status!=='draft'?'on':'')+'" id="vIssued"></div></div>';

    body+='<div class="divider"></div><div class="btn-row"><button class="btn" id="save">'+A.icon('save',18)+' حفظ</button><button class="btn ghost" id="prev">'+A.icon('file',18)+' معاينة</button></div>';

    A.chrome({title:isEdit?'تعديل فاتورة':'فاتورة جديدة', back:isEdit?('#/invoice/'+v.id):'#/invoices', nav:'invoice', body:body});

    var issued=v.status!=='draft';
    A.$('#vIssued').onclick=function(){issued=!issued;this.classList.toggle('on',issued);};
    A.$$('[data-qp]').forEach(function(b){b.onclick=function(){A.$('#vc_qty').value=b.getAttribute('data-qp');A.$$('[data-qp]').forEach(function(x){x.classList.toggle('pill-on',x===b);});draft.columns=readCols();};});
    ['vc_qty','vc_desc','vc_type','vc_price','vc_total'].forEach(function(id){A.$('#'+id).oninput=function(){draft.columns=readCols();if(id==='vc_qty')A.$$('[data-qp]').forEach(function(x){x.classList.toggle('pill-on',x.getAttribute('data-qp')===A.$('#vc_qty').value.trim());});};});
    A.$$('[data-vis]').forEach(function(b){b.onclick=function(){
      var k=b.getAttribute('data-vis'); draft.hiddenCols=Object.assign({},draft.hiddenCols||{});
      if(!draft.hiddenCols[k] && COL_KEYS.length-hiddenCount(draft)<=1){A.toast('لازم يبقى عمود واحد على الأقل','err');return;}
      if(draft.hiddenCols[k]) delete draft.hiddenCols[k]; else draft.hiddenCols[k]=true;
      var on=!draft.hiddenCols[k], c=colsOf(draft); b.classList.toggle('pill-on',on); b.textContent=(on?'✓ ':'')+(k==='num'?'# الترقيم':c[k]);
    };});
    A.$('#vcReset').onclick=function(){draft.hiddenCols={};A.$$('[data-vis]').forEach(function(x){var k=x.getAttribute('data-vis');x.classList.add('pill-on');x.textContent='✓ '+(k==='num'?'# الترقيم':globalCols()[k]);});var g=globalCols();A.$('#vc_qty').value=g.qty;A.$('#vc_desc').value=g.desc;A.$('#vc_type').value=g.type;A.$('#vc_price').value=g.price;A.$('#vc_total').value=g.total;draft.columns=readCols();A.$$('[data-qp]').forEach(function(x){x.classList.toggle('pill-on',x.getAttribute('data-qp')===g.qty);});};
    if(A.$('#vShowBanks')) A.$('#vShowBanks').onclick=function(){this.classList.toggle('on');draft.showBanks=this.classList.contains('on');A.$('#vBankPick').classList.toggle('hidden',!draft.showBanks);};
    A.$$('[data-bk]').forEach(function(b){b.onclick=function(){
      var ids=A.$$('[data-bk]').filter(function(x){return x.classList.contains('pill-on');}).map(function(x){return x.getAttribute('data-bk');});
      var id=b.getAttribute('data-bk'), on=ids.indexOf(id)<0;
      if(on) ids.push(id); else ids=ids.filter(function(x){return x!==id;});
      draft.bankIds=ids; b.classList.toggle('pill-on',on); b.textContent=(on?'✓ ':'')+b.textContent.replace(/^✓ /,'');
    };});
    A.$('#vShowPhone').onclick=function(){this.classList.toggle('on');draft.showClientPhone=this.classList.contains('on');};
    A.$('#autoNum').onclick=function(){collect();draft.number=A.Store.suggestInvNumber();draft.autoNumber=true;A.$('#vNum').value=draft.number;};
    A.$('#addLine').onclick=function(){collect();lineForm();};
    A.$$('[data-editline]').forEach(function(el){el.onclick=function(){collect();lineForm(+el.getAttribute('data-editline'));};});
    A.$$('[data-delline]').forEach(function(el){el.onclick=function(e){e.stopPropagation();collect();draft.items.splice(+el.getAttribute('data-delline'),1);keepScroll=true;renderForm();};});
    function liveTotals(){collect();var box=A.$('#invTotals');if(box)box.innerHTML=totalsHTML();}
    ['vDisc','vTax'].forEach(function(idn){A.$('#'+idn).oninput=liveTotals;});
    A.$('#vCur').onchange=liveTotals;
    A.$('#prev').onclick=function(){collect();preview(draft);};
    A.$('#save').onclick=function(){
      collect(); draft.status=issued?(draft.status==='draft'?'issued':draft.status):'draft';
      if(!draft.number){A.toast('أدخل رقم الفاتورة','err');return;}
      if(A.Store.isInvNumberTaken(draft.number,draft.id)){A.toast('رقم الفاتورة مكرر','err');return;}
      if(!draft.items.length){A.toast('أضف بندًا واحدًا على الأقل','err');return;}
      var wasNew=!draft.id;
      var saved=A.Store.saveInvoice(draft);
      // consume auto number only for new invoices that match the current suggestion pattern
      if(wasNew && draft.autoNumber!==false){ A.Store.consumeInvNumber(saved.number); A.Store.persist(); }
      A.toast('تم الحفظ','ok');A.go('#/invoice/'+saved.id);
    };
    if(keepScroll){ try{window.scrollTo(0,sy);}catch(e){} keepScroll=false; }
  }
  function totalsHTML(){var v=draft,f=A.Store.invoiceFinance(v);return kv('المجموع',A.moneyText(f.sub,v.currency))+(f.discount>0?kv('الخصم','- '+A.moneyText(f.discount,v.currency)):'')+(f.taxAmt>0?kv('الضريبة',A.moneyText(f.taxAmt,v.currency)):'')+'<div class="kv"><span class="k" style="font-weight:700;color:var(--ink)">الإجمالي</span><span class="v">'+A.money(f.total,v.currency)+'</span></div>';}

  function readCols(){var g=globalCols();function v(id,k){var el=A.$('#'+id);var s=el?el.value.trim():'';return s||g[k];}return {desc:v('vc_desc','desc'),type:v('vc_type','type'),qty:v('vc_qty','qty'),price:v('vc_price','price'),total:v('vc_total','total')};}
  function collect(){
    if(A.$('#vc_qty')) draft.columns=readCols();
    draft.title=A.$('#vTitle')?A.$('#vTitle').value.trim():draft.title;
    draft.clientId=A.$('#vClient').value;
    var newNum=A.$('#vNum').value.trim(); if(newNum!==draft.number)draft.autoNumber=false; draft.number=newNum;
    draft.date=A.$('#vDate').value; draft.dueDate=A.$('#vDue').value; draft.currency=A.$('#vCur').value;
    draft.discount=A.parseNum(A.$('#vDisc').value); draft.taxPct=A.parseNum(A.$('#vTax').value);
    draft.notes=A.$('#vNotes').value.trim();
  }
  function linesHTML(){
    if(!draft.items.length) return '<div class="card pad center muted tiny">لا بنود</div>';
    return draft.items.map(function(it,i){
      var tot=(it.subs||[]).reduce(function(a,s){return a+A.lineTotal(s);},0);
      return '<div class="mini-item" data-editline="'+i+'"><div class="grow"><div style="font-weight:600">'+A.esc(it.desc||'بند')+'</div><div class="s tiny muted">'+((it.subs||[]).length)+' قسم</div></div><div class="end" style="font-weight:700">'+A.esc(A.groupNum(tot))+'</div><button class="x" data-delline="'+i+'">'+A.icon('trash',15)+'</button></div>';
    }).join('');
  }
  function curSel(id,val){return '<select class="select" id="'+id+'">'+A.CUR_LIST.map(function(c){return '<option value="'+c+'" '+(val===c?'selected':'')+'>'+A.CURRENCIES[c].label+'</option>';}).join('')+'</select>';}
  function lineForm(idx){
    var dcur=draft.currency||A.Store.base();
    var item = (idx!=null)? JSON.parse(JSON.stringify(draft.items[idx])) : {desc:'', subs:[{type:'',qty:1,unitPrice:'',currency:dcur}]};
    if(!item.subs||!item.subs.length) item.subs=[{type:'',qty:1,unitPrice:'',currency:dcur}];
    function readSubs(sh){ item.desc=(A.$('#lDesc',sh)||{value:item.desc}).value; item.subs.forEach(function(s,i){ var t=A.$('#st_'+i,sh),q=A.$('#sq_'+i,sh),p=A.$('#sp_'+i,sh),c=A.$('#sc_'+i,sh); if(t)s.type=t.value; if(q)s.qty=A.parseNum(q.value); if(p)s.unitPrice=A.parseNum(p.value); if(c)s.currency=c.value; var am=A.$('#sa_'+i,sh); if(am)s.amount=A.parseNum(am.value); }); }
    function render(){
      var cc=colsOf(draft);
      var subsHTML=item.subs.map(function(s,i){var line=A.lineTotal(s);
        return '<div class="sub-edit"><input class="input" id="st_'+i+'" placeholder="'+A.esc(cc.type)+'" value="'+A.esc(s.type||'')+'" style="margin-bottom:8px"><div class="grid3"><input class="input spn" id="sq_'+i+'" inputmode="decimal" placeholder="'+A.esc(cc.qty)+'" value="'+A.esc(s.qty||'')+'"><input class="input spn" id="sp_'+i+'" inputmode="decimal" placeholder="'+A.esc(cc.price)+'" value="'+A.esc(s.unitPrice||'')+'">'+curSel('sc_'+i,s.currency||dcur)+'</div>'+
          '<div class="seg mode-seg" data-mode="'+i+'"><button type="button" data-m="auto" class="'+(s.manual?'':'on')+'">تلقائي ('+A.esc(cc.qty)+' × '+A.esc(cc.price)+')</button><button type="button" data-m="manual" class="'+(s.manual?'on':'')+'">يدوي</button></div>'+
          '<div class="field man-wrap'+(s.manual?'':' hidden')+'" style="margin:8px 0 0"><label>'+A.esc(cc.total)+' (يدوي)</label><input class="input spn" id="sa_'+i+'" inputmode="decimal" placeholder="اكتب المبلغ" value="'+A.esc(s.amount||'')+'"></div>'+
          '<div class="sub-foot"><span>'+A.esc(cc.total)+': '+A.esc(A.groupNum(line)+' '+((A.CURRENCIES[s.currency||dcur]||{}).label||''))+'</span>'+(item.subs.length>1?'<button class="x" data-delsub="'+i+'">'+A.icon('trash',14)+'</button>':'')+'</div></div>';
      }).join('');
      var sh=A.sheet('<h2>'+(idx!=null?'تعديل بند':'بند جديد')+'</h2>'+
        '<div class="field"><label>الوصف</label><input class="input" id="lDesc" placeholder="مثال: Main Commercial" value="'+A.esc(item.desc||'')+'"></div>'+
        '<div class="section-title" style="margin-top:4px">الأقسام ('+A.esc(colsOf(draft).type)+' · '+A.esc(colsOf(draft).qty)+' · '+A.esc(colsOf(draft).price)+' · العملة)</div>'+subsHTML+
        '<button class="btn soft sm" id="addSub" style="margin-top:8px">'+A.icon('plus',15)+' إضافة قسم</button>'+
        '<button class="btn" id="lSave" style="margin-top:14px">حفظ البند</button>');
      A.$('#addSub',sh).onclick=function(){readSubs(sh);item.subs.push({type:'',qty:1,unitPrice:'',currency:dcur});render();};
      A.$$('[data-delsub]',sh).forEach(function(el){el.onclick=function(){readSubs(sh);item.subs.splice(+el.getAttribute('data-delsub'),1);render();};});
      function updFoot(i,sh){var s=item.subs[i];var line=s.manual?A.parseNum((A.$('#sa_'+i,sh)||{}).value):A.parseNum((A.$('#sq_'+i,sh)||{}).value)*A.parseNum((A.$('#sp_'+i,sh)||{}).value);var c=(A.$('#sc_'+i,sh)||{}).value;var lbl=(A.CURRENCIES[c]||{}).label||'';var foot=A.$('#sq_'+i,sh).closest('.sub-edit').querySelector('.sub-foot span');if(foot)foot.textContent=cc.total+': '+A.groupNum(line)+' '+lbl;}
      A.$$('.mode-seg',sh).forEach(function(sg){var i=+sg.getAttribute('data-mode');sg.onclick=function(e){var b=e.target.closest('[data-m]');if(!b)return;var man=b.getAttribute('data-m')==='manual';item.subs[i].manual=man;
        sg.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b);});
        var wrap=sg.parentNode.querySelector('.man-wrap');wrap.classList.toggle('hidden',!man);
        var am=A.$('#sa_'+i,sh); if(man&&am&&!am.value){var auto=A.parseNum(A.$('#sq_'+i,sh).value)*A.parseNum(A.$('#sp_'+i,sh).value);if(auto)am.value=auto;am.focus();}
        updFoot(i,sh);};});
      A.$$('.spn',sh).forEach(function(inp){inp.oninput=function(){updFoot(inp.id.split('_')[1],sh);};});
      item.subs.forEach(function(s,i){var sc=A.$('#sc_'+i,sh);if(sc)sc.onchange=function(){updFoot(i,sh);};});
      A.$('#lSave',sh).onclick=function(){
        readSubs(sh); item.desc=(A.$('#lDesc',sh).value||'').trim();
        item.subs=item.subs.filter(function(s){return A.parseNum(s.qty)||A.parseNum(s.unitPrice)||(s.manual&&A.parseNum(s.amount))||(s.type||'').trim();});
        if(!item.subs.length){A.toast('أضف قسمًا واحدًا على الأقل','err');return;}
        if(idx!=null)draft.items[idx]=item; else draft.items.push(item);
        A.closeSheet();keepScroll=true;renderForm();
      };
    }
    render();
  }
  function payForm(v){
    var sh=A.sheet('<h2>تسجيل دفعة</h2>'+
      '<div class="field"><label>المبلغ ('+A.esc(v.currency)+')</label><input class="input" id="pAmt" inputmode="decimal"></div>'+
      '<div class="field"><label>التاريخ</label><input class="input" type="date" id="pDate" value="'+A.todayISO()+'"></div>'+
      '<div class="field"><label>ملاحظة</label><input class="input" id="pNote"></div>'+
      '<button class="btn" id="pSave">حفظ</button>');
    A.$('#pSave',sh).onclick=function(){var amt=A.parseNum(A.$('#pAmt',sh).value);if(amt<=0){A.toast('أدخل مبلغًا','err');return;}
      v.payments=v.payments||[];v.payments.push({amount:amt,date:A.$('#pDate',sh).value,note:A.$('#pNote',sh).value.trim()});
      A.Store.saveInvoice(v);A.closeSheet();A.toast('تم','ok');A.Views.invoices.detail(v.id);};
  }
  function preview(v){
    var sh=A.sheet('<h2>معاينة الفاتورة</h2><div style="overflow:auto;border:1px solid var(--line);border-radius:12px;background:#fff">'+
      '<div id="prevBox" style="transform-origin:top right"></div></div>'+
      '<div class="btn-row" style="margin-top:14px"><button class="btn" id="prevPdf">'+A.icon('download',18)+' حفظ/مشاركة PDF</button><button class="btn ghost" onclick="App.closeSheet()">إغلاق</button></div>');
    var box=A.$('#prevBox',sh); box.appendChild(A.PDF.previewNode(v));
    // scale to fit sheet width
    var w=sh.querySelector('#prevBox').firstChild;
    setTimeout(function(){var avail=box.parentElement.clientWidth; var scale=Math.min(1,avail/794); box.style.transform='scale('+scale+')'; box.style.height=(w.offsetHeight*scale)+'px';},50);
    A.$('#prevPdf',sh).onclick=function(){A.PDF.exportInvoice(v);};
  }

  function unitLabel(type){return type==='shot'?'لقطة':type==='image'?'صورة':type==='frame'?'فريم':'وحدة';}
  function row(v){var f=A.Store.invoiceFinance(v),cl=v.clientSnapshot||A.Store.getClient(v.clientId)||{};return '<div class="row-item" data-go="'+v.id+'"><div class="avatar">'+A.icon('invoice',20)+'</div><div class="grow"><div class="t">'+A.esc(v.number)+'</div><div class="s">'+A.esc(cl.name||'—')+' • '+A.fmtDateShort(v.date)+'</div><div style="margin-top:5px">'+A.badge(A.INV_STATUS,f.status)+'</div></div><div class="end">'+A.money(f.total,v.currency)+'</div></div>';}
  function kv(k,val){return '<div class="kv"><span class="k">'+A.esc(k)+'</span><span class="v">'+val+'</span></div>';}
  function cur(id,val){return '<select class="select" id="'+id+'">'+A.CUR_LIST.map(function(c){return '<option value="'+c+'" '+(val===c?'selected':'')+'>'+A.CURRENCIES[c].ar+'</option>';}).join('')+'</select>';}

  // snapshot client into invoice at save time (preserve details even if client changes later)
  var _origSave=A.Store.saveInvoice;
  A.Store.saveInvoice=function(v){ if(v.clientId){var c=A.Store.getClient(v.clientId);if(c)v.clientSnapshot={name:c.name,phone:c.phone,countryCode:c.countryCode,notes:c.notes};} return _origSave.call(A.Store,v); };
})(App);
