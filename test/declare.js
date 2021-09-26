const Passport = require("../Passport");
const DiscordPassport = Passport.Discord;
const dcp = new DiscordPassport({
    config: true,
    configFile: "",
    clientId: "",
    clientSecret: "",
    callbackURL: "",
    scopes: []
});
dcp.getTokensByUserId(1);
dcp.createLoginCallback({
    success: r => r,
    error: r => r,
    redirectURL: ""
})