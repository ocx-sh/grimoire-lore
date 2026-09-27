# M-E-11: translator from ocx metadata.json's `env` array (path / constant /
# list) to makeWrapper flags, and from `entrypoints` to makeWrapper
# --add-flags launchers. Consumed by mk-package.nix's installPhase.
#
# ocx type -> makeWrapper flag (metadata.md #Environment Variables):
#   path      (prepend, platform path-delimiter joined) -> --prefix KEY ":" VALUE
#   constant  (replace)                                 -> --set KEY VALUE
#   list      (append, author-chosen separator)          -> --suffix KEY SEP VALUE
#
# Token grammar (metadata.md #Interpolation Tokens), decided per form after
# a live 122-package census of every real config blob's env AND entrypoints
# 2026-09-27 (verification-rerun-w3/meta-census/token-census-result.json):
#   ${installPath} / ${self.installPath}            121/122 uses -> TRANSLATE (bash var $installPath)
#   ${installPath:native} / ${...:posix}              0/122 uses -> INLINE (Nix targets are POSIX-only;
#                                                                    both render "/", so a modifier is a no-op:
#                                                                    strip it and translate as the bare form)
#   ${self.env.KEY}                                   0/122 uses -> TRANSLATE ($KEY; only correct because this
#                                                                    translator emits makeWrapper flags in the
#                                                                    SAME order as ocx's `env` array, matching
#                                                                    ocx's own strictly-earlier-declaration rule,
#                                                                    so the wrapper script's sequential bash
#                                                                    exports have already set $KEY by the time a
#                                                                    later entry's value reads it)
#   ${deps.NAME.installPath}                          0/122 uses -> REFUSE (throw). 0/122 packages declare a
#                                                                    dependency today; translating this token
#                                                                    means threading a dependency's own Nix
#                                                                    derivation through the reader, which has no
#                                                                    real data to verify against. Building that
#                                                                    plumbing now is unverifiable speculation,
#                                                                    not a rule (ponytail: YAGNI until the index
#                                                                    carries an example).
#   $${ (doubled-dollar escape)                        0/122 uses -> TRANSLATE (literal ${; mechanical, already
#                                                                    required by NIX-GEN-20, kept regardless of
#                                                                    the 0-use finding)
#   any other ${...}                                            -> REFUSE (throw), matching ocx's own closed
#                                                                    namespace: a refusal here means this reader
#                                                                    has fallen out of sync with ocx's schema.
#
# Segment escaping (NIX-GEN-20, corrected 2026-09-27): every literal segment
# is rendered with lib.escapeShellArg; only the bare shell-variable reference
# ($installPath / $KEY) is spliced in unquoted. Never pass a whole value
# through lib.escapeShellArgs (single-quotes the variable reference itself,
# defeating the expansion it relies on) and never hand double-quote a whole
# value into the builder (executes `$(...)` in registry data at build time).
{ lib }:
let
  # One literal-segment renderer, parameterised by which bash variable a
  # given ${...} body resolves to. `varToks` maps a literal ocx body
  # (e.g. "installPath", "self.installPath", "self.env.FOO") to the bash
  # variable name to splice ("installPath", "FOO").
  mkRender =
    varToks: v:
    let
      # :native/:posix modifiers are stripped by the caller (mkEnvArgs /
      # mkEntrypointArgs, via builtins.replaceStrings) before the value
      # reaches this renderer: both render identically on every
      # Nix-supported system (linux and darwin are both POSIX), so a
      # modifier is a no-op once removed.
      # Split on the doubled-dollar escape first, so `$${` never collides
      # with a real token below it.
      escSplit = lib.splitString "$\${" v;
      renderChunk =
        c:
        let
          # Try each known token body as a splitter, longest-alias-first so
          # `${self.installPath}` never matches inside a `${self.env.KEY}`
          # attempt. `segsFor` returns null when `tok` does not occur in `c`.
          tryToks = builtins.filter (t: t != null) (
            map (
              tokBody:
              let
                segs = lib.splitString "\${${tokBody}}" c;
              in
              if builtins.length segs > 1 then
                {
                  inherit segs;
                  varName = varToks.${tokBody};
                }
              else
                null
            ) (builtins.attrNames varToks)
          );
        in
        if tryToks == [ ] then
          (
            if lib.hasInfix "\${" c then
              throw "mk-ocx-env: unsupported ocx token in value '${v}'"
            else
              lib.escapeShellArg c
          )
        else
          let
            picked = builtins.head tryToks;
            # Built by concatenation, never by writing `$${...}` in one
            # string literal: Nix's indented AND double-quoted strings both
            # treat a bare `$$` immediately before `{` as an escape for a
            # literal `${` (the same convention ocx itself uses), so a
            # literal `$` that must be followed by real interpolation has to
            # come from a separate string, joined with `+`.
            splice = "\"$" + picked.varName + "\"";
          in
          lib.concatMapStringsSep splice lib.escapeShellArg picked.segs;
    in
    lib.concatMapStringsSep (lib.escapeShellArg "\${") renderChunk escSplit;

  # `varToks`: every ${...} body this reader recognises, mapped to the bash
  # variable it splices. Applied with :native/:posix already stripped by the
  # caller (env values only strip on the *whole* value string, since a
  # modifier can only trail a full token, never occur mid-segment).
  installPathToks = {
    "installPath" = "installPath";
    "self.installPath" = "installPath";
  };
