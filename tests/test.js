const express = require("express");
const app = express();
const Passport = await import("better-passport");
const passport = new Passport.Discord({
    config: true,
    configFile: "./discord.json",
    clientId: "123456789012345678",
    clientSecret: "tH4TsN0tv4l1d",
    callbackURL: "http://localhost:3000/login",
    scopes: ["identify"]
})
    .setLoginCallback(req => console.log(`User #${req.discord.id} logged in!`))
    .setLogoutCallback(req => console.log(`User #${req.discord.id} logged out!`));

app.use(passport.callback);

app.get("/login", passport.createLoginCallback({
    success: (accessData, discordData) => console.log(accessData, discordData),
    error: error => console.error(error),
    redirectURL: "/"
}));

app.get("/logout", (req, res) => {
    passport.removeSession(req);
});

app.listen(3000);