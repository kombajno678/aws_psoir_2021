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
var testQueueUrl = process.env.QUEUE_URL;
var bucketName = process.env.BUCKET_NAME;

const ququeName = testQueueUrl.split('/')[testQueueUrl.split('/').length - 1];

AWS.config.update({
    region: 'us-east-1'
});



function setup() {
    console.log('setup');
    let sqs = new AWS.SQS({
        apiVersion: '2012-11-05'
    });

    let params = {};

    sqs.listQueues(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            //console.log("Success", data.QueueUrls);
            //console.log(data);

            let needToCreateQueue = false;
            if (!data.QueueUrls) {
                needToCreateQueue = true;
            } else {
                // find ququeName
                if (!data.QueueUrls.find(url => url === testQueueUrl)) {
                    needToCreateQueue = true;
                }
            }
            if (needToCreateQueue) {
                console.log('creating queue ...');
                let params = {
                    QueueName: ququeName,
                    Attributes: {
                        'DelaySeconds': '60',
                        'MessageRetentionPeriod': '86400'
                    }
                };

                sqs.createQueue(params, function (err, data) {
                    if (err) {
                        console.log("Error while crateing queue ", err);
                    } else {
                        console.log("Success, created queue ", data.QueueUrl);
                        testQueueUrl = data.QueueUrl;
                    }
                });

            } else {
                console.log('queue already exists');
            }
        }
    });
}



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

function sendMsgs(manyParams, res) {

    let sqs = new AWS.SQS({
        apiVersion: '2012-11-05'
    });

    let batch = [];
    while (batch.length < 10 && manyParams.length > 0) {
        batch.push(manyParams.pop());
    }

    //invoke self for rest
    if (manyParams.length > 0) {
        sendMsgs(manyParams, res);
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
            try {
                res.status(500).send({
                    error: err
                });

            } catch (error) {
                console.error(error)
            }
        } else {
            console.log("msg batch  sent, success:", data.Successful.length, " failed: ", data.Failed.length);


            try {
                res.send({
                    success: data.Successful.length,
                    failed: data.Failed.length
                });

            } catch (error) {
                console.error(error)
            }

        }
    });

}


app.get("/list", (req, res) => {
    try {
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
    } catch {
        res.status(500).send({});
    }

});
app.post("/gets3file", (req, res) => {
    try {
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
    } catch {
        res.status(500).send({});
    }




})



app.post("/tasks", (req, res) => {
    try {
        let files = req.body;
        console.log(files);
        let msgs = files.map(prepareMsgForBatch);
        sendMsgs(msgs, res);

        //res.send(`i guess all ${msgs.length} msgs have been sent, but not sure`);
    } catch {
        res.status(500).send({});
    }

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
    setup();
    console.log(`Example app listening at http://localhost:${port}`);
});