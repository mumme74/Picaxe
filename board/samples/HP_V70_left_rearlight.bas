' exempel som styr en strålkastare
' bygger på en vänsterspegel till en C70 2006

' Eftersom vi inte har några knappar på detta 
' kretskortet använder vikommunikationen med
' datorn via programmeringskabeln.Glöm inte att
' ställa in terminalen på 4800baud

' skriv i terminalfönstret i programming editor (tryck F8)
'  @0<enter> = park. av,      @1<enter> = park. på
'  <0<enter> = V.blink av,    <1<enter> = V.blink på
'  =0<enter> = bromsljus av,   =1<enter> = bromsljus på
'  R0<enter> = backljus av,    R1<enter> = backljus på



dirsB = %11111111

symbol parkPin	= B.0
symbol turnPin 	= B.1
symbol reversePin	= B.2
symbol brakePin	= B.3

symbol command = b0
symbol state = b1


main:
    command = 0
	
    serrxd [400], command, state
    state = state - 48 ' gör från ascii
    
    if command >0 then
        
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
        else if command = "=" then
            if state = 1 then 
                high brakePin
            else 
                low brakePin 
            end if
        else if command = "R" then
            if state = 1 then
                high reversePin
            else 
                low reversePin
            end if
        end if 
    end if	    
    


   ' sänd tillbaka vilket kommando som är utfört
    if command > 0 then
	    sertxd(command, #state, "\r\n")
    end if
	
    goto main
