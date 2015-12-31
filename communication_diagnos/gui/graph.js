var svgNS = "http://www.w3.org/2000/svg";  

function Graph(divNode){
	// init
	this._X_scaleDigits = [];
	this._Y_scaleDigits = [];
	this._channels = {};
	
	this._rootNode = divNode;
	divNode.style.cssText = "border:solid 1px #000; height:330px; width:868px; background-color:#eee;position:relative;";
	this._svgNode = document.createElementNS(svgNS, "svg");
	this._svgNode.setAttributeNS (null, "viewBox", "0 0 868 330");
        this._svgNode.setAttributeNS (null, "width", 868);
        this._svgNode.setAttributeNS (null, "height", 330);
        this._svgNode.style.display = "block";
	divNode.appendChild(this._svgNode);
	
	
	// lay out horizontal grid
	var str = "";
	for (var i = 0; i < 9; i++){
		var y = i * 30 + 30;
		var x = 70 + (10 * (i % 2))
		str += "<line x1='" + x + "' y1='" + y + "' x2='860' y2='"  + y + "' style='stroke:#999;'></line>\n\n";
	}
	
	// lay out vertical grid
	for (var i = 1; i < 28; i++){
		var x = i * 30 + 50;
		var y = 270 + (10 *(i % 2))
		str += "<line x1='" + x + "' y1='0' x2='" + x + "' y2='" + y + "' style='stroke:#999;'></line>\n\n";
	}
	this._svgNode.innerHTML = str;
	
	// X scale
	for (var i = 0; i < 27; i++) {
		var span = document.createElement("span");
		var y = 280 - 10 * (i % 2);
		var x = 75 + (i * 30);
		span.style.cssText = "position:absolute; top:" + y + "px; left:" + x + "px;"
		span.innerHTML = i;
		this._rootNode.appendChild(span);
		this._X_scaleDigits.push(span);
	}
	
	// Y scale
	for (var i = 0; i < 10; i++) {
		var span = document.createElement("span");
		var y = -10 + i * 30;
		var x = 50 - (10 * (i % 2));
		span.style.cssText = "position:absolute; top:" + y + "px; left:" + x + "px;"
		span.innerHTML = 9 - i;
		this._rootNode.appendChild(span);
		this._Y_scaleDigits.push(span);
	}
	
	// X desc
	var span = document.createElement("span");
	span.style.cssText = "position:absolute; top:310px; left:440px;font-weight:bold;";
	this._X_scaleDesc = span;
	span.innerHTML = "X scale";
	this._rootNode.appendChild(span);
	
	// Y desc
	var span = document.createElement("span");
	span.style.cssText = "position:absolute; top:145px; left:0px;font-weight:bold;";
	this._Y_scaleDesc = span;
	span.innerHTML = "Y scale";
	this._rootNode.appendChild(span);
	
	// graph line
	var poly = document.createElementNS(svgNS, "polyline");
	poly.setAttributeNS(null, "points", "80,0 80,270 860,270");
	poly.style.cssText = "stroke: black; stroke-width:2; fill: none;"
	this._graphLine = poly;
	this._svgNode.appendChild(poly);
	
	// hide/show
	var button = document.createElement("input");
	button.setAttribute("type", "button");
	button.style.cssText = "position: relative; top -50px;"
	button.value = "dölj graf";
	var _this = this;
	this._rootNode.parentNode.insertBefore(button, this._rootNode);
	button.onclick = function(){
		_this.show(this.value.indexOf("dölj") == -1);
	}
	this._showButton = button;
	this.show(false);
}
Graph.prototype._rootNode = null;
Graph.prototype._Y_scaleDigits = null; // []
Graph.prototype._X_scaleDigits = null; // []
Graph.prototype._graphLine = null; // <v:polyline >
Graph.prototype._X_scaleDesc = null;
Graph.prototype._Y_scaleDesc = null;
Graph.prototype._activeChannel = "";
Graph.prototype._lastShownIndex = 0;
Graph.prototype._showing = false;
Graph.prototype._showButton = null;
Graph.prototype._channels = null; // {'input0 steps':{
								  //	points:[{time:value}],
								  //	min:minvalue,
								  //	max:maxvalue,
								  //	YScale:"steg",
								  //	start:DateTime of start
								  //}
								  // }
								  
Graph.prototype.registerChannel = function(channelName, YScale, min, max){
	var date = new Date();
	this._channels[channelName] = {
								points: [],
								min: min,
								max: max,
								YScale: YScale,
								start: date
							};
}

Graph.prototype.activeChannel = function(){ return this._activeChannel; }
Graph.prototype.setActiveChannel = function(channelName){
	if (this._activeChannel != channelName) {
		this._channels[channelName].points = [];
		this._lastShownIndex = 0;
		this._activeChannel = channelName;
		this.repaint();
	}
}
								  
Graph.prototype.pushValue = function(channelName, value){
	// lagra i behållare
	var channel = this._channels[channelName];
	var time = new Date() - channel.start;
	time = parseInt(time / 100);
	time = time / 10;
	channel.points.push({'time': time, 'value': value});
	
	// render if this is the correct channel and we have a render index at the end
	if (this._activeChannel == channelName /*&& 
		this._lastShownIndex == channel.points.length - 2*/
	){
		this.render();
	}
}

Graph.prototype.render = function(){
	if (this._activeChannel) {
		var channel = this._channels[this._activeChannel];
		var points = channel.points;
		var path = "";
		
		var min = channel.min;
		var max = channel.max;
		var factor = 270 / max; // 0=270px, 255=0px om 0-255 är min-max
		
		var end = 27 /*y-lines*/;
		for (var i = 0;  i < 27; i++) {
			// ändra siffra vid Y markeringen (3 punkter i varje ruta)
			var XMarker = "";
			var tmp = (i * 3) + this._lastShownIndex;
			if (points.length > tmp) {
				XMarker = points[tmp]['time'];
			}
			this._X_scaleDigits[i].innerText = XMarker;
			
			// path på polyline
			var tmp = (i * 3) + this._lastShownIndex;
			var end = i < 26 ? 3 : 1;
			for (var j = tmp; j < tmp + end; j++) {
				if (points.length > j) {
					var x = 80 + (10 * (j - this._lastShownIndex)); // 30px i varje ruta, 3 punkter i varje ruta ger 10px avstånd
					var y = Math.round(270 - (points[j]['value'] * factor));
					path += " " + x + "," + y + "";
				}
			}
			
		}
		
		// rendera linjen
		this._graphLine.setAttributeNS(null, "points", path);
		if (points.length > 3*27) {
			this._lastShownIndex++;
		}
	}
}

Graph.prototype.repaint = function(){
	if (this._activeChannel) {
		var channel = this._channels[this._activeChannel];
		
		var factor = channel.max / 9;
		
		// render Y scale
		for (var i = 0; i < 10; i++){
			this._Y_scaleDigits[i].innerText = parseInt(channel.max - (i * factor));
		}
		
		// Y scale name
		this._Y_scaleDesc.innerText = channel.YScale;
		
		this._X_scaleDesc.innerText = channel.XScale || "sekunder"
		
		this._graphLine.setAttributeNS(null, "points", "80,0 80,270 860,270");
		this.lastShownIndex = channel.points.length - 1;
	}
}
Graph.prototype.show = function(show){
	
	this._showing = show;
	
	if (show) {
		this._showButton.setAttribute("value", "dölj graf");
		this._rootNode.style.display = "";
	} else {
		this._showButton.setAttribute("value", "visa graf");
		this._rootNode.style.display = "none";
	}
}