' exempel som styr en strålkastare
' bygger på en vänsterspegel till en C70 2006

' Eftersom vi inte har några knappar på detta 
' kretskortet använder vikommunikationen med
' datorn via programmeringskabeln.Glöm inte att
' ställa in terminalen på 4800baud

' skriv i terminalfönstret i programming editor (tryck F8)
'  @0<enter> = park. av,      @1<enter> = park. på
'  <0<enter> = V.blink av,    <1<enter> = V.blink på
'  L0<enter> = halvljus av,   L1<enter> = halvljus på
'  H0<enter> = helljus av,    H1<enter> = helljus på
'  M[värde]<enter> = spänning i % av 12v till justermotor,
'    OBS!! [värde] är EN bokstav
'     titta ASCII tabell för bokstavsvärde.
'      för värde 33% skriv !	ex M!
'      för värde 48% skriv 0  ex M0
'      för värde 65% skriv A  ex MA
'      för värde 66% skriv B  ex MB
'      för värde 67% skriv C osv...


dirsB = %11111111

symbol parkPin	= pinB.0
symbol turnPin 	= pinB.1
symbol lowPin	= pinB.2
symbol highPin	= pinB.3
symbol lengthPin	= pinB.4
symbol command = b0
symbol state = b1


main:
    command = 0
	
    serrxd [400], command, state
	

    if command = "M" then
        ' gör en spänningssignal PWM
        if state < 90 and state > 10 then
            ' state värde i %, exempel: 
            ' state=33 ger 33% (3volt av 12)
            pwmout pwmdiv16, B.6, 24, state
            ' switch freq = 2500Hz
            
        end if
    else 
        state = state - 48 ' gör om från ascii
        
        if command = "@" then
        	parkPin = state
        else if command = "<" then
            turnPin = state
        else if command = "L" then
            lowPin  = state
        else if command = "H" then
            highPin = state
        end if 
    end if	    
    


   ' sänd tillbaka vilket kommando som är utfört
    if command > 0 then
	    sertxd(command, #state, "\r\n")
    end if
	
    goto main
