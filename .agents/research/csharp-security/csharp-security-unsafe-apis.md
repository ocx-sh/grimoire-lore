---
title: "C# unsafe-API security rules: serializers, XML, crypto, randomness, ReDoS, SecureString"
topic: csharp-security-unsafe-apis (group: Security, csharp-quality/security.md, SC-01)
agent: deep-dive researcher (research-lang, csharp wave 3)
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 32
scope: |
  Covers: which general-purpose C# APIs are banned, constrained, or only historical hazards on net8.0/net10.0 (SDK 10.0.401, .NET 11 RC1 spot-checked), the analyzer ID or BannedSymbols line that enforces each, and what the pinned gate (AnalysisLevel 10.0-all) leaves silent.
  Not covered: supply chain and PrivateAssets (csharp-security-supply-chain), verifying the ocx binary beyond sha256 (csharp-security-binary-attestation), process launch and secret-on-stdin mechanics (CS-PROC), ASP.NET-only rules (CA3147, CA5363-CA5368, CA5382-CA5383, CA5391, CA5395-CA5396) beyond noting they are dead in a library.
  Every "fires/silent" claim was measured with the fixtures in /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-security-unsafe-apis/ unless it cites a URL.
---

# C# unsafe-API security rules

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What the gate enables without configuration (measured)](#1-what-the-gate-enables-without-configuration-measured)
   2. [Binary and polymorphic serializers](#2-binary-and-polymorphic-serializers)
   3. [Newtonsoft TypeNameHandling, DataSet.ReadXml, STJ polymorphism](#3-newtonsoft-typenamehandling-datasetreadxml-stj-polymorphism)
   4. [XML: XXE and entity bombs](#4-xml-xxe-and-entity-bombs)
   5. [Crypto: algorithms, KDFs, randomness, constant-time compare](#5-crypto-algorithms-kdfs-randomness-constant-time-compare)
   6. [ReDoS](#6-redos)
   7. [SecureString and config secrets](#7-securestring-and-config-secrets)
   8. [TLS validation, archive extraction, dynamic loading, SQL](#8-tls-validation-archive-extraction-dynamic-loading-sql)
   9. [The row set and the BannedSymbols fragment](#9-the-row-set-and-the-bannedsymbols-fragment)
   10. [Exemplar practice](#10-exemplar-practice)
   11. [Verified on the toolchain](#11-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- `AnalysisLevel=10.0-all` is the only switch that turns the security rule category on: it sets all 94 security IDs to `warning`; the SDK default and `minimum` modes enable 0 of them, `recommended` enables 24 (measured from the shipped `analysislevelsecurity_10_*.globalconfig`). Under the default posture the planted-hazard project produced zero `CA2xxx/CA3xxx/CA5xxx` diagnostics.
- `<AnalysisModeSecurity>All</AnalysisModeSecurity>` raises only the security category to All (43 rows vs 67 for `10.0-all` on the same fixture, all 25 security IDs identical). Use it for test or tool projects that keep a lower general mode.
- No security rule needs an enabling line at `10.0-all`. The gaps are structural: 9 hazards stay silent and need `BannedSymbols.txt` lines (Regex without timeout, `Type.GetType` on strings, `Assembly.LoadFrom`, `XmlUrlResolver`, `DtdProcessing.Parse`, certificate callbacks, `SecureString`, `XsltSettings` scripting) or a reviewer grep (low PBKDF2 iterations, `RSA.Create(1024)`, GUID-as-token, hard-coded secrets, `==` on digests).
- `CA3075`, `CA3076`, `CA3077`, `CA3061` never run on net8+/net10: the analyzer bails unless `System.String` lives in `mscorlib` (.NET Framework). Planting `XmlDocument{XmlResolver=new XmlUrlResolver()}` and `DtdProcessing.Parse` produced no diagnostic; `CA5369/5371/5372/5366` still fire. Do not trust a clean build as XXE assurance.
- Defaults are safe on net8/net10: `XmlReader.Create` throws on any DOCTYPE; `XmlDocument`/`XDocument` drop external entities (`XmlResolver` null). XXE returns only after someone supplies `new XmlUrlResolver()` (read `TOPSECRET` from a file in the fixture). Ban `XmlUrlResolver`, `XmlSecureResolver`, `DtdProcessing.Parse`.
- The XML entity-expansion default is 10,000,000 characters (`XmlReaderSettings.cs:410`), not 0 as the API page says; the 10^9-char bomb stopped after 111-685 ms on net10 and 416-1430 ms on net8 (XmlDocument path). With `DtdProcessing.Prohibit` it costs 0 ms.
- `SYSLIB0011` has been an error since net7.0 (not a net8 warning). Runtime: net8 throws `NotSupportedException` unless `EnableUnsafeBinaryFormatterSerialization=true`, in which case round-trip works; net10 throws `PlatformNotSupportedException` even with the switch. `SoapFormatter`, `LosFormatter`, `ObjectStateFormatter`, `JavaScriptSerializer` (CA2321), `NetDataContractSerializer` do not exist in the net8/net10 reference assemblies (`CS0234`/`CS0246`): historical only, ban lines only help a `netstandard2.0` target where `BinaryFormatter` compiles with just `CA2300/CA2301`.
- Newtonsoft `TypeNameHandling.All` and `.Auto` instantiated an attacker-chosen type on both runtimes (gadget flag `True`; `None` gave `False`); `CA2326` + `CA2327` fire. A custom STJ converter that calls `Type.GetType(wireString)` did the same (`True`); `[JsonDerivedType]` with an unknown `$type` threw `JsonException` and `Deserialize<object>` yields `JsonElement`. Newtonsoft is already rejected for the SDK (CS-JSON-17); CA2326 guards tools/tests that add it.
- Every `Regex` needs an explicit match timeout. `(a+)+$` against 25 `a` plus `!` took 2.0-3.8 s without one (doubling per extra character), threw `RegexMatchTimeoutException` at 250 ms with one, and `NonBacktracking` finished in 28-48 ms. No CA rule exists; the 18-line Regex ban fixes it, and `[GeneratedRegex(pattern, options, 250)]` is the source-generated spelling.
- A timeout and `NonBacktracking` are not a boundary against an untrusted pattern: the Regex docs (page updated 2026-07-08) say patterns must be trusted. `new Regex(userInput, ..., timeout)` stays a reviewer check.
- `REGEX_DEFAULT_MATCH_TIMEOUT` is an `AppDomain` data slot read once in `Regex`'s static constructor: set after first Regex use it did nothing (3.4 s), set before it gave 300 ms, and putting it in `runtimeconfig.json` as a string crashed `Regex` with `TypeInitializationException`/`InvalidCastException`. A library must pass its own timeout and never rely on the default.
- `CA5350`/`CA5351` fire for `MD5.HashData`, `SHA1.HashData`, `DES/TripleDES/RC2.Create`, the `*CryptoServiceProvider` classes; `CA5394` for every `Random` member; `CA5379/CA5387` only for the `Rfc2898DeriveBytes` constructors (obsolete on net10 as `SYSLIB0060`). The static `Rfc2898DeriveBytes.Pbkdf2(pw, salt, 1000, SHA256, 32)` and `RSA.Create(1024)` are silent: iterations >= 600,000 (SHA256) and key >= 2048 are reviewer rules.
- `CryptographicOperations.FixedTimeEquals` is not needed for a public artifact digest (no secret is compared), but it costs nothing; adopt it for every digest/MAC/token compare so no judgment is needed. Zero of 35 exemplar clones call it.
- `SecureString` is silent at `10.0-all`; DE0001 is documentation-only and the type is unencrypted off Windows. Ban it; secrets go as stdin bytes (CS-PROC).
- TLS: `ServerCertificateCustomValidationCallback = (_,_,_,_) => true` is silent at `10.0-all` (only `CA2000` noise); `CA5359` catches only `ServicePointManager`. Ban the four callback properties plus `DangerousAcceptAnyServerCertificateValidator`.
- `CA5389` catches `ExtractToFile(Path.Combine(dest, entry.FullName))`; SDK 11 RC1 ships a byte-identical security rule set and produced the same 67 diagnostics on `net11.0`.

## Findings

### 1. What the gate enables without configuration (measured)

Rule sets are shipped as `analysislevelsecurity_<ver>_<mode>.globalconfig` next to the general `analysislevel_<ver>_<mode>.globalconfig` in the SDK (`dotnet/sdk/10.0.401/Sdks/Microsoft.NET.Sdk/analyzers/build/config/`). Counting `dotnet_diagnostic.CAnnnn.severity = warning` lines for the security category:

| mode (`AnalysisLevel=10.0-<mode>`) | security IDs at `warning` |
|---|---|
| (SDK default, `10.0-default`) | 0 |
| `minimum` | 0 |
| `recommended` | 24 (CA3061, CA3075-77, CA3147, CA5350, CA5351, CA5359, CA5360, CA5363-66, CA5368-74, CA5379, CA5384, CA5385, CA5397) |
| `all` | 94 (CA2100, CA2119, CA2153, CA2300-2362 family, CA3001-3012, CA3061, CA3075-77, CA3147, CA5350-CA5405) |

The same IDs are also listed in the general `analysislevel_10_all.globalconfig` (it contains CA2300-CA2362, CA3001-3012, CA5350-CA5405 as `warning`), so `AnalysisLevel=10.0-all` already covers them; `AnalysisModeSecurity`/`AnalysisLevelSecurity` select the per-category file (local SDK file `Sdks/Microsoft.NET.Sdk/analyzers/Microsoft.CodeAnalysis.NetAnalyzers.targets:498`, target `AddGlobalAnalyzerConfigForPackage_MicrosoftCodeAnalysisNetAnalyzersSecurity`, conditioned on `AnalysisLevelSecurity` or `AnalysisModeSecurity`). The rule pages fetched (CA2326, CA3075, CA5389, CA5394) all say "Enabled by default in .NET 10: No" (e.g. [CA2326](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2326), [CA3075](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca3075), [CA5394](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca5394)).

Measured on the planted-hazard project (`red/`, TFMs net8.0;net10.0, distinct file:line:ID rows, identical on both TFMs):

| posture | rows | security IDs that fired |
|---|---|---|
| default (no `AnalysisLevel`) | 6 | 0 (only `SYSLIB0021/0039/0060` compiler obsoletions) |
| `10.0-recommended` | 30 | 11: CA5350 CA5351 CA5359 CA5366 CA5369 CA5371 CA5372 CA5379 CA5384 CA5385 CA5397 |
| `10.0-all` | 67 | 25: the 11 above plus CA2100 CA2326 CA2327 CA2350 CA2351 CA5358 CA5387 CA5389 CA5390 CA5392 CA5394 CA5399 CA5400 CA5401 |
| default + `AnalysisModeSecurity=All` | 43 | the same 25, none of the general noise (CA1062, CA1724, CA2000 ...) |
| `10.0-all` on SDK 11.0.100-rc.1, `net11.0` | 67 | same 25, row-for-row identical (the shipped security globalconfig is byte-identical to SDK 10) |

Consequences: (a) `recommended` is not enough for deserialization (`CA2326/CA2350/CA2351` are all-only) or for `CA5394`; (b) the `warning` severity is enough because CS-BUILD makes warnings errors (TWAE unconditional); (c) the only severity line the security set needs is `dotnet_diagnostic.RS0030.severity = error` for the ban file (BannedApiAnalyzers reports `RS0030` as a warning by default).

Why `CA3075/CA3076/CA3077/CA3061` are silent: the analyzer registers only if `SecurityDiagnosticHelpers.GetDotNetFrameworkVersion(compilation)` is non-null, and that returns null unless `System.String` is declared in `mscorlib` ([DoNotUseInsecureDtdProcessing.cs:103-120](https://github.com/dotnet/sdk/blob/186ac691d449/src/Microsoft.CodeAnalysis.NetAnalyzers/src/Microsoft.CodeAnalysis.NetAnalyzers/Microsoft.NetFramework.Analyzers/DoNotUseInsecureDtdProcessing.cs), [SecurityDiagnosticHelpers.cs:287-292](https://github.com/dotnet/sdk/blob/186ac691d449/src/Microsoft.CodeAnalysis.NetAnalyzers/src/Microsoft.CodeAnalysis.NetAnalyzers/Microsoft.NetFramework.Analyzers/Helpers/SecurityDiagnosticHelpers.cs)). The learn page still shows `XmlDocument { XmlResolver = new XmlUrlResolver() }` as "Violation 6". Provenance: `dotnet/roslyn-analyzers` is archived; NetAnalyzers moved into `dotnet/sdk` ([consolidation README](https://github.com/dotnet/roslyn-analyzers/blob/archive/README.md)).

### 2. Binary and polymorphic serializers

| API | net8 | net9/net10 | enforcement |
|---|---|---|---|
| `BinaryFormatter` (any member use) | `SYSLIB0011` **error** at compile (since net7), runtime `NotSupportedException` ("disabled within this application") | same error; runtime `PlatformNotSupportedException` ("have been removed"), switch ignored | compiler; `CA2300/2301/2302` at all; ban line only for `netstandard2.0` |
| `NetDataContractSerializer`, `SoapFormatter`, `LosFormatter`, `ObjectStateFormatter`, `JavaScriptSerializer` | type absent (`CS0234`/`CS0246`) | type absent | nothing to enforce; `CA2305/2310-2315/2321/2322` are .NET Framework-era |
| `DataContractSerializer`, `DataContractJsonSerializer`, `XmlSerializer` | present, safe by design | present | not hazards |

Docs: BinaryFormatter "is insecure and can't be made secure"; "never safe when used with untrusted input"; the alternatives list excludes `SoapFormatter`, `LosFormatter`, `NetDataContractSerializer`, `ObjectStateFormatter` as "unrestricted polymorphic deserialization" ([security guide](https://learn.microsoft.com/en-us/dotnet/standard/serialization/binaryformatter-security-guide)). Timeline from the compatibility pages: errors from net7 ([7.0](https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/7.0/binaryformatter-apis-produce-errors)), runtime throws from net8 ([8.0](https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/8.0/binaryformatter-disabled)), implementation removed in .NET 9 Preview 6 and "always throws"; a separate unsupported NuGet package is the only way back ([9.0](https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/9.0/binaryformatter-removal)). The brief's "SYSLIB0011 on net8" was a warning only before net7; measured here: error on both TFMs.

Wrong fix an agent makes (both compile, both wrong):

```csharp
// WRONG: suppress + re-enable; still throws on net10 (PlatformNotSupportedException), works on net8 only with the switch
#pragma warning disable SYSLIB0011
var copy = (Foo)new BinaryFormatter().Deserialize(stream);
// <EnableUnsafeBinaryFormatterSerialization>true</EnableUnsafeBinaryFormatterSerialization>

// RIGHT: data-only DTO + source-generated STJ
var copy = JsonSerializer.Deserialize(stream, OcxJsonContext.Default.Foo)!;
```

### 3. Newtonsoft TypeNameHandling, DataSet.ReadXml, STJ polymorphism

Runtime evidence (`run/Program.cs`, a harmless in-assembly "gadget" whose property setter sets a flag; output in `out-run-net10.0.txt` / `out-run-net8.0.txt`): `TypeNameHandling.None` -> `False`; `.All` -> `True`; `.Auto` on an `object` member -> `True`, on both .NET 8.0.31 and 10.0.12. `CA2326` (any non-None value) and `CA2327` (insecure settings) fired on both lines; the fix per [CA2326](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2326) is `None`, a signed payload, or a custom `ISerializationBinder` (then switch to CA2327-CA2330).

STJ is safe by construction when polymorphism is a closed attribute list ([polymorphism docs](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism), page updated 2026-09-29):

```csharp
// RIGHT: allow-list. Unknown "$type" -> JsonException (measured), no Type.GetType.
[JsonPolymorphic(TypeDiscriminatorPropertyName = "$type", UnknownDerivedTypeHandling = JsonUnknownDerivedTypeHandling.FailSerialization)]
[JsonDerivedType(typeof(Circle), "circle")]
abstract class Shape { }

// WRONG: custom converter that trusts the wire string (gadget flag came back True)
var target = Type.GetType(doc.RootElement.GetProperty("$type").GetString()!)!;
return JsonSerializer.Deserialize(doc.RootElement.GetRawText(), target);
```

`JsonSerializer.Deserialize<object>("{\"$type\":\"System.Diagnostics.Process\"}")` returned a `JsonElement` (never a CLR type). CS-JSON-14 already fixes "one hand-written tag-first converter per union"; this adds: the converter switches on a closed tag table and never calls `Type.GetType`/`Activator.CreateInstance(string,string)` (banned, section 9). .NET 11 adds `[JsonPolymorphic(InferClosedTypePolymorphism = true)]` for C# 15 `closed` hierarchies (derived types inferred, simple-name discriminators); explicit `[JsonDerivedType]` replaces inference. That is RC1-era: do not use it below a net11.0 target.

`DataSet.ReadXml`/`DataTable.ReadXml`: `CA2350/CA2351` (all only) plus `CA5366` (recommended) fire; the SDK has no `System.Data` use, so the rule is "do not add one".

### 4. XML: XXE and entity bombs

Measured behaviour (net10.0.12 / net8.0.31 identical except timings), file entity pointing at `/tmp/xxe-secret.txt` containing `TOPSECRET`:

| call | result |
|---|---|
| `new XmlDocument().LoadXml(xxe)` | OK, entity silently empty (resolver null) |
| `new XmlDocument{XmlResolver=new XmlUrlResolver()}.LoadXml(xxe)` | **`TOPSECRET`** |
| `XmlReader.Create(reader)` defaults | `XmlException: For security reasons DTD is prohibited` |
| `XmlReaderSettings{DtdProcessing=Parse}` (resolver default null) | entity not resolved |
| `XmlReaderSettings{DtdProcessing=Parse, XmlResolver=new XmlUrlResolver()}` | **`TOPSECRET`** |
| `XmlTextReader` defaults / `XDocument.Parse` | entity not resolved |
| 10^9-char billion-laughs, `XmlDocument.LoadXml` defaults | `XmlException ... MaxCharactersFromEntities` after 685 ms (net10), 1430 ms (net8) |
| same, `XmlReaderSettings{DtdProcessing=Parse}` | exception after 111 ms (net10), 416 ms (net8) |
| same, `XmlReader.Create` defaults | exception at DOCTYPE, 0 ms |

So XXE needs two deliberate steps (enable DTDs and supply a resolver); the hazard in 2026 is an agent pasting .NET Framework hardening advice backwards. The reference page says `XmlReaderSettings.XmlResolver` "default is a new XmlUrlResolver ... Starting with the .NET Framework 4.5.2, this setting has a default value of null" ([XmlResolver](https://learn.microsoft.com/en-us/dotnet/api/system.xml.xmlreadersettings.xmlresolver)) and `MaxCharactersFromEntities` "default is 0" meaning unlimited ([page](https://learn.microsoft.com/en-us/dotnet/api/system.xml.xmlreadersettings.maxcharactersfromentities)); the source sets `_maxCharactersFromEntities = (long)1e7` and `DtdProcessing = DtdProcessing.Prohibit` in `Reset()` ([XmlReaderSettings.cs:410,418](https://github.com/dotnet/runtime/blob/8630d8988107/src/libraries/System.Private.Xml/src/System/Xml/Core/XmlReaderSettings.cs), [XmlTextReaderImpl.cs:347](https://github.com/dotnet/runtime/blob/8630d8988107/src/libraries/System.Private.Xml/src/System/Xml/Core/XmlTextReaderImpl.cs)). The docs are stale; the behaviour was measured.

`CA5369` (XmlSerializer.Deserialize(Stream)), `CA5371` (XmlSchema.Read), `CA5372` (XPathDocument(path)), `CA5366` fire on net8/10 and are useful ("use an XmlReader"). `CA3075/3076/3077/3061` never fire (section 1). Closing the silent ones:

```csharp
// WRONG (compiles clean under 10.0-all, reads files):
var s = new XmlReaderSettings { DtdProcessing = DtdProcessing.Parse, XmlResolver = new XmlUrlResolver() };
// RIGHT (default-safe; stating it keeps intent explicit):
var s = new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null };
using var r = XmlReader.Create(textReader, s);
```

The legacy `XmlReaderSettings.ProhibitDtd = false` still exists on net8/net10 and maps to `DtdProcessing.Parse` (`XmlReaderSettings.cs:200-207`), but it is `[Obsolete]` and measured as `CS0618` (default-on warning, an error under TWAE), so it needs no ban line.

`XmlResolver.ThrowingResolver` is the documented "no external access" object ([XmlResolver remarks](https://learn.microsoft.com/en-us/dotnet/api/system.xml.xmlreadersettings.xmlresolver)). The ocx contract is JSON, so XML is a "do not add" area; the ban set is a tripwire, not a feature.

### 5. Crypto: algorithms, KDFs, randomness, constant-time compare

Fired at `10.0-all` (net8 and net10): `MD5.HashData`/`MD5.Create`/`MD5CryptoServiceProvider` -> `CA5351`; `SHA1.HashData`/`SHA1CryptoServiceProvider`/`TripleDES.Create` -> `CA5350`; `DES.Create`/`RC2.Create` -> `CA5351`; `Aes{Mode=ECB}` -> `CA5358`; `Aes.Key = new byte[]{...}` -> `CA5390`; static IV -> `CA5401`; `DSA.Create` -> `CA5384`; `new RSACryptoServiceProvider(1024)` -> `CA5385`; `new Rfc2898DeriveBytes(pw, salt, 1000)` -> `CA5379`+`CA5387`; `new Random()`/`Random.Shared` -> `CA5394` (all-only; docs: [CA5394](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca5394)).

Silent at `10.0-all` (reviewer rules): `Rfc2898DeriveBytes.Pbkdf2(pw, salt, 1000, SHA256, 32)`; `RSA.Create(1024)`; `Guid.NewGuid().ToString("N")` as a token; `a.AsSpan().SequenceEqual(b)` on digests; `const string ApiKey = "sk-live-..."`. On net10 every `Rfc2898DeriveBytes` constructor is `SYSLIB0060` (default-on warning, [SYSLIB0060](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib0060)): use the one-shot static `Pbkdf2`. Iteration floor: OWASP lists 600,000 for PBKDF2-HMAC-SHA256, 220,000 for SHA512 and 1,400,000 for SHA1 "legacy only" ([Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)). The ocx SDK stores no passwords; this row exists so an agent that adds hashing writes it correctly.

Right idioms (all compile warning-free on net8 and net10 in `green/`, verified):

```csharp
byte[] digest = SHA256.HashData(data);                              // integrity, replaces MD5/SHA1
byte[] key    = Rfc2898DeriveBytes.Pbkdf2(pw, salt, 600_000, HashAlgorithmName.SHA256, 32);
string token  = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));   // or RandomNumberGenerator.GetHexString(64, lowercase: true) (net8+)
int n         = RandomNumberGenerator.GetInt32(1000);
byte[] d      = await SHA256.HashDataAsync(stream, ct).ConfigureAwait(false);  // streaming digest, net7+
bool same     = CryptographicOperations.FixedTimeEquals(Convert.FromHexString(expectedHex), actual);
```

`Guid.NewGuid` is built on a CSPRNG on Unix and `CoCreateGuid` on Windows ([Guid.cs:309-311](https://github.com/dotnet/runtime/blob/8630d8988107/src/libraries/System.Private.CoreLib/src/System/Guid.cs)) but documents no secrecy contract and carries 122 random bits: do not use it as a secret.

**Is a fixed-time compare needed for a public digest (CS-BIN)?** No attack exists: both the expected sha256 (from the release manifest/index) and the computed one are public, so timing reveals nothing the attacker lacks. It is still the rule to use `FixedTimeEquals` because it is the single idiom an agent can apply without judging secrecy, costs one call, and `FixedTimeEquals` short-circuits only on length mismatch ([FixedTimeEquals remarks](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.fixedtimeequals): "Fixed-time behavior is guaranteed in all other cases"). Compare bytes (`Convert.FromHexString` accepts both cases, which also avoids `ToLowerInvariant`, itself `CA1308` at `10.0-all`), never hex strings. Label it defence-in-depth, not a vulnerability fix.

Protocol-mandated weak hashes (npgsql's MD5 password auth, Redis's SHA1 script hash) are legitimate; the exemplars do not suppress because their gates are lower (section 10). Our posture: a `#pragma warning disable CA5351 // <protocol and RFC>` with a reason on the same line, never `NoWarn`.

### 6. ReDoS

Facts (net10.0.12; net8.0.31 within 10%): pattern `^(a+)+$`, input `aaaaaaaaaaaaaaaaaaaaaaaaa!` (25 a's):

| construct | time |
|---|---|
| `new Regex(p).IsMatch` (default `InfiniteMatchTimeout`) | 2,027-3,342 ms |
| `Regex.IsMatch(s, p)` static | 2,037-3,818 ms |
| `new Regex(p, RegexOptions.None, TimeSpan.FromMilliseconds(250))` | `RegexMatchTimeoutException` at 251-254 ms |
| `RegexOptions.NonBacktracking` | 28-48 ms (linear in input) |
| `[GeneratedRegex(p, RegexOptions.None, 250)]` | `RegexMatchTimeoutException` at 254 ms, `e.MatchTimeout`=250 ms |
| `[GeneratedRegex(p)]` | 1,776 ms |

Each extra character doubles the unbounded time. The docs: "you should always set a time-out value" and the default is `Regex.InfiniteMatchTimeout` ([best practices](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-regex)); the same page (updated 2026-07-08) adds that "time-out values are not intended as a security boundary against malicious patterns" and "applications should not create regular expression patterns from untrusted user-provided values"; use `Regex.Escape` for user text.

`REGEX_DEFAULT_MATCH_TIMEOUT` (`rxdefault/` experiment, `AppContext.GetData` read in `Regex`'s static ctor, [Regex.Timeout.cs:60,105-133](https://github.com/dotnet/runtime/blob/8630d8988107/src/libraries/System.Text.RegularExpressions/src/System/Text/RegularExpressions/Regex.Timeout.cs)): the value must be a `TimeSpan` object; any other non-null value throws `InvalidCastException` inside the static constructor.

| how set | outcome |
|---|---|
| nothing | `MatchTimeout` = infinite, 3,411 ms |
| `AppDomain.CurrentDomain.SetData("REGEX_DEFAULT_MATCH_TIMEOUT", TimeSpan.FromMilliseconds(300))` first | `MatchTimeout` 300 ms, throws at 329 ms |
| same call after one `Regex.IsMatch("x","x")` | no effect, 3,366 ms |
| `<RuntimeHostConfigurationOption Include="REGEX_DEFAULT_MATCH_TIMEOUT" Value="00:00:00.300"/>` (runtimeconfig string) | `TypeInitializationException` <- `InvalidCastException: AppDomain data 'REGEX_DEFAULT_MATCH_TIMEOUT' contains the invalid value or object '00:00:00.300'` |

So the switch is an app-host decision; a library cannot set it and must pass a timeout on every construct. The CA rules do not look at this at all: `Rx.cs` (five timeout-less constructs) produced zero `CA` rows; Meziantou `MA0009` flags them ([MA0009 doc](https://github.com/meziantou/Meziantou.Analyzer/blob/main/docs/Rules/MA0009.md); severity Warning, `RegexUsageAnalyzerBase.cs:19`) but CS-BUILD admits only BannedApiAnalyzers and VS.Threading as third-party analyzers, so the SDK uses `RS0030` bans on every overload without a `TimeSpan`/`matchTimeoutMilliseconds` (measured: constructors, static `IsMatch/Match/Matches/Replace/Split`, span `IsMatch/EnumerateMatches`, and the `GeneratedRegexAttribute` constructors all flagged; the 4-argument static overload and `[GeneratedRegex(p, o, 250)]` were not). `RegexOptions.NonBacktracking` with no timeout is flagged too; accepted: pass the timeout anyway.

Threshold: 250 ms in the fixtures; the docs' own example ends at 1,000 ms. SDK patterns validate short identifiers/digests, so choose <= 1 s and never `Timeout.InfiniteTimeSpan`.

### 7. SecureString and config secrets

`SecureString` did not fire anything at `10.0-all`. DE0001 ("SecureString shouldn't be used", platform-compat) is a doc, not an analyzer in the SDK: "The contents of the array is unencrypted except on .NET Framework" ([DE0001](https://github.com/dotnet/platform-compat/blob/master/docs/DE0001.md)); the API page says "We recommend that you don't use the SecureString class for new development on .NET (Core)" and "does not encrypt the internal storage on non-Windows platform" ([SecureString](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-security-securestring)). Exemplar evidence: none of 35 clones stores its own secret in one; Azure.Core only converts a PowerShell-returned SecureString token ([AzurePowerShellCredential.cs:294-296](https://github.com/Azure/azure-sdk-for-net/blob/32c48fc3d524/sdk/core/Azure.Core/src/Identity/Credentials/AzurePowerShellCredential.cs)) and CliWrap converts to `ProcessStartInfo.Password` (Windows-only) at `Command.Execution.cs:434`. A `T:System.Security.SecureString` ban line makes it a build error (measured `RS0030`, `Secure.cs:5`).

Config secrets: `dotnet user-secrets` is "for development purposes only", unencrypted JSON in the profile directory; environment variables are "commonly stored as plain, unencrypted text"; production secrets go to a key vault ([app-secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets)). For this SDK neither applies: a library reads no configuration; secrets arrive as parameters and leave as stdin bytes (CS-PROC); `OCX_*` env vars are read for paths, never secrets. A library with `Microsoft.Extensions.Configuration.UserSecrets` is a defect.

### 8. TLS validation, archive extraction, dynamic loading, SQL

- TLS (fires): `CA5359` (`ServicePointManager` callback), `CA5397` (deprecated `SslProtocols.Tls/Tls11`), `CA5399` (`CheckCertificateRevocationList = false`), `CA5400`. Silent: `new HttpClientHandler{ServerCertificateCustomValidationCallback = (_,_,_,_) => true}` and `HttpClientHandler.DangerousAcceptAnyServerCertificateValidator` (only `CA2000` noise and, for the latter, `CA5400`). Bans on the four properties closed them (`RS0030` on `Tls.cs:8,9,12`). npgsql's pattern is the allowed shape: named static validators (`SslVerifyFullValidation` ... `SslTrustServerValidation` => `true`) selected by an explicit user option ([NpgsqlConnector.cs:1838-1848](https://github.com/npgsql/npgsql/blob/9c47244547c2/src/Npgsql/Internal/NpgsqlConnector.cs)). The SDK's download path (CS-BIN) uses the platform validator and exposes no hook.
- Archive: `CA5389` fired on `e.ExtractToFile(Path.Combine(dest, e.FullName), true)`; the docs fix is `Path.GetFullPath`, an `EndsWith(DirectorySeparatorChar)` guard and `StartsWith(..., StringComparison.Ordinal)` ([CA5389](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca5389)). CS-BIN-extraction (single capped member to a fixed temp name) never uses an entry name as a path, which is the stronger rule.
- Dynamic loading: `Activator.CreateInstance(Type.GetType(wireString))` and `Assembly.LoadFrom(path)` fired nothing at `10.0-all`; bans closed them (`Dyn.cs:6,7`). `Process.Start(string)` is CS-PROC territory (`CA3006` is taint-based and needs web sources, so it is silent in a console/library).
- SQL: `CA2100` fires for `DbCommand.CommandText = $"...{user}"` and for a concatenated local, and stayed silent for the `IDbCommand` interface variant (`Sql.cs`). The SDK has no database.
- P/Invoke: `CA5392` fires on `[DllImport]` and `[LibraryImport]` without `DefaultDllImportSearchPaths`; the SDK has none, "do not add" suffices.

### 9. The row set and the BannedSymbols fragment

| # | hazard | class | enforcement | proven |
|---|---|---|---|---|
| R1 | `BinaryFormatter` | banned | `SYSLIB0011` (error, compiler) + `CA2300/01/02`; ban line for `netstandard2.0` | red: error net8+net10; ns2.0 `CA2300,CA2301,RS0030` |
| R2 | `NetDataContractSerializer`, `SoapFormatter`, `LosFormatter`, `ObjectStateFormatter`, `JavaScriptSerializer`+`SimpleTypeResolver` | historical only | types absent on net8+ (`CS0234/0246`); `CA2305/10-15/21/22` are Framework-era | red: `CS0234`/`CS0246` |
| R3 | Newtonsoft `TypeNameHandling` != None | banned (Newtonsoft already rejected) | `CA2326`, `CA2327` | red: gadget `True`, both rules fire |
| R4 | `DataSet/DataTable.ReadXml` | banned | `CA2350/2351`, `CA5366` | red fires |
| R5 | STJ polymorphism | constrained | `[JsonDerivedType]` allow-list only; ban `Type.GetType(string)` | red: custom converter gadget `True`; allow-list `JsonException` |
| R6 | `XmlUrlResolver`, `XmlSecureResolver`, `DtdProcessing.Parse`, `XsltSettings.EnableScript/EnableDocumentFunction` | banned | **BannedSymbols** (CA3075/77 silent on net8+) | red silent, `RS0030` on 9 lines |
| R7 | XML readers without an `XmlReader` | constrained | `CA5369/5371/5372/5366` | red fires |
| R8 | MD5/SHA1/DES/3DES/RC2/DSA, ECB, static key/IV | banned | `CA5350/5351/5384/5358/5390/5401`, severity `error` | red fires |
| R9 | KDF params | constrained | ctors: `CA5379/5387` + `SYSLIB0060`; static `Pbkdf2` iterations: reviewer grep | static form silent |
| R10 | `Random`/`Random.Shared` for secrets | banned | `CA5394`; pragma with reason for non-secret jitter | red fires |
| R11 | `Guid.NewGuid()` as secret | banned (reading rule) | grep | silent |
| R12 | `Regex` without timeout | banned | **BannedSymbols** (18 lines); no CA exists | red silent, `RS0030` on 5 lines |
| R13 | untrusted regex pattern | banned (reading rule) | reviewer: pattern is `const`/`static readonly`/`Regex.Escape` | not mechanisable |
| R14 | `SecureString` | banned | **BannedSymbols** | red silent, `RS0030` |
| R15 | TLS validation hooks | banned | `CA5359/5397/5399/5400` + **BannedSymbols** on 4 properties | red `Tls.cs:8` silent -> `RS0030` |
| R16 | zip-slip | banned | `CA5389` | red fires |
| R17 | `Type.GetType(string)`, `Activator.CreateInstance(string,string)`, `Assembly.LoadFrom/LoadFile/UnsafeLoadFrom` | banned | **BannedSymbols** | red silent -> `RS0030` |
| R18 | digest/MAC/token compare | constrained | reviewer grep for `SequenceEqual`/`==` on digests; `FixedTimeEquals` | silent |
| R19 | P/Invoke, SQL concat, taint rules (CA3001-3012) | "do not add" | `CA5392`, `CA2100`; taint rules need web sources | n/a |

The fragment (fixture file `BannedSymbols.security.txt`, 43 lines; comments use `//` per the [BannedApiAnalyzers help](https://github.com/dotnet/roslyn/blob/7ac1c032ef13/src/RoslynAnalyzers/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md): `{DocID}[;message]`):

```text
// --- XML: net8+ is safe by default; CA3075/CA3077 never run here (mscorlib gate). Ban the ways back in.
T:System.Xml.XmlUrlResolver; External entity resolution (XXE). Leave XmlResolver unset or null.
T:System.Xml.XmlSecureResolver; Obsolete CAS-era resolver. Leave XmlResolver unset or null.
F:System.Xml.DtdProcessing.Parse; Use Prohibit (default for XmlReader.Create) or Ignore.
P:System.Xml.Xsl.XsltSettings.EnableScript; XSLT script blocks execute code.
P:System.Xml.Xsl.XsltSettings.EnableDocumentFunction; document() reads arbitrary URLs.
// --- ReDoS: no CA rule exists. Every Regex needs a match timeout (or NonBacktracking + timeout).
M:System.Text.RegularExpressions.Regex.#ctor(System.String); Pass a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.#ctor(System.String,System.Text.RegularExpressions.RegexOptions); Pass a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.IsMatch(System.String,System.String); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.IsMatch(System.String,System.String,System.Text.RegularExpressions.RegexOptions); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.Match(System.String,System.String); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.Match(System.String,System.String,System.Text.RegularExpressions.RegexOptions); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.Matches(System.String,System.String); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.Matches(System.String,System.String,System.Text.RegularExpressions.RegexOptions); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.Replace(System.String,System.String,System.String); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.Replace(System.String,System.String,System.String,System.Text.RegularExpressions.RegexOptions); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.Split(System.String,System.String); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.Split(System.String,System.String,System.Text.RegularExpressions.RegexOptions); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.IsMatch(System.ReadOnlySpan{System.Char},System.String); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.IsMatch(System.ReadOnlySpan{System.Char},System.String,System.Text.RegularExpressions.RegexOptions); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.EnumerateMatches(System.ReadOnlySpan{System.Char},System.String); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.Regex.EnumerateMatches(System.ReadOnlySpan{System.Char},System.String,System.Text.RegularExpressions.RegexOptions); Use the overload with a TimeSpan matchTimeout.
M:System.Text.RegularExpressions.GeneratedRegexAttribute.#ctor(System.String); Use the (pattern, options, matchTimeoutMilliseconds) constructor.
M:System.Text.RegularExpressions.GeneratedRegexAttribute.#ctor(System.String,System.Text.RegularExpressions.RegexOptions); Use the (pattern, options, matchTimeoutMilliseconds) constructor.
// --- Polymorphic formatters: SYSLIB0011 already errors on net7+; only matters for a netstandard2.0 target.
T:System.Runtime.Serialization.Formatters.Binary.BinaryFormatter; Insecure by design (CA2300). Use System.Text.Json.
T:System.Runtime.Serialization.NetDataContractSerializer; Unrestricted polymorphic deserialization. Use System.Text.Json.
// --- Dynamic type/assembly loading from strings (gadget class). Resolve wire tags through a closed table.
M:System.Type.GetType(System.String); Never resolve a type from a wire string. Switch on a closed tag table.
M:System.Type.GetType(System.String,System.Boolean); Never resolve a type from a wire string. Switch on a closed tag table.
M:System.Type.GetType(System.String,System.Boolean,System.Boolean); Never resolve a type from a wire string. Switch on a closed tag table.
M:System.Activator.CreateInstance(System.String,System.String); Never instantiate a type named by a string.
M:System.Reflection.Assembly.LoadFrom(System.String); Loads code from a path. The SDK loads no assemblies.
M:System.Reflection.Assembly.LoadFile(System.String); Loads code from a path. The SDK loads no assemblies.
M:System.Reflection.Assembly.UnsafeLoadFrom(System.String); Loads code from a path. The SDK loads no assemblies.
// --- TLS validation hooks: the download path uses the platform default validator.
P:System.Net.Http.HttpClientHandler.ServerCertificateCustomValidationCallback; Do not replace certificate validation.
P:System.Net.Http.HttpClientHandler.DangerousAcceptAnyServerCertificateValidator; Disables certificate validation.
P:System.Net.Security.SslClientAuthenticationOptions.RemoteCertificateValidationCallback; Do not replace certificate validation.
P:System.Net.ServicePointManager.ServerCertificateValidationCallback; Do not replace certificate validation.
// --- Secrets in memory: SecureString (DE0001) is not encrypted on Unix. Secrets travel as stdin bytes.
T:System.Security.SecureString; Obsolete guidance (DE0001). Pass secrets as UTF-8 bytes on stdin.
```

Wire-up (3 lines; versions follow CS-BUILD, BannedApiAnalyzers 5.6.0): `<PackageReference Include="Microsoft.CodeAnalysis.BannedApiAnalyzers" Version="5.6.0" PrivateAssets="all" />`, `<AdditionalFiles Include="BannedSymbols.security.txt" />` (the analyzer reads `BannedSymbols.txt` and `BannedSymbols.*.txt`), and `dotnet_diagnostic.RS0030.severity = error` in `.globalconfig`. The file merges with the 25-line process fragment and 36-line portability fragment (different files, same analyzer); `Process.Start(string,string)` and the `SecureString` `Process.Start` overload are already in the process fragment. Generated code is analyzed by default (`dotnet_banned_api_analyzer.exclude_generated_code = true` opts out); the source-generated Regex/STJ code in `green/` did not trip any line.

### 10. Exemplar practice

- Gate depth: Polly sets every security ID in `eng/analyzers/Library.globalconfig`: `CA5350`/`CA5351` = `error` (`App-vNext__Polly@e4476096da5b:eng/analyzers/Library.globalconfig:1634,1640`), `CA2326` warning (`:1400`), `CA3075`/`CA3077` warning (`:1598,1616`, no-ops on net8+), `CA5394` warning (`:1862`), `CA5399/5400` (`:1892,1898`). That is the same shape as this research's output; the measured gap is that CA3075/77 lines there buy nothing on modern TFMs.
- Non-security randomness: Polly `RandomUtil.cs:3` and xunit `Randomizer.cs:1` use file-level `#pragma warning disable CA5394` with a reason (`App-vNext__Polly@e4476096da5b:src/Polly.Core/Utils/RandomUtil.cs:3`, `xunit__xunit@0c7aa4991fa3:src/xunit.v3.common/Utility/Randomizer.cs:1`). Prefer a same-line reason on the smallest scope.
- Hostile-input knob: MessagePack ships two presets, `TrustedData` and `UntrustedData` (`MaximumObjectGraphDepth = 500`, 64 MiB decompressed cap, hash-collision resistance) and its README says the preset "merely hardens against some common attacks" (`MessagePack-CSharp__MessagePack-CSharp@242bdad51f89:src/MessagePack/MessagePackSecurity.cs:22,38-43`, `README.md:669,680`). The SDK analogue is the 16 MiB stream cap (CS-PROC) and STJ's default `MaxDepth` 64; no new knob needed.
- XML: Cake sets `DtdProcessing = Prohibit` with `XmlResolver = null` and the comment "Prevent XXE" (`cake-build__cake@08885933e936:src/Cake.Common/Solution/SolutionParser.cs:203-204`); testfx does the same (`microsoft__testfx`: `XmlUtilities.cs:46-47`); NodaTime uses `Ignore` (`nodatime__nodatime@4dd26f1ddfa7:src/NodaTime.TzdbCompiler/Tzdb/CldrWindowsZonesParser.cs:40`). No exemplar enables DTD parsing with a resolver.
- Protocol-mandated MD5/SHA1: npgsql `NpgsqlConnector.Auth.cs:302,317` (`MD5.HashData`), Redis `RedisServer.cs:892` (`SHA1.Create()` for the script hash); Nuke uses MD5 for file/cache hashing with no suppression (`nuke-build__nuke@27e8077b8ab0:source/Nuke.Utilities/IO/AbsolutePath.Hash.cs:25`). None of them runs `10.0-all`'s security set.
- Certificate callbacks are opt-in user options, never defaults: npgsql `NpgsqlConnection.cs:972`, `NpgsqlDataSourceBuilder.cs:219`; Redis `ConfigurationOptions.cs:386`; Meziantou ships `MA0039` ("Do not write your own certificate validation method") at `DiagnosticSeverity.Error` (`meziantou__Meziantou.Analyzer@161b7e948ad3:src/Meziantou.Analyzer/Rules/DoNotUseServerCertificateValidationCallbackAnalyzer.cs:11`), the one security rule in that package besides `MA0009` (Warning, `RegexUsageAnalyzerBase.cs:19`) that goes beyond the BCL analyzers.
- Counts over the 35 clones (`/usr/bin/grep -rnE --include='*.cs'`): `FixedTimeEquals` 0; `SecureString` 16 lines in 3 repos (none own-secret); `TypeNameHandling` 1 (a Nuke doc comment); `NetDataContractSerializer` 0; `BinaryFormatter` 21 lines in 5 repos (tests, compat shims, `MessagePack` doc); PowerShell's clone is 4 files and gave no evidence.

### 11. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-security-unsafe-apis/` (parent `global.json` pins 10.0.401). `R=/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`. `diag.py` collapses build output to `file:line  ID  severity  tfms`.

| dir | role |
|---|---|
| `red/` | 20 hazard files, TFMs net8.0;net10.0, switches `-p:Posture=default|recommended|all`, `-p:Ban=true`, `-p:Mez=true` |
| `green/` | fixed twin, TWAE true, `AnalysisLevel 10.0-all`, BannedApiAnalyzers 5.6.0 + `BannedSymbols.security.txt` |
| `absent/` | one-file probes: BinaryFormatter, removed types, `netstandard2.0` |
| `run/`, `binfmt-run/`, `rxdefault/`, `rxgen/` | runtime behaviour (XXE, bomb, ReDoS, gadget, BinaryFormatter, REGEX_DEFAULT_MATCH_TIMEOUT, GeneratedRegex timeout) |
| `red11/` | red on SDK 11.0.100-rc.1, `net11.0` |

Red (gate), command and observed result:

```text
$ cd red && $R dotnet build -p:Posture=default     -clp:NoSummary -v:m --no-incremental 2>&1 | python3 -I ../diag.py
  6 rows, 0 security IDs   (Crypto2.cs:6-8 SYSLIB0060, :10-11 SYSLIB0021, Tls.cs:11 SYSLIB0039)
$ ... -p:Posture=recommended   -> 30 rows, 11 security IDs
$ ... -p:Posture=all           -> 67 rows, 25 security IDs
$ ... -p:Posture=default -p:AnalysisModeSecurity=All -> 43 rows, the same 25
$ ... -p:Posture=all -p:Ban=true -> +20 RS0030 rows on lines that were otherwise silent:
    Dyn.cs:6,7  Rx.cs:6,7,9,10,12  Rx2.cs:5,6  Secure.cs:5  Tls.cs:8,9,12
    Xml.cs:9,10,11,14  Xml2.cs:8,14,15,22,23
$ ... -p:Posture=all -p:Ban=true -p:TreatWarningsAsErrors=true --no-incremental -nologo
  187 Error(s)   exit=1
```

Silent at `10.0-all` before the ban (no CA/IL row on these lines): `Rx.cs:6,7,9,10,12`, `Dyn.cs:6,7`, `Secure.cs:5`, `Tls.cs:8`, `Xml.cs:9,10,11,14`, `Xml2.cs:8,14,15,21-23,28`, `Xml3.cs:7` (CA3061), `Crypto.cs:13,14,17,21,23`, `Hard.cs:4`, `MyDoc : XmlDocument` (CA3077), `Sql.cs` (IDbCommand).

Green:

```text
$ cd green && $R dotnet build --no-incremental -nologo
  Build succeeded.  0 Warning(s)  0 Error(s)   exit=0   (net8.0 and net10.0)
```

`green/src/` holds `Crypto.cs` (SHA256, Pbkdf2 600k, RNG, FixedTimeEquals), `Rx.cs` (ctor with `TimeSpan`, static 4-arg, `[GeneratedRegex(..., 250)]`), `Xml.cs` (Prohibit + null resolver), `Dyn.cs` (closed `switch`), `Zip.cs`, `Secrets.cs` (UTF-8 bytes). `.globalconfig` sets only eight non-security noise rules to `none` (CA1062, CA1724, CA1054, CA1707, CA1812, CA1303, CA1819, CA2007), none from the security set.

Other red/green pairs watched (runtime, `run/`):

```text
$ cd run && $R dotnet bin/Debug/net10.0/Run.dll          # and net8.0
[BinaryFormatter.Serialize] PlatformNotSupportedException ... removed         (net8: NotSupportedException ... disabled)
[XmlDocument + XmlUrlResolver xxe] OK TOPSECRET
[XmlReader.Create defaults xxe] XmlException: For security reasons DTD is prohibited
[XmlDocument.LoadXml bomb (defaults)] XmlException ... MaxCharactersFromEntities (685 ms)
[Regex no timeout (a+)+$ n=25] OK False (2027 ms)
[Regex ctor timeout 250ms] RegexMatchTimeoutException (251 ms)
[Regex NonBacktracking] OK False (34 ms)
[STJ derived-type allow-list, unknown discriminator] JsonException: Read unrecognized type discriminator id ...
[STJ custom converter Type.GetType(wire $type)] OK True
[Newtonsoft TypeNameHandling.None, $type] OK False   /   .All -> OK True   /   .Auto -> OK True
$ cd binfmt-run && $R dotnet run -f net8.0   -> round trip: hi          (EnableUnsafeBinaryFormatterSerialization=true)
$ cd binfmt-run && $R dotnet run -f net10.0  -> PlatformNotSupportedException ... removed
$ cd rxdefault && $R dotnet bin/Debug/net10.0/X.dll none|early|late
  none: infinite, 3411 ms  early: 300 ms, RegexMatchTimeoutException 329 ms  late: infinite, 3366 ms
$ $R dotnet build -p:Cfg=true && $R dotnet bin/Debug/net10.0/X.dll none
  TypeInitializationException ... InvalidCastException: AppDomain data 'REGEX_DEFAULT_MATCH_TIMEOUT' contains the invalid value or object '00:00:00.300'
$ cd rxgen && $R dotnet run  -> GeneratedRegex(timeout 250): RegexMatchTimeoutException after 254 ms; ... no timeout: completed in 1776 ms
```

Type-existence probes (`absent/`): `$R dotnet build -p:Tfms=net10.0 -p:Only=Probe` and `-p:Tfms=net8.0` gave `CS0234` for `Formatters.Soap`, `System.Web.UI` (Los/ObjectState), `System.Web.Script` (JavaScriptSerializer), `CS0246`-class for `NetDataContractSerializer`; `DataContractSerializer`/`DataContractJsonSerializer` compiled. `-p:Tfms=netstandard2.0 -p:LangVersion=14 -p:Only=BinFmt` -> `CA2300, CA2301` and Build succeeded; with `-p:Ban=true` -> `+RS0030`.

Red/green pairs watched: 12 (BinaryFormatter compile+runtime; TypeNameHandling; XXE; entity bomb; ReDoS; CA5394 vs RNG; CA5351 vs SHA256; SecureString; `Type.GetType`; TLS lambda; `XmlUrlResolver`/Parse (CA3075 silent); REGEX_DEFAULT_MATCH_TIMEOUT early/late/runtimeconfig). Windows was not used: no claim here is Windows-only (`CoCreateGuid` is source-read, not run).

## Normative guidance candidates

N1. **Run the security category at All.** Set `<AnalysisLevel>10.0-all</AnalysisLevel>`; any project with a lower general mode adds `<AnalysisModeSecurity>All</AnalysisModeSecurity>`. Rationale: default mode enables 0 of 94 security rules and recommended omits CA2326/CA2350/CA5394. Verify: `rg -n --glob 'Directory.Build.props' -e 'AnalysisLevel>10\.0-all<' -e 'AnalysisModeSecurity>All<' .` must match; `dotnet build -p:TreatWarningsAsErrors=true` on a project containing `new Random().Next()` must exit 1 with `CA5394`.

N2. **Never suppress a security rule project-wide.** No `NoWarn`/`<WarningsNotAsErrors>`/`severity = none` for `CA2300-CA2362`, `CA3xxx`, `CA5xxx`. Site suppression is `#pragma warning disable CAnnnn // <reason, RFC or protocol>` on the smallest scope. Rationale: the exemplar suppressions (Polly, xunit) are file-level with a reason; a blanket line hides the next agent's `MD5`. Verify: `rg -n --glob '*.{globalconfig,editorconfig}' -e 'CA(2[3-9][0-9]{2}|3[0-9]{3}|5[0-9]{3})\.severity\s*=\s*(none|silent|suggestion)' .` returns nothing; `rg -n --glob '*.{csproj,props,targets}' -e 'NoWarn.*CA(2[3-9][0-9]{2}|3[0-9]{3}|5[0-9]{3})' .` returns nothing; `rg -n --glob '*.cs' -e 'pragma warning disable CA(2[3-9][0-9]{2}|3[0-9]{3}|5[0-9]{3})\s*$' src/` returns nothing (bare disables, no reason).

N3. **Ship `BannedSymbols.security.txt` and make `RS0030` an error.** Use the 43-line fragment in section 9 verbatim; `.globalconfig` carries `dotnet_diagnostic.RS0030.severity = error`. Rationale: nine hazard classes are silent at `10.0-all`. Verify: `test -s BannedSymbols.security.txt && rg -c -e '^[TMPF]:' BannedSymbols.security.txt` prints >= 30; `rg -n -e 'RS0030' --glob '.globalconfig' .` shows `error`; a probe file with `new Regex("x")` fails the build with `RS0030`.

N4. **Do not use BinaryFormatter, its siblings, or the compatibility switch.** No `SYSLIB0011` suppression, no `EnableUnsafeBinaryFormatterSerialization`, no `[Serializable]` for cloning. Rationale: error since net7, `NotSupportedException` on net8, `PlatformNotSupportedException` on net9+, "can't be made secure". Verify: `rg -n -e 'SYSLIB0011' -e 'EnableUnsafeBinaryFormatterSerialization' -e 'BinaryFormatter' -e 'NetDataContractSerializer' -e 'SoapFormatter' --glob '*.{cs,csproj,props,targets}' .` returns nothing.

N5. **Deserialize wire data only through source-generated STJ; polymorphism is an attribute allow-list.** `[JsonDerivedType]` per leaf; unknown tags throw. Never `Type.GetType`, `Activator.CreateInstance(string,string)`, `Assembly.Load*` on a wire string. Rationale: measured gadget `True` for a converter that trusts `$type`; allow-list threw. Verify: `rg -n -e 'Type\.GetType\(' -e 'Activator\.CreateInstance\(' -e 'Assembly\.Load(From|File)?\(' --glob '*.cs' src/` returns nothing (RS0030 also enforces).

N6. **No Newtonsoft `TypeNameHandling` other than `None`, and no `DataSet`/`DataTable` XML loading.** Rationale: `CA2326/2327` and `CA2350/2351` all-only; gadget `True` for `.All` and `.Auto`. Verify: `dotnet build` at `10.0-all` is the check (CA2326 error); `rg -n -e 'TypeNameHandling\.(All|Auto|Objects|Arrays)' -e '\.ReadXml\(' --glob '*.cs' .` returns nothing.

N7. **XML only through `XmlReader.Create` with `DtdProcessing.Prohibit` and a null resolver; never construct a resolver.** Rationale: XXE read `TOPSECRET` only with `XmlUrlResolver`; `CA3075/77` are inert on net8+. Verify: `rg -n -e 'XmlUrlResolver' -e 'XmlSecureResolver' -e 'DtdProcessing\.Parse' -e 'EnableScript' -e 'EnableDocumentFunction' --glob '*.cs' .` returns nothing; `CA5369/5371/5372/5366` stay at warning.

N8. **Hash with SHA-256 or stronger; no MD5, SHA-1, DES, 3DES, RC2, DSA, ECB, hard-coded key or IV.** Protocol-mandated use gets a same-line pragma naming the protocol. Rationale: `CA5350/5351/5384/5358/5390/5401` fire at `10.0-all`; Polly runs 5350/5351 at `error`. Verify: add `dotnet_diagnostic.CA5350.severity = error` and `dotnet_diagnostic.CA5351.severity = error` to `.globalconfig`; `rg -n -e 'MD5\.' -e 'SHA1\.' -e 'CipherMode\.ECB' -e 'TripleDES' --glob '*.cs' src/` lists only lines inside a `#pragma warning disable CA535x // <reason>` ... `restore` pair (reading check).

N9. **Secrets and tokens come from `RandomNumberGenerator`.** `RandomNumberGenerator.GetBytes/GetInt32/GetHexString/GetString` (net8+); never `Random`, `Random.Shared`, `Guid.NewGuid()`, `Environment.TickCount`. `CA5394` stays at All; a non-secret use (jitter, test shuffling) carries `#pragma warning disable CA5394 // not security-relevant: <why>`. Verify: `dotnet build` (CA5394 under TWAE); `rg -n -e 'Guid\.NewGuid\(\)' --glob '*.cs' src/` hits are reviewed: each must not feed a token, nonce, key, or temp-file name that an attacker can predict (temp names use `RandomNumberGenerator`).

N10. **KDFs use the one-shot `Rfc2898DeriveBytes.Pbkdf2` with iterations >= 600,000 for SHA-256 (220,000 for SHA-512), never SHA-1, never the constructors.** `RSA` keys >= 2048 bits, `RSA.Create(2048)` minimum. Rationale: constructors are `SYSLIB0060` on net10 and the static form is silent at 1,000 iterations. Verify: `rg -n -e 'new Rfc2898DeriveBytes\(' -e 'RSA\.Create\((512|768|1024)\)' --glob '*.cs' src/` returns nothing; `rg -n 'Pbkdf2\(' --glob '*.cs' src/` lists every call and each 3rd argument must be a named constant >= 600_000 for SHA-256 (reading heuristic; the static form is silent in the analyzers).

N11. **Compare digests, MACs and tokens with `CryptographicOperations.FixedTimeEquals` on bytes.** Parse hex with `Convert.FromHexString`; never `==`/`string.Equals`/`SequenceEqual` on them. Rationale: no judgment about "is this value secret" is needed; public-digest compares are not a vulnerability, so this is defence in depth (state it so in code comments, do not claim a CVE). Verify: `rg -n -e 'SequenceEqual\(' -e 'Digest.*==' -e 'Equals\(.*[Dd]igest' --glob '*.cs' src/` hits are reviewed; `rg -c 'FixedTimeEquals' src/` is >= 1 in the digest-verification file.

N12. **Every `Regex` carries a match timeout of at most 1 s.** `new Regex(p, opts, TimeSpan)`, static 4-argument overloads, `[GeneratedRegex(p, opts, ms)]`; never `Timeout.InfiniteTimeSpan`/`Regex.InfiniteMatchTimeout`. Rationale: no CA rule; 2-3.8 s for 25 characters, doubling per character. Verify: `RS0030` from the Regex lines in N3; `rg -n -e 'InfiniteMatchTimeout' -e 'InfiniteTimeSpan' --glob '*.cs' src/` returns nothing for Regex calls.

N13. **Regex patterns are `const` or `static readonly` literals, or `Regex.Escape(userText)` output; user text is never a pattern.** Timeout and `NonBacktracking` do not make an untrusted pattern safe. Verify (named reading heuristic): every first argument of `new Regex(`/`Regex.IsMatch(` is a string literal, a `const`/`static readonly` member, or a `Regex.Escape(...)` call; `rg -n --pcre2 -e 'new Regex\((?!")' --glob '*.cs' src/` lists non-literal patterns for review.

N14. **Libraries never set `REGEX_DEFAULT_MATCH_TIMEOUT`.** It is an app-host `AppDomain.SetData(..., TimeSpan)` before first Regex use; never in `runtimeconfig.json` as a string (it crashes `Regex`). Verify: `rg -n -e 'REGEX_DEFAULT_MATCH_TIMEOUT' --glob '*.{cs,csproj,props,json}' .` returns nothing under `src/`.

N15. **No `SecureString`.** Secrets are `ReadOnlySpan<byte>`/`byte[]` UTF-8 written to child stdin and then zeroed (`CryptographicOperations.ZeroMemory`), never a field, log, exception or `ToString`. Rationale: unencrypted off Windows, DE0001. Verify: `rg -n -e 'SecureString' --glob '*.cs' src/` returns nothing (RS0030 enforces).

N16. **No custom TLS validation.** No `ServerCertificateCustomValidationCallback`, `DangerousAcceptAnyServerCertificateValidator`, `RemoteCertificateValidationCallback`, `ServicePointManager.*`, no `CheckCertificateRevocationList = false`, no `SslProtocols.Tls/Tls11`. Rationale: lambda form is silent at `10.0-all`. Verify: RS0030 plus `CA5359/5397/5399/5400`; `rg -n -e 'CertificateCustomValidation' -e 'DangerousAccept' -e 'ServicePointManager' --glob '*.cs' src/` returns nothing.

N17. **Archive entry names are never path components.** Extraction targets a fixed, SDK-chosen path (CS-BIN-extraction); if an entry name must be used, `Path.GetFullPath` + separator-terminated prefix + `StringComparison.Ordinal`. Verify: `CA5389` (all) under TWAE; `rg -n -e 'Path\.(Combine|Join)\([^)]*\.(FullName|Name)\)' --glob '*.cs' src/` returns nothing.

N18. **Do not add `System.Data`, P/Invoke, XSLT, `DataSet`, or user-secrets/Configuration packages to the SDK.** If ever required: `CA2100`/`CA5392` stay at warning and the change needs its own review note. Verify: `rg -n -e 'DllImport' -e 'LibraryImport' -e 'Microsoft\.Extensions\.Configuration' -e 'System\.Data' --glob '*.{cs,csproj,props}' src/` returns nothing.

N19. **Pin the era-specific features.** C# 15 `closed` hierarchies and `InferClosedTypePolymorphism` appear only under `#if NET11_0_OR_GREATER` (RC1, GA Nov 2026) and never replace explicit `[JsonDerivedType]` on net8/net10 targets. Verify: `rg -n -e 'InferClosedTypePolymorphism' -e '\bclosed class\b' --glob '*.cs' src/` hits are inside `#if NET11_0_OR_GREATER`.

N20. **A clean build is not XXE or ReDoS assurance.** The security gate's contract is "bans + analyzers + greps N2-N18"; a reviewer states which of the three covered each hazard. Verify: reading heuristic; the PR text lists RS0030 count, CA IDs fired, and grep results.

## AI-agent angle

| What the LLM does | Why it compiles | Mechanical catch |
|---|---|---|
| Adds `BinaryFormatter` for deep clone/caching, then `#pragma warning disable SYSLIB0011` and `<EnableUnsafeBinaryFormatterSerialization>` | Works on net8 with the switch; net7-era advice | N4 grep; on net10 the runtime throws `PlatformNotSupportedException` |
| `XmlResolver = new XmlUrlResolver()` / `DtdProcessing.Parse` "to support DTDs", or copies `ProhibitDtd` / `XmlSecureResolver` (Framework 3.5/CAS era) | Compiles; `CA3075/77` never warn on net8+ | `RS0030` on `XmlUrlResolver`/`DtdProcessing.Parse`; N7 grep |
| Believes a clean build proves XXE safety because "CA3075 is on" | The analyzer is registered but inert unless `mscorlib` | N20; fixture result `Xml2.cs` silent |
| `new Regex(pattern)` or `Regex.IsMatch(s, p)` with no timeout; adds `RegexOptions.Compiled` believing it prevents ReDoS | No CA rule; `Compiled` only speeds matching | `RS0030` from N3 |
| Sets `REGEX_DEFAULT_MATCH_TIMEOUT` in `runtimeconfig.json` (`RuntimeHostConfigurationOption`) or `SetData` late | Looks like documented config; crashes `Regex` (string) or is ignored (late) | N14 grep; the `rxdefault` result |
| Passes user text straight to `new Regex(userInput, opts, timeout)` | Timeout satisfies the ban and MA0009 | N13 heuristic (docs: timeouts are not a boundary) |
| `new Random().Next()` / `Random.Shared` / `Guid.NewGuid()` for tokens, nonces, temp names | Compiles; `CA5394` all-only, GUID silent | CA5394 under TWAE; N9 grep on `Guid.NewGuid` |
| MD5/SHA1 "for integrity", `ToLowerInvariant()` on hex, `==` on digest strings | `CA5351/5350` fire at all; `==` silent | N8, N11, `CA1308` |
| `Rfc2898DeriveBytes` constructor with 1000/10000 iterations (old Stack Overflow) or static `Pbkdf2` with 1000 | Ctor is `SYSLIB0060` (warning), static form silent | N10 grep |
| `SecureString` for a token "for safety" | Silent at all | `RS0030` N15 |
| `ServerCertificateCustomValidationCallback = (_,_,_,_) => true` to make a test/proxy pass; `ServicePointManager` | Silent at all except `ServicePointManager` | N16 grep, `RS0030` |
| `TypeNameHandling.Auto` "for polymorphism"; or a custom STJ converter with `Type.GetType($type)` | Compiles; gadget `True` measured | CA2326; N5 grep |
| `ZipFile.ExtractToDirectory`-style loop with `Path.Combine(dest, entry.FullName)` | Compiles | `CA5389`; N17 grep |
| Adds `dotnet user-secrets`/`IConfiguration` to a library | Compiles | N18 grep |
| Blanket `[SuppressMessage("Security", "CA5394")]` / project `NoWarn` to green the build | Compiles | N2 greps; TWAE ordering from CS-BUILD |
| Hallucinates `RandomNumberGenerator.NextString`, `Regex.SetDefaultTimeout`, `XmlReaderSettings.ProhibitDtd = true` on core | The first two do not compile (real: `GetString`/`GetHexString`; AppDomain slot); `ProhibitDtd` compiles with `CS0618` (obsolete alias of `DtdProcessing`) | build error / `CS0618` under TWAE |

## Contested / evolving

- **BinaryFormatter on net8.** Docs say runtime throws since net8; the 2026 third-party item claiming a net8 servicing patch for BinaryFormatter could not be fetched and no Microsoft source was found; ignored. Trend: gone from the platform (net9 removal, 2025-12-03 doc revision); only netstandard2.0 consumers can still compile it.
- **The SDK's own docs lag the runtime.** `XmlReaderSettings.MaxCharactersFromEntities` "default is 0" (docs, 2026-07-01 revision) vs `1e7` (source); `CA3075` examples still show Framework-only violations. Trust measurements.
- **CA3075/77 family.** Still gated to .NET Framework (source at `dotnet/sdk@186ac691d449`); no sign of a net8+ port. Direction: modern XML defaults make the rules moot, the ban closes the residual.
- **Regex timeouts as a security control.** The Regex docs now say timeouts and `NonBacktracking` guard accidents in developer-authored patterns, not hostile patterns (page updated 2026-07-08). Direction: patterns become "trusted data", reviewer rule N13; no analyzer expected.
- **FixedTimeEquals for public digests.** Practice splits: 0/35 exemplars use it; security guidance says "use for secrets". Resolution here: adopt uniformly, label as defence-in-depth. If CS-BIN prefers `string.Equals(..., OrdinalIgnoreCase)` for a published digest, nothing breaks.
- **CA5394 for non-security randomness.** Polly and xunit pragma it at file scope; some teams set it to `suggestion`. This research keeps `warning` (error under TWAE) with a same-line reason; the SDK needs no `Random` at all (CS-PROC retries only on exit 75, no jitter).
- **SecureString.** Microsoft: do not use for new code; no replacement type, "opaque handle to credentials stored outside the process". Expected to stay unchanged.
- **.NET 11 / C# 15 (RC1, GA Nov 2026).** Security rule category byte-identical to SDK 10 (diffed), same 67 fixture rows on `net11.0`. New: STJ closed-hierarchy polymorphism inference and open-generic `[JsonDerivedType]` (net11-only; `SYSLIB1229` on invalid specialisation). SDK 11 adds general rules (`CA1517`, `CA2026-2028`, ...) that stay off at `10.0-all`; none are security rules.
- **Tooling home.** NetAnalyzers now live in `dotnet/sdk` (`roslyn-analyzers` archived); rule-source citations should use that repo.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/binaryformatter-security-guide | BinaryFormatter and sibling formatters security guide | updated 2024-11; net5+ | "can't be made secure"; lists dangerous alternatives |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/9.0/binaryformatter-removal | .NET 9 breaking change: in-box BinaryFormatter always throws | 2024-08 (rev 2025-12) | final removal stage, NuGet escape |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/8.0/binaryformatter-disabled | .NET 8 breaking change: runtime throws `NotSupportedException` | 2023-05 | net8 behaviour and switch |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/7.0/binaryformatter-apis-produce-errors | .NET 7 breaking change: SYSLIB0011 becomes an error | 2022-08 (rev 2026-03) | corrects "SYSLIB0011 warning on net8" |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2326 | CA2326 TypeNameHandling rule page | 2019 (rev 2026-04) | fixes, binder, "Enabled by default: No" |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca3075 | CA3075 insecure DTD rule page | 2019 (rev 2026-04) | examples that do not fire on net8+ |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca5389 | CA5389 zip-slip rule | 2019 (rev 2026-04) | validated extraction pattern |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca5394 | CA5394 insecure randomness | 2020 (rev 2026-04) | RNG fix, suppression guidance |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/security-warnings | Security rules overview | 2019 (rev 2025-07) | category entry point |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib0060 | SYSLIB0060: Rfc2898DeriveBytes constructors obsolete | .NET 10 | one-shot Pbkdf2 migration |
| https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-regex | Regex best practices | rev 2026-07-08 | timeout guidance and "trusted patterns" |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism | STJ polymorphism | rev 2026-09-29 | allow-list semantics; .NET 11 closed inference |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-security-securestring | SecureString remarks | rev 2026-09 | "don't use for new development"; non-Windows |
| https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.fixedtimeequals | FixedTimeEquals API | rev 2026-07 | length short-circuit contract |
| https://learn.microsoft.com/en-us/dotnet/api/system.xml.xmlreadersettings.xmlresolver | XmlReaderSettings.XmlResolver | rev 2026-07 | resolver default, ThrowingResolver |
| https://learn.microsoft.com/en-us/dotnet/api/system.xml.xmlreadersettings.maxcharactersfromentities | MaxCharactersFromEntities | rev 2026-07 | documented default (stale vs source) |
| https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets | Secret Manager and env-var guidance | rev 2026-10-08 | dev-only, unencrypted |
| https://github.com/dotnet/sdk (src/Microsoft.CodeAnalysis.NetAnalyzers/.../DoNotUseInsecureDtdProcessing.cs, Helpers/SecurityDiagnosticHelpers.cs @186ac691d449) | analyzer source | 2026-10 | proves the mscorlib gate |
| https://github.com/dotnet/runtime/blob/8630d8988107/src/libraries/System.Text.RegularExpressions/src/System/Text/RegularExpressions/Regex.Timeout.cs | Regex default timeout init | 2026-10 | `InvalidCastException` for non-TimeSpan |
| https://github.com/dotnet/runtime/blob/8630d8988107/src/libraries/System.Private.Xml/src/System/Xml/Core/XmlReaderSettings.cs | XmlReaderSettings defaults | 2026-10 | `1e7`, `Prohibit` defaults |
| https://github.com/dotnet/runtime/blob/8630d8988107/src/libraries/System.Private.CoreLib/src/System/Guid.cs | Guid.NewGuid implementation comment | 2026-10 | CSPRNG source per OS |
| https://github.com/dotnet/platform-compat/blob/master/docs/DE0001.md | DE0001 SecureString guidance | 2019-20 | rationale for the ban |
| https://github.com/dotnet/roslyn/blob/7ac1c032ef13/src/RoslynAnalyzers/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md | BannedApiAnalyzers usage | 2026-10 | doc-ID format, `//` comments, generated-code switch |
| https://github.com/dotnet/roslyn-analyzers/blob/archive/README.md | repository consolidation notice | 2023+ | where NetAnalyzers moved |
| https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html | OWASP password storage | current | PBKDF2 iteration floors |
| https://github.com/meziantou/Meziantou.Analyzer/blob/main/docs/Rules/MA0009.md | MA0009 regex timeout rule | 2026 | third-party alternative to the ban |
| https://github.com/MessagePack-CSharp/MessagePack-CSharp/blob/242bdad51f89/README.md | MessagePack security section | 2026 | "UntrustedData merely hardens" |
| exemplar `App-vNext__Polly@e4476096da5b:eng/analyzers/Library.globalconfig:1400-1898` | full security severity table | 2026 | closest shipped gate |
| exemplar `meziantou__Meziantou.Analyzer@161b7e948ad3:src/Meziantou.Analyzer/Rules/DoNotUseServerCertificateValidationCallbackAnalyzer.cs:11` | MA0039 Error-severity cert rule | 2026 | TLS-hook rule design |
| exemplar `MessagePack-CSharp__MessagePack-CSharp@242bdad51f89:src/MessagePack/MessagePackSecurity.cs:22-43` | Trusted/Untrusted presets | 2026 | hostile-input preset shape |
| exemplar `npgsql__npgsql@9c47244547c2:src/Npgsql/Internal/NpgsqlConnector.cs:1838-1848` | named TLS validators | 2026 | opt-in validation modes |
| SDK-shipped `analysislevelsecurity_10_*.globalconfig` (local: `dotnet/sdk/10.0.401/Sdks/Microsoft.NET.Sdk/analyzers/build/config/`) | rule counts per mode | SDK 10.0.401 / 11.0 RC1 | basis of the enabled-set table |
