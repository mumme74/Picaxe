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

symbol parkPin	= B.0
symbol turnPin 	= B.1
symbol lowPin	= B.2
symbol highPin	= B.3
symbol lengthPin	= B.4
symbol command = b0
symbol state = b1


main:
    command = 0
	
    serrxd [400], command, state
	

    if command = "A" then
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
            if state = 1 then 
                high parkPin
            else 
                low parkPin 
            end if
        else if command = "<" then
            if state = 1 then
                high turnPin
            else 
                low turnPin 
            end if
        else if command = "L" then
            if state = 1 then 
                high lowPin
            else 
                low lowPin 
            end if
        else if command = "H" then
            if state = 1 then
                high highPin
            else 
                low highPin
            end if
        end if 
    end if	    
    


   ' sänd tillbaka vilket kommando som är utfört
    if command > 0 then
	    sertxd(command, #state, "\r\n")
    end if
	
    goto main
