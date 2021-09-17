# BetterPassport
Easy and simple passport file for express.js

## Example

```js
const app = require("express")();

const passport = require("./Passport");
const {Session, createSession, removeSession} = passport;
app.use(passport.callback);

const accounts = [];

function getAccount(username, password) {
    return accounts.filter(i=> i.username === username && i.password === password)[0];
}

app.get("/welcome", (req, res) => {
    if(!req.user) return res.redirect("/login");
    res.send("Welcome " + req.user.username);
});

app.get("/login", (req, res) => {
    if(req.user) return res.redirect("/welcome");
    passport.createSession(req, res, new Session(user), "/welcome");
});

app.listen(3000);
```
