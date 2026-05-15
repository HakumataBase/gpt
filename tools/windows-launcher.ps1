param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$RootWithSeparator = $Root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$Prefix = "http://127.0.0.1:$Port/"

function Test-PortOpen {
  param([int]$TargetPort)
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect("127.0.0.1", $TargetPort, $null, $null)
    if (-not $iar.AsyncWaitHandle.WaitOne(200, $false)) { return $false }
    $client.EndConnect($iar)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Get-ContentType {
  param([string]$Path)
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".css" { return "text/css; charset=utf-8" }
    ".js" { return "text/javascript; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".png" { return "image/png" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".svg" { return "image/svg+xml; charset=utf-8" }
    default { return "application/octet-stream" }
  }
}

function Send-TextResponse {
  param(
    [System.Net.HttpListenerResponse]$Response,
    [int]$StatusCode,
    [string]$Message
  )
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Message)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = "text/plain; charset=utf-8"
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

if (Test-PortOpen -TargetPort $Port) {
  Write-Host "既に $Prefix でサーバーが起動しています。ブラウザを開きます。"
  Start-Process $Prefix
  exit 0
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Prefix)

try {
  $listener.Start()
} catch {
  Write-Host "ローカルサーバーを起動できませんでした: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "別のアプリがポート $Port を使っていないか確認してください。" -ForegroundColor Yellow
  exit 1
}

Write-Host "ローカルサーバー: $Prefix"
Write-Host "公開フォルダ: $Root"
Write-Host "終了するときは Ctrl+C を押すか、このウィンドウを閉じてください。"
Start-Process $Prefix

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($requestPath)) { $requestPath = "index.html" }
    $requestPath = $requestPath -replace "/", [System.IO.Path]::DirectorySeparatorChar
    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $requestPath))

    if (-not $fullPath.StartsWith($RootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)) {
      Send-TextResponse -Response $context.Response -StatusCode 403 -Message "Forbidden"
      $context.Response.Close()
      continue
    }

    if (-not [System.IO.File]::Exists($fullPath)) {
      Send-TextResponse -Response $context.Response -StatusCode 404 -Message "Not Found"
      $context.Response.Close()
      continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $context.Response.StatusCode = 200
    $context.Response.ContentType = Get-ContentType -Path $fullPath
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
