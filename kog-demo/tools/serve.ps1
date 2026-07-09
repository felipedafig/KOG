# Tiny static file server for the KOG demo — no installs needed, works on any
# Windows PC (PowerShell is built in). Started by START-DEMO.bat.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot   # the kog-demo folder
$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'
  '.css'='text/css; charset=utf-8';   '.json'='application/json; charset=utf-8'
  '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.png'='image/png'; '.gif'='image/gif'
  '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.webp'='image/webp'
  '.ttf'='font/ttf'; '.woff'='font/woff'; '.woff2'='font/woff2'; '.txt'='text/plain'
}

# Find a free port starting at 8765
$listener = $null
foreach ($port in 8765..8775) {
  try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
    break
  } catch { $listener = $null }
}
if (-not $listener) { Write-Host 'Kon geen vrije poort vinden (8765-8775).'; exit 1 }

$url = "http://localhost:$port/"
Write-Host ''
Write-Host '  KOG demo draait!  ' -BackgroundColor DarkGreen -ForegroundColor White
Write-Host "  Open: $url"
Write-Host '  Stoppen: sluit dit venster (of Ctrl+C).'
Write-Host ''
Start-Process $url

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath) -replace '/', '\'
    if ($rel.EndsWith('\') -or $rel -eq '') { $rel += 'index.html' }
    $path = Join-Path $root $rel.TrimStart('\')
    # Directory hit without trailing slash -> its index.html
    if (Test-Path $path -PathType Container) { $path = Join-Path $path 'index.html' }
    $full = [System.IO.Path]::GetFullPath($path)
    if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
      $ctx.Response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('404 - niet gevonden')
    } else {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($full)
    }
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch { }
  finally { try { $ctx.Response.Close() } catch { } }
}
