# Set the description

<!-- APPROVAL-GATE: print before and after, wait for the owner -->

```sh
gh repo edit example/mytool --description "A tool"
gh api -X PUT repos/example/mytool/topics -f names[]=cli
```

## Read only

```sh
gh api repos/example/mytool/topics
```
