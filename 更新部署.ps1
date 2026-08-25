# AkaneRei Offline 更新部署脚本
# 作用：
#   1. 构建静态站点（npm run build:pages）
#   2. 暂存并提交全部改动（没有改动则跳过）
#   3. 使用 OpenSSL 后端推送到 origin/main
#   4. 推送后 GitHub Actions 会自动构建并部署 GitHub Pages
# 用法：
#   在项目根目录执行：  .\更新部署.ps1
#   自定义提交信息：    .\更新部署.ps1 "更新了什么内容"
# 前提：
#   - 已配置好 GitHub token（或 Git Credential Manager 已登录）
#   - 已执行过：git config --global http.sslBackend openssl

param(
    [string]$Message = "Deploy: update AkaneRei Offline"
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ''
Write-Host '[1/4] 构建静态站点（build:pages）...'
Write-Host ''
npm run build:pages
if ($LASTEXITCODE -ne 0) {
    throw '构建失败，终止部署。'
}

Write-Host ''
Write-Host '[2/4] 检查工作区改动...'
$changes = (git status --porcelain) -join "`n"
if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Host '  没有未提交的改动，跳过 commit。'
} else {
    Write-Host '  发现改动，开始提交...'
    Write-Host ''
    git add -A
    if ($LASTEXITCODE -ne 0) {
        throw 'git add 失败，终止部署。'
    }
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        throw 'git commit 失败，终止部署。'
    }
}

Write-Host ''
Write-Host '[3/4] 推送到 GitHub（origin/main）...'
Write-Host ''
git -c http.sslBackend=openssl push origin main
if ($LASTEXITCODE -ne 0) {
    throw 'git push 失败，请检查 token 或网络。'
}

Write-Host ''
Write-Host '[4/4] 完成！'
Write-Host '  已推送到 origin/main。'
Write-Host '  稍等几分钟，GitHub Actions 会自动部署到 GitHub Pages。'
Write-Host '  游戏地址：https://apxs114514.github.io/AkaneRei-Offline/'
