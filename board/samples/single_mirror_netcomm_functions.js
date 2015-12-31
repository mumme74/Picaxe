/*
*	funktionsfiler för single_mirror_netcomm.hta
*
*	author Fredrik Johansson
*
*/


	function _netComm_OnComm(){
		debug(document.getElementById('NetComm1').InputData);
	}


	//addOnLoad(function(){
	//	setInterval(function(){picaxe.commandToPicaxe("G2\n");}, 500);
	//});


	addOnDOMLoad(function(){ 
		return;
		
		var netComm = document.createElement("object");
		netComm.classid = "clsid:53867031-6B4D-4F7D-B089-5DFEC731F5FA";
		netComm.id = "NetComm1";
		document.body.appendChild(netComm);
		
		netComm.attachEvent("OnComm", _netComm_OnComm);
		if (typeof netComm.CommPort == 'undefined') {
			alert("NetComOCX är inte installerad correct");
		}
		
		addOnUnLoad(function(){
		     if (netComm && netComm.PortOpen){
				netComm.PortOpen = false;
			}
		});
		
		//div.innerHTML = '<object classid="clsid:53867031-6B4D-4F7D-B089-5DFEC731F5FA" id="NetComm1"></object>'+
		//	'<script for="NetComm1" event="OnComm()" language="JavaScript" id="netComEvtScript"></script>';
		
			
		//document.getElementById("netComEvtScript").text = "debug('here');";//debug(document.getElementById('NetComm1').CommEvent);
		
	  	netComm.CommPort = 3;               //Specifies COM3
	    netComm.Settings = "4800,N,8,2";    //2400 Baud, No Parity, 8 databits, 1 stopbit
	    //netComm.SThreshold = 1;             //Enable Tranmit Events
	    netComm.RThreshold = 1;             //Enable Receive Events
	    	  
	    //netComm.InputLen = 0; // read from start of buffer
		  //netComm.InputMode = 0; // read as text
		 // netComm.Handshaking = 0; // none
		 // netComm.RThreshold = 1;
		  //netComm.DTREnable = false;
		  //netComm.RTSEnable = false;
		  
	    netComm.PortOpen = true;            //Open Port
	    
	    if (netComm.PortOpen)
	        debug("Port Opened Successfuly");
	    else
	        debug("Port failed to Open");
	        
	    //netComm.Output = "X1\n";
	    setInterval(function(){netComm.Output = "G2\n";}, 500)
    
 
  		
	});
	
	
	

	
	