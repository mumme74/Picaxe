# -*- coding: utf-8 -*-
import json
import sys
import subprocess
import serial
import re

import os

import can
#from __future__ import print_function
# chose an implementation, depending on os
#if os.name == 'nt': #sys.platform == 'win32':
#  from serial.tools.list_ports_windows import *
#elif os.name == 'posix':
#  from serial.tools.list_ports_posix import *
  
#from serial.serialutil import *

from SimpleWebSocketServer.SimpleWebSocketServer import WebSocket, SimpleWebSocketServer
HTTP_PORT = 8000
WS_PORT = 8080

#static vars
bus = None
canListener = None
canNotifier = None

class CanInterface(WebSocket):
  def __init__(self, server, sock, address):
    global bus, canListener, canNotifier
    WebSocket.__init__(self, server, sock, address)
    print('init before\n')
    if bus == None:
      print('init before\n')
      bus = can.interface.Bus(channel="vcan0", bustype="socketcan_ctypes")
      canListener = CanListener(server)
      canNotifier = can.Notifier(bus, [canListener])
      print('init after\n')

  def handleMessage(self):
    global bus
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

    data = [ord(reqObj['cmd'][1])]
    if reqObj['cmd'][2] != '\n':
      data.append(ord(reqObj['cmd'][2]))
    msg = can.Message(arbitration_id=ord(reqObj['cmd'][0]) << 4,
                      data=data,
                      extended_id=False)
    try:
      bus.send(msg)
      print("Message sent on {}".format(msg))
    except can.CanError:
      print("Message NOT sent")
    
    # echo message back to client
    msg = json.dumps({'id': reqObj['id'], 'data': reqObj['cmd']})
    self.sendMessage(unicode(msg))
    print(msg)

    # loopback as we dont get our own msgs echoed from can
    for webclient in self.server.connections.values():
      webclient.sendMessage(unicode(json.dumps({'data': reqObj['cmd'][:-1]})))
      
  def handleConnected(self):
    try:
      msg = json.dumps({"connected": self.address})
      self.sendMessage(unicode(msg))
      print(msg)
      print(self.address, 'connected')
    except:
      printTrace()
      
  def handleClose(self):
    msg = json.dumps({"disconnected": self.address})
    print(msg)
    self.sendMessage(unicode(msg))
    print(self.address, 'closed')
      

class CanListener(can.Listener):
  websockserver = None
  def __init__(self, websockserver):
    self.websockserver = websockserver
    can.Listener.__init__(self)

  def on_message_received(self, msg):
    aid = (msg.arbitration_id & 0xFF0) >> 4
    data = chr(aid)
    print("data=" + data)
    for i in range(0, msg.dlc):
      data += chr(msg.data[i])
    try:
      for webclient in self.websockserver.connections.values():
        webclient.sendMessage(unicode(json.dumps({'data': data})))
      print(unicode(json.dumps({'data': data})))
    except:
      printTrace()


def printTrace():
  import traceback, os
  exc_type, exc_obj, exc_tb = sys.exc_info()
  fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
  print(exc_type,sys.exc_info()[1],fname, exc_tb.tb_lineno)
  print(traceback.format_exc())



if __name__ == "__main__":
  try:
    #start http server as a subprocess
    if sys.version_info[0] >= 3:
      subprocess.Popen("cd gui && python -m http.server " + str(HTTP_PORT), shell=True)
    else:
      subprocess.Popen("cd gui && python -m SimpleHTTPServer " + str(HTTP_PORT), shell=True)
  
    # websocket server
    websockserver = SimpleWebSocketServer('', WS_PORT, CanInterface)
    websockserver.serve()
  except Exception:
    printTrace()
