---
title: "C# security: unsafe APIs, supply chain, binary trust (csharp-quality/security.md)"
topic: csharp-security (group "Security"; target csharp-quality/security.md; rule prefix CS-SEC, plus CS-BIN-20..28)
model: claude-opus-5-5 (consolidator)
consolidates:
  - csharp-security/csharp-security-unsafe-apis.md
  - csharp-security/csharp-security-supply-chain.md
  - csharp-security/csharp-security-binary-attestation.md
grounding:
  - csharp-audit/ocx-cli-contract.md
  - csharp-audit/python-sdk-digest.md
  - csharp-audit/exemplar-build-and-gates.md
  - csharp-topic-map.md (owner decisions 1-5; SC-01, SC-03, PK-12)
date: 2026-10-11
fixtures: /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-security/
---

# C# security: unsafe APIs, supply chain, binary trust

Citation tags: **[UNSAFE]** = `csharp-security/csharp-security-unsafe-apis.md`, **[SUPPLY]** = `csharp-security/csharp-security-supply-chain.md`, **[ATTEST]** = `csharp-security/csharp-security-binary-attestation.md`, **[C]** = a run made for this consolidation (fixture root above, `R=/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`, SDK 10.0.401, TFMs net8.0;net10.0). Earlier-wave IDs (CS-BUILD, CS-PROC, CS-BIN, CS-JSON, CS-API, CS-ERR, CS-XP) are cited, not re-decided, except where a conflict below says otherwise. Paths assume the package ID `Ocx.Sdk` (owner decision 5 still open) and a single nupkg in `artifacts/`.

## Verdict

1. **The gate already covers the analyzers.** `AnalysisLevel=10.0-all` (CS-BUILD-10) sets all 94 security IDs to warning, and TWAE turns them into errors. The SDK default enables 0 of them and `recommended` enables 24. On the planted fixture, `10.0-all` fired 25 security IDs [UNSAFE §1; C]. **Decision: add no per-rule security severity lines, and never lower one.**
2. **Eight hazard classes stay silent under the gate:**
   - Regex without a timeout;
   - a type or assembly named by a string;
   - `XmlUrlResolver` or `DtdProcessing.Parse` (CA3075, CA3076 and CA3077 are inert on net8+ because of an `mscorlib` check);
   - XSLT script;
   - TLS validation callbacks;
   - `SecureString`;
   - the DER-vs-P1363 overloads of `ECDsa`.

   **Decision: one 40-line `BannedSymbols.Security.txt`.** It goes with `RS0030` and `RS0031` at `error` in `.globalconfig`. Without that severity line, `-p:TreatWarningsAsErrors=false` turned all 24 bans into warnings and the build exited 0 [C].
3. **These are historical on net8+:** BinaryFormatter and its siblings, the XXE defaults, and entity bombs. They appear as table rows, not rules.
   - BinaryFormatter: `SYSLIB0011` is an error from net7, the runtime throws on net8, and the type is removed on net9+.
   - XXE: `XmlReader.Create` throws on a DOCTYPE, and the resolver is null by default.
   - Entity bombs: the default cap is 1e7 characters [UNSAFE §2, §4].
4. **Conflict: polymorphism.** [UNSAFE] prescribes a `[JsonDerivedType]` allow-list that throws on an unknown tag. CS-JSON-07 and CS-API-08 already require a hand-written tag-first converter with an `Unknown` arm. **Decision: CS-JSON wins.** Both satisfy the one security property, that no type is ever named by wire data. Throwing on an unknown tag would break forward compatibility.
5. **Conflict: fixed-time compare.** [UNSAFE] N11 wants `FixedTimeEquals` on every digest. CS-JSON-15 keeps the OCI digests that ocx reports as `string` identifiers. **Decision:**
   - Use `FixedTimeEquals` on bytes only where downloaded bytes are authenticated (CS-BIN-07, CS-BIN-20 and the sidecar), through one helper.
   - Ocx-reported digests stay ordinal string identity.
6. **Conflict: CA5394.** [UNSAFE] allows a pragma for jitter that is not security-relevant. CS-SEC-06 forbids security suppressions in `src`. **Decision:** retry jitter uses `RandomNumberGenerator.GetInt32`, which costs nothing and needs no suppression.
7. **Conflict: the dependency budget.** CS-BUILD-24 says the SDK nuspec has "none" on net8+. CS-JSON-14 adds `System.Text.Json` 10 on net8, and the measured result is 1 direct and 2 transitive packages [SUPPLY §2.1]. **Decision: net10.0 has 0 dependencies, and net8.0 has `System.Text.Json` only.** The gate checks the nuspec, never `dotnet package list`.
8. **Conflict: MinVer.** CS-PKG-06 writes `<PackageReference Include="MinVer" Version="8.0.0" PrivateAssets="all" />`. That is the `Version=`-on-`PackageReference` form that CS-BUILD-23 forbids (NU1008 under CPM). **Decision:** MinVer becomes a `GlobalPackageReference` in `Directory.Packages.props`. The global form was measured never to reach the nuspec [SUPPLY V4]. `PrivateAssets` on a `<PackageVersion>` is a silent no-op [SUPPLY V4].
9. **Supply-chain controls that matter:**
   - an existence and owner check on every new package ID;
   - a named allowlist of packages that run code at build. A `.targets` file ran `Exec` on `dotnet build`, not on restore [SUPPLY V5].

   **Decision:** NuGet `signatureValidationMode=require` stays off at v1. It does not stop a typosquat, and it is inert on macOS. The repo ships no SBOM and runs no `nuget verify` sweep, because CS-BUILD-27 already restores into an empty folder and Linux and Windows restores verify repository signatures.
10. **Binary trust: v1 verifies a compiled-in, triangulated SHA-256 pin, not a signature.** ocx v0.6.5 publishes no signature, no attestation and no `dist.json.sig` [ATTEST F2]. Add CS-BIN-20..28 (mapping below). Verification fails hard, with no skip option. Ed25519/minisign and the `Sigstore` NuGet package stay out of the core.
    - The upstream ask is ECDSA P-256 DER over `dist.json`, not minisign. .NET 8, 10 and 11 RC1 have no Ed25519 [ATTEST F3].
    - The CS-BIN rows hold under all three delivery models (owner decision 3). The pin file is the common core, and only its consumer differs.
11. **A cross-group defect was found while merging.** Duplicate symbols across `BannedSymbols*.txt` files raise `RS0031`, which is an error under TWAE [C]. The existing posture fragments already collide on 9 symbols (CS-BUILD-15 vs CS-PROC, CS-BUILD-15 vs CS-XP-11, CS-BIN-11/16 vs CS-XP-10). The csharp-build posture must deduplicate when it merges the fragments (CS-SEC-02).

## The ruleset

### Hazard matrix (the brief's per-analyzer rows)

"Fires" means it fires at `AnalysisLevel=10.0-all` with no extra configuration, on net8.0 and net10.0. This was measured on `red/` [UNSAFE §1, §11] and re-run here [C]: 25 security IDs, identical on both TFMs and on SDK 11 RC1 `net11.0`.

