' exempel som styr en 4 kablars backspegel
' bygger på en vänsterspegel till en C70 2006

' Eftersom vi inte har några knappar på detta 
' kretskortet använder vikommunikationen med
' datorn via programmeringskabeln.Glöm inte att
' ställa in terminalen på 4800baud

' skriv i terminalfönstret i programming editor (tryck F8)
'  (X, Y, F och C ska vara små om det är en höger spegel)
'  Y0<enter> = höger,    Y1<enter> = vänster
'  X0<enter> = upp, 	   X1<enter> = ned
'  F0<enter> = fäll in,  F1<enter> = fäll ut
'  D0<enter> = värme av, D1<enter>= värme på
'  L0<enter> = blink av, L1<enter> = blinker på
'  S0<enter> = nödlys av,S1<enter>  = nödlys på 
'  C<enter>  = avbryt pågående rörelse
'
'  G0<enter> = läs Y-pos lägesgivare (ingång C.0)
'  G1<enter> = läs X-pos lägesgivare (ingång C.1)
'  G2<enter> = läs temperaturen 	 (ingång C.2)

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
' vänta i 400ms innan sertxd hoppar vidare
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
        ' sänd tillbaka värdet och börja ny loop
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
    ' vänta tills fällning är klar
    ' avbryt manövrering om serrxd har timeout
    ' avbryt manövrering om serrxd har timeout    
    else if command = "C" or command = 0 then
        ' avbryt pågående manövrering
        motorPins = cancel
    end if
    
   ' sänd tillbaka vilket kommando som är utfört
    if command > 0 then
	    sertxd (command, #state, "\r\n")
    end if
    
    ' ändra bara de 4 motorutgångarna
    ' andvänd binär AND (OCH grind)	
    state = outpinsB AND %00001111
    ' Ta med de 4 lägra pinnarnas status
    outpinsB = motorPins OR state
    
    goto main


debug_gui:
	 ' för att testa funktionerna i GUIT
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