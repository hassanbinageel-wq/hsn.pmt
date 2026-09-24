/* رسوم SVG خفيفة: أعمدة (تدعم القيم السالبة) ودائرة مجزّأة */
window.App = window.App || {};
(function(A){
  A.Charts={
    bar:function(data, cur){ // data:[{label,value}]
      if(!data.length) return '<div class="empty tiny">لا بيانات كافية للرسم</div>';
      var W=Math.max(300, data.length*64), H=190, pad=26, base=H-30;
      var vals=data.map(function(d){return d.value;});
      var max=Math.max(1, Math.max.apply(null,vals)), min=Math.min(0, Math.min.apply(null,vals));
      var range=(max-min)||1;
      var zeroY = base - ((0-min)/range)*(base-pad);
      var bw=Math.min(38,(W-40)/data.length-14);
      var bars='', gy='';
      gy+='<line x1="10" y1="'+zeroY.toFixed(1)+'" x2="'+(W-10)+'" y2="'+zeroY.toFixed(1)+'" stroke="#e2ece7" stroke-width="1"/>';
      data.forEach(function(d,i){
        var x=20+i*((W-40)/data.length)+((W-40)/data.length-bw)/2;
        var vY=base-((d.value-min)/range)*(base-pad);
        var top=Math.min(vY,zeroY), h=Math.abs(vY-zeroY);
        var col=d.value>=0?'#0d9668':'#dc3b46';
        bars+='<rect x="'+x.toFixed(1)+'" y="'+top.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(2,h).toFixed(1)+'" rx="4" fill="'+col+'"/>';
        bars+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(base+16)+'" font-size="10" fill="#8a978f" text-anchor="middle" font-family="Tajawal">'+A.esc(d.label)+'</text>';
      });
      return '<div class="chart-wrap"><svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" font-family="Tajawal">'+gy+bars+'</svg></div>';
    },
    donut:function(parts){ // parts:[{label,value,color}]
      var total=parts.reduce(function(a,p){return a+Math.max(0,p.value);},0);
      if(total<=0) return '<div class="empty tiny">لا بيانات</div>';
      var cx=70,cy=70,r=54,sw=22, off=0, segs='';
      var C=2*Math.PI*r;
      parts.forEach(function(p){
        var frac=Math.max(0,p.value)/total; if(frac<=0)return;
        var len=frac*C;
        segs+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.color+'" stroke-width="'+sw+'" '+
              'stroke-dasharray="'+len.toFixed(2)+' '+(C-len).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 '+cx+' '+cy+')"/>';
        off+=len;
      });
      var leg=parts.filter(function(p){return p.value>0;}).map(function(p){return '<span><i style="background:'+p.color+'"></i>'+A.esc(p.label)+'</span>';}).join('');
      return '<div style="display:flex;align-items:center;gap:14px;justify-content:center;flex-wrap:wrap">'+
        '<svg viewBox="0 0 140 140" width="130" height="130">'+segs+'</svg>'+
        '<div class="legend" style="flex-direction:column;align-items:flex-start">'+leg+'</div></div>';
    }
  };
})(App);
