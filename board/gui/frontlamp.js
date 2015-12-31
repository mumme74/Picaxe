/*
*	Kontrollogik för FrontLamp widget
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
      var svg = loadTextFile("frontlamp_template.htm");
      
      // prefixa id i VMLen med vårt unika id
      svg = svg.replace(/\"\$(.*)\"/g,"\""+  this._id + "$1\"");
      this._parentNode.innerHTML = svg;
      
      var node = this._getNode("frontlampcommon");
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
      attachOnClick("blinker", this.blinker.toggle);
      attachOnClick("parklight", this.parkLight.toggle);
      attachOnClick("highlight", this.highLight.toggle);
      attachOnClick("lowlight", this.lowLight.toggle);
    
    }, this);
 
    var _this = this;
    function attachOnClick(nodeId, evtFunc){
      //debug(_this._id + nodeId + evtFunc);
      var node = _this._getNode.call(_this, nodeId);
      node.addEventListener("click", evtFunc);
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
      ownerFrontLamp._getNode("blinker").style.fill = state ? "#FFC321" : "#FFF1B7";
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
      ownerFrontLamp._getNode("parklight").style.fill = state ? "#FFFFE0" : "#FFF";
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
      ownerFrontLamp._getNode("highlight").style.fill = state ? "#E1FFE8" : "#FFFFFF";
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
      ownerFrontLamp._getNode("lowlight").style.fill = state ? "#F1FFF8" : "#FFFFFF";
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
    var minY = 3;
  
    // stoppa select på med musen
    document.addEventListener("selectstart", function(evt){ 
      evt.preventDefault();
      evt.stopPropagation();
    });
  
    function sliderDragged(){
      value = slider.getAttribute("transform").match(/translate\(\d+,(\d+)\)/);
      if (value) {
        value = Number(value[1]) +10;
        ownerFrontLamp._picaxe.sendCommand(ownerFrontLamp._protocolIdentity, protocolKey, String.fromCharCode(value)) ;
      }
    }
    
    function sliderMove(toY){
      if (toY  < minY){
        toY = minY;
      } else if(toY > maxY) {
        toY = maxY;
      }
      slider.setAttribute("transform", "translate(0," + toY + ")")
    }
    
    addOnDOMLoad(function(){
      slider = ownerFrontLamp._getNode("angleslider");	  
      // initiera till mittläge
      sliderMove((20 + value) * ownerFrontLamp._scale);
	  
      slider.addEventListener("mousedown", function(evt){
        if (evt.button == 0){
          var parentTop = slider.parentNode.style.top;
          e.y = evt.offsetY;
          e.isMoving = true;
        }
      });
      
      //find the previus sibling (real element)
      var previous = slider.previousSibling;
      while(previous.nodeType != 1 && previous != null){
        previous = previous.previousSibling;
      }
      
      previous.addEventListener("mousemove", function(evt){ 
        evt.returnValue = true;
          if (e.isMoving && evt.button == 0) {
            var y = (evt.offsetY - e.y) / ownerFrontLamp._scale;
            sliderMove(y + value -10);
          }
      });
      previous.addEventListener("mouseout", function(evt){
        if (evt.toElement != slider && e.isMoving) {
          e.isMoving = false;
          e.y = 0;
          sliderDragged();
        }
      });
      slider.addEventListener("mouseup", function(evt){
        if (evt.button == 0 && e.isMoving) {
          e.isMoving = false;
          sliderDragged();
        }
        e.y = 0;
      });  
    }, this);
  
    this.setValue = function(newValue){
      value = Number(newValue.toString().charCodeAt(0));
      if (value > maxY + 20) {
        value = maxY + 20; 
      } else if(value < minY + 20) {
        value = minY + 20;
      }
      
      sliderMove(value + 20);
    }
    this.getValue = function(){ return value; }
  
    // events från picaxekabeln till denna class
    ownerFrontLamp._picaxe.connectTo(ownerFrontLamp._protocolIdentity, protocolKey, me.setValue, me);
  }