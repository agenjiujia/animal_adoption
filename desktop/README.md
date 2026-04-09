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

若应用在个别 Windows 机器闪退，可临时关闭 GPU：

```bash
ELECTRON_DISABLE_GPU=1 npm start
```

（打包后可在启动脚本或系统环境变量里设置 `ELECTRON_DISABLE_GPU=1`。）

（本地需已执行仓库根目录的 `npm run dev` 或 `npm run start`。）

## 本机打包

| 系统 | 命令 | 产物（在 `desktop/release/`） |
|------|------|-------------------------------|
| macOS | `npm run dist:mac` | `.dmg`、`.zip` |
| macOS（仅zip兜底） | `npm run dist:mac:zip` | `.zip` |
| Windows | `npm run dist:win` | NSIS `Setup.exe`（x64） |
| Windows（便携版） | `npm run dist:win:portable` | 免安装 `*.exe`（portable） |

未签名安装包：macOS 可能需在「隐私与安全性」中允许打开；Windows 可能提示 SmartScreen，选「仍要运行」即可。

若本机 `hdiutil` 偶发失败，可先用 `npm run dist:mac:zip` 产出可分发的 zip（双击解压后拖到 Applications 即可）。

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
   - `animal-adoption-windows-installer`：Windows 安装版 `Setup.exe`  
   - `animal-adoption-windows-portable`：Windows 便携版 `Portable.exe`  

## 发布命名规范（建议）

- Git Tag：`desktop-vX.Y.Z`（例如 `desktop-v1.0.1`）
- Release 标题：`萌宠之家 Desktop vX.Y.Z`
- 产物分发建议：
  - mac：`萌宠之家-X.Y.Z-arm64.dmg` + `萌宠之家-X.Y.Z-arm64-mac.zip`
  - win-installer：`萌宠之家 Setup X.Y.Z.exe`
  - win-portable：`萌宠之家 Portable X.Y.Z.exe`
- 发布说明模板：
  - 新功能/修复（3-5条）
  - 已知限制（无证书可能被系统拦截）
  - 安装指引（mac 放行 / Windows SmartScreen）


## 停止工作排查（Windows）

- 系统建议 **Windows 10/11 x64**。若是 Windows 7/8/8.1，现代 Electron 版本容易直接崩溃。
- 若双击即闪退，请先使用本仓库当前版本重新打包（已关闭 GPU 与沙箱，兼容性更好）。
- 首次运行若被系统拦截，先在 SmartScreen 里选择“更多信息 -> 仍要运行”。
- 若仍崩溃，通常是系统组件或驱动问题：更新显卡驱动、安装最新版 Microsoft Visual C++ 运行库后重试。
- 学习用途分发建议优先使用 `dist:win:portable` 产物，减少安装器权限与 Defender 误报带来的失败概率。

## 学习分发（无证书）说明

- 证书不是 GitHub 发放，GitHub 只负责托管安装包；真正签名证书需向 Apple（mac）或证书机构（Windows）申请。
- 学习阶段可无证书分发，但需提示接收者：
  - macOS：若提示“已损坏”，按提示在系统设置放行，或执行 `xattr -dr com.apple.quarantine "/Applications/萌宠之家.app"`。
  - Windows：若 SmartScreen 拦截，点“更多信息 -> 仍要运行”；推荐使用便携版 `dist:win:portable`。

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
