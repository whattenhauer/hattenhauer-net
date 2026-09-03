<#
.SYNOPSIS
    hattenhauer-net - full local-to-remote deployment script

.DESCRIPTION
    Automates the entire workflow:
      1. Verifies prerequisites (Node, npm, git, Wrangler)
      2. Installs npm dependencies
      3. Checks git status and pushes to GitHub (whattenhauer/hattenhauer-net)
      4. Deploys to Cloudflare via Wrangler
      5. Re-applies the AMAZON_ASSOCIATE_TAG secret if missing
      6. Verifies the deployment is live

.PARAMETER SkipGitPush
    Skip pushing to GitHub (deploy local code only)

.PARAMETER SkipSecret
    Skip the secret prompt (assume AMAZON_ASSOCIATE_TAG is already set)

.PARAMETER DryRun
    Show what would happen without making changes

.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -SkipGitPush
    .\deploy.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [switch]$SkipGitPush,
    [switch]$SkipSecret,
    [switch]$DryRun
)

# Prevent npm/npx stderr notices from becoming terminating errors
$ErrorActionPreference = 'Continue'
$PSNativeCommandUseErrorActionPreference = $false

# -- Config --
$WorkerName    = "hattenhauer-net"
$GitHubRemote  = "https://github.com/whattenhauer/hattenhauer-net.git"
$HealthUrl     = "https://hattenhauer.net/health"
$SecretName    = "AMAZON_ASSOCIATE_TAG"
$WranglerToml  = "wrangler.toml"

