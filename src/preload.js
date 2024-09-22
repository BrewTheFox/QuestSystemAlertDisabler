// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateDevices: (callback) => ipcRenderer.on('update-devices', (_, devices) => callback(devices)),
    powerOffDevice: (deviceId) => ipcRenderer.invoke('power-off-device', deviceId),
    rebootDevice: (deviceId) => ipcRenderer.invoke('reboot-device', deviceId),
    disableAlerts: (deviceId) => ipcRenderer.invoke('disable-alerts', deviceId),
    onShowAlert: (callback) => ipcRenderer.on('show-alert', (event, message) => callback(message))
  });
  