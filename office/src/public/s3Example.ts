const BUCKET_NAME = 'test-bucket-2137';
const IDENTITY_POOL_ID = 'us-east-1:c6ac60b4-7ff6-48a6-9f73-8cdfa3dda9b0';
const REGION = "us-east-1"; //REGION
const TODO_FOLDER_NAME = 'todo';
const DONE_FOLDER_NAME = 'done';
const ALLOWED_FOLDERS = [TODO_FOLDER_NAME, DONE_FOLDER_NAME]
const ALLOWED_UPLOAD_FOLDERS = [TODO_FOLDER_NAME]

// Load the required clients and packages
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";

import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

import { S3Client, PutObjectCommand, ListObjectsCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";



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
function getHtml(template) {
  console.log('getHtml');
  return template.join("");
}
// Make getHTML function available to the browser
window.getHTML = getHtml;

// List the photo albums that exist in the bucket
const listFolders = async () => {
  try {
    const data = await s3.send(
      new ListObjectsCommand({ Delimiter: "/", Bucket: bucketName })
    );

    if (data.CommonPrefixes === undefined) {
      const htmlTemplate = [
        "<p>no folders</p>",
      ];
      document.getElementById("app").innerHTML = htmlTemplate.join('');
    } else {
      var folders = data.CommonPrefixes.map(function (commonPrefix) {
        var prefix = commonPrefix.Prefix;
        var albumName = decodeURIComponent(prefix.replace("/", ""));
        return getHtml([
          "<li>",
          "<span onclick=\"viewFolder('" + albumName + "')\">",
          albumName,
          "</span>",
          "</li>",
        ]);
      });
      var message = folders.length
        ? getHtml([
          "<p>Click folder name to view it.</p>",
        ])
        : "<p>You do not have any folders. You need to create a folder.";
      const htmlTemplate = [
        "<h2>Folders</h2>",
        message,
        "<ul>",
        getHtml(folders),
        "</ul>"
      ];
      document.getElementById("app").innerHTML = getHtml(htmlTemplate);
    }
  } catch (err) {
    return alert("There was an error listing folders: " + err.message);
  }
};

// Make listFolders function available to the browser
window.listFolders = listFolders;



const viewFolder = async (folderName) => {
  if (!folderName) {
    folderName = TODO_FOLDER_NAME;
  }
  if (!ALLOWED_FOLDERS.find(s => s === folderName)) {
    console.error(`folder ${folderName} is not allowed`);
    throw `folder ${folderName} is not allowed`;
  }
  const fodlerKey = encodeURIComponent(folderName) + "/";
  try {
    let addFileForm =
      `<input id="input-file-upload" type="file" accept=".txt">'
      <button id="addfile" onclick="addFile('${folderName}')">"
      Add file
      </button>`;
    let allowedUpload = ALLOWED_UPLOAD_FOLDERS.find(f => f === folderName) ? true : false;
    const data = await s3.send(
      new ListObjectsCommand({
        Prefix: fodlerKey,
        Bucket: bucketName,
      })
    );
    if (data.Contents.length === 1) {
      var htmlTemplate = [
        "<p>No files :( </p>",
        allowedUpload ? addFileForm : [],
        '<button onclick="listFolders()">',
        "Back to folders",
        "</button>",
      ];
      document.getElementById("app").innerHTML = getHtml(htmlTemplate);
    } else {
      console.log(data);
      const href = "https://s3." + REGION + ".amazonaws.com/";
      const bucketUrl = href + bucketName + "/";
      const photos = data.Contents.filter(x => x.Key !== folderName + '/').map(function (photo) {
        const photoKey = photo.Key;
        console.log(photo.Key);
        const photoUrl = bucketUrl + encodeURIComponent(photoKey);
        return getHtml([
          "<span>",
          // "<div>",
          //   '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
          // "</div>",
          "<div>",
          "<span onclick=\"deletePhoto('" +
          folderName +
          "','" +
          photoKey +
          "')\">",
          "X",
          "</span>",
          '<span><a href="' + photoUrl + '">',
          photoKey.replace(fodlerKey, ""),
          "</a></span>",
          "</div>",
          "</span>",
        ]);
      });
      var message = photos.length
        ? "<p>Click the X to delete file.</p>"
        : "<p>You don't have any files. You need to add files.</p>";
      const htmlTemplate = [
        // "<h2>",
        // "Folder: " + albumName,
        // "</h2>",
        message,
        "<div>",
        getHtml(photos),
        "</div>",
        allowedUpload ? addFileForm : [],
        '<button onclick="listFolders()">',
        "Back to folders",
        "</button>",
      ];
      document.getElementById("app").innerHTML = getHtml(htmlTemplate);
      //document.getElementsByTagName("img")[0].remove();
    }
  } catch (err) {
    return alert("There was an error viewing your album: " + err.message);
  }
};
// Make viewFolder function available to the browser
window.viewFolder = viewFolder;


// Add a photo to an album
const addFile = async (folderName) => {
  const files = document.getElementById("input-file-upload").files;
  try {
    const folderKey = encodeURIComponent(folderName) + "/";
    const data = await s3.send(
      new ListObjectsCommand({
        Prefix: folderKey,
        Bucket: bucketName
      })
    );
    const file = files[0];
    const fileName = file.name;
    const photoKey = folderKey + fileName;
    const uploadParams = {
      Bucket: bucketName,
      Key: photoKey,
      Body: file
    };
    try {
      const data = await s3.send(new PutObjectCommand(uploadParams));
      alert("Successfully uploaded photo.");
      viewFolder(folderName);
    } catch (err) {
      return alert("There was an error uploading your photo: ", err.message);
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

