' avkommentera nedanstående rad för vänster spegel
'#define leftMirror

' testfil för sändning och mottagning 

'************
'*  ändra ej dessa!!
symbol byteOne          = b27 
symbol byteTwo          = b26
symbol byteThree        = b25
symbol byteChk          = b24
symbol responseCommand  = b23 ' endast som svar på en förfrågan
symbol responseState    = b22
symbol responseValue    = b21
symbol counter          = b20
symbol tmp2             = b19
symbol tmp1             = b18
symbol tmpW             = w9 'b 18 & b19 
symbol serinTimeout     = 70
symbol cableTimeout     = 8
symbol baudSetting      = N2400_4

' transmission med programeringskabeln
symbol Xon              = 17
symbol Xoff             = 19

' control chars på nätverket
symbol ESC              = 11
symbol sendAgain        = 8 ' char cancel
'****************
'**** slut på fasta inställningar för nätverket


' sänd och mottagarpinne
symbol rxPin            = pinC.6 ' ej c.3, c.4 eller c.5
symbol rxPinNumber      = C.6
symbol chkSumErrPin     = B.0 ' flashar denna vid fel på mottagning
symbol ioPin            = pinC.7
symbol ioPinNumber      = C.7
symbol networkDelay     = 25 ' detta värde motsvarar hur lång tid det tar för den
                             ' söligaste noden i nätverket att klara av sin mainloop
                             ' lång mainloop = kortare värde här




' dessa får värdet från kommunikationsrutinen
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
symbol foldTime	= 2500 ' tiden för att fälla in eller ut spegeln
symbol heatPin	= pinB.2
symbol turnPin 	= pinB.1
symbol safePin	= pinB.0
symbol motorPins  = b3
symbol stopCounter = b4
symbol moveTime   = 2 ' motorerna flyttar sig i antal hjärtslag på nätet



#ifdef leftMirror
	symbol blinkerKey = "<"
	symbol Xkey = "X"
	symbol Ykey = "Y"
	symbol readKey = "W"
#else
	symbol blinkerKey = ">"
	symbol Xkey = "V"
	symbol Ykey = "U"
	symbol readKey = "T"
#endif

main:
    gosub resetValues
	
    gosub recieveNext
    
    if command >= 60 then
    	state = state - 48 ' ascii till värde
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
            
            ' sänd tillbaka värdet ut på nätet
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
    ' avbryt manövrering om serrxd har timeout    
    else if command = "Q" or stopCounter = 0 then
        ' avbryt pågående manövrering
        motorPins = cancel
    end if


    ' ändra bara de 4 motorutgångarna
    ' andvänd binär AND (OCH grind)	
    state = outpinsB AND %00001111
    ' Ta med de 4 lägra pinnarnas status
    outpinsB = motorPins OR state
	
    if command = "Z" then
        pause foldTime ' vänta tills fällning är klar
    end if
	
    goto main



resetValues:
	' nollställ för nästa snurr
	command = 0	
	state   = 0
	value   = 0
	
	return	





recieveNext:
	output ioPinNumber
	ioPin = 0
	
	if responseCommand > 0 then
		' vi ska skicka tillbaka ett svar
		command = responseCommand
		responseCommand = 0
		state = responseState
		responseState = 0
		value = responseValue
		responseValue = 0
		pause 30 ' så det tar samma tid som ett vanligt meddelande från clienten
	else	
		' lyssna först ifall det finns något meddelande på programmeringskabeln
		sertxd (Xon)
		' om vi inte får något meddelande skena vidare till att lyssna på nätverket
		serrxd [cableTimeout], command, state
      	sertxd (Xoff)
      	
	end if
	
'#ifdef left
	' enbart för debug
'	toggle B.5
'	command = "@"
'	state = pinB.5 + 48
'#endif
	
	if command > 0 then
		'sertxd("sending function:", #command,44, #state, "=",command,44,state,"\r\n")
		
		' vi ska sända ett meddelande på nätet
		byteOne = command
		byteTwo = state
		byteThree = value


		
		' räkna fram kontrollfält
		gosub calcChkField
		byteChk = tmp2 ' tmp2 fylls i subrutinen calcChkField
		
		' vänta så att andra noder hinner köra sin mainloop
