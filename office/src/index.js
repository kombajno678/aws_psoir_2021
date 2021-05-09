require('dotenv').config();

const express = require('express');
var bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());


app.use(express.static('src/public'));

// https://codesource.io/creating-a-logging-middleware-in-expressjs/
const getActualRequestDurationInMilliseconds = start => {
    const NS_PER_SEC = 1e9; // convert to nanoseconds
    const NS_TO_MS = 1e6; // convert to milliseconds
    const diff = process.hrtime(start);
    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};
let demoLogger = (req, res, next) => {
    let current_datetime = new Date();
    let formatted_date =
        current_datetime.getFullYear() +
        "-" +
        (current_datetime.getMonth() + 1) +
        "-" +
        current_datetime.getDate() +
        " " +
        current_datetime.getHours() +
        ":" +
        current_datetime.getMinutes() +
        ":" +
        current_datetime.getSeconds();
    let method = req.method;
    let url = req.url;
    let status = res.statusCode;
    const start = process.hrtime();
    const durationInMilliseconds = getActualRequestDurationInMilliseconds(start);
    let log = `[${formatted_date}] ${method}:${url} ${status} ${durationInMilliseconds.toLocaleString()} ms`;
    console.log(log);
    next();
};


app.use(demoLogger);


const port = process.env.PORT;

var AWS = require('aws-sdk');
const testQueueUrl = process.env.QUEUE_URL;
const bucketName = process.env.BUCKET_NAME;

AWS.config.update({
    region: 'us-east-1'
});





// // Initialize the Amazon Cognito credentials provider
// AWS.config.region = 'us-east-1'; // Region
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//     IdentityPoolId: 'us-east-1:c6ac60b4-7ff6-48a6-9f73-8cdfa3dda9b0',
// });

// var cognitoidentity = new AWS.CognitoIdentity();
// cognitoidentity.createIdentityPool(params, function (err, data) {
//     if (err) console.log(err, err.stack); // an error occurred
//     else console.log(data); // successful response
// });










function prepareMsgForBatch(fileName) {
    let attribs = {
        "TaskType": {
            DataType: "String",
            StringValue: "jp2"
        }
    }
    let params = {
        DelaySeconds: 10,
        MessageAttributes: attribs,
        MessageBody: fileName,
        /*QueueUrl: testQueueUrl*/
    };
    return params;
}

function sendMsgs(manyParams) {

    let sqs = new AWS.SQS({
        apiVersion: '2012-11-05'
    });

    let batch = [];
    while (batch.length < 10 && manyParams.length > 0) {
        batch.push(manyParams.pop());
    }

    //invoke self for rest
    if (manyParams.length > 0) {
        sendMsgs(manyParams);
    }
    //send batch

    var params = {
        Entries: batch,
        QueueUrl: testQueueUrl /* required */
    };
    params.Entries.map((v, i, a) => {
        v.Id = "" + i;
        return v;
    })

    sqs.sendMessageBatch(params, function (err, data) {
        if (err) {
            console.error("Error", err);
        } else {
            console.log("msg batch  sent, success:", data.Successful.length, " failed: ", data.Failed.length);
        }
    });

}



app.get("/list", (req, res) => {

    // Create S3 service object
    let s3 = new AWS.S3({
        apiVersion: '2006-03-01'
    });

    // Create the parameters for calling listObjects
    let bucketParams = {
        Bucket: bucketName,
    };

    // Call S3 to obtain a list of the objects in the bucket
    s3.listObjects(bucketParams, function (err, data) {
        let result = {
            /*data: data,*/
            err: err,
            content: data ? data.Contents : null
        }
        if (err) {
            console.log("Error", err);
            res.status(err.statusCode);
        } else {
            //console.log("Success", data);
            res.status(200);
        }
        res.send(result);
    });
});
app.post("/gets3file", (req, res) => {
    let filePath = req.body.path;
    console.log(req.body);

    // Create S3 service object
    let s3 = new AWS.S3({
        apiVersion: '2006-03-01'
    });

    s3.getObject({
            Bucket: bucketName,
            Key: filePath
        },
        function (error, data) {
            if (error != null) {
                console.error("Failed to retrieve an object: " + error);
                res.status(400).send({
                    err: error,
                    data: null
                })
            } else {
                console.log("Loaded " + data.ContentLength + " bytes");
                // do something with data.Body
                res.status(200).send({
                    err: null,
                    data: data.Body
                })

            }
        }
    );



})



app.post("/tasks", (req, res) => {
    let files = req.body;
    console.log(files);
    let msgs = files.map(prepareMsgForBatch);
    sendMsgs(msgs);

    res.send(`i guess all ${msgs.length} msgs have been sent, but not sure`);
});


app.get("/help", (req, res) => {
    let desc = {
        paths: [{
                path: "/list",
                method: "GET"
            },
            {
                path: "/tasks",
                method: "POST",
                exampleBody: ['filePath1', 'filePath2', 'filePath3']
            }
        ]
    }
    res.send(desc);
})


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});