in
{
  # entries: the ocx `env` array, in declaration order (order matters: it
  # is what makes ${self.env.KEY} resolvable — see the file header).
  # Returns a single shell-ready argument string per entry, pre-escaped;
  # concatenate the results with " " and splice directly into makeWrapper's
  # argument list. Never wrap the result in another quoting layer.
  mkEnvArgs =
    entries:
    let
      declaredKeys = map (e: e.key) entries;
      render =
        idx: v:
        let
          # ${self.env.KEY} is legal only for a KEY declared strictly earlier
          # in this same array (metadata.md #self.env); build its token table
          # from the keys seen so far, so a forward/self reference is refused
          # exactly like ocx's own publish-time check, not silently mistranslated.
          earlierKeys = lib.sublist 0 idx declaredKeys;
          selfEnvToks = lib.listToAttrs (map (k: lib.nameValuePair "self.env.${k}" k) earlierKeys);
          v' =
            builtins.replaceStrings
              [
                "\${installPath:native}"
                "\${installPath:posix}"
                "\${self.installPath:native}"
                "\${self.installPath:posix}"
              ]
              [ "\${installPath}" "\${installPath}" "\${self.installPath}" "\${self.installPath}" ]
              v;
        in
        mkRender (installPathToks // selfEnvToks) v';
      flagWord =
        e:
        if e.type == "path" then
          [
            "--prefix"
            e.key
            ":"
          ]
        else if e.type == "constant" then
          [
            "--set"
            e.key
          ]
        else if e.type == "list" then
          [
            "--suffix"
            e.key
            e.separator
          ]
        else
          throw "mk-ocx-env: unknown env type '${e.type}' for key '${e.key}'";
    in
    lib.concatStringsSep " " (
      lib.imap0 (
        idx: e: lib.concatStringsSep " " (map lib.escapeShellArg (flagWord e) ++ [ (render idx e.value) ])
      ) entries
    );

  # entrypoint `args`: same installPath-only grammar (self.env / deps are
  # rejected by ocx itself at publish time inside `args` — metadata.md
  # #entry-points-args), so no self.env token table is threaded here.
  mkEntrypointArgs =
    args:
    lib.concatStringsSep " " (
      map (
        a:
        let
          a' =
            builtins.replaceStrings
              [
                "\${installPath:native}"
                "\${installPath:posix}"
                "\${self.installPath:native}"
                "\${self.installPath:posix}"
              ]
              [ "\${installPath}" "\${installPath}" "\${self.installPath}" "\${self.installPath}" ]
              a;
        in
        mkRender installPathToks a'
      ) args
    );
}
