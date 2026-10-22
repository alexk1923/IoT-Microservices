<!-- 343C5, KULLMAN ALEXANDRU -->

# Tema 3 SPRC - Platformă IoT folosind Microservicii

## Arhitecture

- The app is based on a Docker Stack of microservices, communication between them being possible
  due to docker managed networks
- There are 3 main components:
  - Adapter
  - Database: InfluxDB
  - Analytics: Grafana
  - Eclipse Mosquitto Broker

1. The Adapter was made using NodeJS. This component is using a broker to subscribe to all topics,
   so that it can parse and add data to the database. Initialization is based on InfluxDB parameters (organization,
   bucket, token). It takes the message payload from the topic, check to
   match the following structure:

- topic: <LOCATION>/<STATION> - message (JSON Object): {measurement:value : [key:string]:number , [timestamp]: Date}
- Insertion into the database is done using the following pattern:

  ```js
    {
        measurement: <MEASUREMENT_NAME>
        tags: {location: <TOPIC[0]>, station: <TOPIC[1]>}
        field: {value: <MEASUREMENT_VALUE>}
    }
  ```

- The client does not have to connect to the adapter. The client has to send some messages to a
  correct topic, in a correct format to populate the database. (IoT sensors should be configured
  accordingly)

2. Grafana is used as an analytical tool that will present data in graph or table format.
   Queries were written in Flux, because of the compatibility with InfluxDB version 2.x.

3. InfluxDB is used to store data as time series, improving the evolution in time of measurements,
   depending on the location and station tags. To change the token, use `openssl rand -hex 32` and replace
   DOCKER_INFLUXDB_INIT_ADMIN_TOKEN variable from .env file

4. The broker is used to ensure message transmition to the requested topic.

## Usage

- ./run.sh : this will clean existing stack or adapter image and will build the new
  stack. In case of "removing network" type of errors, it may be recommended to change
  sleep time
- Open your terminal and type the following command:

```sh
sudo docker node inspect self --format '{{ .Status.Addr  }}'
```

to get the IP of the node. Then, access http://<IP_ADDRESS>:80 to access grafana. You can login
using credentials from the Dockerfile. Access Dashboards tab to view data.
