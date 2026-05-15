param(
    [string]$Root = (Get-Location).Path,
    [int]$Port = 8000,
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

$rootPath = [System.IO.Path]::GetFullPath($Root)
if (-not (Test-Path -LiteralPath $rootPath -PathType Container)) {
    throw "Server root does not exist: $rootPath"
}

$listener = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)

function Get-ContentType([string]$Path) {
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { "text/html; charset=utf-8"; break }
        ".htm" { "text/html; charset=utf-8"; break }
        ".css" { "text/css; charset=utf-8"; break }
        ".js" { "text/javascript; charset=utf-8"; break }
        ".json" { "application/json; charset=utf-8"; break }
        ".svg" { "image/svg+xml; charset=utf-8"; break }
        ".txt" { "text/plain; charset=utf-8"; break }
        default { "application/octet-stream" }
    }
}

function Send-TextResponse($Response, [int]$StatusCode, [string]$Body, [string]$ContentType = "text/plain; charset=utf-8") {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
    $Response.StatusCode = $StatusCode
    $Response.ContentType = $ContentType
    $Response.ContentLength64 = $bytes.Length
    $Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Response.OutputStream.Close()
}

function Get-DirectoryPage([string]$Path, [string]$RequestPath) {
    $items = Get-ChildItem -LiteralPath $Path | Sort-Object @{ Expression = { -not $_.PSIsContainer } }, Name
    $links = foreach ($item in $items) {
        $displayName = if ($item.PSIsContainer) { "$($item.Name)/" } else { $item.Name }
        $escapedName = [System.Uri]::EscapeDataString($item.Name)
        if ($item.PSIsContainer) {
            $escapedName = "$escapedName/"
        }
        $href = ($RequestPath.TrimEnd('/') + '/' + $escapedName).Replace('//', '/')
        '<li><a href="{0}">{1}</a></li>' -f $href, [System.Net.WebUtility]::HtmlEncode($displayName)
    }

    @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Local server</title>
</head>
<body>
  <h1>Local server is running</h1>
  <p>Serving: $([System.Net.WebUtility]::HtmlEncode($rootPath))</p>
  <ul>
    $($links -join "`n    ")
  </ul>
</body>
</html>
"@
}

try {
    $listener.Start()
} catch {
    Write-Host "Failed to start local server at $prefix" -ForegroundColor Red
    Write-Host "If the port is busy, run: set PORT=8001 && play.bat" -ForegroundColor Yellow
    throw
}

Write-Host "Serving $rootPath at $prefix"
Write-Host "Press Ctrl+C to stop."

if ($OpenBrowser) {
    Start-Process $prefix
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
        $relativePath = $requestPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $targetPath = [System.IO.Path]::GetFullPath((Join-Path $rootPath $relativePath))

        if (-not $targetPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
            Send-TextResponse $context.Response 403 "Forbidden"
            continue
        }

        if (Test-Path -LiteralPath $targetPath -PathType Container) {
            $indexPath = Join-Path $targetPath "index.html"
            if (Test-Path -LiteralPath $indexPath -PathType Leaf) {
                $targetPath = $indexPath
            } else {
                $page = Get-DirectoryPage $targetPath $requestPath
                Send-TextResponse $context.Response 200 $page "text/html; charset=utf-8"
                continue
            }
        }

        if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
            Send-TextResponse $context.Response 404 "Not found"
            continue
        }

        $bytes = [System.IO.File]::ReadAllBytes($targetPath)
        $context.Response.StatusCode = 200
        $context.Response.ContentType = Get-ContentType $targetPath
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.OutputStream.Close()
    }
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
