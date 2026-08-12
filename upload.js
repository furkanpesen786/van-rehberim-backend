import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function uploadFile() {
    try {
        const serversRes = await fetch('https://api.gofile.io/servers');
        const serversJson = await serversRes.json();
        const server = serversJson.data.servers[0].name;

        const form = new FormData();
        form.append('file', fs.createReadStream('android/app/build/outputs/apk/debug/app-debug.apk'));

        const uploadRes = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
            method: 'POST',
            body: form
        });

        const uploadJson = await uploadRes.json();
        fs.writeFileSync('gofile_link.txt', uploadJson.data.downloadPage);
    } catch (e) { }
}
uploadFile();
