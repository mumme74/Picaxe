# -*- coding: utf-8 -*-
import json
import sys
import subprocess
import serial
import re

import os
# chose an implementation, depending on os
if os.name == 'nt': #sys.platform == 'win32':
  from serial.tools.list_ports_windows import *
elif os.name == 'posix':
  from serial.tools.list_ports_posix import *
  
from serial.serialutil import *

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
    
    
    args = None
    if 'args' in reqObj:
      args = reqObj['args']
    
    if reqObj['cmd'] == "listSerialPorts":
      data = self._scanPorts()
    elif reqObj['cmd'] == "setSerialPort":
      # connect to serial port
      data = self.server.serialIface.open(args)
    else:
      # send to picaxe async
      return self.server.serialIface.write(reqObj['cmd'])
    
    # echo message back to client
    msg = json.dumps({'id': reqObj['id'], 'data': data})
    self.sendMessage(unicode(msg))
    print(msg)
      
  def handleConnected(self):
    msg = json.dumps({"connected": self.address})
    self.sendMessage(msg)
    print(msg)
    print(self.address, 'connected')
      
  def handleClose(self):
    msg = json.dumps({"disconnected": self.address})
    print(msg)
    self.sendMessage(msg)
    #print("curent listenerns count:", len(self.server.listeners))
    if len(self.server.listeners) <= 3:
      # we dont have any active listeners, disconnect serial port
      self.server.serialIface.close()
    print(self.address, 'closed')
      
  def _scanPorts(self):
    available = []
    default = -1
    iterator = sorted(comports())
    for port, desc, hwid in iterator:
      #print("%-20s" % (port,))
      #print("    desc: %s" % (desc,))
      #print("    hwid: %s" % (hwid,))
      #print(hwid[-9:])
      available.append((port, port))
      if (('USB VID:PID=0403:bd90' in hwid) or 
          ('USB VID:PID=403:bd90' in hwid)):
        default = len(available) -1
    return {'ports': available, 'default': default }



class SerialInterface:
  port = None # the serial port instance
  data = ""
  sendData = []
  def __init__(self, websockserver):
    self.websockserver = websockserver
  
  def open(self, args):
    if self.port != None:
      if args['port'] != self.port.port:
        self.close() # close and reopen if its a new COM port
      else:
        return True # new websocket client connecting to a existing port
    try:
      self.port = serial.Serial(
        baudrate = args['baudrate'],
        port = args['port'],
        #xonxoff = args['xonxoff'],
        timeout = 0.005 # args['timeout']
        #,stopbits = serial.STOPBITS_TWO
        ,interCharTimeout=0.001
      )
      #self.port.open()
      
      #fileno = self.port.fileno()
      #self.server.listeners.append(fileno)
      #self.server.connections[fileno] = self.port
      return True
    except:
      printTrace()
      return False
    
  def close(self):
    print("closing port")
    try:
      fileno = self.port.fileno()
      #del self.server.connections[fileno]
      #self.server.listeners.remove(fileno)
      self.port.close()
    except:
      pass
    del self.port
    self.port = None
    return True
  
#  def readLine(self):
#    if self.port != None:
#      # relay to all websocket instances
#      data = self.port.read(self.port.inWaiting())
#      if data[-1:] == chr(17) and len(self.sendData): # xon send from circuit
#        d = self.sendData.pop(0)
#        self.port.write(d)
#        self.port.flush()
#        print("sending to circuit:" + d)
#
#      data = data.decode('iso-8859-1')
#      #print("from card:" + data + "\r\n")
#      #s = [ord(x) for x in data]; print(s)
#      #print ("end from card")
#      self.data += data.replace(chr(17), "").replace(chr(19), "")
#      if self.data[-2:] == '\r\n':
#        for client in self.websockserver.connections.itervalues():
#          if client != self.port:
#            client.sendMessage(json.dumps({'data': self.data}))
#        self.data = ""
           
  def serveforever(self):
    while True:
      if self.port != None:
        # handles msgs from board
        if self.port.inWaiting() > 1:
          data = self.data
          gotData = False
          #print("read from board" + str(self.port.timeout) + "\r\n")
          while data[-2:] != "\r\n":
            c = self.port.read(1)
            if len(c) == 0 or c == chr(17) or c == chr(19):
              break
            data += c
            gotData = True

          if gotData:
            #print("after read\r\n")
            data = data.decode('iso-8859-1')
            data = data.replace(chr(17), "").replace(chr(19), "")
            for client in self.websockserver.connections.itervalues():
              if client != self.port:
                client.sendMessage(unicode(json.dumps({'data': data})))
            self.data = ""

        # handles send to board (using xon and xoff)
        if len(self.sendData) > 0:
          #print("write to board\r\n")
          data = self.port.read(1) # wait until timeout
          if data == chr(17):
            d = self.sendData.pop(0)
            self.port.write(d)
            self.port.flush()
            #print("sending to circuit:" + d)
          elif data != chr(19):
            self.data += data
      #print("websock\r\n")
      # handle websocket requests here
      self.websockserver.serve(continous=False) # timeouts immediatly


  def write(self, string):
    if self.port and self.port.writable():
      self.sendData.append(to_bytes(string.encode('iso-8859-1')))
      #return self.port.write(string.encode('iso-8859-1'))


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
  websockserver = SimpleWebSocketServer('', WS_PORT, PicaxeInterface, 0.01)
  websockserver.serialIface = SerialInterface(websockserver)
  websockserver.serialIface.serveforever()
