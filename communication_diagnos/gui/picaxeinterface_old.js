/*
*	Denna fil hanterar interfacet mellan picaxe och en hta fil.
*	Eftersom den är tänkt att använda HTA och ActiveX så fungerar 
*	den enbart i internet explorers renderingsmotor.
*
*	author Fredrik Johansson
*/

			
var picaxe = {};
(function(){
	window.addEventListener("load", function() { 
		addOnLoad.documentIsLoaded = true;
		do {
			addOnLoad._queuedFuncs.pop().call(window);
		} while (addOnLoad._queuedFuncs.length);
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
	
	var netComm;
	function refreshNetcomm(){
		  
	  if (netComm && netComm.PortOpen) {
		// if opened, close
		netComm.PortOpen = false;
	  } else {
		try {
			netComm = new ActiveXObject("NETCommOCX.NETComm");
	  	} catch(e){
			alert("Windows kontrollen NETComm32.ocx är inte riktigt installerad " 
				 	+ " eller saknar de kontroller som den är beroende av (MSComm32.ocx).\n" 
				 	+ "felmeddelande:" + e.description);
		}
	  }
	  
	  netComm.Settings = picaxe.connectionSettings;
	  netComm.InputLen = 0; // read from start of buffer
	  netComm.InputMode = 0; // read as text
	  netComm.Handshaking = 0; // none
	  netComm.RThreshold = 1;
	  netComm.DTREnable = false;
	  netComm.RTSEnable = false;
	  var portNumber = picaxe.comport;
	  try {
		netComm.CommPort = portNumber;
		netComm.PortOpen = true;
	  } catch (e) {
		if (e.description == "Port already open") {
			alert("Com" + portNumber + " är låst av ett annat program, tex teminalfönstret i programming editor");
			return;
		} else if (e.description == "Invalid port number") {
			alert("Com" + portNumber + " har ingen hårdvara ansluten, prova en annan port");
			return;
		}
	  }
	}
	
	picaxe = {
		comportSelectId: picaxeSettings.comportSelectId || "", // ID på html select dropdown med comports val
		defaultComport: 0,
		comport: 0,
		connectionSettings: picaxeSettings.connectionSettings || "4800,N,8,2",
		
		init: function(){
	
			// find out which comport the programming cable is attached to
		  	var fso = new ActiveXObject("Scripting.FileSystemObject");
		  	var comport = 0;
		  	for (var i = 2; i < 11; i++){
		  		try {
		  			var com = fso.OpenTextFile("COM" + i + ":4800,n,8,1");
		  			com.Close();
		  			comport = i;
		  			break; // for loop
		  		} catch (e) { /* squelsh*/	}
		  	}
		  	
		  	addOnLoad(function(){
		  		if (picaxe.comportSelectId && document.getElementById(picaxe.comportSelectId)) {
		  			document.getElementById(picaxe.comportSelectId).value = comport;
				}
				
				if (picaxeSettings.logRootNode) {
					picaxe.log.setLogRootNode(picaxeSettings.logRootNode);
					picaxe.log.setActive(true);
				}
			});
			
			picaxe.defaultComport = comport;
			picaxe.comport = comport;
		 
			// initera activeXControllen
		    if (comport > 0) {
			    refreshNetcomm();
		    } 
		  
		    // städa upp
			window.addEventListener("onbeforeunload", function(){
			  if (netComm && netComm.PortOpen){
				  netComm.PortOpen = false;
			  }
			}. true);
		},
		
		setComport: function(comport) {
			this.comport = comport;
			this.refreshConnection();
		},
		
		refreshConnection: function(){
		  if (netComm && netComm.PortOpen) {
			// if opened, close
			netComm.PortOpen = false;
		  } else {
			try {
				netComm = new ActiveXObject("NETCommOCX.NETComm");
		  	} catch(e){
				alert("Windows kontrollen NETComm32.ocx är inte riktigt installerad " 
					 	+ " eller saknar de kontroller som den är beroende av (MSComm32.ocx).\n" 
					 	+ "felmeddelande:" + e.description);
			}
		  }
		  
		  netComm.Settings = picaxeSettings.connectionSettings;
		  netComm.InputLen = 0; // read from start of buffer
		  netComm.InputMode = 0; // read as text
		  netComm.Handshaking = 0; // none
		  netComm.RThreshold = 1;
		  netComm.DTREnable = false;
		  netComm.RTSEnable = false;
		  var portNumber = parseInt(this.comport || this.defaultComport);
		  try {
			netComm.CommPort = portNumber;
			netComm.PortOpen = true;
		  } catch (e) {
			if (e.description == "Port already open") {
				alert("Com" + portNumber + " är låst av ett annat program, tex teminalfönstret i programming editor");
				return;
			} else if (e.description == "Invalid port number") {
				alert("Com" + portNumber + " har ingen hårdvara ansluten, prova en annan port");
				return;
			}
		  }
		},
		
		updateInput: function(pinNumber, inputType) {
		  	var cmd = "i" + pinNumber + inputType;
		  	
		  	var response = this.talkToPicaxe(cmd);
		  	if (response.length > 0) { // filtrera bort skräp dvs 7=10mV$> blir 10mV
			  	if (response.substr(2,1) == "=") { // filtrera bort [pinnummer]= 
				  	response = response.substr(3);
			  	}
			  	if (response.substr(response.length - 6, 6) == "\r\n$>\r\n") { // filtrera bort prompten $>
				  	response = response.substr(0, response.length - 4);
			  	}
			  	response = response.replace("\\r\\n", "");
			}
		  	return response;
		},
		
		updateOutput: function(pinNumber, outputType, valueStr) {
		  	if (valueStr === "") {
			  	valueStr = 0;
		  	}
		  	var cmd = "u" + pinNumber + outputType;
		  	
			// konvertera till ASCII nummer (ascii char 0 -> till bokstaven som motsvarar 0 = null)
		  	var value = String.fromCharCode(parseInt(valueStr));
		  	if (outputType == "d") {
			  	value = valueStr; // digital output is either 1 or 0, can't handle 0-255
		  	}
		  	
		  	return this.talkToPicaxe(cmd, valueStr, value);
		},
		
		talkToPicaxe: function(cmd, valueStr, value){
		  	this.log.newRow(); 	
		  	this.log.sent(cmd);
		  	
			netComm.Output = cmd; // skriv kommando
			
			// receive
			var str = "";
			var endTime = new Date().getTime() + 900; // milliseconds from 1 jan 1970 (named epoch) + 900ms
			while (endTime >  new Date().getTime()) { // loop in 250 ms och listen on data from serial port
				str += netComm.InputData;
				
				if (str.substr(str.length - 2) == "\r\n") {
				
					// om svaret är ett frågetecken så vill picaxe ha ett värde
					if (str.substr(str.length - 3, 1) == "?") {
						//debug("inside")
						// log
			  			this.log.received(str);
				 		this.log.sent(valueStr);
						str = "";
						endTime += 900;
						netComm.Output = value;
						//debug("sent: "+ value.charCodeAt(0) + " "+ value + " value.length=" + value.length)
					} else if (str.substr(str.length - 4, 2) == "$>") {
						//debug("exit loop " + str.length)
						break; // exit while
					}
				}
			}
			 	
		 	// log the response
		  	this.log.received(str);
		  	
		  	// return response to our caller
		  	return str;
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