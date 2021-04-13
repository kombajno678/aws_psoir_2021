'use strict';
// Load the SDK and UUID
var AWS = require('aws-sdk');
const Rx = require('rxjs/Rx');
const testQueueUrl = 'https://sqs.us-east-1.amazonaws.com/617985383924/test-queue';
const testQueueName = 'test-queue';

function sendMsg(sqs, qurl, attribs, body) {
    let r = new Rx.Subject();
    let params = {
        // Remove DelaySeconds parameter and value for FIFO queues
        DelaySeconds: 10,
        MessageAttributes: attribs ? attribs : {
            "Title": {
                DataType: "String",
                StringValue: "The Whistler"
            },
            "Author": {
                DataType: "String",
                StringValue: "John Grisham"
            },
            "WeeksOn": {
                DataType: "Number",
                StringValue: "6"
            }
        },
        MessageBody: body ? body : "Information about current NY Times fiction bestseller for week of 12/11/2016.",
        // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
        // MessageGroupId: "Group1",  // Required for FIFO queues
        QueueUrl: qurl
    };

    sqs.sendMessage(params, function (err, data) {
        if (err) {
            console.error("Error", err);
            r.next(null);
        } else {
            r.next(data);
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


var stdin = process.openStdin();

stdin.addListener("data", function (d) {
    let input = d.toString().trim();
    //console.log(`you entered: [${input}]`);

    console.log(new Date().toISOString(), `sending msg [${input}] ...`);



    let attribs = {
        "Title": {
            DataType: "String",
            StringValue: "Message from send.js"
        }
    };
    let body = input;

    sendMsg(sqs, testQueueUrl, attribs, body).subscribe(r => {
        console.log(new Date().toISOString(), 'msg sent', r);
    });
});