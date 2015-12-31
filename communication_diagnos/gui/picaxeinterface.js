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
	};
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
		document.getElementById("serverConnected").setAttribute("webConnected", true);
		debug("connected:" + evt); 
		
		webSocket._sendNext();
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
		webSocket._queue.splice(resp.id, 1);
		callb.call(window, resp.data);
	      }
	      webSocket._sendNext();
	    }
	}
	webSocket.init();
	
	picaxe = {
		comportSelectId: picaxeSettings.comportSelectId || "", // ID på html select dropdown med comports val
		defaultComport: 0,
		portSettings: {
		  port: 0,
		  baudrate: 9600,
		  xonxoff: false,
		  timeout: 0.025
		},
		
		init: function(){
	
		  // find out which comport the programming cable is attached to
		  webSocket.send("listSerialPorts", function(ports){
		    addOnLoad(function(){
		      if (picaxe.comportSelectId && document.getElementById(picaxe.comportSelectId)) {
			var selPort = document.getElementById(picaxe.comportSelectId); //.value = ports.default;
			for(var i = 0; i < ports.length;++i) {
			  var option = document.createElement("option");
			  option.setAttribute("value", ports[i][0]);
			  if (ports.default == i)
			     option.setAttribute("selected");
			  var txt = ports[i][1].match(/[^\/]+$/);
			  option.appendChild(document.createTextNode(txt));
			  selPort.appendChild(option);
			}
			
			setTimeout(function(){ picaxe.setComport(selPort.value); }, 10);
		      }
		
		      if (picaxeSettings.logRootNode) {
			picaxe.log.setLogRootNode(picaxeSettings.logRootNode);
			picaxe.log.setActive(true);
		      }
		      
		    });
		
		    picaxe.defaultComport = ports.default;
		    picaxe.portSettings.port = ports.default;
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
		    if (response.substr(response.length - 2) == "\r\n" || response.substr(response.length - 2) == "$>") {
		      // om svaret är ett frågetecken så vill picaxe ha ett värde
		      if (response.substr(response.length - 3, 1) == "?") {
			//debug("inside")
			// log
			picaxe.log.received(response);
			picaxe.log.sent(valueStr);
			webSocket.send(valueStr, function(response){
			  picaxe.log.received(response);
			  callback(response);
			});
			  
			//debug("sent: "+ value.charCodeAt(0) + " "+ value + " value.length=" + value.length)
		      
		      } else {
			//debug("exit loop " + str.length)
			response = response.replace(/[\r\n]/g, "");
			response = response.substr(0, response.length -2);
			    
			// log the response
			picaxe.log.received(response);
			    
			callback(response);
		      }
		    }
		  });
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
		      var date = new Date();
		      this._sentTd.innerHTML = "tid:" + date.getHours() + ":" + date.getMinutes() + ":" + 
			   date.getSeconds()+ ":" + date.getMilliseconds() + ", <b>" + 
			   text.replace(/\n/g, "\\r\\n").replace(/\r/g, "\\r") + "</b><br/>\r\n" + this._sentTd.innerHTML;
		  },
		  received: function(text) {
		    if (!this._active) return;
		      var date = new Date();
		      this._recievedTd.innerHTML = "tid:" + date.getHours() + ":" + date.getMinutes() + ":" + 
			    date.getSeconds()+ ":" + date.getMilliseconds() + ", <b>" + 
			    text.replace(/\n/g, "\\n").replace(/\r/g, "\\r") + "</b><br/>\n" + this._recievedTd.innerHTML;
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