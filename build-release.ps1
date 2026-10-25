# Builds the signed .aab to upload to Google Play (com.harriercarrier.showdown; Google holds the app signing key, this is the upload key).
# For now it uses the Harrier Carrier upload key (Play allows one upload key for several apps); give Showdown its own before the first upload if wanted.
# The upload keystore and its password live in Azure Key Vault kv-wizzard262 (secrets harriercarrier-upload-jks, harriercarrier-upload-password),
# so nothing secret sits in the project file or git. Needs `az login`. If the vault can't be read, it falls back to the local keystore and asks for the password.
# Before each upload, bump <ApplicationVersion> in App1\Showdown.csproj.
param(
    [string]$Vault = "kv-wizzard262",
    [string]$KeyStore = "$env:USERPROFILE\Documents\Keys\harriercarrier-upload.jks",
    [string]$KeyAlias = "upload"
)

function Read-Secret([string]$prompt) {
    $secure = Read-Host $prompt -AsSecureString
    [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

$tempKeyStore = Join-Path $env:TEMP "harriercarrier-upload-$PID.jks"

try {
    az keyvault secret download --vault-name $Vault --name harriercarrier-upload-jks --file $tempKeyStore --encoding base64 --output none 2>$null
    $password = az keyvault secret show --vault-name $Vault --name harriercarrier-upload-password --query value -o tsv 2>$null
    if ((Test-Path $tempKeyStore) -and $password) {
        "Using the upload key from Key Vault $Vault"
        $KeyStore = $tempKeyStore
        $env:HC_STORE_PASS = $password
    }
    else {
        if (-not (Test-Path $KeyStore)) {
            Write-Error "Key Vault $Vault not readable and keystore not found: $KeyStore. Run az login, or pass -KeyStore <path to the upload keystore>."
            exit 1
        }
        "Key Vault $Vault not readable; using $KeyStore. Type the password (pasting only lets the first character through)."
        $env:HC_STORE_PASS = Read-Secret "Keystore password"
    }
    $env:HC_KEY_PASS = $env:HC_STORE_PASS

    dotnet publish "$PSScriptRoot\App1\Showdown.csproj" -c Release `
        -p:AndroidSigningKeyStore="$KeyStore" `
        -p:AndroidSigningKeyAlias="$KeyAlias" `
        -p:AndroidSigningStorePass=env:HC_STORE_PASS `
        -p:AndroidSigningKeyPass=env:HC_KEY_PASS
    if ($LASTEXITCODE -eq 0) {
        Get-ChildItem "$PSScriptRoot\App1\bin\Release\net10.0-android\publish\*-Signed.aab" | ForEach-Object { "Upload this to Google Play: $($_.FullName)" }
    }
}
finally {
    Remove-Item Env:HC_STORE_PASS, Env:HC_KEY_PASS -ErrorAction SilentlyContinue
    Remove-Item $tempKeyStore -ErrorAction SilentlyContinue
}
