import http         from 'node:http';
import {join}       from 'node:path';
import {readFile}   from 'node:fs';
import {Server}     from 'socket.io';

const httpServer = http
    .createServer((request, response) => {
        let {url} = request;
        if(url == '/') {
            url = '/connections.html';
            const filename = join(process.cwd(), url);

            readFile(filename, (err, data) => {
                if(!err) {
                    response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                    response.write(data);
                } else {
                    response.writeHead(500, {"Content-Type": "text/plain"});
                    response.write(`Error en la lectura del fichero: ${url}`);
                }
                response.end();
            });
        }
        else {
            console.log('Peticion invalida: ' + url);
            response.writeHead(404, {'Content-Type': 'text/plain'});
            response.write('404 Not Found\n');
            response.end();
        }
    });
    
let allClients = new Array();

const io = new Server(httpServer);
io.sockets.on('connection', (client) => {
        const cAddress = client.request.socket.remoteAddress;
        const cPort = client.request.socket.remotePort;

        allClients.push({address:cAddress, port:cPort});
        console.log(`Nueva conexión de ${cAddress}:${cPort}`);

        io.sockets.emit('all-connections', allClients);

        client.on('output-evt', (data) => {
            client.emit('output-evt', 'Hola Cliente!');
        });

        client.on('disconnect', () => {
            console.log(`El usuario ${cAddress}:${cPort} se va a desconectar`);

            const index = allClients.findIndex(cli => cli.address == cAddress && cli.port == cPort);

            if (index != -1) {
                allClients.splice(index, 1);
                io.sockets.emit('all-connections', allClients);
            } else {
                console.log('¡No se ha encontrado al usuario!')
            }
            console.log(`El usuario ${cAddress}:${cPort} se ha desconectado`);
        });
    }
);

httpServer.listen(8080);
console.log('Servicio Socket.io iniciado');
