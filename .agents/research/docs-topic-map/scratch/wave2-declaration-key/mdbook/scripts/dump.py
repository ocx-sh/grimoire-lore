import json,sys
if len(sys.argv)>2 and sys.argv[1]=="supports": sys.exit(0)
ctx, book = json.load(sys.stdin)
sys.stderr.write("KEYS: %r\n" % (list(book.keys()),))
sys.stderr.write("SAMPLE: %s\n" % json.dumps(book)[:600])
json.dump(book, sys.stdout)
