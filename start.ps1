# Tennis AI - ローカル起動スクリプト
Set-Location $PSScriptRoot

# .env がなければ作成
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "初回セットアップ" -ForegroundColor Cyan
    Write-Host "Anthropic の APIキーを入力してください" -ForegroundColor Cyan
    Write-Host "（取得場所: https://console.anthropic.com/）" -ForegroundColor Gray
    Write-Host ""
    $apiKey = Read-Host "APIキー (sk-ant-...)"
    "ANTHROPIC_API_KEY=$apiKey" | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
    Write-Host ""
    Write-Host ".env を作成しました" -ForegroundColor Green
}

# 依存関係がなければインストール
if (-not (Test-Path "node_modules")) {
    Write-Host "npm install を実行中..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "起動中..." -ForegroundColor Green
Write-Host "ブラウザで http://localhost:8081 を開いてください" -ForegroundColor Cyan
Write-Host ""

npm run web
