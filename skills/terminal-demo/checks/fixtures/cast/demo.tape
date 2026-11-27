Require mytool
Set Shell "bash"
Set Columns 40
Type "mytool init demo"
Enter
Wait /ready/
Type "mytool run --fast"
Enter
Wait /done/
Type "mytool status"
Enter
Wait /ok/
