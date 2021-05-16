
const BUCKET_NAME = 'test-bucket-2137';
const IDENTITY_POOL_ID = 'us-east-1:c6ac60b4-7ff6-48a6-9f73-8cdfa3dda9b0';
const REGION = "us-east-1"; //REGION
const TODO_FOLDER_NAME = 'todo';
const DONE_FOLDER_NAME = 'done';
const ALLOWED_FOLDERS = [TODO_FOLDER_NAME, DONE_FOLDER_NAME]
const ALLOWED_UPLOAD_FOLDERS = [TODO_FOLDER_NAME]
const ALLOWED_UPLOAD_TYPE = "text/plain";
const ALLOWED_UPLOAD_EXTENSION = ".txt";
const DOWORK_BUTTON_ID = 'dowork-button';

//const defaultApiUrl = 'http://ec2-54-160-87-52.compute-1.amazonaws.com'
//const defaultApiUrl = 'http://ec2-54-160-87-52.compute-1.amazonaws.com'
const defaultApiUrl = window.location.href;
var apiUrl = defaultApiUrl;

const todoElementId = 'app-todo';
const doneElementId = 'app-done';

var msgs = [];

const gets3file = (path) => {
  let url = apiUrl + 'gets3file';
  console.log('gets3file', url);

  let filename = path.split('/').pop();

  let xhr = new XMLHttpRequest();
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
  xhr.send(JSON.stringify({
    path: path
  }));
  document.getElementById('file-content').setAttribute('class', 'file-content file-lodaing material-shadow');
  document.getElementById('file-content').innerHTML = '... loading ...';
  xhr.onload = () => {
    console.log('onload', xhr.status);
    let response = JSON.parse(xhr.response);
    let string = '';
    if (xhr.status == 200) {
      response.data.data.forEach(char => {
        string += String.fromCharCode(char);
      })
      document.getElementById('file-content').setAttribute('class', 'file-content file-good material-shadow');
    } else {
      console.error(response.err);
      string = `error getting file contents<br> ${response.err.message} [${response.err.code}]`;
      document.getElementById('file-content').setAttribute('class', 'file-content file-error material-shadow');
    }

    document.getElementById('file-content').innerHTML = `<h4> ${filename} contents: </h4><p>${string}</p>`;


  }
  xhr.onerror = (err) => {
    console.log('onerror', xhr.status);
    console.error(err);
    let response = JSON.parse(xhr.response);
    console.error(response.err);
    let string = `error getting file contents<br> ${response.err.message} [${response.err.code}]`;
    document.getElementById('file-content').setAttribute('class', 'file-content file-error');
    document.getElementById('file-content').innerHTML = `<h4> ${filename} contents: </h4><p>${string}</p>`;

  }


}
window.gets3file = gets3file;

function pushMsg(string) {
  let timestamp = new Date().toISOString();
  let msg = `<div class="log-msg">${timestamp} > ${string}</div>`;
  msgs.reverse();
  msgs.push(msg);
  msgs.reverse();
  document.getElementById('log').setAttribute('class', 'log material-shadow p-3');
  document.getElementById('log').innerHTML = '<h4>Messages: </h4>' + msgs.join('<br>');
}

const doWorkOnselectedFiles = () => {
  let url = apiUrl + 'tasks';
  console.log("tasks", url);
  document.getElementById(DOWORK_BUTTON_ID)['disabled'] = true;

  let allCheckboxes = document.querySelectorAll(".file-checkbox");
  let files = [];

  allCheckboxes.forEach(c => {
    if (c['checked']) {
      files.push(c['value']);
    }
  })
  //console.log(files);
  if (files.length > 0) {
    let xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhr.send(JSON.stringify(files));
    xhr.onload = function () {
      pushMsg(`tasks sent: ${JSON.stringify(files)}`);
      document.getElementById(DOWORK_BUTTON_ID).disabled = false;
    }
    xhr.onerror = (error) => {
      console.error(error);
      pushMsg(`failed to send tasks`);
      document.getElementById(DOWORK_BUTTON_ID).disabled = false;
    }
  } else {
    alert('No files selected');
    document.getElementById(DOWORK_BUTTON_ID).disabled = false;
  }



}
window.doWorkOnselectedFiles = doWorkOnselectedFiles;



// Load the required clients and packages
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";

import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

import { S3Client, PutObjectCommand, ListObjectsCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";


function setApiUrl(newUrl) {
  apiUrl = newUrl;
  localStorage.setItem('aws-office-api-url', apiUrl);
  document.getElementById('api-form')['value'] = apiUrl;
  console.log('apiUrl updated, ', apiUrl);
}
window.addEventListener('load', (event) => {

  let stored = localStorage.getItem('aws-office-api-url');
  if (stored) {
    apiUrl = stored;
  }

  document.getElementById('api-form')['value'] = apiUrl;

  document.getElementById('api-form').onkeyup = () => {
    setApiUrl(document.getElementById('api-form')['value']);
  }
  document.getElementById('api-form').onblur = () => {
    setApiUrl(document.getElementById('api-form')['value']);
  }



  document.getElementById('api-url-default').onclick = () => {
    setApiUrl(defaultApiUrl);
  }
  document.getElementById('api-url-clear').onclick = () => {
    setApiUrl('');
  }
});


// Initialize the Amazon Cognito credentials provider
const s3 = new S3Client({
  region: REGION,
  credentials: fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: REGION }),
    identityPoolId: IDENTITY_POOL_ID, // IDENTITY_POOL_ID
  }),
});

