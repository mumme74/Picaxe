' fil f�r centraldator i n�tverket
' agerar bland annat blinkrel� och t�nder LED lamporna 
' i BCD displayen f�r att indikera vilka lysen som �r p�
' k�rs allts� i ett picaxe Tutorial 18 board


'************
'*  �ndra ej dessa!!
symbol byteOne          = b27
symbol byteTwo          = b26
symbol byteThree        = b25
symbol byteChk          = b24
symbol responseCommand  = b23 ' endast som svar p� en f�rfr�gan
symbol responseState    = b22
symbol responseValue    = b21
symbol counter          = b20
symbol tmp2             = b19
symbol tmp1             = b18
symbol tmpW             = w9 'b 18 & b19 
symbol serinTimeout     = 70
symbol cableTimeout     = 8
symbol baudSetting      = T2400_4

' transmission med programeringskabeln
symbol Xon              = 17
symbol Xoff             = 19

' control chars p� n�tverket
symbol ESC              = 11
symbol sendAgain        = 8 ' char cancel
'****************
'**** slut p� fasta inst�llningar f�r n�tverket


' s�nd och mottagarpinne
symbol rxPin            = pinC.0 ' ej c.3, c.4 eller c.5
symbol rxPinNumber      = C.0
symbol chkSumErrPin     = B.0 ' flashar denna vid fel p� mottagning

symbol networkDelay     = 30 ' detta v�rde motsvarar hur l�ng tid det tar f�r den
                             ' s�ligaste noden i n�tverket att klara av sin mainloop
                             ' l�ng mainloop = kortare v�rde h�r




' dessa f�r v�rdet fr�n kommunikationsrutinen
symbol command          = b0
symbol state            = b1
symbol value            = b2


' "blinkrel�" funktionen
symbol blinkerSide      = b3
symbol toggleState      = b4
symbol toggleCounter    = b5
symbol toggleAt         = 12
symbol leftKey          = "<"
symbol rightKey         = ">"


dirsB = %11111111

'#define debugMirror

main:	
	gosub recieveNext
	
	if command >= 60 and command <= 90 then
		' v�rt protokoll �r mellan asciivhar 60 och 90
		state = state - 48 ' g�r om fr�n ascii nummer "0" -> 0
	end if
	
	if command = leftKey or command = rightKey then
		' se till s� att st�nger av eller p� blinkersen
		' men bara om kommandot kommer fr�n n�gon annan �n denna nod
		if state = 1 and togglestate = 0 then
			responseCommand = command
			blinkerSide = command
			toggleState = 1
			
		else if state = 0 and togglestate = 1 then
			responseCommand = 0
			toggleCounter = 0
			blinkerSide = 0
			toggleState = 0
		end if
		responseState = toggleState
	
		goto indicateLed
		
		
	else if command = "I" then
		' signalhorn
		if state = 0 then
			pwmout B.6, off
		else
			'Star Wars theme 
			'tune B.6, 4,($C5,$43,$42,$40,$8A,$C5,$43,$42,$43,$C0,$65,$65,$65,$EA,$C5,$43,$42,$40,$8A,$C5,$43,$42,$40,$8A,$C5,$43,$42,$43,$80)
			pwmout pwmdiv16, B.6, 124, 250
			
		end if
	else if command = "H" then
		' visa helljus
		pinB.0 = state
	else if command = "L" then
		' visa att halvljus �r p�
		pinB.3 = state
	else if command = "@" then
		' visa parkeringsljusen p�
		pinB.4 = state
		pinB.2 = state
	else
		' vi �r i ett heartbeat
		
		' blinkrel� funktionen
		' r�kna upp blinkersr�knaren
		if blinkerSide > 0 then
			' blinker aktiv
			inc toggleCounter ' +1
			if toggleCounter > toggleAt then
				' b�rja om r�knaren
				toggleCounter =  0
				responseCommand = blinkerSide
				
				' toggla state och skicka ut p� n�tverket
				toggleState = not toggleState
				toggleState = toggleState AND %00000001
				responseState = toggleState + 48 ' ascii siffra 0eller 1
		
				' visa p� LED som en sorts indikeringslampor
indicateLed:		if blinkerSide = leftKey then
					pinB.5 = toggleState
				else
					pinB.1 = toggleState
				end if
				' klicka med h�gtalaren
				pinB.6 = toggleState
				
			end if
		end if
		' slut blinkrel� funktion
	end if
	
		
	' ***************************************
	' f�r att retunera v�rden fr�n mainloopen
	' skriv:
	'    responseCommand = "commando" tex ">"
	'    responseState =  status
	'    responseValue = value (valfri)
	' ***************************************
	
	
	gosub resetValues
		
	goto main
	
checkToggle:

	
	return


resetValues:
	' nollst�ll f�r n�sta snurr
	command = 0	
	state   = 0
	value   = 0
	
	return	





recieveNext:

	if responseCommand > 0 then
		' vi ska skicka tillbaka ett svar
		command = responseCommand
		responseCommand = 0
		state = responseState
		responseState = 0
		value = responseValue
		responseValue = 0
		pause 20
	else	
		' lyssna f�rst ifall det finns n�got meddelande p� programmeringskabeln
		sertxd (Xon)
		' om vi inte f�r n�got meddelande skena vidare till att lyssna p� n�tverket
		serrxd [cableTimeout], command, state
      	sertxd (Xoff)
      	
	
	end if
	
