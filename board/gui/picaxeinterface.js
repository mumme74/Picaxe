/*
*	Denna fil hanterar interfacet mellan picaxe och en html5 sida.
*
*	author Fredrik Johansson
*/

var WS_PORT = 8080;
var WS_URL = location.hostname; //"localhost";
var picaxe = {};
(function(){
  
  window.addEventListener("load", function() { 
    addOnLoad.documentIsLoaded = true;
    while (addOnLoad._queuedFuncs.length){
      addOnLoad._queuedFuncs.pop().call(window);
    }
  }, true);



  // kör function när sidan laddat eller direkt ifall den redan är laddad.
  function addOnLoad(func){
    if (addOnLoad.documentIsLoaded) {
      func.call(window);
    } else {
      addOnLoad._queuedFuncs.push(func);
    }
  }
  addOnLoad.documentIsLoaded = false;
  addOnLoad._queuedFuncs = [];

  var webSocket = {
    _socket: null,
    _queue: [],
    _queueId: 0,
    _sendIndexes: [],
    init: function(){
      if (this._socket && this._socket.readyState >= 1) {
        // if opened, close
        this._socket.close();
      } 
      this._socket = new WebSocket("ws://" + WS_URL + ":" + WS_PORT);
      this._socket.onopen = function(evt) {
        addOnDOMLoad(function(){
          document.getElementById("serverConnected").setAttribute("webConnected", true);
          debug("connected:" + evt); 
      
          webSocket._sendNext();
        });
      };
      this._socket.onclose = function(evt) { 
        document.getElementById("serverConnected").removeAttribute("webConnected");
        debug("disconnected:" + evt); 
      };
      this._socket.onmessage = webSocket._recieved;
      this._socket.onerror = function(evt) { 
        debug("error:" + evt);
      };
    },
    _sendNext: function(){
      // send any stored _sendCmds
      if (webSocket._sendIndexes.length) {
        webSocket._socket.send(webSocket._queue[webSocket._sendIndexes.shift()].cmd);
      }
    },
    // sends to webserver, calls calback with result when ite recieves
    send: function(sendStr, callback, args){
      var jsonObj = {"id":++webSocket._queueId, "cmd": sendStr };
      if (args)
        jsonObj['args'] = args
        var jsonStr = JSON.stringify(jsonObj);
        webSocket._queue[webSocket._queueId] = {cmd:jsonStr, callback: callback};
        webSocket._sendIndexes.push(webSocket._queueId);
        if (webSocket._socket.readyState == 1 && webSocket._sendIndexes.length == 1){
          // send the call imidiatly as it is already connected and we only have this cmmd stored in queue
          webSocket._sendNext();
        } 
      },
      // calls the correct callback based on the callId returend from websocket server
      _recieved: function(evt){
        var resp = JSON.parse(evt.data);
        if (resp.id in webSocket._queue) {
          var callb = webSocket._queue[resp.id].callback;
          if (callb){
            webSocket._queue.splice(resp.id, 1);
            callb.call(window, resp.data);
          }
        } else {
          // its a async message from a board event
          picaxe._recievedEvent(resp);
        }
        webSocket._sendNext();
      }
  }
  webSocket.init();

  picaxe = {
    cleanResponse: true,
    comportSelectId: picaxeSettings.comportSelectId || "", // ID på html select dropdown med comports val
    EOFChar: picaxeSettings.EOFChar || "\n",
    _protocol: picaxeSettings.protocolFile || null,
    defaultComport: 0,
    _widgetEvents: {},
    portSettings: {
      port: 0,
      baudrate: 9600,
      xonxoff: false,
      timeout: 0.025
    },

    init: function(){
      // ladda protokoll
      if (picaxe._protocol !== null) {
        picaxe.loadProtocol(picaxe._protocol);
      }
      // find out which comport the programming cable is attached to
      webSocket.send("listSerialPorts", function(respObj){
        addOnLoad(function(){
          if (picaxe.comportSelectId && document.getElementById(picaxe.comportSelectId)) {
            var selPort = document.getElementById(picaxe.comportSelectId); //.value = ports.default;
            for(var i = 0; i < respObj.ports.length;++i) {
              var option = document.createElement("option");
              option.setAttribute("value", respObj.ports[i][0]);
              if (respObj.default == i)
                option.setAttribute("selected", true);
            
              var txt = respObj.ports[i][1].match(/[^\/]+$/);
              option.appendChild(document.createTextNode(txt));
              selPort.appendChild(option);
            }
          
            setTimeout(function(){ 
              if (selPort.value) {
                picaxe.setComport(selPort.value);
              }
            }, 10);
          }

          if (picaxeSettings.logRootNode) {
            picaxe.log.setLogRootNode(picaxeSettings.logRootNode);
            picaxe.log.setActive(true);
          } 
        });
  
       // picaxe.defaultComport = ports.default;
       // picaxe.portSettings.port = ports.default;
      });

    },

    setComport: function(comport) {
      picaxe.portSettings.port = comport;
      webSocket.send("setSerialPort", function(data){
        if (data)
          document.getElementById("serverConnected").setAttribute("picaxeConnected", true);
	else
          document.getElementById("serverConnected").removeAttribute("picaxeConnected");
      }, picaxe.portSettings);
    },
 
    setHandshaking: function(state){
      picaxe.portSettings.xonxoff = state;
      picaxe.setComport(picaxe.portSettings.port);
    },
 
    setBaud: function(baud){
      picaxe.portSettings.baudrate = parseInt(baud);
      picaxe.setComport(picaxe.portSettings.port);
    },

    updateInput: function(pinNumber, callback, inputType) {
      var cmd = "i" + pinNumber + inputType;
      
      this.talkToPicaxe(cmd, function(response){
        if (response.length > 0) { // filtrera bort skräp dvs 7=10mV$> blir 10mV
          if (response.substr(2,1) == "=") { // filtrera bort [pinnummer]= 
            response = response.substr(3);
          }
          
          if (response.substr(response.length - 6, 6) == "\r\n$>\r\n") { // filtrera bort prompten $>
            response = response.substr(0, response.length - 4);
          }
          
          response = response.replace("\\r\\n", "");
        }

        callback(response);
      });
    },

    updateOutput: function(pinNumber, callback, outputType, valueStr) {
      if (valueStr === "") {
        valueStr = 0;
      }
      var cmd = "u" + pinNumber + outputType;

      // konvertera till ASCII nummer (ascii char 0 -> till bokstaven som motsvarar 0 = null)
      var value = String.fromCharCode(parseInt(valueStr));
      if (outputType == "d") {
        value = valueStr; // digital output is either 1 or 0, can't handle 0-255
      }

      return this.talkToPicaxe(cmd, callback, valueStr, value);
    },

    talkToPicaxe: function(cmd, callback, valueStr, value){
      this.log.newRow(); 	
      this.log.sent(cmd);

      webSocket.send(cmd, function(response){// skriv kommando, hantera svaret asynkront
        if (!picaxe.cleanResponse || response.substr(response.length - 2) == "\r\n" || response.substr(response.length - 2) == "$>") {
          // om svaret är ett frågetecken så vill picaxe ha ett värde
          if (response.substr(response.length - 3, 1) == "?") {
            // log
            picaxe.log.received(response);
            picaxe.log.sent(valueStr);
            webSocket.send(valueStr, function(response){
              picaxe.log.received(response);
              callback(response);
            });
              
          } else {
            if (picaxe.cleanResponse) {
              response = response.replace(/[\r\n]/g, "");
              response = response.substr(0, response.length -2);
            }
    
            // log the response
            picaxe.log.received(response);
            
            callback(response);
          }
        }
      });
    },
 
    commandToPicaxe: function(cmd){
      this.log.newRow();       
      this.log.sent(cmd);

      webSocket.send(cmd);
    },
 
    // sätter upp ett event system som lystnar efter meddelanden
    // ie: picaxe.connectTo("safeLight", this.setLight, this)
    connectTo: function(protocolId, evtStr, callback, scope){
      addOnDOMLoad(function(){
        var cls = this._protocol[protocolId];
        if (!cls) {
          debug(protocolId + " finns inte som huvudklass i protokollet");
          return;
        }
        var evt = cls[evtStr];
        if (!evt) {
          debug(evtStr + " finns inte med bland " + protocolId + " i protokollet");
          return;
        }
                               
        if (!this._widgetEvents[evt]) {
          this._widgetEvents[evt] = [];
        }
        this._widgetEvents[evt].push({'callback': callback, 'scope': scope});
      }, this);
    },
 
    _eventListeners: [],
    _recievedEvent: function(respObj){
       // log the response
      if ('data' in respObj) {
        picaxe.log.received(respObj.data);
        for(var i = 0; i < this._eventListeners.length; ++i){
          this._eventListeners[i](respObj.data);
        }
        
        // send to our widgets athat are listening
        var newResponse = respObj.data.replace(/\r\n$/, "");
                                           
        var value;
        var idx = newResponse.indexOf("=", 1);
        if (idx > -1){
          // är svar på en förfrågan ([kommando]=[värde], ie. G2=122)
          value = newResponse.substr(idx + 1);
          newResponse = newResponse.substr(0, idx);
        } else {
          // är ett kommando,värde som bokstav 2 ([kommando][värde], ie. T1)
          value = newResponse.substr(1);
          newResponse = newResponse.substr(0, 1);
        }
                                                
        if (!isNaN(value)){
          value = Number(value);
         }
                                                
        // skicka till våra eventsListeners
        if (this._widgetEvents && this._widgetEvents[newResponse]) {
          var listeners = this._widgetEvents[newResponse];
          for (var i = 0; i < listeners.length; i++){
            var obj = listeners[i];
            obj.callback.call((obj.scope || window), value);                                                       
          }
        }
      }
    },
 
    addRecieveListener: function(func){
      this._eventListeners.push(func);
    },
    // använd när du vill prata genom protokollet
    sendCommand: function(protocolId, cmd, value){
      var mainClass = this._protocol[protocolId];
      if (!mainClass) {
        debug(protocolId + " finns inte som huvudklass i protokollet");
        return;
      }
      var sendCmd = mainClass[cmd];
        if (!sendCmd){
          debug(cmd + " finns inte med protokollet för " + protocolId);
          return;
        }
        value = value === undefined ? "" : value;
        this.commandToPicaxe(sendCmd + value + "\n");
    },
 
    loadProtocol: function(protocolFile){
      var protocol = loadTextFile(protocolFile);
                        
      try {
        eval("var protocolEvaled = " + protocol + ";");
      } catch (e) {
        alert("Protokollfilen har fel i sig, den gick ej att tolka\r\n\r\n" + e.description);
      }
      this._protocol = protocolEvaled;
    },

    log: {
      _logNode: null,
      _active: false,
      _sentTd: null,
      _receivedTd: null,
      _logTr: null,
      newRow: function(){
        if (!this._active) return;
        var tr = document.createElement("tr");
        this._sentTd = document.createElement("td");
        this._recievedTd = document.createElement("td");
        tr.appendChild(this._sentTd);
        tr.appendChild(this._recievedTd);
  
        if (!this._logTr) {
          this._logNode.appendChild(tr);
        } else {
          this._logNode.insertBefore(tr, this._logTr);
        }

        this._logTr = tr;
  
        // lagra endast 150 rader bakåt
        if (this._logNode.childNodes.length > 150) {
          this._logNode.removeChild(this._logNode.lastChild);
        }
      },
      sent: function(text) {
        if (!this._active) return;
        if (!this._sentTd) this.newRow();
        var date = new Date();
        this._sentTd.innerHTML = "tid:" + date.getHours() + ":" + date.getMinutes() + ":" + 
                                  date.getSeconds()+ ":" + date.getMilliseconds() + ", <b>" + 
                                  text.replace(/\n/g, "\\r\\n").replace(/\r/g, "\\r") + "</b><br/>\r\n" +
                                  this._sentTd.innerHTML;
      },
      received: function(text) {
        if (!this._active) return;
        if (!this._receivedTd) this.newRow();
        var date = new Date();
        this._recievedTd.innerHTML = "tid:" + date.getHours() + ":" + date.getMinutes() + ":" + 
                                      date.getSeconds()+ ":" + date.getMilliseconds() + ", <b>" + 
                                      text.replace(/\n/g, "\\n").replace(/\r/g, "\\r") + "</b><br/>\n" +
                                      this._recievedTd.innerHTML;
      },
      setActive: function(active) {
        var _this = this;
        addOnLoad(function(){
          if (_this._logNode) {
            _this._active = active;
          }
        });
     
        if (active && !this._active) {
          this._pendingActive = true;
        } else {
          this._pendingActive = null;
        }
      },
      setLogRootNode: function(node) {
        var _this = this;
        function createTable(root) {
          root.innerHTML = "<table width=\"100%\" border=\"1\">\n\r" +
                           " <thead>\n\r"+
                           "	<tr>\n\r"+
                           "     <td>Skickat till picaxe</td>\n\r"+
                           "     <td>Mottaget från picaxe</td>\n\r"+
                           "   </tr>\n\r" +
                           " </thead>\n\r"+
                           " <tbody id=\"picaxe.logTBody\">\n\r"+
                           " </tbody>\n\r"+
                           "</table>";  
        }
          
        if (typeof node == 'string') {
          // id på noden
          addOnLoad(function(){
            var n = document.getElementById(node);
            createTable(n);
            _this._logNode = document.getElementById("picaxe.logTBody");
            if (_this._logNode && _this._pendingActive) {
              _this.setActive(true);
            }
          });
        } else {
          // noderef
          createTable(node);
          this._logNode = document.getElementById("picaxe.logTBody");
        } 
      }
    }
  };
  
  picaxe.init();
})();