_reSend:	pause networkDelay
		
		if rxPin = 1 then

		' sänd meddelande
			ioPin = 1
			serout rxPinNumber, baudSetting, (byteOne, byteTwo, byteThree, byteChk)
			input rxPinNumber
			ioPin = 0
			' lyssna ifall någon inte kan tolka det
			serin [12, spyOnNetwork], rxPinNumber, baudSetting, (sendAgain)
			
			
			sertxd("sending again, senderErr\r\n")

			' det kunde de inte, sänd igen efter en slumpvis lång paus
			tmp2 = 18
			gosub randomDelay
			goto _reSend
			
		else
			sertxd("sig.led. är låg\r\n")
			goto _reSend
		end if
	else	
		' nollställ för nästa snurr
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
	'sertxd("after timeout", 13,10)
	' vi kan ha fått ta emot skit pga störningar i sändarkabeln, eller så hänger den sig i någon konstig loop
	' säkerhetsvakta så vi frågar bara om 5ggr
	if counter < 5 and byteOne > 0  then
		if byteThree > 0 then
			sertxd("från nätet:", byteOne, byteTwo, #byteThree, 13, 10)
		else
			sertxd("från nätet:", byteOne, byteTwo, 13,10)
		end if
		inc counter
		' om vi är här så har vi tagit emot något
		' kolla chksumma, omvänt mot hur det gick till i noden som sände meddelandet
		gosub calcChkField
		if tmp1 <> byteChk then
			' vi har tagit emot det felaktigt
			pulsout chkSumErrPin, 6000 ' 60ms
			if rxPin = 1 then
				' be om att skicka igen
				ioPin = 1
				serout rxPinNumber, baudSetting, (sendAgain)
				input rxPinNumber
				ioPin = 0
			end if
			
			' lyssna igen
			goto spyOnNetwork
		end if
		
		' lagra värdena
		command = byteOne
		state   = byteTwo
		value   = byteThree
	end if
	
	' är vi här så har vi kommit hit på en heartbeat från andra noder
	' då ska vi inte sända en heartbeat
	goto returnFromThis
	
sendHeartbeat:
	'sertxd("heartbeat\r\n")
	
	' sänd en heartbeat, dvs.
	' låt de andra noderna andas de också
	tmp2 = 3
	'gosub randomDelay ' upp till 3ms
	' sänd bara heartbeat när vi inte själva har sänt i denna loop
	if rxPin = 1 and command = 0 then
		ioPin = 1
		serout rxPinNumber, baudSetting, (0, 0, 0, 0)
		input rxPinNumber
		ioPin = 0
	end if
	'input rxPinNumber
		
	
	' *** medveten falligenom
	
returnFromThis:
	' återvänd till main loopen
	if command > 0 then
		' meddela clienten att det har har tagits emot något
		' antingen från nätet eller från programmeringskabeln
		if value > 0 then
			' finns även ett värde
			sertxd(command, state, "=",#value,"\r\n")
		else
			sertxd(command, state, "\r\n")
		end if
	end if
	return	
	
	
calcChkField:
	' räkna fram kontrollfält
	tmp2 = byteOne * 64' 2 LSB till bit 7 och 8
	tmp1 = byteTwo * 16 ' 2 LSB till bit 5 och 6
	tmp2 = tmp2 + tmp1
	tmp1 = byteThree * 4 ' 2 LSB till bit 3 och 4
	tmp2 = tmp2 + tmp1
	' de 2 LSB bitarna är inverterat kommando
	tmp1 = NOT byteOne
	tmp1 = tmp1 AND %00000011
	tmp2 = tmp1
	return
	
	
randomDelay:
	tmpW = time
	random tmpW
	if tmp2 > 32 then
		tmp2 = 32' vi kan max vänta 32 ms
	      	     ' avsett hur random ställer sig
	end if
	tmp1 = tmp1 / tmp2 ' vi kan max vänta 32 ms
	      	     ' avsett hur random ställer sig
	pause tmp1
	return