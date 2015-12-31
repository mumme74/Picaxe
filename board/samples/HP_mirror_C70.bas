' exempel som styr en 4 kablars backspegel
' bygger p� en v�nsterspegel till en C70 2006

' Eftersom vi inte har n�gra knappar p� detta 
' kretskortet anv�nder vikommunikationen med
' datorn via programmeringskabeln.Gl�m inte att
' st�lla in terminalen p� 4800baud

' skriv i terminalf�nstret i programming editor (tryck F8)
'  (X, Y, F och C ska vara sm� om det �r en h�ger spegel)
'  Y0<enter> = h�ger,    Y1<enter> = v�nster
'  X0<enter> = upp, 	   X1<enter> = ned
'  F0<enter> = f�ll in,  F1<enter> = f�ll ut
'  D0<enter> = v�rme av, D1<enter>= v�rme p�
'  L0<enter> = blink av, L1<enter> = blinker p�
'  S0<enter> = n�dlys av,S1<enter>  = n�dlys p� 
'  C<enter>  = avbryt p�g�ende r�relse
'
'  G0<enter> = l�s Y-pos l�gesgivare (ing�ng C.0)
'  G1<enter> = l�s X-pos l�gesgivare (ing�ng C.1)
'  G2<enter> = l�s temperaturen 	 (ing�ng C.2)

dirsB = %11111111
symbol up 	 	= %00010000
symbol down  	= %11100000
symbol left  	= %00100000
symbol right 	= %11010000
symbol foldOut	= %01000000
symbol foldIn	= %10110000
symbol cancel	= %00000000
symbol heatPin	= B.2
symbol turnPin 	= B.1
symbol safePin	= B.0
symbol command 	= b0
symbol state 	= b1
symbol motorPins      = b2
symbol timeout_ms	= w3
' v�nta i 400ms innan sertxd hoppar vidare
symbol timeoutValue = 400 

timeout_ms = timeoutValue

main:
    command = 0
    motorPins = 0
	
    serrxd [timeout_ms], command, #state
    timeout_ms = timeoutValue
     
   ' gosub debug_gui
    
	
    
    if command = "G" then
        if state = 0 then
            readadc C.0, b3
        else if state = 1 then
            readadc C.1, b3
        else if state = 2 then
            readadc C.2, b3
        end if
        ' s�nd tillbaka v�rdet och b�rja ny loop
        sertxd (command, #state, "=", #b3, "\r\n")
        goto main
		
    else if command = "D" then
    	  
        if state = 1 then 
            high heatPin
        else 
            low heatPin 
        end if
    else if command = "L" then
        if state = 1 then
            high turnPin
        else 
            low turnPin 
        end if
    else if command = "S" then
        if state = 1 then 
            high safePin
        else 
            low safePin 
        end if
    else if command = "Y" then
        if state = 1 then 
            motorPins = up
        else
            motorPins = down
        end if
    else if command = "X" then
        if state = 1 then
            motorPins = right
        else 
            motorPins = left
        end if
    else if command = "F" then
        if state = 1 then
            motorPins = foldOut
        else
            motorPins = foldIn
        end if
        timeout_ms = 2500 
    ' v�nta tills f�llning �r klar
    ' avbryt man�vrering om serrxd har timeout
    ' avbryt man�vrering om serrxd har timeout    
    else if command = "C" or command = 0 then
        ' avbryt p�g�ende man�vrering
        motorPins = cancel
    end if
    
   ' s�nd tillbaka vilket kommando som �r utf�rt
    if command > 0 then
	    sertxd (command, #state, "\r\n")
    end if
    
    ' �ndra bara de 4 motorutg�ngarna
    ' andv�nd bin�r AND (OCH grind)	
    state = outpinsB AND %00001111
    ' Ta med de 4 l�gra pinnarnas status
    outpinsB = motorPins OR state
    
    goto main


debug_gui:
	 ' f�r att testa funktionerna i GUIT
    b4 = b4 + 1
    if b4 > 10 then
    	b4 = 0
    	
    	if b5 = 1 then
    		b5 = 0
    	else 
    		b5 = 1
    	end if
    	
    	
      sertxd ("S", #b5, "\r\n")
      sertxd ("L", #b5, "\r\n")
      sertxd ("R", #b5, "\r\n")
      sertxd ("P", #b5, "\r\n")
      sertxd ("h", #b5, "\r\n")
      sertxd ("H", #b5, "\r\n")
      sertxd ("B", #b5, "\r\n")
      sertxd ("T", #b5, "\r\n")
      sertxd ("X", #b5, "\r\n")
      sertxd ("Y", #b5, "\r\n")
      sertxd ("x", #b5, "\r\n")
      sertxd ("y", #b5, "\r\n")
      sertxd ("F", #b5, "\r\n")
      sertxd ("f", #b5, "\r\n")
      sertxd ("D", #b5, "\r\n")
      sertxd ("C", #b5, "\r\n")
      sertxd ("c", #b5, "\r\n")
      sertxd ("M", #b5, "\r\n")
      sertxd ("G0=25", "\r\n")
      sertxd ("G1=225", "\r\n")
      sertxd ("g0=25", "\r\n")
      sertxd ("g1=225", "\r\n")
      sertxd ("G2=125", "\r\n")
      sertxd ("g2=105", "\r\n")
    end if
    return