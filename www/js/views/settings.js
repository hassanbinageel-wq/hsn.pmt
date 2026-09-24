/* المزيد + الإعدادات */
window.App = window.App || {};
(function(A){
  A.Views=A.Views||{};

  A.Views.more={
    show:function(){
      var th=A.Store.theme();
      var body='<div class="field"><label>مظهر التطبيق</label><div class="seg" id="themeSeg">'+
          '<button data-th="light" class="'+(th==='light'?'on':'')+'">فاتح</button>'+
          '<button data-th="dark" class="'+(th==='dark'?'on':'')+'">داكن</button>'+
          '<button data-th="auto" class="'+(th==='auto'?'on':'')+'">تلقائي</button>'+
        '</div></div>'+
        '<div class="list">'+
        srow('sub','الاشتراكات','أدوات الذكاء الاصطناعي وتجديداتها','#/subscriptions')+
        srow('building','هوية النشاط والفاتورة','الاسم، الشعار، الختم، بيانات التواصل','#/settings/identity')+
        srow('money','العملات وأسعار الصرف','عملة العرض والأسعار اليدوية','#/settings/currency')+
        srow('invoice','تصميم الفاتورة','اللون، الترقيم، النصوص','#/settings/invoice')+
        srow('image','تخصيص الواجهة الرئيسية','صورة الغلاف والعنوان','#/settings/home')+
        srow('chart','التقارير','شهري • سنوي • فترة مخصصة — تصدير Excel','#/reports')+
        srow('cloud','النسخ الاحتياطي','تصدير/استيراد آمن + CSV','#/backup')+
        '</div>'+
        '<div class="center muted tiny" style="margin-top:20px">hsn.pmt • الإصدار 1.2.0<br>البيانات محفوظة على جهازك فقط</div>';
      A.chrome({title:'المزيد', nav:'more', body:body});
      A.$$('[data-nav]').forEach(function(el){el.onclick=function(){A.go(el.getAttribute('data-nav'));};});
      A.$('#themeSeg').onclick=function(e){var b=e.target.closest('[data-th]');if(!b)return;A.Theme.set(b.getAttribute('data-th'));A.$$('#themeSeg button').forEach(function(x){x.classList.toggle('on',x===b);});};
    }
  };

  A.Views.settings={
    identity:function(){
      var b=A.Store.settings().business;
      var body=''+
        img('الشعار','logo',b.logo)+
        img('الختم (يظهر أسفل الفاتورة)','stamp',b.stamp)+
        fld('اسم النشاط التجاري','sName',b.name)+
        fld('وصف أسفل الاسم','sExtra',b.extra)+
        fld('رقم التواصل','sPhone',b.phone)+
        fld('البريد الإلكتروني','sEmail',b.email)+
        fld('العنوان','sAddr',b.address)+
        '<button class="btn" id="save">'+A.icon('save',18)+' حفظ</button>';
      A.chrome({title:'هوية النشاط والفاتورة',back:'#/more',nav:'more',body:body});
      wireImg('logo');wireImg('stamp');
      A.$('#save').onclick=function(){
        var s=A.Store.settings();
        s.business.name=A.$('#sName').value.trim()||'hsn.pmt';s.business.extra=A.$('#sExtra').value.trim();
        s.business.phone=A.$('#sPhone').value.trim();s.business.email=A.$('#sEmail').value.trim();s.business.address=A.$('#sAddr').value.trim();
        A.Store.persist();A.toast('تم الحفظ','ok');A.go('#/more');
      };
    },

    currency:function(){
      var s=A.Store.settings(), r=s.rates;
      var others=A.CUR_LIST.filter(function(c){return c!=='USD';});
      var body='<div class="field"><label>عملة العرض الأساسية</label><select class="select" id="baseCur">'+A.CUR_LIST.map(function(c){return '<option value="'+c+'" '+(s.baseCurrency===c?'selected':'')+'>'+A.CURRENCIES[c].ar+' ('+A.CURRENCIES[c].label+')</option>';}).join('')+'</select><div class="hint">تتحول جميع المبالغ المعروضة فورًا عند التغيير.</div></div>';
      body+='<div class="notice info">'+A.icon('info',18)+'<div>أدخل أسعار الصرف يدويًا مقابل الدولار. تُستخدم للتحويل بين العملات، ولا تُجلب من الإنترنت.</div></div>';
      body+=others.map(function(c){return '<div class="field"><label>1 دولار = كم '+A.esc(A.CURRENCIES[c].ar)+'؟</label><input class="input rate" data-cur="'+c+'" inputmode="decimal" value="'+A.esc(r[A.rateKey(c)]||'')+'"></div>';}).join('');
      body+='<div class="card pad tiny muted">آخر تعديل للأسعار: '+(r.updatedAt?A.fmtDate(r.updatedAt.slice(0,10)):'—')+'</div>';
      body+='<button class="btn" id="save" style="margin-top:14px">'+A.icon('save',18)+' حفظ</button>';
      A.chrome({title:'العملات وأسعار الصرف',back:'#/more',nav:'more',body:body});
      A.$('#save').onclick=function(){
        s.baseCurrency=A.$('#baseCur').value;
        A.$$('.rate').forEach(function(inp){ s.rates[A.rateKey(inp.getAttribute('data-cur'))]=A.parseNum(inp.value); });
        s.rates.updatedAt=new Date().toISOString();
        A.Store.persist();A.toast('تم الحفظ','ok');A.go('#/more');
      };
    },

    invoice:function(){
      var ic=A.Store.settings().invoice;
      ic.socials=ic.socials||{instagram:{handle:'',on:true},tiktok:{handle:'',on:true},facebook:{handle:'',on:true},whatsapp:{handle:'',on:true}};
      var SOC=[['instagram','إنستقرام','#E1306C'],['tiktok','تيك توك','#111111'],['facebook','فيسبوك','#1877F2'],['whatsapp','واتساب','#25D366']];
      function socRow(k,label,color){var o=ic.socials[k]||{};return '<div class="soc-row"><span class="soc-ic" style="color:'+color+'">'+A.icon(k,20)+'</span><input class="input" id="soc_h_'+k+'" placeholder="'+A.esc(label)+' — اسم الحساب" value="'+A.esc(o.handle||'')+'"><div class="track '+(o.on?'on':'')+'" id="soc_t_'+k+'"></div></div>';}
      function readSocials(){var s={};SOC.forEach(function(r){var k=r[0];s[k]={handle:(A.$('#soc_h_'+k).value||'').trim(),on:A.$('#soc_t_'+k).classList.contains('on')};});return s;}
      ic.columns=ic.columns||{desc:'الوصف',type:'النوع',qty:'الكمية',price:'السعر',total:'الإجمالي'};
      function colFld(lbl,id,v){return '<div class="field"><label>'+A.esc(lbl)+'</label><input class="input" id="'+id+'" value="'+A.esc(v||'')+'"></div>';}
      function readCols(){function v(id){return (A.$('#'+id).value||'').trim();}return {desc:v('col_desc')||'الوصف',type:v('col_type')||'النوع',qty:v('col_qty')||'الكمية',price:v('col_price')||'السعر',total:v('col_total')||'الإجمالي'};}
      var body='<div class="field"><label>لون تصميم الفاتورة</label><div style="display:flex;gap:10px;align-items:center"><input type="color" id="iColor" value="'+A.esc(ic.color||'#111113')+'" style="width:54px;height:44px;border:none;background:none;border-radius:10px"><span class="muted tiny">اللون يظهر في ترويسة الفاتورة والإجمالي</span></div></div>';
      body+='<div class="field"><label>طريقة الترقيم</label><div class="seg" id="iNum"><button data-n="continuous" class="'+(ic.numbering==='continuous'?'on':'')+'">استمرار</button><button data-n="yearly" class="'+(ic.numbering==='yearly'?'on':'')+'">سنوي جديد</button></div></div>';
      body+='<div class="grid2"><div class="field"><label>بادئة الرقم</label><input class="input" id="iPrefix" value="'+A.esc(ic.prefix||'INV-')+'"></div><div class="field"><label>الرقم التالي</label><input class="input" id="iNext" inputmode="numeric" value="'+A.esc(ic.nextNumber||1)+'"></div></div>';
      body+=fld2('نص أعلى الفاتورة','iHeader',ic.headerText);
      body+=fld2('نص أسفل الفاتورة','iFooter',ic.footerText);
      body+=fld2('شروط الدفع','iTerms',ic.paymentTerms);
      body+=fld2('بيانات التحويل / وسيلة الدفع','iTransfer',ic.transferInfo);
      body+='<div class="section-title">حسابات التواصل (تظهر في الفاتورة)</div><div class="hint" style="margin:-4px 4px 8px">اكتب اسم الحساب، والمفتاح لإظهار/إخفاء الأيقونة.</div>';
      body+=SOC.map(function(r){return socRow(r[0],r[1],r[2]);}).join('');
      body+='<div class="section-title">عناوين أعمدة جدول الفاتورة</div>';
      body+='<div class="grid2">'+colFld('عمود الوصف','col_desc',ic.columns.desc)+colFld('عمود النوع','col_type',ic.columns.type)+'</div>';
      body+='<div class="grid2">'+colFld('عمود الكمية','col_qty',ic.columns.qty)+colFld('عمود السعر','col_price',ic.columns.price)+'</div>';
      body+=colFld('عمود الإجمالي','col_total',ic.columns.total);
      body+='<div class="section-title">معاينة مباشرة</div><div style="overflow:auto;border:1px solid var(--line);border-radius:12px;background:#fff"><div id="prevBox" style="transform-origin:top right"></div></div>';
      body+='<button class="btn" id="save" style="margin-top:14px">'+A.icon('save',18)+' حفظ</button>';
      A.chrome({title:'تصميم الفاتورة',back:'#/more',nav:'more',body:body});
      A.$('#iNum').onclick=function(e){var btn=e.target.closest('[data-n]');if(!btn)return;A.$$('#iNum button').forEach(function(x){x.classList.toggle('on',x===btn);});};
      var upd=A.debounce(renderPrev,250);
      ['iColor','iPrefix','iNext','iHeader','iFooter','iTerms','iTransfer'].forEach(function(id){var el=A.$('#'+id);el.oninput=upd;el.onchange=upd;});
      A.$('#iNum').addEventListener('click',upd);
      SOC.forEach(function(r){var k=r[0];A.$('#soc_h_'+k).oninput=upd;A.$('#soc_t_'+k).onclick=function(){this.classList.toggle('on');upd();};});
      ['col_desc','col_type','col_qty','col_price','col_total'].forEach(function(id){A.$('#'+id).oninput=upd;});
      function renderPrev(){
        // build a sample invoice using current field values
        var s=A.Store.settings();
        var tmp=Object.assign({},s.invoice,{color:A.$('#iColor').value,headerText:A.$('#iHeader').value,footerText:A.$('#iFooter').value,paymentTerms:A.$('#iTerms').value,transferInfo:A.$('#iTransfer').value,socials:readSocials(),columns:readCols()});
        var backup=s.invoice; s.invoice=tmp;
        var sample={number:(A.$('#iPrefix').value||'INV-')+'0001',title:'إعلان تجريبي',date:A.todayISO(),currency:s.baseCurrency,clientSnapshot:{name:'اسم العميل'},items:[{type:'frame',desc:'لقطات فيديو AI',qty:10,unitLabel:'لقطة',unitPrice:150},{type:'image',desc:'صور AI',qty:5,unitLabel:'صورة',unitPrice:80}],discount:0,taxPct:0,payments:[],notes:''};
        var box=A.$('#prevBox');box.innerHTML='';box.appendChild(A.PDF.previewNode(sample));
        s.invoice=backup;
        var node=box.firstChild;setTimeout(function(){var avail=box.parentElement.clientWidth;var sc=Math.min(1,avail/794);box.style.transform='scale('+sc+')';box.style.height=(node.offsetHeight*sc)+'px';},30);
      }
      renderPrev();
      A.$('#save').onclick=function(){
        var s=A.Store.settings();
        s.invoice.color=A.$('#iColor').value;s.invoice.numbering=A.$('#iNum .on').getAttribute('data-n');
        s.invoice.prefix=A.$('#iPrefix').value;s.invoice.nextNumber=Math.max(1,parseInt(A.$('#iNext').value)||1);
        s.invoice.headerText=A.$('#iHeader').value.trim();s.invoice.footerText=A.$('#iFooter').value.trim();
        s.invoice.paymentTerms=A.$('#iTerms').value.trim();s.invoice.transferInfo=A.$('#iTransfer').value.trim();
        s.invoice.socials=readSocials();
        s.invoice.columns=readCols();
        A.Store.persist();A.toast('تم الحفظ','ok');A.go('#/more');
      };
    },

    home:function(){
      var h=A.Store.settings().home;
      var body='<div class="notice info">'+A.icon('info',18)+'<div>تظهر هذه الصورة والعنوان أعلى الواجهة الرئيسية.</div></div>'+
        homeImg('صورة الغلاف',h.cover)+
        fld('العنوان الرئيسي','hTitle',h.title)+
        '<button class="btn" id="save">'+A.icon('save',18)+' حفظ</button>';
      A.chrome({title:'تخصيص الواجهة الرئيسية',back:'#/more',nav:'more',body:body});
      A.$('#pick_cover').onclick=function(){A.pickImage(1200).then(function(d){if(d){A.Store.settings().home.cover=d;A.Store.persist();A.Views.settings.home();}});};
      if(A.$('#rm_cover'))A.$('#rm_cover').onclick=function(){A.Store.settings().home.cover='';A.Store.persist();A.Views.settings.home();};
      A.$('#save').onclick=function(){A.Store.settings().home.title=A.$('#hTitle').value.trim()||'hsn.pmt';A.Store.persist();A.toast('تم الحفظ','ok');A.go('#/dashboard');};
    }
  };

  function homeImg(l,val){return '<div class="field"><label>'+A.esc(l)+'</label><div class="img-pick" id="pick_cover">'+(val?'<img src="'+val+'" style="max-height:140px">':A.icon('image',30))+'<div>'+(val?'تغيير الغلاف':'اختيار صورة غلاف')+'</div></div>'+(val?'<div class="hint center"><a id="rm_cover">إزالة الغلاف</a></div>':'')+'</div>';}
  function srow(ic,t,s,nav){return '<div class="set-row" data-nav="'+nav+'"><div class="ic">'+A.icon(ic,20)+'</div><div class="grow"><div class="t">'+A.esc(t)+'</div>'+(s?'<div class="s">'+A.esc(s)+'</div>':'')+'</div>'+A.icon('chevron',18)+'</div>';}
  function fld(l,id,v){return '<div class="field"><label>'+A.esc(l)+'</label><input class="input" id="'+id+'" value="'+A.esc(v||'')+'"></div>';}
  function fld2(l,id,v){return '<div class="field"><label>'+A.esc(l)+'</label><textarea class="input" id="'+id+'">'+A.esc(v||'')+'</textarea></div>';}
  function img(l,key,val){return '<div class="field"><label>'+A.esc(l)+'</label><div class="img-pick" id="pick_'+key+'">'+(val?'<img src="'+val+'">':A.icon('image',30))+'<div>'+(val?'تغيير':'اختيار صورة')+'</div></div>'+(val?'<div class="hint center"><a id="rm_'+key+'">إزالة</a></div>':'')+'</div>';}
  function wireImg(key){
    A.$('#pick_'+key).onclick=function(){A.pickImage(600).then(function(d){if(d){A.Store.settings().business[key]=d;A.Store.persist();A.Views.settings.identity();}});};
    if(A.$('#rm_'+key))A.$('#rm_'+key).onclick=function(){A.Store.settings().business[key]='';A.Store.persist();A.Views.settings.identity();};
  }
})(App);
