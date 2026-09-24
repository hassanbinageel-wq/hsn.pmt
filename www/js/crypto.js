/* التشفير: PBKDF2 لاشتقاق المفتاح من كلمة المرور + AES-GCM لتشفير البيانات.
   لا تُحفظ كلمة المرور أبدًا؛ يُحفظ فقط ملح (salt) وقيمة تحقق مشفّرة. */
window.App = window.App || {};
(function(A){
  var enc=new TextEncoder(), dec=new TextDecoder();
  var subtle = (window.crypto && window.crypto.subtle) ? window.crypto.subtle : null;
  var ITER = 150000;
  var VERIFY_TEXT = 'hsn.pmt::verify::v1';

  function buf2b64(buf){var b=new Uint8Array(buf),s='';for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s);}
  function b642buf(b64){var s=atob(b64),a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a.buffer;}
  A.buf2b64=buf2b64; A.b642buf=b642buf;

  function randBytes(n){var a=new Uint8Array(n);window.crypto.getRandomValues(a);return a;}

  A.Crypto = {
    available: !!subtle,
    _key:null,

    deriveKey: function(password, saltBuf){
      return subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
        .then(function(base){
          return subtle.deriveKey(
            {name:'PBKDF2', salt:saltBuf, iterations:ITER, hash:'SHA-256'},
            base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
        });
    },

    // create initial security material for a new password
    setupPassword: function(password){
      var salt = randBytes(16);
      return this.deriveKey(password, salt.buffer).then(function(key){
        A.Crypto._key = key;
        var iv = randBytes(12);
        return subtle.encrypt({name:'AES-GCM', iv:iv}, key, enc.encode(VERIFY_TEXT)).then(function(ct){
          return { salt:buf2b64(salt), verify:buf2b64(ct), verifyIv:buf2b64(iv), iter:ITER };
        });
      });
    },

    // verify password against stored security material, keep key in memory on success
    unlock: function(password, sec){
      var salt=b642buf(sec.salt);
      return this.deriveKey(password, salt).then(function(key){
        return subtle.decrypt({name:'AES-GCM', iv:b642buf(sec.verifyIv)}, key, b642buf(sec.verify))
          .then(function(pt){
            if(dec.decode(pt)===VERIFY_TEXT){ A.Crypto._key=key; return true; }
            return false;
          }).catch(function(){return false;});
      });
    },

    isUnlocked: function(){return !!this._key;},
    lock: function(){this._key=null;},

    // encrypt a JS object with in-memory key -> {iv, data}
    encryptObj: function(obj){
      if(!this._key) return Promise.reject(new Error('locked'));
      var iv=randBytes(12);
      return subtle.encrypt({name:'AES-GCM', iv:iv}, this._key, enc.encode(JSON.stringify(obj)))
        .then(function(ct){return {iv:buf2b64(iv), data:buf2b64(ct)};});
    },
    decryptObj: function(payload){
      if(!this._key) return Promise.reject(new Error('locked'));
      return subtle.decrypt({name:'AES-GCM', iv:b642buf(payload.iv)}, this._key, b642buf(payload.data))
        .then(function(pt){return JSON.parse(dec.decode(pt));});
    },

    // encrypt with a specific password (for portable backups)
    encryptWithPassword: function(obj, password){
      var salt=randBytes(16);
      return this.deriveKey(password, salt.buffer).then(function(key){
        var iv=randBytes(12);
        return subtle.encrypt({name:'AES-GCM', iv:iv}, key, enc.encode(JSON.stringify(obj)))
          .then(function(ct){return {salt:buf2b64(salt), iv:buf2b64(iv), data:buf2b64(ct), iter:ITER};});
      });
    },
    decryptWithPassword: function(payload, password){
      return this.deriveKey(password, b642buf(payload.salt)).then(function(key){
        return subtle.decrypt({name:'AES-GCM', iv:b642buf(payload.iv)}, key, b642buf(payload.data))
          .then(function(pt){return JSON.parse(dec.decode(pt));});
      });
    },

    // re-derive & set key for a new password (used on change-password after data decrypted)
    rekey: function(password){
      var salt=randBytes(16);
      return this.deriveKey(password, salt.buffer).then(function(key){
        A.Crypto._key=key;
        var iv=randBytes(12);
        return subtle.encrypt({name:'AES-GCM',iv:iv},key,enc.encode(VERIFY_TEXT)).then(function(ct){
          return {salt:buf2b64(salt), verify:buf2b64(ct), verifyIv:buf2b64(iv), iter:ITER};
        });
      });
    }
  };
})(App);
