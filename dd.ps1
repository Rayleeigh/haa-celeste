using namespace System.Net
param($Request, $TriggerMetadata)

$ErrorActionPreference = "Stop"

# ---------------- Config ----------------
$resourceGroup      = $env:DNS_BACKUP_RG
$storageAccountName = $env:DNS_BACKUP_SA_NAME
$backupContainer    = $env:DNS_BACKUP_BACKUP_CONTAINER
$logContainer       = $env:DNS_BACKUP_LOG_CONTAINER

# Subscription that contains the Private DNS zones RG
$forcedSubscriptionId = "2dc73803-1766-4e9e-8ea1-934a6df3ed66"

if ([string]::IsNullOrWhiteSpace($resourceGroup))      { $resourceGroup      = "CSP-WE-NETWORK-RG" }
if ([string]::IsNullOrWhiteSpace($storageAccountName)) { $storageAccountName = "bstsnazcautomationsa" }
if ([string]::IsNullOrWhiteSpace($backupContainer))    { $backupContainer    = "dns-backups" }
if ([string]::IsNullOrWhiteSpace($logContainer))       { $logContainer       = "dns-backup-logs" }

# ---------------- Storage init (strict) ----------------
$ctx = New-AzStorageContext `
    -StorageAccountName $storageAccountName `
    -UseConnectedAccount `
    -ErrorAction Stop

function Ensure-StorageContainer {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][Microsoft.Azure.Commands.Common.Authentication.Abstractions.AzureStorageContext]$Context
    )

    try {
        $null = Get-AzStorageContainer -Name $Name -Context $Context -ErrorAction Stop
        return
    }
    catch {
        $msg = $_.Exception.Message
        $isNotFound =
            $msg -match '(?i)The specified container does not exist' -or
            $msg -match '(?i)ContainerNotFound' -or
            $msg -match '(?i)404'

        if (-not $isNotFound) { throw }

        New-AzStorageContainer -Name $Name -Context $Context -ErrorAction Stop | Out-Null
    }
}

Ensure-StorageContainer -Name $backupContainer -Context $ctx
Ensure-StorageContainer -Name $logContainer    -Context $ctx

# ---------------- Helpers ----------------
function Get-SafeFileName {
    param([Parameter(Mandatory)][string]$Name)

    $invalid = [System.IO.Path]::GetInvalidFileNameChars()
    foreach ($c in $invalid) { $Name = $Name.Replace($c, '_') }
    return $Name
}

# ---------------- Run tracking ----------------
$runStartUtc = (Get-Date).ToUniversalTime()
$runStart    = Get-Date
$runStatus   = "Success"
$runError    = $null

# Naming / prefix conventions
$exportDate = Get-Date -Format "dd-MM-yyyy"
$blobPrefix = (Get-Date -Format "yyyy/MM/dd") + "/"

# Counters
$zoneCount           = 0
$totalRecordSetCount = 0
$exportedFileCount   = 0
$uploadedBackupCount = 0
$missingBlobCount    = 0

# Paths (local temp)
$exportRoot = Join-Path $env:TEMP "dns-recordsets"
$logRoot    = Join-Path $env:TEMP "dns-backup-runlogs"

New-Item -Path $exportRoot -ItemType Directory -Force | Out-Null
New-Item -Path $logRoot    -ItemType Directory -Force | Out-Null

# ---------------- Main logic ----------------
try {
    # Save current context (optional restore later if you care)
    $prevContext = Get-AzContext -ErrorAction Stop

    # Switch subscription for Private DNS Zone queries
    Set-AzContext -SubscriptionId $forcedSubscriptionId -ErrorAction Stop | Out-Null

    # Bulk query: zones
    $privateDnsZones = Get-AzPrivateDnsZone -ResourceGroupName $resourceGroup -ErrorAction Stop
    $zoneCount = @($privateDnsZones).Count

    if ($zoneCount -eq 0) {
        throw "No Private DNS Zones found in resource group '$resourceGroup' (subscription '$forcedSubscriptionId')."
    }

    # Export record sets per zone to JSON files
    foreach ($zone in $privateDnsZones) {
        $zoneName = $zone.Name
        if ([string]::IsNullOrWhiteSpace($zoneName)) {
            throw "Encountered a Private DNS Zone with an empty Name property."
        }

        $recordSets = Get-AzPrivateDnsRecordSet `
            -ResourceGroupName $resourceGroup `
            -ZoneName $zoneName `
            -ErrorAction Stop

        $recordSetCount = @($recordSets).Count
        $totalRecordSetCount += $recordSetCount

        $payload = [pscustomobject]@{
            subscriptionId  = $forcedSubscriptionId
            resourceGroup   = $resourceGroup
            zoneName        = $zoneName
            exportedAtUtc   = (Get-Date).ToUniversalTime().ToString("o")
            recordSetCount  = $recordSetCount
            recordSets      = $recordSets
        }

        $safeZoneName = Get-SafeFileName -Name $zoneName
        $fileName     = "{0}-recordset-{1}.json" -f $safeZoneName, $exportDate
        $filePath     = Join-Path $exportRoot $fileName

        $payload | ConvertTo-Json -Depth 50 | Set-Content -Path $filePath -Encoding UTF8
    }

    $exportedFiles = Get-ChildItem -Path $exportRoot -Filter "*-recordset-$exportDate.json" -File -ErrorAction Stop
    $exportedFileCount = @($exportedFiles).Count

    if ($exportedFileCount -eq 0) {
        throw "Export step produced no JSON files in '$exportRoot'."
    }

    # Upload backups with date prefix
    $expectedBlobNames = New-Object System.Collections.Generic.List[string]

    foreach ($file in $exportedFiles) {
        $blobName = $blobPrefix + $file.Name
        $expectedBlobNames.Add($blobName) | Out-Null

        Set-AzStorageBlobContent `
            -File $file.FullName `
            -Container $backupContainer `
            -Blob $blobName `
            -Context $ctx `
            -Force `
            -ErrorAction Stop | Out-Null
    }

    $uploadedBackupCount = $exportedFileCount

    # Verify uploads strictly (existence under prefix)
    $blobsToday = Get-AzStorageBlob `
        -Container $backupContainer `
        -Context $ctx `
        -Prefix $blobPrefix `
        -ErrorAction Stop

    $blobNameSet = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($b in $blobsToday) { [void]$blobNameSet.Add($b.Name) }

    $missing = @()
    foreach ($name in $expectedBlobNames) {
        if (-not $blobNameSet.Contains($name)) { $missing += $name }
    }

    $missingBlobCount = @($missing).Count
    if ($missingBlobCount -gt 0) {
        throw ("Upload verification failed. Missing blobs: " + ($missing -join ", "))
    }

    # Optional: restore previous context
    # Set-AzContext -Context $prevContext -ErrorAction Stop | Out-Null
}
catch {
    $runStatus = "Failed"
    $runError  = $_
}
finally {
    $runEndUtc  = (Get-Date).ToUniversalTime()
    $durationMs = [int]((Get-Date) - $runStart).TotalMilliseconds

    # Build summary payload
    $summary = [pscustomobject]@{
        status             = $runStatus
        startedAtUtc       = $runStartUtc.ToString("o")
        finishedAtUtc      = $runEndUtc.ToString("o")
        durationMs         = $durationMs

        subscriptionId     = $forcedSubscriptionId
        resourceGroup      = $resourceGroup
        storageAccountName = $storageAccountName
        backupContainer    = $backupContainer
        logContainer       = $logContainer
        blobPrefix         = $blobPrefix

        zoneCount           = $zoneCount
        totalRecordSetCount = $totalRecordSetCount
        exportedFileCount   = $exportedFileCount
        uploadedBackupCount = $uploadedBackupCount
        missingBlobCount    = $missingBlobCount

        error = if ($runError) {
            [pscustomobject]@{
                message = $runError.Exception.Message
                type    = $runError.Exception.GetType().FullName
                stack   = $runError.ScriptStackTrace
                raw     = ($runError | Out-String).Trim()
            }
        } else { $null }
    }

    # Write + upload run log (same conventions: date in filename, yyyy/MM/dd prefix)
    $logFileName = "dns-backup-runlog-{0}.json" -f $exportDate
    $logFilePath = Join-Path $logRoot $logFileName
    $summary | ConvertTo-Json -Depth 50 | Set-Content -Path $logFilePath -Encoding UTF8

    $logBlobName = $blobPrefix + $logFileName

    try {
        Set-AzStorageBlobContent `
            -File $logFilePath `
            -Container $logContainer `
            -Blob $logBlobName `
            -Context $ctx `
            -Force `
            -ErrorAction Stop | Out-Null
    }
    catch {
        # Don't hide this—include in HTTP response body
        $summary = [pscustomobject]@{
            originalSummary = $summary
            logUploadError  = ($_ | Out-String).Trim()
        }
    }

    # HTTP response
    $httpStatus = if ($runStatus -eq "Success") { 200 } else { 500 }

    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = $httpStatus
        Headers    = @{ "Content-Type" = "application/json" }
        Body       = ($summary | ConvertTo-Json -Depth 50)
    })

    # If failed, also fail the function execution (strict) AFTER responding
    if ($runStatus -eq "Failed") {
        throw $runError
    }
}
