#!/bin/bash
sudo apt-get -y update
sudo apt-get -y install git 
sudo apt-get -y install nodejs
sudo apt-get -y install npm
ln -s /usr/bin/nodejs /usr/bin/node
sudo touch ~/installedall
cd ~
sudo git clone https://github.com/kombajno678/aws_psoir_2021.git
cd aws_psoir_2021/office/
sudo npm install
sudo touch ~/npminstalled
sudo npm start