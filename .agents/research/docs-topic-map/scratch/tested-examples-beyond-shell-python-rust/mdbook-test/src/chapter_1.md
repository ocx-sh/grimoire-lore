# Fence tier test

Plain known language:

```python
print("known python")
```

Suffixed/tiered language (not a real highlighter alias):

```python-no-run
print("this should not run")
```

Another suffix style:

```shell-tier2
echo "tiered shell"
```

Twoslash-style space-attribute (Deno / Twoslash convention):

```ts twoslash
const x: number = 1
```

Totally unknown/bogus tag:

```boguslang
some nonsense content here
```

No language at all:

```
untagged fence
```
