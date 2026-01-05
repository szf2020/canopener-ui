#include "canopener.h"
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "Encoder.h"
#include "Screen.h"
#include "DebouncePin.h"

using namespace canopener;

SerialBus serialBus(Serial);
EspBus espBus(5,4); // tx, rx
BridgeBus bus(serialBus,espBus);
Device dev(bus);
Encoder encoder(20,21);
Screen screen;
DebouncePin button(10);

void setup() {
    Serial.begin(115200);

    dev.setNodeId(6);

    screen.begin();
    encoder.begin();

    for (int row=0; row<4; row++)
        for (int chunk=0; chunk<5; chunk++)
            dev.insert(0x7000+row,chunk+1).setType(Entry::UINT32).set<uint32_t>(0x20202020);

    dev.insert(0x5f00,0).setType(Entry::UINT8); // encoder
    dev.insert(0x5f01,0).setType(Entry::BOOL); // button state
    dev.insert(0x5f02,0).setType(Entry::UINT8).set<uint8_t>(0); // button count
}

void loop() {
    dev.loop();

    if (dev.getState()==Device::OPERATIONAL) {
        for (int row=0; row<4; row++)
            for (int chunk=0; chunk<5; chunk++)
                screen.setChunk(row,chunk,dev.at(0x7000+row,chunk+1).get<uint32_t>());
    }

    else {
        for (int row=0; row<4; row++)
            for (int chunk=0; chunk<5; chunk++)
                screen.setChunk(row,chunk,0x202d2d20);
    }

    dev.at(0x5f00,0).set<uint8_t>(encoder.getValue());
    dev.at(0x5f01,0).set<bool>(digitalRead(10));

    if (button.didChange() && !button.getValue())
        dev.at(0x5f02,0).set<uint8_t>(dev.at(0x5f02,0).get<uint8_t>()+1);
}