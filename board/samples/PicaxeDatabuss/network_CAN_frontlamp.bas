'CAN test code

'SPI
' from https://www.kvaser.com/support/calculators/bit-timing-calculator/
' assume 8MHz crystall in mcp2515

'10 kbps
'CNF1/BRGCON1    b'00001111'     0x0F
'CNF2/BRGCON2    b'10111111'     0xBF
'CNF3/BRGCON3    b'00000111'     0x07
'
'20 kbps
'CNF1/BRGCON1    b'00000111'     0x07
'CNF2/BRGCON2    b'10111111'     0xBf
'CNF3/BRGCON3    b'00000111'     0x07
'
'50 kbps
'CNF1/BRGCON1    b'00000011'     0x03
'CNF2/BRGCON2    b'10101100'     0xAC
'CNF3/BRGCON3    b'00000111'     0x07
'
'100 kbps
'CNF1/BRGCON1    b'00000001'     0x01
'CNF2/BRGCON2    b'10101100'     0xAC
'CNF3/BRGCON3    b'00000111'     0x07
'
'125 kbps
'CNF1/BRGCON1    b'00000001'     0x01
'CNF2/BRGCON2    b'10011010'     0x9A
'CNF3/BRGCON3    b'00000111'     0x07
'
'250 kbps
'CNF1/BRGCON1    b'00000000'     0x00
'CNF2/BRGCON2    b'10011010'     0x9A
'CNF3/BRGCON3    b'00000111'     0x07
'
'500 kbps
'CNF1/BRGCON1    b'00000000'     0x00
'CNF2/BRGCON2    b'10001000'     0x88
'CNF3/BRGCON3    b'00000011'     0x03'

#define LEFT
'#define LOOPBACK

#ifdef LEFT
symbol blinker = "<"
#else
symbol blinker = ">"
#endif



' the communication driver  uses these
symbol send              = b0
symbol recv               = b1
symbol tmp               = b2
symbol command  = b3 ' used as CAN id
symbol state            = b4' used as state
symbol value            = b5 ' value from measurements
symbol tmp2            = b6

symbol CS = C.0  : symbol CS_PIN = pinC.0
symbol MOSI= C.6 : symbol MOSI_PIN = pinC.6
symbol MISO = C.7   : symbol MISO_PIN = pinC.7
symbol SCK = C.1 :symbol SCK_PIN = pinC.1
symbol canErrPin = B.0

dirsB = %11111111
dirsC = %01000011

' Read and Write Commands for SPI
symbol RESET_REG  = $C0
symbol READ_CAN   = $03
symbol WRITE_CAN  = $02

' READ CAN RX Buffers
symbol READ_RX_BUF_0_ID   = $90
symbol READ_RX_BUF_0_DATA = $92
symbol READ_RX_BUF_1_ID   = $94
symbol READ_RX_BUF_1_DATA = $96

' LOAD CAN TX BUFFERS
symbol LOAD_TX_BUF_0_ID   = $40
symbol LOAD_TX_BUF_0_DATA = $41
symbol LOAD_TX_BUF_1_ID   = $42
symbol LOAD_TX_BUF_1_DATA = $43
symbol LOAD_TX_BUF_2_ID   = $44
symbol LOAD_TX_BUF_2_DATA = $45

' SEND CAN TX BUFFERS
symbol SEND_TX_BUF_0 = $81
symbol SEND_TX_BUF_1 = $82
symbol SEND_TX_BUF_2 = $83

' OTHER COMMANDS
symbol READ_STATUS = $A0
symbol RX_STATUS   = $B0
symbol BIT_MODIFY  = $05

' REGISTERS
symbol CNF1     = $2A
symbol CNF2     = $29
symbol CNF3     = $28
symbol TXB0CTRL = $30
symbol TXB1CTRL = $40
symbol TXB2CTRL = $50
symbol RXB0CTRL = $60
symbol RXB0SIDH = $61
symbol RXB0DLC = $65
symbol RXB1CTRL = $70
symbol RXB1SIDH = $71
symbol RXB1DLC = $75
symbol TXB0SIDH = $31
symbol TXB1SIDH = $41
symbol TXB2SIDH = $51
symbol TXB0SIDL = $32
symbol TXB0DLC  = $35
symbol TXB1DLC  = $45
symbol TXB2DLC  = $55
symbol CANCTRL  = $0F
symbol CANSTAT  = $0E
symbol CANINTF  = $2E
symbol BFPCTRL  = $0C
symbol EFLG          = $2D

symbol MASK_0   = $20
symbol MASK_1   = $24
symbol FILTER_0 = $00
symbol FILTER_1 = $04
symbol FILTER_2 = $08
symbol FILTER_3 = $10
symbol FILTER_4 = $14
symbol FILTER_5 = $18

