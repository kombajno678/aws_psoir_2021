const BUCKET_NAME = 'test-bucket-2137';
const IDENTITY_POOL_ID = 'us-east-1:c6ac60b4-7ff6-48a6-9f73-8cdfa3dda9b0';
const REGION = "us-east-1"; //REGION
const TODO_FOLDER_NAME = 'todo';
const DONE_FOLDER_NAME = 'done';
const ALLOWED_FOLDERS = [TODO_FOLDER_NAME, DONE_FOLDER_NAME]
const ALLOWED_UPLOAD_FOLDERS = [TODO_FOLDER_NAME]

// Load the required clients and packages
const { CognitoIdentityClient } = require("@aws-sdk/client-cognito-identity");
const {
  fromCognitoIdentityPool,
} = require("@aws-sdk/credential-provider-cognito-identity");
const { S3Client, PutObjectCommand, ListObjectsCommand, DeleteObjectCommand, DeleteObjectsCommand } = require("@aws-sdk/client-s3");



// Initialize the Amazon Cognito credentials provider
const s3 = new S3Client({
  region: REGION,
  credentials: fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: REGION }),
    identityPoolId: IDENTITY_POOL_ID, // IDENTITY_POOL_ID
  }),
});

const albumBucketName = BUCKET_NAME; //BUCKET_NAME
// snippet-end:[s3.JavaScript.photoAlbumExample.configV3]
// snippet-start:[s3.JavaScript.photoAlbumExample.listAlbumsV3]

// A utility function to create HTML
function getHtml(template) {
  console.log('getHtml');
  return template.join("");
}
// Make getHTML function available to the browser
window.getHTML = getHtml;

// List the photo albums that exist in the bucket
const listAlbums = async () => {
  console.log('listAlbums');
  try {
    const data = await s3.send(
        new ListObjectsCommand({ Delimiter: "/", Bucket: albumBucketName })
    );

    if (data.CommonPrefixes === undefined) {
      const htmlTemplate = [
        "<p>You don't have any albums. You need to create an album.</p>",
        "<button onclick=\"createAlbum(prompt('Enter album name:'))\">",
        "Create new album",
        "</button>",
      ];
      document.getElementById("app").innerHTML = htmlTemplate.join('');
    } else {
      var albums = data.CommonPrefixes.map(function (commonPrefix) {
        var prefix = commonPrefix.Prefix;
        var albumName = decodeURIComponent(prefix.replace("/", ""));
        return getHtml([
          "<li>",
          //"<span onclick=\"deleteAlbum('" + albumName + "')\">X</span>",
          "<span onclick=\"viewAlbum('" + albumName + "')\">",
          albumName,
          "</span>",
          "</li>",
        ]);
      });
      var message = albums.length
          ? getHtml([
            "<p>Click folder name to view it.</p>",
            //"<p>Click the X to delete the album.</p>",
          ])
          : "<p>You do not have any folders. You need to create a folder.";
      const htmlTemplate = [
        "<h2>Folders</h2>",
        message,
        "<ul>",
        getHtml(albums),
        "</ul>",
        // "<button onclick=\"createAlbum(prompt('Enter Album Name:'))\">",
        // "Create new Album",
        // "</button>",
      ];
      document.getElementById("app").innerHTML = getHtml(htmlTemplate);
    }
  } catch (err) {
    return alert("There was an error listing your albums: " + err.message);
  }
};

// Make listAlbums function available to the browser
window.listAlbums = listAlbums;

// snippet-end:[s3.JavaScript.photoAlbumExample.listAlbumsV3]
// snippet-start:[s3.JavaScript.photoAlbumExample.createAlbumV3]

// Create an album in the bucket
const createAlbum = async (albumName) => {
  console.log('createAlbum');
  albumName = albumName.trim();

  if (!albumName) {
    return alert("Album names must contain at least one non-space character.");
  }
  if (albumName.indexOf("/") !== -1) {
    return alert("Album names cannot contain slashes.");
  }
  var albumKey = encodeURIComponent(albumName);
  try {
    const key = albumKey + "/";
    const params = { Bucket: albumBucketName, Key: key };
    const data = await s3.send(new PutObjectCommand(params));
    alert("Successfully created album.");
    viewAlbum(albumName);
  } catch (err) {
    return alert("There was an error creating your album: " + err.message);
  }
};

// Make createAlbum function available to the browser
window.createAlbum = createAlbum;

// snippet-end:[s3.JavaScript.photoAlbumExample.createAlbumV3]
// snippet-start:[s3.JavaScript.photoAlbumExample.viewAlbumV3]

// View the contents of an album

