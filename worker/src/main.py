import boto3
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import ClientError

import json
import threading
import time
import random
import os
import datetime
REGION = "us-east-1"

QUEUE_NAME = "test-queue"
QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/617985383924/test-queue"

BUCKET_NAME = "test-bucket-2137"

"""
sqs examples:
https://boto3.amazonaws.com/v1/documentation/api/latest/guide/sqs.html#sqs

s3:
https://boto3.amazonaws.com/v1/documentation/api/latest/guide/s3.html
"""

class SuperWorker(threading.Thread):
    def __init__(self, taskPath, message):
        threading.Thread.__init__(self)
        self.taskPath = taskPath
        self.message = message
        
        
    def doStuff(self, strings) -> str:
        randomLine1 = random.randint(0, len(strings))
        randomLine2 = random.randint(0, len(strings))
        randomLine3 = random.randint(0, len(strings))
        randomLine4 = random.randint(0, len(strings))
        randomLine5 = random.randint(0, len(strings))
        
        msg = f'''
<h1>hello <h1>, <b>aws<b> worker has been here and left this message <br/>
current datetime is: {datetime.datetime.now().isoformat()}<br/>
random number here: {random.randint(420, 2137)}<br/>
<br/>
<hr/>
<br/>
this file had {len(strings)} lines of text<br/>
i have choosen random lines: {randomLine1}, {randomLine2}, {randomLine3}, {randomLine4}, {randomLine5}, here they are:<br/><br/>
{strings[randomLine1]}<br/><br/>
{strings[randomLine2]}<br/><br/>
{strings[randomLine3]}<br/><br/>
{strings[randomLine4]}<br/><br/>
{strings[randomLine5]}<br/><br/>
thank you, that's all, bye, come again <br/>
'''
        return msg

        
    def run(self):
        print(f"worker => brr starting work on {self.taskPath}")
        
        # Download an S3 object
        s3 = boto3.client('s3')
        
        s3Filepath = self.taskPath # "todo/0001.txt"
        
        
        filename = os.path.basename(s3Filepath)
        tmpFilePath = "temp_" + filename
        
        with open(tmpFilePath, 'wb') as f:
            s3.download_fileobj(BUCKET_NAME, s3Filepath, f)
        
        content = None
        with open(tmpFilePath, 'r') as f:
            content = f.readlines()
            
        msg = self.doStuff(content)
        
        with open(tmpFilePath, 'w') as f:
            f.write(msg)
        # Upload the file
        doneFilePath = "done/" + filename
        try:
            response = s3.upload_file(tmpFilePath, BUCKET_NAME, doneFilePath)
        except ClientError as e:
            print(e)

        print(f"worker => work done on  {self.taskPath}")
        # self.message.delete()
        

class QueueListenerThread(threading.Thread):
    def __init__(self):
        threading.Thread.__init__(self)
        self.running: bool = True
        self.delay: float = 10.0
        
        self.sqs = boto3.resource('sqs', region_name=REGION)
        # Get the queue. This returns an SQS.Queue instance
        self.queue = self.sqs.get_queue_by_name(QueueName=QUEUE_NAME)

        
    def run(self):
        while(self.running):
            
            # Process messages by printing out body and optional author name
            msgs = self.queue.receive_messages(MessageAttributeNames=['TaskType'])
            if(len(msgs) == 0):
                print("no messages")
            for message in msgs:
                # Get the custom author message attribute if it was set
                if message.message_attributes is not None:
                    taskType = message.message_attributes.get('TaskType').get('StringValue')
                    
                # Print out the body and author (if set)
                print('henlo, this is msg, body:{0}; tasktype:{1}'.format(message.body, taskType))
                print('spawning worker thread')
                wokrer = SuperWorker(message.body, message)
                wokrer.start()
                
                # Let the queue know that the message is processed
                message.delete()
                
            time.sleep(self.delay)
            
        
if (__name__ == "__main__"):
    thread = QueueListenerThread()
    thread.start()



