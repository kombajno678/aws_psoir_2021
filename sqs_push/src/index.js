'use strict';
// Load the SDK and UUID
var AWS = require('aws-sdk');
const Rx = require('rxjs/Rx');
const testQueueUrl = 'https://sqs.us-east-1.amazonaws.com/617985383924/test-queue';
const testQueueName = 'test-queue';


function listsQueues(sqs) {
    let r = new Rx.Subject();
    let params = {};
    sqs.listQueues(params, function (err, data) {
        if (err) {
            r.next(null);
        } else {
            r.next(data.QueueUrls);
        }
    });
    return r;
}

function getQueueURL(sqs, qname) {
    let r = new Rx.Subject();
    let params = {
        QueueName: qname
    };

    sqs.getQueueUrl(params, function (err, data) {
        if (err) {
            r.next(null);
        } else {
            r.next(data.QueueUrl);
        }
    });
    return r;

}

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
                    QueueUrl: queueURL,
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









function main() {

    AWS.config.update({
        region: 'us-east-1'
    });
    AWS.config.getCredentials(function (err) {
        if (err) console.log(err.stack);
        // credentials not loaded
        else {
            console.log("got credentials, Access key:", AWS.config.credentials.accessKeyId);
        }
    });
    let sqs = new AWS.SQS({
        apiVersion: '2012-11-05'
    });


    // listsQueues(sqs).subscribe(r => {
    //     console.log('listsQueues', r);
    // })

    // getQueueURL(sqs, testQueueName).subscribe(r => {
    //     console.log('getQueueURL', r);
    // });

    /*

    let attribs = {
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
        };
    let body ='msgf body hehe';


    sendMsg(sqs, testQueueUrl, attribs, body).subscribe(r => {
        console.log('sendMsg', r );
    });
    */
    recvMsg(sqs, testQueueUrl, false).subscribe(r => {
        console.log('recvMsg', r /*?.MessageId*/ );
    });



}
main();