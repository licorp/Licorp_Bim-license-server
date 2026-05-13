Continue = 'Stop'
Set-Location 'C:\revit-api-main'
 = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run start' -PassThru
Start-Sleep -Seconds 8
 = 'test' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + '@example.com'
 = 'fp-test-001'

 = @{ email=; password='123456'; fullName='Test User'; company='Licorp'; deviceFingerprint= } | ConvertTo-Json
try {  = Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/auth/register' -Method Post -ContentType 'application/json' -Body  } catch {  = .Exception.Message }

 = @{ email=; password='123456'; deviceFingerprint= } | ConvertTo-Json
try {  = Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body  } catch {  = .Exception.Message }

 = 
 = 
if ( -and .accessToken) {
   = @{ accessToken=.accessToken; deviceFingerprint= } | ConvertTo-Json
  try {  = Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/auth/verify' -Method Post -ContentType 'application/json' -Body  } catch {  = .Exception.Message }

   = @{ refreshToken=.refreshToken; deviceFingerprint= } | ConvertTo-Json
  try {  = Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/auth/refresh' -Method Post -ContentType 'application/json' -Body  } catch {  = .Exception.Message }
}

Write-Output '---REGISTER---'
 | ConvertTo-Json -Depth 6
Write-Output '---LOGIN---'
 | ConvertTo-Json -Depth 6
Write-Output '---VERIFY---'
 | ConvertTo-Json -Depth 6
Write-Output '---REFRESH---'
 | ConvertTo-Json -Depth 6

if (!.HasExited) { Stop-Process -Id .Id -Force }
