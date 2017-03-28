"use strict";
 
var https = require('https');
var fs = require('fs');
var qs = require('querystring');
var url = require('url');
 
var options = {
  key: fs.readFileSync('ssl.key'),
  cert: fs.readFileSync('ssl.crt')
};
 
var PORT = 443;
var providing = {};
var posting = {};
var getting = {};

function proxy() {
	for (var i in posting) {
		for (var j in getting) {
			var get = getting[j];
			var post = posting[i];
			delete getting[j];
			delete posting[i];

			providing[i] = post;

			var data = JSON.stringify({
				data: post.data,
				path: post.path,
				method: post.method,
				host: post.host,
				id: i
			});
			console.log(data);
			get.res.end(data);

			return;
		}
	}
}

function handleRequest(req, res){
	try {
		var u = url.parse(req.url, true);
		console.log(req.method + ' ' + req.url);
		if (req.method === 'POST') {

			if (u.pathname === '/provide') {
				var data = '';

				req.on('data', function (d) {
					data += d;
				});
				req.on('end', function () {
					var json = JSON.parse(data);
					var post = providing[json.id];
					delete providing[json.id];
					if (post) {
						console.log(json.statusCode + ' ' + json.data.length);
						post.res.statusCode = json.statusCode;
						post.res.end(json.data);
					}
				});
			} else if (u.pathname === '/push') {
				var data = '';

				req.on('data', function (d) {
					data += d;
				});
				req.on('end', function () {
					var post = {method: 'POST', host: u.query.host, data: data, path: u.query.path, res: res, id: Math.random()};
					posting[post.id] = post;
					res.on('close', function() {
						delete posting[post.id];
					});

					proxy();
				});
			}
		} else if (req.method === 'GET') {
			if (u.pathname === '/pull') {
				var get = {res: res, id: Math.random()};
				getting[get.id] = get;
				res.on('close', function() {
					delete getting[get.id];
				});

				proxy();
			} else if (u.pathname === '/push') {
				var post = {method: 'GET', path: u.query.path, res: res, host: u.query.host, id: Math.random()};
				posting[post.id] = post;
				res.on('close', function() {
					delete posting[post.id];
				});


				proxy();
			}
		}
	} catch (e) {
		console.log(e);
	}
}
 
//Create a server
var server = https.createServer(options, handleRequest);
 
//Start server
server.listen(PORT, function(){
  console.log("Server listening on: https://localhost:" + PORT);
});