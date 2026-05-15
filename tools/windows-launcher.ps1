param(
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'
$Root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$RootWithSeparator = $Root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$Url = 'http://127.0.0.1:' + $Port + '/'

function Test-PortOpen {
  param([int]$TargetPort)
  $client = New-Object -TypeName System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect('127.0.0.1', $TargetPort, $null, $null)
    if (-not $iar.AsyncWaitHandle.WaitOne(200, $false)) { return $false }
    $client.EndConnect($iar)
    return $true
  } catch {
    return $false
  } finally {
    if ($client -ne $null) { $client.Close() }
  }
}

function Get-ContentType {
  param([string]$Path)
  $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  switch ($extension) {
    '.html' { return 'text/html; charset=utf-8' }
    '.css' { return 'text/css; charset=utf-8' }
    '.js' { return 'text/javascript; charset=utf-8' }
    '.json' { return 'application/json; charset=utf-8' }
    '.png' { return 'image/png' }
    '.jpg' { return 'image/jpeg' }
    '.jpeg' { return 'image/jpeg' }
    '.svg' { return 'image/svg+xml; charset=utf-8' }
    default { return 'application/octet-stream' }
  }
}

function Write-HttpResponse {
  param(
    [System.IO.Stream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body,
    [int]$ContentLength = -1
  )

  if ($ContentLength -lt 0) { $ContentLength = $Body.Length }
  $headers = @(
    ('HTTP/1.1 ' + $StatusCode + ' ' + $StatusText),
    ('Content-Type: ' + $ContentType),
    ('Content-Length: ' + $ContentLength),
    'Cache-Control: no-store',
    'Connection: close',
    '',
    ''
  ) -join "`r`n"

  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

function Write-TextResponse {
  param(
    [System.IO.Stream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$Message
  )
  $body = [System.Text.Encoding]::UTF8.GetBytes($Message)
  Write-HttpResponse -Stream $Stream -StatusCode $StatusCode -StatusText $StatusText -ContentType 'text/plain; charset=utf-8' -Body $body
}

function Resolve-RequestPath {
  param([string]$RawPath)
  $pathOnly = $RawPath.Split('?')[0].TrimStart('/')
  if ([string]::IsNullOrWhiteSpace($pathOnly)) { $pathOnly = 'index.html' }
  $decoded = [System.Uri]::UnescapeDataString($pathOnly) -replace '/', [System.IO.Path]::DirectorySeparatorChar
  return [System.IO.Path]::GetFullPath((Join-Path $Root $decoded))
}

if (Test-PortOpen -TargetPort $Port) {
  Write-Host ('Server already running: ' + $Url)
  Start-Process $Url
  exit 0
}

$loopback = [System.Net.IPAddress]::Parse('127.0.0.1')
$listener = New-Object -TypeName System.Net.Sockets.TcpListener -ArgumentList $loopback, $Port

try {
  $listener.Start()
} catch {
  Write-Host ('Failed to start local server: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host ('Check whether another app is using port ' + $Port + '.') -ForegroundColor Yellow
  exit 1
}

Write-Host ('Local server: ' + $Url)
Write-Host ('Serving folder: ' + $Root)
Write-Host 'Press Ctrl+C or close this window to stop.'
Start-Process $Url

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $null
    $reader = $null
    try {
      $stream = $client.GetStream()
      $reader = New-Object -TypeName System.IO.StreamReader -ArgumentList $stream, [System.Text.Encoding]::ASCII
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        Write-TextResponse -Stream $stream -StatusCode 400 -StatusText 'Bad Request' -Message 'Bad Request'
        continue
      }

      while (-not [string]::IsNullOrEmpty($reader.ReadLine())) {}

      $parts = $requestLine.Split(' ')
      if ($parts.Length -lt 2 -or ($parts[0] -ne 'GET' -and $parts[0] -ne 'HEAD')) {
        Write-TextResponse -Stream $stream -StatusCode 405 -StatusText 'Method Not Allowed' -Message 'Method Not Allowed'
        continue
      }

      $fullPath = Resolve-RequestPath -RawPath $parts[1]
      if (-not $fullPath.StartsWith($RootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-TextResponse -Stream $stream -StatusCode 403 -StatusText 'Forbidden' -Message 'Forbidden'
        continue
      }

      if (-not [System.IO.File]::Exists($fullPath)) {
        Write-TextResponse -Stream $stream -StatusCode 404 -StatusText 'Not Found' -Message 'Not Found'
        continue
      }

      $fileBytes = [System.IO.File]::ReadAllBytes($fullPath)
      $responseBytes = $fileBytes
      if ($parts[0] -eq 'HEAD') { $responseBytes = New-Object -TypeName byte[] -ArgumentList 0 }
      Write-HttpResponse -Stream $stream -StatusCode 200 -StatusText 'OK' -ContentType (Get-ContentType -Path $fullPath) -Body $responseBytes -ContentLength $fileBytes.Length
    } catch {
      try {
        $errorMessage = 'Server Error: ' + $_.Exception.Message
        Write-TextResponse -Stream $stream -StatusCode 500 -StatusText 'Internal Server Error' -Message $errorMessage
      } catch {}
    } finally {
      if ($reader -ne $null) { $reader.Dispose() }
      if ($stream -ne $null) { $stream.Dispose() }
      if ($client -ne $null) { $client.Close() }
    }
  }
} finally {
  $listener.Stop()
}
