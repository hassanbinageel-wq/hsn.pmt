/* لوحة التحكم */
window.App = window.App || {};
(function(A){
  var filter={};
  function curName(c){return (A.CURRENCIES[c]||{}).ar||c;}
  A.Views=A.Views||{};

  A.Views.dashboard={
    show:function(){
      var base=A.Store.base(), d=A.Store.dashboard(filter), h=A.Store.settings().home;
      var body='';

      // ---- customizable header (cover + title + logo) ----
      var title=h.title||'hsn.pmt', dot=title.indexOf('.');
      var mark=dot>0?('<span class="a">'+A.esc(title.slice(0,dot))+'</span><span class="b">'+A.esc(title.slice(dot))+'</span>'):A.esc(title);
      if(h.cover){
        body+='<div class="home-hero" style="background-image:linear-gradient(180deg,rgba(11,17,14,.15),rgba(11,17,14,.75)),url('+"'"+h.cover+"'"+')">'+
          '<button class="edit-badge" id="editHome">'+A.icon('edit',16)+'</button>'+
          '<div class="hh-title">'+A.esc(title)+'</div></div>';
      }else{
        body+='<div class="brand-lockup"><div class="grow"><div class="bl-mark">'+mark+'</div>'+
          '<div class="bl-sub">إدارة أعمال إنتاج الذكاء الاصطناعي</div></div>'+
          '<button class="edit-badge dark" id="editHome">'+A.icon('edit',16)+'</button></div>';
      }

      var activeFilter=Object.keys(filter).filter(function(k){return filter[k];}).length;
      body+='<div style="display:flex;gap:8px;align-items:center;margin:14px 0">'+
        '<button class="btn ghost sm" id="fBtn">'+A.icon('filter',16)+' فلترة'+(activeFilter?(' ('+activeFilter+')'):'')+'</button>'+
        '<button class="btn ghost sm" id="fClear" '+(activeFilter?'':'style="display:none"')+'>مسح</button>'+
        '<div style="flex:1"></div>'+
        '<button class="btn ghost sm" id="explain">'+A.icon('info',16)+'</button></div>';

      if(d.missing) body+='<div class="notice">'+A.icon('warn',18)+'<div>بعض المبالغ بعملات لا يوجد لها سعر صرف. حدّث أسعار الصرف من الإعدادات لعرض إجمالي صحيح.</div></div>';

      body+='<div class="stat-grid">'+
        '<div class="stat hero"><div class="stat-ic">'+A.icon('netUp',19)+'</div><div class="lbl">صافي النتيجة</div><div class="val '+(d.net>=0?'':'neg')+'">'+A.money(d.net,base)+'</div></div>'+
        stat('coins','أرباح الأعمال',A.money(d.worksProfit,base))+
        stat('camera','تكلفة الإنتاج',A.money(d.itemsCost,base))+
        stat('card','المدفوع للاشتراكات',A.money(d.subsPaid,base))+
        '<div class="stat"><div class="stat-ic">'+A.icon('works',19)+'</div><div class="lbl">إجمالي الأعمال</div><div class="val val-rtl">'+A.esc(A.worksWord(d.totalWorks))+' <span class="val-sub">(مكتمل '+d.done+')</span></div></div>'+
        stat('contract','إجمالي المتفق عليه',A.money(d.agreed,base))+
        stat('checkCircle','المستلم فعليًا',A.money(d.received,base))+
        '<div class="stat wide"><div class="stat-ic">'+A.icon('due',19)+'</div><div class="lbl">المبالغ المتبقية على العملاء</div><div class="val '+(d.remaining>0?'neg':'')+'">'+A.money(d.remaining,base)+'</div></div>'+
      '</div>';

      var parts=[{label:'ربح',value:Math.max(0,d.worksProfit),color:'#0d9668'},{label:'تكلفة الإنتاج',value:d.itemsCost,color:'#c99029'}];
      body+='<div class="section-title">توزيع القيمة</div><div class="card pad">'+A.Charts.donut(parts)+'</div>';

      body+='<div class="section-title">الأعمال الأعلى ربحًا</div>';
      if(d.topProfit.length) body+='<div class="list">'+d.topProfit.map(function(r){return workRankRow(r,base);}).join('')+'</div>';
      else body+='<div class="card pad center muted tiny">لا توجد أعمال</div>';

      if(d.losses.length){ body+='<div class="section-title" style="color:var(--neg)">أعمال خاسرة</div><div class="list">'+d.losses.map(function(r){return workRankRow(r,base);}).join('')+'</div>'; }

      body+='<div class="section-title">أكثر العملاء تعاملًا</div>';
      if(d.topClients.length) body+='<div class="list">'+d.topClients.map(function(t){
        return '<div class="row-item" data-goc="'+t.client.id+'"><div class="avatar">'+A.esc((t.client.name||'?').slice(0,1))+'</div><div class="grow"><div class="t">'+A.esc(t.client.name)+'</div><div class="s">'+t.count+' عمل</div></div>'+A.icon('chevron',18)+'</div>';
      }).join('')+'</div>';
      else body+='<div class="card pad center muted tiny">لا يوجد عملاء</div>';

      A.chrome({title:'الرئيسية', sub:'العرض بعملة: '+curName(base), nav:'dashboard', body:body});

      A.$('#editHome').onclick=function(){A.go('#/settings/home');};
      A.$('#fBtn').onclick=openFilter;
      A.$('#fClear').onclick=function(){filter={};A.Views.dashboard.show();};
      A.$('#explain').onclick=explain;
      A.$$('[data-goc]').forEach(function(el){el.onclick=function(){A.go('#/client/'+el.getAttribute('data-goc'));};});
      A.$$('[data-gow]').forEach(function(el){el.onclick=function(){A.go('#/work/'+el.getAttribute('data-gow'));};});
    }
  };

  function stat(ic,lbl,val){return '<div class="stat"><div class="stat-ic">'+A.icon(ic,19)+'</div><div class="lbl">'+A.esc(lbl)+'</div><div class="val">'+val+'</div></div>';}
  function workRankRow(r,base){
    var f=A.Store.workFinance(r.w), cl=A.Store.getClient(r.w.clientId);
    return '<div class="row-item" data-gow="'+r.w.id+'"><div class="avatar">'+A.icon(r.w.type==='vid'?'video':'image',20)+'</div>'+
      '<div class="grow"><div class="t">'+A.esc(r.w.name||'—')+'</div><div class="s">'+A.esc(cl?cl.name:'')+' • هامش '+Math.round(r.margin)+'%</div></div>'+
      '<div class="end">'+A.money(f.profit,base,{color:true})+'</div></div>';
  }
  function openFilter(){
    var clients=A.Store.clients();
    var sh=A.sheet('<h2>فلترة</h2>'+
      seg('الحالة','fStatus',[['','الكل']].concat(Object.keys(A.WORK_STATUS).map(function(k){return [k,A.WORK_STATUS[k].ar];})),filter.status)+
      seg('النوع','fType',[['','الكل']].concat(Object.keys(A.WORK_TYPE).map(function(k){return [k,A.WORK_TYPE[k]];})),filter.type)+
      '<div class="field"><label>العميل</label><select class="select" id="fClient"><option value="">الكل</option>'+clients.map(function(c){return '<option value="'+c.id+'" '+(filter.clientId===c.id?'selected':'')+'>'+A.esc(c.name)+'</option>';}).join('')+'</select></div>'+
      '<div class="grid2"><div class="field"><label>من تاريخ</label><input class="input" type="date" id="fFrom" value="'+(filter.from||'')+'"></div>'+
      '<div class="field"><label>إلى تاريخ</label><input class="input" type="date" id="fTo" value="'+(filter.to||'')+'"></div></div>'+
      '<button class="btn" id="fApply">تطبيق</button>');
    A.$('#fApply',sh).onclick=function(){
      filter={status:A.$('#fStatus',sh).value,type:A.$('#fType',sh).value,clientId:A.$('#fClient',sh).value,from:A.$('#fFrom',sh).value,to:A.$('#fTo',sh).value};
      A.closeSheet();A.Views.dashboard.show();
    };
  }
  function seg(label,id,opts,val){
    return '<div class="field"><label>'+A.esc(label)+'</label><select class="select" id="'+id+'">'+opts.map(function(o){return '<option value="'+o[0]+'" '+(val===o[0]?'selected':'')+'>'+A.esc(o[1])+'</option>';}).join('')+'</select></div>';
  }
  function explain(){
    var base=curName(A.Store.base());
    A.sheet('<h2>طريقة حساب الإجماليات</h2><div style="font-size:14px;line-height:2;color:var(--ink-2)">'+
      '<p>كل مبلغ محفوظ بعملته الأصلية، ويُحوَّل للعرض بعملة <b>'+A.esc(base)+'</b> حسب أسعار الصرف اليدوية في الإعدادات.</p>'+
      '<p><b>ربح العمل</b> = المبلغ المتفق عليه − تكلفة الإنتاج (تكلفة الفيديو + تكلفة الصور التي تُدخلها في العمل).</p>'+
      '<p><b>صافي النتيجة</b> = مجموع أرباح جميع الأعمال غير الملغاة.</p>'+
      '<p><b>الاشتراكات</b> سجلّ مستقل لما تدفعه لأدواتك (كم رصيد وبأي سعر) للاطّلاع فقط، ولا تدخل في حساب صافي النتيجة حتى لا تُحتسب التكلفة مرتين.</p>'+
      '<p><b>المستلم فعليًا</b> يُعرض منفصلًا عن الربح، لأن الربح يُحسب على المتفق عليه لا على المحصّل.</p>'+
      '</div><button class="btn ghost" onclick="App.closeSheet()">تم</button>');
  }
})(App);
