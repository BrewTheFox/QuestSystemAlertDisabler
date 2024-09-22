const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { exec } = require('child_process');

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 400,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    resizable: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    checkDevices();
  });
};

function checkDevices() {
  exec("adb devices", (err, stdout, stderr) => {
    if (err) {
      console.error('Error executing adb devices:', err);
      return;
    }
    const lines = stdout.trim().split('\n');
    const devices = lines.slice(1)
      .map(line => line.split('\t')[0])
      .filter(id => id);
    mainWindow.webContents.send('update-devices', devices);
  });
}
function disableAlert(deviceId) {
  return new Promise((resolve, reject) => {
    exec(`adb -s ${deviceId} shell "ls /sdcard/SystemAlertDisabled.txt"`, (err, stdout, stderr) => {
      if (stdout.trim() == "/sdcard/SystemAlertDisabled.txt"){
        exec(`adb -s ${deviceId} shell pm enable com.oculus.vralertservice`);
        exec(`adb -s ${deviceId} shell "rm /sdcard/SystemAlertDisabled.txt"`);
        console.log("E");
        resolve("Enabled Alerts");
      }
      else {
        console.log(stdout);
        exec(`adb -s ${deviceId} shell "echo 1 > /sdcard/SystemAlertDisabled.txt"`);
        exec(`adb -s ${deviceId} shell pm disable-user --user 0 com.oculus.vralertservice`);
        console.log("D");
        resolve("Disabled Alerts");
      }
    });
  });
}


function powerOffDevice(deviceId) {
  return new Promise((resolve, reject) => {
    exec(`adb -s ${deviceId} shell reboot -p`, (err, stdout, stderr) => {
      if (err) {
        reject('Device ${deviceId} powered off.');
      } else {
        console.log(`Device ${deviceId} powered off.`);
        resolve();
      }
    });
  });
}

function rebootDevice(deviceId) {
  return new Promise((resolve, reject) => {
    exec(`adb -s ${deviceId} shell reboot`, (err, stdout, stderr) => {
      if (err) {
        reject('Device ${deviceId} rebooted.');
      } else {
        console.log(`Device ${deviceId} rebooted.`);
        resolve();
      }
    });
  });
}

app.whenReady().then(() => {
  createWindow();

  const checkDevicesInterval = setInterval(checkDevices, 2000);

  ipcMain.handle('disable-alerts', async (event, deviceId) => {
    const result = await disableAlert(deviceId);
    mainWindow.webContents.send('show-alert', result);
  });

  ipcMain.handle('power-off-device', async (event, deviceId) => {
    try {
      await powerOffDevice(deviceId);
      mainWindow.webContents.send('show-alert', `Device ${deviceId} powered off.`);
    } catch (error) {
      mainWindow.webContents.send('show-alert', `Error powering off device ${deviceId}: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('reboot-device', async (event, deviceId) => {
    try {
      await rebootDevice(deviceId);
      mainWindow.webContents.send('show-alert', `Device ${deviceId} rebooted.`);
    } catch (error) {
      mainWindow.webContents.send('show-alert', `Error rebooting device ${deviceId}: ${error}`);
      throw error;
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    clearInterval(checkDevicesInterval);
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});