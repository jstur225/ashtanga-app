# NotebookLM 认证设置脚本
$OutputEncoding = [console]::InputEncoding = [console]::OutputEncoding = New-Object System.Text.UTF8Encoding

$skillDir = "D:\BaiduSyncdisk\work\cursor app\claude code\.claude\skills\notebooklm"
cd $skillDir

Write-Host "正在启动 NotebookLM 认证..." -ForegroundColor Green
Write-Host ""
Write-Host "重要提示：" -ForegroundColor Yellow
Write-Host "1. 浏览器窗口将会自动打开"
Write-Host "2. 请在浏览器中登录您的 Google 账号"
Write-Host "3. 登录成功后，浏览器会自动关闭"
Write-Host "4. 请稍候，正在保存认证信息..."
Write-Host ""

python scripts/run.py auth_manager.py setup

Write-Host ""
Write-Host "认证设置完成！" -ForegroundColor Green
