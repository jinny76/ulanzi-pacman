# 吃豆人插件部署脚本
Write-Host "====================================" -ForegroundColor Cyan
Write-Host " 吃豆人插件部署脚本" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$sourceDir = "G:\projects\ulanzi-plugin\com.ulanzi.pacman.ulanziPlugin"
$targetDir = "C:\Users\Kingfisher\AppData\Roaming\Ulanzi\UlanziDeck\Plugins\com.ulanzi.pacman.ulanziPlugin"

Write-Host "[1/3] 检查目标目录..." -ForegroundColor Yellow
if (Test-Path $targetDir) {
    Write-Host "⚠️  检测到已存在的插件，将先删除..." -ForegroundColor Yellow
    Remove-Item -Path $targetDir -Recurse -Force -ErrorAction Stop
    Write-Host "✅ 旧版本已删除" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/3] 复制插件文件..." -ForegroundColor Yellow
Copy-Item -Path $sourceDir -Destination $targetDir -Recurse -Force -ErrorAction Stop

Write-Host "✅ 插件文件已复制到:" -ForegroundColor Green
Write-Host "   $targetDir" -ForegroundColor Gray

Write-Host ""
Write-Host "[3/3] 部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📌 下一步操作:" -ForegroundColor Cyan
Write-Host "   1. 重启 UlanziStudio"
Write-Host "   2. 在插件列表找到 'Pac-Man Runner'"
Write-Host "   3. 拖拽到 3x5 按键网格即可使用"
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "按回车键退出"
