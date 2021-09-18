const cookie = require("cookie");
const tokens = {};
const sessions = {};
const randoms = "abcdefghijklmnoprstuvyzqwx!'^+%&/()=?_1234567890".split("");
const generateToken = () => " ".repeat(50).toString().split("").map(() => randoms[Math.floor(Math.random() * randoms.length)]).join("");
let id = 0;

module.exports.callback = (req, res, next) => {
    const token = cookie.parse(req.headers.cookie || '')["cli.id"];
    const session = sessions[tokens[token] || tokens[token] === 0 ? tokens[token] : -1];
    console.log(token, tokens, sessions)
    if (!session) return next();
    req.user = session;
    return next();
}

module.exports.Session = class Session {
    constructor(user, token = null) {
        this.id = id++;
        this.user = user;
        this.token = token;
    }

    setToken(token = null) {
        this.token = token;
    }
}

module.exports.createSession = (req, res, session, redirect = "/") => {
    if (!(session instanceof module.exports.Session) || !session.user) return false;
    const token = session.token || generateToken();
    tokens[token] = session.id;
    sessions[session.id] = session;
    session.setToken(token);
    res.setHeader('Set-Cookie', cookie.serialize("cli.id", token, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7
    }));
    res.statusCode = 302;
    res.setHeader('Location', redirect);
    res.end();
    return true;
}

module.exports.removeSession = (req) => {
    const token = cookie.parse(req.headers.cookie || '')["cli.id"];
    delete tokens[token];
    const session = sessions[tokens[token] || -1];
    if(!session) return;
    delete sessions[session.id];
}