| # | Hazard | Analyzer | Fires? | Gap closer | Status |
|---|---|---|---|---|---|
| H1 | `BinaryFormatter` | `SYSLIB0011` (compiler error since net7); CA2300/2301/2302 | yes (compile error) | none needed; a `T:` ban line only if an ns2.0 slice ships (owner decision 1) | **historical** on net8+ |
| H2 | `NetDataContractSerializer`, `SoapFormatter`, `LosFormatter`, `ObjectStateFormatter`, `JavaScriptSerializer` | CA2305, CA2310-2315, CA2321, CA2322 | n/a: types absent (`CS0234`/`CS0246`) | none | **historical** |
| H3 | Newtonsoft `TypeNameHandling` != None | CA2326, CA2327-2330 | yes (all-only) | CS-JSON-16 rejects Newtonsoft | do-not-add |
| H4 | `DataSet`/`DataTable.ReadXml` | CA2350, CA2351 (all-only), CA5366 | yes | CS-SEC-05 | do-not-add |
| H5 | Converter that resolves `$type` via `Type.GetType` | none | **silent** (gadget flag came back `True`) | ban (CS-SEC-02/04) | rule |
| H6 | XXE via `XmlUrlResolver`, `XmlSecureResolver`, `DtdProcessing.Parse` | CA3075, CA3077 | **silent**: inert unless `System.String` is in `mscorlib` | ban | rule (defaults are safe; **historical by default**) |
| H7 | XML readers without an `XmlReader` | CA5369, CA5371, CA5372, CA5366 | yes | CS-SEC-05 | do-not-add |
| H8 | Entity-expansion bomb | none | n/a | default cap 1e7 chars (source, not docs); 111-1430 ms, then throws | **historical** |
| H9 | XSLT script/`document()` | CA3076 (inert) | **silent** | ban 2 properties | do-not-add |
| H10 | MD5/SHA1/DES/3DES/RC2/DSA, ECB, static key/IV, RSA-CSP 1024 | CA5350, CA5351, CA5384, CA5358, CA5390, CA5401, CA5385 | yes | none | rule (CS-SEC-08) |
| H11 | `Rfc2898DeriveBytes` constructors | CA5379, CA5387, `SYSLIB0060` (net10) | yes | none | not used by the SDK |
| H12 | Static `Pbkdf2(..., 1000, ...)`, `RSA.Create(1024)` | none | **silent** | review only; the SDK derives no keys | out of scope |
| H13 | `Random`/`Random.Shared` | CA5394 (all-only) | yes | none | rule (CS-SEC-07) |
| H14 | `Guid.NewGuid()` as a secret | none | **silent** | rg review | rule (CS-SEC-07) |
| H15 | Regex without match timeout | none (MA0009 is third-party, excluded by CS-BUILD-15) | **silent** (2.0-3.8 s at 26 chars, doubling per char) | ban 18 overloads | rule (CS-SEC-03) |
| H16 | Untrusted regex pattern | none | **silent** | rg review (docs: a timeout is not a boundary) | rule (CS-SEC-03) |
| H17 | `SecureString` | none (DE0001 is documentation only) | **silent** | ban type | rule (CS-SEC-02) |
| H18 | TLS: `ServerCertificateCustomValidationCallback = ... => true`, `DangerousAcceptAnyServerCertificateValidator`, `RemoteCertificateValidationCallback` | CA5359 (only `ServicePointManager`), CA5397, CA5399, CA5400 | lambda forms **silent** | ban 4 properties | rule (CS-BIN-16) |
| H19 | Zip-slip `Path.Combine(dest, entry.FullName)` | CA5389 | yes | CS-BIN-10 bans whole-archive extraction | rule (CS-BIN-10) |
| H20 | SQL string concat | CA2100 (not via `IDbCommand`) | yes | CS-SEC-05 | do-not-add |
| H21 | P/Invoke without search paths | CA5392 | yes | CS-SEC-05 | do-not-add |
| H22 | Taint rules CA3001-CA3012 | CA3001-3012 | silent in a library (they need web sources) | none | n/a |
| H23 | `Assembly.LoadFrom/LoadFile/UnsafeLoadFrom`, `Activator.CreateInstance(string,string)` | none | **silent** | ban | rule (CS-SEC-04) |
| H24 | DER signature through the 3-argument `ECDsa.VerifyData` | none | **silent** `false` | ban 5 overloads | rule (CS-BIN-28, v1.x) |
| H25 | `System.Security.Cryptography.Ed25519` | `CS0234` | yes (type does not exist on net8/10/11 RC1) | none | hallucination |
| H26 | Hard-coded secret literal | none | **silent** | CS-PROC-08 review | cited |

### The merged ban fragment (for the csharp-build posture)

The file is `BannedSymbols.Security.txt`, registered as `AdditionalFiles` next to the CS-BUILD, CS-PROC and CS-XP fragments. It holds 40 symbol lines (47 with comments), at `consolidate-csharp-security/BannedSymbols.Security.txt`. It differs from [UNSAFE §9] in three ways:
- **Dropped:** the `BinaryFormatter` and `NetDataContractSerializer` lines, which are historical on net8+ (H1/H2).
- **Added:** the 5 `ECDsa` lines [ATTEST F11.8].
- **Moved:** the CS-BIN-16 `DangerousAcceptAnyServerCertificateValidator` line now lives only here. The CS-BIN fragment must drop it, or `RS0031` fires.

```text
// --- XML (CS-SEC-05): net8+ is safe by default; CA3075/CA3076/CA3077/CA3061 never run on net8+ (mscorlib gate).
T:System.Xml.XmlUrlResolver;CS-SEC-05: external entity resolution (XXE). Leave XmlResolver unset or null
T:System.Xml.XmlSecureResolver;CS-SEC-05: obsolete CAS-era resolver. Leave XmlResolver unset or null
F:System.Xml.DtdProcessing.Parse;CS-SEC-05: use DtdProcessing.Prohibit (the XmlReader.Create default)
P:System.Xml.Xsl.XsltSettings.EnableScript;CS-SEC-05: XSLT script blocks execute code
P:System.Xml.Xsl.XsltSettings.EnableDocumentFunction;CS-SEC-05: document() reads arbitrary URLs
// --- ReDoS (CS-SEC-03): no CA rule exists. Every Regex carries a match timeout.
M:System.Text.RegularExpressions.Regex.#ctor(System.String);CS-SEC-03: pass a TimeSpan matchTimeout <= 1 s
M:System.Text.RegularExpressions.Regex.#ctor(System.String,System.Text.RegularExpressions.RegexOptions);CS-SEC-03: pass a TimeSpan matchTimeout <= 1 s
M:System.Text.RegularExpressions.Regex.IsMatch(System.String,System.String);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.IsMatch(System.String,System.String,System.Text.RegularExpressions.RegexOptions);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.Match(System.String,System.String);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.Match(System.String,System.String,System.Text.RegularExpressions.RegexOptions);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.Matches(System.String,System.String);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.Matches(System.String,System.String,System.Text.RegularExpressions.RegexOptions);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.Replace(System.String,System.String,System.String);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.Replace(System.String,System.String,System.String,System.Text.RegularExpressions.RegexOptions);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.Split(System.String,System.String);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.Split(System.String,System.String,System.Text.RegularExpressions.RegexOptions);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.IsMatch(System.ReadOnlySpan{System.Char},System.String);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.IsMatch(System.ReadOnlySpan{System.Char},System.String,System.Text.RegularExpressions.RegexOptions);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.EnumerateMatches(System.ReadOnlySpan{System.Char},System.String);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.Regex.EnumerateMatches(System.ReadOnlySpan{System.Char},System.String,System.Text.RegularExpressions.RegexOptions);CS-SEC-03: use the overload with a TimeSpan matchTimeout
M:System.Text.RegularExpressions.GeneratedRegexAttribute.#ctor(System.String);CS-SEC-03: use [GeneratedRegex(pattern, options, matchTimeoutMilliseconds)]
M:System.Text.RegularExpressions.GeneratedRegexAttribute.#ctor(System.String,System.Text.RegularExpressions.RegexOptions);CS-SEC-03: use [GeneratedRegex(pattern, options, matchTimeoutMilliseconds)]
// --- Type or code named by data (CS-SEC-04): resolve wire tags through a closed table.
M:System.Type.GetType(System.String);CS-SEC-04: never resolve a type from a string; switch on a closed tag table
M:System.Type.GetType(System.String,System.Boolean);CS-SEC-04: never resolve a type from a string; switch on a closed tag table
M:System.Type.GetType(System.String,System.Boolean,System.Boolean);CS-SEC-04: never resolve a type from a string; switch on a closed tag table
M:System.Activator.CreateInstance(System.String,System.String);CS-SEC-04: never instantiate a type named by a string
M:System.Reflection.Assembly.LoadFrom(System.String);CS-SEC-04: the SDK loads no assemblies
M:System.Reflection.Assembly.LoadFile(System.String);CS-SEC-04: the SDK loads no assemblies
M:System.Reflection.Assembly.UnsafeLoadFrom(System.String);CS-SEC-04: the SDK loads no assemblies
// --- TLS validation hooks (CS-BIN-16): the lambda forms are silent at 10.0-all; only CA5359 (ServicePointManager) fires.
P:System.Net.Http.HttpClientHandler.ServerCertificateCustomValidationCallback;CS-BIN-16: never replace certificate validation; custom roots go through SslOptions.CertificateChainPolicy
P:System.Net.Http.HttpClientHandler.DangerousAcceptAnyServerCertificateValidator;CS-BIN-16: disables certificate validation
P:System.Net.Security.SslClientAuthenticationOptions.RemoteCertificateValidationCallback;CS-BIN-16: never replace certificate validation; use CertificateChainPolicy
P:System.Net.ServicePointManager.ServerCertificateValidationCallback;CS-BIN-16: legacy global hook; never replace certificate validation
// --- Secrets in memory (CS-PROC-08): SecureString is not encrypted off Windows (DE0001).
T:System.Security.SecureString;CS-PROC-08: secrets travel as UTF-8 bytes on stdin or in the child environment
// --- Signature verification (CS-BIN-28, v1.x): the 3-argument overloads assume IEEE P1363; openssl/cosign emit DER.
M:System.Security.Cryptography.ECDsa.VerifyData(System.Byte[],System.Byte[],System.Security.Cryptography.HashAlgorithmName);CS-BIN-28: pass DSASignatureFormat.Rfc3279DerSequence explicitly
M:System.Security.Cryptography.ECDsa.VerifyData(System.ReadOnlySpan{System.Byte},System.ReadOnlySpan{System.Byte},System.Security.Cryptography.HashAlgorithmName);CS-BIN-28: pass DSASignatureFormat.Rfc3279DerSequence explicitly
M:System.Security.Cryptography.ECDsa.VerifyData(System.IO.Stream,System.Byte[],System.Security.Cryptography.HashAlgorithmName);CS-BIN-28: pass DSASignatureFormat.Rfc3279DerSequence explicitly
M:System.Security.Cryptography.ECDsa.VerifyHash(System.Byte[],System.Byte[]);CS-BIN-28: use VerifyData with HashAlgorithmName and DSASignatureFormat
M:System.Security.Cryptography.ECDsa.VerifyHash(System.ReadOnlySpan{System.Byte},System.ReadOnlySpan{System.Byte});CS-BIN-28: use VerifyData with HashAlgorithmName and DSASignatureFormat
```