# -- Helpers --
function Write-Step  { param([string]$msg) Write-Host "`n> $msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn  { param([string]$msg) Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$msg) Write-Host "  [X]  $msg" -ForegroundColor Red }

function Test-Command {
    param([string]$cmd)
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

# Run npm commands via cmd.exe with stderr merged, filtering npm noise
function Run-Npm {
    param(
        [string[]]$NpmArgs,
        [switch]$Show
    )
    $allArgs = ($NpmArgs | ForEach-Object { if ($_ -match '\s') { "`"$_`"" } else { $_ } }) -join ' '
    $cmdLine = "npm $allArgs 2>&1"
    $raw = cmd.exe /c $cmdLine 2>&1 | ForEach-Object { $_.ToString() }
    $script:LastExit = $LASTEXITCODE
    $filtered = $raw | Where-Object {
        $_ -notmatch 'npm (notice|warn)' -or $_ -match 'error|ERR'
    }
    if ($Show) {
        $filtered | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
    return $filtered
}

# Run npx commands via cmd.exe with stderr merged, filtering npm noise
function Run-Npx {
    param(
        [string[]]$NpxArgs,
        [switch]$Show,
        [switch]$Interactive
    )
    $allArgs = ($NpxArgs | ForEach-Object { if ($_ -match '\s') { "`"$_`"" } else { $_ } }) -join ' '
    if ($Interactive) {
        # Let wrangler read stdin from the console for secret put
        cmd.exe /c "npx $allArgs 2>&1"
        $script:LastExit = $LASTEXITCODE
        return @()
    }
    $cmdLine = "npx $allArgs 2>&1"
    $raw = cmd.exe /c $cmdLine 2>&1 | ForEach-Object { $_.ToString() }
    $script:LastExit = $LASTEXITCODE
    $filtered = $raw | Where-Object {
        $_ -notmatch 'npm (notice|warn)' -or $_ -match 'error|ERR'
    }
    if ($Show) {
        $filtered | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
    return $filtered
}

# Run git commands, return output lines
function Run-Git {
    param([string[]]$GitArgs)
    $output = git @GitArgs 2>&1 | ForEach-Object { $_.ToString() }
    $script:LastExit = $LASTEXITCODE
    return @($output)
}

# -- Banner --
Write-Host @"
==============================================================
  hattenhauer-net - Local to Remote Deployment
  Worker: $WorkerName
  Repo:   whattenhauer/hattenhauer-net
==============================================================
"@ -ForegroundColor White

if ($DryRun) { Write-Warn "DRY RUN mode - no changes will be made." }

# == 1. Prerequisites ==
Write-Step "Checking prerequisites..."

$missing = @()
if (-not (Test-Command node)) { $missing += "node" }
if (-not (Test-Command npm))  { $missing += "npm" }
if (-not (Test-Command git))  { $missing += "git" }

if ($missing.Count -gt 0) {
    Write-Err "Missing: $($missing -join ', ')"
    Write-Host "  Install Node.js (includes npm) from https://nodejs.org/"
    Write-Host "  Install Git from https://git-scm.com/"
    exit 1
}

$nodeVer = (& node -v 2>$null)
$npmVer  = (& npm -v 2>$null)
$gitVer  = (& git --version 2>$null)
Write-Ok "Node $nodeVer, npm $npmVer, git $gitVer found."

# Check wrangler
$wranglerVersion = $null
if (Test-Command wrangler) {
    $wranglerVersion = (& wrangler --version 2>$null)
} elseif (Test-Path "node_modules\.bin\wrangler") {
    $wranglerVersion = (& node_modules\.bin\wrangler --version 2>$null)
}
if ($wranglerVersion) {
    Write-Ok "Wrangler $wranglerVersion found."
} else {
    Write-Warn "Wrangler not found - will be installed via npm."
}

# == 2. Verify project structure ==
Write-Step "Verifying project structure..."

if (-not (Test-Path $WranglerToml)) {
    Write-Err "$WranglerToml not found in $(Get-Location)"
    Write-Host "  Run this script from the hattenhauer-net project root."
    exit 1
}
Write-Ok "$WranglerToml found."

if (-not (Test-Path "src\index.js")) {
    Write-Err "src\index.js not found."
    exit 1
}
Write-Ok "src\index.js found."

# == 3. Install dependencies ==
Write-Step "Installing npm dependencies..."

if ($DryRun) {
    Write-Warn "[DRY RUN] npm install"
} else {
    $installOutput = Run-Npm -NpmArgs @('install') -Show
    if ($script:LastExit -ne 0) {
        Write-Err "npm install failed (exit $script:LastExit)."
        Write-Host "  Full output above. Common fixes:" -ForegroundColor Gray
        Write-Host "    - Delete node_modules and package-lock.json, then retry" -ForegroundColor Gray
        Write-Host "    - Run 'npm install' manually to see the full error" -ForegroundColor Gray
        exit 1
    }
    Write-Ok "Dependencies installed."
}

# == 4. Git: commit and push to GitHub ==
if (-not $SkipGitPush) {
    Write-Step "Syncing with GitHub ($GitHubRemote)..."

    # Ensure remote is set
    $remotes = Run-Git -GitArgs @('remote')
    if ($remotes -notcontains "origin") {
        if ($DryRun) {
            Write-Warn "[DRY RUN] git remote add origin $GitHubRemote"
        } else {
            Run-Git -GitArgs @('remote', 'add', 'origin', $GitHubRemote) | Out-Null
            Write-Ok "Added 'origin' remote -> $GitHubRemote"
        }
    } else {
        $existingUrl = (Run-Git -GitArgs @('remote', 'get-url', 'origin')).Trim()
        if ($existingUrl -ne $GitHubRemote) {
            if ($DryRun) {
                Write-Warn "[DRY RUN] git remote set-url origin $GitHubRemote"
            } else {
                Run-Git -GitArgs @('remote', 'set-url', 'origin', $GitHubRemote) | Out-Null
                Write-Ok "Updated 'origin' remote -> $GitHubRemote"
            }
        } else {
            Write-Ok "Origin remote already set correctly."
        }
    }

    # Stage all changes
    $gitStatus = Run-Git -GitArgs @('status', '--porcelain')
    $gitStatus = $gitStatus | Where-Object { $_ -and $_.Trim() }

    if ($gitStatus -and $gitStatus.Count -gt 0) {
        Write-Warn "Uncommitted changes detected:"
        $gitStatus | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }

        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        if ($DryRun) {
            Write-Warn "[DRY RUN] git add -A && git commit"
        } else {
            Run-Git -GitArgs @('add', '-A') | Out-Null
            Run-Git -GitArgs @('commit', '-m', "deploy: $timestamp - push current build to production") | Out-Null
            if ($script:LastExit -eq 0) {
                Write-Ok "Changes committed."
            } else {
                Write-Warn "git commit returned exit $script:LastExit - may be nothing to commit."
            }
        }
    } else {
        Write-Ok "Working tree clean - nothing to commit."
    }

    # Push
    $currentBranch = (Run-Git -GitArgs @('rev-parse', '--abbrev-ref', 'HEAD')).Trim()
    if (-not $currentBranch) { $currentBranch = "main" }

    if ($DryRun) {
        Write-Warn "[DRY RUN] git push -u origin $currentBranch"
    } else {
        $pushOutput = Run-Git -GitArgs @('push', '-u', 'origin', $currentBranch)
        $pushOutput | ForEach-Object {
            if ($_ -match 'error|fatal') { Write-Err $_ }
            elseif ($_ -match '->')      { Write-Ok $_ }
            else                          { Write-Host "  $_" -ForegroundColor Gray }
        }
        if ($script:LastExit -ne 0) {
            Write-Err "git push failed (exit $script:LastExit). Check your GitHub credentials / branch."
            exit 1
        }
    }
} else {
    Write-Step "Skipping git push (-SkipGitPush)"
}

# == 5. Deploy to Cloudflare via Wrangler ==
Write-Step "Deploying $WorkerName to Cloudflare..."

if ($DryRun) {
    Write-Warn "[DRY RUN] npx wrangler deploy"
} else {
    $deployOutput = Run-Npx -NpxArgs @('wrangler', 'deploy') -Show
    if ($script:LastExit -ne 0) {
        Write-Err "Wrangler deploy failed (exit $script:LastExit)."
        Write-Host "  Make sure you're logged in: npx wrangler login" -ForegroundColor Gray
        exit 1
    }
}

# == 6. Secret check ==
if (-not $SkipSecret) {
    Write-Step "Checking secret: $SecretName"

    if ($DryRun) {
        Write-Warn "[DRY RUN] Would check and prompt for $SecretName"
    } else {
        $secretList = Run-Npx -NpxArgs @('wrangler', 'secret', 'list')
        $secretFound = $false
        $secretList | ForEach-Object {
            if ($_ -match $SecretName) { $secretFound = $true }
        }

        if ($secretFound) {
            Write-Ok "$SecretName is already set."
        } else {
            Write-Warn "$SecretName is not set. You will be prompted to enter it."
            Write-Host "  (Input will be hidden - paste your Amazon Associate tag)" -ForegroundColor Gray

            # Interactive: let wrangler read stdin from console
            Run-Npx -NpxArgs @('wrangler', 'secret', 'put', $SecretName) -Interactive

            if ($script:LastExit -eq 0) {
                Write-Ok "$SecretName set successfully."
            } else {
                Write-Err "Failed to set $SecretName (exit $script:LastExit)."
                Write-Host "  Run manually: npx wrangler secret put $SecretName" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Step "Skipping secret check (-SkipSecret)"
}

# == 7. Verify deployment ==
Write-Step "Verifying deployment is live..."

if ($DryRun) {
    Write-Warn "[DRY RUN] Would curl $HealthUrl"
} else {
    Start-Sleep -Seconds 3

    try {
        $response = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 15
        if ($response.status -eq "ok") {
            Write-Ok "Deployment is LIVE - health check passed."
            Write-Host "  Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        } else {
            Write-Warn "Health endpoint responded but status was not 'ok': $response"
        }
    } catch {
        Write-Warn "Health check failed (endpoint may need a few more seconds): $($_.Exception.Message)"
        Write-Host "  Try again: curl $HealthUrl" -ForegroundColor Gray
    }
}

# -- Done --
Write-Host "`n==============================================================" -ForegroundColor Green
Write-Host "  Deployment complete!" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green

if (-not $DryRun) {
    Write-Host "`n  Worker:  https://hattenhauer.net" -ForegroundColor White
    Write-Host "  Ads:     https://hattenhauer.net/a" -ForegroundColor White
    Write-Host "  Health:  https://hattenhauer.net/health" -ForegroundColor White
    Write-Host "  Repo:    $GitHubRemote`n" -ForegroundColor White
}