' transmission med programeringskabeln
symbol cableTimeout  = 50
symbol Xon              = 17
symbol Xoff             = 19

' initialize the CAN controller
gosub initCAN
'sertxd("reset\r\n")

main:
	'sertxd("in main\r\n")
	gosub errorCheck
	gosub pollInBox
	
	' lyssna först ifall det finns något meddelande på programmeringskabeln
	sertxd (Xon)
	' om vi inte får något meddelande skena vidare till att lyssna på nätverket
	serrxd [cableTimeout], command, state
	sertxd (Xoff)
	
	if command > 0 then
		gosub sendMsg
#ifndef LOOPBACK ' if we use loopback from can controller we want this cmd from the CAN controller
		gosub cmdToSerial ' echo back this command 
#endif
		gosub update
		gosub resetValues
	end if
	
	goto main
	
	
resetValues:
	' reset values
	command = 0
	state = 0
	value = 0
	return

update:
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
		
		' vårt protokoll är mellan asciichar 60 och 90
		state = state - 48 ' gör om från ascii nummer "0" -> 0
	
		if command = blinker or command = "F" then
			pinB.1 = state
		else if command = "H" then
			pinB.3 = state
		else if command = "@" then
			pinB.0 = state
		else if command = "L" then
			pinB.2 = state
		end if
	
	end if
	return

