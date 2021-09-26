(async () => {
    const myBestDatabase = require("./myBestDatabase");
    const app = require("express")();
    const Passport = await import("better-passport");
    const passport = new Passport.Local({
        config: true,
        configFile: "./tokens.sqlite",
        configType: "sql"
    })
        .setUserCallback(id => myBestDatabase.getUserById(id));

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
})();