/* العملاء */
window.App = window.App || {};
(function(A){
  var q='';
  A.Views=A.Views||{};

  A.Views.clients={
    show:function(){
      var clients=A.Store.clients().slice().sort(function(a,b){return (a.name||'').localeCompare(b.name||'','ar');});
      if(q) clients=clients.filter(function(c){return (c.name||'').indexOf(q)>=0 || (c.phone||'').indexOf(q)>=0;});
      var body='<div class="field" style="margin-bottom:14px"><div style="position:relative">'+
        '<span style="position:absolute;right:12px;top:12px;color:var(--muted)">'+A.icon('search',18)+'</span>'+
        '<input class="input" id="q" placeholder="بحث بالاسم أو الجوال" value="'+A.esc(q)+'" style="padding-right:40px"></div></div>';
      if(!clients.length) body+=empty('clients','لا يوجد عملاء','أضف أول عميل بالزر بالأسفل');
      else body+='<div class="list">'+clients.map(row).join('')+'</div>';
      body+=fab();
      A.chrome({title:'العملاء', sub:A.Store.clients().length+' عميل', nav:'clients', body:body});
      A.$('#q').oninput=A.debounce(function(e){q=e.target.value.trim();A.Views.clients.show();var i=A.$('#q');i.focus();i.setSelectionRange(i.value.length,i.value.length);},250);
      A.$('#fabAdd').onclick=function(){A.Views.clients.form();};
      A.$$('[data-go]').forEach(function(el){el.onclick=function(){A.go('#/client/'+el.getAttribute('data-go'));};});
    },

    detail:function(id){
      var c=A.Store.getClient(id); if(!c){A.go('#/clients');return;}
      var works=A.Store.clientWorks(id), invs=A.Store.clientInvoices(id), base=A.Store.base();
      var remaining=0, miss=false;
      works.forEach(function(w){var f=A.Store.workFinance(w);if(w.status!=='cancel'){var r=A.Store.convert(f.remainingOrig,w.agreedCurrency||base,base);if(r==null)miss=true;else remaining+=r;}});
      var body='<div class="card pad" style="text-align:center;margin-bottom:14px">'+
        '<div class="avatar" style="width:64px;height:64px;margin:0 auto 10px;font-size:24px">'+A.esc((c.name||'?').slice(0,1))+'</div>'+
        '<div style="font-size:20px;font-weight:700">'+A.esc(c.name)+'</div>'+
        (c.phone?'<div class="muted">'+A.esc((c.countryCode||'')+' '+c.phone)+'</div>':'')+
        (c.notes?'<div class="muted tiny" style="margin-top:6px">'+A.esc(c.notes)+'</div>':'')+
        '<div class="btn-row" style="margin-top:14px">'+
          (c.phone?'<button class="btn soft sm" id="wa">'+A.icon('whatsapp',17)+' واتساب</button><button class="btn ghost sm" id="call">'+A.icon('phone',17)+' اتصال</button>':'')+
        '</div></div>';
      body+='<div class="stat-grid"><div class="stat"><div class="lbl">عدد الأعمال</div><div class="val">'+works.length+'</div></div>'+
        '<div class="stat"><div class="lbl">المتبقي عليه</div><div class="val '+(remaining>0?'neg':'')+'">'+A.money(remaining,base)+(miss?' *':'')+'</div></div></div>';

      body+='<div class="section-title">الأعمال</div>';
      if(works.length) body+='<div class="list">'+works.map(function(w){var f=A.Store.workFinance(w);return '<div class="row-item" data-gow="'+w.id+'"><div class="avatar">'+A.icon(w.type==='vid'?'video':'image',20)+'</div><div class="grow"><div class="t">'+A.esc(w.name||'—')+'</div><div class="s">'+A.badge(A.WORK_STATUS,w.status)+'</div></div><div class="end">'+A.money(f.agreedBase,base)+'</div></div>';}).join('')+'</div>';
      else body+='<div class="card pad center muted tiny">لا أعمال</div>';

      body+='<div class="section-title">الفواتير</div>';
      if(invs.length) body+='<div class="list">'+invs.map(function(v){var f=A.Store.invoiceFinance(v);return '<div class="row-item" data-goi="'+v.id+'"><div class="avatar">'+A.icon('invoice',20)+'</div><div class="grow"><div class="t">'+A.esc(v.number||'—')+'</div><div class="s">'+A.badge(A.INV_STATUS,f.status)+'</div></div><div class="end">'+A.money(f.total,v.currency)+'</div></div>';}).join('')+'</div>';
      else body+='<div class="card pad center muted tiny">لا فواتير</div>';

      body+='<div class="divider"></div><div class="btn-row"><button class="btn ghost" id="edit">'+A.icon('edit',18)+' تعديل</button><button class="btn danger" id="del">'+A.icon('trash',18)+' حذف</button></div>';

      A.chrome({title:c.name, back:'#/clients', body:body, noNav:false, nav:'clients'});
      if(c.phone){A.$('#wa').onclick=function(){A.Platform.openWhatsApp((c.countryCode||'')+c.phone);};A.$('#call').onclick=function(){A.Platform.dial((c.countryCode||'')+c.phone);};}
      A.$('#edit').onclick=function(){A.Views.clients.form(c);};
      A.$('#del').onclick=function(){A.confirm('حذف العميل؟','سيبقى ما يخصه من أعمال وفواتير.',{danger:true,ok:'حذف'}).then(function(ok){if(ok){A.Store.deleteClient(id);A.toast('تم الحذف','ok');A.go('#/clients');}});};
      A.$$('[data-gow]').forEach(function(el){el.onclick=function(){A.go('#/work/'+el.getAttribute('data-gow'));};});
      A.$$('[data-goi]').forEach(function(el){el.onclick=function(){A.go('#/invoice/'+el.getAttribute('data-goi'));};});
    },

    form:function(c){
      c=c||{};
      var sh=A.sheet('<h2>'+(c.id?'تعديل عميل':'عميل جديد')+'</h2>'+
        (c.id?'':'<button class="btn soft" id="pickContact" style="margin-bottom:14px">'+A.icon('clients',18)+' اختيار من جهات الاتصال</button>')+
        '<div class="field"><label>اسم العميل أو الجهة *</label><input class="input" id="cName" value="'+A.esc(c.name||'')+'"></div>'+
        '<div class="grid2"><div class="field"><label>مفتاح الدولة</label><input class="input" id="cCode" inputmode="tel" placeholder="اختياري" value="'+A.esc(c.countryCode||'')+'"></div>'+
        '<div class="field"><label>رقم الجوال</label><input class="input" id="cPhone" inputmode="tel" placeholder="5xxxxxxxx" value="'+A.esc(c.phone||'')+'"></div></div>'+
        '<div class="field"><label>بيانات إضافية</label><textarea class="input" id="cNotes">'+A.esc(c.notes||'')+'</textarea></div>'+
        '<button class="btn" id="save">حفظ</button>');
      var pc=A.$('#pickContact',sh);
      if(pc) pc.onclick=function(){
        pc.disabled=true; var old=pc.innerHTML; pc.innerHTML='جارِ الفتح…';
        A.Platform.getContacts().then(function(list){
          pc.disabled=false; pc.innerHTML=old;
          if(!list||!list.length){A.toast('لا توجد جهات اتصال متاحة','err');return;}
          openContactPicker(list);
        }).catch(function(e){pc.disabled=false;pc.innerHTML=old;A.toast((e&&e.message)?e.message:'تعذّر فتح جهات الاتصال','err');});
      };
      A.$('#save',sh).onclick=function(){
        var name=A.$('#cName',sh).value.trim(); if(!name){A.toast('أدخل الاسم','err');return;}
        var phone=A.$('#cPhone',sh).value.replace(/[^\d]/g,'');
        var code=A.$('#cCode',sh).value.trim();
        if(phone && code && !/^\+?\d{1,4}$/.test(code)){A.toast('مفتاح الدولة غير صحيح','err');return;}
        var obj=Object.assign({},c,{name:name,phone:phone,countryCode:code,notes:A.$('#cNotes',sh).value.trim()});
        A.Store.saveClient(obj);A.closeSheet();A.toast('تم الحفظ','ok');
        if(location.hash.indexOf('/client/')>=0)A.Views.clients.detail(obj.id); else A.Views.clients.show();
      };
    }
  };

  function openContactPicker(list){
    function rowsHTML(items){return items.length?items.map(function(c,i){return '<div class="row-item" data-i="'+i+'"><div class="avatar">'+A.esc((c.name||'?').slice(0,1))+'</div><div class="grow"><div class="t">'+A.esc(c.name||'—')+'</div><div class="s">'+A.esc(c.phone||'')+'</div></div>'+A.icon('chevron',18)+'</div>';}).join(''):'<div class="card pad center muted tiny">لا نتائج</div>';}
    var sh=A.sheet('<h2>اختر جهة اتصال</h2><div class="field"><input class="input" id="cq" placeholder="بحث بالاسم أو الرقم"></div><div class="list" id="clist" style="max-height:56vh;overflow:auto">'+rowsHTML(list)+'</div>');
    var cur=list;
    function bind(){A.$$('#clist .row-item',sh).forEach(function(el){el.onclick=function(){pickInto(cur[+el.getAttribute('data-i')]);};});}
    bind();
    A.$('#cq',sh).oninput=A.debounce(function(){var q=this.value.trim();cur=q?list.filter(function(c){return (c.name||'').indexOf(q)>=0||(c.phone||'').indexOf(q)>=0;}):list;A.$('#clist',sh).innerHTML=rowsHTML(cur);bind();},200);
  }
  function pickInto(c){
    if(!c)return;
    var raw=(c.phone||'').replace(/[^\d+]/g,'');
    if(raw.indexOf('00')===0)raw='+'+raw.slice(2);
    var code='+966', phone=raw;
    if(raw.charAt(0)==='+'){ code=''; phone=raw; }         // دولي كامل داخل الرقم
    else { var d=raw; if(d.indexOf('0')===0)d=d.slice(1); phone=d; } // محلي: أسقط الصفر
    A.Views.clients.form({name:c.name||'', countryCode:code, phone:phone});
  }
  function row(c){
    var works=A.Store.clientWorks(c.id).length;
    return '<div class="row-item" data-go="'+c.id+'"><div class="avatar">'+A.esc((c.name||'?').slice(0,1))+'</div>'+
      '<div class="grow"><div class="t">'+A.esc(c.name)+'</div><div class="s">'+(c.phone?A.esc((c.countryCode||'')+' '+c.phone):'—')+' • '+works+' عمل</div></div>'+A.icon('chevron',18)+'</div>';
  }
  function empty(ic,t,s){return '<div class="empty">'+A.icon(ic,56)+'<div class="t">'+A.esc(t)+'</div><div>'+A.esc(s)+'</div></div>';}
  function fab(){return '<div class="fab"><button id="fabAdd">'+A.icon('plus',26)+'</button></div>';}
})(App);
