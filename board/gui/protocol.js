/*
*	Protokoll för att styra speglarna
*	
*	struktur:
*     { 'protocolId1':  <- tex leftMirror
*		{
*			'moveX': 'X', <- widget sänder kommando1 men ut på picaxekabeln kommer det A 
*			'moveY': 'Y', <- skickar B
*			'blink': 'L'  <- vänsterblink
*		},
*		'protocolId2': <- tex rightMirror
*		{  
*			'blink': 'x', <- notera små bokstäver
*			'moveX': 'y',
*			'blink': 'T'
* 	    }
*	  }
*
*		På detta vis kan samma widgetClass använda samma API,
*		men sända olika kommandon beroende på vilken protocolID som den skapats med
*
*			OBS alla dessa nycklar eller ID finns dokumenterade i filen protokollnycklar.txt
*/

{
	leftMirror: {
		moveX: 'Y',		// flytta X, 1=ned, 0=upp
		moveY: 'X', 	// flytta Y, 1=vänster, 0=höger
		cancel:'Q',		// avbryt flytt
		fold: 'Z', 		// Fäll in eller ut spegel 1=ut, 0 = in
		blinker: '<', 	// blinkljus 1= på, 0=av
		flasher:  'F',   // flasher
		safeLight: 'P', // trygghetsljus 1=på, 0=av
		Xpos: 'W0',	    // hämta Xpos (upp-ned)
		Ypos: 'W1',		// hämta Ypos (vänster-höger)
		getTemp: 'W2',  // hämta temperaturvärde
		defroster: 'S'	// defroster av=0 eller på=1 
	},
	rightMirror: {
		moveX: 'U',		// flytta X, 1=ned, 0=upp
		moveY: 'V', 	// flytta Y, 1=vänster, 0=höger
		cancel:'Q',		// avbryt flytt
		fold: 'Z', 		// Fäll in eller ut spegel 1=ut, 0 = in
		blinker: '>', 	// blinkljus 1= på, 0=av
		flasher:  'F',   // flasher
		safeLight: 'P', // trygghetsljus 1=på, 0=av
		Xpos: 'T0',	    // hämta Xpos (upp-ned)
		Ypos: 'T1',		// hämta Ypos (vänster-höger)
		getTemp: 'T2',   // hämta temperaturvärde
		defroster: 'S'	// defroster av=0 eller på=1 
	},
	leftHeadlamp: {
		highBeam: 'H',   // heljus
		lowBeam:  'L',	 // halvljus
		parkLight:'@',	 // parkeringsljus
		blinker:  '<',   // blinkers
		flasher:  'F',   // flasher
		angle:    'M'	 // ljuslängdsvinkel
	},
	rightHeadlamp: {
		highBeam: 'H',   // heljus
		lowBeam:  'L',	 // halvljus
		parkLight:'@',	 // parkeringsljus
		blinker:  '>',   // blinkers
		flasher:  'F',   // flasher
		angle:    'M'    // ljuslängdsvinkel
	},
	leftRearLamp: {
		parkLight: '@', // parkering
		brakeLight:'=', // bromsljus
		blinker:   '<', // blinkers
		flasher:  'F',   // flasher
		backingLight:  'R'  // backljus
	},	
	rightRearLamp: {
		parkLight: '@', // parkering
		brakeLight:'=', // bromsljus
		blinker:   '>', // blinkers
		flasher:  'F',   // flasher
		backingLight:  'R'  // backljus
	},
	dashBoard: {
		beeper:    'I',  // Signalhorn
		leftBlink: '<',  // vänsterblinkers
		rightBlink:'>',  // högerblinkers
		flasher:   'F',  // flasher
		highBeam:  'H',   // helljus
		lowBeam:   'L',	 // halvljus
		backingLight:  'R', // backljus
		safeLight: 'P', // trygghetsljus 1=på, 0=av
		defroster: 'S', // defroster av=0 eller på=1 
		parkLight: '@', // parkering
		brakeLight:'='  // bromsljus
	},
	horn: {
		beeper:    'I'  // Signalhorn
	}
}
