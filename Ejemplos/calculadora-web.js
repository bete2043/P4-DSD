import http         from 'node:http';
import {join}       from 'node:path';
import {readFile}   from 'node:fs';

function calcular(operacion, val1, val2) {
    if (operacion == 'sumar') return val1+val2;
    else if (operacion == 'restar') return val1-val2;
    else if (operacion == 'producto') return val1*val2;
    else if (operacion == 'dividir') return val1/val2;
    else return 'Error: Parámetros no válidos';
}

http.createServer((request, response) => {
        let {url} = request;
        if(url == '/') {
            url = '/calc.html';
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
            url = url.slice(1);
            const params = url.split('/');
            let output='';
            if (params.length >= 3) {
                const val1 = parseFloat(params[1]);
                const val2 = parseFloat(params[2]);
                const result = calcular(params[0], val1, val2);
                output = result.toString();
            }
            else output = 'Error: El número de parámetros no es válido';
            
            response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            response.write(output);
            response.end();
        }
    })
    .listen(8080);

console.log('Servicio HTTP iniciado');

