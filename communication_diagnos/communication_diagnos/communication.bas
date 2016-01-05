' exempel med kommunikation mellan dator piaxekort
' 
' protokoll:
'     i terminalfönstret (F8 i Programming editor)
'     xyz
'
'     där x kan vara: i eller u, i = ingång, u = utgång
'     och y kan vara: 0 - 7 dvs in eller utgång
'        OBS en picaxe18M 
'        har inga ingångar på 3 och 4 
'		
'     och z kan vara:
'        om x = i dvs ingång så kan z vara: 
'               d för digital signal, 
'               s för ad steg 0 - 255 steg
'               v för spänning (0-4,5volt)
'                   OBS! en picaxe18M  
'                   kan bara AD omvandla på 
'                   ingångarna 0,1,2
'
'        om x = u dvs utgång så kan z vara:
'               d för digital utgång (1 eller 0, får du
'                   mata in senare)
'               t för ljud utgång 
'                   (tonläge matas in senare)
'               p för pwm utgång
'                   (0-100 steg på dutycycle)
'               s för servo (läge matas in senare)
'
'     exempel:
'        i6d -> ger digitalvärdet på ingång 6 
'                   (switch på tutorial board)
'        i2s -> ger analog värdet på ingång 2 
'                   (LDR på tutorial board)
'        i0v -> ger volt värdet på ingång 0
'
'        u7d -> initiera utgång 7 för digital signal
'        u6t -> initiera utgång 6 för ljud 
'        u4s -> initiera utgång 4 för servo	
dirsB = %11111111 ' alla portB som utgångar

symbol outputs = b13
outpinsB = 0 ' init all low
setfreq m8 ' set baudrate to 9600

main:
    ' lyssna på kommando från datorn
    ' alla kommandon måste föregås av ordet "kommando " 
    ' men inklusive mellanslaget i slutet och små 
    ' bokstäver, exclusive citattecken. Efter att 
    ' "kommando " tagits emot, petas tre bokstäver 
    ' (characters) in i b0, b1, b2
    sertxd ("\r\n$>\r\n")
    serrxd b0, b1, b2

    'toggle 6
		
    ' gör om värdet i b1 till heltal istället för 
    ' en ascii char
    b1 = b1 - 0x30
    if b1 > 7 then
        sertxd ("fel:", #b1, "\r\n")
        toggle B.7
        toggle B.6
        goto main
    end if
	
    if b0 = "i" then ' i = ingång 0
        ' skicka tillbaka värdet på ingång 0
	

        if b2 = "d" then
            goto digitalRead 
        else
            ' vi vill ha analogsteg eller värden
            if b2 = "s" then 
                ' skicka tillbaka som steg
                goto analogReadSteps
            else	
                ' skicka tillbaka som volt
                goto analogReadVolt
            end if
        end if
	
    else if b0 = "u" then ' u = utgång
        sertxd ("?\r\n")
        serrxd b3
		
        if b2 = "d" then
            ' digital utgång
            goto digitalOut
        else if b2 = "t" then
            ' ton utgång
            sound b1, (b3, 100)
        else if b2 = "p" then 
            ' pwm utgång 
            if b3 = 0 then
                pwmout b1, 0, 0
            else
                w2 = b3 * 10 ' duty 0-100 dvs
                ' 10 bitar max 1000
                pwmout B.3, 249, w2' 8kHz i 8MHz,
                '  4kHz i 4MHz resonator
            end if
        else 
            ' s servo
            ' gå inte utanför maxvärdet
            if b3 < 75 then
                b3 = 75
            else if b3 > 225 then
                b3 = 225
            end if
			
            servo b1, b3
        end if
    end if
    goto main
	

digitalRead:
    ' gör om till binär representation, ex 
    '	7 -> 10000000, 4->0001000, 1->00000010
    lookup b1, (%00000001, %00000010, %00000100, %00001000, %00010000, %00100000, %01000000, %10000000), b3
	
    ' AND krets, ta bara det benet vi vill läsa
    b2 = pinsB AND b3 
    if b2 > 0 then
        b2 = 1
    end if
	
    'gör om heltalsvärdet till ascii ex. 0 -> "0"
    sertxd ("i", #b1, "=", #b2, "\r\n") 
    goto main


readAnalog:
	' läs analogvärdet från vald ingång
	if b1 = 0 then
		readadc C.0, b2
	elseif b1 = 1 then
		readadc C.1, b2
	elseif b1 = 2 then
		readadc C.2, b2
	end if
	return
	
	
analogReadSteps:
    gosub readAnalog
    sertxd  ("i", #b1, "=", #b2, "\r\n")
	
    goto main
analogReadVolt:
    ' Denna algorim bygger på att matningsspänningen 
    ' 4,5Volt. Eftersom kretskortet matas med batterier 
    ' kommer denna variera, därför varierar även volten.
    ' Prova att kontrollera nogrannheten med en multimeter
    ' Det går naturligtvis bygga om så att referens-
    ' spänningen (matningen) blir 5V och du kan sätta dit 
    ' en spänningstabilisator på dit kretskort. 
    ' Då stämmer denna funktion bättre än nu

    gosub readAnalog
    ' volt värdet är max 4,5Volt dvs 255 = 4,5V, 
    '    127 = 2,25V, 0 = 0V
    ' ta 16 bitars variabler så vi inte flödar över
    ' 4,5 * 10000 = 45000 / 255 = 176,4705882 avrundat 176
    ' voltvärdet är då b2 * 176 / 10000
    '    exempel b2=255 -> 
    '        255 * 176 = 44880 -> 44880 / 10 = 4448,8 mV
    '    tyvärr måste vi avrunda till 176 därför slår 
    '    spänningen med 052,2 mV
	
    w2 = b2 * 176 / 10
    sertxd ("i", #b1, "=", #w2, "mV", "\r\n")
    goto main
    '  kuriosa:
    '    detta är ett av de ställen där mer avancerade 
    '    programeringsspråk hjälper till, där finns
    '    decimaltal. Decimaltal kallas flyttal(float)
    '    och i språket C finns en datatyp som heter float
    '    Dvs. att decimaltecknet kan flyta. 

				 
digitalOut:
    ' gör om från ascii till heltal ex. "0" -> 0
    b3 = b3 - 0x30
	
    ' gör om till binär representation
    '  ex 7 -> 10000000, 4->0001000, 1->00000010
    lookup b1, (%00000001, %00000010, %00000100, %00001000, %00010000, %00100000, %01000000, %10000000), b2

	
    if b3 > 0 then
        ' binär OCH är samma som en OR krets 
        outpinsB = outpinsB OR b2  
    else
        b2 = b2 AND %11111111
        b2 = NOT b2
        ' samma som en NOR krets
        outpinsB = outpinsB AND b2 
    end if
    goto main
