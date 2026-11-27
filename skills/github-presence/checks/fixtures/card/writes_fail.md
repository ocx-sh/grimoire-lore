# Set the description

```sh
gh repo edit example/mytool --description "A tool"
```

## Topics

<!-- APPROVAL-GATE -->

```sh
gh api -X PUT repos/example/mytool/topics -f names[]=cli
```

## Homepage

```sh
gh api --method PATCH repos/example/mytool -f homepage=https://example.com
gh api repos/example/mytool/topics -f names[]=cli
```
