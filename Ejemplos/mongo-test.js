import http          from 'node:http';
import {join}        from 'node:path';
import {readFile}    from 'node:fs';
import {Server}      from 'socket.io';
import {MongoClient} from 'mongodb';

const httpServer = http
    .createServer((request, response) => {
        let {url} = request;
        if(url == '/') {
            url = '/mongo-test.html';
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

MongoClient.connect("mongodb://localhost:27017/").then((db) => {
    const dbo = db.db("baseDatosTest");
    const collection = dbo.collection("test");

    const io = new Server(httpServer);
    io.sockets.on('connection', (client) => {
        client.emit('my-address', {host:client.request.socket.remoteAddress, port:client.request.socket.remotePort});
        client.on('poner', (data) => {
            collection.insertOne(data, {safe:true}).then((result) => {});
        });
        client.on('obtener', (data) => {
            collection.find(data).toArray().then((results) => {
                client.emit('obtener', results);
            });
        });
    });
    httpServer.listen(8080);
}).catch((err) => {console.error(err);});

console.log('Servicio MongoDB iniciado');
