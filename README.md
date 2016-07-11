# embedded-ldap-server
Our central account database have been around for years. It's been serving as the database behind our SSO server.

This Sunday, one of our IT guys wechatted with me, saying that it would be perfect to authenticat our VPN users using our central account database...

Our Cisco VPN server is currently using Microsoft Active Directory to authenticate users, so we just need to make a LDAP server to replace it.

I connected to the VPN server and started to google around(WOW! it was much faster than my personal Astrill!), and came up with a node.js based solution, which will be working with the VPN server... interesting
