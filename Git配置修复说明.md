# Git 配置修复完成

**修复时间**: 2026-01-26
**新工作路径**: `D:\BaiduSyncdisk\work\ashtang-app`

## 问题诊断

**原始问题**:
```
fatal: unable to read config file 'D:/runjian/git/Git/home/BIN/.gitconfig': No such file or directory
```

**根本原因**:
- Git 全局配置文件路径指向旧路径: `D:\runjian\git\Git\home\BIN\.gitconfig`
- 旧路径已不存在，导致 Git 无法读取全局配置

## 解决方案

### 1. 创建新的 Git 配置目录

**新配置路径**: `D:\BaiduSyncdisk\work\git-home\`

**配置文件内容**:
```ini
[user]
	name = orange
	email = orange@ashtangalife.online
[http]
	proxy = http://127.0.0.1:7897
	sslVerify = false
	postBuffer = 524288000
[core]
	autocrlf = true
```

### 2. 设置 HOME 环境变量

**用户级环境变量**:
```
变量名: HOME
变量值: D:\BaiduSyncdisk\work\git-home
```

**验证命令**:
```powershell
[System.Environment]::GetEnvironmentVariable('HOME', 'User')
```

**输出**: `D:\BaiduSyncdisk\work\git-home` ✅

### 3. 配置说明

#### 全局配置（已设置）
- **用户名**: orange
- **邮箱**: orange@ashtangalife.online
- **代理**: http://127.0.0.1:7897
- **SSL验证**: false
- **缓冲区**: 524288000 (500MB)

#### 项目配置
- **仓库路径**: `D:\BaiduSyncdisk\work\ashtang-app`
- **远程仓库**: https://github.com/jstur225/ashtanga-app.git
- **分支**: master

## 验证结果

### ✅ 全局配置可读
```bash
git config --global user.name
# 输出: orange

git config --global user.email
# 输出: orange@ashtangalife.online

git config --global http.proxy
# 输出: http://127.0.0.1:7897
```

### ✅ Git 推送正常
```bash
cd D:\BaiduSyncdisk\work\ashtang-app
git push origin master
# 成功！
```

### ✅ 项目配置干净
```bash
git config --list | grep -E "http|user"
# 输出: 无代理配置（已移到全局）
```

## 日常使用

### 启动 Git Bash
如果 Git Bash 中全局配置未生效，手动设置：
```bash
export HOME="D:/BaiduSyncdisk/work/git-home"
```

### VS Code / Cursor
重启编辑器以加载新的环境变量。

### 命令行推送
```bash
cd D:\BaiduSyncdisk\work\ashtang-app
git add .
git commit -m "描述"
git push origin master
```

## 配置文件位置

**全局配置**: `D:\BaiduSyncdisk\work\git-home\.gitconfig`
- 所有项目共享
- 包含用户信息和代理设置

**项目配置**: `D:\BaiduSyncdisk\work\ashtang-app\.git\config`
- 项目特定配置
- 当前无代理配置（已移到全局）

## 环境变量

**用户级变量**:
```
HOME = D:\BaiduSyncdisk\work\git-home
```

**查看方法**:
- 系统 → 高级系统设置 → 环境变量 → 用户变量
- 或 PowerShell: `[System.Environment]::GetEnvironmentVariable('HOME', 'User')`

## 常见问题

**Q: Git Bash 中配置不生效？**
A: 执行 `export HOME="D:/BaiduSyncdisk/work/git-home"`

**Q: 推送仍然失败？**
A: 检查代理是否运行: `curl -v https://github.com`

**Q: 如何修改代理？**
A: 编辑 `D:\BaiduSyncdisk\work\git-home\.gitconfig`，修改 `http.proxy` 值

**Q: 如何查看当前配置？**
A: `git config --global --list`

## 工作路径总结

**主工作路径**: `D:\BaiduSyncdisk\work\ashtang-app\`
- Git 仓库
- 所有代码
- 部署源路径

**配置路径**: `D:\BaiduSyncdisk\work\git-home\`
- Git 全局配置
- 环境变量 HOME 指向

**备份路径**:
- Git 本地仓库
- GitHub 远程仓库
- 定期备份到百度网盘

## 后续工作

所有 Git 操作都在新路径进行：
- 开发: `D:\BaiduSyncdisk\work\ashtang-app`
- 配置: `D:\BaiduSyncdisk\work\git-home\.gitconfig`
- 推送: 自动使用全局代理配置

✅ **配置修复完成，可以正常使用！**
