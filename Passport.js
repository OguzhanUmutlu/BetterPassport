const fetch = require("node-fetch");
const fs = require("fs");
const cookie = require("cookie");
const randoms = "abcdefghijklmnoprstuvyzqwx!'^+%&/()=?_1234567890".split("");
const generateToken = () => " ".repeat(50).toString().split("").map(() => randoms[Math.floor(Math.random() * randoms.length)]).join("");

class Passport {
    /**
     * @param {
     *  {
     *   config: boolean,
     *   configFile: string
     *  }
     * } options
     */
    constructor(options = {
        config: true,
        configFile: "./data.json"
    }) {
        this._config = options.config;
        this._configFile = options.configFile;
        if (this._config) {
            if (!fs.existsSync(this._configFile)) fs.writeFileSync(this._configFile, "{}");
            this._json = JSON.parse(fs.readFileSync(this._configFile).toString());
        }
    }

    getTokens() {
        return this._json;
    }

    /**
     * @internal - This is an internal function.
     */
    save() {
        if (!this._config) return this;
        fs.writeFileSync(this._configFile, JSON.stringify(this.getTokens()));
    }

    /**
     * @param {string} token
     * @returns {
     *  {
     *   token: string,
     *   userId: number
     *  } | null
     * }
     *
     * @internal - This is an internal function.
     */
    getToken(token) {
        return this.getTokens()[token];
    }

    /**
     * @param {string} token
     * @param {
     *  {
     *   token: string,
     *   userId: number
     *  }
     * } value
     *
     * @internal - This is an internal function.
     */
    setToken(token, value) {
        this._json[token] = value;
        this.save();
        return this;
    }

    /**
     * @param {string} token
     *
     * @internal - This is an internal function.
     */
    removeToken(token) {
        delete this._json[token];
        this.save();
        return this;
    }

    /**
     * @param req
     * @param res
     * @param {number} userId - User id that will be used for user's session. (Not unique for each sessions)
     * @param {string} redirect - URL that user will be redirected after logging action.
     *
     * @description They can create sessions by using this simple
     * function!
     *
     * @example
     * const app = require("express")();
     * const PORT = process.env.port || 3000;
     * const Passport = require("./Passport");
     * const passport = new Passport();
     * app.use(passport.callback());
     *
     * const mySomeDatabase = require("./MySomeDatabase");
     *
     * app.get("/login", (req, res) => {
     *     if(req.user.authenticated) return res.send("You are already logged in!");
     *     const username = req.query.username;
     *     const password = req.query.password;
     *     const userId = mySomeDatabase.getUserByLoginInfo(username, password).id;
     *     passport.createSession(req, res, userId);
     * });
     *
     * // your code goes there
     *
     * app.listen(PORT);
     */
    createSession(req, res, userId, redirect = "/") {
        let token;
        while (!token || this.getToken(token)) {
            token = generateToken();
        }
        this.setToken(token, {token, userId});
        res.setHeader('Set-Cookie', cookie.serialize("cli.id", token, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7
        }));
        res.statusCode = 302;
        res.setHeader('Location', redirect);
        res.end();
        return this;
    }

    /**
     * @returns {boolean} - Returns if user had a valid session.
     *
     * @description They can get tokens that their user id
     * is same with your parameter.
     *
     * @example
     * const app = require("express")();
     * const PORT = process.env.port || 3000;
     * const Passport = require("./Passport");
     * const passport = new Passport();
     * app.use(passport.callback());
     *
     * app.get("/logout", (req, res) => {
     *     if(passport.removeSession(req)) return res.send("Successfully logged out!");
     *     res.send("You are not logged in!");
     * });
     *
     * // your code goes there
     *
     * app.listen(PORT);
     * */
    removeSession(req) {
        if (!req.user.token) return false;
        const res = this.getToken(req.user.token);
        if (this._logoutCallback) this._logoutCallback(req);
        this.removeToken(req.user.token);
        delete req.user;
        return res !== null;
    }

    /**
     * @param {number} userId - User id that will be used in search
     *
     * @returns {number[]}
     *
     * @description They can get tokens that their user id
     * is same with your parameter.
     * */
    getTokensByUserId(userId) {
        return Object.values(this.getTokens()).filter(token => token.userId === userId).map(i => i.token);
    }

    /**
     * @param {function} callback
     *
     * @returns {this}
     *
     * @description Passport runs it with parameter `userId`
     * which is a number that they set it while making user
     * logged in. The returned value will be replaced with
     * `req.user.data`.
     *
     * @example
     * const Passport = require("./Passport");
     * const passport = new Passport();
     * passport.setUserCallback((id) => myDatabase.getUserById(id))
     * */
    setUserCallback(callback) {
        this._userCallback = callback;
        return this;
    }

    /**
     * @param {function} callback
     *
     * @description Passport runs it with parameter `Request`
     * which they can set and change things everytime when
     * a user logins.
     *
     * @example
     * const Passport = require("./Passport");
     * const passport = new Passport();
     * passport.setLoginCallback((req) => console.log("User #" + req.user.id + " logged in!"))
     * */
    setLoginCallback(callback) {
        this._loginCallback = callback;
        return this;
    }

    /**
     * @param {function} callback
     *
     * @description Passport runs it with parameter `Request`
     * which they can set and change things everytime when
     * a user logs out.
     *
     * @example
     * const Passport = require("./Passport");
     * const passport = new Passport();
     * passport.setLogoutCallback((req) => console.log("User #" + req.user.id + " logged out!"))
     * */
    setLogoutCallback(callback) {
        this._logoutCallback = callback;
        return this;
    }

    /**
     * @description They should say express's app to use this
     * function to let this module work.
     *
     * @example
     * const app = require("express")();
     * const PORT = process.env.port || 3000;
     * const Passport = require("./Passport");
     * const passport = new Passport();
     * app.use(passport.callback());
     *
     * // your code goes there
     *
     * app.listen(PORT);
     */
    callback = (req, res, next) => {
        req.user = {};
        req.user.isAuthenticated = () => req.authenticated;
        const token = cookie.parse(req.headers.cookie || '')["cli.id"];
        const data = this.getToken(token);
        if (!data) return next();
        req.user.token = token;
        req.user.id = data["id"];
        req.user.authenticated = true;
        if (this._userCallback) req.user.data = this._userCallback(req.user.id);
        if (this._loginCallback) this._loginCallback(req);
        return next();
    }
    /**
     * @description Generates new passport token
     * @type {function(): string}
     */
    generateToken = generateToken;
}

