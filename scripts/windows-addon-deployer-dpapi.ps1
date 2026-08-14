[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('seal', 'audit', 'unseal')]
  [string]$Mode,
  [Parameter(Mandatory = $true)]
  [ValidateSet('vendor', 'client', 'paypal')]
  [string]$Target
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security -ErrorAction Stop

$brokerSid = 'S-1-5-80-3652711265-2452513410-1713385316-4178467544-271876375'
$systemSid = 'S-1-5-18'
$administratorsSid = 'S-1-5-32-544'
$root = 'D:\nr_runtime\worker-secrets\db-deployer'
$path = Join-Path $root "$Target-webshop-db-deployer.v1.dpapi"
$database = if ($Target -eq 'vendor') { 'nr_cms_vendor_test' } elseif ($Target -eq 'client') { 'nr_cms_client_test' } else { 'nr_cms_paypal_test' }
$username = if ($Target -eq 'vendor') { 'nr_cms_vendor_webshop_deployer' } elseif ($Target -eq 'client') { 'nr_cms_client_webshop_deployer' } else { 'nr_cms_paypal_webshop_deployer' }
$secretRef = "dpapi-machine://nr-addon-worker/$Target/webshop-db-deployer/v1"

function Assert-Administrator {
  $principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'addon_deployer_dpapi_requires_elevated_administrator' }
}

function Assert-DbBrokerIdentity {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  if ($identity.User.Value -ne $brokerSid) { throw 'addon_deployer_dpapi_unseal_requires_db_broker_identity' }
}

function New-ExactAcl([bool]$Directory) {
  $acl = if ($Directory) { [Security.AccessControl.DirectorySecurity]::new() } else { [Security.AccessControl.FileSecurity]::new() }
  $acl.SetAccessRuleProtection($true, $false)
  $acl.SetOwner([Security.Principal.SecurityIdentifier]::new($administratorsSid))
  $inheritance = if ($Directory) { [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit } else { [Security.AccessControl.InheritanceFlags]::None }
  foreach ($entry in @(
    @{ Sid = $systemSid; Rights = [Security.AccessControl.FileSystemRights]::FullControl },
    @{ Sid = $administratorsSid; Rights = [Security.AccessControl.FileSystemRights]::FullControl },
    @{ Sid = $brokerSid; Rights = [Security.AccessControl.FileSystemRights]::ReadAndExecute }
  )) {
    [void]$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
      [Security.Principal.SecurityIdentifier]::new($entry.Sid), $entry.Rights, $inheritance,
      [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow
    ))
  }
  return $acl
}

function Set-ExactAcl([string]$Candidate, [bool]$Directory) { Set-Acl -LiteralPath $Candidate -AclObject (New-ExactAcl $Directory) }

function Assert-RegularBlob([string]$Candidate) {
  $item = Get-Item -LiteralPath $Candidate -Force -ErrorAction Stop
  if ($item.PSIsContainer -or (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) -or $item.Length -lt 1 -or $item.Length -gt 32768) { throw 'addon_deployer_dpapi_blob_invalid' }
  $acl = $item.GetAccessControl()
  if (-not $acl.AreAccessRulesProtected) { throw 'addon_deployer_dpapi_acl_inheritance_enabled' }
  if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $administratorsSid) { throw 'addon_deployer_dpapi_owner_invalid' }
  $rules = @($acl.Access)
  if ($rules.Count -ne 3) { throw 'addon_deployer_dpapi_acl_rule_count_invalid' }
  $expected = @{
    $systemSid = [Security.AccessControl.FileSystemRights]::FullControl
    $administratorsSid = [Security.AccessControl.FileSystemRights]::FullControl
    $brokerSid = [Security.AccessControl.FileSystemRights]::ReadAndExecute -bor [Security.AccessControl.FileSystemRights]::Synchronize
  }
  foreach ($rule in $rules) {
    $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
    if (-not $expected.ContainsKey($sid) -or $rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or $rule.IsInherited -or $rule.FileSystemRights -ne $expected[$sid] -or $rule.InheritanceFlags -ne [Security.AccessControl.InheritanceFlags]::None -or $rule.PropagationFlags -ne [Security.AccessControl.PropagationFlags]::None) { throw 'addon_deployer_dpapi_acl_rule_invalid' }
  }
  return $item
}