const bucketName = BUCKET_NAME; //BUCKET_NAME

// A utility function to create HTML
const getHtml = (template) => {
  return template.join("");
}
// Make getHTML function available to the browser
window.getHTML = getHtml;


const viewFolder = async (folderName) => {
  if (!folderName) {
    folderName = TODO_FOLDER_NAME;
  }
  let elementId = folderName == TODO_FOLDER_NAME ? todoElementId : doneElementId;

  if (document.getElementById(elementId)) {
    document.getElementById(elementId).innerHTML = '<div class="loading-box"></div>';

  }


  if (!ALLOWED_FOLDERS.find(s => s === folderName)) {
    console.error(`folder ${folderName} is not allowed`);
    throw `folder ${folderName} is not allowed`;
  }
  const folderKey = encodeURIComponent(folderName) + "/";
  try {
    let allowedUpload = ALLOWED_UPLOAD_FOLDERS.find(f => f === folderName) ? true : false;
    const data = await s3.send(
      new ListObjectsCommand({
        Prefix: folderKey,
        Bucket: bucketName,
      })
    );

    if (data.Contents.length === 1) {
      var htmlTemplate = ["<p>No files :( </p>"];
      document.getElementById(elementId).innerHTML = getHtml(htmlTemplate);
    } else {
      console.log(data);
      const href = "https://s3." + REGION + ".amazonaws.com/";
      const bucketUrl = href + bucketName + "/";
      const files = data.Contents.filter(x => x.Key !== folderName + '/').map(function (file) {
        const fileKey = file.Key;
        const fileUrl = bucketUrl + encodeURIComponent(fileKey);
        /*
        <li class="list-group-item">Cras justo odio</li>
        */
        return getHtml([
          "<li class=\"list-group-item\">",
          '<div class="row w-100 m-0">',
          `<div class="col-auto p-1"><button class="btn p-0 deletefile-button" onclick="deleteFile('${folderName}','${fileKey}')"></button></div>`,

          `${folderName == TODO_FOLDER_NAME ? `
          <div class="col-auto p-1"><input type="checkbox" class="form-check-input file-checkbox" id="checkbox_${fileKey}" value="${fileKey}" ></div>
          ` : ''}
          `,
          `<div class="col p-1"><a href="#" onclick="gets3file('${fileKey}')">${fileKey.replace(folderKey, "")}</a></div>`,
          "</div>",
          "</li>",
        ]);
      });
      var message = files.length
        ? `<button type="button" id="${DOWORK_BUTTON_ID}" class="cool-btn cool-purple" onclick="doWorkOnselectedFiles()"> Do "work" on selected files </button>`
        : "<p>You don't have any files. You need to add files.</p>";
      const htmlTemplate = [
        "<ul class=\"list-group\">",
        getHtml(files),
        `${folderName == TODO_FOLDER_NAME ? message : ''}`,
        "</ul>"
      ];
      document.getElementById(elementId).innerHTML = getHtml(htmlTemplate);
    }
  } catch (err) {
    return alert("There was an error viewing your album: " + err.message);
  }
};
// Make viewFolder function available to the browser
window.viewFolder = viewFolder;


// Add a photo to an album
const addFile = async (folderName) => {
  if (!folderName) {
    folderName = TODO_FOLDER_NAME;
  }
  const files = document.getElementById("input-file-upload")['files'];
  try {
    const folderKey = encodeURIComponent(folderName) + "/";

    const file = files[0];
    if (!(file.type === ALLOWED_UPLOAD_TYPE)) {
      alert(`Not allowed file type.`);
      throw `file type must be ${ALLOWED_UPLOAD_TYPE}`;
    }
    let extension = file.name.split('.').pop();
    if (!(extension !== ALLOWED_UPLOAD_EXTENSION)) {
      alert(`Not allowed file extension`);
      throw `file extension must be ${ALLOWED_UPLOAD_EXTENSION}`;
    }

    const fileName = file.name;
    const fileKey = folderKey + fileName;
    const uploadParams = {
      Bucket: bucketName,
      Key: fileKey,
      Body: file
    };
    try {
      const data = await s3.send(new PutObjectCommand(uploadParams));
      //alert("Successfully uploaded file.");
      viewFolder(folderName);
    } catch (err) {
      console.error(err.message);
      return alert("There was an error uploading your file: " + err.message);
    }
  } catch (err) {
    if (!files.length) {
      return alert("Choose a file to upload first.");
    }
  }
};
// Make addFile function available to the browser
window.addFile = addFile;


// Delete a photo from an album
const deleteFile = async (folderName, fileKey) => {
  if (confirm(`Deleting file '${fileKey}'. Are you sure?`)) {
    try {
      const params = { Key: fileKey, Bucket: bucketName };
      const data = await s3.send(new DeleteObjectCommand(params));
      console.log(`deleted file : '${fileKey}'`);
      viewFolder(folderName);
    } catch (err) {
      return alert(`error while deleting file : '${fileKey}'`, err.message);
    }
  }

};
// Make deletePhoto function available to the browser
window.deleteFile = deleteFile;




