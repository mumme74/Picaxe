
document.addEventListener("readystatechange", function(){
  if(document.readyState == 'complete'){
    // initializerad och färdig
    while (addOnDOMLoad._queuedFuncs.length) {
      var obj = addOnDOMLoad._queuedFuncs.pop();
      obj[0].call(obj[1]);
    }
  }
}, false); 
  
window.addEventListener("load", function(){
  while (addOnLoad._queuedFuncs.length) {
    var obj = addOnLoad._queuedFuncs.pop()
    obj[0].call(obj[1]);
  }
}, false);
  
// kör function när sidan laddat eller direkt ifall den redan är laddad.
addOnLoad._queuedFuncs = [];
function addOnLoad(func, scope){
  scope = scope || window;
  if (document.readyState == "complete") {
    func.call(scope);
  } else {
    addOnLoad._queuedFuncs.push([func, scope]);
  }
};


// kör när DOM laddat klart eller direkt om den redan är laddad
function addOnDOMLoad(func, scope){
  scope = scope || window;
  var state = document.readyState
  if (state != 'complete'){
    addOnDOMLoad._queuedFuncs.push([func, scope]);
  } else {
    func.call(scope);
  }
}

addOnDOMLoad._queuedFuncs = [];
// kör när sidan laddas ur
function addOnUnLoad(func, scope){
  scope = scope || window;
  addOnUnLoad._queuedFuncs.push([func, scope]);
}

addOnUnLoad._queuedFuncs = [];
window.addEventListener("beforeunload", function(){
  while (addOnUnLoad._queuedFuncs.length) {
    var obj = addOnUnLoad._queuedFuncs.pop();
    obj[0].call(obj[1]);
  }
}, false);

function loadTextFile(url){
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, false); // fetch syncronously, used to get a few html templates, no big overhead
  xhr.send();
  return xhr.responseText;
}


function parseCssColor(input) {
  // thanks to http://stackoverflow.com/questions/11068240/what-is-the-most-efficient-way-to-parse-a-css-color-in-javascript
  var m;
  m = input.match(/^#([0-9a-f]{3})$/i);
  if(m) {
    m = m[1];
    // in three-character format, each value is multiplied by 0x11 to give an
    // even scale from 0x00 to 0xff
    return [
      parseInt(m.charAt(0),16)*0x11,
      parseInt(m.charAt(1),16)*0x11,
      parseInt(m.charAt(2),16)*0x11
    ];
  }
  
  m = input.match(/^#([0-9a-f]{6})$/i);
  if( m) {
    m = m[1];
    return [
      parseInt(m.substr(0,2),16),
      parseInt(m.substr(2,2),16),
      parseInt(m.substr(4,2),16)
    ];
  }
  
  m = input.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if( m) {
    return [m[1],m[2],m[3]];
  }
}

function compareCssColors(colorStr1, colorStr2) {
  c1 = parseCssColor(colorStr1);
  c2 = parseCssColor(colorStr2);
  
  if (c1[0] == c2[0] && 
      c1[1] == c2[1] && 
      c1[2] == c2[2])
  {
    return true;
  }
  return false;
}


function debug(str){
  addOnLoad(function(){
    var deb = document.getElementById("debug");
    deb.innerHTML += "<br/>\r\n" + str;
  });
}
    
function SerializeObject(obj, indentValue) {
  var hexDigits = "0123456789ABCDEF";
  function ToHex(d) {
    return hexDigits[d >> 8] + hexDigits[d & 0x0F];
  } 
  function Escape(string) {
    return string.replace(/[\x00-\x1F'\\]/g,
        function (x){
          if (x == "'" || x == "\\") return "\\" + x;
          return "\\x" + ToHex(String.charCodeAt(x, 0));
        })
  }

  var indent;
  if (indentValue == null) {
    indentValue = "";
    indent = ""; // or " "
  } else {
    indent = "\n";
  }
  return GetObject(obj, indent).replace(/,$/, "");

  function GetObject(obj, indent) {
    if (typeof obj == 'string') {
      return "'" + Escape(obj) + "',";
    }
    if (obj instanceof Array) {
      result = indent + "[";
      for (var i = 0; i < obj.length; i++) {
        result += indent + indentValue +
            GetObject(obj[i], indent + indentValue);
      }
      result += indent + "],";
      return result;
    }
    var result = "";
    if (typeof obj == 'object') {
      result += indent + "{";
      for (var property in obj) {
        result += indent + indentValue + "'" +
            Escape(property) + "' : " +
            GetObject(obj[property], indent + indentValue);
      }
      result += indent + "},";
    } else {
      result += obj + ",";
    }
    return result.replace(/,(\n?\s*)([\]}])/g, "$1$2");
  }
}