`.globalconfig` additions (the only two security lines in the posture):

```ini
# RS0030/RS0031: a ban must fail even when TreatWarningsAsErrors is flipped off locally (measured: exit 0 without this line).
dotnet_diagnostic.RS0030.severity = error
dotnet_diagnostic.RS0031.severity = error
```

**Deduplication the build posture owes** (measured collisions across the existing fragments [C]; each raises RS0031 once the files are merged):
- `CS-BUILD-15` starter file vs `CS-PROC` fragment: `Encoding.Default`, `ProcessStartInfo.Arguments`, `Process.Start(String,String)`.
- `CS-BUILD-15` vs `CS-XP-11` time fragment: `DateTime.Now`, `DateTimeOffset.Now`.
- CS-BIN gate vs `CS-XP-10`: `RuntimeInformation.RuntimeIdentifier`.
- CS-BIN gate vs packaging `banparams`: `HttpContent.ReadAsByteArrayAsync`, `ReadAsStringAsync`.
- CS-BIN-16 vs this fragment: `DangerousAcceptAnyServerCertificateValidator`.

**Resolution:** the CS-BUILD-15 five-line starter is superseded by the CS-PROC and CS-XP fragments. Each symbol lives in exactly one file, owned by the rule that names it.

### Rules

**CS-SEC-01 (MUST) Keep the security category at `All` in every project, src and tests alike. Add no per-rule severity line for a security ID, and never lower one.** A project that lowers the general `AnalysisLevel` sets `<AnalysisModeSecurity>All</AnalysisModeSecurity>`.
- **Rationale:** the default mode enables 0 of 94 security IDs. `recommended` omits CA2326, CA2350, CA2351 and CA5394. `AnalysisModeSecurity=All` alone fires the same 25 IDs [UNSAFE §1].
- **Verify:**
  - `find src tests -name '*.csproj' -print0 | xargs -0 -r -n1 dotnet msbuild -nologo -getProperty:AnalysisLevel -getProperty:AnalysisModeSecurity | jq -r 'select(.Properties.AnalysisLevel != "10.0-all" and .Properties.AnalysisModeSecurity != "All") | .Properties'` prints nothing.
  - Lowering lines are caught by CS-SEC-06's config grep.
- **Watched:** yes. [UNSAFE §11] default posture gave 6 rows and 0 security IDs; `10.0-all` gave 67 rows and 25 IDs. [C] `cd red && $R dotnet build --no-incremental -nologo -v:m -clp:NoSummary | python3 -I ../diag.py` gave 83 rows. Security IDs: CA2100 CA2326 CA2327 CA2350 CA2351 CA5350 CA5351 CA5358 CA5359 CA5366 CA5369 CA5371 CA5372 CA5379 CA5384 CA5385 CA5387 CA5389 CA5390 CA5392 CA5394 CA5397 CA5399 CA5400 CA5401, with CA3075 absent. [C] property check: on `red/Red.csproj` it printed nothing (pass). With `-p:AnalysisLevel=10.0-recommended` it printed `{"AnalysisLevel":"10.0-recommended","AnalysisModeSecurity":""}` (red).

**CS-SEC-02 (MUST) Ship `BannedSymbols.Security.txt` (above) as `AdditionalFiles`. Set `RS0030` and `RS0031` to `error` in `.globalconfig`. Keep the union of all `BannedSymbols*.txt` files free of duplicate symbols.**
- **Rationale:** these lines close the eight classes that the gate leaves silent. Without the severity lines, a local `-p:TreatWarningsAsErrors=false` turns every ban into a warning. A duplicate symbol in two fragments breaks the build with RS0031 [C].
- **Verify:**
  - `cat BannedSymbols*.txt | grep -E '^[TMPFE]:' | cut -d';' -f1 | sort | uniq -d` prints nothing.
  - `grep -cE '^dotnet_diagnostic\.RS003[01]\.severity *= *error' .globalconfig` prints `2`.
  - A `Variant=Bad` canary with one call per section fails with RS0030 (CS-BIN-10 canary shape).
- **Watched:** yes [C]:
  - `cd red && $R dotnet build --no-incremental -nologo -v:m -clp:NoSummary`: exit 1 and 24 `RS0030` rows. The banned lines were Dyn.cs:6,7; EcdsaBad.cs:8,10; Rx.cs:6,7,9,10,12; Rx2.cs:5,6; Secure.cs:5; Tls.cs:8,9,12; Xml.cs:9,10,11,14; Xml2.cs:8,14,15,22,23.
  - `cd green && $R dotnet build --no-incremental -nologo -v:m`: `Build succeeded. 0 Warning(s) 0 Error(s)` on net8.0 and net10.0.
  - `red`, `-p:TreatWarningsAsErrors=false`: exit 0 with 24 `warning RS0030`. Adding `-p:Sev=true` (the RS0030 error line) gave exit 1 with 24 `error RS0030`.
  - `green`, `-p:Dup=true` (second file repeats `DangerousAcceptAnyServerCertificateValidator`): `error RS0031: The symbol ... is listed multiple times`, ×2 TFMs.

**CS-SEC-03 (MUST) Give every `Regex` a match timeout of at most 1 s.**
- Use `new Regex(p, o, TimeSpan)`, the static 4-argument overloads, or `[GeneratedRegex(p, o, ms)]`. Never use `InfiniteMatchTimeout`.
- Patterns are literals, `const`/`static readonly` members, or `Regex.Escape(...)` output.
- A library never sets `REGEX_DEFAULT_MATCH_TIMEOUT`.
- **Rationale:**
  - `(a+)+$` on 25 `a` plus `!` took 2.0-3.8 s with no timeout. With a timeout it threw at 250 ms.
  - The docs say a timeout is not a boundary against hostile patterns.
  - The AppDomain slot is read once in the static constructor, so a late set is ignored. A string value in `runtimeconfig.json` crashed `Regex` with `TypeInitializationException` [UNSAFE §6].
- **Verify:**
  - RS0030 from the 18 Regex lines.
  - `rg -n -e 'InfiniteMatchTimeout' -e 'InfiniteTimeSpan' -e 'REGEX_DEFAULT_MATCH_TIMEOUT' src/` prints nothing.
  - Review aid: `rg -n --pcre2 -e 'new Regex\((?!@?")' -e 'Regex\.(IsMatch|Match|Matches|Replace|Split)\([^,]+,\s*(?!@?")' src/` lists non-literal patterns. Each must be a named constant or `Regex.Escape`.
