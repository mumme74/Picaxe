' avkommentera nedanstånde rad för vänster strålkastare
'#define left


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
symbol ioPin            = pinC.7
symbol ioPinNumber      = C.7
symbol chkSumErrPin     = B.0 ' flashar denna vid fel på mottagning

symbol networkDelay     = 30 ' detta värde motsvarar hur lång tid det tar för den
                             ' söligaste noden i nätverket att klara av sin mainloop
                             ' lång mainloop = kortare värde här




' dessa får värdet från kommunikationsrutinen
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
	gosub resetValues	
	
	gosub recieveNext
	
	if command >= 60 and command <= 90 then
		if command = "M" then
			' ljusjustering
			if state > 90 then
				state = 90
			else if state < 10 then
				state = 10
			end if
			
			pwmout pwmdiv16, B.6, 25, state
		end if
		
		' vårt protokoll är mellan asciivhar 60 och 90
		state = state - 48 ' gör om från ascii nummer "0" -> 0
	
		if command = blinker then
			pinB.1 = state
		else if command = "H" then
			pinB.3 = state
		else if command = "@" then
			pinB.0 = state
		else if command = "L" then
			pinB.2 = state
		end if
	
	end if
		
	' ***************************************
	' för att retunera värden från mainloopen
	' skriv:
	'    responseValue = value
	' ***************************************
		
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
		pause 20
	else	
		' lyssna först ifall det finns något meddelande på programmeringskabeln
		sertxd (Xon)
		' om vi inte får något meddelande skena vidare till att lyssna på nätverket
		serrxd [cableTimeout], command, state
      	sertxd (Xoff)
      	
	
	end if
	
#ifdef debugMirror
	' enbart för debug
	toggle B.5
	command = "W"
	state = "1"
#endif
	
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
		pause networkDelay
		
_reSend:	if rxPin = 1 then
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
	if rxPin = 1 and command = 0 then
		ioPin = 1
		serout rxPinNumber, baudSetting, (0, 0, 0, 0)
		input rxPinNumber
		ioPin = 0
	end if
		
	
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