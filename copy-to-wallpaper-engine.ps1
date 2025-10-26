# Script para copiar o projeto Susuwatari para o Wallpaper Engine
# Limpa o conteudo da pasta de destino e copia todos os arquivos necessarios

# Configura codificacao UTF-8 e limpa o console
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Susuwatari - Copia para Wallpaper Engine"
Clear-Host

$origem = "."
$destino = "D:\SteamLibrary\steamapps\common\wallpaper_engine\projects\myprojects\susuwatari"

Write-Host "Iniciando copia para Wallpaper Engine..." -ForegroundColor Green

# Limpa o conteudo da pasta de destino se ela existir
if (Test-Path $destino) {
    Write-Host "Limpando conteudo da pasta de destino..." -ForegroundColor Yellow
    Get-ChildItem -Path $destino -Recurse | Remove-Item -Force -Recurse
    Write-Host "Conteudo da pasta limpo com sucesso!" -ForegroundColor Green
}
else {
    Write-Host "Criando pasta de destino..." -ForegroundColor Yellow
    New-Item -Path $destino -ItemType Directory -Force | Out-Null
    Write-Host "Pasta de destino criada!" -ForegroundColor Green
}

# Executa a copia usando robocopy
Write-Host "Copiando arquivos..." -ForegroundColor Yellow
robocopy $origem $destino /E /XD .vscode .vs .github .git .ps1

# Verifica o resultado (robocopy retorna 0 ou 1 para sucesso)
if ($LASTEXITCODE -le 1) {
    Write-Host "Copia concluida com sucesso!" -ForegroundColor Green
    Write-Host "Projeto copiado para: $destino" -ForegroundColor Cyan
    Write-Host "Projeto pronto para uso no Wallpaper Engine!" -ForegroundColor Magenta
}
else {
    Write-Host "Erro durante a copia. Codigo de saida: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}