- **Watched:** bans and runtime yes ([UNSAFE §11] `run/`, `rxdefault/`, `rxgen/`; [C] Rx.cs/Rx2.cs RS0030). The rg checks: no.

**CS-SEC-04 (MUST) Never let wire data name a type, assembly or code path.**
- Unions decode only through the CS-JSON-07 tag-first converter with an `Unknown` arm (CS-API-08).
- No `[JsonPolymorphic]` or `[JsonDerivedType]` on wire types, and no `Type.GetType`, `Activator.CreateInstance(string,string)` or `Assembly.Load*`.
- **Rationale:** a converter that trusted `$type` instantiated an attacker-chosen type (gadget flag `True`). Both the allow-list and the closed converter refuse it. The converter is the one that stays forward-compatible (Verdict 4) [UNSAFE §3].
- **Verify:**
  - RS0030 from the 7 dynamic-loading lines.
  - `rg -n -e 'JsonPolymorphic' -e 'JsonDerivedType' -e 'TypeNameHandling' src/` prints nothing.
- **Watched:** yes. [UNSAFE §11]: `[STJ custom converter Type.GetType(wire $type)] OK True`, and the allow-list threw `JsonException`. [C]: Dyn.cs:6,7 gave RS0030. The rg check: no.

**CS-SEC-05 (MUST) Do not add these hazard surfaces to `src/`:**
- `System.Xml` parsing, XSLT, `System.Data`/`DataSet`, P/Invoke (`DllImport`/`LibraryImport`);
- `BinaryFormatter` or `EnableUnsafeBinaryFormatterSerialization`;
- `Microsoft.Extensions.Configuration*` (including UserSecrets), `SecureString`.

If XML ever becomes unavoidable, use only `XmlReader.Create` with `DtdProcessing.Prohibit` and `XmlResolver = null`. Such a change gets its own review note.
- **Rationale:** the ocx contract is JSON (ocx-cli-contract §8), so each of these is pure attack surface. CA3075/77 cannot see XXE on net8+ (H6), and the ban is only a tripwire.
- **Verify:** `rg -n -e 'using System\.Xml' -e 'System\.Data' -e 'DllImport' -e 'LibraryImport' -e 'BinaryFormatter' -e 'Microsoft\.Extensions\.Configuration' src/` prints nothing.
- **Watched:** the ban lines yes ([C] Xml.cs, Xml2.cs, Secure.cs RS0030). The rg check: no.

**CS-SEC-06 (MUST) Never suppress a security diagnostic in `src/`.** This covers no pragma, no `[SuppressMessage("Security", ...)]`, no `NoWarn` and no lowered severity for CA2100, CA2119, CA2153, CA2300-CA2369, CA3xxx, CA5xxx, `SYSLIB0011`, `SYSLIB0060`, `RS0030` and `RS0031`. In tests the only allowed suppression is `#pragma warning disable CA5394 // <why it is not security-relevant>`. This is stricter than CS-BUILD-12 for this ID range.
- **Rationale:** an agent's fastest way to green is a pragma. The SDK has no protocol that mandates a weak hash. Jitter uses `RandomNumberGenerator` (Verdict 6), so `src` needs none.
- **Verify** (run from the repo root; both print nothing):
  - `rg -n --glob '*.cs' -e '#pragma warning disable[^/]*(CA2100|CA2119|CA2153|CA23[0-6][0-9]|CA3[0-9]{3}|CA5[0-9]{3}|SYSLIB0011|SYSLIB0060|RS003[01])' -e 'SuppressMessage\("Security"' src/`
  - `rg -n --hidden --glob '.globalconfig' --glob '.editorconfig' --glob '*.props' --glob '*.csproj' --glob '*.targets' -e '(CA2100|CA2119|CA2153|CA23[0-6][0-9]|CA3[0-9]{3}|CA5[0-9]{3}|SYSLIB0011|SYSLIB0060|RS003[01])\.severity *= *(none|silent|suggestion|warning)' -e 'NoWarn[^<]*(CA2100|CA2119|CA2153|CA23[0-6][0-9]|CA3[0-9]{3}|CA5[0-9]{3}|SYSLIB0011|SYSLIB0060|RS003[01])' -e 'EnableUnsafeBinaryFormatterSerialization' .`
- **Watched:** yes [C] `suppress/`.
  - `red/`: 3 hits. They were `src/A.cs:1:#pragma warning disable CA5394 // jitter, not security relevant`, `./.globalconfig:2:dotnet_diagnostic.CA5351.severity = none` and `./Directory.Build.props:1:...EnableUnsafeBinaryFormatterSerialization...`.
  - `green/`: CA1031 pragma plus the RS0030/RS0031 `error` lines, rg exit 1 with no hits.

**CS-SEC-07 (SHOULD) Draw every random value in `src/` from `RandomNumberGenerator`, retry jitter included (`RandomNumberGenerator.GetInt32(maxExclusive)`).** `Guid.NewGuid()` is an identifier, never a token, nonce or key.
- **Rationale:** CA5394 fires on every `Random` member and is all-only. GUIDs carry 122 random bits and no documented secrecy contract [UNSAFE §5]. The Python port's `random_fn` jitter (python-sdk-digest row 23) would otherwise force a CA5394 pragma.
- **Verify:**
  - CA5394 under TWAE.
  - `rg -n 'Guid\.NewGuid\(\)' src/` hits are reviewed. None may feed a credential, nonce or authentication value.
- **Watched:** CA5394 yes ([C] red.tsv: `CA5394` ×2; green `RandomNumberGenerator` builds clean). The Guid review: no.

**CS-SEC-08 (SHOULD) Authenticate bytes in exactly one internal helper, using SHA-256, `Convert.FromHexString` and `CryptographicOperations.FixedTimeEquals`.** The archive (CS-BIN-07), the pin (CS-BIN-20) and the cache sidecar (CS-BIN-12) all call it. Ocx-reported OCI digests are string identifiers compared `Ordinal` (CS-JSON-15) and never go through it.
- **Rationale:** a single idiom needs no "is this secret?" judgement. Three hand-written compares drift: `ToHexString` is uppercase, and `==` refused the genuine archive (CS-BIN-07). The compare is defence in depth, not a CVE fix [UNSAFE §5].
- **Verify:**
  - `test "$(rg -l 'FixedTimeEquals' src/ | wc -l)" = 1`
  - `rg -n -e 'SequenceEqual\(' -e 'MD5\.' -e 'SHA1\.' src/` prints nothing. CA5350/CA5351 also fire.
- **Watched:** CA5350/5351 yes ([C] red.tsv). The helper count: no.

**CS-SEC-09 (MUST) Keep the packed dependency budget: the net10.0 group is empty, and the net8.0 group holds `System.Text.Json` only.** The gate is the packed nuspec, never `dotnet package list`. Any other runtime dependency needs a written owner exception.
- **Rationale:**
  - The consumer restores and audits whatever the nuspec lists.
  - The thin-wrapper peers ship 0 dependencies (SimpleExec, CliWrap).
  - `dotnet package list` includes `PrivateAssets=all` packages.
  - The measured net8 cost is STJ plus `System.IO.Pipelines` and `System.Text.Encodings.Web`, and the net10 group is pruned to empty [SUPPLY §2.1].
- **Verify** (after `dotnet pack -c Release -o artifacts`; both `test` commands exit 0):
  - `test "$(unzip -p artifacts/*.nupkg '*.nuspec' | xmllint --xpath "count(//*[local-name()='group'][@targetFramework='net10.0']/*[local-name()='dependency'])" -)" = 0`
  - `test "$(unzip -p artifacts/*.nupkg '*.nuspec' | grep -o '<dependency id="[^"]*"' | grep -v -x -e '<dependency id="System.Text.Json"' | wc -l)" = 0`
- **Watched:** yes [SUPPLY V13]: `leak-red` 16, `leak-green` 0, the `sbom` STJ library 0.

**CS-SEC-10 (MUST) Declare every build-only package (analyzers, MinVer, any SBOM or SourceLink tool) as a `GlobalPackageReference` in `Directory.Packages.props`.**
- A build-only package that only one project needs is `PackageReference ... PrivateAssets="all"`.
- Never put `PrivateAssets`, `IncludeAssets` or `ExcludeAssets` on a `<PackageVersion>`.
- **Rationale:**
  - Bare references leaked as 16 nuspec dependencies, and the consumer restored 103 MB instead of 0.45 MB.
  - `developmentDependency=true` in the dependency's own nuspec did not stop the leak.
  - `PackageVersion PrivateAssets` is silently ignored.
  - The global form never reached the nuspec [SUPPLY §2.2-2.3]. This also resolves CS-PKG-06 vs CS-BUILD-23 (Verdict 8).
