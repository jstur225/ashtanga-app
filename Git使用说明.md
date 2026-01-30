# Git 仓库使用说明

本目录已初始化为 Git 仓库，用于本地备份和版本管理。

## 仓库信息

- **路径**: `D:\BaiduSyncdisk\work\ashtang-app`
- **初始化时间**: 2026-01-26
- **用户**: orange
- **当前分支**: master
- **最新提交**: 57e31f6

## 常用命令

### 查看状态
```bash
git status
```

### 查看提交历史
```bash
git log --oneline
```

### 查看详细历史
```bash
git log
```

### 添加所有更改
```bash
git add .
```

### 提交更改
```bash
git commit -m "描述你的更改"
```

### 查看文件差异
```bash
git diff
git diff filename
```

### 查看提交历史图
```bash
git log --graph --oneline --all
```

### 回退到某个版本
```bash
# 查看历史
git log --oneline

# 回退（软回退，保留更改）
git reset --soft <commit-hash>

# 硬回退（丢弃更改）
git reset --hard <commit-hash>
```

### 创建新分支
```bash
git checkout -b feature-新功能
```

### 切换分支
```bash
git checkout master
git checkout feature-新功能
```

### 合并分支
```bash
git checkout master
git merge feature-新功能
```

## 备份策略

### 本地备份
当前配置已完成，所有文件已提交到本地仓库。

### 远程备份（可选）
如需推送到 GitHub，可以：

1. **创建 GitHub 仓库**
   - 登录 GitHub
   - 创建新仓库（不初始化 README）
   - 复制仓库 URL

2. **添加远程仓库**
```bash
git remote add origin https://github.com/你的用户名/ashtang-app-backup.git
```

3. **推送到 GitHub**
```bash
git push -u origin master
```

### 推送到现有仓库
如果想推送到现有的 ashtanga-app 仓库：
```bash
git remote add origin https://github.com/jstur225/ashtanga-app.git
git push -u origin master
```

## 定期备份建议

### 每次重要更改后
```bash
git add .
git commit -m "描述更改内容"
```

### 每周备份
```bash
# 添加所有更改
git add .

# 提交
git commit -m "Weekly backup: YYYY-MM-DD"

# 如果配置了远程仓库
git push origin master
```

## 忽略文件

`.gitignore` 已配置，以下文件不会被提交：
- node_modules/ - 依赖包
- .next/ - 构建缓存
- .env.local - 环境变量
- *.log - 日志文件
- runtime-log/ - 运行日志

## 查看文件大小
```bash
# 查看仓库大小
du -sh .git

# 查看各文件大小
du -sh *
```

## 清理仓库（可选）
```bash
# 清理未跟踪的文件
git clean -fd

# 清理大文件（需要安装 git filter-repo）
# 谨慎使用！
```

## 恢复文件

### 从历史恢复
```bash
# 查看某个文件的历史
git log -- filename

# 恢复到某个版本
git checkout <commit-hash> -- filename
```

### 从暂存区恢复
```bash
# 撤销工作区更改
git restore filename

# 撤销所有更改
git restore .
```

## 标签管理

### 创建标签
```bash
git tag v1.0.5
```

### 查看标签
```bash
git tag
```

### 推送标签
```bash
git push origin --tags
```

## 当前版本信息

- **当前版本**: v1.0.5
- **最新功能**: 新用户教程记录系统
- **源代码**: 基于原始仓库 766d03f 版本

## 问题排查

### 文件显示已修改但未更改
```bash
git diff
```
可能是因为换行符差异，Windows 使用 CRLF，Linux 使用 LF。

### 文件被忽略但想提交
```bash
git add -f filename
```

### 查看忽略规则
```bash
git check-ignore -v filename
```

## 建议

1. **定期提交**: 每次重要更改后立即提交
2. **写清楚的提交信息**: 说明为什么改，而不是改了什么
3. **定期推送到远程**: 避免本地硬盘损坏导致数据丢失
4. **打标签**: 重要版本打标签，方便回退

## 备份到百度网盘

除了 Git 备份，建议定期将整个项目目录复制到百度网盘：
```
D:\BaiduSyncdisk\work\ashtang-app\
```

这样有三重保障：
1. Git 本地仓库（版本管理）
2. GitHub 远程仓库（云端备份）
3. 百度网盘（文件备份）