class DiscordPassport extends Passport {

    /**
     * @param {{clientId: string, configFile: string, clientSecret: string, callbackURL: string, scopes: string[], config: boolean}} options
     */
    constructor(options) {
        super(options);
        if (!options.clientId || !options.clientSecret || !options.callbackURL || !options.scopes) throw new Error("You should provide clientId, clientSecret, callbackURL and scopes in options!");
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.callbackURL = options.callbackURL;
        this.scopes = options.scopes;
    }

    // noinspection JSCheckFunctionSignatures
    /**
     * @param {string} token
     * @param {
     *  {
     *   token: string,
     *   data: Object
     *  }
     * } value
     *
     * @internal - This is an internal function.
     */
    setToken(token, value) {
        this._json[token] = value;
        this.save();
        return this;
    }

    // noinspection JSCheckFunctionSignatures
    /**
     * @param req
     * @param res
     * @param {Object} data
     * @param {string} redirectURL
     * @internal
     */
    createSession(req, res, data, redirectURL = "/") {
        let token;
        while (!token || this.getToken(token)) {
            token = this.generateToken();
        }
        this.setToken(token, {token, data});
        res.setHeader('Set-Cookie', cookie.serialize("cli.id.discord", token, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7
        }));
        res.statusCode = 302;
        res.setHeader('Location', redirectURL);
        res.end();
        return this;
    }

    /**
     * @returns {boolean} - Returns if user had a valid session.
     *
     * @description They can get tokens that their discord id
     * is same with your parameter.
     *
     * @example
     * const app = require("express")();
     * const PORT = process.env.port || 3000;
     * const Passport = require("./Passport").Discord;
     * const passport = new Passport();
     * app.use(passport.callback());
     *
     * app.get("/logout", (req, res) => {
     *     if(passport.removeSession(req)) return res.send("Successfully logged out!");
     *     res.send("You are not logged in!");
     * });
     *
     * // your code goes there
     *
     * app.listen(PORT);
     * */
    removeSession(req) {
        if (!req.discord.token) return false;
        const res = this.getToken(req.discord.token);
        if (this._logoutCallback) this._logoutCallback(req);
        this.removeToken(req.discord.token);
        delete req.discord;
        return res !== null;
    }

    /**
     * @param {number} discordId - User id that will be used in search
     *
     * @returns {number[]}
     *
     * @description They can get tokens that their user id
     * is same with your parameter.
     * */
    getTokensByUserId(discordId) {
        return Object.values(this.getTokens()).filter(token => token.data.id === discordId).map(i => i.token);
    }

    setUserCallback(callback) {
        throw new Error("Discord passport doesn't have setUserCallback() feature!");
    }

    /**
     * @param {function} callback
     *
     * @description Passport runs it with parameter `Request`
     * which they can set and change things everytime when
     * a user logins.
     *
     * @example
     * const Passport = require("./Passport").Discord;
     * const passport = new Passport();
     * passport.setLoginCallback((req) => console.log("User #" + req.discord.id + " logged in!"))
     * */
    setLoginCallback(callback) {
        this._loginCallback = callback;
        return this;
    }

    /**
     * @param {function} callback
     *
     * @description Passport runs it with parameter `Request`
     * which they can set and change things everytime when
     * a user logs out.
     *
     * @example
     * const Passport = require("./Passport").Discord;
     * const passport = new Passport();
     * passport.setLogoutCallback((req) => console.log("User #" + req.discord.id + " logged out!"))
     * */
    setLogoutCallback(callback) {
        this._logoutCallback = callback;
        return this;
    }

    /**
     * @param {{success?: function(accessData: Object, discordData: Object), error?: function(error: string), redirectURL: string}} options
     * @returns {(function(Request, Response): Promise<*|undefined>)|*}
     */
    createLoginCallback(options = {
        success: r => r,
        error: console.error,
        redirectURL: "/"
    }) {
        return async (req, res) => {
            const token = cookie.parse(req.headers.cookie || '')["cli.id.discord"];
            if(this.getToken(token)) return res.redirect(options.redirectURL);
            const code = req.query.code;
            if (!code) return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURI(this.callbackURL)}&response_type=code&scope=${this.scopes.join("%20")}`);
            try {
                const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
                    method: "POST",
                    body: new URLSearchParams({
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        code,
                        grant_type: "authorization_code",
                        redirect_uri: this.callbackURL,
                        scope: this.scopes.join(" "),
                    }),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                });
                /**
                 * @type {{token_type, access_token}}
                 */
                const oauthData = await oauthResult.json();
                const userData = await (await fetch('https://discord.com/api/users/@me', {
                    headers: {
                        authorization: `${oauthData.token_type} ${oauthData.access_token}`,
                    },
                })).json();
                this.createSession(req, res, userData, options.redirectURL);
                if(options.success) options.success(oauthData, userData);
            } catch (error) {
                if(options.error) options.error(error);
            }
        }
    }

    /**
     * @description They should say express's app to use this
     * function to let this module work.
     *
     * @example
     * const app = require("express")();
     * const PORT = process.env.port || 3000;
     * const Passport = require("./Passport").Discord;
     * const passport = new Passport();
     * app.use(passport.callback());
     *
     * // your code goes there
     *
     * app.listen(PORT);
     */
    callback = (req, res, next) => {
        req.discord = {};
        req.discord.isAuthenticated = () => req.discord.authenticated;
        const token = cookie.parse(req.headers.cookie || '')["cli.id.discord"];
        const data = this.getToken(token);
        if (!data) return next();
        req.discord.token = token;
        req.discord.id = data["discordId"];
        req.discord.authenticated = true;
        if (this._loginCallback) this._loginCallback(req);
        return next();
    }
}
DiscordPassport.SCOPES = [
    "identify", "email", "connections", "guilds", "guilds.join", "gdm.join", "rpc",
    "rpc.notifications.read", "rpc.voice.read", "rpc.voice.write", "rpc.activities.write",
    "bot", "webhook.incoming", "messages.read", "applications.builds.upload", "applications.builds.read",
    "applications.commands", "applications.store.update", "applications.entitlements",
    "activities.read", "activities.write", "relationships.read"
];

module.exports = Passport;
module.exports.Discord = DiscordPassport;
module.exports.generateToken = generateToken();