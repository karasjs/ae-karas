export default function(ae2karas) {
  if(!ae2karas.JSON) {
    if(typeof JSON !== 'undefined') {
      return ae2karas.JSON = JSON;
    }
    let JSON = ae2karas.JSON = {};
    (function() {
      let toString = {}.toString;

      function isType(type) {
        return function(obj) {
          return toString.call(obj) === '[object ' + type + ']';
        }
      }

      let isObject = isType('Object');
      let isString = isType('String');
      let isFunction = isType('Function');
      let isNumber = isType('Number');
      let isBoolean = isType('Boolean');
      let isDate = isType('Date');

      function f(n) {
        return n < 10 ? '0' + n : n;
      }

      if(typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function() {

          return isFinite(this.valueOf())
            ? this.getUTCFullYear() + '-' +
            f(this.getUTCMonth() + 1) + '-' +
            f(this.getUTCDate()) + 'T' +
            f(this.getUTCHours()) + ':' +
            f(this.getUTCMinutes()) + ':' +
            f(this.getUTCSeconds()) + 'Z'
            : null;
        };

        String.prototype.toJSON =
          Number.prototype.toJSON =
            Boolean.prototype.toJSON = function() {
              return this.valueOf();
            };
      }

      var cx,
        escapable,
        gap,
        indent,
        meta,
        rep;

      function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function(a) {
          var c = meta[a];
          return typeof c === 'string'
            ? c
            : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
      }


      function str(key, holder) {
        var i,

          k,
          v,
          length,
          mind = gap,
          partial,
          value = holder[key];
        if(value && isObject(value) &&
          isFunction(value.toJSON)) {
          value = value.toJSON(key);
        }
        if(isFunction(rep)) {
          value = rep.call(holder, key, value);
        }
        if(isString(value)) {
          return quote(value);
        }
        else if(isNumber(value)) {
          return isFinite(value) ? String(value) : 'null';
        }
        else if(isBoolean(value) || value === null) {
          return String(value);
        }
        else {
          if(!value) {
            return 'null';
          }
          gap += indent;
          partial = [];
          if(Array.isArray(value)) {
            length = value.length;
            for(i = 0; i < length; i += 1) {
              partial[i] = str(i, value) || 'null';
            }
            v = partial.length === 0
              ? '[]'
              : gap
                ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                : '[' + partial.join(',') + ']';
            gap = mind;
            return v;
          }
          if(rep && isObject(rep)) {
            length = rep.length;
            for(i = 0; i < length; i += 1) {
              if(isString(rep[i])) {
                k = rep[i];
                v = str(k, value);
                if(v) {
                  partial.push(quote(k) + (gap ? ': ' : ':') + v);
                }
              }
            }
          }
          else {
            for(k in value) {
              if(value.hasOwnProperty(k)) {
                v = str(k, value);
                if(v) {
                  partial.push(quote(k) + (gap ? ': ' : ':') + v);
                }
              }
            }
          }
          v = partial.length === 0
            ? '{}'
            : gap
              ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
              : '{' + partial.join(',') + '}';
          gap = mind;
          return v;
        }
      }

      if(!isFunction(JSON.stringify)) {
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        meta = {
          '\b': '\\b',
          '\t': '\\t',
          '\n': '\\n',
          '\f': '\\f',
          '\r': '\\r',
          '"': '\\"',
          '\\': '\\\\'
        };
        JSON.stringify = function(value, replacer, space) {
          var i;
          gap = '';
          indent = '';
          if(isNumber(space)) {
            for(i = 0; i < space; i += 1) {
              indent += ' ';
            }
          }
          else if(isString(space)) {
            indent = space;
          }
          rep = replacer;
          if(replacer && !isFunction(replacer) &&
            (!isObject(replacer) ||
              !isNumber(replacer.length))) {
            throw new Error('JSON.stringify');
          }
          return str('', { '': value });
        };
      }
      if(!isFunction(JSON.parse)) {
        cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        JSON.parse = function(text, reviver) {
          var j;

          function walk(holder, key) {
            var k, v, value = holder[key];
            if(value && isObject(value)) {
              for(k in value) {
                if(value.hasOwnProperty(k)) {
                  v = walk(value, k);
                  if(v !== undefined) {
                    value[k] = v;
                  }
                  else {
                    delete value[k];
                  }
                }
              }
            }
            return reviver.call(holder, key, value);
          }

          text = String(text);
          cx.lastIndex = 0;
          if(cx.test(text)) {
            text = text.replace(cx, function(a) {
              return '\\u' +
                ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
          }
          if(/^[\],:{}\s]*$/
            .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
              .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
              .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

            let eval2 = eval;
            j = eval2('(' + text + ')');
            return isFunction(reviver)
              ? walk({ '': j }, '')
              : j;
          }
          throw new SyntaxError('JSON.parse');
        };
      }
    }());
    return JSON;
  }
  return ae2karas.JSON;
}
