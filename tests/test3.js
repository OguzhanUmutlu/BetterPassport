const sqlite = require("better-sqlite3")("./data.sqlite");
console.log(sqlite.prepare("CREATE TABLE IF NOT EXISTS s (id TEXT)").run())
console.log(sqlite.prepare("INSERT INTO s (id) VALUES (?)").run("1234"))
console.log(sqlite.prepare("SELECT * FROM s").all())