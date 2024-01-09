#!/bin/bash
sudo docker stack rm sprc3
echo 'Waiting for stack to be completely removed...'
sleep 20

echo 'Remove docker image'
sudo docker image rm adapter

echo 'Build image and deploy stack'
sudo docker build -t adapter -f app.dockerfile .
sudo docker stack deploy -c stack.yml sprc3