function Assert-Record([byte[]]$Bytes) {
  if ($Bytes.Length -lt 1 -or $Bytes.Length -gt 32768) { throw 'addon_deployer_dpapi_record_size_invalid' }
  $text = [Text.UTF8Encoding]::new($false, $true).GetString($Bytes)
  try { $record = $text | ConvertFrom-Json } catch { throw 'addon_deployer_dpapi_record_json_invalid' }
  $keys = @($record.PSObject.Properties.Name | Sort-Object)
  $expected = @('contractVersion','createdAt','database','password','secretRef','targetProfile','username')
  if (($keys -join ',') -ne ($expected -join ',')) { throw 'addon_deployer_dpapi_record_schema_invalid' }
  if ($record.contractVersion -ne 1 -or $record.targetProfile -ne $Target -or $record.database -ne $database -or $record.username -ne $username -or $record.secretRef -ne $secretRef) { throw 'addon_deployer_dpapi_record_binding_invalid' }
  if ([string]::IsNullOrEmpty($record.password) -or $record.password.Contains("`r") -or $record.password.Contains("`n") -or $record.password.Contains([char]0)) { throw 'addon_deployer_dpapi_password_invalid' }
  $created = [DateTimeOffset]::MinValue
  if (-not [DateTimeOffset]::TryParseExact($record.createdAt, 'yyyy-MM-ddTHH:mm:ss.fffZ', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal, [ref]$created)) { throw 'addon_deployer_dpapi_created_at_invalid' }
  return $text
}

function Get-Sha256([byte[]]$Bytes) {
  $hash = [Security.Cryptography.SHA256]::Create().ComputeHash($Bytes)
  try { return ([BitConverter]::ToString($hash)).Replace('-', '').ToLowerInvariant() } finally { [Array]::Clear($hash, 0, $hash.Length) }
}

if ($Mode -eq 'unseal') { Assert-DbBrokerIdentity } else { Assert-Administrator }
if ($Mode -eq 'seal') {
  New-Item -ItemType Directory -Path $root -Force | Out-Null
  Set-ExactAcl $root $true
  $memory = [IO.MemoryStream]::new()
  [Console]::OpenStandardInput().CopyTo($memory)
  $plain = $memory.ToArray(); $memory.Dispose()
  $cipher = $null
  try {
    $plainText = Assert-Record $plain
    $newRecord = $plainText | ConvertFrom-Json
    if (Test-Path -LiteralPath $path) {
      $existingCipher = [IO.File]::ReadAllBytes($path)
      try {
        $existingPlain = [Security.Cryptography.ProtectedData]::Unprotect($existingCipher, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
        try {
          $existingRecord = (Assert-Record $existingPlain) | ConvertFrom-Json
          foreach ($name in @('contractVersion','database','password','secretRef','targetProfile','username')) {
            if (-not ([string]$existingRecord.$name).Equals([string]$newRecord.$name, [StringComparison]::Ordinal)) { throw 'addon_deployer_dpapi_existing_record_conflict' }
          }
        }
        finally { [Array]::Clear($existingPlain, 0, $existingPlain.Length) }
      } finally { [Array]::Clear($existingCipher, 0, $existingCipher.Length) }
    } else {
      $cipher = [Security.Cryptography.ProtectedData]::Protect($plain, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
      $temporary = Join-Path $root ('.' + [IO.Path]::GetFileName($path) + '.' + [Guid]::NewGuid().ToString('N') + '.tmp')
      try { [IO.File]::WriteAllBytes($temporary, $cipher); Set-ExactAcl $temporary $false; Move-Item -LiteralPath $temporary -Destination $path -ErrorAction Stop }
      finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force } }
    }
    Set-ExactAcl $path $false
  } finally {
    [Array]::Clear($plain, 0, $plain.Length)
    if ($cipher) { [Array]::Clear($cipher, 0, $cipher.Length) }
  }
}

$item = Assert-RegularBlob $path
$cipherBytes = [IO.File]::ReadAllBytes($item.FullName)
try {
  if ($Mode -eq 'unseal') {
    $plainBytes = [Security.Cryptography.ProtectedData]::Unprotect($cipherBytes, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
    try { [void](Assert-Record $plainBytes); [Console]::OpenStandardOutput().Write($plainBytes, 0, $plainBytes.Length) }
    finally { [Array]::Clear($plainBytes, 0, $plainBytes.Length) }
  } else {
    [Console]::Out.WriteLine((@{ contractVersion = 1; purpose = 'addon_deployer_dpapi_receipt'; target = $Target; secretRef = $secretRef; ciphertextSha256 = Get-Sha256 $cipherBytes; aclProtected = $true; allowedSids = @(@($administratorsSid,$brokerSid,$systemSid) | Sort-Object) } | ConvertTo-Json -Compress))
  }
} finally { [Array]::Clear($cipherBytes, 0, $cipherBytes.Length) }
