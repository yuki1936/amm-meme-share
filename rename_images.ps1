# Rename images in images/ to sequential numeric names (0001.ext) and update images.json
Set-StrictMode -Version Latest
$root = "d:\yuki\work\阿喵喵表情包"
$dir = Join-Path $root 'images'
Set-Location $dir
$files = Get-ChildItem -File | Sort-Object Name
$map = @()
$i = 1
foreach($f in $files){
  $ext = $f.Extension
  $new = '{0:D4}{1}' -f $i, $ext
  # temporary intermediate name to avoid collisions
  $tmp = "tmp_$([System.Guid]::NewGuid().ToString())$ext"
  Rename-Item -LiteralPath $f.Name -NewName $tmp
  $map += @{Old=$tmp; New=$new}
  $i++
}
# now rename temp files to final sequential names
foreach($m in $map){
  Rename-Item -LiteralPath $m.Old -NewName $m.New -ErrorAction Stop
}
# build json array
$entries = $map | ForEach-Object { 'images/' + $_.New }
$json = ConvertTo-Json $entries -Depth 5
Set-Content -LiteralPath (Join-Path $root 'images.json') -Value $json -Encoding UTF8
Write-Output "Renamed $($map.Count) files and updated images.json"
