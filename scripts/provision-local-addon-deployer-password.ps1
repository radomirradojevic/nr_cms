[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('vendor', 'client', 'paypal')]
  [string]$Target,
  [Parameter(Mandatory = $true)]
  [ValidateSet('webshop', 'license-server')]
  [string]$Addon
)

$ErrorActionPreference = 'Stop'
$principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'local_addon_deployer_password_requires_administrator' }

$root = 'D:\nr_runtime\operator-input'
$rootItem = Get-Item -LiteralPath $root -Force -ErrorAction Stop
if (-not $rootItem.PSIsContainer -or (($rootItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) { throw 'local_addon_deployer_operator_root_invalid' }
$path = Join-Path $root "cms-addon-$Target-$Addon-deployer.password"
$systemSid = 'S-1-5-18'
$administratorsSid = 'S-1-5-32-544'

function New-OperatorAcl {
  $acl = [Security.AccessControl.FileSecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  $acl.SetOwner([Security.Principal.SecurityIdentifier]::new($administratorsSid))
  foreach ($sidValue in @($systemSid, $administratorsSid)) {
    [void]$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
      [Security.Principal.SecurityIdentifier]::new($sidValue),
      [Security.AccessControl.FileSystemRights]::FullControl,
      [Security.AccessControl.AccessControlType]::Allow
    ))
  }
  return $acl
}

function Assert-ProtectedPassword([string]$Candidate) {
  $item = Get-Item -LiteralPath $Candidate -Force -ErrorAction Stop
  if ($item.PSIsContainer -or (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) -or $item.Length -lt 43 -or $item.Length -gt 256) { throw 'local_addon_deployer_password_file_invalid' }
  $value = [IO.File]::ReadAllText($item.FullName, [Text.UTF8Encoding]::new($false, $true)).TrimEnd("`r", "`n")
  try {
    if ($value -notmatch '^[A-Za-z0-9_-]{43,128}$') { throw 'local_addon_deployer_password_value_invalid' }
  } finally { $value = $null }
  $acl = $item.GetAccessControl()
  if (-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $administratorsSid) { throw 'local_addon_deployer_password_acl_invalid' }
  $allowed = @($systemSid, $administratorsSid)
  foreach ($rule in @($acl.Access)) {
    $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
    if ($allowed -notcontains $sid -or $rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or $rule.IsInherited) { throw 'local_addon_deployer_password_acl_invalid' }
  }
}

$status = 'adopted'
if (-not (Test-Path -LiteralPath $path)) {
  $bytes = [byte[]]::new(48)
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $temporary = Join-Path $root ('.' + [IO.Path]::GetFileName($path) + '.' + [Guid]::NewGuid().ToString('N') + '.tmp')
  try {
    $rng.GetBytes($bytes)
    $value = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    [IO.File]::WriteAllText($temporary, ($value + "`r`n"), [Text.UTF8Encoding]::new($false))
    Set-Acl -LiteralPath $temporary -AclObject (New-OperatorAcl)
    Move-Item -LiteralPath $temporary -Destination $path -ErrorAction Stop
    $status = 'created'
  } finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
    $rng.Dispose()
    [Array]::Clear($bytes, 0, $bytes.Length)
    $value = $null
  }
}

Assert-ProtectedPassword $path
[Console]::Out.WriteLine((@{ addonKey = $Addon; contractVersion = 1; purpose = 'local_addon_deployer_password_input'; status = $status; target = $Target } | ConvertTo-Json -Compress))
