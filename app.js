// The env variable LDAP_OPTS is something like this:
// {"port":389, "basedn":"dc=someco, dc=com", "company": "Someco", "datasource":{"user": "username","password": "your_password", "database": "schema_name"}}
var ldap = require('ldapjs'),
    encryptor = require('./encryptor'),
    mysql = require("mysql"),
    server = ldap.createServer(),
    ldap_opts = JSON.parse(process.env.LDAP_OPTS),
    ldap_port = ldap_opts.port,
    basedn = ldap_opts.basedn,
    company = ldap_opts.company,
    db = mysql.createConnection(ldap_opts.datasource);

server.bind(basedn, function (req, res, next) {
    var username = req.dn.toString().replace(basedn,'').replace(/^cn=|,\s$/g,''),
        password = req.credentials;
    var encryptedPassword = encryptor.encrypt(password);
    db.query("select id from user where email=? collate utf8_bin " +
        "and password=? collate utf8_bin and locked=0",
        [username, encryptedPassword],
        function(err, rs){
        if (err) {
            return next(new ldap.InvalidCredentialsError());
        }
        if(rs.length) {
            res.end();
            return next();
        }
        return next(new ldap.InvalidCredentialsError());
    });
});

server.search(basedn, function(req, res, next) {
    var binddn = req.connection.ldap.bindDN.toString();
    var username = binddn.replace(basedn,'').replace(/^cn=|,\s$/g,'')

    db.query("select * from user where email=? collate utf8_bin and locked=0", [username], function(err, rs){
        if(rs.length) {
            var userInfo = {
                dn: "cn=" + rs[0].name + ", " + basedn,
                attributes:{
                    objectclass: [ "top" ],
                    cn: rs[0].name,
                    mail: rs[0].email,
                    dept: rs[0].dept,
                    position: rs[0].position,
                    city: rs[0].city,
                    mobile: rs[0].mobile,
                    ou: company
                }
            };
            if (req.filter.matches(userInfo.attributes)) {
                res.send(userInfo);
            }
        }
        res.end();
    });
});

server.listen(ldap_port, function() {
    console.log("LDAP server running at %s", server.url);
});
