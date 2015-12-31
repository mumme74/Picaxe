' bouncer för GUI exemplen
dirsB = %11111111

symbol char1 = b0
symbol char2 = b1
symbol char3 = b2
symbol char4 = b3
symbol char5 = b4
symbol char6 = b6
symbol newrow = b7
symbol randStripped = b8
symbol rand = w5

main:
	char1 = 0
	char3 = 0
	char4 = 0
	char5 = 0
	char6 = 0	
	b4 = 0
	

	serrxd [200], char1, char2, char3, char4', char5, char6
	char2 = char2 - 48

	
	if char3 = "=" then
		serrxd [20], char4
		sertxd ("[=", char4, "]")
		b4 = 1
	end if
	if char1 > 0 then
		if char1 = "G" or char1 = "g" then
			random rand
			randStripped = rand
			sertxd (char1, #char2, "=", #randStripped, "|")
		else 
			sertxd (char1, #char2, "|")
		end if
		b4 = 1
	
		sertxd("{ch3:", #char3, "}","{ch4:", #char4, "}")',"{ch5:", char5, "}","{ch6:", char6, "}")
	end if
	

	
	if b4 = 1 then
		sertxd("\r\n")
	end if
	pause 1000
	
	goto main