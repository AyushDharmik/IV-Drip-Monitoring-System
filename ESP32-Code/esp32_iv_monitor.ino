#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_TCS34725.h>
#include <WiFi.h>
#include <ThingSpeak.h>

// ================= WIFI =================
const char* ssid = "ayush_5G";
const char* password = "ayush2525";

unsigned long channelID = 3249576;
const char* writeAPIKey = "OEM6RQM1F60CXPH5";
WiFiClient client;

// ================= LCD =================
// If LCD is blank, change 0x27 to 0x3F
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ================= COLOR SENSOR =================
Adafruit_TCS34725 tcs =
  Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);

// ================= PINS =================
#define LDR_DO     34
#define LASER_PIN  23
#define BUZZER     25

// ================= SETTINGS =================
// increase this if one drop still becomes 2 counts
const unsigned long DROP_LOCKOUT_US    = 80000;   // 80 ms
const unsigned long NO_DRIP_TIMEOUT_MS = 3000;    // alert if no drip for 3 sec

// ================= DROP VARIABLES =================
volatile unsigned long dropCount = 0;
volatile unsigned long lastDropMicros = 0;
volatile bool waitForRelease = false;
volatile bool newDropDetected = false;

unsigned long lastDropTimeMs = 0;

// Store recent drops for flow rate over last 60 sec
const int MAX_DROPS_STORE = 300;
unsigned long dropTimes[MAX_DROPS_STORE];
int dropHead = 0;
int dropStored = 0;

// ================= TIMERS =================
unsigned long lastLCDUpdate = 0;
unsigned long lastColorCheck = 0;
unsigned long lastThingSpeakUpdate = 0;
unsigned long lastWiFiCheck = 0;

// ================= ALERT STATES =================
bool noDripAlert = false;
bool reverseFlowAlert = false;

// ================= ISR =================
// Count only once when beam breaks, then wait until beam restores
void IRAM_ATTR dropISR() {
  unsigned long nowUs = micros();
  int state = digitalRead(LDR_DO);

  // LOW = drop/beam interrupted
  if (state == LOW) {
    if (!waitForRelease && (nowUs - lastDropMicros > DROP_LOCKOUT_US)) {
      dropCount++;
      lastDropMicros = nowUs;
      waitForRelease = true;
      newDropDetected = true;
    }
  }
  // HIGH = beam restored, ready for next drop
  else {
    waitForRelease = false;
  }
}

// ================= HELPERS =================
void addDropTimestamp(unsigned long t) {
  dropTimes[dropHead] = t;
  dropHead = (dropHead + 1) % MAX_DROPS_STORE;

  if (dropStored < MAX_DROPS_STORE) {
    dropStored++;
  }
}

int countDropsLast60s(unsigned long nowMs) {
  int count = 0;

  for (int i = 0; i < dropStored; i++) {
    int idx = (dropHead - 1 - i + MAX_DROPS_STORE) % MAX_DROPS_STORE;

    if (nowMs - dropTimes[idx] <= 60000UL) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

float getDropsPerMinute(unsigned long nowMs) {
  return (float)countDropsLast60s(nowMs);
}

void connectWiFi() {
  WiFi.begin(ssid, password);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");

  unsigned long startAttempt = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    delay(300);
  }

  lcd.clear();
  if (WiFi.status() == WL_CONNECTED) {
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
  } else {
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed");
  }

  delay(1000);
  lcd.clear();
}

void checkReverseFlow() {
  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);

  // tune threshold according to your setup
  if (r > g && r > b && r > 150) {
    reverseFlowAlert = true;
  } else {
    reverseFlowAlert = false;
  }
}

void updateLCD(unsigned long totalDrops, float dpm) {
  lcd.setCursor(0, 0);

  if (reverseFlowAlert) {
    lcd.print("ALERT: REVERSE ");
  } else if (noDripAlert) {
    lcd.print("ALERT: NO DRIP");
  } else {
    lcd.print("Drops:");
    lcd.print(totalDrops);
    lcd.print("     ");
  }

  lcd.setCursor(0, 1);
  lcd.print("Rate:");
  lcd.print((int)dpm);
  lcd.print(" dpm   ");
}

void uploadThingSpeak(unsigned long totalDrops, bool alert, float dpm) {
  if (WiFi.status() != WL_CONNECTED) return;

  ThingSpeak.setField(1, (long)totalDrops);
  ThingSpeak.setField(2, alert ? 1 : 0);
  ThingSpeak.setField(3, dpm);

  int response = ThingSpeak.writeFields(channelID, writeAPIKey);

  Serial.print("ThingSpeak response: ");
  Serial.println(response);
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  Wire.begin(21, 22);

  pinMode(LDR_DO, INPUT);
  pinMode(LASER_PIN, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  digitalWrite(LASER_PIN, HIGH);
  digitalWrite(BUZZER, LOW);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("System Starting");
  delay(1500);
  lcd.clear();

  if (!tcs.begin()) {
    lcd.setCursor(0, 0);
    lcd.print("Color Error");
    while (1);
  }

  connectWiFi();
  ThingSpeak.begin(client);

  attachInterrupt(digitalPinToInterrupt(LDR_DO), dropISR, CHANGE);

  lastDropTimeMs = millis();

  lcd.setCursor(0, 0);
  lcd.print("System Ready");
  delay(1000);
  lcd.clear();

  Serial.println("System Ready...");
}

// ================= LOOP =================
void loop() {
  unsigned long now = millis();

  noInterrupts();
  unsigned long totalDrops = dropCount;
  bool gotNewDrop = newDropDetected;
  unsigned long lastDropUsCopy = lastDropMicros;
  if (newDropDetected) newDropDetected = false;
  interrupts();

  if (gotNewDrop) {
    lastDropTimeMs = lastDropUsCopy / 1000UL;
    addDropTimestamp(lastDropTimeMs);

    Serial.print("Drop Count: ");
    Serial.println(totalDrops);
  }

  // no drip alert
  noDripAlert = (now - lastDropTimeMs > NO_DRIP_TIMEOUT_MS);

  // reverse flow check every 100 ms
  if (now - lastColorCheck >= 100) {
    lastColorCheck = now;
    checkReverseFlow();
  }

  bool alert = noDripAlert || reverseFlowAlert;

  // buzzer
  digitalWrite(BUZZER, alert ? HIGH : LOW);

  // drops per minute
  float dpm = getDropsPerMinute(now);

  // LCD update every 300 ms
  if (now - lastLCDUpdate >= 300) {
    lastLCDUpdate = now;
    updateLCD(totalDrops, dpm);
  }

  // WiFi reconnect every 5 sec
  if (now - lastWiFiCheck >= 5000) {
    lastWiFiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
  }

  // ThingSpeak update every 20 sec
  if (now - lastThingSpeakUpdate >= 20000) {
    lastThingSpeakUpdate = now;
    uploadThingSpeak(totalDrops, alert, dpm);
  }
}
