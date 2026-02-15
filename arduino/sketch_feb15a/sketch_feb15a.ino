#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Device and pot identifiers
const String deviceId = "1";

// MQTT broker details
const char* mqtt_server = "broker.hivemq.com";
const int mqttPort = 1883;
String commandTopic = "pot/" + deviceId + "/command";   
String statusTopic = "pot/" + deviceId + "/update/status";
String logTopic = "pot/" + deviceId + "/update/log";



WiFiClient espClient;
PubSubClient mqttClient(espClient);


void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");

  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    return;
  }

  const char* action = doc["action"];

  
  if (strcmp(action, "change_mode") == 0) {
    const char* newMode = doc["mode"];
    currentMode = String(newMode);
    Serial.println("Mode changed to: " + currentMode);
    // כאן תוסיף לוגיקה לאיפוס טיימרים אם צריך
  }
  
  else if (strcmp(action, "on") == 0) {
    Serial.println("Received ON command from server");
    // turnPumpOn(); 
  }
  
  else if (strcmp(action, "off") == 0) {
    Serial.println("Received OFF command from server");
    // turnPumpOff();
  }
}


void reconnect() {
  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection...");

    String clientId = "ESP8266Client-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      
    
      //subscribe to pot/<id>/command
      mqttClient.subscribe(commandTopic.c_str());
      Serial.println("Subscribed to: " + commandTopic);
      
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void publishPumpStatus(bool isOn) {
  StaticJsonDocument<200> doc;
  doc["status"] = isOn; 

  char buffer[256];
  serializeJson(doc, buffer);

  mqttClient.publish(statusTopic.c_str(), buffer);
  
  Serial.print("Sent pump status: ");
  Serial.println(isOn ? "ON" : "OFF");
}

//need to call this metod 4 times a day
void publishSensorData(float temp, float humidity, int moisture, int lightLevel) {
  StaticJsonDocument<200> doc;
  
  doc["temperature"] = temp;
  doc["humidity"] = humidity;
  doc["soil_moisture"] = moisture;
  doc["light_level"] = lightLevel;
  doc["current_mode"] = currentMode; 

  char buffer[256];
  serializeJson(doc, buffer);

  mqttClient.publish(logTopic.c_str(), buffer);
  Serial.println("Sent sensor log data");
}


void setup() {
Serial.begin(115200);
WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  // הגדרות MQTT
  mqttClient.setServer(mqtt_server, 1883);
  mqttClient.setCallback(callback); 
}

void loop() {
  if (!mqttClient.connected()) {
      reconnect();
    }
    mqttClient.loop();
}
