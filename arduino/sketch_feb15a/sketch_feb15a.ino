#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "time.h"
#include <DHT.h>

#define PUMP_PIN 23
#define SOIL_PIN 39
#define LIGHT_PIN 36
#define DHT_PIN 16
#define DHTTYPE DHT22

#define FLOW_RATE 0.05

DHT dht(DHT_PIN, DHTTYPE);

// WiFi credentials
const char* ssid = "";
const char* password = "";

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
String dataTopic = "pot/" + deviceId + "/update/data";

String scheduledTopic = "pot/" + deviceId + "/schedule";

int schedStartHour = 7;
int schedStartMin = 0;
int schedEndHour = 19;
int schedEndMin = 0;
bool schedDays[7] = {false, false, false, false, false, false, false};

String currentMode = "manual";
bool isPumpOn = false;
unsigned long pumpStartTime = 0;
bool manualOverride = false;


WiFiClient espClient;
PubSubClient mqttClient(espClient);

float getTemperature() {
  return dht.readTemperature();
}

void setPumpState(bool turnOn, bool force = false) {
  int lightLevel = analogRead(LIGHT_PIN);
  bool isSunny = lightLevel > 2000;

  if (!turnOn) {
    if (isPumpOn) {
      digitalWrite(PUMP_PIN, HIGH);
      long duration = millis() - pumpStartTime;
      publishPumpStatus(false, duration * FLOW_RATE / 1000.0);
      isPumpOn = false;
    }
    return;
  }

  if (turnOn && !isPumpOn) {
    if (isSunny && !force) {
      if (currentMode == "manual") {
         mqttClient.publish(logTopic.c_str(), "{\"alert\": \"HIGH_SUN_WARNING\"}");
      }
      return;
    }

    digitalWrite(PUMP_PIN, LOW);
    pumpStartTime = millis();
    isPumpOn = true;
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");

  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    return;
  }

if (String(topic) == scheduledTopic) {
    schedStartHour = doc["startHour"];
    schedStartMin = doc["startMinute"];
    schedEndHour = doc["endHour"];
    schedEndMin = doc["endMinute"];
    
    for(int i=0; i<7; i++) schedDays[i] = false;
    JsonArray days = doc["days"];
    for(int dayIdx : days) {
      if(dayIdx >= 0 && dayIdx < 7) schedDays[dayIdx] = true;
    }
    Serial.println("Schedule updated successfully");
  }else if (doc.containsKey("action"))
  {
    const char* action = doc["action"];
  if (strcmp(action, "change_mode") == 0) {
    const char* newMode = doc["mode"];
    currentMode = String(newMode);
    Serial.println("Mode changed to: " + currentMode);
    //force pump turn off when changing mode to avoid conflicts
      digitalWrite(PUMP_PIN, HIGH);
      isPumpOn = false;
  }
  
  else if (strcmp(action, "on") == 0) {
    Serial.println("Received ON command from server");
    setPumpState(true, true); // Force ON regardless of conditions
  }
  
  else if (strcmp(action, "off") == 0) {
    Serial.println("Received OFF command from server");
    setPumpState(false, true); // Force OFF regardless of conditions
  }
  else if (strcmp(action, "request_light") == 0) {
    int lightValue = analogRead(LIGHT_PIN);
    StaticJsonDocument<200> doc;
    doc["light_level"] = lightValue;
    char buffer[256];
    serializeJson(doc, buffer);
    mqttClient.publish(logTopic.c_str(), buffer);
  }
}
}


void reconnect() {
  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection...");

    String clientId = "ESP8266Client-" + String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
      
    
      //subscribe to pot/<id>/command
      mqttClient.subscribe(commandTopic.c_str());
      Serial.println("Subscribed to: " + commandTopic);
      mqttClient.subscribe(scheduledTopic.c_str());

    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void publishPumpStatus(bool isOn, float waterConsumedLiters) {
  StaticJsonDocument<200> doc;
  doc["status"] = isOn; 
  doc["water_consumed_liters"]= waterConsumedLiters;

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

  mqttClient.publish(dataTopic.c_str(), buffer);
  Serial.println("Sent sensor data");
}

void handleWeatherMode(int hour) {
  float temp = getTemperature();
  Serial.println("Current temperature: " + String(temp) + "°C");
  bool shouldWater = false;

  if (temp > 25) {
    if ((hour >= 8 && hour < 11) || (hour >= 14 && hour < 17) || (hour >= 20 && hour < 23) ) shouldWater = true;
  } else {
    if ((hour >= 9 && hour < 11) || (hour >= 16 && hour < 18) ) shouldWater = true;
  }

  setPumpState(shouldWater);
}

void handleSoilMode() {
  int moisture = analogRead(SOIL_PIN);
  Serial.println("Soil moisture level: " + String(moisture));
  if (moisture > 1600) {
    setPumpState(false);
  } else if (moisture < 1500) {
    setPumpState(true);
  }
}

void handleScheduleMode(int hour, int minute, int dayOfWeek) {
  if (!schedDays[dayOfWeek]) {
    setPumpState(false);
    return;
  }

  int currentTotalMin = (hour * 60) + minute;
  int startTotalMin = (schedStartHour * 60) + schedStartMin;
  int endTotalMin = (schedEndHour * 60) + schedEndMin;

  if (currentTotalMin >= startTotalMin && currentTotalMin < endTotalMin) {
    setPumpState(true);
  } else {
    setPumpState(false);
  }
}

void reportFourTimesADay(int hour, int min) {
  // Check if it's the top of the hour and matches one of the specified hours
  if (min != 0 && (hour == 21||hour == 6 || hour == 12 || hour == 18 || hour == 0)) { 
    static int lastReportHour = -1;
    if (hour != lastReportHour) { // Ensure we only report once per hour
      publishSensorData(getTemperature(), dht.readHumidity(), analogRead(SOIL_PIN), analogRead(LIGHT_PIN));
      lastReportHour = hour;
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PUMP_PIN, OUTPUT);
  delay(5000);
  digitalWrite(PUMP_PIN, HIGH);
  dht.begin();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
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
  int currentMin = timeinfo.tm_min;
  int currentDay = timeinfo.tm_wday;

if (currentMode == "weather") {
  handleWeatherMode(currentHour);
} 
else if (currentMode == "moisture") {
  handleSoilMode();
} 
else if (currentMode == "scheduled") {
  handleScheduleMode(currentHour, currentMin,currentDay);
} 
else if (currentMode == "manual") {
}
  reportFourTimesADay(currentHour, currentMin);
}
