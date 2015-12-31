/*
*	funktionsfiler för comminucation_netcomm.hta
*
*	author Fredrik Johansson
*
*/

function generate() {
  	var picaxeType = document.getElementById("picaxeType");
  	var inputsContainer = document.getElementById("inputs");
  	var outputsContainer = document.getElementById("outputs");
  	var inputs = [0, 1, 2, 6, 7];
  	var outputs = [0, 1, 2, 3, 4, 5, 6, 7];
  	
  	var str = "Ingångar<br/>";
  	for (var i = 0; i < inputs.length; i++) {
	  	if (i > 0) {
		  	str += "<br/>";
	  	}
  		str += inputs[i] + " <select id=\"input" + inputs[i] + "Type\">\n" +
			  "<option value=\"d\">Dig. stat.</option>\n" + 
			  "<option value=\"v\">An. mV</option>\n" + 
			  "<option value=\"s\">An. steg</option>\n" +
			  "</select>\n" + 
			  "<input id=\"input" + inputs[i] + "Value\" readonly=\"true\"/ size=\"7\">\n" +
			  "<button id=\"input" + inputs[i] + "Update\" onclick=\"updateInput(" + inputs[i] + ")\">«</button>" +
			  "<br/>";
  	}
  	
  	// insert the generated html
  	inputsContainer.innerHTML = str;
  	
  	str = "Utgångar<br/>";
  	for (var i = 0; i < outputs.length; i++) {
	  	if (i > 0) {
		  	str += "<br/>";
	  	}
  		str += outputs[i] + " <select id=\"output" + outputs[i] + "Type\">\n" +
			   "<option value=\"d\">Digital</option>\n" +
			   "<option value=\"t\">Ljudton</option>\n" +
			   "<option value=\"s\">Servo</option>\n";
		if (i == 3) {
	  		// 18M and 18M2 supports pwmout on certain pins
	  		str += "<option value=\"p\">PWM</option>\n";
	  	}
			   
		str += "</select>\n" +
			   "<input type=\"text\" id=\"output" + outputs[i] + "Value\" size=\"3\" maxlength=\"3\" value=\"0\" " +
			   		"onchange=\"outputValueChanged(this, " + i + ")\" ondblclick=\"changeOutputValue(this, " + i + ")\"" +
			   		"title=\"Dubbelklicka för att ändra\"/>\n" +
			   "<input type=\"button\" id=\"outputUpdate\" value=\"»\" onclick=\"updateOutput(" + outputs[i] + ")\"/><br/>";
  	
  	}
  	
  	outputsContainer.innerHTML = str;
  	
  	createGraph();
  }
  
  function changeOutputValue(inputNode, outputNumber){
	  var type = document.getElementById("output"+outputNumber+"Type");
	 
	  switch (type.value){
		   case "d":
		   	 inputNode.value = (inputNode.value == 0 ? 1 : 0);
		   	 break;
		  case "t":
		  	 inputNode.value = inputNode.value < 255 ? parseInt(inputNode.value) + 1 : 0;
		  	break;
		  case "s":
		  	 inputNode.value = (inputNode.value < 225 ? parseInt(inputNode.value) + 1 :  75);
		  	break;
		  case "p":
		  	 inputNode.value = (inputNode.value < 100 ? parseInt(inputNode.value) + 1 : 0);
		  	break;
	  }
	  outputValueChanged(inputNode, outputNumber);
  }
  
  function outputValueChanged(inputNode, outputNumber){
	  var type = document.getElementById("output"+outputNumber+"Type");
	  if (isNaN(inputNode.value)) {
		  inputNode.value = 0;
		  return;
	  }
	  inputNode.value = parseInt(inputNode.value);
	  
	  switch (type.value){
		   case "d":
		   	 inputNode.value = inputNode.value <= 0 ? 0 : 1;
		   	 break;
		  case "t":
		  	 inputNode.value = (inputNode.value <= 0 ? 0 : (inputNode.value > 255 ? 255 : inputNode.value));
		  	break;
		  case "s":
		  	 inputNode.value = (inputNode.value <= 75 ? 75 : (inputNode.value > 225 ? 225 : inputNode.value));
		  	break;
		  case "p":
		  	 inputNode.value = (inputNode.value <= 0 ? 0 : (inputNode.value > 100 ? 100 : inputNode.value));
		  	break;
	  }
	  updateOutput(outputNumber);
  }
  
  
  function updateInput(inputNumber) {
  	var type = document.getElementById("input" + inputNumber + "Type").value;
  	
  	var response = picaxe.updateInput(inputNumber,function(response){
	  var cleanValue = response;
	  if (type == "v"){
		  cleanValue = cleanValue.substr(0, cleanValue.length - 2);
	  }

	  if (type == "s") { // steg
		  response = response + " (0x" + Number(response).toString(16).toUpperCase() + ")";
	  }
	  
	  // sätt in värdet på rätt position
	  document.getElementById("input" + inputNumber + "Value").value = response;
	  
	  inputUpdated(inputNumber, type, cleanValue);
	}, type);
  }
  
  var _activeInput = { input:0, type: "d", inputType: "digital"};
  
  // testing function need to implement a event system
  function inputUpdated(inputNumber, type, value){
	  if (inputNumber == _activeInput.input && type == _activeInput.type) {
		  if (type == "v") {
			  value = value.replace(/mV\r\n/, "");
		  }
		  graph.pushValue("input" + _activeInput.input + _activeInput.inputType, value);
	  }
  }
  
  
  
  function createGraph(){
	// skapa graph objektet
	graph = new Graph(document.getElementById("graph"));
	var select = document.createElement("select");
	select.setAttribute("id", "graphInput");
	
	// skapa ett antal ingångar att välja i graf visningen
	var inputs = [0, 1, 2, 6, 7];
	for(var i = 0; i < 5; i++){
		var option = document.createElement("option");
		option.setAttribute("value", inputs[i]);
		option.innerHTML = "ingång " + inputs[i];
		select.appendChild(option);
	}
	var label = document.createElement("label");
	label.innerHTML = "ingång";
	var root = graph._rootNode;
	root.parentNode.insertBefore(select, document.getElementById("graph"));
	root.parentNode.insertBefore(label, select);
	
	// skapa ett antal ingångstype att välja
	var select2 = document.createElement("select");
	select2.setAttribute("id", "graphInputType");
	var types = ["digital", "volt", "steg"];
	for(var j = 0; j < types.length; j++){
		var option = document.createElement("option");
		option.setAttribute("value", types[j]);
		option.innerHTML = types[j];
		select2.appendChild(option);
	}
	root.parentNode.insertBefore(select2, select.nextSibling);
	
	// och en ändraknapp
	var button = document.createElement("input");
	button.setAttribute("type", "button");
	button.setAttribute("value", "-> Ändra grafvisning");
	root.parentNode.insertBefore(button, select2.nextSibling);
	button.onclick = function(){
		var input = document.getElementById("graphInput");
		var inputType = document.getElementById("graphInputType");
		
		// cacha värdet på vald ingång
		_activeInput.input = input.value;
		_activeInput.inputType = inputType.value;
		var type = "d";
		switch (inputType.value){
			case "digital": type = "d"; break;
			case "volt": type = "v"; break;
			case "steg": type = "s"; break;
		}
		_activeInput.type = type;
		
		// ändra graf ritning
		var name = "input" + input.value + inputType.value;
		debug(name);
		graph.setActiveChannel(name);
	}
	
	// registrera tillgängliga kanaler
  	//graph.registerChannel("input2steps", "steg", 0, 255);
  	var typesLimits = {
	  	"digital": {"name": "Nivå", min: 0, max:1},
  		"volt": {"name": "millivolt", min: 0, max: 4500},
  		"steg": {"name": "Steg", min: 0, max: 255}
  	};			
  	for(var i = 0; i < 5; i++){
	  	for(var j = 0; j < types.length; j++) {
		  	var limits = typesLimits[types[j]];
		  	graph.registerChannel("input" + inputs[i] + types[j], limits["name"], limits["min"], limits["max"]);
	  	}
  	}
  	
  	// defaulta på första valet
  	button.click();
  	//graph.setActiveChannel("input0digital");
  }
  
  
  function updateOutput(outputNumber) {
  	var type = document.getElementById("output" + outputNumber + "Type").value; 
  	var valueStr = document.getElementById("output" + outputNumber + "Value").value;
  	
  	picaxe.updateOutput(outputNumber, function(){}, type, valueStr);
  }
  
  
  var updaterObject = {
    interval: null,
    active: false,
    inputs: [0, 1, 2, 6, 7], // only 5 inputs on a picaxe18
    _idx: 0,
    toggleUpdateInputs: function(){
      if (updaterObject.interval == null) {
	// start autoupdate
	var _t = this;
	updaterObject.interval = setInterval(function(){
	  if (!updaterObject.active && updaterObject.interval) {
	    updaterObject.active = true;
	    updateInput(_t.inputs[_t._idx]);
	    _t._idx++;
	    if (_t._idx >= _t.inputs.length)
	      _t._idx = 0;
	    updaterObject.active = false;
	  }
	}, 100);
	
      } else {
	// stop autoupdate
	clearInterval(updaterObject.interval);
	updaterObject.interval = null;
	updaterObject.active = false;
	
      }
    }
  }
  
  function debug(str){
	  
	  var deb = document.getElementById("debug");
	  deb.innerHTML += "\n<br/>" + str;
  }
  