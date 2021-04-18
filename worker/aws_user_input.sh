#!/bin/bash
sudo apt-get -y update
sudo apt-get -y install git 
sudo apt-get -y install python3-pip
cd ~
git clone https://github.com/kombajno678/aws_psoir_2021.git
cd aws_psoir_2021/worker/
pip3 install -r ./requirements.txt
python3 ./src/main.py

