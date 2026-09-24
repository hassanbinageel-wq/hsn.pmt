/* الأعمال */
window.App = window.App || {};
(function(A){
  var q='', statusFilter='';
  var draft=null; var keepScroll=false;
  A.Views=A.Views||{};
  function pcur(){ return draft.prodCurrency||'USD'; }
  function dateKey(w){ return w.startDate || (w.createdAt||'').slice(0,10); }
  function byNewest(a,b){var ka=dateKey(a),kb=dateKey(b);if(ka!==kb)return kb.localeCompare(ka);return (b.createdAt||'').localeCompare(a.createdAt||'');}
  function groupRow(g,s,base){
    var av=g.logo?'<div class="avatar cover" style="background-image:url(\''+g.logo+'\')"></div>':'<div class="avatar group-av">'+A.esc((g.name||'?').slice(0,1))+'</div>';
    return '<div class="row-item group-item" data-gg="'+g.id+'">'+av+'<div class="grow"><div class="t">'+A.esc(g.name)+'</div><div class="s">'+s.count+' عمل'+(s.lastDate?(' • '+A.fmtDateShort(s.lastDate)):'')+'</div>'+(s.remaining>0.004?'<div style="margin-top:5px"><span class="badge b-unpaid">متبقٍ '+A.esc(A.moneyText(s.remaining,base))+'</span></div>':'')+'</div><div class="end">'+A.money(s.profit,base,{color:true})+'<div class="tiny muted">ربح</div></div></div>';
  }
  function teamNames(){ var set={}; A.Store.works().forEach(function(w){ if(w.assignee) set[w.assignee]=1; }); return Object.keys(set); }

  A.Views.works={
    show:function(){
      var base=A.Store.base();
      var all=A.Store.works().slice().sort(byNewest);
      var filtering=!!(q||statusFilter);
      var body='<div class="field" style="margin-bottom:10px"><div style="position:relative"><span style="position:absolute;right:12px;top:12px;color:var(--muted)">'+A.icon('search',18)+'</span><input class="input" id="q" placeholder="بحث بالجهة أو العمل أو العميل أو المنفّذ" value="'+A.esc(q)+'" style="padding-right:40px"></div></div>';
      body+='<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px">'+chip('','الكل')+Object.keys(A.WORK_STATUS).map(function(k){return chip(k,A.WORK_STATUS[k].ar);}).join('')+'</div>';
      if(filtering){
        var list=all;
        if(statusFilter) list=list.filter(function(w){return w.status===statusFilter;});
        if(q) list=list.filter(function(w){var cl=A.Store.getClient(w.clientId),g=w.groupId?A.Store.getGroup(w.groupId):null;return (w.name||'').indexOf(q)>=0||(cl&&(cl.name||'').indexOf(q)>=0)||(w.assignee||'').indexOf(q)>=0||(g&&(g.name||'').indexOf(q)>=0);});
        body+=list.length?'<div class="list">'+list.map(function(w){return row(w,base,true);}).join('')+'</div>':'<div class="empty">'+A.icon('search',48)+'<div class="t">لا نتائج</div></div>';
      }else{
        var groups=A.Store.groups().slice().map(function(g){return {g:g,s:A.Store.groupSummary(g.id)};})
          .sort(function(a,b){var ka=a.s.lastDate||(a.g.createdAt||'').slice(0,10),kb=b.s.lastDate||(b.g.createdAt||'').slice(0,10);return kb.localeCompare(ka);});
        var loose=all.filter(function(w){return !w.groupId||!A.Store.getGroup(w.groupId);});
        if(!groups.length&&!loose.length) body+='<div class="empty">'+A.icon('works',56)+'<div class="t">لا أعمال</div><div>أضف جهة أو عملًا بالزر بالأسفل</div></div>';
        if(groups.length) body+='<div class="section-title">الجهات</div><div class="list">'+groups.map(function(x){return groupRow(x.g,x.s,base);}).join('')+'</div>';
        if(loose.length) body+='<div class="section-title">'+(groups.length?'أعمال بدون جهة':'الأعمال')+'</div><div class="list">'+loose.map(function(w){return row(w,base,false);}).join('')+'</div>';
      }
      body+='<div class="fab"><button id="fabAdd">'+A.icon('plus',26)+'</button></div>';
      A.chrome({title:'الأعمال', sub:A.Store.groups().length+' جهة • '+all.length+' عمل', nav:'works', body:body});
      A.$('#q').oninput=A.debounce(function(e){q=e.target.value.trim();A.Views.works.show();var i=A.$('#q');i.focus();i.setSelectionRange(i.value.length,i.value.length);},250);
      A.$('#fabAdd').onclick=function(){
        var sh=A.sheet('<h2>إضافة</h2><button class="btn" id="addG" style="margin-bottom:10px">'+A.icon('building',18)+' جهة جديدة</button><button class="btn ghost" id="addW">'+A.icon('works',18)+' عمل جديد</button>');
        A.$('#addG',sh).onclick=function(){A.closeSheet();A.Views.groups.form();};
        A.$('#addW',sh).onclick=function(){A.closeSheet();A.Views.works.form();};
      };
      A.$$('[data-chip]').forEach(function(el){el.onclick=function(){statusFilter=el.getAttribute('data-chip');A.Views.works.show();};});
      A.$$('[data-go]').forEach(function(el){el.onclick=function(){A.go('#/work/'+el.getAttribute('data-go'));};});
      A.$$('[data-gg]').forEach(function(el){el.onclick=function(){A.go('#/group/'+el.getAttribute('data-gg'));};});
    },

    detail:function(id){
      var w=A.Store.getWork(id); if(!w){A.go('#/works');return;}
      var base=A.Store.base(), f=A.Store.workFinance(w), cl=A.Store.getClient(w.clientId);
      var cur=f.prodCurrency;
      var body='';
      if(w.coverImage) body+='<div style="height:150px;border-radius:16px;background:#eee center/cover url(\''+w.coverImage+'\');margin-bottom:14px"></div>';
      body+='<div class="card pad" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><div style="font-size:19px;font-weight:700">'+A.esc(w.name||'—')+'</div><div class="muted">'+A.esc(cl?cl.name:'بدون عميل')+' • '+A.esc(A.WORK_TYPE[w.type]||w.customType||'')+'</div></div>'+A.badge(A.WORK_STATUS,w.status)+'</div>';
      body+='<div class="divider"></div>';
      var grp=w.groupId?A.Store.getGroup(w.groupId):null;
      if(grp) body+='<div class="kv"><span class="k">الجهة</span><span class="v">'+A.esc(grp.name)+'</span></div>';
      if(w.assignee) body+='<div class="kv"><span class="k">المنفّذ</span><span class="v">'+A.icon('clients',15)+' '+A.esc(w.assignee)+'</span></div>';
      body+='<div class="kv"><span class="k">تاريخ البدء</span><span class="v">'+A.fmtDate(w.startDate)+'</span></div><div class="kv"><span class="k">تاريخ التسليم</span><span class="v">'+A.fmtDate(w.deliveryDate)+'</span></div>';
      if(w.finalLink) body+='<button class="btn soft sm" id="openLink" style="margin-top:10px">'+A.icon('link',16)+' فتح رابط العمل</button>';
      body+='</div>';

      if(f.isLoss) body+='<div class="notice" style="background:var(--neg-soft);color:var(--neg)">'+A.icon('warn',18)+'<div>هذا العمل خاسر — التكلفة أعلى من المبلغ المتفق عليه.</div></div>';
      if(f.missing) body+='<div class="notice">'+A.icon('warn',18)+'<div>هناك مبالغ بعملة بلا سعر صرف؛ حدّث الأسعار من الإعدادات.</div></div>';

      if(f.videoCost>0||f.videoCredits>0||f.videoCount>0) body+='<div class="card pad" style="margin-bottom:10px"><div style="font-weight:700;margin-bottom:6px">'+A.icon('video',16)+' لقطات الفيديو</div>'+kv('عدد اللقطات',A.groupNum(f.videoCount))+kv('إجمالي الرصيد',A.groupNum(f.videoCredits)+' Credit')+kv('التكلفة',A.moneyText(f.videoCost,cur))+'</div>';
      if(f.imageCost>0||f.imageCredits>0||f.imageCount>0) body+='<div class="card pad" style="margin-bottom:10px"><div style="font-weight:700;margin-bottom:6px">'+A.icon('image',16)+' الصور</div>'+kv('عدد الصور',A.groupNum(f.imageCount))+kv('إجمالي الرصيد',A.groupNum(f.imageCredits)+' Credit')+kv('التكلفة',A.moneyText(f.imageCost,cur))+'</div>';
      body+='<div class="card pad"><div class="kv" style="border:none"><span class="k" style="font-weight:700;color:var(--ink)">إجمالي التكلفة</span><span class="v">'+A.money(f.itemsOrig,cur)+'</span></div></div>';

      body+='<div class="section-title">الحساب المالي (بعملة العرض: '+A.esc(base)+')</div><div class="card pad">'+
        kv('المبلغ المتفق عليه',A.money(f.agreedBase,base))+
        kv('تكلفة الإنتاج',A.money(f.itemsCost,base))+
        '<div class="kv" style="border-top:2px solid var(--line);margin-top:4px"><span class="k" style="font-weight:700;color:var(--ink)">الربح</span><span class="v">'+A.money(f.profit,base,{color:true})+'</span></div>'+
        kv('هامش الربح',Math.round(f.margin)+'%')+'</div>';

      body+='<div class="section-title">التحصيل</div><div class="card pad">'+
        kv('المتفق عليه',A.moneyText(A.parseNum(w.agreedAmount),w.agreedCurrency))+
        kv('المستلم',A.moneyText(f.receivedOrig,w.agreedCurrency)+' '+A.badge(A.PAY_STATUS,f.payStatus))+
        '<div class="kv"><span class="k">المتبقي</span><span class="v '+(f.remainingOrig>0?'neg':'pos')+'">'+A.esc(A.moneyText(f.remainingOrig,w.agreedCurrency))+'</span></div>'+
        '<button class="btn ghost sm" id="addPay" style="margin-top:10px">'+A.icon('plus',16)+' تسجيل دفعة</button></div>';
      if((w.payments||[]).length){body+='<div class="list" style="margin-top:10px">'+w.payments.map(function(p,i){return '<div class="mini-item"><div class="grow"><div class="t" style="font-weight:600">'+A.esc(A.moneyText(A.parseNum(p.amount),p.currency))+'</div><div class="s tiny muted">'+A.fmtDate(p.date)+(p.note?' • '+A.esc(p.note):'')+'</div></div><button class="x" data-delpay="'+i+'">'+A.icon('trash',16)+'</button></div>';}).join('')+'</div>';}

      if(w.notes) body+='<div class="section-title">ملاحظات</div><div class="card pad notes-box">'+A.esc(w.notes)+'</div>';
      body+='<div class="divider"></div><div class="btn-row"><button class="btn" id="edit">'+A.icon('edit',18)+' تعديل</button><button class="btn ghost" id="dup">'+A.icon('copy',18)+' نسخ</button></div>'+
        '<div class="btn-row" style="margin-top:10px"><button class="btn soft" id="mkInv">'+A.icon('invoice',18)+' إنشاء فاتورة</button><button class="btn danger" id="del">'+A.icon('trash',18)+' حذف</button></div>';

      var backTo=grp?('#/group/'+grp.id):'#/works';
      A.chrome({title:w.name||'عمل', back:backTo, nav:'works', body:body});
      if(w.finalLink)A.$('#openLink').onclick=function(){A.Platform.openUrl(w.finalLink);};
      A.$('#addPay').onclick=function(){payForm(w);};
      A.$$('[data-delpay]').forEach(function(el){el.onclick=function(){w.payments.splice(+el.getAttribute('data-delpay'),1);A.Store.saveWork(w);A.Views.works.detail(id);};});
      A.$('#edit').onclick=function(){A.Views.works.form(w);};
      A.$('#dup').onclick=function(){var c=A.Store.duplicateWork(id);A.toast('تم نسخ العمل','ok');A.go('#/work/'+c.id);};
      A.$('#mkInv').onclick=function(){A.Views.invoices.form(null,w);};
      A.$('#del').onclick=function(){A.confirm('حذف العمل؟','لا يمكن التراجع.',{danger:true,ok:'حذف'}).then(function(ok){if(ok){A.Store.deleteWork(id);A.toast('تم الحذف','ok');A.go(backTo);}});};
    },

    form:function(w,gid){
      draft=w?JSON.parse(JSON.stringify(w)):{type:'vid',status:'new',startDate:A.todayISO(),agreedCurrency:A.Store.base(),prodCurrency:'USD',videoCredits:'',videoCost:'',videoCount:'',imageCredits:'',imageCost:'',imageCount:'',assignee:'',payments:[]};
      draft.prodCurrency=draft.prodCurrency||'USD';
      if(!w && gid) draft.groupId=gid;
      draft.groupId=draft.groupId||'';
      renderForm();
    }
  };

  function renderForm(){
    var sy = keepScroll ? (window.scrollY||window.pageYOffset||0) : 0;
    var w=draft, clients=A.Store.clients(), base=A.Store.base(), isEdit=!!w.id, cur=pcur();
    var names=teamNames();
    var body='';
    body+='<div class="field"><label>اسم العمل *</label><input class="input" id="wName" value="'+A.esc(w.name||'')+'"></div>';
    body+='<div class="field"><label>الجهة (اختياري)</label><select class="select" id="wGroup"><option value="">— بدون جهة —</option>'+A.Store.groups().map(function(g){return '<option value="'+g.id+'" '+(w.groupId===g.id?'selected':'')+'>'+A.esc(g.name)+'</option>';}).join('')+'<option value="__new">＋ جهة جديدة…</option></select></div>';
    body+='<div class="field"><label>العميل</label><select class="select" id="wClient"><option value="">— بدون —</option>'+clients.map(function(c){return '<option value="'+c.id+'" '+(w.clientId===c.id?'selected':'')+'>'+A.esc(c.name)+'</option>';}).join('')+'</select></div>';
    body+='<div class="field"><label>عضو الفريق المسؤول (اختياري)</label><input class="input" id="wAssignee" list="teamList" placeholder="اسم المنفّذ" value="'+A.esc(w.assignee||'')+'"><datalist id="teamList">'+names.map(function(n){return '<option value="'+A.esc(n)+'">';}).join('')+'</datalist></div>';
    body+='<div class="field"><label>نوع العمل</label><div class="seg" id="wType">'+Object.keys(A.WORK_TYPE).map(function(k){return '<button data-t="'+k+'" class="'+(w.type===k?'on':'')+'">'+A.WORK_TYPE[k]+'</button>';}).join('')+'</div></div>';
    body+='<div id="customTypeWrap" class="field '+(w.type==='custom'?'':'hidden')+'"><label>النوع المخصص</label><input class="input" id="wCustomType" value="'+A.esc(w.customType||'')+'"></div>';
    body+='<div class="grid2"><div class="field"><label>تاريخ البدء</label><input class="input" type="date" id="wStart" value="'+A.esc(w.startDate||'')+'"></div><div class="field"><label>تاريخ التسليم</label><input class="input" type="date" id="wDelivery" value="'+A.esc(w.deliveryDate||'')+'"></div></div>';
    body+='<div class="field"><label>الحالة</label><select class="select" id="wStatus">'+Object.keys(A.WORK_STATUS).map(function(k){return '<option value="'+k+'" '+(w.status===k?'selected':'')+'>'+A.WORK_STATUS[k].ar+'</option>';}).join('')+'</select></div>';
    body+='<div class="field"><label>المبلغ المتفق عليه</label><div class="amount-row"><input class="input" id="wAgreed" inputmode="decimal" value="'+A.esc(w.agreedAmount||'')+'">'+curSelect('wAgreedCur',w.agreedCurrency||base)+'</div></div>';
    body+='<div class="field"><label>رابط العمل النهائي</label><input class="input" id="wLink" inputmode="url" value="'+A.esc(w.finalLink||'')+'"></div>';
    body+='<div class="field"><label>صورة الغلاف</label><div class="img-pick" id="coverPick">'+(w.coverImage?'<img src="'+w.coverImage+'">':A.icon('image',30))+'<div>'+(w.coverImage?'تغيير الصورة':'اختر صورة من الجوال')+'</div></div>'+(w.coverImage?'<div class="hint center"><a id="rmCover">إزالة الصورة</a></div>':'')+'</div>';

    body+='<div class="field"><label>عملة التكلفة</label>'+curSelect('wProdCur',cur)+'</div>';
    body+='<div class="prod-block"><div class="prod-head">'+A.icon('video',16)+' لقطات الفيديو</div>'+
      '<div class="grid2"><div class="field"><label>إجمالي الرصيد (Credits)</label><input class="input" id="wVCr" inputmode="decimal" value="'+A.esc(w.videoCredits||'')+'"></div>'+
      '<div class="field"><label>عدد اللقطات</label><input class="input" id="wVCn" inputmode="numeric" value="'+A.esc(w.videoCount||'')+'"></div></div>'+
      '<div class="field" style="margin-bottom:0"><label>التكلفة ('+A.esc((A.CURRENCIES[cur]||{}).ar||cur)+')</label><input class="input costin" id="wVCost" inputmode="decimal" value="'+A.esc(w.videoCost||'')+'"></div></div>';

    body+='<div class="prod-block"><div class="prod-head">'+A.icon('image',16)+' الصور</div>'+
      '<div class="grid2"><div class="field"><label>إجمالي الرصيد (Credits)</label><input class="input" id="wICr" inputmode="decimal" value="'+A.esc(w.imageCredits||'')+'"></div>'+
      '<div class="field"><label>عدد الصور</label><input class="input" id="wICn" inputmode="numeric" value="'+A.esc(w.imageCount||'')+'"></div></div>'+
      '<div class="field" style="margin-bottom:0"><label>التكلفة ('+A.esc((A.CURRENCIES[cur]||{}).ar||cur)+')</label><input class="input costin" id="wICost" inputmode="decimal" value="'+A.esc(w.imageCost||'')+'"></div></div>';

    body+='<div class="card pad" style="margin-top:12px"><div class="kv" style="border:none"><span class="k" style="font-weight:700;color:var(--ink)">إجمالي التكلفة</span><span class="v" id="grandTotal">'+A.money(gCost(),cur)+'</span></div></div>';

    body+='<div class="field" style="margin-top:14px"><label>ملاحظات</label><textarea class="input" id="wNotes" placeholder="اكتب أي ملاحظة…">'+A.esc(w.notes||'')+'</textarea></div>';
    body+='<div class="divider"></div><button class="btn" id="saveWork">'+A.icon('save',18)+' حفظ العمل</button>';

    A.chrome({title:isEdit?'تعديل عمل':'عمل جديد', back:isEdit?('#/work/'+w.id):(w.groupId?('#/group/'+w.groupId):'#/works'), nav:'works', body:body});

    A.$('#wType').onclick=function(e){var b=e.target.closest('[data-t]');if(!b)return;draft.type=b.getAttribute('data-t');A.$$('#wType button').forEach(function(x){x.classList.toggle('on',x===b);});A.$('#customTypeWrap').classList.toggle('hidden',draft.type!=='custom');};
    A.$('#wGroup').onchange=function(){
      var sel=this;
      if(sel.value!=='__new'){draft.groupId=sel.value;return;}
      collect();
      A.prompt('اسم الجهة الجديدة',{placeholder:'مثال: القمرية',ok:'إضافة'}).then(function(name){
        name=(name||'').trim();
        if(name){var g=A.Store.saveGroup({name:name});draft.groupId=g.id;A.toast('تمت إضافة الجهة','ok');}
        keepScroll=true;renderForm();
      });
    };
    A.$('#coverPick').onclick=function(){A.pickImage(1000).then(function(d){if(d){draft.coverImage=d;collect();keepScroll=true;renderForm();}});};
    if(A.$('#rmCover'))A.$('#rmCover').onclick=function(){draft.coverImage='';collect();keepScroll=true;renderForm();};
    A.$('#wProdCur').onchange=function(){collect();keepScroll=true;renderForm();};
    A.$$('.costin').forEach(function(inp){inp.oninput=function(){recalc();};});
    A.$('#saveWork').onclick=function(){
      collect(); if(!draft.name){A.toast('أدخل اسم العمل','err');return;}
      var saved=A.Store.saveWork(draft);A.toast('تم الحفظ','ok');A.go('#/work/'+saved.id);
    };
    if(keepScroll){ try{window.scrollTo(0,sy);}catch(e){} keepScroll=false; }
  }

  function gCost(){return A.parseNum(draft.videoCost)+A.parseNum(draft.imageCost);}
  function recalc(){
    draft.videoCost=A.parseNum(A.$('#wVCost').value); draft.imageCost=A.parseNum(A.$('#wICost').value);
    if(A.$('#grandTotal'))A.$('#grandTotal').innerHTML=A.money(gCost(),pcur());
  }
  function collect(){
    var w=draft;
    w.name=A.$('#wName').value.trim(); w.clientId=A.$('#wClient').value;
    var gv=A.$('#wGroup')?A.$('#wGroup').value:w.groupId; if(gv!=='__new')w.groupId=gv||''; w.assignee=A.$('#wAssignee').value.trim();
    w.customType=A.$('#wCustomType')?A.$('#wCustomType').value.trim():w.customType;
    w.startDate=A.$('#wStart').value; w.deliveryDate=A.$('#wDelivery').value; w.status=A.$('#wStatus').value;
    w.agreedAmount=A.parseNum(A.$('#wAgreed').value); w.agreedCurrency=A.$('#wAgreedCur').value;
    w.prodCurrency=A.$('#wProdCur').value; w.finalLink=A.$('#wLink').value.trim();
    if(A.$('#wNotes')) w.notes=A.$('#wNotes').value.trim();
    w.videoCredits=A.parseNum(A.$('#wVCr').value); w.videoCount=A.parseNum(A.$('#wVCn').value); w.videoCost=A.parseNum(A.$('#wVCost').value);
    w.imageCredits=A.parseNum(A.$('#wICr').value); w.imageCount=A.parseNum(A.$('#wICn').value); w.imageCost=A.parseNum(A.$('#wICost').value);
  }

  function payForm(w){
    var sh=A.sheet('<h2>تسجيل دفعة</h2>'+
      '<div class="field"><label>المبلغ</label><div class="amount-row"><input class="input" id="pAmt" inputmode="decimal">'+curSelect('pCur',w.agreedCurrency||A.Store.base())+'</div></div>'+
      '<div class="field"><label>التاريخ</label><input class="input" type="date" id="pDate" value="'+A.todayISO()+'"></div>'+
      '<div class="field"><label>ملاحظة</label><input class="input" id="pNote"></div>'+
      '<button class="btn" id="pSave">حفظ الدفعة</button>');
    A.$('#pSave',sh).onclick=function(){
      var amt=A.parseNum(A.$('#pAmt',sh).value);if(amt<=0){A.toast('أدخل مبلغًا','err');return;}
      w.payments=w.payments||[];w.payments.push({amount:amt,currency:A.$('#pCur',sh).value,date:A.$('#pDate',sh).value,note:A.$('#pNote',sh).value.trim()});
      A.Store.saveWork(w);A.closeSheet();A.toast('تم تسجيل الدفعة','ok');A.Views.works.detail(w.id);
    };
  }

  function curSelect(id,val){return '<select class="select" id="'+id+'">'+A.CUR_LIST.map(function(c){return '<option value="'+c+'" '+(val===c?'selected':'')+'>'+(A.CURRENCIES[c].label)+' '+A.CURRENCIES[c].ar+'</option>';}).join('')+'</select>';}
  function chip(k,label){return '<button class="pill" data-chip="'+k+'" style="'+(statusFilter===k?'background:var(--em);color:#fff;border-color:var(--em)':'')+'">'+A.esc(label)+'</button>';}
  function kv(k,v){return '<div class="kv"><span class="k">'+A.esc(k)+'</span><span class="v">'+v+'</span></div>';}
  function row(w,base,showGroup){var f=A.Store.workFinance(w),cl=A.Store.getClient(w.clientId),gg=(showGroup&&w.groupId)?A.Store.getGroup(w.groupId):null;
    return '<div class="row-item" data-go="'+w.id+'">'+(w.coverImage?'<div class="avatar cover" style="background-image:url(\''+w.coverImage+'\')"></div>':'<div class="avatar">'+A.icon(w.type==='vid'?'video':(w.type==='both'?'works':'image'),20)+'</div>')+
      '<div class="grow"><div class="t">'+A.esc(w.name||'—')+'</div><div class="s">'+(gg?A.esc(gg.name)+' • ':'')+A.esc(cl?cl.name:'بدون عميل')+(w.assignee?(' • '+A.esc(w.assignee)):'')+' • '+A.fmtDateShort(dateKey(w))+'</div><div style="margin-top:5px">'+A.badge(A.WORK_STATUS,w.status)+' '+A.badge(A.PAY_STATUS,f.payStatus)+(f.isLoss?' '+A.badge({loss:{ar:'خسارة',cls:'b-loss'}},'loss'):'')+'</div></div>'+
      '<div class="end">'+A.money(f.profit,base,{color:true})+'<div class="tiny muted">ربح</div></div></div>';
  }

  // ================= الجهات =================
  A.Views.groups={
    detail:function(id){
      var g=A.Store.getGroup(id); if(!g){A.go('#/works');return;}
      var base=A.Store.base(), s=A.Store.groupSummary(id);
      var ws=A.Store.groupWorks(id).slice().sort(byNewest);
      var body='<div class="card pad" style="margin-bottom:12px;display:flex;align-items:center;gap:12px">'+
        (g.logo?'<div class="avatar cover" style="width:58px;height:58px;background-image:url(\''+g.logo+'\')"></div>':'<div class="avatar group-av" style="width:58px;height:58px;font-size:22px">'+A.esc((g.name||'?').slice(0,1))+'</div>')+
        '<div class="grow"><div style="font-size:19px;font-weight:700">'+A.esc(g.name)+'</div><div class="muted tiny">'+s.count+' عمل</div></div></div>';
      if(s.missing) body+='<div class="notice">'+A.icon('warn',18)+'<div>بعض المبالغ بعملة بلا سعر صرف.</div></div>';
      body+='<div class="stat-grid">'+
        '<div class="stat"><div class="lbl">إجمالي المتفق عليه</div><div class="val">'+A.money(s.agreed,base)+'</div></div>'+
        '<div class="stat"><div class="lbl">إجمالي الربح</div><div class="val">'+A.money(s.profit,base,{color:true})+'</div></div>'+
        '<div class="stat"><div class="lbl">المستلم</div><div class="val">'+A.money(s.received,base)+'</div></div>'+
        '<div class="stat"><div class="lbl">المتبقي</div><div class="val '+(s.remaining>0.004?'neg':'')+'">'+A.money(s.remaining,base)+'</div></div>'+
      '</div>';
      body+='<div class="section-title">أعمال الجهة</div>';
      body+=ws.length?'<div class="list">'+ws.map(function(w){return row(w,base,false);}).join('')+'</div>':'<div class="empty">'+A.icon('works',48)+'<div class="t">لا أعمال بعد</div><div>أضف أول عمل لهذه الجهة</div></div>';
      body+='<div class="divider"></div><div class="btn-row"><button class="btn ghost" id="gEdit">'+A.icon('edit',18)+' تعديل الجهة</button><button class="btn danger" id="gDel">'+A.icon('trash',18)+' حذف الجهة</button></div>';
      body+='<div class="fab"><button id="fabAdd">'+A.icon('plus',26)+'</button></div>';
      A.chrome({title:g.name, sub:'جهة', back:'#/works', nav:'works', body:body});
      A.$('#fabAdd').onclick=function(){A.Views.works.form(null,g.id);};
      A.$$('[data-go]').forEach(function(el){el.onclick=function(){A.go('#/work/'+el.getAttribute('data-go'));};});
      A.$('#gEdit').onclick=function(){A.Views.groups.form(g);};
      A.$('#gDel').onclick=function(){A.confirm('حذف الجهة؟','الأعمال داخلها لن تُحذف، بل تصبح بدون جهة.',{danger:true,ok:'حذف'}).then(function(ok){if(ok){A.Store.deleteGroup(id);A.toast('تم حذف الجهة','ok');A.go('#/works');}});};
    },
    form:function(g){
      var isEdit=!!(g&&g.id); g=g||{}; var logo=g.logo||'';
      var sh=A.sheet('<h2>'+(isEdit?'تعديل الجهة':'جهة جديدة')+'</h2>'+
        '<div class="field"><label>اسم الجهة *</label><input class="input" id="gName" placeholder="مثال: القمرية" value="'+A.esc(g.name||'')+'"></div>'+
        '<div class="field"><label>شعار الجهة (اختياري)</label><div class="img-pick" id="gLogo">'+(logo?'<img src="'+logo+'">':A.icon('image',28))+'<div>'+(logo?'تغيير الشعار':'اختيار شعار')+'</div></div></div>'+
        '<button class="btn" id="gSave">حفظ</button>');
      A.$('#gLogo',sh).onclick=function(){A.pickImage(400).then(function(d){if(d){logo=d;A.$('#gLogo',sh).innerHTML='<img src="'+d+'"><div>تغيير الشعار</div>';}});};
      A.$('#gSave',sh).onclick=function(){
        var name=A.$('#gName',sh).value.trim(); if(!name){A.toast('أدخل اسم الجهة','err');return;}
        var saved=A.Store.saveGroup(Object.assign({},g,{name:name,logo:logo}));
        A.closeSheet();A.toast('تم الحفظ','ok');A.go('#/group/'+saved.id);
      };
    }
  };
})(App);
