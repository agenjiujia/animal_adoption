# 萌宠之家 · 桌面版（Electron）

用独立窗口打开网站（默认 **https://www.animal-adoption.top**）。**不内置**数据库与 Next 服务，功能依赖线上或你指定的地址。

## 本地运行

```bash
cd desktop
npm install
npm start
```

指定地址：

```bash
APP_URL=http://localhost:3000 npm start
```

（本地需已执行仓库根目录的 `npm run dev` 或 `npm run start`。）

## 本机打包

| 系统 | 命令 | 产物（在 `desktop/release/`） |
|------|------|-------------------------------|
| macOS | `npm run dist:mac` | `.dmg`、`.zip` |
| Windows | `npm run dist:win` | NSIS `Setup.exe`（x64） |

未签名安装包：macOS 可能需在「隐私与安全性」中允许打开；Windows 可能提示 SmartScreen，选「仍要运行」即可。

首次打包前：

```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false   # mac/Linux shell，跳过代码签名检测
```

Windows 下可在「系统环境变量」里设同名变量，或在 PowerShell：

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
```

## 云端同时打 Mac + Windows（推荐）

仓库已配置 GitHub Actions：`.github/workflows/desktop-build.yml`。

1. 把代码推到 GitHub。
2. 打开 **Actions** → **Desktop installers** → **Run workflow**（手动运行）；  
   或打标签 `desktop-任意版本` 推送触发。
3. 结束后在 **Actions 运行页 → Artifacts** 下载：
   - `animal-adoption-macos`：DMG / ZIP  
   - `animal-adoption-windows`：安装 exe  

## 修改打包后默认打开的网址

编辑 `main.cjs` 里 `APP_URL` 的默认值，保存后重新执行 `npm run dist:*`。

## 与仓库根目录的快捷命令

在仓库根目录：

```bash
npm run desktop:install
npm run desktop:start
npm run desktop:dist:mac
npm run desktop:dist:win
```

## 说明

这是「网站 + 桌面壳」。若需要完全离线、自带数据库的桌面应用，需要单独架构（嵌入式数据库、改造后端），与本目录方案不同。
