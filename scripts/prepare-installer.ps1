$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Deterministic NSIS layouts composed from the existing MISO artwork and fonts.
# Run on Windows when replacing the installer artwork; committed BMPs build on CI.
$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $projectRoot 'resources\installer'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$fonts = [System.Drawing.Text.PrivateFontCollection]::new()
$fonts.AddFontFile((Join-Path $projectRoot 'src\assets\fonts\Baloo2.ttf'))
$fonts.AddFontFile((Join-Path $projectRoot 'src\assets\fonts\Inter.ttf'))
$headingFamily = $fonts.Families | Where-Object { $_.Name -like '*Baloo*' } | Select-Object -First 1
$bodyFamily = $fonts.Families | Where-Object { $_.Name -like '*Inter*' } | Select-Object -First 1
$heading = [System.Drawing.Font]::new($headingFamily, 32, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$body = [System.Drawing.Font]::new($bodyFamily, 11, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$small = [System.Drawing.Font]::new($bodyFamily, 9, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$ink = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#1E1E2E'))
$muted = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#646475'))
$butter = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#FFC857'))
$mascot = [System.Drawing.Image]::FromFile((Join-Path $projectRoot 'src\assets\mascot\idle\mascot.png'))
$icon = [System.Drawing.Image]::FromFile((Join-Path $projectRoot 'src\assets\branding\icon.png'))

function New-Canvas([int]$width, [int]$height) {
    $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#FFF9EF'))
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    return @($bitmap, $graphics)
}

try {
    $sidebar, $drawing = New-Canvas 164 314
    try {
        $drawing.FillEllipse($butter, -36, 128, 236, 236)
        $drawing.DrawString('MISO', $heading, $ink, 16, 18)
        $drawing.DrawString("Your little butler.", $body, $muted, 18, 61)
        $drawing.DrawString("A little company.`nA little help.", $body, $ink, 18, 93)
        $drawing.DrawImage($mascot, 5, 139, 154, 154)
        $drawing.DrawString('At your service.', $small, $ink, 18, 294)
        $sidebar.Save((Join-Path $destination 'sidebar.bmp'), [System.Drawing.Imaging.ImageFormat]::Bmp)
    } finally { $drawing.Dispose(); $sidebar.Dispose() }

    $header, $drawing = New-Canvas 150 57
    $headerFont = [System.Drawing.Font]::new($headingFamily, 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    try {
        $drawing.DrawString('MISO', $headerFont, $ink, 6, 3)
        $drawing.DrawString('Your little butler', $small, $muted, 8, 33)
        $drawing.DrawImage($icon, 105, 5, 44, 44)
        $header.Save((Join-Path $destination 'header.bmp'), [System.Drawing.Imaging.ImageFormat]::Bmp)
    } finally { $drawing.Dispose(); $header.Dispose(); $headerFont.Dispose() }
} finally {
    $mascot.Dispose(); $icon.Dispose()
    $heading.Dispose(); $body.Dispose(); $small.Dispose()
    $ink.Dispose(); $muted.Dispose(); $butter.Dispose(); $fonts.Dispose()
}
Write-Output 'Prepared MISO installer header (150x57) and sidebar (164x314).'
