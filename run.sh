#!/bin/bash
# Create volumes directories
mkdir -p localdb/myInfluxVolume
mkdir -p localdb/myGrafanaVolume

# Start docker service
sudo service docker start

sudo docker stack rm sprc3
echo 'Waiting for stack to be completely removed...'

# Increase this value if the removal is still not completed
sleep 20

echo 'Remove docker image'
sudo docker image rm adapter

echo 'Build image and deploy stack'
sudo docker build -t adapter -f app.dockerfile .
sudo docker stack deploy -c stack.yml sprc3