const viewAlbum = async (albumName) => {
  if(!ALLOWED_FOLDERS.find(s => s === albumName)){
    console.error(`folder ${albumName} is not allowed`);
    throw `folder ${albumName} is not allowed`;
  }
  console.log('viewAlbum : albumName=', albumName);
  const albumPhotosKey = encodeURIComponent(albumName) + "/";
  try {
    let addFileForm = 
      `<input id="photoupload" type="file" accept=".txt">'
      <button id="addphoto" onclick="addPhoto('${albumName}')">"
      Add file
      </button>`;
    let allowedUpload = ALLOWED_UPLOAD_FOLDERS.find(f => f === albumName) ? true : false;
    const data = await s3.send(
        new ListObjectsCommand({
          Prefix: albumPhotosKey,
          Bucket: albumBucketName,
        })
    );
    if (data.Contents.length === 1) {
      var htmlTemplate = [
        "<p>No files :( </p>",
        allowedUpload ? addFileForm: [],
        '<button onclick="listAlbums()">',
        "Back to folders",
        "</button>",
      ];
      document.getElementById("app").innerHTML = getHtml(htmlTemplate);
    } else {
      console.log(data);
      const href = "https://s3." + REGION + ".amazonaws.com/";
      const bucketUrl = href + albumBucketName + "/";
      const photos = data.Contents.filter(x => x.Key !== albumName+'/').map(function (photo) {
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
                albumName +
                "','" +
                photoKey +
                "')\">",
                "X",
              "</span>",
              '<span><a href="' + photoUrl + '">',
                photoKey.replace(albumPhotosKey, ""),
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
        '<button onclick="listAlbums()">',
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
// Make viewAlbum function available to the browser
window.viewAlbum = viewAlbum;

// snippet-end:[s3.JavaScript.photoAlbumExample.viewAlbumV3]
// snippet-start:[s3.JavaScript.photoAlbumExample.addPhotoV3]

// Add a photo to an album
const addPhoto = async (albumName) => {
  console.log('addPhoto');
  const files = document.getElementById("photoupload").files;
  try {
    const albumPhotosKey = encodeURIComponent(albumName) + "/";
    const data = await s3.send(
        new ListObjectsCommand({
          Prefix: albumPhotosKey,
          Bucket: albumBucketName
        })
    );
    const file = files[0];
    const fileName = file.name;
    const photoKey = albumPhotosKey + fileName;
    const uploadParams = {
      Bucket: albumBucketName,
      Key: photoKey,
      Body: file
    };
    try {
      const data = await s3.send(new PutObjectCommand(uploadParams));
      alert("Successfully uploaded photo.");
      viewAlbum(albumName);
    } catch (err) {
      return alert("There was an error uploading your photo: ", err.message);
    }
  } catch (err) {
    if (!files.length) {
      return alert("Choose a file to upload first.");
    }
  }
};
// Make addPhoto function available to the browser
window.addPhoto = addPhoto;

// snippet-end:[s3.JavaScript.photoAlbumExample.addPhotoV3]
// snippet-start:[s3.JavaScript.photoAlbumExample.deletePhotoV3]

// Delete a photo from an album
const deletePhoto = async (albumName, photoKey) => {
  console.log('deletePhoto');
  try {
    console.log(photoKey);
    const params = { Key: photoKey, Bucket: albumBucketName };
    const data = await s3.send(new DeleteObjectCommand(params));
    console.log("Successfully deleted photo.");
    viewAlbum(albumName);
  } catch (err) {
    return alert("There was an error deleting your photo: ", err.message);
  }
};
// Make deletePhoto function available to the browser
window.deletePhoto = deletePhoto;

// snippet-end:[s3.JavaScript.photoAlbumExample.deletePhotoV3]
// snippet-start:[s3.JavaScript.photoAlbumExample.deleteAlbumV3]

// Delete an album from the bucket
const deleteAlbum = async (albumName) => {
  console.log('deleteAlbum');
  const albumKey = encodeURIComponent(albumName) + "/";
  try {
    const params = { Bucket: albumBucketName, Prefix: albumKey };
    const data = await s3.send(new ListObjectsCommand(params));
    const objects = data.Contents.map(function (object) {
      return { Key: object.Key };
    });
    try {
      const params = {
        Bucket: albumBucketName,
        Delete: { Objects: objects },
        Quiet: true,
      };
      const data = await s3.send(new DeleteObjectsCommand(params));
      listAlbums();
      return alert("Successfully deleted album.");
    } catch (err) {
      return alert("There was an error deleting your album: ", err.message);
    }
  } catch (err) {
    return alert("There was an error deleting your album1: ", err.message);
  }
};
// Make deleteAlbum function available to the browser
window.deleteAlbum = deleteAlbum;

// snippet-end:[s3.JavaScript.photoAlbumExample.deleteAlbumV3]
// snippet-end:[s3.JavaScript.photoAlbumExample.completeV3]
//for units tests only