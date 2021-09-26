module.exports = {
    users: [
        {
            id: 0,
            username: "Alex",
            password: "*SecretPass1234*"
        }
    ],
    getUserByLoginInfo(username, password) {
        return this.users.filter(user => user.username === username && user.password === password)[0] || {id: null};
    },
    getUserById(id) {
        return this.users.filter(user => user.id === id)[0];
    }
};
// its just for example*
