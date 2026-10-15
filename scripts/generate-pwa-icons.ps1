param()

Add-Type -AssemblyName System.Drawing

$output = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force -Path $output | Out-Null

function Write-Icon([string]$name, [int]$size, [bool]$maskable) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#d6552d'))

  if (-not $maskable) {
    $margin = [int]($size * 0.08)
    $radius = [int]($size * 0.20)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2
    $path.AddArc($margin, $margin, $diameter, $diameter, 180, 90)
    $path.AddArc($size - $margin - $diameter, $margin, $diameter, $diameter, 270, 90)
    $path.AddArc($size - $margin - $diameter, $size - $margin - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($margin, $size - $margin - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.TranslateTransform($size / 2, $size / 2)
    $graphics.RotateTransform(-4)
    $graphics.TranslateTransform(-$size / 2, -$size / 2)
    $graphics.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#d6552d'))), $path)
    $path.Dispose()
  } else {
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#c44725'))
    $margin = [int]($size * 0.10)
    $radius = [int]($size * 0.18)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2
    $path.AddArc($margin, $margin, $diameter, $diameter, 180, 90)
    $path.AddArc($size - $margin - $diameter, $margin, $diameter, $diameter, 270, 90)
    $path.AddArc($size - $margin - $diameter, $size - $margin - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($margin, $size - $margin - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    $graphics.TranslateTransform($size / 2, $size / 2)
    $graphics.RotateTransform(-4)
    $graphics.TranslateTransform(-$size / 2, -$size / 2)
    $graphics.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#d6552d'))), $path)
    $path.Dispose()
  }

  $graphics.Dispose()
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.TranslateTransform($size / 2, $size / 2)
  $graphics.RotateTransform(-4)
  $graphics.TranslateTransform(-$size / 2, -$size / 2)
  $fontSize = [single]($size * 0.34)
  $font = New-Object System.Drawing.Font('Arial Black', $fontSize, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel))
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  if ($maskable) {
    $textBitmap = New-Object System.Drawing.Bitmap($size, $size)
    $textGraphics = [System.Drawing.Graphics]::FromImage($textBitmap)
    $textGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $textGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $textGraphics.DrawString('401', $font, $brush, (New-Object System.Drawing.RectangleF(0, 0, $size, $size)), $format)
    $textGraphics.Dispose()
    $graphics.DrawImage($textBitmap, 0, 0, $size, $size)
    $textBitmap.Dispose()
  } else {
    $graphics.DrawString('401', $font, $brush, (New-Object System.Drawing.RectangleF(0, 0, $size, $size)), $format)
  }
  $bitmap.Save((Join-Path $output $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $brush.Dispose()
  $format.Dispose()
  $font.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Icon 'icon-192.png' 192 $false
Write-Icon 'icon-512.png' 512 $false
Write-Icon 'maskable-512.png' 512 $true
Write-Icon 'apple-touch-icon.png' 180 $false
