var apiUrl = 'http://ec2-54-160-87-52.compute-1.amazonaws.com';



function gets3file(path) {
    let xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl + '/gets3file');
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhr.send(JSON.stringify({
        path: path
    }));
    document.getElementById('file-content').innerHTML = '...';
    xhr.onload = function () {
        let data = JSON.parse(xhr.response);

        let string = '';
        data.data.data.forEach(char => {
            string += String.fromCharCode(char);
        })
        console.log(string);
        document.getElementById('file-content').innerHTML = string;
    }

}

function doWorkOnselectedFiles() {
    let allCheckboxes = document.querySelectorAll(".file-checkbox");
    let files = [];

    allCheckboxes.forEach(c => {
        if (c.checked) {
            files.push(c.value);
        }
    })
    //console.log(files);

    let xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl + '/tasks');
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhr.send(JSON.stringify(files));
    xhr.onload = function () {
        let msg = `tasks sent: ${JSON.stringify(files)}`;
        document.getElementById('log').innerHTML = msg + '<br>' + document.getElementById('log').innerHTML
    }



}

function reloadList() {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', apiUrl + '/list');
    xhr.send();
    xhr.onload = function () {
        let data = JSON.parse(xhr.response);
        ///console.log(`Loaded: ${xhr.status} ${data}`);


        if (data.err) {
            console.error(data.err);
            alert(data.err);
        } else {
            let filesList = document.getElementById('s3-files');
            filesList.innerHTML = '';
            data.content.filter(f => f.Key[f.Key.length - 1] != '/').forEach(f => {
                ///console.log(`Key = ${f.Key}, size = ${f.Size}, LastModified = ${f.LastModified}`);
                let fileDiv = document.createElement('div');

                fileDiv.innerHTML = `
                <div class="file-row" id="file_${f.Key}">
                    <input type="checkbox" class="file-checkbox" id="checkbox_${f.Key}" value="${f.Key}">
                    ${f.Key}; ${f.Size}; ${f.LastModified}
                    <button onclick="gets3file('${f.Key}')">show content</button>
                </div>
                `;

                filesList.appendChild(fileDiv);

            })
        }

    };

}
