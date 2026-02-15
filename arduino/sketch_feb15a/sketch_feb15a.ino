#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com";

const String potId = "1";


String commandTopic = "pot/" + deviceId + "/command";   
String statusTopic = "pot/" + deviceId + "/update/status";
String logTopic = "pot/" + deviceId + "/update/log";


WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  // put your setup code here, to run once:

}

void loop() {
  // put your main code here, to run repeatedly:

}
