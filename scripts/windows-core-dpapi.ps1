param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("assert-input", "assert-output", "seal", "unseal", "audit-output")]
  [string]$Mode,
  [Parameter(Mandatory = $true)]
  [string]$Path,
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

# Windows PowerShell 5.1 does not reliably load System.Security on demand.
# Load it explicitly before resolving ProtectedData/DataProtectionScope so the
# operator-only LocalMachine DPAPI contract is independent of host defaults.
Add-Type -AssemblyName System.Security -ErrorAction Stop

function Get-CanonicalPath([string]$Candidate) {
  if (-not [System.IO.Path]::IsPathRooted($Candidate)) {
    throw "A protected secret path must be absolute."
  }
  return [System.IO.Path]::GetFullPath($Candidate)
}

function Assert-RegularFile([string]$Candidate) {
  $resolved = Get-CanonicalPath $Candidate
  $item = Get-Item -LiteralPath $resolved -Force
  if ($item.PSIsContainer -or (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) {
    throw "Protected secret input/output must not be a directory, symlink, or reparse point."
  }
  return $item
}

function Get-AllowedSids([bool]$IncludeCurrentOperator) {
  $allowed = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  [void]$allowed.Add("S-1-5-18") # LocalSystem
  [void]$allowed.Add("S-1-5-32-544") # Built-in Administrators
  if ($IncludeCurrentOperator) {
    [void]$allowed.Add([Security.Principal.WindowsIdentity]::GetCurrent().User.Value)
  }
  return $allowed
}

function Assert-ExactAcl([string]$Candidate, [bool]$IncludeCurrentOperator) {
  $item = Assert-RegularFile $Candidate
  $acl = $item.GetAccessControl()
  if (-not $acl.AreAccessRulesProtected) {
    throw "Protected secret ACL inheritance must be disabled."
  }
  $allowed = Get-AllowedSids $IncludeCurrentOperator
  foreach ($rule in $acl.Access) {
    $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
    if (-not $allowed.Contains($sid)) {
      throw "Protected secret ACL contains a non-operator principal."
    }
  }
}

function Set-OperatorOnlyAcl([string]$Candidate) {
  $item = Get-Item -LiteralPath $Candidate -Force
  $acl = [Security.AccessControl.FileSecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($sidValue in @("S-1-5-18", "S-1-5-32-544")) {
    $sid = [Security.Principal.SecurityIdentifier]::new($sidValue)
    $rule = [Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      [Security.AccessControl.FileSystemRights]::FullControl,
      [Security.AccessControl.AccessControlType]::Allow
    )
    [void]$acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $item.FullName -AclObject $acl
}

function Set-OperatorOnlyDirectoryAcl([string]$Candidate) {
  $directory = New-Item -ItemType Directory -Path $Candidate -Force
  if (($directory.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "The DPAPI operator root cannot be a reparse point."
  }
  $acl = [Security.AccessControl.DirectorySecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($sidValue in @("S-1-5-18", "S-1-5-32-544")) {
    $sid = [Security.Principal.SecurityIdentifier]::new($sidValue)
    $rule = [Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      [Security.AccessControl.FileSystemRights]::FullControl,
      [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit,
      [Security.AccessControl.PropagationFlags]::None,
      [Security.AccessControl.AccessControlType]::Allow
    )
    [void]$acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $directory.FullName -AclObject $acl
}

switch ($Mode) {
  "assert-input" {
    Assert-ExactAcl (Get-CanonicalPath $Path) $true
    exit 0
  }
  "assert-output" {
    Assert-ExactAcl (Get-CanonicalPath $Path) $false
    exit 0
  }
  "seal" {
    if (-not $OutputPath) { throw "seal requires -OutputPath." }
    Assert-ExactAcl (Get-CanonicalPath $Path) $true
    $output = Get-CanonicalPath $OutputPath
    $root = Split-Path -Parent $output
    Set-OperatorOnlyDirectoryAcl $root
    $inputText = [IO.File]::ReadAllText((Get-CanonicalPath $Path), [Text.Encoding]::UTF8).TrimEnd("`r", "`n")
    if ([string]::IsNullOrEmpty($inputText) -or $inputText.Contains("`r") -or $inputText.Contains("`n")) {
      throw "The protected password input must contain one non-empty line."
    }
    $plain = [Text.Encoding]::UTF8.GetBytes($inputText)
    try {
      $cipher = [Security.Cryptography.ProtectedData]::Protect(
        $plain,
        $null,
        [Security.Cryptography.DataProtectionScope]::LocalMachine
      )
      $temporary = Join-Path $root ("." + [IO.Path]::GetFileName($output) + "." + [Guid]::NewGuid().ToString("N") + ".tmp")
      [IO.File]::WriteAllBytes($temporary, $cipher)
      Set-OperatorOnlyAcl $temporary
      Move-Item -LiteralPath $temporary -Destination $output -Force
      Set-OperatorOnlyAcl $output
      Assert-ExactAcl $output $false
    } finally {
      if ($plain) { [Array]::Clear($plain, 0, $plain.Length) }
      if ($cipher) { [Array]::Clear($cipher, 0, $cipher.Length) }
      $inputText = $null
    }
    exit 0
  }
  "unseal" {
    Assert-ExactAcl (Get-CanonicalPath $Path) $false
    $cipher = [IO.File]::ReadAllBytes((Get-CanonicalPath $Path))
    try {
      $plain = [Security.Cryptography.ProtectedData]::Unprotect(
        $cipher,
        $null,
        [Security.Cryptography.DataProtectionScope]::LocalMachine
      )
      try {
        [Console]::OpenStandardOutput().Write($plain, 0, $plain.Length)
      } finally {
        if ($plain) { [Array]::Clear($plain, 0, $plain.Length) }
      }
    } finally {
      if ($cipher) { [Array]::Clear($cipher, 0, $cipher.Length) }
    }
    exit 0
  }
  "audit-output" {
    Assert-ExactAcl (Get-CanonicalPath $Path) $false
    $item = Assert-RegularFile (Get-CanonicalPath $Path)
    [Console]::Out.Write((@{
      aclProtected = $item.GetAccessControl().AreAccessRulesProtected
      path = $item.FullName
      secret = "redacted"
    } | ConvertTo-Json -Compress))
    exit 0
  }
}
