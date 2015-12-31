/*
*	Kontrollogik för RearLamp widget
*
*	Fredrik Johansson 2011-07-17
*
*/
  
  if(!document.namespaces.v){ 
    document.namespaces.add("v", "urn:schemas-microsoft-com:vml", "#default#VML");
    document.createStyleSheet().addRule("v\:shape", "behavior:url(#default#VML);display:inline-block;");
  }
      
  
  
  
  // constructor för RearLamp
  function RearLamp(picaxeController, parentNodeID, protocolID, rightOriented, scale, uniqueDomID){
	  this._id = uniqueDomID ? uniqueDomID : ("_" + parseInt(Math.random() * 10000));
	  this._protocolIdentity = protocolID;
	  this._picaxe = picaxeController || picaxe;
	  this.nodes = {}; // hållare för dynamiska noder
	  this._rightOriented = rightOriented || false;
	  this._scale = scale || 1;
	  
	
	  this.blinker = new RearLampBlinker(this);
	  this.brakeLight = new RearLampBrakeLight(this);
	  this.parkLight = new RearLampParkLight(this);
	  this.backingLight = new RearLampBackingLight(this);
	  
	  
	  //
	  addOnDOMLoad(function(){
		  this._parentNode = document.getElementById(parentNodeID);
		  // ladda HTML
		  var fso = new ActiveXObject("Scripting.FileSystemObject");
		  var file = fso.OpenTextFile("rearlamp_template.htm");
		  var vml = file.ReadAll();
		  file.Close();
		  
		  // prefixa id i VMLen med vårt unika id
		  vml = vml.replace(/\"\$(.*)\"/g,"\""+  this._id + "$1\"");
		  this._parentNode.innerHTML = vml;
		  
		  if (this._rightOriented){
			  var node = this._getNode("rearlampcommon");
			  var style = node.style;
			  style.position = "relative";
			  var width = node.currentStyle.width
			  width = width.substr(0, width.length - 2); // trimma "pt"
			  style.left = "-" + width + "px";
			  style.flip = "x";
	  	  }
	  	  
	  	  if(this.scale != 1){
		  	  var sizes =  String(this._getNode("rearlampcommon").coordsize).split(",");
		  	  this._getNode("rearlampcommon").coordsize = parseInt(sizes[0] / this._scale) + "," + parseInt(sizes[1] / this._scale);
		  	  with(this._parentNode.style){
			  	  height = 0;
			  	  width = 0;
		  	  }
	  	  }
		  
		  
		  // events från noder till denna class
		  attachOnClick("blinker", this.blinker.toggle);
		  attachOnClick("brakelight", this.brakeLight.toggle);
		  attachOnClick("parklight", this.parkLight.toggle);
		  attachOnClick("backinglight", this.backingLight.toggle);
		  
  	  }, this);
  	  
  	  var _this = this;
  	  function attachOnClick(nodeId, evtFunc){
	  	  //debug(_this._id + nodeId + evtFunc);
		  var node = _this._getNode.call(_this, nodeId);
		  node.attachEvent("onclick", evtFunc);
  	  }
  	  
  }
  RearLamp.prototype._getNode = function(nodeId){
	  return document.getElementById(this._id + nodeId);
  }
  
 
 
  
  
  RearLampBlinker = function(ownerRearLamp){
	  var protocolKey = "blinker";
	  var state = false;
	  var me = this;
	  this.toggle = function (){
		  me.setState(!state);
		  ownerRearLamp._picaxe.sendCommand(ownerRearLamp._protocolIdentity, protocolKey, Number(state));
  		}
  	  this.setState = function(newState){
	  	state = newState;
	    ownerRearLamp._getNode("blinklightbeam").style.visibility = state ? "visible" : "hidden";
	    ownerRearLamp._getNode("blinker").fillcolor = state ? "#FFC321" : "#FFF1B7";
  	  }
  	  this.getState = function(){ return state; }
  	  
  	  // events från picaxekabeln till denna class
	  ownerRearLamp._picaxe.connectTo(ownerRearLamp._protocolIdentity, protocolKey, me.setState, me); 
  }
  
  RearLampBrakeLight = function(ownerRearLamp) {
	  var state = false;
	  var me = this;
	  
	  var protocolKey = "brakeLight";
	  this.toggle = function(){
		  me.setState(!state);
		  ownerRearLamp._picaxe.sendCommand(ownerRearLamp._protocolIdentity, protocolKey, Number(state)) ;
	  }
	  this.setState = function(newState){
		  state = newState;
		  ownerRearLamp._getNode("brakelightbeam").style.visibility = state ? "visible" : "hidden";
		  ownerRearLamp._getNode("brakelight").fillcolor = state ? "#FF0000" : "#FF7D60";
	  }
	  this.getState = function(){ return state; }
	  
  	  // events från picaxekabeln till denna class
	  ownerRearLamp._picaxe.connectTo(ownerRearLamp._protocolIdentity, protocolKey, me.setState, me);
  }
  
  RearLampParkLight = function(ownerRearLamp) {
	  var state = false;
	  var me = this;
	  var protocolKey = "parkLight";
	  
	  this.toggle = function(){
		  me.setState(!state);
		  ownerRearLamp._picaxe.sendCommand(ownerRearLamp._protocolIdentity, protocolKey, Number(state)) ;
	  }
	  this.setState = function(newState){
		  state = newState;
		  ownerRearLamp._getNode("parklightbeam").style.visibility = state ? "visible" : "hidden";
		  ownerRearLamp._getNode("parklight").fillcolor = state ? "#FF5D1F" : "#FF7D60";
	  }
	  this.getState = function(){ return state; }
	  
  	  // events från picaxekabeln till denna class
	  ownerRearLamp._picaxe.connectTo(ownerRearLamp._protocolIdentity, protocolKey, me.setState, me);
  }
  
  RearLampBackingLight = function(ownerRearLamp) {
	  var state = false;
	  var me = this;
	  var protocolKey = "backingLight";
	  
	  this.toggle = function(){
		  me.setState(!state);
		  ownerRearLamp._picaxe.sendCommand(ownerRearLamp._protocolIdentity, protocolKey, Number(state)) ;
	  }
	  this.setState = function(newState){
		  state = newState;
		  ownerRearLamp._getNode("backinglightbeam").style.visibility = state ? "visible" : "hidden";
		  ownerRearLamp._getNode("backinglight").fillcolor = state ? "#FFFF9B" : "#FFFFFF";
	  }
	  this.getState = function(){ return state; }
	  
  	  // events från picaxekabeln till denna class
	  ownerRearLamp._picaxe.connectTo(ownerRearLamp._protocolIdentity, protocolKey, me.setState, me);
  }