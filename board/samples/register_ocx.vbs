Set oShell = CreateObject("Wscript.Shell")
oShell.Run "RegSvr32  " & chr(34) & "NETComm.ocx" & chr(34) 