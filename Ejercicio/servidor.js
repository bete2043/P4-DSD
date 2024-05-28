import http         from 'node:http';
import {join}       from 'node:path';
import {readFile}   from 'node:fs';
import {Server}     from 'socket.io';
import {MongoClient} from 'mongodb';

const httpServer = http.createServer((request, response) => {
    let {url} = request;
    if(url === '/') {
        url = '/sensores.html';

    }
    else if(url === '/usuario') {
        url = '/usuario.html';
    }

    const filename = join(process.cwd(), url);
    readFile(filename, (err, data) => {
        if (!err) {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.write(data);
        } else {
        response.writeHead(500, { 'Content-Type': 'text/plain' });
        response.write(`Error en la lectura del fichero: ${url}`);
        }
        response.end();
    });
});

let allClients = new Array();
const io = new Server(httpServer);
let sensorData = { temperatura: null, luminosidad: null, humo: null };
let temp=25;
let luz=25;
let hum=25;
let estadoAire=null;
let estadoPersiana=null;
let estadoDetector=null;


MongoClient.connect("mongodb://localhost:27017/")
    .then((client) => {
        const dbo = client.db("baseDatos");
        const collection = dbo.collection("Datos")
        const collection2 = dbo.collection("Eventos")

    io.sockets.on('connection', (client) => {
        const cAddress = client.request.socket.remoteAddress;
        const cPort = client.request.socket.remotePort;


        client.emit('my-address', {host: cAddress, port: cPort});
        client.on('poner', (data) => {
            collection.insertOne(data, {safe:true}).then((result) => {});
        });

        client.on('obtener', (data) => {
            collection.find(data).toArray().then((results) => {
                client.emit('obtener', results);
            });
        });

        client.on('disconnect', () => {
            collection.deleteOne({host:client.request.socket.remoteAddress, port: client.request.socket.remotePort }).then(() => {
                collection.find({}).toArray().then((results) => {
                    io.sockets.emit('obtener', results);
                });
            });
        });


        
        allClients.push({ address: cAddress, port: cPort });
        console.log(`Nueva conexión de ${cAddress}:${cPort}`);        

        io.sockets.emit('all-connections', allClients);

        


        //Recibir los datos de los sensores

        client.on('datos', (data) => {
            console.log('Datos recibidos:', data);
            const { temperatura, luminosidad , humo} = data;

            sensorData = { temperatura, luminosidad, humo };

            temp=data.temperatura;
            luz=data.luminosidad;
            hum=data.humo;

            collection2.insertOne(sensorData, {safe:true}).then((result) => {
                console.log("Guardando datos", data);

                if(luz > 50 && estadoPersiana != 'Cerrada'){
                    io.sockets.emit('datos-luz', 'Cerrada'); 
                    estadoPersiana='Cerrada';
                    io.sockets.emit('alarma-luz-alta', 'Se ha cerrado la persiana a causa de la luz.'); 
                }
        
                if(luz < 10 && estadoPersiana != 'Abierta'){
                    io.sockets.emit('datos-luz', 'Abierta');
                    estadoPersiana='Abierta';
                    io.sockets.emit('alarma-luz-baja', 'Se ha abierto la persiana a causa de que no entra luz'); 
                }
        
                if(temp > 30 && estadoAire != 'ON'){
                    io.sockets.emit('datos-temp', 'ON');
                    estadoAire='ON';
                    io.sockets.emit('alarma-temp-alta', 'Se ha encendido el aire a causa de la calor'); 
                }
        
                if(temp < 10 && estadoAire != 'OFF'){
                    io.sockets.emit('datos-temp', 'OFF');
                    estadoAire='OFF';
                    io.sockets.emit('alarma-temp-baja', 'Se ha apagado el aire a causa del frio'); 
                }
        
                if(hum > 30 && estadoDetector != 'ON'){
                    io.sockets.emit('datos-humo', 'ON');
                    estadoDetector='ON';
                    io.sockets.emit('alarma-humo-alto', 'Se ha encendido el detector de humos porque hay mucho humo'); 
                }
        
                if(hum < 10 && estadoDetector != 'OFF'){
                    io.sockets.emit('datos-humo', 'OFF');
                    estadoDetector='OFF';
                    io.sockets.emit('alarma-humo-bajo', 'Se ha apagado el detector de humos ha desaparecido el humo'); 
                }
            });

            io.sockets.emit('datos-sensores', sensorData);
        });


        //Recibir si apagar o encender persiana del usuario 

        client.on('sensor-luz', (data) => {
            console.log('Datos recibidos:', data);
            estadoPersiana=data;
            io.sockets.emit('datos-luz', data);
        });

        //Recibir si apagar o encender aire del usuario

        client.on('sensor-temp', (data) => {
            console.log('Datos recibidos:', data);
            estadoAire=data;
            io.sockets.emit('datos-temp', data);
        });

        //Recibir si apagar o encender el detector de humo del usuario

        client.on('sensor-humo', (data) => {
            console.log('Datos recibidos:', data);
            estadoDetector=data;
            io.sockets.emit('datos-humo', data);
        });

        client.on('disconnect', () => {
            console.log(`El usuario ${cAddress}:${cPort} se va a desconectar`);
            const index = allClients.findIndex(cli => cli.address == cAddress && cli.port == cPort);

            if (index != -1) {
                allClients.splice(index, 1);
                io.sockets.emit('client-disconnect', allClients);
            } else {
                console.log('¡No se ha encontrado al usuario!');
            } console.log(`El usuario ${cAddress}:${cPort} se ha desconectado`);
        }); 
    });
    
    httpServer.listen(8080, () => {
        console.log('Servicio Socket.io iniciado en http://localhost:8080');
    });
}).catch((err) => {console.error(err);});

console.log('Servicio MongoDB iniciado');
