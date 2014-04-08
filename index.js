var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	prompt = require('prompt'),
	fs = require('fs'),
	url = require('url'),
	path = require('path'),
	exec = require('child_process').exec;

io.set('log level', 2);

app.listen(4000);

var mimeTypes = {
	"html": "text/html",
	"js": "text/javascript",
	"css": "text/css"
};
 
function handler (req, res) {
	var uri = url.parse(req.url).pathname;
	var filename = path.join(process.cwd(), uri);
	fs.readFile(filename, function (err,data) {
		if (err) {
			res.writeHead(500);
			return res.end('Error');
		}
		var mimeType = mimeTypes[path.extname(filename).split('.')[1]];
		res.writeHead(200, {'Content-Type':mimeType});
		res.end(data);
	});
}
 
io.sockets.on('connection', function (socket) {
	socket.join('shell');
	console.log('User connected, id ' + (socket.name || socket.id));

	socket.on('name', function (name) {
		socket.name = name;
		console.log('User id ' + socket.id + ' has identified as ' + socket.name);
	});
});

prompt.start();

function promptForCommand () {

	prompt.get(['Command'], function (err, result) {
		var command = result.Command;

		io.sockets.in('shell').emit('command', command);

		var cp = exec(command, {
			cwd: process.cwd
		});

		cp.stdout.pipe(process.stdout);
		cp.stderr.pipe(process.stderr);

		cp.stdout.on('data', function (data) {
			io.sockets.in('shell').emit('stdout', data);
		});

		cp.stderr.on('data', function (data) {
			io.sockets.in('shell').emit('stderr', data);
		});

		cp.on('exit', function () {
			process.nextTick(promptForCommand);
		});
	});

}

promptForCommand();