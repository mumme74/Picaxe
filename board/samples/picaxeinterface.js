/*
*	Denna fil hanterar interfacet mellan picaxe och en hta fil.
*	Eftersom den är tänkt att använda HTA och ActiveX så fungerar 
*	den enbart i internet explorers renderingsmotor.
*
*	author Fredrik Johansson
*/

			
var picaxe = {};
(function(){
	
	var netComm;
	function refreshNetcomm(){	  
	  if (netComm && netComm.PortOpen) {
		// if opened, close
		netComm.PortOpen = false;
	  } else {
		netComm = document.createElement("object");
		netComm.classid = "clsid:53867031-6B4D-4F7D-B089-5DFEC731F5FA";
		netComm.id = "NetComm1";
		document.body.appendChild(netComm);
		
		netComm.attachEvent("OnComm", function(){ picaxe._recieveEvent.call(picaxe);});
		netComm.CommPort = 0;
		
		if (typeof netComm.CommPort == 'undefined') {
			alert("Windows kontrollen NETComm32.ocx är inte riktigt installerad " 
				 	+ " eller saknar de kontroller som den är beroende av (MSComm32.ocx).\n");
		}
		
		
		/*
		try {
			netComm = new ActiveXObject("NETCommOCX.NETComm");
	  	} catch(e){
		}*/
	  }
	  
	  netComm.Settings = picaxe.connectionSettings;
	  netComm.InputLen = 0; // read from start of buffer
	  netComm.InputMode = 0; // read as text
	  netComm.Handshaking = picaxe.handshaking; //0; // XonXoff verkar vara för snabb för vår lilla picaxe  none// 
	  netComm.RThreshold = 1;             //Enable Receive Events
	  netComm.DTREnable = false;
	  netComm.RTSEnable = false;
	  netComm.EOFEnable = true;
	  netComm.EOFChar   = picaxe.EOFChar;
	  netComm.SThreshold = 1; 
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
		connectionSettings: picaxeSettings.connectionSettings || "4800,N,8,1",
		handshaking: picaxeSettings.handshaking || 0, // låta picaxe bestämma när den är klar för att ta emot 
													  // genom att sända sertxd(17) för ta emot och sertxd(19) 
													  // för att sluta ta emot (i picaxe koden)
		EOFChar: picaxeSettings.EOFChar || "\n",
		_protocol: picaxeSettings.protocolFile || null,
		_msBetweenCommands: picaxeSettings.msBetweenCommands || 10,
		_buffer: "",
		_responseCallback: null,
		_commandQueue: [],
		_eventListeners: {},
		_outbuffer: "",
		
		init: function(){
	
			// ladda protokoll
			if (picaxe._protocol !== null) {
				picaxe.loadProtocol(picaxe._protocol);
			}
		
		  	if (this.handshaking){
			  	// vänta på att picaxe svarar med ett sertxd(17)
			  	// och stänga av sändningen med ett sertxd(19)
			  	this._xOn = false;
		  	} else {
			  	// alltid sända med en gång
		  		this._xOn = true;
	  		}
		  	
		  	addOnDOMLoad(function(){
			  	// find out which comport the programming cable is attached to
			  	var comport = 0;
			    var objWMIService = GetObject("winmgmts:\\\\.\\root\\CIMV2");
			    var colItems = objWMIService.ExecQuery("SELECT * FROM Win32_PnPEntity WHERE  DeviceID LIKE 'FTDIBUS%'" +
			    										" AND Description LIKE '%PICAXE%'", "WQL", 48);
			
			    var enumItems = new Enumerator(colItems);
			    if (!enumItems.atEnd()){
				    var str = enumItems.item().Caption;
				    var re = /\(COM([0-9]{1,})\)/;
				    str.replace(re, function(match, number){ comport = number; });
				    if (enumItems.item().Status.toUpperCase() != "OK") {
					    alert("Programmeringskabeln finns ansluten till datorn, men den är inte färdig använda.\r\n" +
					    		"Starta programming editor för att initialisera den");
				    }
			    }
			    
		  		if (picaxe.comportSelectId && document.getElementById(picaxe.comportSelectId)) {
		  			document.getElementById(picaxe.comportSelectId).value = comport;
				}
				
				if (picaxeSettings.logRootNode) {
					picaxe.log.setLogRootNode(picaxeSettings.logRootNode);
					picaxe.log.setActive(true);
				}
				
				picaxe.defaultComport = comport;
				picaxe.comport = comport;
				
				// initera activeXControllen
			    if (comport > 0) {
				    refreshNetcomm();
			    } 
			    
			    // städa upp
				window.attachEvent("onbeforeunload", function(){
				  if (netComm && netComm.PortOpen){
					  netComm.PortOpen = false;
				  }
				});
			});
			
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
				
				if (!this._eventListeners[evt]) {
					this._eventListeners[evt] = [];
				}
				this._eventListeners[evt].push({'callback': callback, 'scope': scope});
			}, this);
		},
		
		_recieveEvent: function(){
			if (netComm.CommEvent == 2) {
				this._buffer += netComm.InputData;
								
				
				var newLine = this._buffer.indexOf(this.EOFChar);
				if (newLine > -1){
					var newResponse = this._buffer.slice(0, newLine);
					this._buffer = this._buffer.substr(newLine +1)
					//debug(newResponse);
					
					// en root event
					this.messenger(newResponse + this.EOFChar);var tmp =[];
					
					
					// debug
				/*	if (newResponse.substr(0,17) == "sending function:"){
						var numbers = newResponse.substr(17).split('=')[0].split(',');
						debug(numbers.join(','));
						var str = "sending function:";
						for(var i = 0; i < numbers.length; i++){
							var binary = Number(numbers[i]).toString(2);
							// padda med 0or
							while (binary.length < 8){
								binary = "0" + binary
							}
							binary = binary.split('');
							binary = binary.reverse();
							
							str += " " + binary.join('').toString();
						}
						
						debug(str+ " "+newResponse);
					}else{
						for (var i = 0; i < newResponse.length; i++){
							tmp[i] = newResponse.charCodeAt(i);
						}				
						debug("recieve " + newResponse + " ->" + tmp.join(','));
					}
				*/
				// end debug
				
				
				
						
					if (this._responseCallback){
		  				this.log.received(newResponse + this.EOFChar);
						newResponse = newResponse.replace(/\r$/, "");
						
						// svar till responseCallback
						this._responseCallback(newResponse);
						this._responseCallback = null;
						return;
					} else {
						// sänd till de som lystnar på detta event
						this.log.newRow();
		  				this.log.received(newResponse + this.EOFChar);
						newResponse = newResponse.replace(/\r$/, "");
						
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
						if (this._eventListeners && this._eventListeners[newResponse]) {
							var listeners = this._eventListeners[newResponse];
							for (var i = 0; i < listeners.length; i++){
								var obj = listeners[i];
								obj.callback.call((obj.scope || window), value);
							}
						}
					}
					
					if (this._buffer.length){
						// ta hand om mer commando ifall det finns några
						this._recieveEvent();
					} else {
					}
				}
			} else if (netComm.CommEvent > 1000){
				alert("Kommunikationsfel: " + netComm.CommEvent + "\r\nOm detta sker när du precis startat programmet eller satt på strömmen" + 
					  "till picaxe så kan du bortse från meddelandet\r\n\r\nMer info:http://www.comm32.com/commevent.html");
			} else if (netComm.CommEvent == 1){
				// send event
				// beta av kommandokön
				this._doCommandQueue();
			}
		},
		
		// en funktions som man kan byta ut så att man får meddelat vad picaxe svarar
		messenger: function(value){},
		
		setComport: function(comport) {
			this.comport = comport;
			refreshNetcomm();
		},
		
		setConnectionSettings: function(settings){
			this.connectionSettings = settings;
			refreshNetcomm();
		},
		
		setHandshaking: function(handshake){
			debug(handshake);
			this.handshaking = handshake ? 1 : 0;
			refreshNetcomm();
		},
		
		_doCommandQueue: function(){
			// ett kommando i taget, dels så kortet hinner med dels så att vi hinner få svar innan nästa kommando
			var timer = this._responseCallbackTimer || new Date().getTime();
			if ((this._responseCallback &&
				 timer >  new Date().getTime() - 1000) ||
				 (this._doCommandQueue.lastCommand > (new Date().getTime() - this._msBetweenCommands))
			){
				// vänta tills vi fått svar på förra frågan eller gå ändå efter 1s
				// debug("bail out: " + timer + " " + new Date().getTime() + " " + (timer <  new Date().getTime() - 1000));
				if (this._doCommandQueue.timeout){
					clearTimeout(this._doCommandQueue.timeout);
				}
				
				var _this = this;
				this._doCommandQueue.timeout = setTimeout(function(){ _this._doCommandQueue.call(_this);}, 200);
				
				return;
			}
			
			if (this._doCommandQueue.timeout){
				clearTimeout(this._doCommandQueue.timeout);
			}
			
			// vänta en lite stund mellan varje kommando så kortet hinner med
			if (this._commandQueue.length){
				var obj = this._commandQueue.shift();
				if (obj.callback){
					this._sendAndRecieve(obj.cmd, obj.callback);
				} else {
					this._send(obj.cmd);
				}
			}
			// nästa kommando om 10ms
			if (this._commandQueue.length){
				var _this = this;
				this._doCommandQueue.timeout = setTimeout(function(){ _this._doCommandQueue.call(_this);}, this._msBetweenCommands);
			}
		},
		
		_sendAndRecieve: function(cmd, callback){
			this._responseCallback = callback;
		  	this._responseCallbackTimer = new Date().getTime()
		  	this._send(cmd);
		},
		
		_send: function(cmd){
			this.log.newRow();
			this.log.sent(cmd);
			//debug("sänd direkt:"+cmd.length+ " '" + cmd + "'" )
			if (this.handshaking){
				// när vi använder handshaking med xon xoff så verkar det behövas sändas en null char först?
				// är nog en bug i picaxe, prefixa med en null char
				cmd = String.fromCharCode(0) + cmd;
			}
			
			try {
				netComm.Output = cmd;
			} catch(e) {
				alert("Det gick ej sända meddelandet till Picaxe kortet. \r\n" +
					"Har du pluggat i programmeringskabeln och valt rätt COM port?\r\n"+
					"Felmeddelande: " + e.description);
			}
		},
		
		// använd när du vill prata driekt med picaxe, ej genom protokollet och du inte förväntar dig ett svar från picaxe
		commandToPicaxe: function(cmd){
			
			
			// vi sänder inte direkt ifall något ligger och väntar på ett svar
			this._commandQueue.push({cmd: cmd});
			this._doCommandQueue();
		},
		
		// prata direkt, ej via protokoll, svar skickas som första argument till callback
		talkToPicaxe: function(cmd, callback){
			// vi sänder inte direkt ifall något ligger och väntar på ett svar
			this._commandQueue.push({cmd: cmd, callback: callback});
			this._doCommandQueue();
		},
		
		// använd när du vill prata genom protokollet, svar ges som första argument till callback
		sendAndRecieve: function(protocolId, callback, cmd, value){
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
			value = (value === undefined) ? "" : value;
			// trimma bort identifieraren för svaret ie. G0=90->90
	  		this.talkToPicaxe(sendCmd + value + "\n", function(value){
		  		value = value.substr(sendCmd.length + 1);
		  		callback(value);
	  		});
	  		
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
		 	var fso = new ActiveXObject("Scripting.FileSystemObject");
			var file = fso.OpenTextFile(protocolFile);
			var protocol = file.ReadAll();
			file.Close();
			
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
	
	//addOnDOMLoad(picaxe.init, picaxe);
	picaxe.init();
})();