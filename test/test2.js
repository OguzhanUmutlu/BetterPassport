const myBestDatabase = require("./myBestDatabase");
const app = require("express")();
const Passport = require("../Passport");
const passport = new Passport({
    config: true,
    configFile: "./tokens.json"
})
    .setUserCallback(id => myBestDatabase.getUserById(id))
    .setLoginCallback(req => console.log(`User #${req.user.id} logged in!`))
    .setLogoutCallback(req => console.log(`User #${req.user.id} logged out!`));

app.use(passport.callback);

app.get("/login", (req, res) => {
    if(req.user.isAuthenticated()) return res.send("You are already logged in!");
    const username = req.query.username;
    const password = req.query.password;
    const userId = myBestDatabase.getUserByLoginInfo(username, password).id;
    if(userId === null) return res.send("Wrong login information!");
    passport.createSession(req, res, userId);
});

app.get("/logout", (req, res) => {
    if(!req.user.isAuthenticated()) return res.send("You are already logged out!");
    passport.removeSession(req);
    res.send("You are successfully logged out!");
});

app.listen(3000);