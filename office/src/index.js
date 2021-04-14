require('dotenv').config();

const express = require('express');
var bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

const port = process.env.PORT;

var AWS = require('aws-sdk');
const testQueueUrl = process.env.QUEUE_URL;
const bucketName = process.env.BUCKET_NAME;

AWS.config.update({
    region: 'us-east-1'
});

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
            content: data ?.Contents
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


app.post("/tasks", (req, res) => {
    let files = req.body;
    let msgs = files.map(prepareMsgForBatch);
    sendMsgs(msgs);

    res.send(`i guess all ${msgs.length} msgs have been sent, but not sure`);
});

app.get("/", (req, res) => {
    let desc = {
        paths: [
            {
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