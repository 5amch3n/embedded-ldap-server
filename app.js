// The env variable LDAP_OPTS is something like this:
// {"port":1389, "basedn":"dc=someco, dc=com", "company": "Someco", "datasource":{"user": "username","password": "your_password", "database": "schema_name"}}
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
    var usernameExtractedFromBindDN = req.connection.ldap.bindDN.toString().replace(basedn,'').replace(/^cn=|,\s$/g,'');
    var usernameExtractedFromBaseObject = req.baseObject.toString().replace(basedn,'').replace(/^cn=|,\s$/g,'');
    if(!usernameExtractedFromBaseObject) {
        if(usernameExtractedFromBindDN == 'admin') {
            db.query("select * from user where locked=0", function(err, rs) {
                rsHandler(err, rs, req, res);
            });
        } else {
            db.query("select * from user where locked=0 and email=?", [usernameExtractedFromBindDN], function(err, rs) {
                rsHandler(err, rs, req, res);
            });
        }
    } else {
        if(usernameExtractedFromBindDN == 'admin' || usernameExtractedFromBaseObject == usernameExtractedFromBindDN) {
            db.query("select * from user where locked=0 and email=?", [usernameExtractedFromBaseObject], function(err, rs) {
                rsHandler(err, rs, req, res);
            });
        } else {
            res.end();
        }
    }
});

function rsHandler(err, rs, req, res){
    if(rs.length) {
        rs.forEach(function(rec){
            var name = rec.name;
            var firstname, surname;
            if(name.indexOf(' ') > -1) {
                var arr = name.split(' ');
                firstname = arr[0];
                surname   = arr[1];
            } else {
                firstname = name.substring(1);
                surname   = name.substring(0, 1);
            }
            var userInfo = {
                dn: "cn=" + rec.email + ", " + basedn,
                attributes:{
                    objectclass: [ "top" ], hassubordinates: false,
                    cn: rec.email,
                    mail: rec.email,
                    firstname: firstname,
                    surname: surname,
                    dept: rec.dept,
                    position: rec.position,
                    city: rec.city,
                    mobile: rec.mobile,
                    ou: company
                }
            };
            if (req.filter.matches(userInfo.attributes)) {
                res.send(userInfo);
            }
        })
    }
    res.end();
}

server.listen(ldap_port, function() {
    console.log("LDAP server started at %s", server.url);
});
