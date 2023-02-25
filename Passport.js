const randoms = "abcdefghijklmnoprstuvyzqwx!'^+%&/()=?_1234567890".split("");
const generateToken = () => " ".repeat(50).toString().split("").map(() => randoms[Math.floor(Math.random() * randoms.length)]).join("");
const fs = require("fs");
const fetch = require("node-fetch");
const cookie = require("cookie");

class Passport {
    /**
     * @param {
     *  {
     *   config: boolean,
     *   configFile: string,
     *   configType?: string
     *  }
     * } options
     */
    constructor(options = {
        config: true,
        configFile: "./data.json"
    }) {
        this.init(options).then(r => r);
    }

    async init(options) {
        this._config = options.config;
        this._configFile = options.configFile;
        this._configType = options.configType || "json";
        this._httpOnly = options.httpOnly ?? true;
        if (this._config) {
            switch (this._configType) {
                case "json":
                    if (!fs.existsSync(this._configFile)) fs.writeFileSync(this._configFile, "{}");
                    this._json = JSON.parse(fs.readFileSync(this._configFile).toString());
                    break;
                case "sqlite":
                case "sql":
                    this._sqlite = require("better-sqlite3")(this._configFile);
                    this._sqlite.exec(`CREATE TABLE IF NOT EXISTS tokens
                                       (
                                           token TEXT PRIMARY KEY NOT NULL,
                                           data TEXT NOT NULL
                                       )`);
                    break;
            }
        }
        return this;
    }

    getTokens() {
        if (this._sqlite) {
            const res = {};
            this._sqlite.prepare(`SELECT *
                                  FROM tokens`).all().forEach(row => res[row.token] = {
                token: row.token,
                data: JSON.parse(row.data)
            });
            return res;
        }
        return this._json;
    }

    /**
     * @internal - This is an internal function.
     */
    save() {
        if (!this._config || this._sqlite) return this;
        fs.writeFileSync(this._configFile, JSON.stringify(this.getTokens()));
        return this;
    }

    /**
     * @param {string} token
     * @returns {
     *  {
     *   token: string,
     *   data: {
     *       id: number
     *   }
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
     *   id: number
     *  }
     * } value
     *
     * @internal - This is an internal function.
     */
    setToken(token, value) {
        if (this._sqlite) {
            if (this.getToken(token)) this.removeToken(token);
            this._sqlite.prepare(`INSERT INTO tokens (token, data)
                                  VALUES (?, ?)`).run(token, JSON.stringify(value));
            return this;
        }
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
        if (this._sqlite) {
            if (this.getToken(token)) this._sqlite.prepare(`DELETE
                                                            FROM tokens
                                                            WHERE token = ?`).run(token);
            return this;
        }
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
        this.setToken(token, {token, id: userId});
        return this.setTokenCookie(req, res, "cli.id", token, redirect);
    }

    setTokenCookie(req, res, sub, token, redirect = "/") {
        res.setHeader("Set-Cookie", cookie.serialize(sub, token, {
            httpOnly: this.httpOnly,
            maxAge: 60 * 60 * 24 * 7,
            domain: req.hostname,
            path: "/"
        }));
        res.statusCode = 302;
        res.setHeader("Location", redirect);
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
        return Object.values(this.getTokens()).filter(token => token.data.id === userId).map(i => i.token);
    }

    /**
     * @param {function} callback
     *
     * @returns {this}
     *
     * @description Passport runs it with parameter `id`
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
        req.user.isAuthenticated = () => req.user.authenticated;
        const token = cookie.parse(req.headers.cookie || '')["cli.id"];
        const data = this.getToken(token);
        if (!data) return next();
        req.user.token = token;
        req.user.id = data["data"].id;
        req.user.authenticated = true;
        if (this._userCallback) req.user.data = this._userCallback(req.user.id);
        return next();
    }
    /**
     * @description Generates new passport token
     * @type {function(): string}
     */
    generateToken = generateToken;
}

class LocalPassport extends Passport {
}

class DiscordPassport extends Passport {
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
        if (this._sqlite) {
            if (this.getToken(token)) this.removeToken(token);
            this._sqlite.prepare(`INSERT INTO tokens (token, data)
                                  VALUES (?, ?)`).run(token, JSON.stringify(value));
            return this;
        }
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
        while (!token || this.getToken(token)) token = this.generateToken();
        this.setToken(token, {token, data});
        this.setTokenCookie(req, res, "cli.id.discord", token, redirectURL);
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
            if (this.getToken(token)) return res.redirect(options.redirectURL);
            const code = req.query.code;
            if (!code) return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURI(this.callbackURL)}&response_type=code&scope=${this.scopes.join("%20")}`);
            try {
                /**
                 * @type {{token_type, access_token}}
                 */
                const oauthData = await (await fetch('https://discord.com/api/oauth2/token', {
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
                })).json();
                const userData = await (await fetch("https://discord.com/api/users/@me", {
                    headers: {
                        authorization: `${oauthData.token_type} ${oauthData.access_token}`,
                    },
                })).json();
                this.createSession(req, res, userData, options.redirectURL);
                if (options.success) options.success(oauthData, userData);
            } catch (error) {
                if (options.error) options.error(error);
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

module.exports.Passport = Passport;
module.exports.Local = LocalPassport;
module.exports.Discord = DiscordPassport;
module.exports.generateToken = generateToken;
