/*
*	Kontrollogik för DashBoard widget
*
*	Fredrik Johansson 2011-07-17
*
*/
  
//   if(!document.namespaces.v){ 
//     document.namespaces.add("v", "urn:schemas-microsoft-com:vml", "#default#VML");
//     document.createStyleSheet().addRule("v\:shape", "behavior:url(#default#VML);display:inline-block;");
//   }
//       
//   
  
  
  // constructor för DashBoard
  function DashBoard(picaxeController, parentNodeID, protocolID, rightOriented, scale, uniqueDomID){
    this._id = uniqueDomID ? uniqueDomID : ("_" + parseInt(Math.random() * 10000));
    this._protocolIdentity = protocolID;
    this._picaxe = picaxeController || picaxe;
    this.nodes = {}; // hållare för dynamiska noder
    this._rightOriented = rightOriented || false;
    this._scale = scale || 1;
  

    this.leftBlinker = new DashBoardBlinker(this, "leftBlink");
    this.rightBlinker = new DashBoardBlinker(this, "rightBlink");
    this.flasher     = new DashBoardFlasher(this);
    this.brakeLight = new DashBoardBrakeLight(this);
    this.parkLight = new DashBoardParkLight(this);
    this.backingLight = new DashBoardBackingLight(this);
    this.highBeamLight = new DashBoardHighBeamLight(this);
    this.lowBeamLight = new DashBoardLowBeamLight(this);
    this.defroster = new DashBoardDefroster(this);
    this.safeLight = new DashBoardSafeLight(this);
    this.horn = new DashBoardHorn(this);
  
    addOnDOMLoad(function(){
      this._parentNode = document.getElementById(parentNodeID);
      // ladda HTML
      var svg = loadTextFile("dashboard_template.htm");
  
      // prefixa id i SVGen med vårt unika id
      svg = svg.replace(/\"\$(.*)\"/g,"\""+  this._id + "$1\"");
      this._parentNode.innerHTML = svg;
  
      var node = this._getNode("dashboardcommon");
      var scale = {x: this._scale, y: this._scale};
      var translate = "";
      
      if (this._rightOriented){
        var cStyle = window.getComputedStyle(this._parentNode); //node.currentStyle.width;
        var width = cStyle.width;
        var height = cStyle.height;
        width = width.substr(0, width.length - 2); // trimma "pt"
        height = height.substr(0, height.length - 2); 
        translate = " translate(" + width + ", 0) "
        scale.x = -scale.x
      }
      
      node.setAttribute("transform", translate + "scale(" + scale.x + "," + scale.y + ")");
  
  
      // events från noder till denna class
      attachOnClick("leftblinker", this.leftBlinker.toggle);
      attachOnClick("rightblinker", this.rightBlinker.toggle);
      attachOnClick("flasher", this.flasher.toggle);
      attachOnClick("flashersymbol", this.flasher.toggle);
      attachOnClick("brakelight", this.brakeLight.toggle);
      attachOnClick("brakelightletter", this.brakeLight.toggle);
      attachOnClick("parklight", this.parkLight.toggle);
      attachOnClick("parklightsymbol", this.parkLight.toggle);
      attachOnClick("backinglight", this.backingLight.toggle);
      attachOnClick("backinglightletter", this.backingLight.toggle);
      attachOnClick("highbeamlight", this.highBeamLight.toggle);
      attachOnClick("highbeamlightsymbol", this.highBeamLight.toggle);
      attachOnClick("lowbeamlight", this.lowBeamLight.toggle);
      attachOnClick("lowbeamlightsymbol", this.lowBeamLight.toggle);
      attachOnClick("defroster", this.defroster.toggle);
      attachOnClick("defrostersymbol", this.defroster.toggle);
      attachOnClick("safelight", this.safeLight.toggle);
      attachOnClick("safelightletter", this.safeLight.toggle);
      attachOnClick("horn", this.horn.toggle);
      attachOnClick("hornsymbol", this.horn.toggle);
    
    }, this);
    
    var _this = this;
    function attachOnClick(nodeId, evtFunc){
      //debug(_this._id + nodeId + evtFunc);
      var node = _this._getNode.call(_this, nodeId);
      node.addEventListener("click", evtFunc);
    }
  }
  DashBoard.prototype._getNode = function(nodeId){
    return document.getElementById(this._id + nodeId);
  }
  
  DashBoardBlinker = function(ownerDashBoard, protocolKey){
    var state = false;
    var me = this;
    this.toggle = function (){
      me.setState(!state);
      ownerDashBoard._picaxe.sendCommand(ownerDashBoard._protocolIdentity, protocolKey, Number(state));
    }
    this.setState = function(newState){
      state = newState;
      // ownerDashBoard._getNode(protocolKey + "lightbeam").style.visibility = state ? "visible" : "hidden";
      ownerDashBoard._getNode(protocolKey.toLowerCase() + "er").style.fill = state ? "#00FF0C" : "#E4FFB2";
    }
    this.getState = function(){ return state; }
    
    // events från picaxekabeln till denna class
    ownerDashBoard._picaxe.connectTo(ownerDashBoard._protocolIdentity, protocolKey, me.setState, me);
    ownerDashBoard._picaxe.connectTo(ownerDashBoard._protocolIdentity, 'flasher', me.setState, me); 
  }

  DashBoardFlasher = function(ownerDashBoard){
    var state = false;
    var me = this;
    var protocolKey = "flasher";
    this.toggle = function (){
      me.setState(!state);
      ownerDashBoard._picaxe.sendCommand(ownerDashBoard._protocolIdentity, protocolKey, Number(state));
    }
    this.setState = function(newState){
      state = newState;
      // ownerDashBoard._getNode(protocolKey + "lightbeam").style.visibility = state ? "visible" : "hidden";
      ownerDashBoard._getNode(protocolKey.toLowerCase()).style.fill = state ? "#f33d0c" : "#ee9758";
    }
    this.getState = function(){ return state; }
    
    // events från picaxekabeln till denna class
    ownerDashBoard._picaxe.connectTo(ownerDashBoard._protocolIdentity, protocolKey, me.setState, me);
  }
  
  DashBoardBrakeLight = function(ownerDashBoard) {
    var state = false;
    var me = this;
  
    var protocolKey = "brakeLight";
    this.toggle = function(){
      me.setState(!state);
      ownerDashBoard._picaxe.sendCommand(ownerDashBoard._protocolIdentity, protocolKey, Number(state)) ;
    }
    this.setState = function(newState){
      state = newState;
      ownerDashBoard._getNode("brakelight").style.fill = state ? "#FF0000" : "#FF7D60";
    }
    this.getState = function(){ return state; }
  
    // events från picaxekabeln till denna class
    ownerDashBoard._picaxe.connectTo(ownerDashBoard._protocolIdentity, protocolKey, me.setState, me);
  }
  
  DashBoardParkLight = function(ownerDashBoard) {
    var state = false;
    var me = this;
    var protocolKey = "parkLight";
 
    this.toggle = function(){
      me.setState(!state);
      ownerDashBoard._picaxe.sendCommand(ownerDashBoard._protocolIdentity, protocolKey, Number(state)) ;
    }
    this.setState = function(newState){
      state = newState;
      ownerDashBoard._getNode("parklight").style.fill = state ? "#FFFF9B" : "#FFF";
    }
    this.getState = function(){ return state; }
    // events från picaxekabeln till denna class
    ownerDashBoard._picaxe.connectTo(ownerDashBoard._protocolIdentity, protocolKey, me.setState, me);
  }
  
  DashBoardBackingLight = function(ownerDashBoard) {
    var state = false;
    var me = this;
    var protocolKey = "backingLight";
  
    this.toggle = function(){
      me.setState(!state);
      ownerDashBoard._picaxe.sendCommand(ownerDashBoard._protocolIdentity, protocolKey, Number(state)) ;
    }
    this.setState = function(newState){
      state = newState;
      ownerDashBoard._getNode("backinglight").style.fill = state ? "#FFFF9B" : "#FFFFFF";
    }
    this.getState = function(){ return state; }
    
    // events från picaxekabeln till denna class
    ownerDashBoard._picaxe.connectTo(ownerDashBoard._protocolIdentity, protocolKey, me.setState, me);
  }
  
  DashBoardHighBeamLight = function(ownerDashBoard) {
    var state = false;
    var me = this;
    var protocolKey = "highBeam";
      
    this.toggle = function(){
      me.setState(!state);
      ownerDashBoard._picaxe.sendCommand(ownerDashBoard._protocolIdentity, protocolKey, Number(state)) ;
    }
    this.setState = function(newState){
      state = newState;
      ownerDashBoard._getNode("highbeamlight").style.fill = state ? "#00A3FF" : "#FFFFFF";
    }
    this.getState = function(){ return state; }
    // events från picaxekabeln till denna class
    ownerDashBoard._picaxe.connectTo(ownerDashBoard._protocolIdentity, protocolKey, me.setState, me);
  }
  
  DashBoardLowBeamLight = function(ownerDashBoard) {
    var state = false;
    var me = this;
    var protocolKey = "lowBeam";
  
    this.toggle = function(){
      me.setState(!state);
      ownerDashBoard._picaxe.sendCommand(ownerDashBoard._protocolIdentity, protocolKey, Number(state)) ;
    }
    this.setState = function(newState){
      state = newState;
      ownerDashBoard._getNode("lowbeamlight").style.fill = state ? "#DDFFCD" : "#FFFFFF";
    }
    this.getState = function(){ return state; }
  
    // events från picaxekabeln till denna class
    ownerDashBoard._picaxe.connectTo(ownerDashBoard._protocolIdentity, protocolKey, me.setState, me);
  }
  
  DashBoardDefroster = function(ownerMirror){
    var state = false;
    var me = this;
    var protocolKey = "defroster";
    this.toggle = function(){
      me.setState(!state);
      ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, protocolKey, Number(state));
    }
    this.setState = function(newState){
      state = newState;
      ownerMirror._getNode("defroster").style.fill = state ? "#FF796B" : "#7CC4FF";
    }
  
    // events från picaxekabeln till denna class
    ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, protocolKey, me.setState, me);
  }
  
  DashBoardSafeLight = function(ownerDashBoard) {
    var state = false;
    var me = this;
    var protocolKey = "safeLight";
  
    this.toggle = function(){
      me.setState(!state);
      ownerDashBoard._picaxe.sendCommand(ownerDashBoard._protocolIdentity, protocolKey, Number(state)) ;
    }
    this.setState = function(newState){
      state = newState;
      ownerDashBoard._getNode("safelight").style.fill = state ? "#FFFF9B" : "#FFFFFF";
    }
    this.getState = function(){ return state; }
  
    // events från picaxekabeln till denna class
    ownerDashBoard._picaxe.connectTo(ownerDashBoard._protocolIdentity, protocolKey, me.setState, me);
  }
  
  DashBoardHorn = function(ownerMirror){
    var state = false;
    var me = this;
      
    var protocolKey = "beeper";
    this.toggle = function(){
      me.setState(!state);
      ownerMirror._picaxe.sendCommand(ownerMirror._protocolIdentity, protocolKey, Number(state));
    }
    this.setState = function(newState){
      state = newState;
      ownerMirror._getNode("horn").style.fill = state ? "#FF796B" : "#7CC4FF";
    }
  
    // events från picaxekabeln till denna class
    ownerMirror._picaxe.connectTo(ownerMirror._protocolIdentity, protocolKey, me.setState, me);
  }
  
