' sandbox for network send functions

symbol txPin          = pinC.7    ' kan ej vara C.4 eller C.5 i picaxe18M2
'dirC.7                = 1         ' sätt txpin som utgång
symbol rxPin          = pinC.6    ' kan ej vara C.3 i Picaxe 18M2
symbol interruptMask  = %01000000 ' motsvarar lyssna på C.6

symbol counter        = b27
symbol inboxHandler   = b26
symbol recieveBuffer  = w12 ' b24 & b25
symbol recieveUpper   = b24
symbol recieveLower   = b25
symbol sendFrame      = w11 ' b22 & b23
symbol sendCommand    = b23
symbol sendState      = b22
symbol sendValue      = b21
symbol tmp1	          = b20
symbol tmp2           = b19
symbol netwId         = b18
symbol netwValue      = b17


txPin = 1
gosub setInterrupt



main:

	goto main
	
	
	if b1 = 0 then
		b1 = 1
	else
		b1 = 0
	end if
	
	
	for b0 = 0 to 30 
		sendCommand = b0
		sendState = b1
		sendValue = b0 * 7
		
		gosub sendToNetwork
	next b0
	

	sendCommand = "="
	sendState = 1
	sendValue = 0x80
	gosub sendToNetwork

	goto main
	
	
	
		
	
sendToNetwork:

	' från ASCII värde till nätverksid
	sendCommand = sendCommand - 60
	sendCommand = sendCommand * 16 ' flytta upp 4 steg till bit 4-7
	
	tmp2 = sendValue / 128 ' ta MSB från value

	tmp1 = sendState * 2 ' flytta upp 1 steg till bit 1-3
	tmp1 = tmp1 + tmp2   ' slå ihop värdena till 8 bitar
	'tmp1 = tmp1 OR %11110000 ' de 4 översta garantera 1or
	sendCommand = sendCommand OR tmp1 ' slå ihop
	
	sendState = sendValue * 2 ' flytta upp 1 steg
	
	' räkna fram chksumma
	tmp1 = sendCommand + sendState
	tmp1 = tmp1 AND %00000001
	
	' sätt dit chksumma
	sendState = sendState + tmp1
	
	setint off
	
	dirC.7 = 1 ' utgång på C.7
	for counter = 1 to 16
		tmp1 = sendCommand AND 0x80
		if tmp1 = 0 then
		   txPin = 0
		else
		   txPin = 1
		   ' kollision på nätet
		   if rxPin = 0 then
		   	' avbryt sänding
		   	pulsout B.1, 0xFFFF
		   	counter = 16
		   end if
		end if
		
		sendFrame = sendFrame * 2 ' peta ut bitarna från höger till vänster
	next counter

	txPin = 0
	pause 1
	dirC.7 = 0 ' ingen utgång längre


setInterrupt:
	setint %00000000, interruptMask
	return


interrupt:
	' interupt subrutin
	recieveBuffer = 0
	do loop until rxPin = 1 ' i sync låg
	do loop until rxPin = 0 ' i sync high
	
	' kod nedan tidsberoende
	for counter = 1 to 16 
		recieveBuffer = recieveBuffer / 2 ' shiftin
		if rxPin = 0 then
			recieveBuffer = recieveBuffer + 0 ' rad inkluderad för att koden ska tima rätt
		else
			recieveBuffer = recieveBuffer + 0x8000 ' 1a på MSB
			if rxPin = 0 then
				' enbart till för att matcha sändkoden
				' ska aldrig hamna här egentligen
				pause 0
			end if
		end if	
	next counter
	' slut tidsberoende.
	
	' meddelande mottaget
	'kontrollera chksumma
	tmp1 = recieveLower AND %11111110
	tmp2 = tmp1 - recieveUpper ' förlita oss på overflow
	tmp2 = tmp2 AND %00000001
	tmp1 = recieveLower AND %00000001 'chksum field
	
	debug
	
	if tmp1 = tmp2 then
		' lagra värdet i vår inbox
		
		' protokollnyckel
		netwId = recieveUpper AND %11110000
		netwId = netwId / 16 ' shifta 4 steg åt vänster
		
		
		' ben, eller status nummer ex @1 är ett kommando 
		'  positionsljus på, det har inget värde, 
		'  men T1=120 har värde 120
		tmp1 = recieveUpper AND %00001110
		tmp1 = tmp1 / 2 ' skifta nedåt 1 steg
		
		' vi sparar ben/statusvärdet i RAMmimmes plats 60-90 (protokollnyckel ascii värde)
		'  ex < har ASCII värde 60 vilket ger position 60
		'     Z har ascii värde 90 vilket ger position 90
		poke netwId, tmp1
		
		' paketets värde
		netwValue = recieveUpper * 128 ' skifta in värdets översta bit
		netwValue = netwValue OR recieveLower ' ta med de 7 lägre bitarna
		
		' spara paketets värde i RAM 31 positioner under protokollnyckeln
		'  ex < har ascii 60, sparas på position 29 (60-31)
		'     Z har ascii 90, sparas på position 59 (90-31)
		netwId = netwId - 31 
		poke netwId, netwValue
	else 
		' error i chksumma
		pulsout B.0, 0xFFFF ' 1 sek
	end if
	
	setint %00000000, interruptMask
	
	return