' avkommentera nedanst�ende rad f�r v�nster spegel
'#define leftMirror

' testfil f�r s�ndning och mottagning 

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
symbol rxPin            = pinC.6 ' ej c.3, c.4 eller c.5
symbol rxPinNumber      = C.6
symbol chkSumErrPin     = B.0 ' flashar denna vid fel p� mottagning

symbol networkDelay     = 30 ' detta v�rde motsvarar hur l�ng tid det tar f�r den
                             ' s�ligaste noden i n�tverket att klara av sin mainloop
                             ' l�ng mainloop = kortare v�rde h�r




' dessa f�r v�rdet fr�n kommunikationsrutinen
symbol command          = b0
symbol state            = b1
symbol value            = b2


dirsB = %11111111

symbol up 	 	= %00010000
symbol down  	= %11100000
symbol left  	= %00100000
symbol right 	= %11010000
symbol foldOut	= %01000000
symbol foldIn	= %10110000
symbol cancel	= %00000000
symbol foldTime	= 2500 ' tiden f�r att f�lla in eller ut spegeln
symbol heatPin	= pinB.2
symbol turnPin 	= pinB.1
symbol safePin	= pinB.0
symbol motorPins  = b3
symbol stopCounter = b4
symbol moveTime   = 2 ' motorerna flyttar sig i antal hj�rtslag p� n�tet



#ifdef leftMirror
	symbol blinkerKey = "<"
	symbol Xkey = "X"
	symbol Ykey = "Y"
	symbol readKey = "W"
#else
	symbol blinkerKey = ">"
	symbol Xkey = "U"
	symbol Ykey = "V"
	symbol readKey = "T"
#endif

main:
    gosub resetValues
	
    gosub recieveNext
    
    if command >= 60 then
    	state = state - 48 ' ascii till v�rde
    end if
    
    if stopCounter > 0 then
       dec stopCounter ' -1
    end if
	
    if command = readKey then
    	  if value = 0 then
            if state = 0 then
                readadc C.0, responseValue
            else if state = 1 then
                readadc C.1, responseValue
            else if state = 2 then
                readadc C.2, responseValue
            end if
            
            ' s�nd tillbaka v�rdet ut p� n�tet
            responseCommand = command
            responseState = state + 48
        end if
        goto main
		
    else if command = "S" then
        heatPin  = state
    else if command = blinkerKey then
        turnPin = state
    else if command = "P" then
        safePin = state
    else if command = Xkey then
        if state = 1 then 
            motorPins = up
        else
            motorPins = down
        end if
        stopCounter = moveTime
    else if command = Ykey then
        if state = 1 then
            motorPins = right
        else 
            motorPins = left
        end if
        stopCounter = moveTime
    else if command = "Z" then
        if state = 1 then
            motorPins = foldOut
        else
            motorPins = foldIn
        end if
    ' avbryt man�vrering om serrxd har timeout    
    else if command = "Q" or stopCounter = 0 then
        ' avbryt p�g�ende man�vrering
        motorPins = cancel
    end if


    ' �ndra bara de 4 motorutg�ngarna
    ' andv�nd bin�r AND (OCH grind)	
    state = outpinsB AND %00001111
    ' Ta med de 4 l�gra pinnarnas status
    outpinsB = motorPins OR state
	
    if command = "Z" then
        pause foldTime ' v�nta tills f�llning �r klar
    end if
	
    goto main



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
		pause 20 ' s� det tar samma tid som ett vanligt meddelande fr�n clienten
	else	
		' lyssna f�rst ifall det finns n�got meddelande p� programmeringskabeln
		sertxd (Xon)
		' om vi inte f�r n�got meddelande skena vidare till att lyssna p� n�tverket
		serrxd [cableTimeout], command, state
      	sertxd (Xoff)
      	
	end if
	
'#ifdef left
	' enbart f�r debug
'	toggle B.5
'	command = "@"
'	state = pinB.5 + 48
'#endif
	
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
	' s�nd bara heartbeat n�r vi inte sj�lva har s�nt i denna loop
	if rxPin = 1 and command = 0 then
		serout rxPinNumber, baudSetting, (0, 0, 0, 0)
		input rxPinNumber
	end if
	input rxPinNumber
		
	
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