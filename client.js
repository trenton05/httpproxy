"use strict";

var https = require('https');
var fs = require('fs');
var host = fs.readFileSync('ssl.host', 'utf-8').trim();

var options = {
	host: host,
	port: 443,
	path: '/pull',
	method: 'GET'
};

function doRequest() {
	var req = https.request(options, function (res) {
		var data = '';
		res.on('data', function (d) {
			data += d;
		});
		res.on('end', function () {
			console.log(data);
			var json = JSON.parse(data);
			var out = https.request({
				host: json.host,
				port: 443,
				path: json.path,
				headers: json.headers,
				method: json.method
			}, function (res) {
				var output = '';
				res.on('data', function (d) {
					output += d;
				});
				res.on('end', function() {
					console.log(res.statusCode + ' ' + output.length + ' bytes');

					var provide = https.request({
						host: host,
						port: 443,
						path: '/provide',
						method: 'POST'
					});
					provide.on('error', function(err) {
						console.log(err);
						doRequest();
					});
					provide.end(JSON.stringify({
						data: output,
						headers: res.headers,
						statusCode: res.statusCode,
						id: json.id
					}));
					doRequest();
				});
			});
			out.on('error', function(err) {
				console.log(err);
				doRequest();
			});
			if (json.data) {
				out.write(json.data);
			}
			out.end();
		});
	});
	req.on('error', function(err) {
		console.log(err);
		setTimeout(doRequest, 1000);
	});
	req.end();
}

for (var i=0; i<10; i++) {
	doRequest();
}