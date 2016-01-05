# -*- coding: utf-8 -*-
import json
import sys
import subprocess
import serial

import os
# chose an implementation, depending on os
if os.name == 'nt': #sys.platform == 'win32':
  from serial.tools.list_ports_windows import *
elif os.name == 'posix':
  from serial.tools.list_ports_posix import *

try:
  unicode
except (NameError, AttributeError):
  def unicode(x):
    return x # for Python 3


from SimpleWebSocketServer.SimpleWebSocketServer import WebSocket, SimpleWebSocketServer
HTTP_PORT = 8000
WS_PORT = 8080



class PicaxeInterface(WebSocket):
  port = None # the serial port instance
  def handleMessage(self):
    if self.data is None:
      #invalid
      return
    
    #print self.data
    reqObj = json.loads(str(self.data))
    print (reqObj)
    
    
    if not 'id' in reqObj:
      print ("no id ", reqObj)
      return # invalid
    
    try:
      args = None
      if 'args' in reqObj:
        args = reqObj['args']
      retData = self._doCommand(reqObj['cmd'], args)

      # echo message back to client
      msg = json.dumps({'id': reqObj['id'], 'data': retData})
      self.sendMessage(unicode(msg))
      print(msg)
    except:
      #print(sys.exc_info()[1])
      import traceback
      exc_type, exc_obj, exc_tb = sys.exc_info()
      fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
      print(exc_type,sys.exc_info()[1],fname, exc_tb.tb_lineno)
      print(traceback.format_exc())

      
  def handleConnected(self):
    msg = json.dumps({"connected": self.address})
    self.sendMessage(unicode(msg))
    #print(msg)
    print(self.address, 'connected')
      
  def handleClose(self):
    msg = json.dumps({"disconnected": self.address})
    #print(msg)
    self.sendMessage(unicode(msg))
    print(self.address, 'closed')

  def _doCommand(self, cmd, args = None):
    if cmd == "listSerialPorts":
      return self._scanPorts()
    elif cmd == "setSerialPort":
      # connect to serial port
      self.port = serial.Serial()
      self.port.baudrate = args['baudrate']
      self.port.port = args['port']
      self.port.xonxoff = args['xonxoff']
      self.port.timeout = args['timeout']
      self.port.open()
      return True
    
    else:
      # send command to picaxe
      if self.port and self.port.writable():
        self.port.flushInput()
        self.port.write(str(cmd).encode('iso-8859-1'))
        res = self.port.read(20).decode('iso-8859-1')
        #print("reponse to " + cmd + " was: " + res)
        return res
      else:
        print("port not opened, aborting write")
        return ""
      
  def _scanPorts(self):
    available = []
    default = -1
    iterator = sorted(comports())
    for port, desc, hwid in iterator:
      #print("%-20s" % (port,))
      #print("    desc: %s" % (desc,))
      #print("    hwid: %s" % (hwid.upper(),))
      #print(hwid[-9:])
      available.append((port, port))
      if (('USB VID:PID=0403:BD90' in hwid.upper()) or 
          ('USB VID:PID=403:BD90' in hwid.upper())):
        default = len(available) - 1
    return {'ports': available, 'default': default }

def printTrace():
  import traceback, os
  exc_type, exc_obj, exc_tb = sys.exc_info()
  fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
  print(exc_type,sys.exc_info()[1],fname, exc_tb.tb_lineno)
  print(traceback.format_exc())



if __name__ == "__main__":
  #start http server as a subprocess
  if sys.version_info[0] >= 3:
    subprocess.Popen("cd gui && python -m http.server " + str(HTTP_PORT), shell=True)
  else:
    subprocess.Popen("cd gui && python -m SimpleHTTPServer " + str(HTTP_PORT), shell=True)
  
  # websocket server
  server = SimpleWebSocketServer('', WS_PORT, PicaxeInterface)
  server.serve()
