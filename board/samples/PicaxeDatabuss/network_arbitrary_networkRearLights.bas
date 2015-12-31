' avkommetera nedanst�nde rad f�r v�nster baklyckta
'#define left

' testfil f�r s�ndning och mottagning 
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

' transmission med programeringskabeln
symbol Xon              = 17
symbol Xoff             = 19

' control chars p� n�tverket
symbol ESC              = 11
symbol sendAgain        = 8 ' char cancel

symbol serinTimeout     = 70
symbol cableTimeout     = 8


' s�nd och mottagarpinne
symbol rxPin            = pinC.6 ' ej c.3, c.4 eller c.5
symbol rxPinNumber      = C.6
symbol chkSumErrPin     = B.0 ' flashar denna vid fel p� mottagning
symbol baudSetting      = T2400_4

symbol networkDelay     = 40 ' detta v�rde motsvarar hur l�ng tid det tar f�r den
                             ' s�ligaste noden i n�tverket att klara av sin mainloop
                             ' l�ng mainloop = kortare v�rde h�r



' dessa f�r v�rdet fr�n kommunikationsrutinen
symbol command          = b0
symbol state            = b1
symbol value            = b2




#ifdef left
	symbol blinker = "<"
#else
	symbol blinker = ">"
#endif

dirsB = %11111111

main:	
	gosub recieveNext
	
	if command >= 60 and command <= 90 then
		' v�rt protokoll �r mellan asciivhar 60 och 90
		state = state - 48 ' g�r om fr�n ascii nummer "0" -> 0
	end if
	
	if command = blinker then
		pinB.1 = state
	else if command = "=" then
		pinB.3 = state
	else if command = "@" then
		pinB.0 = state
	else if command = "R" then
		pinB.2 = state
	end if
	
		
	' ***************************************
	' f�r att retunera v�rden fr�n mainloopen
	' skriv:
	'    responseValue = value
	'    gosub haveResponseValue
	' ***************************************
	
	
	gosub resetValues
		
	goto main


resetValues:
	' nollst�ll f�r n�sta snurr
	command = 0	
	state   = 0
	value   = 0
	
	return	

haveResponseValue:
	' mellanlagra v�rden s� vi kan skicka ut dem p� linan
	responseCommand = command
	responseState = state
	return



recieveNext:

	if responseValue > 0 then
		' vi ska skicka tillbaka ett svar
		command = responseCommand
		responseCommand = 0
		state = responseState
		responseState = 0
		value = responseValue
		responseValue = 0
		pause 5
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
		sertxd("tagit emot:",#byteOne, #byteTwo, 13,10)
		inc counter
		' om vi �r h�r s� har vi tagit emot n�got
		' kolla chksumma, omv�nt mot hur det gick till i noden som s�nde meddelandet
		gosub calcChkField
		if tmp1 <> byteChk then
			' vi har tagit emot det felaktigt
			pulsout chkSumErrPin, 6000
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