- **Verify:**
  - `for t in net8.0 net10.0; do dotnet msbuild src/Ocx.Sdk/Ocx.Sdk.csproj -nologo -p:TargetFramework=$t -getItem:PackageReference | jq -r '.Items.PackageReference[] | select((.PrivateAssets // "") | ascii_downcase != "all") | .Identity'; done | sort -u | grep -v -x 'System.Text.Json'` prints nothing.
  - `grep -nE '<PackageVersion [^>]*(PrivateAssets|IncludeAssets|ExcludeAssets)' Directory.Packages.props` prints nothing.
- **Watched:** yes [SUPPLY V3/V4]: `leak-red` 8 IDs, `leak-green` empty, `pv-priv` exposes MinVer, `gpr` only the plain reference.

**CS-SEC-11 (MUST) List every package whose `build/`, `buildTransitive/`, `buildMultiTargeting/`, `analyzers/` or `tools/` assets run in the build in `eng/build-code-packages.txt`.** Write one lowercase ID per line, covering src and test projects. Before the first `dotnet build` of a new candidate, paste its content triage into the PR:
- `unzip -Z1 cand.nupkg | grep -E '^(build|buildTransitive|buildMultiTargeting|analyzers|tools)/'`
- `unzip -p cand.nupkg '*.targets' '*.props' | grep -c -E '<Exec[ >]|CodeTaskFactory|DownloadFile|WebClient|Invoke-WebRequest|powershell|curl |wget '`

A package you must reference but do not trust gets `ExcludeAssets="build;buildtransitive;buildmultitargeting;analyzers"`.
- **Rationale:** restore runs no package code, but build does, with CI's privileges and no sandbox. That is the 2023 and 2026 NuGet typosquat technique. NuGet's own defences (audit, source mapping, signing) do not inspect content. A clean grep is triage, not proof [SUPPLY §2.4].
- **Verify:**
  - `grep -ho 'Project="[^"]*"' src/*/obj/*.nuget.g.props src/*/obj/*.nuget.g.targets tests/*/obj/*.nuget.g.props tests/*/obj/*.nuget.g.targets | sed 's|Project="||;s|"$||;s|\$(NuGetPackageRoot)/||' | cut -d/ -f1 | sort -u | grep -v -x -f eng/build-code-packages.txt` prints nothing.
  - `dotnet msbuild src/Ocx.Sdk/Ocx.Sdk.csproj -nologo -t:ResolvePackageAssets,ResolveLockFileAnalyzers -p:TargetFramework=net10.0 -getItem:Analyzer | jq -r '.Items.Analyzer[].Identity' | grep -v -e '/dotnet/sdk/'` lists only paths under listed IDs.
- **Watched:** yes [SUPPLY V5]:
  - Red: `dotnet build --no-restore` wrote `PWNED.txt`, and the import pipeline printed `evil.helper`.
  - Green: with `ExcludeAssets`, no `PWNED.txt` and no import.

**CS-SEC-12 (MUST) Every package ID added to `Directory.Packages.props` passes an existence and owner check before the commit.**
- `NOT-FOUND` blocks the change.
- `verified:false` requires the reviewer to read the owner, age and download count.
- The PR body answers six questions: BCL first, ownership, build assets, leak, licence and age, and closure size [SUPPLY §2.11].
- **Rationale:** LLM-invented IDs restore nothing or restore a squatter's package. nuget.org repository-signs typosquats too, so signing is no defence [SUPPLY §2.7].
- **Verify:** `grep -oE '(PackageVersion|GlobalPackageReference) Include="[^"]+"' Directory.Packages.props | cut -d'"' -f2 | while read -r id; do curl -fsS "https://azuresearch-usnc.nuget.org/query?q=packageid:$id&take=1" | jq -e '.data | length == 1' >/dev/null || echo "NOT-FOUND $id"; done` prints nothing.
- **Watched:** yes [C] `exist/`. `red/` (posture plus `Newtonsoft.Jsonn`) printed `NOT-FOUND Newtonsoft.Jsonn`. `green/` (posture `Directory.Packages.props`) printed nothing. [SUPPLY V12] watched the same check.

**CS-SEC-13 (SHOULD) Every package in the packed closure and on the build-code list has a licence expression in `MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC` or `0BSD`, or a recorded human decision.** `NO-SPDX-EXPRESSION` and `type="file"` licences block.
- **Rationale:** NuGetAudit checks no licences, and the expression is machine-readable in each nuspec [SUPPLY §2.10].
- **Verify:** `eng/licenses.sh src/Ocx.Sdk | grep -v -E ' (MIT|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|ISC|0BSD)$' | grep -v -x -f eng/license-exceptions.txt` prints nothing. The script is [SUPPLY §2.10] verbatim.
- **Watched:** yes [SUPPLY V11]: `evil.helper/1.0.0 NO-SPDX-EXPRESSION` vs 4× `MIT`.

**CS-SEC-14 (SHOULD) Use Dependabot only.**
- Configure a `nuget` ecosystem with `cooldown` of `default-days >= 3` (never 0), `groups`, and `ignore:` entries each preceded by a reason comment.
- Add a separate `dotnet-sdk` ecosystem for `global.json`.
- Use one bot per repo.
- **Rationale:** cooldown gives the registry's takedown time to land, and security updates bypass it. Pins without a reason rot (Polly, openai-dotnet, GitVersion) [SUPPLY §2.9].
- **Verify:**
  - `awk '/package-ecosystem/{eco=$0} /cooldown:/{if (eco ~ /nuget/) ok=1} END{exit !ok}' .github/dependabot.yml` exits 0.
  - `grep -c 'package-ecosystem: *"\?dotnet-sdk' .github/dependabot.yml` is at least 1.
  - `grep -nE 'default-days: *0\b' .github/dependabot.yml` prints nothing.
- **Watched:** yes for the awk check [SUPPLY R11]: Polly, openai-dotnet and GitVersion exit 0; simple-exec and a planted block exit 1. The other greps: no.

**CS-SEC-15 (SHOULD) Keep NuGet `signatureValidationMode` at the default `accept` at v1.**
- Never set `DOTNET_NUGET_SIGNATURE_VERIFICATION=false`.
- If `require` is adopted later (mirror or proxy restores), generate it with `dotnet nuget trust source nuget.org --configfile nuget.config` and `dotnet nuget config set signatureValidationMode require --configfile nuget.config`. Never hand-write fingerprints.
- Enforce it on a Linux or Windows leg, and never claim it for macOS.
- **Rationale:**
  - `require` does not stop a typosquat.
  - With verification off it is inert, and verification is off by default on macOS.
  - Invented fingerprints fail every restore with NU3034.
  - Owners are case-sensitive [SUPPLY §2.5].
- **Verify:**
  - `grep -rnE --include='*.yml' --include='*.yaml' --include='*.props' --include='*.sh' 'DOTNET_NUGET_SIGNATURE_VERIFICATION[=:"'"'"' ]+false' .` prints nothing.
  - `xmllint --xpath "string(//config/add[@key='signatureValidationMode']/@value)" nuget.config` prints nothing or `accept`.
- **Watched:** yes [SUPPLY V6-V9]. `require` gave NU3004 on an unsigned package; `=false` restored it (exit 0); NU3034 appeared with no or wrong signers.

**CS-SEC-16 (CONSIDER) Put no SBOM in the nupkg and none on PR builds.** If a consumer asks for one, attach `dotnet-CycloneDX src/Ocx.Sdk/Ocx.Sdk.csproj -o artifacts/sbom -F Json -ed` to the GitHub release from the tag job (CS-PKG-12).
- **Rationale:**
  - The graph has 0-3 packages.
  - Microsoft.Sbom.Targets is a 49 MB build-time package that wrote `NOASSERTION` for every licence.
  - CycloneDX resolved MIT and dropped the build-only package [SUPPLY §2.8].
- **Verify:** `unzip -Z1 artifacts/*.nupkg | grep -c '^_manifest/'` prints `0`, and `grep -rn --include='*.props' --include='*.csproj' 'GenerateSBOM' .` prints nothing.
- **Watched:** A/B yes [SUPPLY V14]: 7,489 B with `_manifest/` vs 5,117 B without. The greps: no.

