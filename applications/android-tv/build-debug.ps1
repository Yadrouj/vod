param(
  [string]$Sdk = "$env:LOCALAPPDATA/Android/Sdk",
  [string]$JavaHome = "$env:ProgramFiles/Android/Android Studio/jbr"
)
$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = $JavaHome
$env:PATH = "$JavaHome/bin;$env:PATH"
$project = $PSScriptRoot
$repo = (Resolve-Path "$project/../..").Path
$output = Join-Path $repo '.media-cache/android-tv'
$build = Join-Path $output ("build-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$tools = Join-Path $Sdk 'build-tools/35.0.0'
$android = Join-Path $Sdk 'platforms/android-35/android.jar'
foreach ($required in @("$JavaHome/bin/javac.exe", "$tools/aapt2.exe", $android)) {
  if (!(Test-Path -LiteralPath $required)) { throw "Missing Android build prerequisite: $required" }
}
New-Item -ItemType Directory -Force -Path $build,"$build/gen","$build/classes","$build/dex" | Out-Null
function Checked([string]$program, [string[]]$arguments) {
  & $program @arguments
  if ($LASTEXITCODE -ne 0) { throw "Build step failed: $program ($LASTEXITCODE)" }
}
Checked "$tools/aapt2.exe" @('compile','--dir',"$project/res",'-o',"$build/resources.zip")
Checked "$tools/aapt2.exe" @('link','-o',"$build/unsigned.apk",'-I',$android,'--manifest',"$project/AndroidManifest.xml",'--java',"$build/gen",'--auto-add-overlay',"$build/resources.zip")
$sources = @(Get-ChildItem -LiteralPath "$project/src","$build/gen" -Filter '*.java' -Recurse | ForEach-Object { $_.FullName })
Checked "$JavaHome/bin/javac.exe" (@('-source','8','-target','8','-encoding','UTF-8','-classpath',$android,'-d',"$build/classes") + $sources)
Checked "$JavaHome/bin/jar.exe" @('cf',"$build/classes.jar",'-C',"$build/classes",'.')
Checked "$tools/d8.bat" @('--lib',$android,'--min-api','26','--output',"$build/dex","$build/classes.jar")
Checked "$JavaHome/bin/jar.exe" @('uf',"$build/unsigned.apk",'-C',"$build/dex",'classes.dex')
Checked "$tools/zipalign.exe" @('-f','-p','4',"$build/unsigned.apk","$build/aligned.apk")
$keystore = Join-Path $output 'debug.keystore'
if (!(Test-Path -LiteralPath $keystore)) {
  Checked "$JavaHome/bin/keytool.exe" @('-genkeypair','-keystore',$keystore,'-storepass','android','-alias','androiddebugkey','-keypass','android','-dname','CN=Android Debug,O=Android,C=US','-keyalg','RSA','-keysize','2048','-validity','10000')
}
$apk = Join-Path $output 'sarvnema-tv-debug.apk'
Checked "$tools/apksigner.bat" @('sign','--ks',$keystore,'--ks-pass','pass:android','--ks-key-alias','androiddebugkey','--out',$apk,"$build/aligned.apk")
Checked "$tools/apksigner.bat" @('verify','--verbose',$apk)
Write-Output "DEBUG APK (not a production release): $apk"
