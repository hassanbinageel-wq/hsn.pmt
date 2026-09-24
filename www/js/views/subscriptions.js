/* الاشتراكات — سجلّ مستقل لأدوات AI: كم رصيد اشتركت وبأي سعر */
window.App = window.App || {};
(function(A){
  A.Views=A.Views||{};
  function creditPriceText(p,cur){ if(p==null)return '—'; var s=p<1?p.toFixed(3):p.toFixed(2); return s+' '+((A.CURRENCIES[cur]||{}).label||cur)+' / Credit'; }
  function cr(n){return A.groupNum(n)+' Credit';}

  A.Views.subscriptions={
    show:function(){
      var base=A.Store.base(), sum=A.Store.subsSummary(), subs=A.Store.subscriptions().slice().sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
      var body='';
      if(sum.missing) body+='<div class="notice">'+A.icon('warn',18)+'<div>هناك اشتراك بعملة بلا سعر صرف.</div></div>';
      body+='<div class="stat-grid">'+
        '<div class="stat"><div class="stat-ic">'+A.icon('card',18)+'</div><div class="lbl">إجمالي المدفوع للأدوات</div><div class="val">'+A.money(sum.paid,base)+'</div></div>'+
        '<div class="stat"><div class="stat-ic">'+A.icon('walletCoin',18)+'</div><div class="lbl">إجمالي الرصيد المشترى</div><div class="val">'+A.esc(A.groupNum(sum.credits))+'<span class="tiny muted"> Credit</span></div></div>'+
      '</div>';
      body+='<div class="notice info">'+A.icon('info',18)+'<div>سجلّ مستقل لأدواتك: كم رصيد اشتريت وبأي سعر لكل أداة. (لا يؤثر على حساب أرباح الأعمال.)</div></div>';
      body+='<div class="section-title">الأدوات</div>';
      if(!subs.length) body+='<div class="empty">'+A.icon('sub',56)+'<div class="t">لا اشتراكات</div><div>أضف أداة مرة واحدة، ثم سجّل تجديداتها لاحقًا</div></div>';
      else body+='<div class="list">'+subs.map(row).join('')+'</div>';
      body+='<div class="fab"><button id="fabAdd">'+A.icon('plus',26)+'</button></div>';
      A.chrome({title:'الاشتراكات', sub:subs.length+' أداة', nav:'more', body:body, back:'#/more'});
      A.$('#fabAdd').onclick=function(){A.Views.subscriptions.form();};
      A.$$('[data-go]').forEach(function(el){el.onclick=function(){A.Views.subscriptions.detail(el.getAttribute('data-go'));};});
    },

    detail:function(id){
      var s=A.Store.getSub(id);if(!s){A.Views.subscriptions.show();return;}
      var paid=A.Store.subPaidOrig(s), credits=A.Store.subCreditsTotal(s), price=A.Store.subCreditPrice(s);
      var entries=(s.entries||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
      var body='<div class="card pad" style="text-align:center;margin-bottom:14px">'+
        (s.logo?'<img src="'+s.logo+'" style="width:70px;height:70px;border-radius:18px;object-fit:cover;margin:0 auto 10px;display:block">':'<div class="avatar" style="width:64px;height:64px;margin:0 auto 10px">'+A.icon('sub',26)+'</div>')+
        '<div style="font-size:20px;font-weight:700">'+A.esc(s.name)+'</div>'+
        '<div class="muted tiny">'+A.esc((A.CURRENCIES[s.currency]||{}).ar||s.currency)+' • '+creditPriceText(price,s.currency)+'</div></div>';

      body+='<div class="stat-grid">'+
        '<div class="stat"><div class="lbl">إجمالي المدفوع</div><div class="val">'+A.money(paid,s.currency)+'</div></div>'+
        '<div class="stat"><div class="lbl">إجمالي الرصيد</div><div class="val">'+A.esc(A.groupNum(credits))+'<span class="tiny muted"> Credit</span></div></div>'+
        '<div class="stat wide"><div class="lbl">سعر الرصيد الواحد</div><div class="val">'+A.esc(creditPriceText(price,s.currency))+'</div></div>'+
      '</div>';

      body+='<div class="section-title">سجل الدفعات والتجديدات</div>';
      body+='<button class="btn soft" id="addEntry">'+A.icon('plus',18)+' تسجيل دفعة / تجديد</button>';
      if(entries.length) body+='<div class="list" style="margin-top:12px">'+entries.map(function(e){var i=(s.entries||[]).indexOf(e);return '<div class="mini-item"><div class="avatar" style="width:38px;height:38px;border-radius:11px">'+A.icon('refresh',18)+'</div><div class="grow"><div style="font-weight:700">'+A.esc(A.moneyText(A.parseNum(e.amount),s.currency))+' <span class="muted tiny">• '+A.esc(cr(A.parseNum(e.credits)))+'</span></div><div class="s tiny muted">'+A.fmtDate(e.date)+(e.note?' • '+A.esc(e.note):'')+'</div></div><button class="x" data-del="'+i+'">'+A.icon('trash',15)+'</button></div>';}).join('')+'</div>';
      else body+='<div class="card pad center muted tiny" style="margin-top:12px">لا دفعات بعد</div>';

      body+='<div class="divider"></div><div class="btn-row"><button class="btn ghost" id="edit">'+A.icon('edit',18)+' تعديل الأداة</button><button class="btn danger" id="del">'+A.icon('trash',18)+' حذف</button></div>';
      A.chrome({title:s.name,back:'#/subscriptions',nav:'more',body:body});
      A.$('#addEntry').onclick=function(){entryForm(s);};
      A.$$('[data-del]').forEach(function(el){el.onclick=function(){s.entries.splice(+el.getAttribute('data-del'),1);A.Store.saveSub(s);A.Views.subscriptions.detail(id);};});
      A.$('#edit').onclick=function(){A.Views.subscriptions.form(s);};
      A.$('#del').onclick=function(){A.confirm('حذف الأداة؟','سيُحذف سجل دفعاتها كاملًا.',{danger:true,ok:'حذف'}).then(function(ok){if(ok){A.Store.deleteSub(id);A.toast('تم الحذف','ok');A.Views.subscriptions.show();}});};
    },

    form:function(s){
      var isEdit=!!(s&&s.id); s=s||{};
      var logo=s.logo||'';
      var sh=A.sheet('<h2>'+(isEdit?'تعديل الأداة':'أداة جديدة')+'</h2>'+
        '<div class="field"><label>شعار الأداة (اختياري — مرة واحدة)</label><div class="img-pick" id="pickLogo">'+(logo?'<img src="'+logo+'">':A.icon('image',28))+'<div>'+(logo?'تغيير الشعار':'اختيار شعار')+'</div></div></div>'+
        '<div class="field"><label>اسم الأداة *</label><input class="input" id="sName" placeholder="Higgsfield / Seedance ..." value="'+A.esc(s.name||'')+'"></div>'+
        '<div class="field"><label>عملة الأداة</label>'+cur('sCur',s.currency||'USD')+'</div>'+
        (isEdit?'':'<div class="section-title" style="margin-top:6px">أول دفعة</div>'+
          '<div class="grid2"><div class="field"><label>المبلغ المدفوع</label><input class="input" id="sAmt" inputmode="decimal"></div>'+
          '<div class="field"><label>الرصيد (Credits)</label><input class="input" id="sCredits" inputmode="decimal"></div></div>'+
          '<div class="field"><label>تاريخ الدفع</label><input class="input" type="date" id="sDate" value="'+A.todayISO()+'"></div>'+
          '<div class="hint" id="priceHint" style="margin-bottom:8px"></div>')+
        '<button class="btn" id="sSave">حفظ</button>');
      A.$('#pickLogo',sh).onclick=function(){A.pickImage(400).then(function(d){if(d){logo=d;A.$('#pickLogo',sh).innerHTML='<img src="'+d+'"><div>تغيير الشعار</div>';}});};
      if(!isEdit){
        var upd=function(){var a=A.parseNum(A.$('#sAmt',sh).value),c=A.parseNum(A.$('#sCredits',sh).value);A.$('#priceHint',sh).textContent=c>0?('سعر الرصيد: '+creditPriceText(a/c,A.$('#sCur',sh).value)):'';};
        A.$('#sAmt',sh).oninput=upd;A.$('#sCredits',sh).oninput=upd;A.$('#sCur',sh).onchange=upd;
      }
      A.$('#sSave',sh).onclick=function(){
        var name=A.$('#sName',sh).value.trim();if(!name){A.toast('أدخل اسم الأداة','err');return;}
        var obj=Object.assign({entries:[]},s,{name:name,currency:A.$('#sCur',sh).value,logo:logo});
        if(!isEdit){
          var amt=A.parseNum(A.$('#sAmt',sh).value), cds=A.parseNum(A.$('#sCredits',sh).value);
          obj.entries=[]; if(amt>0||cds>0)obj.entries.push({amount:amt,credits:cds,currency:obj.currency,date:A.$('#sDate',sh).value,note:'اشتراك أول'});
        }
        var saved=A.Store.saveSub(obj);A.closeSheet();A.toast('تم الحفظ','ok');A.Views.subscriptions.detail(saved.id);
      };
    }
  };

  function entryForm(s){
    var sh=A.sheet('<h2>تسجيل دفعة / تجديد</h2><div class="notice info">'+A.icon('info',18)+'<div>'+A.esc(s.name)+' — '+A.esc((A.CURRENCIES[s.currency]||{}).ar||s.currency)+'</div></div>'+
      '<div class="grid2"><div class="field"><label>المبلغ</label><input class="input" id="eAmt" inputmode="decimal"></div>'+
      '<div class="field"><label>الرصيد (Credits)</label><input class="input" id="eCredits" inputmode="decimal"></div></div>'+
      '<div class="field"><label>التاريخ</label><input class="input" type="date" id="eDate" value="'+A.todayISO()+'"></div>'+
      '<div class="field"><label>ملاحظة (اختياري)</label><input class="input" id="eNote" placeholder="تجديد شهري ..."></div>'+
      '<div class="hint" id="eHint" style="margin-bottom:8px"></div>'+
      '<button class="btn" id="eSave">حفظ</button>');
    var upd=function(){var a=A.parseNum(A.$('#eAmt',sh).value),c=A.parseNum(A.$('#eCredits',sh).value);A.$('#eHint',sh).textContent=c>0?('سعر الرصيد لهذه الدفعة: '+creditPriceText(a/c,s.currency)):'';};
    A.$('#eAmt',sh).oninput=upd;A.$('#eCredits',sh).oninput=upd;
    A.$('#eSave',sh).onclick=function(){
      var amt=A.parseNum(A.$('#eAmt',sh).value),cds=A.parseNum(A.$('#eCredits',sh).value);
      if(amt<=0&&cds<=0){A.toast('أدخل المبلغ والرصيد','err');return;}
      A.Store.addSubEntry(s.id,{amount:amt,credits:cds,currency:s.currency,date:A.$('#eDate',sh).value,note:A.$('#eNote',sh).value.trim()});
      A.closeSheet();A.toast('تم التسجيل','ok');A.Views.subscriptions.detail(s.id);
    };
  }
  function row(s){
    var paid=A.Store.subPaidOrig(s), credits=A.Store.subCreditsTotal(s), price=A.Store.subCreditPrice(s);
    var av=s.logo?'<div class="avatar cover" style="background-image:url(\''+s.logo+'\')"></div>':'<div class="avatar">'+A.icon('sub',20)+'</div>';
    return '<div class="row-item" data-go="'+s.id+'">'+av+'<div class="grow"><div class="t">'+A.esc(s.name)+'</div><div class="s">'+A.esc(A.groupNum(credits))+' Credit • '+A.esc(creditPriceText(price,s.currency))+'</div></div><div class="end">'+A.money(paid,s.currency)+'</div></div>';
  }
  function cur(id,val){return '<select class="select" id="'+id+'">'+A.CUR_LIST.map(function(c){return '<option value="'+c+'" '+(val===c?'selected':'')+'>'+A.CURRENCIES[c].ar+'</option>';}).join('')+'</select>';}
})(App);
