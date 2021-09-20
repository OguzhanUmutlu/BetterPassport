const fs = require("fs");
const cookie = require("cookie");
const randoms = "abcdefghijklmnoprstuvyzqwx!'^+%&/()=?_1234567890".split("");
const generateToken = () => " ".repeat(50).toString().split("").map(() => randoms[Math.floor(Math.random() * randoms.length)]).join("");

module.exports = class Passport {
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
            if(!fs.existsSync(this._configFile)) fs.writeFileSync(this._configFile, "{}");
            this._json = JSON.parse(fs.readFileSync(this._configFile).toString());
        }
    }

    /**
     * @internal - This is an internal function.
     */
    save() {
        if (!this._config) return this;
        fs.writeFileSync(this._configFile, JSON.stringify(this._json));
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
        return this._json[token];
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
     *     if(req.authenticated) return res.send("You are already logged in!");
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
        if (!req.userToken) return false;
        const res = this.getToken(req.userToken);
        if(this._logoutCallback) this._logoutCallback(req);
        this.removeToken(req.userToken);
        delete req.userToken;
        delete req.authenticated;
        delete req.userId;
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
        return Object.values(this._json).filter(token => token.userId === userId).map(i=> i.token);
    }

    /**
     * @param {function} callback
     *
     * @returns {this}
     *
     * @description Passport runs it with parameter `userId`
     * which is a number that they set it while making user
     * logged in. The returned value will be replaced with
     * `req.user`.
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
     * passport.setLoginCallback((req) => console.log("User #" + req.userId + " logged in!"))
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
     * passport.setLogoutCallback((req) => console.log("User #" + req.userId + " logged out!"))
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
        req.isAuthenticated = () => req.authenticated;
        const token = cookie.parse(req.headers.cookie || '')["cli.id"];
        req.userToken = token;
        const data = this.getToken(token);
        if (!data) return next();
        console.log(data)
        req.userId = data["id"];
        req.authenticated = true;
        if (this._userCallback) req.user = this._userCallback(req.userId);
        if (this._loginCallback) this._loginCallback(req);
        return next();
    }
}