### CS-BIN rows added by the attestation verdict

[ATTEST] proposed CS-BIN-20..35. They were merged, renumbered and de-duplicated as follows: 20+21 became one rule, 27+28 became one, and 24, 25, 26, 29, 32 and 33 are one dormant v1.x rule. Applicability: **a** = locate only, **b** = bundle per-RID binaries, **c** = download at first use (owner decision 3).

| New ID | From [ATTEST] | a | b | c |
|---|---|---|---|---|
| CS-BIN-20 | 20, 21 | - | pin file | runtime |
| CS-BIN-21 | 22 | - | yes | yes |
| CS-BIN-22 | 23 | - | - | yes |
| CS-BIN-23 | 27, 28 | yes | yes | yes |
| CS-BIN-24 | 30 | yes | yes | yes |
| CS-BIN-25 | 31 | yes | yes | yes |
| CS-BIN-26 | 34 | yes | yes | yes |
| CS-BIN-27 | 35 | - | yes | - |
| CS-BIN-28 (v1.x, dormant) | 24, 25, 26, 29, 32, 33 | - | yes | yes |

**CS-BIN-20 (MUST, b/c) Commit one `ocx-pins.json` holding a per-triple SHA-256 for `TestedOcxVersion`.**
- **Model c:** compile the file into `internal static class OcxPins` and check in this order:
  1. Validate the manifest row (CS-BIN-08).
  2. If the version equals the pin version, the row digest must equal the pin. Otherwise throw `ChecksumMismatchException` (reason `manifest-disagrees-with-pin`) before any archive request.
  3. Hash the streamed archive and compare it with the pin through the CS-SEC-08 helper.
  4. Only then open the archive.
- **Model b:** the same file feeds CS-BIN-27.
- **Rationale:** the pin moves the digest's authority from `setup.ocx.sh` to the nuget.org-signed package that carries the code. Today the manifest host controls the manifest, the URL and the digest [ATTEST F1, F6].
- **Verify:**
  - `jq -e '(.version | type == "string") and (.pins | length == 8) and (.pins | all(.[]; test("^[0-9a-f]{64}$")))' ocx-pins.json` exits 0.
  - A unit test flips one hex character of a pin and expects `ChecksumMismatchException`, no file in the cache, and zero archive requests when the manifest row disagrees.
- **Watched:** yes for the shell pin gate on a real archive [ATTEST F11.7]: `GREEN ... pin-match`, `RED flipped.tar.gz pin-mismatch`. The unit test: not yet written.

**CS-BIN-21 (MUST, b/c) Regenerate the pin file only through the triangulation gate.**
- Three sources must agree for all 8 triples before the file is written: the `setup.ocx.sh/dist.json` row, the release asset `sha256.sum`, and the `digest` field of `gh release view v<ver> --json assets`.
- Run the gate on every change to `ocx-pins.json` and nightly.
- Never copy a digest from one source, a chat or a model answer.
- **Rationale:** one poisoned publication point cannot pass three. The gate defends against a compromised manifest origin or CDN, not against a compromised ocx release pipeline [ATTEST F6].
- **Verify:** `python3 -I eng/triangulate.py dist.json sha256.sum assets.json "$(jq -r .version ocx-pins.json)"` exits 0. The script is the [ATTEST] fixture's `triangulate.py`, ported to a .NET 10 file-based app if Python is unwanted.
- **Watched:** yes [ATTEST F11.9]. Green: `rows 8 mismatches 0`, exit 0. Red: one altered `sha256.sum` line gave `mismatches 1`, exit 1.

**CS-BIN-22 (MUST, c) A version other than `TestedOcxVersion` needs a caller-supplied archive digest.** The only way around it is an option whose name says it trusts the manifest origin, for example `TrustManifestOrigin`. That option is never a default. This extends CS-BIN-09 to the canonical host.
- **Rationale:** without a pin, the manifest origin is the only authority [ATTEST F6]. CS-BIN-06 already makes `latest` explicit, and this makes its trust explicit too.
- **Verify:**
  - A unit test requests `0.6.4` with no digest and expects a typed exception and zero requests.
  - `rg -n -i -e 'TrustManifest' src/` shows the option only behind an explicit read, never in an initialiser.
- **Watched:** no (design rule; same test shape as CS-BIN-09).

**CS-BIN-23 (MUST, all) Keep Ed25519, minisign or NaCl code and packages out of the core assembly at v1.** This includes BouncyCastle, NSec, Sodium, Chaos.NaCl and the `Sigstore` package.
- **Rationale:**
  - No public Ed25519 type exists on net8, net10 or 11.0 RC1, and `CS0234` fires.
  - The approved API is OpenSSL-only and unsupported on Windows and macOS.
  - `Sigstore` 1.1.1 is `net10.0`-only, pulls BouncyCastle and TUF, and accepted a tampered file against a genuine DSSE bundle unless the caller binds the subject itself [ATTEST F3, F4].
- **Verify:** `dotnet package list --project src/Ocx.Sdk/Ocx.Sdk.csproj --include-transitive | rg -i -e 'BouncyCastle' -e 'NSec' -e 'Sodium' -e 'Chaos\.NaCl' -e 'Sigstore'` prints nothing, and `rg -n -i -e 'minisign' -e 'ed25519' src/` prints nothing.
- **Watched:** yes for the hallucination and the probe [ATTEST F11.5]: `count=0` on 3 runtimes, `halluc2/` `CS0234`. The grep: no.

**CS-BIN-24 (MUST, all) Library code never spawns `gh`, `cosign`, `minisign` or `openssl`, never passes `--no-verify`, and never sets `OCX_NO_VERIFY`.** CS-PROC-06 already scrubs it from the child environment. This extends CS-BIN-17.
- **Rationale:**
  - These tools are absent on a clean machine, which is the case the SDK exists to bootstrap.
  - A missing attestation and a tampered file both return HTTP 404 with exit 1, so "tool failed" cannot mean "unsigned, continue" [ATTEST F5, F11.1-2].
  - `OCX_NO_VERIFY` disables ocx's own signature policy (ocx-cli-contract §8.4).
- **Verify:** `rg -n -i -e '"gh"' -e '"cosign"' -e '"minisign"' -e '"openssl"' -e '--no-verify' src/` prints nothing. `rg -n 'OCX_NO_VERIFY' src/` matches only the scrub list.
- **Watched:** yes for the 404 ambiguity [ATTEST F11.1-2]. The grep: no.

**CS-BIN-25 (MUST, all) Verification fails hard.**
- No warn tier.
- No `Skip*`, `Disable*` or `AllowUnsigned` option.
- No environment variable that turns off the pin or signature check.

The only ways around the pin are a different explicit digest (CS-BIN-22) or locate-only, and both are visible in the caller's code.
- **Rationale:** the SDK's consumers are often agent loops that nobody reads [ATTEST F8].
- **Verify:**
  - `rg -n -i -e 'SkipVerif' -e 'NoVerif' -e 'DisableVerif' -e 'AllowUnsigned' -e 'AllowInsecure' src/` prints nothing.
  - `rg -n -i -e 'bool (Skip|Disable|Allow)\w*(Verification|Signature|Checksum)' PublicAPI.Shipped.txt PublicAPI.Unshipped.txt` prints nothing.
- **Watched:** no (grep rule).

**CS-BIN-26 (MUST, all) Say in one sentence each, in the README and in the XML docs of the install or locate entry point:**
- what the pin proves;
- what it does not prove (a compromised ocx release pipeline);
- that a located binary (model a, `OCX_SDK_EXE`, PATH) is not verified.

Never write "signature verified" until upstream ships a signature.
- **Rationale:** a pin sold as signature verification over-promises [ATTEST F1, F7].
- **Verify:** `rg -n -i -e 'not verified' -e 'trust boundary' README.md src/` finds the sentences, and `rg -n -i -e 'signed by ocx' -e 'signature verified' README.md src/` prints nothing.
- **Watched:** no (reading rule).

