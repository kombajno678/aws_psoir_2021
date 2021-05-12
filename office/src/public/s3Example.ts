
const BUCKET_NAME = 'test-bucket-2137';
const IDENTITY_POOL_ID = 'us-east-1:c6ac60b4-7ff6-48a6-9f73-8cdfa3dda9b0';
const REGION = "us-east-1"; //REGION
const TODO_FOLDER_NAME = 'todo';
const DONE_FOLDER_NAME = 'done';
const ALLOWED_FOLDERS = [TODO_FOLDER_NAME, DONE_FOLDER_NAME]
const ALLOWED_UPLOAD_FOLDERS = [TODO_FOLDER_NAME]
const ALLOWED_UPLOAD_TYPE = "text/plain";
const ALLOWED_UPLOAD_EXTENSION = ".txt";

const defaultApiUrl = 'http://ec2-54-160-87-52.compute-1.amazonaws.com'
var apiUrl = defaultApiUrl;

const todoElementId = 'app-todo';
const doneElementId = 'app-done';

const gets3file = (path) => {
  console.log('gets3file');
  
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
window.gets3file = gets3file;

const doWorkOnselectedFiles = () => {
  let allCheckboxes = document.querySelectorAll(".file-checkbox");
  let files = [];

  allCheckboxes.forEach(c => {
    if (c['checked']) {
      files.push(c['value']);
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
window.doWorkOnselectedFiles = doWorkOnselectedFiles;



// Load the required clients and packages
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";

import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

import { S3Client, PutObjectCommand, ListObjectsCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

window.addEventListener('load', (event) => {

  let stored = localStorage.getItem('aws-office-api-url');
  if (stored) {
    apiUrl = stored;
  }

  document.getElementById('api-form')['value'] = apiUrl;

  document.getElementById('api-form').onkeyup = () => {
    apiUrl = document.getElementById('api-form')['value'];
    localStorage.setItem('aws-office-api-url', apiUrl);
    console.log('apiUrl updated, ', apiUrl);
  }

  document.getElementById('api-url-default').onclick = () => {
    apiUrl = defaultApiUrl;
    localStorage.setItem('aws-office-api-url', apiUrl);
    document.getElementById('api-form')['value'] = apiUrl;
  }
  document.getElementById('api-url-clear').onclick = () => {
    apiUrl = '';
    localStorage.setItem('aws-office-api-url', apiUrl);
    document.getElementById('api-form')['value'] = apiUrl;
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
  if (!ALLOWED_FOLDERS.find(s => s === folderName)) {
    console.error(`folder ${folderName} is not allowed`);
    throw `folder ${folderName} is not allowed`;
  }
  const folderKey = encodeURIComponent(folderName) + "/";
  try {
    let addFileForm =
      `<input id="input-file-upload" type="file" accept=".txt">
      <button id="addfile" onclick="addFile('${folderName}')">
      Add file
      </button>`;
    let allowedUpload = ALLOWED_UPLOAD_FOLDERS.find(f => f === folderName) ? true : false;
    const data = await s3.send(
      new ListObjectsCommand({
        Prefix: folderKey,
        Bucket: bucketName,
      })
    );

    if (data.Contents.length === 1) {
      var htmlTemplate = [
        "<p>No files :( </p>",
        allowedUpload ? addFileForm : [],
        // '<br><button onclick="listFolders()">',
        // "Back to folders",
        // "</button>",
      ];
      document.getElementById(elementId).innerHTML = getHtml(htmlTemplate);
    } else {
      console.log(data);
      const href = "https://s3." + REGION + ".amazonaws.com/";
      const bucketUrl = href + bucketName + "/";
      const files = data.Contents.filter(x => x.Key !== folderName + '/').map(function (file) {
        const fileKey = file.Key;
        const fileUrl = bucketUrl + encodeURIComponent(fileKey);
        return getHtml([
          "<span>",
          // "<div>",
          //   '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
          // "</div>",
          "<div>",
          "<span onclick=\"deletePhoto('" +
          folderName +
          "','" +
          fileKey +
          "')\">",
          "X",
          "</span>",
          `<input type="checkbox" class="file-checkbox" id="checkbox_${fileKey}" value="${fileKey}" >`,
          `<span><a href="#" onclick="gets3file('${fileKey}')">`,
          fileKey.replace(folderKey, ""),
          "</a></span>",
          "</div>",
          "</span>",
        ]);
      });
      var message = files.length
        ? `<button type="button" onclick="doWorkOnselectedFiles()"> do "work" on selected files </button>`
        : "<p>You don't have any files. You need to add files.</p>";
      const htmlTemplate = [
        // "<h2>",
        // "Folder: " + albumName,
        // "</h2>",
        message,
        "<div>",
        getHtml(files),
        "</div>",
        allowedUpload ? addFileForm : [],
        // '<br><button onclick="listFolders()">',
        // "Back to folders",
        // "</button>",
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
  if(!folderName){
    folderName = TODO_FOLDER_NAME;
  }
  const files = document.getElementById("input-file-upload")['files'];
  try {
    const folderKey = encodeURIComponent(folderName) + "/";
    // const data = await s3.send(
    //   new ListObjectsCommand({
    //     Prefix: folderKey,
    //     Bucket: bucketName
    //   })
    // );
    const file = files[0];
    let extension = file.name.split('.').pop()
    if(!(file.type === ALLOWED_UPLOAD_TYPE)){
      alert(`Not allowed file type.`);
      throw `file type must be ${ALLOWED_UPLOAD_TYPE}`;
    }
    if(!(extension !== ALLOWED_UPLOAD_EXTENSION)){
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
      alert("Successfully uploaded photo.");
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
  try {
    const params = { Key: fileKey, Bucket: bucketName };
    const data = await s3.send(new DeleteObjectCommand(params));
    console.log(`deleted file : '${fileKey}'`);
    viewFolder(folderName);
  } catch (err) {
    return alert(`error while deleting file : '${fileKey}'`, err.message);
  }
};
// Make deletePhoto function available to the browser
window.deleteFile = deleteFile;




