#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "time.h"

#define PUMP_PIN 5
#define SOIL_PIN 34
#define LIGHT_PIN 35

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Device and pot identifiers
const String deviceId = "1";

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 7200;
const int   daylightOffset_sec = 3600;



// MQTT broker details
const char* mqtt_server = "broker.hivemq.com";

const int mqttPort = 1883;
String commandTopic = "pot/" + deviceId + "/command";   
String statusTopic = "pot/" + deviceId + "/update/status";
String logTopic = "pot/" + deviceId + "/update/log";

int currentMode = 0;
bool isPumpOn = false;
unsigned long pumpStartTime = 0;
bool manualOverride = false;
unsigned long lastMsgTime = 0;
const long reportInterval = 10000;


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


<<<<<<< HEAD
void sendPumpLog(long duration) {
  StaticJsonDocument<200> doc;
  doc["deviceId"] = deviceId;
  doc["action"] = "WATERING_DONE";
  doc["duration_sec"] = duration / 1000;

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(logTopic.c_str(), buffer);
}

float getTemperature() {
  return 28.0;
}

void setPumpState(bool turnOn, bool force = false) {
  int lightLevel = analogRead(LIGHT_PIN);
  bool isSunny = lightLevel > 2000;

  if (!turnOn) {
    if (isPumpOn) {
      digitalWrite(PUMP_PIN, LOW);
      long duration = millis() - pumpStartTime;
      sendPumpLog(duration);
      isPumpOn = false;
    }
    return;
  }

  if (turnOn && !isPumpOn) {
    if (isSunny && !force) {
      if (currentMode == 2) {
         client.publish(logTopic.c_str(), "{\"alert\": \"HIGH_SUN_WARNING\"}");
      }
      return;
    }

    digitalWrite(PUMP_PIN, HIGH);
    pumpStartTime = millis();
    isPumpOn = true;
  }
}

void handleWeatherMode(int hour) {
  float temp = getTemperature();
  bool shouldWater = false;

  if (temp > 25) {
    if (hour == 8 || hour == 14 || hour == 20) shouldWater = true;
  } else {
    if (hour == 9 || hour == 16) shouldWater = true;
  }

  setPumpState(shouldWater);
}

void handleSoilMode() {
  int moisture = analogRead(SOIL_PIN);
  if (moisture > 3000) {
    setPumpState(true);
  } else if (moisture < 1500) {
    setPumpState(false);
  }
}

void handleScheduleMode(int hour) {
  if (hour == 7 || hour == 19) {
    setPumpState(true);
  } else {
    setPumpState(false);
  }
}

void setup() {
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);

  
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  // הגדרות MQTT
  mqttClient.setServer(mqtt_server, 1883);
  mqttClient.setCallback(callback); 
}

void loop() {
    if (!mqttClient.connected()) {
      reconnect();
    }
    mqttClient.loop();

  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    return;
  }
  int currentHour = timeinfo.tm_hour;

  switch (currentMode) {
    case 0:
      handleWeatherMode(currentHour);
      break;
    case 1:
      handleSoilMode();
      break;
    case 2:
      break;
    case 3:
      handleScheduleMode(currentHour);
      break;
  }

  if (millis() - lastMsgTime > reportInterval) {
    lastMsgTime = millis();

    StaticJsonDocument<256> doc;
    doc["deviceId"] = deviceId;
    doc["moisture"] = analogRead(SOIL_PIN);
    doc["light"] = analogRead(LIGHT_PIN);
    doc["temp"] = getTemperature();
    doc["mode"] = currentMode;
    doc["pumpState"] = isPumpOn;
    doc["hour"] = currentHour;

    char buffer[256];
    serializeJson(doc, buffer);
    client.publish(statusTopic.c_str(), buffer);
  }
}
