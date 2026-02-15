#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "time.h"

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com";
const char* deviceId = "1";

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 7200;
const int   daylightOffset_sec = 3600;

String commandTopic = "pot/" + String(deviceId) + "/command";
String statusTopic = "pot/" + String(deviceId) + "/update/status";
String logTopic = "pot/" + String(deviceId) + "/update/log";

#define PUMP_PIN 5
#define SOIL_PIN 34
#define LIGHT_PIN 35

int currentMode = 0;
bool isPumpOn = false;
unsigned long pumpStartTime = 0;
bool manualOverride = false;
unsigned long lastMsgTime = 0;
const long reportInterval = 10000;

WiFiClient espClient;
PubSubClient client(espClient);

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

void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) message += (char)payload[i];

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (!error) {
    if (doc.containsKey("setMode")) {
      currentMode = doc["setMode"];
      setPumpState(false);
      manualOverride = false;
    }

    if (currentMode == 2 && doc.containsKey("pumpCmd")) {
      String cmd = doc["pumpCmd"];
      if (cmd == "OFF") setPumpState(false);
      else if (cmd == "ON") setPumpState(true, false);
      else if (cmd == "FORCE_ON") {
        manualOverride = true;
        setPumpState(true, true);
      }
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect(deviceId)) {
      client.subscribe(commandTopic.c_str());
    } else {
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

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