**CS-BIN-27 (MUST, b) Before `dotnet pack`, check every staged `runtimes/*/native/ocx*` against `ocx-pins.json`.** The step fails on any mismatch and runs before the pack step in the same job.
- **Rationale:** this is the bundle model's equivalent of the runtime gate [ATTEST F7].
- **Verify:**
  - `jq -r '.pins | to_entries[] | "\(.value)  dl/ocx-\(.key)"' ocx-pins.json | sha256sum -c --ignore-missing` exits 0 on the genuine staging tree and 1 on a flipped byte.
  - `rg -n 'ocx-pins' .github/workflows/` shows the step before `dotnet pack`.
- **Watched:** yes for the pin match and mismatch on a real archive [ATTEST F11.7]. The workflow ordering: no.

**CS-BIN-28 (MUST once ocx publishes a P-256 signature; dormant at v1, b/c) Verify `dist.json.sig` as follows:**
- Use `ECDsa` P-256 with SHA-256 and `DSASignatureFormat.Rfc3279DerSequence`. The ban fragment forbids the 3-argument overloads.
- Take the SPKI from a `static readonly` constant in the assembly, never from the artifact's origin.
- Assert the curve OID `1.2.840.10045.3.1.7` after import.
- Catch only `CryptographicException`, which means not verified.
- Ship at most two SPKIs (`current`, `next`), selected by key ID `hex(SHA256(SPKI))[..16]`. An unknown key ID fails closed with "upgrade the SDK".
- Do no network I/O in the check.
- If a Sigstore bundle is ever verified (add-on package only), pin the exact SAN and issuer, never `ForGitHubActions(owner, repo)`, and compare `Statement.Subject` digests yourself.
- **Rationale:**
  - A key shipped with the manifest accepted the forged triple (`verified=True`).
  - DER through the default overload silently returned `false`.
  - `ForGitHubActions` accepted `refs/pull/580/merge` [ATTEST F3, F8, F11.4, F11.6].
- **Verify:**
  - `dotnet build -p:Variant=Bad` fails with RS0030 on `ECDsa.VerifyData(byte[], byte[], HashAlgorithmName)`.
  - `test "$(rg -l 'ImportSubjectPublicKeyInfo' src/ | wc -l)" -le 1`
  - `rg -n 'ForGitHubActions\(' src/` prints nothing.
  - The 7 red rows of [ATTEST F11.4] exist as unit tests.
- **Watched:** yes. [ATTEST F11.4]: `ALL AS EXPECTED` on .NET 8.0.31, 10.0.12 and 11 RC1 (Linux) and 10.0.2 (Windows). [ATTEST F11.8] ban gate. [C] `EcdsaBad.cs:8,10` RS0030 under the merged fragment.

## Applied to the ocx C# SDK

**New commitments (the design changes for these):**
- **Posture files:**
  - Add `BannedSymbols.Security.txt` and the two `RS0030`/`RS0031` error lines to `.globalconfig`.
  - Deduplicate the existing fragments: retire the CS-BUILD-15 starter's five lines into CS-PROC and CS-XP, and move CS-BIN-16's line here (CS-SEC-02).
- **`Directory.Packages.props`:** MinVer becomes a `GlobalPackageReference` beside the two analyzer packs (CS-SEC-10). This replaces CS-PKG-06's NU1008-inducing form.
- **CI:**
  - Add the nuspec budget step (CS-SEC-09) after pack.
  - Add the evaluated-item gate (CS-SEC-10).
  - Add the build-code import check against `eng/build-code-packages.txt` (CS-SEC-11).
  - Add the triangulation job for `ocx-pins.json` (CS-BIN-21, b/c).
  - Add Dependabot with cooldown (CS-SEC-14).
- **Code shape:**
  - CS-BIN-08's manifest validators (`\A[A-Za-z0-9._+-]+\z`, `\A[0-9a-f]{64}\z`) are `[GeneratedRegex(..., RegexOptions.None, 250)]` or plain loops. A bare `[GeneratedRegex(p)]` now fails RS0030 (CS-SEC-03).
  - One digest helper serves archive, pin and sidecar (CS-SEC-08).
  - Jitter in the CS-BIN-18 download retry uses `RandomNumberGenerator.GetInt32` (CS-SEC-07).
  - `OcxPins` plus a named `TrustManifestOrigin` option (CS-BIN-20, -22).
  - No `[JsonDerivedType]` anywhere (CS-SEC-04).
- **README and XML docs:** add the trust-boundary sentences (CS-BIN-26).

**Already modelled by the Python SDK (port the semantics):**
- **Zero runtime dependencies,** enforced by a metadata test (python-sdk-digest row 3; `pyproject.toml:22`). The C# equivalent is the nuspec gate CS-SEC-09. C# cannot reach zero on net8 because of STJ.
- **sha256 from the manifest as the artifact trust boundary,** with a digest required off the canonical host and never retried (python-sdk-digest row 33, items 2-3; `_dist.py:611-653`). These are CS-BIN-07 and CS-BIN-09, which CS-BIN-20 extends.
- **Secrets through stdin or env only,** with a masked repr, longest-first redaction and an `OCX_NO_VERIFY` scrub (python-sdk-digest rows 24-26). These are CS-PROC-06 and CS-PROC-08. `SecureString` adds nothing and is banned.

**Forced by the ocx CLI contract:**
- `dist.json` is the only release metadata. It has schema 1, 280 rows, 8 targets and fields `version, channel, tag, target, filename, sha256, url` (ocx-cli-contract line 102). The pin table therefore has exactly 8 triples (CS-BIN-20).
- "Verify the dist `sha256` before running a downloaded `ocx`" (ocx-cli-contract §8.13).
- `OCX_NO_VERIFY` silently disables ocx's signature verification and must be scrubbed. An invalid value exits 78 (ocx-cli-contract lines 79, 82). See CS-BIN-24.
- Secrets reach ocx via `stdin_secret` arguments (`login --password-stdin`) and 10 secret env entries (ocx-cli-contract line 79, §8.2). See CS-PROC-08.

**Do NOT copy from Python:**
- **Python trusts the canonical host's manifest digest as the root for the default version** (python-sdk-digest S14: "trust ends at TLS-to-`setup.ocx.sh` + sha256 from the same origin"). C# compiles a triangulated pin instead (CS-BIN-20, -21).
- **Python's `random_fn` jitter** (row 23) maps to `Random` and so to CA5394. Use `RandomNumberGenerator` (CS-SEC-07).
- **Python's `latest` default** (S13) is already rejected by CS-BIN-06. CS-BIN-22 also makes a non-pinned version an explicit trust choice.

## AI-agent failure modes

Ranked by how often each bites in an unattended loop. The order is a judgement based on frequency in [UNSAFE]/[SUPPLY]/[ATTEST] agent tables and on how routine the triggering edit is.

1. **It hand-edits a build-only `PackageReference`** (MinVer, an analyzer, SourceLink, Polyfill) without `PrivateAssets`, or puts `PrivateAssets` on `<PackageVersion>`. The result is a nuspec leak. Caught by CS-SEC-10's evaluation gate and CS-SEC-09's nuspec grep.
2. **It writes a `Regex` or `[GeneratedRegex(p)]` with no timeout,** including in manifest validators. It "fixes" ReDoS with `RegexOptions.Compiled`. Caught by RS0030 (CS-SEC-02/03).
3. **It suppresses a security diagnostic to reach green:** `#pragma warning disable CA5394` for jitter, `severity = none` for CA5351, or `-p:TreatWarningsAsErrors=false` locally. Caught by the CS-SEC-06 greps and the RS0030 error line (CS-SEC-02).
4. **It invents a package ID or adds a package the BCL already covers** (`Newtonsoft.Json.Net`, `System.Text.Json` on net10). Caught by CS-SEC-12's existence loop and NU1510 (CS-BUILD-28).
5. **It merges ban fragments by concatenation and gets RS0031,** then deletes a fragment to clear the error. Caught by CS-SEC-02's `uniq -d` and a canary build that must fail.
6. **It treats a clean build as XXE assurance,** or pastes .NET Framework hardening backwards (`XmlResolver = new XmlUrlResolver()`, `ProhibitDtd`). Caught by the ban lines (CS-SEC-02/05) and by `CS0618` for `ProhibitDtd`.
7. **It adds `ServerCertificateCustomValidationCallback = (_,_,_,_) => true` "for the proxy" or for a test.** Caught by the ban (CS-BIN-16 line).
8. **It refreshes the pin by pasting the digest from `dist.json` alone.** Caught by CS-BIN-21's triangulation job.
9. **It offers `SkipVerification` / `AllowInsecure` "for corporate mirrors".** Caught by CS-BIN-25's rg. CS-BIN-09 and CS-BIN-22 already cover mirrors.
10. **It recommends `System.Security.Cryptography.Ed25519`, minisign or BouncyCastle,** or claims ocx ships cosign or SLSA for its binaries. Caught by `CS0234`, CS-BIN-23, and a `gh attestation verify` transcript before any attestation rule is cited.
11. **It resolves `$type` with `Type.GetType` in a custom converter,** or reaches for `[JsonDerivedType]` (which throws on unknown tags). Caught by RS0030 and CS-SEC-04's rg.
12. **It verifies a DER signature through the default P1363 `VerifyData`,** gets `false`, then weakens the check. Caught by the ECDsa ban lines (CS-BIN-28).
13. **It takes the verification key from the manifest's origin.** Caught by CS-BIN-28's single-import-site check and the forged-triple test.
14. **It pastes a `nuget.config` with `require` and invented fingerprints,** or claims the macOS leg enforces signatures. Caught by CS-SEC-15.
15. **It adds `BinaryFormatter` plus `EnableUnsafeBinaryFormatterSerialization` for deep clone.** Caught by `SYSLIB0011` (error), the CS-SEC-06 grep, and `PlatformNotSupportedException` at runtime on net9+.
16. **It runs `dotnet restore` on a new package and calls it "reviewed".** The `.targets` file runs at the first build. Caught by CS-SEC-11's pre-build triage.
17. **It adds Microsoft.Sbom.Targets to every build.** Caught by CS-SEC-16's grep.

