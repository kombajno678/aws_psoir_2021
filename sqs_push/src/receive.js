'use strict';
// Load the SDK and UUID
var AWS = require('aws-sdk');
const Rx = require('rxjs/Rx');
const testQueueUrl = 'https://sqs.us-east-1.amazonaws.com/617985383924/test-queue';
const testQueueName = 'test-queue';
var moment = require('moment');


function recvMsg(sqs, qurl, alsoDelete) {
    let r = new Rx.Subject();
    let params = {
        AttributeNames: [
            "SentTimestamp"
        ],
        MaxNumberOfMessages: 10,
        MessageAttributeNames: [
            "All"
        ],
        QueueUrl: qurl,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 0
    };

    sqs.receiveMessage(params, function (err, data) {
        if (err) {
            console.log("Receive Error", err);
        } else if (data.Messages) {
            r.next(data.Messages);
            if (alsoDelete) {
                let deleteParams = {
                    QueueUrl: qurl,
                    ReceiptHandle: data.Messages[0].ReceiptHandle
                };
                sqs.deleteMessage(deleteParams, function (err, data) {
                    if (err) {
                        console.log("Delete Error", err);
                    } else {
                        console.log("Message Deleted", data);

                    }
                });
            }

        }
    });
    return r;
}


AWS.config.update({
    region: 'us-east-1'
});
AWS.config.getCredentials(function (err) {
    if (err) console.log(err.stack);
    // credentials not loaded
    else {
        //console.log("got credentials, Access key:", AWS.config.credentials.accessKeyId);
    }
});
let sqs = new AWS.SQS({
    apiVersion: '2012-11-05'
});


setInterval(() => {
    //console.log(new Date().toISOString(), 'polling queue ... ');
    recvMsg(sqs, testQueueUrl, true).subscribe(r => {

        r.forEach(msg => {
            console.log('=============================================================');
            console.log(new Date().toISOString(), 'received msg ');
            //console.log(msg);
            let msgTimestamp = parseInt(msg.Attributes.SentTimestamp);
            console.log('msg was sent : ', new Date(msgTimestamp).toISOString());


            // https://stackoverflow.com/questions/18623783/get-the-time-difference-between-two-datetimes
            let now = new Date();
            let then = new Date(msgTimestamp);
            let ms = moment(now, "DD/MM/YYYY HH:mm:ss").diff(moment(then, "DD/MM/YYYY HH:mm:ss"));
            let d = moment.duration(ms);
            let s = Math.floor(d.asHours()) + moment.utc(ms).format(":mm:ss");


            console.log(`msg been waiting for = ${s}`);
            console.log('Title = ', msg.MessageAttributes?.Title?.StringValue, '; Body = ', msg.Body);
        })

    });

}, 1000)