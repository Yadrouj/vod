param(
  [string]$Sdk = "$env:LOCALAPPDATA/Android/Sdk",
  [string]$JavaHome = "$env:ProgramFiles/Android/Android Studio/jbr"
)
$ErrorActionPreference = 'Stop'
& "$PSScriptRoot/../tools/build-android-debug.ps1" -Variant android-tv -Sdk $Sdk -JavaHome $JavaHome
