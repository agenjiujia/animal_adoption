const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");

/**
 * 打开的站点地址。开发时可设环境变量：
 *   APP_URL=http://localhost:3000 npm start
 * 打包后默认写死在下方常量（改完需重新执行 npm run dist）。
 */
const APP_URL = process.env.APP_URL || "https://www.animal-adoption.top";

/**
 * 默认开启硬件加速以保证流畅度。
 * 仅在兼容性问题机器上通过环境变量手动关闭：
 *   ELECTRON_DISABLE_GPU=1
 */
const DISABLE_GPU = process.env.ELECTRON_DISABLE_GPU === "1";
if (DISABLE_GPU) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
}

process.on("uncaughtException", (err) => {
  console.error("[desktop uncaughtException]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[desktop unhandledRejection]", reason);
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "萌宠之家",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.on("did-fail-load", (_event, _code, desc, failedUrl) => {
    const base = APP_URL.replace(/\/$/, "");
    const u = (failedUrl || "").replace(/\/$/, "");
    if (u === base || u.startsWith(`${base}/`) || u.startsWith(base + "?")) {
      dialog.showErrorBox(
        "页面加载失败",
        `${desc || "未知错误"}\n\n地址：${APP_URL}\n\n请检查网络或将 APP_URL 指向正确站点。`
      );
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
