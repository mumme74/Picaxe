/*
*	Kontrollogik för Mirror widget
*
*	Fredrik Johansson 2011-07-17
*
*/
  
  if(!document.namespaces.v){ 
    document.namespaces.add("v", "urn:schemas-microsoft-com:vml", "#default#VML");
    document.createStyleSheet().addRule("v\:shape", "behavior:url(#default#VML);display:inline-block;");
  }
      
  // håller reda på vilken av speglarna som ska ta emot data
  var mirrorGovenor = {
	  _registeredMirrors: [],
	  _selectedMirror: "",
	  keyPressed: function(evt){
		  var mirror;
		  for(var i = 0;i < mirrorGovenor._registeredMirrors.length; ++i){
			  mirror = mirrorGovenor._registeredMirrors[i];
			  if (mirror == mirrorGovenor._selectedMirror){
				  mirror.keyPressed(evt);
				  break;
			  }
		  }
	  },
	  register:function(newMirror){
		  var mirror;
		  for(var i = 0;i < this._registeredMirrors.length; ++i){
			  mirror = this._registeredMirrors[i];
			  if (mirror == newMirror){
				  debug("already registered");
				  return;
			  }
		  }
		  
		  this._registeredMirrors.push(newMirror);
	  },
	  setSelected: function(mirror){
		  this._selectedMirror = mirror;
	  }
	  
  }
  addOnLoad(function(){
  	 document.body.attachEvent("onkeydown", mirrorGovenor.keyPressed);
  });
  
  
  
  // constructor för Mirror
  function Mirror(picaxeController, parentNodeID, protocolID, rightOriented, scale, uniqueDomID){
	  this._id = uniqueDomID ? uniqueDomID : ("_" + parseInt(Math.random() * 10000));
	  this._protocolIdentity = protocolID;
	  this._picaxe = picaxeController || picaxe;
	  this._foldTimeout = {}; // object för closure lås
	  this.nodes = {}; // hållare för dynamiska noder
	  this._rightOriented = rightOriented || false;
	  this._scale = scale || 1;
	  
	  mirrorGovenor.register(this);
	
	  this.blinker = new MirrorBlinker(this);
	  this.heater = new MirrorHeater(this);
	  this.safeLight = new MirrorSafeLight(this);
	  this.mirrorFolder = new MirrorFolder(this);
	  this.position = new MirrorPosition(this);
	  this.thermometer = new MirrorThermometer(this);
	  
	  
	  //
	  addOnDOMLoad(function(){
		  this._parentNode = document.getElementById(parentNodeID);
		  // ladda HTML
		  var fso = new ActiveXObject("Scripting.FileSystemObject");
		  var file = fso.OpenTextFile("mirror_template.htm");
		  var vml = file.ReadAll();
		  file.Close();
		  
		  // prefixa id i VMLen med vårt unika id
		  vml = vml.replace(/\"\$(.*)\"/g,"\""+  this._id + "$1\"");
		  this._parentNode.innerHTML = vml;
		  
		  if (this._rightOriented){
			  var node = this._getNode("mirrorcommon");
			  var style = node.style;
			  style.position = "relative";
			  var width = node.currentStyle.width
			  width = width.substr(0, width.length - 2); // trimma "pt"
			  style.left = "-" + width + "px";
			  style.flip = "x";
	  	  }
	  	  
	  	  if(this._scale != 1){
		  	  var sizes =  String(this._getNode("mirrorcommon").coordsize).split(",");
		  	  this._getNode("mirrorcommon").coordsize = parseInt(sizes[0] / this._scale) + "," + parseInt(sizes[1] / this._scale);
		  	  with(this._parentNode.style){
			  	  height = 0;
			  	  width = 0;
		  	  }
		  	  this.thermometer._setScale(this._scale);
	  	  }
		  
		  
		  // events från noder till denna class
		  attachOnClick("blinker", this.blinker.toggle);
		  attachOnClick("safelight", this.safeLight.toggle);
		  attachOnClick("blinksymbol", this.blinker.toggle);
		  attachOnClick("heatsymbol", this.heater.toggle);
		  attachOnClick("heatwaves", this.heater.toggle);
		  attachOnClick("safelightsymbol", this.safeLight.toggle);
		  attachOnClick("foldarrow", this.mirrorFolder.toggle);
		  attachOnClick("up_arrow", this.position.up);
		  if (this._rightOriented){
			  attachOnClick("left_arrow", this.position.right);
			  attachOnClick("right_arrow", this.position.left);
		  } else {
			  attachOnClick("left_arrow", this.position.left);
			  attachOnClick("right_arrow", this.position.right);
	  	  }
		  attachOnClick("down_arrow", this.position.down);
		  attachOnClick("thermometer", this.thermometer.update);
		  attachOnClick("themometerupdate", this.thermometer.toggleAutoUpdate);
		  
  	  }, this);
  	  
  	  var _this = this;
  	  function attachOnClick(nodeId, evtFunc){
	  	  //debug(_this._id + nodeId + evtFunc);
		  var node = _this._getNode.call(_this, nodeId);
		  node.attachEvent("onclick", evtFunc);
  	  }
  	  
  }
  Mirror.prototype._getNode = function(nodeId){
	  return document.getElementById(this._id + nodeId);
  }
  Mirror.prototype.update = function(){
	  var _this = this;
	  addOnLoad(function(){
	  /*if (document.readyState != "complete"){
		  window.attachEvent("onload", function(){
			  // vänta på att allt ska ha lddats innan vi uppdaterar
			  setTimeout(function(){
			  	_this.update.call(_this);
		  	  }, 200);
		  });
	  } else {*/
		  // updatera värdet på positionspilarna när vi laddar sidan
	  	  this.position.update();
	  	  this.thermometer.update();
	  //}
  	}, this);
  }
  
  Mirror.prototype.keyPressed = function(evt){
	  switch(evt.keyCode){
		  case 32: // mellanslag
		  	// avbryt rörelsen
		  	this.position.cancelMove();
		  	break;
		  case 37: // pil vänster
		  	this.position.left();
		  	break;
		  case 38: // pil upp
		  	this.position.up();
		  	break;
		  case 39: // pil höger
		    this.position.right(true);
		  	break;
		  case 40: // pil ned
		    this.position.down(true);
		  	break;
		  default:
		  	return;
	  }
	  // hindra sidan från att scrolla
	  evt.cancelBubble = true;
	  evt.returnValue = false;
  }
 
  
  
  
  // hjälpclasser
  MirrorPosition = function(ownerMirror){
	  var x = 127; // hälften av 255
	  var y = 127;
	  
	  var maxValue = 235;
	  var minValue = 20;
	  
	  
	  // mittlägespositioner (från inline css i template filen)
	  var up    = {left:100, top:40,  width:50,  height:60};
	  var left  = {left:0,   top:100, width:100, height:40};
	  var right = {left:150, top:100, width:100, height:40};
	  var down  = {left:100, top:138, width:50,  height:50};
	  
	  // closure variabler
	  var me = this;
	  var timerX = {};
	  var timerY = {};
	  function updateTimerX(){
		  clearTimeout(timerX);
		  timerX = setTimeout(function(){ me.updateX(); }, 400);
	  }
	  function updateTimerY(){
		  clearTimeout(timerY);
		  timerY = setTimeout(function(){ me.updateY(); }, 400);
	  }
	  
	  this.updateX = function(){
		 /* ownerMirror._picaxe.sendAndRecieve(ownerMirror._protocolIdentity, function(newX){
			  if (newX && !isNaN(newX)){
				  me.setXPos(Number(newX));
			  }
		  }, "Xpos");*/
		  // event callback returnerar detta svaret nu istället
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "Xpos", "");
	  }
	  this.updateY = function(){
		  /*ownerMirror._picaxe.sendAndRecieve(ownerMirror._protocolIdentity, function(newY){
				if (newY && !isNaN(newY)){
				  newY = me.setYPos(Number(newY));
		      	}
	      }, "Ypos");*/
	      
		  // event callback returnerar detta svaret nu istället
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "Ypos", "");
	  }
	  this.update = function(){
		  me.updateX();
		  me.updateY();
	  }
	  this.up = function(){
		  //var pos = me.getXPos()
		  //me.setXPos(pos + 5);
		  updateTimerX();
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "moveX", 0);
	  }
  
	  this.down = function(){
		  //var pos = me.getXPos()
		  //me.setXPos(pos - 5);
		  updateTimerX();
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "moveX", 1);
	  }
	  
	  this.left = function(){
		  //var pos = me.getYPos()
		  //me.setYPos(pos + 5);
		  updateTimerY();
		  var dir = 1
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "moveY", 1);
	  }
	  
	 this.right = function(){
		  //var pos = me.getYPos()
		  //me.setYPos(pos - 5);
		  updateTimerY();
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "moveY", 0);
	  }
	  
	  this.cancelMove = function(){
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "cancel", 0);
	  }
	  this.getXPos = function(){ return x;}
	  this.getYPos = function(){ return y;}
	  this.setXPos = function(newX){
		  newX = Number(newX)
		  if (newX < minValue || newX > maxValue) { return;}
		  // enligt volvo så är X up och ned??
		  // kordinatsystemet är tydligen vridet 90 grader i göteborg
		  x = newX;
		  var upArrow = ownerMirror._getNode("up_arrow").style;
		  var downArrow = ownerMirror._getNode("down_arrow").style;
		  
		  var upScale = x/127; // faktor att multiplicera med
		  var downScale = (255 - x) / 127;
		  // up arrow
		  var height = parseInt(up.height * upScale)
		  upArrow.height = height + "px";
		  upArrow.top = (up.top + (up.height - height)) + "px";
		  //down arrow
		  height = parseInt(down.height * downScale)
		  downArrow.height = height + "px";
		  //up arrow
		  var width = parseInt(up.width * upScale);
		  upArrow.width = width + "px";
		  upArrow.left = (up.left + ((up.width - width) / 2)) + "px";
		  // down arrow
		  width = parseInt(down.width * downScale);
		  downArrow.width = width + "px";
		  downArrow.left = (down.left + ((down.width - width) / 2)) + "px";
	  }
	  
	  this.setYPos = function(newY){
		  newY = Number(newY);
		  if (newY < minValue || newY > maxValue) { return;}
		  // enligt volvo så är X up och ned??
		  // kordinatsystemet är tydligen vridet 90 grader i göteborg
		  y = newY;
		  
		  var leftArrow = ownerMirror._getNode("left_arrow").style;
		  var rightArrow = ownerMirror._getNode("right_arrow").style;
		  
		  var leftScale = (255 - y) / 127; // faktor att multiplicera med
		  var rightScale = y/127;
		  // left arrow
		  var width = parseInt(left.width * leftScale);
		  leftArrow.width = width + "px";
		  leftArrow.left = (left.left + (left.width - width)) + "px";
		  // right arrow
		  width = parseInt(right.width * rightScale);
		  rightArrow.width = width + "px";
		  // left arrow
		  var height = parseInt(up.height * leftScale);
		  leftArrow.height = height + "px";
		  leftArrow.top = (left.top + ((left.height - height) / 2)) + "px";
		  // right arrow
		  height = parseInt(down.height * rightScale);
		  rightArrow.height = height + "px";
		  rightArrow.top = (right.top + ((right.height - height) / 2)) + "px";
	  }
	  
	  // events från picaxekabeln till denna class
	  ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, "moveX", updateTimerX, me);
	  ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, "moveY", updateTimerY, me);
	  ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, "Xpos", me.setXPos, me);
	  ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, "Ypos", me.setYPos, me);
  }
  
  
  MirrorFolder = function(ownerMirror){
	  
	  var state = true;
	  var me = this;
	  var foldTimeout = {}; // object för closure ref
	  this.isFolded = function() { return !state; }
	  this.toggle = function(){
		me.setState(!state);  
	  	ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "fold", Number(state));
	  }
	  this.setState = function(newState){
		  state = newState;
		  var mirror = ownerMirror._getNode("foldingmirror");
		  
		  var angleIncrement = 2;
		  if (!state){
			  angleIncrement = -angleIncrement;
		  }
		  
		  // stoppa gammal animering
		  if (foldTimeout){
			  clearInterval(foldTimeout);
		  }
		  
		  foldTimeout = setInterval(function(){
			  	var rotation = mirror.style.rotation || 0;
			  	rotation += angleIncrement;
			  	if (rotation > 0) {
				  	clearInterval(foldTimeout);
				  	rotation = 0
				  	mirror = null; // rensa minne
				  	return;
			  	} else if (rotation < -80) {
				  	clearInterval(foldTimeout);
				  	rotation = -80;
				  	mirror = null; // rensa minne
				  	return;
			  	}
			  	
			  	mirror.style.rotation = rotation;
	      }, 50);
	  }
	  this.getState = function(){ return state;}
	  
	  // events från picaxekabeln till denna class
	  ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, "fold", me.setState, me);  
  }
 
  
  
  MirrorBlinker = function(ownerMirror){
	  
	  var state = false;
	  var me = this;
	  this.toggle = function (){
		  me.setState(!state);
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "blinker", Number(state));
  		}
  	  this.setState = function(newState){
	  	state = newState;
	    ownerMirror._getNode("blinklightbeam").style.visibility = state ? "visible" : "hidden";
	    ownerMirror._getNode("blinksymbolfield").fillcolor = state ? "#FFC321" : "white";
  	  }
  	  this.getState = function(){ return state; }
  	  
  	  // events från picaxekabeln till denna class
	  ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, "blinker", me.setState, me); 
  }
  
  MirrorSafeLight = function(ownerMirror) {
	  var state = false;
	  var me = this;
	  
	  this.toggle = function(){
		  me.setState(!state);
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "safeLight", Number(state)) ;
	  }
	  this.setState = function(newState){
		  state = newState;
		  ownerMirror._getNode("safelightbeam").style.visibility = state ? "visible" : "hidden";
		  ownerMirror._getNode("safelightsymbolfield1").fillcolor = state ? "#FFFFC1" : "white";
		  ownerMirror._getNode("safelightsymbolfield2").fillcolor = state ? "#FFFFC1" : "white";
	  }
	  this.getState = function(){ return state; }
	  
  	  // events från picaxekabeln till denna class
	  ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, "safeLight", me.setState, me);
  }
  
  MirrorHeater = function(ownerMirror){
	  var state = false;
	  var me = this;
  	  this.toggle = function(){
		  me.setState(!state);
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "defroster", Number(state));
	  }
	  this.setState = function(newState){
		  state = newState;
		  ownerMirror._getNode("heatsymbol").fillcolor = state ? "#FF796B" : "#7CC4FF";
	  }
	  
	  
  	  // events från picaxekabeln till denna class
	  ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, "defroster", me.setState, me);
  }
  
  MirrorThermometer = function(ownerMirror){
	  // denna funktion är på inget sätt exakt, det finns ingen kompensering för NTC motståndets olinjäritet
	  // vid 0  grader NTC=6318
	  // 	 5  grader NTC=4918
	  //     10 grader NTC=3857
	  // 	 15 grader NTC=3047
	  //	 20 grader NTC=2424
	  // 	 25 grader NTC=1841
	  //	 30 grader NTC=1384
	  // vi har ett 2,2k referensmotstånd nedan Ohms lag
	  
	  // 5v i 255 steg (8bitar AD-omvandlare)
	  // 	5/255=0,0196V per steg
	  // ex: 2200 ohm + 3857 ohm = 5057ohm
	  //    spänningsfallet över refmotståndet (plus till mätpunkt) blir
	  //    I = 5V/5,057k = 0,989mA
	  //	U = 0,989mA * 2,2k = 2,175V
	  //    värde=2,175/0,0196=110,96 avrundat 111
	  
	  var value = 115; // default värde
	  var refResistor = 2200; // 2.2kohm
	  var storedTemp = 12;
	  
	  
	  // closure ref
	  var timer = {};
	  var me = this;
	  this._setScale = function(scale){
		  // ändra skala på texten
		  var scale = parseInt(scale * 100);
		  ownerMirror._getNode("thermometer").style.fontSize = scale + "%";
	  }
	  this.update = function(){
		  /*ownerMirror._picaxe.sendAndRecieve(ownerMirror._protocolIdentity, function(newValue){
			  if (newValue && !isNaN(newValue)) {
				  me.setValue(Number(newValue));
			  }
		  }, "getTemp");*/
		  
		  // event callback returnerar detta svaret nu istället
		  ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, "getTemp", "");
	  }
	  
	  this.toggleAutoUpdate = function(){
		  clearInterval(timer);
		  var button = ownerMirror._getNode("themometerupdate");
		  if (button.fillcolor == "#999") {
			  timer = setInterval(me.update, 3000); // var 3dje sekund
			  button.fillcolor = "#CCC";
		  } else {
			  button.fillcolor = "#999";
		  }
	  }
	  this.getValue = function(){ return value; }
	  this.setValue = function(newValue){
		  value = Number(newValue);
		  var volt = value * 0.0196;
		  // refResistorn sitter plusmatad och vi mäter NTC spänningen, gör om till spänning över refResistor istället
		  var A = (5 - volt) / refResistor; // använd ohms lag
		  var ntc = volt / A;
		  // nu kommer det krångliga att omvandla till temp
		  // källa:http://en.wikipedia.org/wiki/Thermistor
		  // http://www.tdk.co.jp/tefe02/eb221_ntc_sum.pdf
		  // http://en.wikipedia.org/wiki/Natural_logarithm
		  // http://www.daycounter.com/Calculators/Steinhart-Hart-Thermistor-Calculator.phtml
		  // har räknat ut dess i förväg
		  var rInf = 0.004156235;
		  var beta = 3858.1;//4191.1;//4276.5; //3888.1;
		  var kelvin = beta / (Math.log(ntc / rInf));
		  var temp = kelvin - 273.15;
		  
		  temp = parseInt(temp); // gör om till heltal
		  storedTemp = temp;
		  //debug("temp=" +temp);
		  if (temp >= 12 && temp <= 32){
			  // visa bara dessa temperaturer
			  // 12 <-> 32
			  //  detta ger 20 steg fördelat på 100pixlar
			  // 100 / 20 = 5
			  var height = (32 - temp) * 5;
			  var scale = ownerMirror._getNode("thermometerscale").style;
			  scale.height = height;
		  }
		  
	  }
	  this.getTemp = function(){return storedTemp};
	  
	  
  	  // events från picaxekabeln till denna class
	  ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, "getTemp", me.setValue, me);
  }
  