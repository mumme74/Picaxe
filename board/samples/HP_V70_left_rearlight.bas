' exempel som styr en str�lkastare
' bygger p� en v�nsterspegel till en C70 2006

' Eftersom vi inte har n�gra knappar p� detta 
' kretskortet anv�nder vikommunikationen med
' datorn via programmeringskabeln.Gl�m inte att
' st�lla in terminalen p� 4800baud

' skriv i terminalf�nstret i programming editor (tryck F8)
'  @0<enter> = park. av,      @1<enter> = park. p�
'  <0<enter> = V.blink av,    <1<enter> = V.blink p�
'  =0<enter> = bromsljus av,   =1<enter> = bromsljus p�
'  R0<enter> = backljus av,    R1<enter> = backljus p�



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
    state = state - 48 ' g�r fr�n ascii
    
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
    


   ' s�nd tillbaka vilket kommando som �r utf�rt
    if command > 0 then
	    sertxd(command, #state, "\r\n")
    end if
	
    goto main
