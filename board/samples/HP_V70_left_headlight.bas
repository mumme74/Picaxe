' exempel som styr en str�lkastare
' bygger p� en v�nsterspegel till en C70 2006

' Eftersom vi inte har n�gra knappar p� detta 
' kretskortet anv�nder vikommunikationen med
' datorn via programmeringskabeln.Gl�m inte att
' st�lla in terminalen p� 4800baud

' skriv i terminalf�nstret i programming editor (tryck F8)
'  @0<enter> = park. av,      @1<enter> = park. p�
'  <0<enter> = V.blink av,    <1<enter> = V.blink p�
'  L0<enter> = halvljus av,   L1<enter> = halvljus p�
'  H0<enter> = helljus av,    H1<enter> = helljus p�
'  M[v�rde]<enter> = sp�nning i % av 12v till justermotor,
'    OBS!! [v�rde] �r EN bokstav
'     titta ASCII tabell f�r bokstavsv�rde.
'      f�r v�rde 33% skriv !	ex M!
'      f�r v�rde 48% skriv 0  ex M0
'      f�r v�rde 65% skriv A  ex MA
'      f�r v�rde 66% skriv B  ex MB
'      f�r v�rde 67% skriv C osv...


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
        ' g�r en sp�nningssignal PWM
        if state < 90 and state > 10 then
            ' state v�rde i %, exempel: 
            ' state=33 ger 33% (3volt av 12)
            pwmout pwmdiv16, B.6, 24, state
            ' switch freq = 2500Hz
            
        end if
    else 
        state = state - 48 ' g�r om fr�n ascii
        
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
    


   ' s�nd tillbaka vilket kommando som �r utf�rt
    if command > 0 then
	    sertxd(command, #state, "\r\n")
    end if
	
    goto main
