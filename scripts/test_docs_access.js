
import http from 'http';

const url = 'http://localhost:8080/swagger-ui.html';

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        if (res.statusCode === 200) {
            console.log("CONTENT START:", data.substring(0, 50)); // Check if it starts with <!DOCTYPE html>
        } else {
            console.log("BODY:", data);
        }
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
