Set oShell = CreateObject("Wscript.Shell")
oShell.Run "RegSvr32 /u " & chr(34) & "NETComm.ocx" & chr(34) 