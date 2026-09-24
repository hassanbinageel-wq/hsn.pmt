/* النسخ الاحتياطي والاستيراد والتصدير */
window.App = window.App || {};
(function(A){
  A.Views=A.Views||{};

  function counts(v){return {عملاء:(v.clients||[]).length, جهات:(v.groups||[]).length, أعمال:(v.works||[]).length, اشتراكات:(v.subscriptions||[]).length, فواتير:(v.invoices||[]).length};}

  A.Views.backup={
    show:function(){
      A.DB.get('meta').then(function(meta){
        meta=meta||{};
        var last=meta.lastBackupAt;
        var body='';
        if(!last || daysSince(last)>=14) body+='<div class="notice">'+A.icon('warn',18)+'<div>'+(last?('مرّ '+daysSince(last)+' يومًا منذ آخر نسخة احتياطية.'):'لم تنشئ نسخة احتياطية بعد.')+' ننصح بعمل نسخة الآن.</div></div>';
        body+='<div class="notice info">'+A.icon('info',18)+'<div>بياناتك على الجهاز فقط. حذف التطبيق أو مسح بياناته قد يمحوها — احتفظ دائمًا بنسخة احتياطية في مكان آمن (Drive / حاسوب).</div></div>';
        var s=A.Store.state(), c=counts(s);
        body+='<div class="card pad">'+Object.keys(c).map(function(k){return '<div class="kv"><span class="k">'+k+'</span><span class="v">'+c[k]+'</span></div>';}).join('')+
          '<div class="kv"><span class="k">آخر نسخة احتياطية</span><span class="v">'+(last?A.fmtDate(last.slice(0,10)):'—')+'</span></div></div>';

        body+='<div class="section-title">نسخة احتياطية مشفّرة</div>'+
          '<button class="btn" id="exp">'+A.icon('download',18)+' تصدير نسخة احتياطية</button>'+
          '<button class="btn ghost" id="imp" style="margin-top:10px">'+A.icon('upload',18)+' استيراد نسخة احتياطية</button>'+
          '<div class="hint center" style="margin-top:8px">النسخ تُحفظ في مدير الملفات داخل مجلد <b style="direction:ltr;display:inline-block">Documents/hsn.pmt</b></div>';
        body+='<div class="section-title">تصدير بيانات (Excel/CSV)</div>'+
          '<div class="btn-row"><button class="btn soft" id="csvWorks">'+A.icon('file',18)+' الأعمال</button><button class="btn soft" id="csvInv">'+A.icon('file',18)+' الفواتير</button></div>';

        A.chrome({title:'النسخ الاحتياطي',back:'#/more',nav:'more',body:body});
        A.$('#exp').onclick=exportBackup;
        A.$('#imp').onclick=importBackup;
        A.$('#csvWorks').onclick=exportWorksCSV;
        A.$('#csvInv').onclick=exportInvoicesCSV;
      });
    },
    checkReminder:function(){
      A.DB.get('meta').then(function(meta){meta=meta||{};if(!meta.lastBackupAt||daysSince(meta.lastBackupAt)>=14){setTimeout(function(){A.toast('تذكير: أنشئ نسخة احتياطية لبياناتك','warn');},1800);}});
    }
  };

  function exportBackup(){
    var vault=A.Store.state();
    var file={app:'hsn.pmt',type:'backup',v:2,createdAt:new Date().toISOString(),counts:counts(vault),data:vault};
    var fn='hsn-pmt-backup-'+A.todayISO()+'-'+String(Date.now()).slice(-5)+'.hsnbak';
    var json=JSON.stringify(file);
    function markDone(){ return A.DB.get('meta').then(function(m){m=m||{};m.lastBackupAt=new Date().toISOString();return A.DB.set('meta',m);}); }
    A.Platform.saveToDevice(fn,json).then(function(res){
      return markDone().then(function(){
        A.Views.backup.show();
        var sh=A.sheet('<h2>تم حفظ النسخة الاحتياطية</h2>'+
          '<div class="notice info">'+A.icon('check',18)+'<div>محفوظة في مدير الملفات داخل مجلد:<br><b style="direction:ltr;display:inline-block">'+A.esc(res.where)+'</b><br><span class="tiny" style="direction:ltr;display:inline-block">'+A.esc(res.file)+'</span></div></div>'+
          '<div class="btn-row"><button class="btn ghost" id="bkShare">'+A.icon('share',18)+' مشاركة أيضًا</button><button class="btn" id="bkOk">تم</button></div>');
        A.$('#bkOk',sh).onclick=function(){A.closeSheet();};
        A.$('#bkShare',sh).onclick=function(){A.closeSheet();A.Platform.saveText(fn,json,'application/json',{title:'نسخة hsn.pmt الاحتياطية',dialog:'مشاركة النسخة'});};
      });
    }).catch(function(e){
      console.error(e);
      // fallback: share sheet (user picks where to save)
      A.toast('تعذّر الحفظ المباشر — اختر مكان الحفظ','warn');
      A.Platform.saveText(fn,json,'application/json',{title:'نسخة hsn.pmt الاحتياطية',dialog:'حفظ النسخة'}).then(markDone).then(function(){A.Views.backup.show();});
    });
  }

  function importBackup(){
    A.Platform.pickTextFile().then(function(f){
      if(!f)return; var file;
      try{file=JSON.parse(f.text);}catch(e){A.toast('ملف غير صالح','err');return;}
      var vault = file && (file.data || (Array.isArray(file.works)?file:null)); // v2 plain، أو ملف حالة مباشر
      if(!file || file.type!=='backup' || !vault){A.toast(file&&file.payload?'هذه نسخة قديمة مشفّرة غير مدعومة':'هذا ليس ملف نسخة hsn.pmt','err');return;}
      var c=counts(vault);
      A.sheet('<h2>محتوى النسخة</h2><div class="card pad">'+Object.keys(c).map(function(k){return '<div class="kv"><span class="k">'+k+'</span><span class="v">'+c[k]+'</span></div>';}).join('')+
        '<div class="kv"><span class="k">تاريخ النسخة</span><span class="v">'+(file.createdAt?A.fmtDate(file.createdAt.slice(0,10)):'—')+'</span></div></div>'+
        '<div class="notice">'+A.icon('warn',18)+'<div>«استبدال» يحذف بياناتك الحالية. «دمج» يضيف الجديد فقط دون تكرار.</div></div>'+
        '<div class="btn-row"><button class="btn danger" id="rep">استبدال</button><button class="btn" id="mrg">دمج</button></div>'+
        '<button class="btn ghost" style="margin-top:10px" onclick="App.closeSheet()">إلغاء</button>');
      A.$('#rep').onclick=function(){doImport(vault,'replace');};
      A.$('#mrg').onclick=function(){doImport(vault,'merge');};
    }).catch(function(e){console.error(e);A.toast('تعذر قراءة الملف','err');});
  }

  function doImport(vault,mode){
    var cur=A.Store.state();
    if(mode==='replace'){ Object.keys(vault).forEach(function(k){cur[k]=vault[k];}); }
    else{ // merge arrays by id
      ['clients','groups','works','subscriptions','invoices'].forEach(function(key){
        cur[key]=cur[key]||[];
        var have={}; (cur[key]||[]).forEach(function(x){have[x.id]=true;});
        (vault[key]||[]).forEach(function(x){if(!have[x.id])cur[key].push(x);});
      });
    }
    A.Store.persistNow().then(function(){A.closeSheet();A.toast('تم الاستيراد ('+(mode==='replace'?'استبدال':'دمج')+')','ok');A.go('#/dashboard');})
    .catch(function(e){console.error(e);A.toast('تعذر الحفظ','err');});
  }

  function csv(rows){
    return '\ufeff'+rows.map(function(r){return r.map(function(c){c=(c==null?'':String(c));return '"'+c.replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  }
  function exportWorksCSV(){
    var base=A.Store.base();
    var rows=[['العمل','العميل','النوع','الحالة','البدء','التسليم','المتفق','العملة','المستلم','المتبقي','تكلفة العناصر('+base+')','الربح('+base+')']];
    A.Store.works().forEach(function(w){var f=A.Store.workFinance(w),cl=A.Store.getClient(w.clientId);
      rows.push([w.name,cl?cl.name:'',A.WORK_TYPE[w.type]||w.customType,A.WORK_STATUS[w.status].ar,w.startDate,w.deliveryDate,A.parseNum(w.agreedAmount),w.agreedCurrency,f.receivedOrig,f.remainingOrig,Math.round(f.itemsCost),Math.round(f.profit)]);});
    A.Platform.saveText('hsn-pmt-works-'+A.todayISO()+'.csv',csv(rows),'text/csv',{title:'أعمال hsn.pmt'}).then(function(){A.toast('تم تصدير الأعمال','ok');});
  }
  function exportInvoicesCSV(){
    var rows=[['الرقم','العميل','التاريخ','الاستحقاق','العملة','الإجمالي','المدفوع','المتبقي','الحالة']];
    A.Store.invoices().forEach(function(v){var f=A.Store.invoiceFinance(v),cl=v.clientSnapshot||A.Store.getClient(v.clientId)||{};
      rows.push([v.number,cl.name||'',v.date,v.dueDate,v.currency,f.total,f.paid,f.remaining,A.INV_STATUS[f.status].ar]);});
    A.Platform.saveText('hsn-pmt-invoices-'+A.todayISO()+'.csv',csv(rows),'text/csv',{title:'فواتير hsn.pmt'}).then(function(){A.toast('تم تصدير الفواتير','ok');});
  }
  function daysSince(iso){return Math.floor((Date.now()-new Date(iso).getTime())/86400000);}
})(App);
