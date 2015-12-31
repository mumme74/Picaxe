/*
*	Kontrollogik för FrontLamp widget
*
*	Fredrik Johansson 2011-07-17
*
*/
  
  if(!document.namespaces.v){ 
    document.namespaces.add("v", "urn:schemas-microsoft-com:vml", "#default#VML");
    document.createStyleSheet().addRule("v\:shape", "behavior:url(#default#VML);display:inline-block;");
  }
      
  
  
  
  // constructor för FrontLamp
  function FrontLamp(picaxeController, parentNodeID, protocolID, rightOriented, scale, uniqueDomID){
	  this._id = uniqueDomID ? uniqueDomID : ("_" + parseInt(Math.random() * 10000));
	  this._protocolIdentity = protocolID;
	  this._picaxe = picaxeController || picaxe;
	  this.nodes = {}; // hållare för dynamiska noder
	  this._rightOriented = rightOriented || false;
	  this._scale = scale || 1;
	  
	
	  this.blinker = new FrontLampBlinker(this);
	  this.parkLight = new FrontLampParkLight(this);
	  this.highLight = new FrontLampHighBeam(this);
	  this.lowLight = new FrontLampLowBeam(this);
	  this.slider = new FrontLampHightAdjuster(this);
	  
	  
	  //
	  addOnDOMLoad(function(){
		  this._parentNode = document.getElementById(parentNodeID);
		  // ladda HTML
		  var fso = new ActiveXObject("Scripting.FileSystemObject");
		  var file = fso.OpenTextFile("frontlamp_template.htm");
		  var vml = file.ReadAll();
		  file.Close();
		  
		  // prefixa id i VMLen med vårt unika id
		  vml = vml.replace(/\"\$(.*)\"/g,"\""+  this._id + "$1\"");
		  this._parentNode.innerHTML = vml;
		  
		  if (this._rightOriented){
			  var node = this._getNode("frontlampcommon");
			  var style = node.style;
			  style.position = "relative";
			  var width = node.currentStyle.width
			  width = width.substr(0, width.length - 2); // trimma "pt"
			  style.left = "-" + width + "px";
			  style.flip = "x";
	  	  }
	  	  
	  	  if(this.scale != 1){
		  	  var sizes =  String(this._getNode("frontlampcommon").coordsize).split(",");
		  	  this._getNode("frontlampcommon").coordsize = parseInt(sizes[0] / this._scale) + "," + parseInt(sizes[1] / this._scale);
		  	  with(this._parentNode.style){
			  	  height = 0;
			  	  width = 0;
		  	  }
	  	  }
		  
		  
		  // events från noder till denna class
		  attachOnClick("blinker", this.blinker.toggle);
		  attachOnClick("parklight", this.parkLight.toggle);
		  attachOnClick("highlight", this.highLight.toggle);
		  attachOnClick("lowlight", this.lowLight.toggle);
		  
  	  }, this);
  	  
  	  var _this = this;
  	  function attachOnClick(nodeId, evtFunc){
	  	  //debug(_this._id + nodeId + evtFunc);
		  var node = _this._getNode.call(_this, nodeId);
		  node.attachEvent("onclick", evtFunc);
  	  }
  	  
  }
  FrontLamp.prototype._getNode = function(nodeId){
	  return document.getElementById(this._id + nodeId);
  }
  
 
 
  
  
  FrontLampBlinker = function(ownerFrontLamp){
	  var protocolKey = "blinker";
	  var state = false;
	  var me = this;
	  this.toggle = function (){
		  me.setState(!state);
		  ownerFrontLamp._picaxe.sendCommand(ownerFrontLamp._protocolIdentity, protocolKey, Number(state));
  		}
  	  this.setState = function(newState){
	  	state = newState;
	    ownerFrontLamp._getNode("blinklightbeam").style.visibility = state ? "visible" : "hidden";
	    ownerFrontLamp._getNode("blinker").fillcolor = state ? "#FFC321" : "#FFF1B7";
  	  }
  	  this.getState = function(){ return state; }
  	  
  	  // events från picaxekabeln till denna class
	  ownerFrontLamp._picaxe.connectTo(ownerFrontLamp._protocolIdentity, protocolKey, me.setState, me); 
  }
  
  
  FrontLampParkLight = function(ownerFrontLamp) {
	  var state = false;
	  var me = this;
	  var protocolKey = "parkLight";
	  
	  this.toggle = function(){
		  me.setState(!state);
		  ownerFrontLamp._picaxe.sendCommand(ownerFrontLamp._protocolIdentity, protocolKey, Number(state)) ;
	  }
	  this.setState = function(newState){
		  state = newState;
		  ownerFrontLamp._getNode("parklightbeam").style.visibility = state ? "visible" : "hidden";
		  ownerFrontLamp._getNode("parklight").fillcolor = state ? "#FFFFE0" : "#FFF";
	  }
	  this.getState = function(){ return state; }
	  
  	  // events från picaxekabeln till denna class
	  ownerFrontLamp._picaxe.connectTo(ownerFrontLamp._protocolIdentity, protocolKey, me.setState, me);
  }
  
  FrontLampHighBeam = function(ownerFrontLamp) {
	  var state = false;
	  var me = this;
	  
	  var protocolKey = "highBeam";
	  this.toggle = function(){
		  me.setState(!state);
		  ownerFrontLamp._picaxe.sendCommand(ownerFrontLamp._protocolIdentity, protocolKey, Number(state)) ;
	  }
	  this.setState = function(newState){
		  state = newState;
		  ownerFrontLamp._getNode("highlightbeam").style.visibility = state ? "visible" : "hidden";
		  ownerFrontLamp._getNode("highlight").fillcolor = state ? "#E1FFE8" : "#FFFFFF";
	  }
	  this.getState = function(){ return state; }
	  
  	  // events från picaxekabeln till denna class
	  ownerFrontLamp._picaxe.connectTo(ownerFrontLamp._protocolIdentity, protocolKey, me.setState, me);
  }
  

  
  FrontLampLowBeam = function(ownerFrontLamp) {
	  var state = false;
	  var me = this;
	  var protocolKey = "lowBeam";
	  
	  this.toggle = function(){
		  me.setState(!state);
		  ownerFrontLamp._picaxe.sendCommand(ownerFrontLamp._protocolIdentity, protocolKey, Number(state)) ;
	  }
	  this.setState = function(newState){
		  state = newState;
		  ownerFrontLamp._getNode("lowlightbeam").style.visibility = state ? "visible" : "hidden";
		  ownerFrontLamp._getNode("lowlight").fillcolor = state ? "#F1FFF8" : "#FFFFFF";
	  }
	  this.getState = function(){ return state; }
	  
  	  // events från picaxekabeln till denna class
	  ownerFrontLamp._picaxe.connectTo(ownerFrontLamp._protocolIdentity, protocolKey, me.setState, me);
  }
  
  FrontLampHightAdjuster = function(ownerFrontLamp) {
	  var value = 50;
	  var me = this;
	  var protocolKey = "angle";
	  var slider = {};
	  var e = {y:0, isMoving: false};
	  var maxY = 70;
	  var minY = 5;
	  
	  // stoppa select på med musen
	  document.attachEvent("onselectstart", function(evt){ evt.returnValue = false; });
	  
	  function sliderDragged(){
		  value = slider.style.top;
		  // trimma bort "px" 
		  // värde kan skilja mellan 10 till 90% max 
		  value = Number(value.substr(0, value.length - 2)) + 10;
		  ownerFrontLamp._picaxe.sendCommand(ownerFrontLamp._protocolIdentity, protocolKey, String.fromCharCode(value)) ;
		  
	  }
	  addOnDOMLoad(function(){
		  slider = ownerFrontLamp._getNode("angleslider");
		  
		  // initiera till mittläge
		  slider.style.top = value - 10;
		  
		  slider.attachEvent("onmousedown", function(evt){
			  if (evt.button == 1){
				  var parentTop = slider.parentNode.style.top;
				  e.y = evt.offsetY;
				  e.isMoving = true;
			  }
		  });
		  slider.previousSibling.attachEvent("onmousemove", function(evt){ 
			  evt.returnValue = true;
			  if (e.isMoving && evt.button == 1) {
				  var y = (evt.offsetY - e.y) / ownerFrontLamp._scale;
				  if (y  < minY){
					  y = minY;
			  	  } else if(y > maxY) {
				  	  y = maxY;
			  	  }
				  slider.style.top = y + "px";
			  }
	  	  });
	  	  slider.previousSibling.attachEvent("onmouseout", function(evt){
		  	  if (evt.toElement != slider && e.isMoving) {
		  	  	e.isMoving = false;
		  	  	e.y = 0;
		  	  	sliderDragged();
	  	  	  }
		  });
	      slider.attachEvent("onmouseup", function(evt){
		      if (evt.button == 1 && e.isMoving) {
			      e.isMoving = false;
			      sliderDragged();
		      }
		      e.y = 0;
	      });  
  	  }, this);
  	  
	  this.setValue = function(newValue){
		  value = Number(newValue.toString().charCodeAt(0));
		  if (value > maxY + 10) {
			  value = maxY + 10; 
		  } else if(value < minY + 10) {
			  value = minY + 10;
		  }
		  slider.style.top = (value - 10) + "px";
	  }
	  this.getValue = function(){ return value; }
	  
  	  // events från picaxekabeln till denna class
	  ownerFrontLamp._picaxe.connectTo(ownerFrontLamp._protocolIdentity, protocolKey, me.setValue, me);
  }