cmdToSerial:
	if command > 0 then
		if value > 0 then
			' has a value
			sertxd(command, state, "=",#value,"\r\n")
		else
			sertxd(command, state, "\r\n")
		end if
	end if
	return


' **** callback sub invoked from pollInbox when a msg is recieved from CAN
eventFromCAN:
	if command > 0 then
		gosub cmdToSerial
		gosub update
		gosub resetValues
		pause cableTimeout
	end if
	return 
	
' **** callback when a can error occurs
canError:
	' vi har tagit emot det felaktigt
	pulsout canErrPin, 6000 ' 60ms
	return


' ******************* start CAN driver code ****************************'
' checks for messages from CAN
' calls the callback sub eventFromCan
' it sets command, state and value recieved from CAN
pollInbox:
	gosub _readStatus
	tmp2 = recv
	tmp = tmp2 and %00000010
	if tmp > 0 then
		' msg in RXB1
		tmp = RXB1SIDH
		gosub _readRXBuf
		gosub eventFromCAN
	end if
	
	tmp = tmp2 and %00000001
	if tmp > 0 then
		' msg in RXB0
		tmp = RXB0SIDH
		gosub _readRXBuf
		gosub eventFromCAN
	endif
	return
	
' sends a message to CAN network
' command must be set i a protocol ID
' state is how the PID should change
' value is a measured value in response from a request
sendMsg:
	gosub _readStatus
	tmp = recv and %00001100 ' check if  TXB0 is ready to send
	if  tmp = %00001000 or tmp = 0 then
		 ' TXB0 req to send cleared and TXB0 interupt flag set (old msg send status)
		 tmp =  LOAD_TX_BUF_0_ID : gosub _loadTXBuf
		 tmp = SEND_TX_BUF_0 : gosub _sendTXBuf
		return
	end if
	
	tmp = recv and %00110000  ' is TXB1 ready to send?
	if tmp = %00100000 or tmp = 0 then '
		 tmp =  LOAD_TX_BUF_1_ID : gosub _loadTXBuf
		 tmp = SEND_TX_BUF_1 : gosub _sendTXBuf
		return
	end if

	tmp = recv  and %11000000  ' or TXB1 ready to send?
	if tmp = %10000000 or tmp = 0 then
		 tmp =  LOAD_TX_BUF_2_ID : gosub _loadTXBuf
		 tmp = SEND_TX_BUF_2 : gosub _sendTXBuf
		return
	end if
	
	' all buffers are full, cant send, wait 0.5s and try again
	sertxd ("CAN busy\r\n")
	pause 500
	goto sendMsg
	
' checks for can errors
errorCheck:
	low CS
	send = READ_CAN : gosub _transmit
	send = EFLG : gosub _transmit
	gosub _recieve
	high CS
	
	if recv > 0 then
		tmp = recv and %00100000
		if tmp > 0 then sertxd("tx err: bus off\r\n") : goto _errorCheck_out end if
		tmp = recv and %00010000
		if tmp > 0 then sertxd("tx passive err\r\n") : goto _errorCheck_out  end if
		tmp = recv and %00001000
		if tmp > 0 then sertxd("rx err\r\n") : goto _errorCheck_out  end if
		tmp = recv and %00000100
		if tmp > 0 then sertxd("tx warn\r\n") : goto _errorCheck_out  end if
		tmp = recv and %00000010
		if tmp > 0 then sertxd("rx warn\r\n") : goto _errorCheck_out  end if	
	end if
	' no error
	return
	
_errorCheck_out:
	' had a error
	gosub canError
	return
	
' must be called once to init controller, called before entering main loop
initCAN:
	' default settings
	high CS
	low SCK

	' first reset
	low CS
	send =  RESET_REG : gosub _transmit
	high CS
	pause 300

	' then config
	low CS
	send = Write_CAN:gosub _transmit
	send = CANCTRL:gosub _transmit
	send = %10010000:gosub _transmit ' go into config mode
	high CS
	
	'with 50 kbps
	'CNF1/BRGCON1    b'00000011'     0x03
	'CNF2/BRGCON2    b'10101100'     0xAC
	'CNF3/BRGCON3    b'00000111'     0x07

	low CS
	send = Write_CAN:gosub _transmit
	send = CNF1:gosub _transmit
	send = %00000011:gosub _transmit '$03
	high CS

	low CS
	send = Write_CAN:gosub _transmit
	send = CNF2:gosub _transmit
	send =  %10101100 :gosub _transmit '$AC
	high CS

	low CS
	send = Write_CAN:gosub _transmit
	send = CNF3:gosub _transmit
	send = %00000111:gosub _transmit '$07
	high CS
	
	low CS
	send = Write_CAN:gosub _transmit
	send = RXB0CTRL:gosub _transmit
	send = %01100100:gosub _transmit ' filter off, allow rollover into RXB1 if RXB0 is full
	high CS
	
	low CS
	send = Write_CAN:gosub _transmit
	send = RXB1CTRL:gosub _transmit
	send = %01100000:gosub _transmit ' filter off
	high CS
	
	low CS
	send = Write_CAN:gosub _transmit
	send = CANCTRL:gosub _transmit
#ifdef LOOPBACK
	send = %01000000:gosub _transmit ' go into loopback mode (silent line and echo own msg)
#else
	send = %00000000:gosub _transmit ' go into normal mode 
#endif
	high CS
	return
	

' *****************  start of private subs, not part of API ***************************************
_readStatus:
	low CS
	b0 = READ_STATUS:gosub _transmit
	gosub _recieve
	high CS
	return
	
_readRXBuf: 			
	' start by reading msg ID (we only use high bits)
	low CS
	send = READ_CAN: gosub _transmit
	send =  tmp : gosub _transmit
	gosub _recieve : command = recv
	high CS
		
	' read the data 
	low CS
	if  tmp > $70 then
		send =  $96 ' READ_TX1_buffer
	else 
		send = $92 ' READ_TX0_buffer
	end if
	gosub _transmit
	gosub _recieve : state = recv ' store state, byte 0
	gosub _recieve : value = recv ' store value, byte 1
	high CS ' mcp2515 should implictly mark this msg as read here
	return
	
_loadTXBuf:
	low CS
	' caller must have set send variable to correct addres
	send = tmp : gosub _transmit
	send = command : gosub  _transmit  ' TXBxSIDH
	send = 0 : gosub _transmit ' TXBxSIDL
	gosub _transmit ' TXBxEID8
	gosub _transmit ' TXBxEID0
	send = 2 : gosub _transmit ' TXBxDLC = 2 bytes length
	send = state : gosub _transmit ' byte 0
	send = value : gosub _transmit ' byte 1
	high CS
	return
	
_sendTXBuf:
	low CS
	send = tmp : gosub _transmit
	high CS
	return


_transmit:
	MOSI_PIN = bit7 : pulsout  SCK,1
	MOSI_PIN = bit6 : pulsout  SCK,1
	MOSI_PIN = bit5 : pulsout  SCK,1
	MOSI_PIN = bit4 : pulsout  SCK,1
	MOSI_PIN = bit3 : pulsout  SCK,1
	MOSI_PIN = bit2 : pulsout  SCK,1
	MOSI_PIN = bit1 : pulsout  SCK,1
	MOSI_PIN = bit0 : pulsout  SCK,1
	return

_recieve:
	bit15 = MISO_PIN : pulsout  SCK,1
	bit14 = MISO_PIN : pulsout  SCK,1
	bit13 = MISO_PIN : pulsout  SCK,1
	bit12 = MISO_PIN : pulsout  SCK,1
	bit11 = MISO_PIN : pulsout  SCK,1
	bit10 = MISO_PIN : pulsout  SCK,1
	bit9 = MISO_PIN : pulsout  SCK,1
	bit8 = MISO_PIN : pulsout  SCK,1
	return