## Failure classes

| Class | Mechanism | Members | Check that catches the class |
|---|---|---|---|
| A. Silent gate | An analyzer or ban is registered but cannot fire: CA3075/77 behind the `mscorlib` check; `recommended` omits all-only IDs; RS0030 is only a warning without TWAE; a parameterless `M:` binds one overload; a ban file whose name is not `BannedSymbols*.txt`; RS0031 from duplicates | 2, 3, 5, 6 | A `Variant=Bad` canary that must fail, plus `uniq -d` over the fragments and the `RS0030`/`RS0031` error lines (CS-SEC-02, CS-BIN-10) |
| B. Metadata that looks honoured but is not | `PrivateAssets` on `PackageVersion`; `developmentDependency`; `dotnet package list` showing private packages; `require` inert with verification off; `REGEX_DEFAULT_MATCH_TIMEOUT` set late or as a string | 1, 14 | Measure the artefact, not the config: the nuspec, evaluated items, and a restore with `DOTNET_NUGET_SIGNATURE_VERIFICATION=true` (CS-SEC-09/10/15) |
| C. Trust taken from the attacker's origin | A digest or key from the manifest host; `$type` naming a CLR type; a `gh` 404 read as "unsigned"; a repo-wide Sigstore identity | 8, 11, 13 | An independent root (triangulated pin, constant SPKI, closed tag table) plus a forged-input test (CS-BIN-20/21/28, CS-SEC-04) |
| D. Escape hatch added to get green | Pragmas, severity `none`, skip flags, TLS `=> true`, `EnableUnsafeBinaryFormatterSerialization`, TWAE off | 3, 7, 9, 15 | Ban lines plus the CS-SEC-06 and CS-BIN-25 greps |
| E. Hallucinated or era-stale API or package | Ed25519 type, `RandomNumberGenerator.NextString`, `ProhibitDtd`, invented package IDs, .NET Framework advice, "cargo-dist projects ship attestations" | 4, 6, 10 | Compile (`CS0234`/`CS0618` under TWAE), the CS-SEC-12 existence check, and a command transcript before any claim about upstream |
| F. Build-time code execution | `.targets`, analyzers or `tools/` from a new package run at the first build | 16 | CS-SEC-11's import inventory against a named list, with triage before the first build |

## Open questions

**Owner decisions:**
1. **Delivery model (owner decision 3).** It decides which CS-BIN-20..28 rows activate (table above). The rules are written to hold under all three.
2. **Support floor (owner decision 2).** A net10.0-only SDK makes the CS-SEC-09 budget zero. It would also let an optional Sigstore add-on exist later (CS-BIN-23).
3. **Consumer reach (owner decision 1).** An ns2.0 slice re-adds the `BinaryFormatter`/`NetDataContractSerializer` ban lines (H1/H2) and puts Polyfill on the build-code list.
4. **Upstream asks to ocx, in order of cost** [ATTEST F10]:
   - set `github-attestations = true` in `dist-workspace.toml`;
   - enable immutable releases on `ocx-sh/ocx`;
   - change [ocx-sh/www-setup#14](https://github.com/ocx-sh/www-setup/issues/14) from minisign to a DER-encoded ECDSA P-256 `dist.json.sig`.

   Until the third lands, CS-BIN-28 stays dormant.
5. **Non-tested versions.** Should the SDK expose them at all? If so, is `TrustManifestOrigin` the accepted name (CS-BIN-22)?

**Another research round:**
- **csharp-security-supply-chain, updater mechanics.** Does Dependabot's NuGet updater rewrite `GlobalPackageReference` versions in `Directory.Packages.props`? This is unverified [SUPPLY §2.3], and CS-SEC-10 now puts MinVer and both analyzer packs there. If it does not, those pins rot silently.
- **csharp-security-unsafe-apis, test-project fallout.** Run the merged fragment and CS-SEC-01 against the four test projects (CS-TEST-01): xUnit v3, any property-testing package, and test code using `Regex`/`Random`. Count how many `RS0030`/`CA5394` sites appear, and decide whether tests get a scoped fragment.
- **csharp-security-binary-attestation, model b on macOS.** NuGet signature verification is off by default there. Measure on a real `macos-26` runner what protects a bundled `runtimes/osx-*/native/ocx` after restore: TLS and the nuget.org hash, or nothing more.

## Sub-artifacts

- [csharp-security/csharp-security-unsafe-apis.md](csharp-security/csharp-security-unsafe-apis.md): which unsafe APIs fire under 10.0-all, which stay silent, the 43-line ban fragment, and runtime proofs (XXE, ReDoS, gadgets, BinaryFormatter).
- [csharp-security/csharp-security-supply-chain.md](csharp-security/csharp-security-supply-chain.md): the dependency budget, PrivateAssets leaks, build-time code, signature modes and their per-OS limits, typosquat checks, SBOM, Dependabot and licences.
- [csharp-security/csharp-security-binary-attestation.md](csharp-security/csharp-security-binary-attestation.md): what ocx v0.6.5 publishes (no signatures), in-box ECDSA vs absent Ed25519, the managed Sigstore traps, and the pin-and-triangulate v1 design.

## Key sources

- https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/security-warnings: the security rule category.
- https://github.com/dotnet/sdk/blob/186ac691d449/src/Microsoft.CodeAnalysis.NetAnalyzers/src/Microsoft.CodeAnalysis.NetAnalyzers/Microsoft.NetFramework.Analyzers/Helpers/SecurityDiagnosticHelpers.cs: the `mscorlib` check that makes CA3075/77 inert on net8+.
- https://github.com/dotnet/roslyn/blob/7ac1c032ef13/src/RoslynAnalyzers/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md: ban file format, RS0030 and RS0031.
- https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-regex: always set a timeout; patterns must be trusted.
- https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/9.0/binaryformatter-removal: BinaryFormatter removal.
- https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism: STJ polymorphism semantics and .NET 11 closed inference.
- https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files: PrivateAssets defaults, developmentDependency, pruning.
- https://learn.microsoft.com/en-us/dotnet/core/tools/nuget-signed-package-verification: per-OS signature verification defaults (macOS off).
- https://learn.microsoft.com/en-us/nuget/consume-packages/installing-signed-packages: `require`, trustedSigners, owners.
- https://reversinglabs.com/blog/iamreboot-malicious-nuget-packages-exploit-msbuild-loophole: the `.targets` payload technique.
- https://learn.microsoft.com/en-us/nuget/api/search-query-service-resource: the `verified` and `owners` fields behind the existence check.
- https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/: the default 3-day cooldown.
- https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.ecdsa.verifydata?view=net-10.0: `DSASignatureFormat` overloads (net5+).
- https://github.com/dotnet/runtime/issues/63174: Ed25519 is approved only as an OpenSSL-only type.
- https://github.com/ocx-sh/www-setup/issues/14: the upstream signature ask this program amends.
