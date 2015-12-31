
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