#ifdef debugMirror
	' enbart f�r debug
	toggle B.5
	command = "T"
	state = "1"
#endif
	
	if command > 0 then
		'sertxd("sending function:", #command,44, #state, "=",command,44,state,"\r\n")
		
		' vi ska s�nda ett meddelande p� n�tet
		byteOne = command
		byteTwo = state
		byteThree = value


		
		' r�kna fram kontrollf�lt
		gosub calcChkField
		byteChk = tmp2 ' tmp2 fylls i subrutinen calcChkField
		
		
		' v�nta s� att andra noder hinner k�ra sin mainloop
		pause networkDelay
		
_reSend:	if rxPin = 1 then
		' s�nd meddelande
			serout rxPinNumber, baudSetting, (byteOne, byteTwo, byteThree, byteChk)
			input rxPinNumber

			' lyssna ifall n�gon inte kan tolka det
			serin [12, spyOnNetwork], rxPinNumber, baudSetting, tmp1 '  (sendAgain)
			
			sertxd("sending again, senderErr\r\n")

			' det kunde de inte, s�nd igen efter en slumpvis l�ng paus
			tmp2 = 18
			gosub randomDelay
			goto _reSend
			
		else
			sertxd("sig.led. �r l�g\r\n")
			goto _reSend
		end if
	else	
		' nollst�ll f�r n�sta snurr
		gosub resetValues
	end if
	
	
	counter = 0
	
	'**** medveten "falligenom"
spyOnNetwork:
	byteOne = 0
	byteTwo = 0
	byteThree = 0
	byteChk = 0
	serin [serinTimeout, sendHeartbeat], rxPinNumber, baudSetting, byteOne, byteTwo, byteThree, byteChk
	
	' vi kan ha f�tt ta emot skit pga st�rningar i s�ndarkabeln, eller s� h�nger den sig i n�gon konstig loop
	' s�kerhetsvakta s� vi fr�gar bara om 5ggr
	if counter < 5 and byteOne > 0  then
		if byteThree > 0 then
			sertxd("fr�n n�tet:", byteOne, byteTwo, #byteThree, 13, 10)
		else
			sertxd("fr�n n�tet:", byteOne, byteTwo, 13,10)
		end if
		inc counter
		' om vi �r h�r s� har vi tagit emot n�got
		' kolla chksumma, omv�nt mot hur det gick till i noden som s�nde meddelandet
		gosub calcChkField
		if tmp1 <> byteChk then
			' vi har tagit emot det felaktigt
			pulsout chkSumErrPin, 6000 ' 60ms
			if rxPin = 1 then
				' be om att skicka igen
				serout rxPinNumber, baudSetting, (sendAgain)
				input rxPinNumber
			end if
			
			' lyssna igen
			goto spyOnNetwork
		end if
		
		' lagra v�rdena
		command = byteOne
		state   = byteTwo
		value   = byteThree
	end if
	
	' �r vi h�r s� har vi kommit hit p� en heartbeat fr�n andra noder
	' d� ska vi inte s�nda en heartbeat
	goto returnFromThis
	
sendHeartbeat:
	'sertxd("heartbeat\r\n")
	
	' s�nd en heartbeat, dvs.
	' l�t de andra noderna andas de ocks�
	tmp2 = 3
	'gosub randomDelay ' upp till 3ms
	if rxPin = 1 and command = 0 then
		serout rxPinNumber, baudSetting, (0, 0, 0, 0)
		input rxPinNumber
	end if
		
	
	' *** medveten falligenom
	
returnFromThis:
	' �terv�nd till main loopen
	if command > 0 then
			' meddela clienten att det har har tagits emot n�got
		' antingen fr�n n�tet eller fr�n programmeringskabeln
		if value > 0 then
			' finns �ven ett v�rde
			sertxd(command, state, "=",#value,"\r\n")
		else
			sertxd(command, state, "\r\n")
		end if
	end if
	return	
	
	
calcChkField:
	' r�kna fram kontrollf�lt
	tmp2 = byteOne * 64' 2 LSB till bit 7 och 8
	tmp1 = byteTwo * 16 ' 2 LSB till bit 5 och 6
	tmp2 = tmp2 + tmp1
	tmp1 = byteThree * 4 ' 2 LSB till bit 3 och 4
	tmp2 = tmp2 + tmp1
	' de 2 LSB bitarna �r inverterat kommando
	tmp1 = NOT byteOne
	tmp1 = tmp1 AND %00000011
	tmp2 = tmp1
	return
	
	
randomDelay:
	tmpW = time
	random tmpW
	if tmp2 > 32 then
		tmp2 = 32' vi kan max v�nta 32 ms
	      	     ' avsett hur random st�ller sig
	end if
	tmp1 = tmp1 / tmp2 ' vi kan max v�nta 32 ms
	      	     ' avsett hur random st�ller sig
	pause tmp1
	return