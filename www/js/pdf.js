/* خدمة PDF للفواتير — تصميم احترافي. نبني HTML عربي RTL، نصوّره بـ html2canvas ثم jsPDF (A4). */
window.App = window.App || {};
(function(A){
  function shade(hex,amt){ // lighten/darken hex by amt (-1..1)
    try{var h=hex.replace('#','');if(h.length===3)h=h.split('').map(function(x){return x+x;}).join('');
      var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
      function m(v){return Math.max(0,Math.min(255,Math.round(v+amt*255)));}
      return 'rgb('+m(r)+','+m(g)+','+m(b)+')';
    }catch(e){return hex;}
  }
  function invoiceHTML(v){
    var s=A.Store.settings(), b=s.business, ic=s.invoice, cur=v.currency;
    var fin=A.Store.invoiceFinance(v);
    var client=v.clientSnapshot||A.Store.getClient(v.clientId)||{};
    var color=ic.color||'#0b110e';
    var curAr=(A.CURRENCIES[cur]||{}).ar||cur;
    var soc=ic.socials||{}, brand={instagram:'#E1306C',tiktok:'#111111',facebook:'#1877F2',whatsapp:'#25D366'};
    var socHtml=['instagram','tiktok','facebook','whatsapp'].filter(function(k){return soc[k]&&soc[k].on&&soc[k].handle;}).map(function(k){
      return '<span style="display:inline-flex;align-items:center;gap:5px;margin:0 8px;color:#555;font-size:12.5px;direction:ltr"><span style="color:'+brand[k]+';display:inline-flex">'+A.icon(k,15)+'</span>'+A.esc(soc[k].handle)+'</span>';
    }).join('');
    var bankHtml=A.PDF.banksHTML(v,color);
    var col=Object.assign({desc:'الوصف',type:'النوع',qty:'الكمية',price:'السعر',total:'الإجمالي'}, ic.columns||{}, v.columns||{});
    var HID=v.hiddenCols||{}; function sh(k){return !HID[k];}
    var rowBg=0, rows=(v.items||[]).map(function(it,i){
      var subs=(it.subs&&it.subs.length)?it.subs:[{type:'',qty:0,unitPrice:0}];
      return subs.map(function(sb,j){
        var line=A.lineTotal(sb);
        var bg=(rowBg++%2)? '#faf9f7':'#ffffff';
        var cells='';
        if(j===0){
          if(sh('num')) cells+='<td rowspan="'+subs.length+'" style="padding:12px 10px;text-align:center;color:#9aa;width:30px;border-top:1px solid #eee">'+(i+1)+'</td>';
          if(sh('desc')) cells+='<td rowspan="'+subs.length+'" style="padding:12px 10px;font-weight:700;border-top:1px solid #eee;vertical-align:middle">'+A.esc(it.desc||'')+'</td>';
        }
        var sc=sb.currency||cur; var sym=(sc!==cur)?(' '+((A.CURRENCIES[sc]||{}).label||sc)):'';
        if(sh('type')) cells+='<td style="padding:10px;text-align:center;color:#444">'+A.esc(sb.type||'')+'</td>';
        if(sh('qty')) cells+='<td style="padding:10px;text-align:center;color:#555">'+((sb.manual&&!A.parseNum(sb.qty))?'—':A.esc(A.groupNum(A.parseNum(sb.qty))))+'</td>';
        if(sh('price')) cells+='<td style="padding:10px;text-align:center;color:#555">'+((sb.manual&&!A.parseNum(sb.unitPrice))?'—':A.esc(A.groupNum(A.parseNum(sb.unitPrice))+sym))+'</td>';
        if(sh('total')) cells+='<td style="padding:10px;text-align:center;font-weight:700">'+A.esc(A.groupNum(line)+sym)+'</td>';
        return '<tr style="background:'+bg+'">'+cells+'</tr>';
      }).join('');
    }).join('');
    var payRows=(v.payments||[]).map(function(p){return '<tr><td style="padding:6px 4px;color:#777">'+A.fmtDate(p.date)+'</td><td style="padding:6px 4px;color:#777">'+A.esc(p.note||'دفعة')+'</td><td style="padding:6px 4px;text-align:left;font-weight:600">'+A.esc(A.moneyText(A.parseNum(p.amount),cur))+'</td></tr>';}).join('');
    function totRow(lbl,val,strong){return '<div style="display:flex;justify-content:space-between;padding:'+(strong?'11px 14px':'7px 14px')+';'+(strong?'background:'+color+';color:#fff;border-radius:9px;margin-top:8px;font-size:16px':'font-size:14px;color:#444')+'"><span>'+lbl+'</span><b style="font-variant-numeric:tabular-nums">'+val+'</b></div>';}

    return ''+
    '<div style="width:794px;min-height:1118px;background:#fff;color:#1a1a1a;font-family:Tajawal,sans-serif;direction:rtl;box-sizing:border-box;position:relative;display:flex;flex-direction:column">'+
      '<div style="height:9px;background:'+color+'"></div>'+
      '<div style="padding:32px 44px 0;display:flex;justify-content:space-between;align-items:center;gap:16px">'+
        '<div style="text-align:right">'+
          (b.logo
            ? '<div style="height:86px;display:flex;align-items:center"><img src="'+b.logo+'" style="max-height:86px;max-width:230px;object-fit:contain;display:block"></div>'
            : '<div style="font-size:27px;font-weight:700;color:'+color+'">'+A.esc(b.name||'hsn.pmt')+'</div>'+(b.extra?'<div style="color:#888;font-size:13px;margin-top:3px">'+A.esc(b.extra)+'</div>':'')
          )+
        '</div>'+
        '<div style="text-align:left">'+
          '<div style="font-size:30px;font-weight:700;color:'+color+';letter-spacing:1px">فاتورة</div>'+
          '<div style="color:#666;font-size:15px;margin-top:4px;font-weight:600">'+A.esc(v.number||'')+'</div>'+
        '</div>'+
      '</div>'+
      (ic.headerText?'<div style="margin:16px 44px 0;padding:9px 14px;background:'+shade(color,.9)+';color:'+color+';font-size:13px;text-align:center;border-radius:8px">'+A.esc(ic.headerText)+'</div>':'')+
      (v.title?'<div style="padding:22px 44px 0;text-align:center"><span style="display:inline-block;font-size:19px;font-weight:700;color:'+color+';border-bottom:2px solid '+color+';padding-bottom:6px">'+A.esc(v.title)+'</span></div>':'')+
      '<div style="padding:24px 44px 0;display:flex;justify-content:space-between;gap:20px;font-size:14px">'+
        '<div style="line-height:1.9">'+
          '<div style="color:'+color+';font-weight:700;margin-bottom:6px;font-size:12px">فاتورة إلى</div>'+
          '<div style="font-weight:700;font-size:17px">'+A.esc(client.name||'—')+'</div>'+
          (client.phone && v.showClientPhone!==false?'<div style="color:#666">'+A.esc((client.countryCode||'')+' '+client.phone)+'</div>':'')+
          (client.notes?'<div style="color:#888;font-size:12px">'+A.esc(client.notes)+'</div>':'')+
        '</div>'+
        '<div style="line-height:2;text-align:left;color:#555;font-size:13.5px">'+
          '<div><span style="color:#999">التاريخ:</span> <b>'+A.fmtDate(v.date)+'</b></div>'+
          (v.dueDate?'<div><span style="color:#999">الاستحقاق:</span> <b>'+A.fmtDate(v.dueDate)+'</b></div>':'')+
          '<div><span style="color:#999">العملة:</span> <b>'+A.esc(curAr)+'</b></div>'+
        '</div>'+
      '</div>'+
      '<div style="padding:22px 44px 0">'+
        '<table style="width:100%;border-collapse:collapse;font-size:13.5px;border:1px solid #eee;border-radius:10px;overflow:hidden">'+
          '<thead><tr style="background:'+color+';color:#fff">'+
            (sh('num')?'<th style="padding:11px 8px;font-weight:700;width:30px">#</th>':'')+(sh('desc')?'<th style="padding:11px 10px;text-align:right;font-weight:700">'+A.esc(col.desc)+'</th>':'')+
            (sh('type')?'<th style="padding:11px 8px;font-weight:700">'+A.esc(col.type)+'</th>':'')+(sh('qty')?'<th style="padding:11px 8px;font-weight:700">'+A.esc(col.qty)+'</th>':'')+
            (sh('price')?'<th style="padding:11px 8px;font-weight:700">'+A.esc(col.price)+'</th>':'')+(sh('total')?'<th style="padding:11px 8px;font-weight:700">'+A.esc(col.total)+'</th>':'')+'</tr></thead>'+
          '<tbody>'+rows+'</tbody>'+
        '</table>'+
      '</div>'+
      '<div style="padding:14px 44px 0;display:flex;justify-content:flex-start">'+
        '<div style="width:320px">'+
          totRow('المجموع',A.esc(A.groupNum(fin.sub))+' '+A.esc(curAr))+
          (fin.discount>0?totRow('الخصم','- '+A.esc(A.groupNum(fin.discount))+' '+A.esc(curAr)):'')+
          (fin.taxAmt>0?totRow('الضريبة ('+A.esc(A.parseNum(v.taxPct))+'%)',A.esc(A.groupNum(fin.taxAmt))+' '+A.esc(curAr)):'')+
          totRow('الإجمالي',A.esc(A.groupNum(fin.total))+' '+A.esc(curAr),true)+
          (fin.paid>0?totRow('المدفوع',A.esc(A.groupNum(fin.paid))+' '+A.esc(curAr)):'')+
          (fin.paid>0?totRow('المتبقي',A.esc(A.groupNum(fin.remaining))+' '+A.esc(curAr)):'')+
        '</div>'+
      '</div>'+
      (payRows?'<div style="padding:18px 44px 0"><div style="font-size:12px;color:'+color+';font-weight:700;margin-bottom:4px">سجل الدفعات</div><table style="width:100%;border-collapse:collapse;font-size:12.5px">'+payRows+'</table></div>':'')+
      '<div style="padding:26px 44px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px">'+
        '<div style="font-size:12.5px;color:#444;line-height:1.9;max-width:430px">'+
          (ic.paymentTerms?'<div style="margin-bottom:4px"><b style="color:'+color+'">شروط الدفع:</b> '+A.esc(ic.paymentTerms)+'</div>':'')+
          (ic.transferInfo?'<div style="margin-bottom:4px"><b style="color:'+color+'">بيانات التحويل:</b> '+A.esc(ic.transferInfo)+'</div>':'')+
          (v.notes?'<div style="color:#777">'+A.esc(v.notes)+'</div>':'')+
        '</div>'+
        (b.stamp?'<img src="'+b.stamp+'" style="max-height:120px;max-width:150px;opacity:.95">':'')+
      '</div>'+
      '<div style="margin-top:auto">'+bankHtml+
      '<div style="border-top:2px solid '+color+';margin:0 44px;padding:14px 0;text-align:center;color:#888;font-size:12.5px">'+
        (ic.footerText?'<div style="font-weight:600;color:#555">'+A.esc(ic.footerText)+'</div>':'')+
        (socHtml?'<div style="margin-top:7px;display:flex;justify-content:center;flex-wrap:wrap;align-items:center">'+socHtml+'</div>':'')+
        ([b.phone,b.email,b.address].filter(Boolean).length?'<div style="margin-top:6px">'+[b.phone,b.email,b.address].filter(Boolean).map(A.esc).join(' • ')+'</div>':'')+
      '</div></div>'+
    '</div>';
  }

  A.PDF={
    // which banks show on an invoice: none if hidden, else the invoice's own selection, else banks enabled in settings
    invoiceBanks:function(v){
      var B=(A.Store.settings().banks)||{list:[]};
      if(v.showBanks===false) return [];
      var list=(B.list||[]).filter(function(k){return (k.accounts||[]).some(function(a){return (a.number||'').trim();});});
      if(Array.isArray(v.bankIds)) return list.filter(function(k){return v.bankIds.indexOf(k.id)>=0;});
      return list.filter(function(k){return k.on!==false;});
    },
    BANK_STYLES:[['cards','بطاقات'],['table','جدول'],['compact','مختصر'],['band','شريط ملوّن']],
    banksHTML:function(v,color,styleOverride){
      var B=(A.Store.settings().banks)||{}, banks=this.invoiceBanks(v);
      if(!banks.length) return '';
      var style=styleOverride||v.bankStyle||B.style||'cards';
      var esc=A.esc, NUM='direction:ltr;unicode-bidi:isolate;letter-spacing:.4px;word-break:break-all';
      function accs(k){return (k.accounts||[]).filter(function(a){return (a.number||'').trim();});}
      function curName(a){return a.currency?((A.CURRENCIES[a.currency]||{}).ar||a.currency):'';}
      function logo(k,h){return k.logo?'<img src="'+k.logo+'" style="height:'+h+'px;max-width:'+(h*2.7)+'px;object-fit:contain;flex:none">':'';}
      var body='';
      if(style==='table'){
        var rows='';
        banks.forEach(function(k,bi){var list=accs(k);list.forEach(function(a,j){
          var bg=bi%2?'#fafbfa':'#ffffff';
          rows+='<tr style="background:'+bg+'">'+
            (j===0?'<td rowspan="'+list.length+'" style="padding:7px 10px;border-top:1px solid #e6ebe8;vertical-align:middle"><div style="display:flex;align-items:center;gap:7px">'+logo(k,22)+'<b style="font-size:12.5px">'+esc(k.name||'')+'</b></div></td>':'')+
            '<td style="padding:7px 10px;border-top:1px solid #eef1ef;color:#666;font-size:11.5px;text-align:center;white-space:nowrap">'+esc(curName(a))+'</td>'+
            '<td style="padding:7px 10px;border-top:1px solid #eef1ef;font-weight:700;font-size:12.5px;text-align:left;'+NUM+'">'+esc(a.number)+'</td></tr>';});});
        body='<table style="width:100%;border-collapse:collapse;border:1px solid #e6ebe8;border-radius:10px;overflow:hidden;font-size:12px">'+
          '<thead><tr style="background:#f2f5f3;color:#444"><th style="padding:7px 10px;text-align:right;font-weight:700;width:40%">البنك</th><th style="padding:7px 10px;font-weight:700;width:18%">العملة</th><th style="padding:7px 10px;text-align:left;font-weight:700">رقم الحساب</th></tr></thead><tbody>'+rows+'</tbody></table>';
      }else if(style==='compact'){
        body=banks.map(function(k,bi){
          var parts=accs(k).map(function(a){var c=curName(a);return '<span style="white-space:nowrap">'+(c?'<span style="color:#777">'+esc(c)+': </span>':'')+'<b style="'+NUM+'">'+esc(a.number)+'</b></span>';}).join('<span style="color:#c9d2cd;margin:0 8px">|</span>');
          return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;'+(bi?'border-top:1px dashed #e3e8e5;':'')+'font-size:12.5px">'+
            '<div style="display:flex;align-items:center;gap:6px;flex:none;min-width:150px">'+logo(k,20)+'<b>'+esc(k.name||'')+'</b></div>'+
            '<div style="display:flex;flex-wrap:wrap;align-items:center;row-gap:3px">'+parts+'</div></div>';
        }).join('');
      }else if(style==='band'){
        body='<div style="display:flex;flex-wrap:wrap;gap:10px">'+banks.map(function(k){
          var rows=accs(k).map(function(a){var c=curName(a);return '<div style="padding:5px 10px;border-top:1px solid #eef1ef;display:flex;'+(c?'justify-content:space-between':'justify-content:center')+';gap:8px;align-items:center">'+(c?'<span style="color:#777;font-size:11px;white-space:nowrap">'+esc(c)+'</span>':'')+'<b style="font-size:12px;'+NUM+'">'+esc(a.number)+'</b></div>';}).join('');
          return '<div style="flex:1 1 calc(33.33% - 10px);min-width:200px;box-sizing:border-box;border:1px solid #e3e8e5;border-radius:10px;overflow:hidden;background:#fff">'+
            '<div style="background:'+color+';color:#fff;padding:7px 10px;display:flex;align-items:center;gap:7px">'+(k.logo?'<span style="background:#fff;border-radius:6px;padding:2px 4px;display:inline-flex">'+logo(k,18)+'</span>':'')+'<b style="font-size:12.5px">'+esc(k.name||'')+'</b></div>'+rows+'</div>';
        }).join('')+'</div>';
      }else{ // cards
        body='<div style="display:flex;flex-wrap:wrap;gap:12px">'+banks.map(function(k){
          var rows=accs(k).map(function(a){var c=curName(a);
            return '<div style="display:flex;'+(c?'justify-content:space-between':'justify-content:flex-end')+';align-items:center;gap:10px;padding:5px 0;border-top:1px dashed #e6ebe8">'+
              (c?'<span style="color:#666;font-size:11.5px;white-space:nowrap">'+esc(c)+'</span>':'')+
              '<b style="font-size:12.5px;text-align:left;'+NUM+'">'+esc(a.number)+'</b></div>';}).join('');
          return '<div style="flex:0 0 calc(50% - 6px);box-sizing:border-box;border:1px solid #e6ebe8;border-radius:10px;padding:9px 12px;background:#fbfcfb">'+
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'+logo(k,26)+'<b style="font-size:13px">'+esc(k.name||'')+'</b></div>'+rows+'</div>';
        }).join('')+'</div>';
      }
      return '<div style="margin:0 44px 14px">'+
        '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px">'+
          '<b style="font-size:14px;color:'+color+'">حساباتنا البنكية</b>'+
          ((B.holder||'').trim()?'<span style="font-size:12.5px;color:#555">اسم الحساب: <b style="color:#1a1a1a">'+esc(B.holder)+'</b></span>':'')+
        '</div>'+body+'</div>';
    },
    invoiceHTML:invoiceHTML,
    build:function(v){
      var stage=document.createElement('div'); stage.className='pdf-stage';
      stage.innerHTML=invoiceHTML(v); document.body.appendChild(stage);
      var node=stage.firstChild;
      return html2canvas(node,{scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false})
        .then(function(canvas){
          document.body.removeChild(stage);
          var jsPDF=window.jspdf.jsPDF, pdf=new jsPDF('p','mm','a4'); var pw=210, ph=297;
          var ih=canvas.height*pw/canvas.width;
          var img=canvas.toDataURL('image/jpeg',0.92);
          if(ih<=ph+12){ pdf.addImage(img,'JPEG',0,0,pw,Math.min(ih,ph)); } // fit on a single page (tolerance avoids a near-blank 2nd page)
          else{
            var pageCanvasHeight=canvas.width*ph/pw, y=0, page=0;
            while(y<canvas.height){
              var slice=document.createElement('canvas'); slice.width=canvas.width; slice.height=Math.min(pageCanvasHeight, canvas.height-y);
              slice.getContext('2d').drawImage(canvas,0,y,canvas.width,slice.height,0,0,canvas.width,slice.height);
              var simg=slice.toDataURL('image/jpeg',0.92), sih=slice.height*pw/canvas.width;
              if(page>0)pdf.addPage(); pdf.addImage(simg,'JPEG',0,0,pw,sih);
              y+=slice.height; page++;
            }
          }
          return pdf;
        }).catch(function(e){ if(stage.parentNode)document.body.removeChild(stage); throw e; });
    },
    exportInvoice:function(v){
      A.toast('جاري إنشاء PDF…');
      return this.build(v).then(function(pdf){
        var b64=pdf.output('datauristring').split(',')[1];
        var fn='invoice-'+(v.number||v.id).replace(/[^\w\-]/g,'_')+'.pdf';
        return A.Platform.saveAndShare(fn,b64,'application/pdf',{title:'فاتورة '+(v.number||''),dialog:'مشاركة الفاتورة'});
      }).then(function(){ A.toast('تم إنشاء الفاتورة','ok'); })
      .catch(function(e){ console.error(e); A.toast('تعذر إنشاء PDF','err'); });
    },
    previewNode:function(v){var d=document.createElement('div');d.style.transformOrigin='top right';d.innerHTML=invoiceHTML(v);return d;}
  };
})(App);
