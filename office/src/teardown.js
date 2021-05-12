require('dotenv').config();
var AWS = require('aws-sdk');
var testQueueUrl = process.env.QUEUE_URL;
//var bucketName = process.env.BUCKET_NAME;

//const ququeName = testQueueUrl.split('/')[testQueueUrl.split('/').length - 1];

AWS.config.update({
    region: 'us-east-1'
});


function teardown() {
    // delete queue (if exists ofc)

    console.log('teardown');
    let sqs = new AWS.SQS({
        apiVersion: '2012-11-05'
    });

    let params = {};

    sqs.listQueues(params, function (err, data) {
        if (err) {
            console.log("sqs.listQueues Error", err);
        } else {
            console.log("existing queue urls: ", data.QueueUrls);

            let canDeleteQueue = data.QueueUrls && data.QueueUrls.find(url => url === testQueueUrl) ? true : false;

            if (canDeleteQueue) {
                console.log('deleting queue ...');
                let params = {
                    QueueUrl: testQueueUrl
                };
                sqs.deleteQueue(params, (err, data) => {
                    if (err) {
                        console.log("Error while deleting queue ", err);
                    } else {
                        console.log("Success, deleted queue ", testQueueUrl);
                    }
                })
                

            } else {
                console.log('queue doesnt exist');
            }
        }
    });
}

teardown();